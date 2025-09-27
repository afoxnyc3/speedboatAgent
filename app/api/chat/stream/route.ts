/**
 * Streaming Chat API
 * Provides real-time streaming responses for better UX
 */

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { getMem0Client } from '../../../../src/lib/memory/mem0-client';
import { executeSearchWorkflow } from '../../../../src/lib/search/cached-search-orchestrator';
import {
  createSessionId,
  createUserId,
  createRunId
} from '../../../../src/types/memory';
import { randomUUID } from 'crypto';
import { ConversationMemoryContext, MemoryItem } from '../../../../src/types/memory';
import { SearchResponse } from '../../../../src/types/search';

// Reuse the circuit breaker settings from main chat route
let memoryFailureCount = 0;
let memoryDisabledUntil = 0;
const MAX_MEMORY_FAILURES = 3;
const MEMORY_DISABLE_DURATION = 60000;

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  conversationId?: string;
}

function validateChatRequest(body: unknown): ChatRequest {
  const bodyObj = body as Record<string, unknown>;
  if (!bodyObj.message || typeof bodyObj.message !== 'string') {
    throw new Error('Message is required');
  }

  return {
    message: bodyObj.message as string,
    sessionId: (bodyObj.sessionId as string) || randomUUID(),
    userId: bodyObj.userId as string | undefined,
    conversationId: (bodyObj.conversationId as string) || randomUUID(),
  };
}

async function getConversationContext(
  sessionId: string,
  conversationId: string,
  query: string
) {
  if (Date.now() < memoryDisabledUntil) {
    return { context: null, contextualQuery: query };
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Memory timeout')), 2000)
    );

    const memClient = getMem0Client();
    const contextPromise = memClient.getConversationContext(
      conversationId,
      createSessionId(sessionId)
    );

    const context = await Promise.race([
      contextPromise,
      timeoutPromise
    ]) as ConversationMemoryContext;

    const contextualQuery = buildContextualQuery(query, context);
    memoryFailureCount = 0;

    return { context, contextualQuery };
  } catch (error) {
    memoryFailureCount++;

    if (memoryFailureCount >= MAX_MEMORY_FAILURES) {
      memoryDisabledUntil = Date.now() + MEMORY_DISABLE_DURATION;
      console.error(`Memory circuit breaker activated after ${memoryFailureCount} failures`);
      memoryFailureCount = 0;
    }

    console.warn('Memory retrieval failed or timed out:', error);
    return { context: null, contextualQuery: query };
  }
}

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

function buildRAGPrompt(
  userMessage: string,
  searchResult: SearchResponse,
  context: ConversationMemoryContext | null
): string {
  const relevantDocs = searchResult.results
    .slice(0, 3)
    .map(doc => `Source: ${doc.metadata?.url || doc.filepath}\nContent: ${doc.content.substring(0, 500)}...`)
    .join('\n\n');

  let prompt = `You are a helpful AI assistant. Answer the user's question based on the following information:\n\n`;

  if (context && context.relevantMemories.length > 0) {
    const memories = context.relevantMemories
      .slice(0, 2)
      .map(m => m.content)
      .join('\n');
    prompt += `Previous context:\n${memories}\n\n`;
  }

  prompt += `Relevant documents:\n${relevantDocs}\n\n`;
  prompt += `User question: ${userMessage}\n\n`;
  prompt += `Please provide a helpful and accurate answer based on the information provided.`;

  return prompt;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const chatRequest = validateChatRequest(body);

    // Run memory fetch and search in parallel
    const [contextResult, searchResult] = await Promise.allSettled([
      getConversationContext(
        chatRequest.sessionId!,
        chatRequest.conversationId!,
        chatRequest.message
      ),
      executeSearchWorkflow({
        query: chatRequest.message,
        limit: 5,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
        timeout: 5000,
      })
    ]);

    // Extract results
    const context = contextResult.status === 'fulfilled' ? contextResult.value.context : null;
    const contextualQuery = contextResult.status === 'fulfilled'
      ? contextResult.value.contextualQuery
      : chatRequest.message;

    // Get search results
    let finalSearchResult;
    if (searchResult.status === 'fulfilled' && contextualQuery === chatRequest.message) {
      finalSearchResult = searchResult.value;
    } else if (contextualQuery !== chatRequest.message) {
      finalSearchResult = await executeSearchWorkflow({
        query: contextualQuery,
        limit: 5,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
        timeout: 5000,
      });
    } else {
      finalSearchResult = await executeSearchWorkflow({
        query: chatRequest.message,
        limit: 5,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
        timeout: 5000,
      });
    }

    const searchTime = Date.now() - startTime;

    // Build RAG prompt
    const ragPrompt = buildRAGPrompt(
      chatRequest.message,
      finalSearchResult,
      context
    );

    // Stream the response
    const result = await streamText({
      model: openai('gpt-4'),
      prompt: ragPrompt,
    });

    // Add custom headers with performance metrics
    const headers = new Headers();
    headers.set('X-Search-Time', searchTime.toString());
    headers.set('X-Context-Used', (!!context).toString());
    headers.set('X-Parallel-Processing', 'true');

    // Return the stream with metadata headers
    return result.toTextStreamResponse({
      headers,
    });

  } catch (error) {
    console.error('Streaming chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}