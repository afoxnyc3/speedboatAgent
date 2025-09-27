/**
 * Memory-Enhanced Chat API
 * Integrates conversation memory with RAG search for contextual responses
 */

import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getMem0Client } from '../../../src/lib/memory/mem0-client';
import { executeSearchWorkflow } from '../../../src/lib/search/cached-search-orchestrator';
import {
  createSessionId,
  createUserId,
  createRunId
} from '../../../src/types/memory';
import { randomUUID } from 'crypto';
import { ConversationMemoryContext, MemoryItem } from '../../../src/types/memory';
import { SearchResponse } from '../../../src/types/search';

// Simple circuit breaker for Mem0 - disables memory after repeated failures
let memoryFailureCount = 0;
let memoryDisabledUntil = 0;
const MAX_MEMORY_FAILURES = 3;
const MEMORY_DISABLE_DURATION = 60000; // Disable for 1 minute after 3 failures

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  conversationId?: string;
}

/**
 * Validates chat request parameters
 */
function validateChatRequest(body: unknown): ChatRequest {
  const bodyObj = body as Record<string, unknown>;
  if (!bodyObj.message || typeof bodyObj.message !== 'string') {
    throw new Error('Message is required');
  }

  return {
    message: bodyObj.message.trim(),
    sessionId: (bodyObj.sessionId as string) || randomUUID(),
    userId: bodyObj.userId as string | undefined,
    conversationId: (bodyObj.conversationId as string) || randomUUID(),
  };
}

/**
 * Retrieves conversation context from memory with timeout protection
 */
async function getConversationContext(
  sessionId: string,
  conversationId: string,
  query: string
) {
  // Check if memory is disabled by circuit breaker
  if (Date.now() < memoryDisabledUntil) {
    console.log('Memory disabled by circuit breaker, skipping...');
    return { context: null, contextualQuery: query };
  }

  try {
    // Add a hard timeout wrapper around the Mem0 call (2 seconds max)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Memory timeout')), 2000)
    );

    const memClient = getMem0Client();
    const contextPromise = memClient.getConversationContext(
      conversationId,
      createSessionId(sessionId)
    );

    // Race between the actual call and timeout
    const context = await Promise.race([
      contextPromise,
      timeoutPromise
    ]) as ConversationMemoryContext;

    // Build enhanced query with context
    const contextualQuery = buildContextualQuery(query, context);

    // Reset failure count on success
    memoryFailureCount = 0;

    return { context, contextualQuery };
  } catch (error) {
    // Increment failure count
    memoryFailureCount++;

    // Check if we should activate circuit breaker
    if (memoryFailureCount >= MAX_MEMORY_FAILURES) {
      memoryDisabledUntil = Date.now() + MEMORY_DISABLE_DURATION;
      console.error(`Memory circuit breaker activated after ${memoryFailureCount} failures. Disabling for ${MEMORY_DISABLE_DURATION/1000}s`);
      memoryFailureCount = 0; // Reset counter
    }

    // Fail fast - continue without memory context rather than blocking
    console.warn('Memory retrieval failed or timed out, continuing without context:', error);
    return { context: null, contextualQuery: query };
  }
}

/**
 * Builds contextual query with memory insights
 */
function buildContextualQuery(
  originalQuery: string,
  context: ConversationMemoryContext | null
): string {
  if (!context || context.relevantMemories.length === 0) {
    return originalQuery;
  }

  const recentContext = context.relevantMemories
    .slice(0, 3)
    .map((m: MemoryItem) => m.content)
    .join(' ');

  return `Context: ${recentContext}\n\nUser Question: ${originalQuery}`;
}

/**
 * Stores conversation in memory
 */
