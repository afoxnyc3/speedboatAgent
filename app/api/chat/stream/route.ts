/**
 * Streaming Chat API Route
 * Provides real-time token streaming for improved perceived performance
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getMem0Client } from '@/lib/memory/mem0-client';
import { getSearchOrchestrator } from '@/lib/search/cached-search-orchestrator';
import type {
  ConversationId,
  MessageId,
} from '@/types/chat';
import type { Document } from '@/types/search';
import type { ConversationMemoryContext } from '@/types/memory';
import type {
  MemoryMessage,
  SessionId,
  RunId,
  UserId,
} from '@/types/memory';

// Request validation schema
const StreamChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  maxSources: z.number().positive().max(20).default(5),
}).strict();

// Streaming event types
type StreamEvent =
  | { type: 'status'; data: { stage: 'searching' | 'analyzing' | 'generating' | 'formatting'; message: string } }
  | { type: 'sources'; data: { sources: Document[]; count: number } }
  | { type: 'token'; data: { token: string; delta: string } }
  | { type: 'complete'; data: { message: MessageResponse; sources: Document[]; suggestions: string[] } }
  | { type: 'error'; data: { error: string } };

// Response message type
type MessageResponse = {
  id: MessageId;
  role: 'assistant';
  content: string;
  conversationId: ConversationId;
  timestamp: Date;
  status: 'completed';
};

// Session management utilities
const generateSessionId = (): SessionId => `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as SessionId;
const generateRunId = (conversationId: string): RunId => `run_${conversationId}_${Date.now()}` as RunId;
const generateMessageId = (): MessageId => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as MessageId;

export async function POST(request: NextRequest): Promise<Response> {
  const totalStart = Date.now();
  const timings: Record<string, number> = {};

  try {
    // Parse and validate request
    const parseStart = Date.now();
    const body: unknown = await request.json();
    const validatedRequest = StreamChatRequestSchema.parse(body);
    timings.requestParsing = Date.now() - parseStart;

    const sessionId = validatedRequest.sessionId as SessionId || generateSessionId();
    const conversationId = validatedRequest.conversationId as ConversationId ||
                          `conv_${Date.now()}` as ConversationId;
    const runId = generateRunId(conversationId);
    const userId = validatedRequest.userId as UserId;

    // Create readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Helper function to send events
          const sendEvent = (event: StreamEvent) => {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          };

          // Step 1: Initialize clients and search
          sendEvent({ type: 'status', data: { stage: 'searching', message: 'Searching knowledge base...' } });

          const clientStart = Date.now();
          const memoryClient = getMem0Client();
          const searchOrchestrator = getSearchOrchestrator();
          timings.clientInit = Date.now() - clientStart;

          // Step 2: Get memory context (with timeout)
          const memoryStart = Date.now();
          let memoryContext: ConversationMemoryContext;
          try {
            const memoryPromise = memoryClient.getConversationContext(conversationId, sessionId);
            const memoryTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Memory retrieval timeout')), 1000)
            );
            memoryContext = await Promise.race([memoryPromise, memoryTimeout]) as ConversationMemoryContext;
            timings.memoryRetrieval = Date.now() - memoryStart;
          } catch {
            // Memory retrieval failed, using empty context
            timings.memoryRetrieval = Date.now() - memoryStart;
            memoryContext = {
              conversationId,
              sessionId,
              relevantMemories: [],
              entityMentions: [],
              topicContinuity: [],
              userPreferences: {},
              conversationStage: 'greeting',
            };
          }

          // Step 3: Enhanced query and search
          sendEvent({ type: 'status', data: { stage: 'analyzing', message: 'Analyzing sources...' } });

          const enhanceStart = Date.now();
          const enhancedQuery = buildContextualQuery(validatedRequest.message, memoryContext);
          timings.queryEnhancement = Date.now() - enhanceStart;

          const searchStart = Date.now();
          const searchResults = await searchOrchestrator.search({
            query: enhancedQuery,
            limit: validatedRequest.maxSources,
            offset: 0,
            includeContent: true,
            includeEmbedding: false,
            timeout: 3000,
            sessionId,
            userId,
            context: `conversation:${conversationId}`,
            filters: {},
          });
          timings.ragSearch = Date.now() - searchStart;

          // Send sources found
          sendEvent({
            type: 'sources',
            data: {
              sources: searchResults.results.slice(0, 3), // Preview first 3
              count: searchResults.results.length
            }
          });

          // Step 4: Generate streaming response
          sendEvent({ type: 'status', data: { stage: 'generating', message: 'Generating response...' } });

          const responseStart = Date.now();
          const response = await generateStreamingResponse({
            query: validatedRequest.message,
            searchResults: searchResults.results,
            memoryContext,
            conversationId,
            onToken: (token: string, delta: string) => {
              sendEvent({ type: 'token', data: { token, delta } });
            },
            onStatusChange: (stage: 'generating' | 'formatting', message: string) => {
              sendEvent({ type: 'status', data: { stage, message } });
            }
          });
          timings.responseGeneration = Date.now() - responseStart;

          // Step 5: Store in memory (fire and forget)
          const memoryStoreStart = Date.now();
          const userMessage: MemoryMessage = {
            role: 'user',
            content: validatedRequest.message,
            timestamp: new Date(),
          };

          const assistantMessage: MemoryMessage = {
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
          };

          // Fire and forget memory storage
          memoryClient.add([userMessage, assistantMessage], {
            userId,
            sessionId,
            runId,
            conversationId,
            category: 'context',
            metadata: {
              sourcesUsed: searchResults.results.length,
              searchTime: searchResults.metadata.searchTime,
              topics: extractTopics(validatedRequest.message),
            },
          }).catch(err => console.warn('Memory storage failed:', err));
          timings.memoryStorage = Date.now() - memoryStoreStart;

          // Step 6: Send completion
          const chatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: response.content,
            conversationId,
            timestamp: new Date(),
            status: 'completed',
            sources: response.sources,
            metadata: {
              searchTime: searchResults.metadata.searchTime,
              retrievalCount: searchResults.results.length,
              memoryContext: {
                relevantMemories: memoryContext.relevantMemories.length,
                entities: memoryContext.entityMentions.length,
              },
            },
          };

          sendEvent({
            type: 'complete',
            data: {
              message: chatMessage,
              sources: response.sources,
              suggestions: response.suggestions
            }
          });

          // Log performance
          timings.total = Date.now() - totalStart;
          // Performance metrics tracked in timings object

        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-Id': sessionId,
        'X-Run-Id': runId,
      },
    });

  } catch (error) {
    console.error('Streaming setup error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Context-enhanced query building
function buildContextualQuery(query: string, context: ConversationMemoryContext): string {
  const entityContext = context.entityMentions.slice(0, 5).join(', ');
  const topicContext = context.topicContinuity.slice(0, 3).join(', ');

  if (entityContext || topicContext) {
    return `${query} [Context: entities: ${entityContext}, topics: ${topicContext}]`;
  }

  return query;
}

// Streaming response generation
async function generateStreamingResponse(params: {
  query: string;
  searchResults: Document[];
  memoryContext: ConversationMemoryContext;
  conversationId: ConversationId;
  onToken: (token: string, delta: string) => void;
  onStatusChange: (stage: 'generating' | 'formatting', message: string) => void;
}): Promise<{
  content: string;
  sources: Document[];
  suggestions: string[];
}> {
  const { query, searchResults, onToken, onStatusChange } = params;
  // memoryContext available but not used in simulation - would be used in production OpenAI integration

  // Build context from search results

  // Simulate streaming response with realistic timing
  onStatusChange('generating', 'Generating response...');

  // Simulate progressive response building
  const fullResponse = `I understand your question about "${query}". Based on the provided context and our conversation history, here's a comprehensive answer with relevant citations.

This is a detailed response that would normally come from OpenAI's API with proper streaming. The response includes information from the knowledge base and maintains conversation context through memory integration.

Key points covered:
- Context from search results
- Memory-enhanced understanding
- Proper source citations
- Conversational continuity`;

  let accumulatedContent = '';

  // Stream tokens with realistic delays
  const words = fullResponse.split(' ');
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const token = i === 0 ? word : ` ${word}`;
    accumulatedContent += token;

    onToken(accumulatedContent, token);

    // Variable delay to simulate natural response timing
    const delay = Math.random() * 50 + 20; // 20-70ms delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  onStatusChange('formatting', 'Formatting citations...');
  await new Promise(resolve => setTimeout(resolve, 200));

  return {
    content: accumulatedContent,
    sources: buildCitationSources(searchResults),
    suggestions: [
      'Would you like more details on this topic?',
      'Can I help clarify any specific aspect?',
      'Are there related questions I can answer?',
    ],
  };
}

// Citation source building
function buildCitationSources(searchResults: Document[]): Array<{ title: string; url: string; snippet: string }> {
  return searchResults.slice(0, 5).map((doc, index) => ({
    id: `cite_${index + 1}`,
    documentId: doc.id,
    excerpt: doc.content.slice(0, 200) + '...',
    relevanceScore: doc.score || 0.8,
    sourceUrl: doc.metadata?.url,
    sourcePath: doc.metadata?.filepath || 'Unknown',
    sourceType: doc.metadata?.source || 'github',
    timestamp: new Date(),
  }));
}

// Topic extraction utility
function extractTopics(message: string): string[] {
  const words = message.toLowerCase().split(/\W+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

  return words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
}