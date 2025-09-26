/**
 * Memory-Enhanced Chat API
 * Integrates conversation memory with RAG search for contextual responses
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getMem0Client } from '../../../src/lib/memory/mem0-client';
import { executeSearchWorkflow } from '../../../src/lib/search/cached-search-orchestrator';
import {
  createSessionId,
  createUserId,
  createRunId
} from '../../../src/types/memory';
import { randomUUID } from 'crypto';

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  conversationId?: string;
}

/**
 * Validates chat request parameters
 */
function validateChatRequest(body: any): ChatRequest {
  if (!body.message || typeof body.message !== 'string') {
    throw new Error('Message is required');
  }

  return {
    message: body.message.trim(),
    sessionId: body.sessionId || randomUUID(),
    userId: body.userId,
    conversationId: body.conversationId || randomUUID(),
  };
}

/**
 * Retrieves conversation context from memory
 */
async function getConversationContext(
  sessionId: string,
  conversationId: string,
  query: string
) {
  try {
    const memClient = getMem0Client();
    const context = await memClient.getConversationContext(
      conversationId as any,
      createSessionId(sessionId)
    );

    // Build enhanced query with context
    const contextualQuery = buildContextualQuery(query, context);

    return { context, contextualQuery };
  } catch (error) {
    console.warn('Memory retrieval failed, continuing without context:', error);
    return { context: null, contextualQuery: query };
  }
}

/**
 * Builds contextual query with memory insights
 */
function buildContextualQuery(
  originalQuery: string,
  context: any
): string {
  if (!context || context.relevantMemories.length === 0) {
    return originalQuery;
  }

  const recentContext = context.relevantMemories
    .slice(0, 3)
    .map((m: any) => m.content)
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
  try {
    const body = await request.json();
    const chatRequest = validateChatRequest(body);

    // Get conversation context and enhance query
    const { context, contextualQuery } = await getConversationContext(
      chatRequest.sessionId!,
      chatRequest.conversationId!,
      chatRequest.message
    );

    // Search for relevant information with caching
    const searchResult = await executeSearchWorkflow({
      query: contextualQuery,
      limit: 5,
      offset: 0,
      includeContent: true,
      includeEmbedding: false,
      timeout: 5000,
      sessionId: chatRequest.sessionId,
      userId: chatRequest.userId,
    });

    // Build RAG prompt with search results and context
    const ragPrompt = buildRAGPrompt(
      chatRequest.message,
      searchResult,
      context
    );

    // Generate response with OpenAI
    const { text } = await generateText({
      model: openai('gpt-4'),
      prompt: ragPrompt,
    });

    // Store conversation in memory
    await storeConversation(
      chatRequest.sessionId!,
      chatRequest.userId,
      chatRequest.conversationId!,
      chatRequest.message,
      text
    );

    return NextResponse.json({
      response: text,
      sessionId: chatRequest.sessionId,
      conversationId: chatRequest.conversationId,
      sources: searchResult.results.map(r => ({
        title: r.filepath,
        url: r.metadata?.url,
        score: r.score,
      })),
      contextUsed: !!context,
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
  searchResult: any,
  context: any
): string {
  const sources = searchResult.results
    .slice(0, 3)
    .map((r: any) => `Source: ${r.filepath}\nContent: ${r.content.slice(0, 500)}...`)
    .join('\n\n');

  let prompt = `You are a helpful AI assistant with access to a code repository and documentation.

Sources from the codebase:
${sources}

User question: ${userMessage}

Please provide a helpful answer based on the sources provided. Always cite sources when possible.`;

  if (context && context.relevantMemories.length > 0) {
    const conversationHistory = context.relevantMemories
      .slice(-3)
      .map((m: any) => `${m.type}: ${m.content}`)
      .join('\n');

    prompt = `Previous conversation:
${conversationHistory}

${prompt}`;
  }

  return prompt;
}