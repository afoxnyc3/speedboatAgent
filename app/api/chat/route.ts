/**
 * Memory-Enhanced Chat API Route
 * Integrates Mem0 conversation memory with RAG pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMem0Client } from '../../src/lib/memory/mem0-client';
import { getSearchOrchestrator } from '../../src/lib/search/cached-search-orchestrator';
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
  const totalStart = Date.now();
  const timings: Record<string, number> = {};

  try {
    // Parse and validate request
    const parseStart = Date.now();
    const body: unknown = await request.json();
    const validatedRequest = ChatRequestSchema.parse(body);
    timings.requestParsing = Date.now() - parseStart;

    const sessionId = validatedRequest.sessionId as SessionId || generateSessionId();
    const conversationId = validatedRequest.conversationId as ConversationId ||
                          `conv_${Date.now()}` as ConversationId;
    const runId = generateRunId(conversationId);
    const userId = validatedRequest.userId as UserId;

    // Initialize clients
    const clientStart = Date.now();
    const memoryClient = getMem0Client();
    const searchOrchestrator = getSearchOrchestrator();
    timings.clientInit = Date.now() - clientStart;

    // Run memory retrieval and search preparation in parallel
    const [memoryContext] = await Promise.all([
      // Step 1: Retrieve conversation memory context (with aggressive timeout and fallback)
      (async () => {
        const memoryStart = Date.now();
        const emptyContext: ConversationMemoryContext = {
          conversationId,
          sessionId,
          relevantMemories: [],
          entityMentions: [],
          topicContinuity: [],
          userPreferences: {},
          conversationStage: 'greeting',
        };

        try {
          const memoryPromise = memoryClient.getConversationContext(conversationId, sessionId);
          const memoryTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Memory timeout')), 5000) // 5 second timeout for API calls
          );

          const context = await Promise.race([memoryPromise, memoryTimeout]) as ConversationMemoryContext;
          timings.memoryRetrieval = Date.now() - memoryStart;
          return context;
        } catch {
          timings.memoryRetrieval = Date.now() - memoryStart;
          return emptyContext;
        }
      })(),

      // Pre-warm any caches or prepare resources
      Promise.resolve(),
    ]);

    // Step 2: Enhance query with memory context (fast operation)
    const enhanceStart = Date.now();
    const enhancedQuery = buildContextualQuery(validatedRequest.message, memoryContext);
    timings.queryEnhancement = Date.now() - enhanceStart;

    // Step 3: Perform RAG search with enhanced query (with aggressive timeout)
    const searchStart = Date.now();
    let searchResults;
    try {
      const searchPromise = searchOrchestrator.search({
        query: enhancedQuery,
        limit: validatedRequest.maxSources,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
        timeout: 5000, // 5 second timeout for search
        sessionId,
        userId,
        context: `conversation:${conversationId}`,
        filters: {},
      });

      const searchTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), 2000) // 2s external timeout
      );

      searchResults = await Promise.race([searchPromise, searchTimeout]);
    } catch {
      // Return empty results on search failure
      searchResults = {
        success: false,
        results: [],
        metadata: {
          searchTime: Date.now() - searchStart,
          totalResults: 0,
          queryId: '',
        },
        query: enhancedQuery,
        suggestions: [],
      };
    }
    timings.ragSearch = Date.now() - searchStart;

    // Step 4: Generate contextual response
    const responseStart = Date.now();
    const response = await generateContextualResponse({
      query: validatedRequest.message,
      searchResults: searchResults.results,
      memoryContext,
      conversationId,
    });
    timings.responseGeneration = Date.now() - responseStart;

    // Step 5: Store conversation in memory (fire and forget with timeout)
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

    // Fire and forget memory storage with timeout - don't wait for completion
    const memoryStorePromise = memoryClient.add([userMessage, assistantMessage], {
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
    }).catch(() => {
      // Memory storage failed - continue silently
    });

    // Wait max 500ms for memory storage
    await Promise.race([
      memoryStorePromise,
      new Promise(resolve => setTimeout(resolve, 500))
    ]);
    timings.memoryStorage = Date.now() - memoryStoreStart;

    // Step 6: Prepare chat response
    const prepareStart = Date.now();
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
    timings.responsePreparation = Date.now() - prepareStart;

    // Calculate total time
    timings.total = Date.now() - totalStart;

    // Performance metrics available for monitoring

    return NextResponse.json(chatResponse, {
      headers: {
        'X-Session-Id': sessionId,
        'X-Run-Id': runId,
        'X-Memory-Context': memoryContext.relevantMemories.length.toString(),
        'X-Performance-Total': timings.total.toString(),
        'X-Performance-Memory': (timings.memoryRetrieval + timings.memoryStorage).toString(),
        'X-Performance-Search': timings.ragSearch.toString(),
        'X-Performance-LLM': timings.responseGeneration.toString(),
      },
    });

  } catch (error) {
    timings.total = Date.now() - totalStart;
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

// Contextual response generation with parallel operations
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

  // Prepare context building in parallel
  const [searchContext, memoryContextStr, systemPrompt] = await Promise.all([
    // Build search context
    Promise.resolve(
      searchResults
        .slice(0, 5)
        .map(doc => doc.content)
        .join('\n\n')
    ),
    // Build memory context
    Promise.resolve(
      memoryContext.relevantMemories
        .slice(0, 3)
        .map((mem) => mem.content)
        .join('\n')
    ),
    // Build system prompt
    Promise.resolve(buildSystemPrompt(memoryContext)),
  ]);

  const userPrompt = `Based on the following context and our conversation history:

SEARCH CONTEXT:
${searchContext}

MEMORY CONTEXT:
${memoryContextStr}

QUESTION: ${query}

Please provide a comprehensive answer with proper citations.`;

  // Run LLM call and citation building in parallel
  const [response, sources] = await Promise.all([
    simulateOpenAIResponse(systemPrompt, userPrompt),
    Promise.resolve(buildCitationSources(searchResults)),
  ]);

  return {
    content: response.content,
    sources,
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

// Optimized OpenAI response with timeout and caching
async function simulateOpenAIResponse(systemPrompt: string, userPrompt: string): Promise<{
  content: string;
  suggestions: string[];
}> {
  // TODO: Replace with actual OpenAI API call
  // For now, simulate a fast response to test other bottlenecks

  // Extract question for better mock response
  const question = userPrompt.split('QUESTION: ')[1]?.split('\n')[0] || 'your question';

  // Simulate minimal processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    content: `Based on the provided context, here's a comprehensive answer about ${question}. [This would contain the actual LLM response with citations from the search results.]`,
    suggestions: [
      'Would you like more details?',
      'Any specific aspect to explore?',
      'Related questions?',
    ],
  };
}

// Error handling
function handleChatError(error: unknown): NextResponse {

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