async function storeConversation(
  sessionId: string,
  userId: string | undefined,
  conversationId: string,
  userMessage: string,
  assistantResponse: string
) {
  try {
    const memClient = getMem0Client();

    await memClient.add([
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantResponse }
    ], {
      sessionId: createSessionId(sessionId),
      userId: userId ? createUserId(userId) : undefined,
      conversationId: conversationId as any,
      runId: createRunId(randomUUID()),
      category: 'context',
    });
  } catch (error) {
    console.warn('Memory storage failed:', error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const chatRequest = validateChatRequest(body);

    // Run memory fetch and search in parallel for better performance
    const [contextResult, searchResult] = await Promise.allSettled([
      // Memory fetch with timeout protection
      getConversationContext(
        chatRequest.sessionId!,
        chatRequest.conversationId!,
        chatRequest.message
      ),
      // Search with original query (will be enhanced if memory succeeds)
      executeSearchWorkflow({
        query: chatRequest.message, // Use original query initially
        limit: 5,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
        timeout: 5000,
      })
    ]);

    // Extract results from Promise.allSettled
    const context = contextResult.status === 'fulfilled' ? contextResult.value.context : null;
    const contextualQuery = contextResult.status === 'fulfilled'
      ? contextResult.value.contextualQuery
      : chatRequest.message;

    // Get search results or re-run if we have contextual query
    let finalSearchResult;
    if (searchResult.status === 'fulfilled' && contextualQuery === chatRequest.message) {
      // Use the parallel search result if context didn't enhance the query
      finalSearchResult = searchResult.value;
    } else if (contextualQuery !== chatRequest.message) {
      // Re-run search with enhanced query if memory provided context
      finalSearchResult = await executeSearchWorkflow({
        query: contextualQuery,
        limit: 5,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
        timeout: 5000,
      });
    } else {
      // Fallback: run search with original query if parallel search failed
      finalSearchResult = await executeSearchWorkflow({
        query: chatRequest.message,
        limit: 5,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
        timeout: 5000,
      });
    }

    // Build RAG prompt with search results and context
    const ragPrompt = buildRAGPrompt(
      chatRequest.message,
      finalSearchResult,
      context
    );

    // Generate response with OpenAI
    const { text } = await generateText({
      model: openai('gpt-4'),
      prompt: ragPrompt,
    });

    // Store conversation in memory (non-blocking - fire and forget)
    // This improves response time from ~20s to ~3s
    storeConversation(
      chatRequest.sessionId!,
      chatRequest.userId,
      chatRequest.conversationId!,
      chatRequest.message,
      text
    ).catch(error => {
      // Log error but don't block the response
      console.warn('Background memory storage failed:', error);
    });

    // Calculate performance metrics
    const totalTime = Date.now() - startTime;
    const performanceMetrics = {
      totalTime,
      memoryFetchTime: contextResult.status === 'fulfilled' ?
        (context ? 'success' : 'timeout') : 'failed',
      searchTime: finalSearchResult.metadata?.searchTime || 0,
      parallelProcessing: true,
    };

    // Log performance metrics for monitoring
    console.log('Chat performance:', {
      ...performanceMetrics,
      sessionId: chatRequest.sessionId,
    });

    return NextResponse.json({
      response: text,
      sessionId: chatRequest.sessionId,
      conversationId: chatRequest.conversationId,
      sources: finalSearchResult.results.map(r => ({
        title: r.filepath,
        url: r.metadata?.url,
        score: r.score,
      })),
      contextUsed: !!context,
      metrics: performanceMetrics,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

/**
 * Builds RAG prompt with search results and conversation context
 */
function buildRAGPrompt(
  userMessage: string,
  searchResult: SearchResponse,
  context: ConversationMemoryContext | null
): string {
  const sources = searchResult.results
    .slice(0, 3)
    .map((r) => `Source: ${r.filepath}\nContent: ${r.content.slice(0, 500)}...`)
    .join('\n\n');

  let prompt = `You are a helpful AI assistant with access to a code repository and documentation.

Sources from the codebase:
${sources}

User question: ${userMessage}

Please provide a helpful answer based on the sources provided. Always cite sources when possible.`;

  if (context && context.relevantMemories.length > 0) {
    const conversationHistory = context.relevantMemories
      .slice(-3)
      .map((m: MemoryItem) => `${m.category}: ${m.content}`)
      .join('\n');

    prompt = `Previous conversation:
${conversationHistory}

${prompt}`;
  }

  return prompt;
}