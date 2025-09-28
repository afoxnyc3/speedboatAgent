/**
 * Streaming Chat API Route
 * Provides real-time token streaming for improved perceived performance
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
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

// Demo mode simulation function
async function simulateDemoResponse(
  sendEvent: (event: StreamEvent) => void,
  userMessage: string,
  conversationId: ConversationId
) {
  // Simulate search phase
  sendEvent({ type: 'status', data: { stage: 'searching', message: 'Searching knowledge base...' } });
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock search results
  const mockSources: Document[] = [
    {
      id: 'doc_1' as any,
      content: 'Next.js App Router provides powerful routing capabilities for React applications...',
      metadata: {
        title: 'Next.js App Router Documentation',
        source: 'docs.nextjs.org',
        url: 'https://nextjs.org/docs/app',
        lastModified: new Date('2024-01-15'),
        fileType: 'documentation',
        language: 'en',
        wordCount: 2500,
        confidence: 0.95
      },
      score: 0.89
    },
    {
      id: 'doc_2' as any,
      content: 'RAG (Retrieval-Augmented Generation) systems combine information retrieval with language generation...',
      metadata: {
        title: 'RAG Systems Architecture Guide',
        source: 'github.com/speedboat',
        url: 'https://github.com/speedboat/rag-guide',
        lastModified: new Date('2024-02-01'),
        fileType: 'readme',
        language: 'en',
        wordCount: 1800,
        confidence: 0.88
      },
      score: 0.82
    }
  ];

  sendEvent({ type: 'sources', data: { sources: mockSources, count: mockSources.length } });

  // Simulate analysis phase
  sendEvent({ type: 'status', data: { stage: 'analyzing', message: 'Analyzing sources...' } });
  await new Promise(resolve => setTimeout(resolve, 600));

  // Simulate generation phase
  sendEvent({ type: 'status', data: { stage: 'generating', message: 'Generating response...' } });
  await new Promise(resolve => setTimeout(resolve, 400));

  // Generate contextual response based on user query
  const responses = {
    location: "Based on the documentation, here are the key locations and routing concepts:\n\n**App Router Structure:**\n- `/app` directory for new App Router (recommended)\n- `/pages` directory for legacy Pages Router\n- Each folder represents a route segment\n\n**Dynamic Routes:**\n- `[slug]` for dynamic segments\n- `[...slug]` for catch-all routes\n- `[[...slug]]` for optional catch-all\n\n**Special Files:**\n- `page.tsx` - Makes route publicly accessible\n- `layout.tsx` - Shared UI for segments\n- `loading.tsx` - Loading UI\n- `error.tsx` - Error boundaries\n\nFor your RAG application, I recommend using the App Router with organized feature-based routing.",

    button: "Here are the different Button component variants available:\n\n```tsx\nimport { Button } from '@/components/ui/button'\n\n// Primary (default)\n<Button>Click me</Button>\n\n// Secondary\n<Button variant=\"secondary\">Secondary</Button>\n\n// Outline\n<Button variant=\"outline\">Outline</Button>\n\n// Destructive\n<Button variant=\"destructive\">Delete</Button>\n\n// Ghost\n<Button variant=\"ghost\">Ghost</Button>\n\n// Link style\n<Button variant=\"link\">Link Button</Button>\n```\n\n**Size Variants:**\n```tsx\n<Button size=\"sm\">Small</Button>\n<Button size=\"default\">Default</Button>\n<Button size=\"lg\">Large</Button>\n<Button size=\"icon\">🔍</Button>\n```\n\nThe Button component is built with `class-variance-authority` for type-safe variants and supports all standard HTML button props.",

    default: `I understand you're asking about "${userMessage}". Based on the documentation and codebase analysis:\n\n**Key Points:**\n- This RAG system uses Next.js 15 with App Router for modern React development\n- Vector search is powered by Weaviate for semantic understanding\n- OpenAI embeddings provide high-quality text representations\n- Streaming responses ensure real-time user experience\n\n**Architecture Overview:**\n1. **Query Processing** - User input is analyzed and classified\n2. **Retrieval** - Relevant documents are found using hybrid search\n3. **Generation** - AI generates contextual responses using retrieved context\n4. **Streaming** - Responses are delivered in real-time chunks\n\n**Current Status:**\n- ✅ Frontend: React components with Tailwind CSS\n- ✅ Backend: API routes with TypeScript validation\n- ✅ Search: Weaviate vector database integration\n- ✅ Monitoring: Sentry error tracking and performance\n\nWould you like me to explain any specific aspect in more detail?`
  };

  // Determine response type
  let responseText = responses.default;
  const query = userMessage.toLowerCase();
  if (query.includes('location') || query.includes('route') || query.includes('open')) {
    responseText = responses.location;
  } else if (query.includes('button') || query.includes('component')) {
    responseText = responses.button;
  }

  // Stream response word by word
  const words = responseText.split(' ');
  let accumulated = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i] + (i < words.length - 1 ? ' ' : '');
    accumulated += word;

    sendEvent({
      type: 'token',
      data: {
        token: accumulated,
        delta: word
      }
    });

    // Variable delay for realistic typing
    const delay = word.includes('\n') ? 100 : Math.random() * 50 + 20;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Final completion event
  const messageResponse: MessageResponse = {
    id: generateMessageId(),
    role: 'assistant',
    content: accumulated,
    conversationId,
    timestamp: new Date(),
    status: 'completed'
  };

  const suggestions = [
    "How do I implement routing in Next.js?",
    "What are the available UI components?",
    "Explain the RAG system architecture",
    "How does the search functionality work?"
  ];

  sendEvent({
    type: 'complete',
    data: {
      message: messageResponse,
      sources: mockSources,
      suggestions
    }
  });
}

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

    // Check for demo mode
    const isDemoMode = process.env.DEMO_MODE === 'true';

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

          // Demo mode - simulate complete RAG flow with mock data
          if (isDemoMode) {
            await simulateDemoResponse(sendEvent, validatedRequest.message, conversationId);
            controller.close();
            return;
          }

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
  const { query, searchResults, memoryContext, onToken, onStatusChange } = params;

  // Build context from search results
  const searchContext = searchResults
    .map((doc, index) => `[${index + 1}] ${doc.content.slice(0, 500)}...`)
    .join('\n\n');

  // Build system prompt
  const systemPrompt = buildSystemPrompt(memoryContext);

  const userPrompt = `Based on the following context and our conversation history:

SEARCH CONTEXT:
${searchContext}

MEMORY CONTEXT:
${JSON.stringify(memoryContext, null, 2)}

QUESTION: ${query}

Please provide a comprehensive answer with proper citations.`;

  try {
    onStatusChange('generating', 'Generating response...');

    let accumulatedContent = '';

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    for await (const delta of result.textStream) {
      accumulatedContent += delta;
      onToken(accumulatedContent, delta);
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
  } catch (error) {
    console.error('OpenAI streaming error:', error);

    // Fallback to non-streaming response
    const fallbackContent = `I'm experiencing technical difficulties with streaming. Based on your question about "${query}", I can provide a response using the retrieved context from the knowledge base. Please try again, or contact support if the issue persists.`;

    onToken(fallbackContent, fallbackContent);

    return {
      content: fallbackContent,
      sources: buildCitationSources(searchResults),
      suggestions: [
        'Try asking your question again',
        'Check if the issue persists',
        'Contact support if the problem continues',
      ],
    };
  }
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