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
      filepath: 'docs/app-router.md',
      language: 'markdown' as const,
      source: 'web' as const,
      score: 0.89,
      priority: 1.0,
      metadata: {
        size: 2500,
        wordCount: 2500,
        lines: 100,
        encoding: 'utf-8',
        mimeType: 'text/markdown',
        tags: ['documentation'],
        lastModified: new Date('2024-01-15'),
        created: new Date('2024-01-15'),
        url: 'https://nextjs.org/docs/app',
        checksum: 'abc123'
      }
    },
    {
      id: 'doc_2' as any,
      content: 'RAG (Retrieval-Augmented Generation) systems combine information retrieval with language generation...',
      filepath: 'README.md',
      language: 'markdown' as const,
      source: 'github' as const,
      score: 0.82,
      priority: 1.2,
      metadata: {
        size: 1800,
        wordCount: 1800,
        lines: 80,
        encoding: 'utf-8',
        mimeType: 'text/markdown',
        tags: ['readme'],
        lastModified: new Date('2024-02-01'),
        created: new Date('2024-02-01'),
        url: 'https://github.com/speedboat/rag-guide',
        checksum: 'def456'
      }
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

// API Health Detection
async function detectAPIFailures(): Promise<{ isDemoModeRequired: boolean; failedServices: string[] }> {
  const failedServices: string[] = [];

  // Check OpenAI API key and quota
  try {
    if (!process.env.OPENAI_API_KEY) {
      failedServices.push('OpenAI API Key Missing');
    }
  } catch {
    failedServices.push('OpenAI Configuration');
  }

  // Check Weaviate connectivity
  try {
    if (!process.env.WEAVIATE_HOST || !process.env.WEAVIATE_API_KEY) {
      failedServices.push('Weaviate Configuration');
    }
  } catch {
    failedServices.push('Weaviate Connection');
  }

  // Check Mem0 configuration
  try {
    if (!process.env.MEM0_API_KEY) {
      failedServices.push('Mem0 Configuration');
    }
  } catch {
    failedServices.push('Mem0 Connection');
  }

  return {
    isDemoModeRequired: failedServices.length > 0,
    failedServices
  };
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

    // Check for demo mode or API failures
    const apiHealth = await detectAPIFailures();
    const isDemoMode = process.env.DEMO_MODE === 'true' || apiHealth.isDemoModeRequired;

    // Log fallback activation
    if (apiHealth.isDemoModeRequired) {
      console.warn('Auto-enabling demo mode due to API failures:', apiHealth.failedServices);
    }

    // Create readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Add global timeout for entire stream processing
        const globalTimeoutMs = 60000; // 60 second total timeout
        const globalTimeout = setTimeout(() => {
          console.error('[Stream] Global timeout reached, terminating stream');
          try {
            const errorEvent = {
              type: 'error' as const,
              data: { error: 'Request timeout - the operation took too long to complete' }
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          } catch (e) {
            console.error('[Stream] Failed to send timeout error:', e);
          } finally {
            controller.close();
          }
        }, globalTimeoutMs);

        try {
          // Helper function to send events
          const sendEvent = (event: StreamEvent) => {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          };

          // Demo mode - simulate complete RAG flow with mock data
          if (isDemoMode) {
            await simulateDemoResponse(sendEvent, validatedRequest.message, conversationId);
            clearTimeout(globalTimeout);
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

          // Step 3: Enhanced query and search with fallback
          sendEvent({ type: 'status', data: { stage: 'analyzing', message: 'Analyzing sources...' } });

          const enhanceStart = Date.now();
          const enhancedQuery = buildContextualQuery(validatedRequest.message, memoryContext);
          timings.queryEnhancement = Date.now() - enhanceStart;

          // Detect query complexity for smart source limiting
          const complexity = detectQueryComplexity(validatedRequest.message);
          const smartSourceLimit = Math.min(complexity.sources, validatedRequest.maxSources);

          let searchResults;
          try {
            const searchStart = Date.now();
            searchResults = await searchOrchestrator.search({
              query: enhancedQuery,
              limit: smartSourceLimit, // Use smart limit instead of max
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
          } catch (searchError) {
            console.error('Search orchestrator failed, switching to demo mode:', searchError);
            // Fallback to demo mode for this request
            await simulateDemoResponse(sendEvent, validatedRequest.message, conversationId);
            clearTimeout(globalTimeout);
            controller.close();
            return;
          }

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
            temperature: complexity.temperature, // Use smart temperature based on query complexity
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
          const chatMessage: MessageResponse = {
            id: generateMessageId(),
            role: 'assistant',
            content: response.content,
            conversationId,
            timestamp: new Date(),
            status: 'completed',
          };

          sendEvent({
            type: 'complete',
            data: {
              message: chatMessage,
              sources: response.sources as any,
              suggestions: response.suggestions
            }
          });

          // Log performance
          timings.total = Date.now() - totalStart;
          // Performance metrics tracked in timings object

        } catch (error) {
          console.error('Streaming error:', error);
          clearTimeout(globalTimeout);
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          clearTimeout(globalTimeout);
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
  temperature?: number; // Optional smart temperature (defaults to 0.5)
  onToken: (token: string, delta: string) => void;
  onStatusChange: (stage: 'generating' | 'formatting', message: string) => void;
}): Promise<{
  content: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  suggestions: string[];
}> {
  const { query, searchResults, memoryContext, temperature = 0.5, onToken, onStatusChange } = params;

  // Build context from search results (reduced from 500 to 300 chars for faster processing)
  const searchContext = searchResults
    .map((doc, index) => `[${index + 1}] ${doc.content.slice(0, 300)}...`)
    .join('\n\n');

  // Build system prompt
  const systemPrompt = buildSystemPrompt(memoryContext);

  // Simplified memory context (extract only essentials, avoid JSON.stringify overhead)
  const memoryHints = [
    memoryContext.entityMentions.slice(0, 3).join(', '),
    memoryContext.topicContinuity.slice(0, 2).join(', ')
  ].filter(Boolean).join(' | ');

  const userPrompt = `Based on the following context${memoryHints ? ` and conversation context (${memoryHints})` : ''}:

SEARCH CONTEXT:
${searchContext}

QUESTION: ${query}

Please provide a comprehensive answer with proper citations.`;

  try {
    onStatusChange('generating', 'Generating response...');

    let accumulatedContent = '';

    // Wrap streamText with timeout protection to prevent infinite hangs
    const streamWithTimeout = async () => {
      const timeoutMs = 15000; // 15 second timeout (reduced from 30s for faster failure)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI streaming timeout after 15s')), timeoutMs);
      });

      const streamPromise = (async () => {
        const result = await streamText({
          model: openai('gpt-4o'), // 6x faster than gpt-4-turbo, 50% cheaper
          system: systemPrompt,
          prompt: userPrompt,
          temperature, // Smart temperature: 0.3 (simple), 0.4 (medium), 0.5 (complex)
        });

        // Add timeout for stream initialization and per-chunk timeout
        const startTime = Date.now();
        const maxStreamDuration = 30000; // 30 seconds total for streaming (reduced from 45s)
        let lastChunkTime = Date.now();
        const maxChunkGap = 5000; // 5 second max gap between chunks

        for await (const delta of result.textStream) {
          const now = Date.now();

          // Check if we've exceeded max streaming duration
          if (now - startTime > maxStreamDuration) {
            throw new Error('Stream duration exceeded maximum allowed time');
          }

          // Check if gap between chunks is too large (indicates hanging)
          const chunkGap = now - lastChunkTime;
          if (chunkGap > maxChunkGap && accumulatedContent.length > 0) {
            console.warn(`[OpenAI Stream] Large chunk gap detected: ${chunkGap}ms`);
          }

          lastChunkTime = now;
          accumulatedContent += delta;
          onToken(accumulatedContent, delta);
        }
      })();

      return Promise.race([streamPromise, timeoutPromise]);
    };

    await streamWithTimeout();

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
    console.error('[OpenAI Stream] Error occurred:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });

    // Check if this is a quota/auth error that requires demo mode
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('exceeded maximum');
    const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('exceeded') ||
                        errorMessage.includes('insufficient') || errorMessage.includes('billing');
    const isAuthError = errorMessage.includes('authentication') || errorMessage.includes('invalid') ||
                       errorMessage.includes('unauthorized');

    if (isTimeoutError) {
      console.warn('[OpenAI Stream] Timeout detected after 15s, providing fallback response');

      // Generate contextual fallback for timeout with better UX
      const contextSummary = searchResults.slice(0, 3)
        .map((doc, i) => `${i + 1}. ${doc.content.slice(0, 300)}...`)
        .join('\n\n');

      const timeoutFallback = `I found ${searchResults.length} relevant documents about "${query}", but the AI generation service is experiencing delays.

Here's what I found in the documentation:

${contextSummary}

💡 **Quick Summary:**
The search returned ${searchResults.length} relevant sources covering:
${searchResults.slice(0, 3).map(doc => `• ${doc.filepath}`).join('\n')}

⏱️ **Response Time Issue:** The AI service didn't respond within 15 seconds. This happens occasionally due to high load or network issues.

✅ **What to do next:**
1. **Retry**: Ask your question again - it usually works on second attempt
2. **Simplify**: Break your question into smaller parts
3. **Browse sources**: Check the source documents below for direct information

The information you need is in the sources - I just couldn't generate a custom response in time.`;

      onToken(timeoutFallback, timeoutFallback);

      return {
        content: timeoutFallback,
        sources: buildCitationSources(searchResults),
        suggestions: [
          '🔄 Ask the same question again',
          '📝 Break question into smaller parts',
          '📚 Browse source documents directly',
        ],
      };
    }

    if (isQuotaError || isAuthError) {
      console.warn('OpenAI API failure detected, using fallback content generation');

      // Generate contextual fallback response
      const contextSummary = searchResults.slice(0, 2)
        .map(doc => doc.content.slice(0, 200))
        .join(' ... ');

      const fallbackContent = `Based on your question about "${query}", I found relevant information in the documentation:

${contextSummary ? `**Key Information:**
${contextSummary}...` : ''}

**Note:** I'm currently operating in offline mode due to API service limitations. The response above is based on the retrieved documentation context. For the most up-to-date and detailed information, please refer to the source documents or try again later when full AI services are restored.

**Available Information:**
- Documentation and code examples from the knowledge base
- Architecture and implementation guides
- Best practices and troubleshooting tips`;

      onToken(fallbackContent, fallbackContent);

      return {
        content: fallbackContent,
        sources: buildCitationSources(searchResults),
        suggestions: [
          'Ask about specific implementation details',
          'Request architecture explanations',
          'Get code examples and patterns',
        ],
      };
    }

    // For other errors, use standard fallback
    const fallbackContent = `I'm experiencing technical difficulties with response generation. Based on your question about "${query}", I can see relevant information was found in the knowledge base. Please try again, or contact support if the issue persists.`;

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
    title: doc.filepath,
    url: doc.metadata?.url || `/${doc.filepath}`,
    snippet: doc.content.slice(0, 200) + '...',
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

// Detect query complexity for smart optimization
function detectQueryComplexity(query: string): { sources: number; temperature: number } {
  const lowercaseQuery = query.toLowerCase();

  // Simple queries (factual lookups)
  const simplePatterns = [
    /^what is /i,
    /^who is /i,
    /^where is /i,
    /^when /i,
    /^define /i,
    /^explain /i,
  ];

  // Complex queries (requiring analysis)
  const complexPatterns = [
    /how does .* work/i,
    /architecture/i,
    /implementation/i,
    /compare/i,
    /difference between/i,
    /in detail/i,
    /comprehensive/i,
  ];

  const isSimple = simplePatterns.some(pattern => pattern.test(query));
  const isComplex = complexPatterns.some(pattern => pattern.test(query)) || query.length > 100;

  if (isSimple && !isComplex) {
    return { sources: 3, temperature: 0.3 }; // Fast, factual
  } else if (isComplex) {
    return { sources: 5, temperature: 0.5 }; // Detailed, balanced
  } else {
    return { sources: 4, temperature: 0.4 }; // Medium
  }
}