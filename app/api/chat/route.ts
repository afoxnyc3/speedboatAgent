/**
 * Memory-Enhanced Chat API Route
 * Integrates Mem0 conversation memory with RAG pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getMem0Client } from '@/lib/memory/mem0-client';
import { getSearchOrchestrator } from '@/lib/search/cached-search-orchestrator';
import type {
  ChatResponse,
  ChatMessage,
  ConversationId,
  MessageId,
  Citation,
  CitationId,
  MessageMetadata,
} from '@/types/chat';
import type { Document, SearchResponse, SearchResult } from '@/types/search';
import type { ConversationMemoryContext } from '@/types/memory';
import type {
  MemoryMessage,
  SessionId,
  RunId,
  UserId,
} from '@/types/memory';

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

    // OPTIMIZATION: Run memory retrieval and search completely in parallel
    const parallelStart = Date.now();
    const [memoryContext, searchResults] = await Promise.allSettled([
      // Step 1: Retrieve conversation memory context (with timeout and fallback)
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
          console.log('[Mem0 Diagnostics] Starting memory retrieval:', {
            conversationId,
            sessionId,
            timestamp: new Date().toISOString()
          });

          const memoryPromise = memoryClient.getConversationContext(conversationId, sessionId);
          const memoryTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Memory timeout')), 5000) // Increased to 5s for better diagnostics
          );

          const context = await Promise.race([memoryPromise, memoryTimeout]) as ConversationMemoryContext;
          const duration = Date.now() - memoryStart;
          timings.memoryRetrieval = duration;

          console.log('[Mem0 Diagnostics] Memory retrieval SUCCESS:', {
            duration: `${duration}ms`,
            memoriesFound: context.relevantMemories.length,
            entities: context.entityMentions.length,
            topics: context.topicContinuity.length
          });

          return context;
        } catch (error) {
          const duration = Date.now() - memoryStart;
          timings.memoryRetrieval = duration;

          console.error('[Mem0 Diagnostics] Memory retrieval FAILED:', {
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error
          });

          return emptyContext;
        }
      })(),

      // Step 2: Perform initial RAG search with base query (parallel to memory retrieval)
      (async () => {
        const searchStart = Date.now();
        try {
          const searchPromise = searchOrchestrator.search({
            query: validatedRequest.message, // Use original query for parallel execution
            limit: validatedRequest.maxSources + 2, // Get extra results for potential reranking
            offset: 0,
            includeContent: true,
            includeEmbedding: false,
            timeout: 4000, // 4 second timeout for search
            sessionId,
            userId,
            context: `conversation:${conversationId}`,
            filters: {},
          });

          const searchTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Search timeout')), 2000) // 2s external timeout
          );

          const results = await Promise.race([searchPromise, searchTimeout]);
          timings.ragSearch = Date.now() - searchStart;
          return results;
        } catch (error) {
          timings.ragSearch = Date.now() - searchStart;
          // Return empty results on search failure
          return {
            success: false,
            results: [],
            metadata: {
              searchTime: Date.now() - searchStart,
              totalResults: 0,
              queryId: '',
            },
            query: validatedRequest.message,
            suggestions: [],
          };
        }
      })(),
    ]);

    // Extract results from Promise.allSettled
    const resolvedMemoryContext = memoryContext.status === 'fulfilled'
      ? memoryContext.value
      : {
          conversationId,
          sessionId,
          relevantMemories: [],
          entityMentions: [],
          topicContinuity: [],
          userPreferences: {},
          conversationStage: 'greeting' as const,
        };

    const resolvedSearchResults: SearchResponse = searchResults.status === 'fulfilled'
      ? searchResults.value as SearchResponse
      : {
          success: true,
          results: [],
          metadata: {
            searchTime: 0,
            totalResults: 0,
            queryId: '',
          } as any, // Simplified metadata for fallback
          query: validatedRequest.message as any,
          suggestions: [],
        } as SearchResponse;

    timings.parallelOperations = Date.now() - parallelStart;

    // Step 3: Post-process search results with memory context (fast reranking if needed)
    const enhanceStart = Date.now();
    let finalSearchResults: SearchResponse = resolvedSearchResults;

    // If memory context is available and provides useful context, enhance the results
    if (resolvedMemoryContext.entityMentions.length > 0 || resolvedMemoryContext.topicContinuity.length > 0) {
      // Apply context-aware reranking to the search results
      finalSearchResults = {
        ...resolvedSearchResults,
        results: enhanceSearchResultsWithMemory([...resolvedSearchResults.results], resolvedMemoryContext),
        query: buildContextualQuery(validatedRequest.message, resolvedMemoryContext) as any,
      };
    }

    timings.queryEnhancement = Date.now() - enhanceStart;

    // Step 4: Generate contextual response with optimized results
    const responseStart = Date.now();
    const response = await generateContextualResponse({
      query: validatedRequest.message,
      searchResults: [...finalSearchResults.results],
      memoryContext: resolvedMemoryContext,
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

    console.log('[Mem0 Diagnostics] Storing messages to memory:', {
      userId,
      sessionId,
      conversationId,
      messageCount: 2
    });

    // Fire and forget memory storage with timeout - don't wait for completion
    const memoryStorePromise = memoryClient.add([userMessage, assistantMessage], {
      userId,
      sessionId,
      runId,
      conversationId,
      category: 'context',
      metadata: {
        sourcesUsed: finalSearchResults.results.length,
        searchTime: finalSearchResults.metadata.searchTime,
        topics: extractTopics(validatedRequest.message),
      },
    }).then((result) => {
      const duration = Date.now() - memoryStoreStart;
      console.log('[Mem0 Diagnostics] Memory storage SUCCESS:', {
        duration: `${duration}ms`,
        memoryId: result.memoryId,
        success: result.success
      });
      return result;
    }).catch((error) => {
      const duration = Date.now() - memoryStoreStart;
      console.error('[Mem0 Diagnostics] Memory storage FAILED:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error)
      });
      // Memory storage failed - continue silently
    });

    // Wait max 1000ms for memory storage (increased for diagnostics)
    await Promise.race([
      memoryStorePromise,
      new Promise(resolve => setTimeout(resolve, 1000))
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
        searchTime: finalSearchResults.metadata.searchTime,
        retrievalCount: finalSearchResults.results.length,
        ...({ parallelOptimization: true } as any), // Type assertion for extended metadata
      } as MessageMetadata,
    };

    const chatResponse: ChatResponse = {
      success: true,
      message: chatMessage,
      conversationId,
      suggestions: response.suggestions,
      relatedTopics: resolvedMemoryContext.topicContinuity.slice(0, 3),
    };
    timings.responsePreparation = Date.now() - prepareStart;

    // Calculate total time
    timings.total = Date.now() - totalStart;

    // Determine memory status for diagnostics
    const memoryStatus = memoryContext.status === 'fulfilled' ? 'success' : 'failed';
    const memoryUsed = memoryContext.status === 'fulfilled' &&
                      memoryContext.value.relevantMemories.length > 0;

    // Performance metrics available for monitoring
    console.log('[Mem0 Diagnostics] Request complete:', {
      total: `${timings.total}ms`,
      memoryRetrieval: `${timings.memoryRetrieval}ms`,
      memoryStorage: `${timings.memoryStorage}ms`,
      search: `${timings.ragSearch}ms`,
      llm: `${timings.responseGeneration}ms`,
      memoryStatus,
      memoryUsed
    });

    return NextResponse.json(chatResponse, {
      headers: {
        'X-Session-Id': sessionId,
        'X-Run-Id': runId,
        'X-Memory-Context': resolvedMemoryContext.relevantMemories.length.toString(),
        'X-Memory-Status': memoryStatus,
        'X-Memory-Used': memoryUsed.toString(),
        'X-Performance-Total': timings.total.toString(),
        'X-Performance-Memory-Retrieval': timings.memoryRetrieval.toString(),
        'X-Performance-Memory-Storage': timings.memoryStorage.toString(),
        'X-Performance-Search': timings.ragSearch.toString(),
        'X-Performance-LLM': timings.responseGeneration.toString(),
        'X-Performance-Parallel': timings.parallelOperations.toString(),
        'X-Optimization-Applied': 'parallel-memory-search',
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
  sources: Citation[];
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
    generateOpenAIResponse(systemPrompt, userPrompt),
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
function buildCitationSources(searchResults: Document[]): Citation[] {
  return searchResults.slice(0, 5).map((doc, index) => ({
    id: `cite_${index + 1}` as CitationId,
    documentId: doc.id,
    excerpt: doc.content.slice(0, 200) + '...',
    relevanceScore: doc.score || 0.8,
    sourceUrl: doc.metadata?.url,
    sourcePath: doc.filepath,
    sourceType: doc.source,
    timestamp: new Date(),
  }));
}

// Real OpenAI response generation with context
async function generateOpenAIResponse(systemPrompt: string, userPrompt: string): Promise<{
  content: string;
  suggestions: string[];
}> {
  try {
    const result = await generateText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    return {
      content: result.text,
      suggestions: [
        'Would you like more details on this topic?',
        'Can I help clarify any specific aspect?',
        'Are there related questions I can answer?',
      ],
    };
  } catch (error) {
    console.error('OpenAI API error:', error);

    // Fallback response with error handling
    return {
      content: "I'm experiencing technical difficulties connecting to the AI service. Please try again in a moment.",
      suggestions: [
        'Try asking your question again',
        'Check if the issue persists',
        'Contact support if the problem continues',
      ],
    };
  }
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

/**
 * Enhanced search results with memory context-aware reranking
 * Applies memory context to improve result relevance without blocking parallel execution
 */
function enhanceSearchResultsWithMemory(
  searchResults: Document[],
  memoryContext: ConversationMemoryContext
): Document[] {
  const entityMentions = new Set(memoryContext.entityMentions.map(entity => entity.toLowerCase()));
  const topicContext = new Set(memoryContext.topicContinuity.map(topic => topic.toLowerCase()));

  return searchResults.map(doc => {
    let relevanceBoost = 0;
    const content = doc.content.toLowerCase();

    // Boost for entity mentions
    entityMentions.forEach(entity => {
      if (content.includes(entity)) {
        relevanceBoost += 0.1;
      }
    });

    // Boost for topic continuity
    topicContext.forEach(topic => {
      if (content.includes(topic)) {
        relevanceBoost += 0.05;
      }
    });

    return {
      ...doc,
      score: Math.min(1.0, (doc.score || 0.8) + relevanceBoost),
      metadata: {
        ...doc.metadata,
        memoryBoost: relevanceBoost,
        contextEnhanced: relevanceBoost > 0,
      },
    };
  }).sort((a, b) => (b.score || 0) - (a.score || 0)); // Re-sort by enhanced scores
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
      parallelProcessing: true,
    },
  });
}