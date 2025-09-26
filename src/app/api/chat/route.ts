/**
 * Memory-Enhanced Chat API Route
 * Integrates Mem0 conversation memory with RAG pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMem0Client } from '../../../lib/memory/mem0-client';
import { getSearchOrchestrator } from '../../../lib/search/cached-search-orchestrator';
import type {
  ChatResponse,
  ChatMessage,
  ConversationId,
  MessageId,
} from '../../../types/chat';
import type { Document } from '../../../types/search';
import type { ConversationMemoryContext } from '../../../types/memory';
import type {
  MemoryMessage,
  SessionId,
  RunId,
  UserId,
} from '../../../types/memory';

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  streaming: z.boolean().default(true),
  maxSources: z.number().positive().max(20).default(5),
}).strict();

// Session management utilities
const generateSessionId = (): SessionId => `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as SessionId;
const generateRunId = (conversationId: string): RunId => `run_${conversationId}_${Date.now()}` as RunId;
const generateMessageId = (): MessageId => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as MessageId;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validatedRequest = ChatRequestSchema.parse(body);

    const sessionId = validatedRequest.sessionId as SessionId || generateSessionId();
    const conversationId = validatedRequest.conversationId as ConversationId ||
                          `conv_${Date.now()}` as ConversationId;
    const runId = generateRunId(conversationId);
    const userId = validatedRequest.userId as UserId;

    // Initialize clients
    const memoryClient = getMem0Client();
    const searchOrchestrator = getSearchOrchestrator();

    // Step 1: Retrieve conversation memory context
    const memoryContext = await memoryClient.getConversationContext(conversationId, sessionId);

    // Step 2: Enhance query with memory context
    const enhancedQuery = buildContextualQuery(validatedRequest.message, memoryContext);

    // Step 3: Perform RAG search with enhanced query (with caching)
    const searchResults = await searchOrchestrator.search({
      query: enhancedQuery,
      limit: validatedRequest.maxSources,
      offset: 0,
      includeContent: true,
      includeEmbedding: false,
      timeout: 10000,
      sessionId,
      userId,
      context: `conversation:${conversationId}`,
      filters: {},
    });

    // Step 4: Generate contextual response
    const response = await generateContextualResponse({
      query: validatedRequest.message,
      searchResults: searchResults.results,
      memoryContext,
      conversationId,
    });

    // Step 5: Store conversation in memory for future context
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

    await memoryClient.add([userMessage, assistantMessage], {
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
    });

    // Step 6: Prepare chat response
    const chatMessage: ChatMessage = {
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

    const chatResponse: ChatResponse = {
      success: true,
      message: chatMessage,
      conversationId,
      suggestions: response.suggestions,
      relatedTopics: memoryContext.topicContinuity.slice(0, 3),
    };

    return NextResponse.json(chatResponse, {
      headers: {
        'X-Session-Id': sessionId,
        'X-Run-Id': runId,
        'X-Memory-Context': memoryContext.relevantMemories.length.toString(),
      },
    });

  } catch (error) {
    return handleChatError(error);
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

// Contextual response generation
async function generateContextualResponse(params: {
  query: string;
  searchResults: Document[];
  memoryContext: ConversationMemoryContext;
  conversationId: ConversationId;
}): Promise<{
  content: string;
  sources: Document[];
  suggestions: string[];
}> {
  const { query, searchResults, memoryContext } = params;

  // Build context from search results and memory
  const searchContext = searchResults
    .slice(0, 5)
    .map(doc => doc.content)
    .join('\n\n');

  const memoryContextStr = memoryContext.relevantMemories
    .slice(0, 3)
    .map((mem) => mem.content)
    .join('\n');

  const systemPrompt = buildSystemPrompt(memoryContext);
  const userPrompt = `Based on the following context and our conversation history:

SEARCH CONTEXT:
${searchContext}

MEMORY CONTEXT:
${memoryContextStr}

QUESTION: ${query}

Please provide a comprehensive answer with proper citations.`;

  // Simulate OpenAI API call (replace with actual implementation)
  const response = await simulateOpenAIResponse(systemPrompt, userPrompt);

  return {
    content: response.content,
    sources: buildCitationSources(searchResults),
    suggestions: response.suggestions,
  };
}

// System prompt with memory awareness
function buildSystemPrompt(memoryContext: ConversationMemoryContext): string {
  const stage = memoryContext.conversationStage;
  const preferences = Object.entries(memoryContext.userPreferences)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  return `You are a helpful AI assistant with access to conversation memory and documentation.

Conversation Stage: ${stage}
User Preferences: ${preferences || 'None specified'}
Entities Mentioned: ${memoryContext.entityMentions.join(', ')}

Provide accurate, contextual responses with proper source citations. Be conversational but precise.`;
}

// Topic extraction utility
function extractTopics(message: string): string[] {
  // Simple topic extraction - replace with NLP/ML approach in production
  const words = message.toLowerCase().split(/\W+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

  return words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
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

// Simulated OpenAI response (replace with actual OpenAI API)
async function simulateOpenAIResponse(systemPrompt: string, userPrompt: string): Promise<{
  content: string;
  suggestions: string[];
}> {
  // Placeholder implementation - replace with actual OpenAI API call
  return {
    content: `I understand your question about "${userPrompt.split('QUESTION: ')[1]}". Based on the provided context and our conversation history, here's a comprehensive answer with relevant citations.`,
    suggestions: [
      'Would you like more details on this topic?',
      'Can I help clarify any specific aspect?',
      'Are there related questions I can answer?',
    ],
  };
}

// Error handling
function handleChatError(error: unknown): NextResponse {
  console.error('Chat API Error:', error);

  const errorResponse = {
    success: false,
    error: {
      code: 'CHAT_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      timestamp: new Date(),
      retryable: true,
    },
  };

  const status = error instanceof Error && error.message.includes('validation') ? 400 : 500;

  return NextResponse.json(errorResponse, { status });
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date(),
    features: {
      memoryEnabled: true,
      ragEnabled: true,
      streamingEnabled: true,
    },
  });
}