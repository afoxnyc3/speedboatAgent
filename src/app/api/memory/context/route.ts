/**
 * Memory Context API
 * Provides conversation memory context for chat interface
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMem0Client } from '../../../../lib/memory/mem0-client';
import type { ConversationId, SessionId, UserId } from '../../../../types/memory';

const ContextRequestSchema = z.object({
  conversationId: z.string(),
  sessionId: z.string(),
  userId: z.string().optional(),
}).strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { conversationId, sessionId } = ContextRequestSchema.parse(body);

    const memoryClient = getMem0Client();

    const context = await memoryClient.getConversationContext(
      conversationId as ConversationId,
      sessionId as SessionId
    );

    return NextResponse.json(context);
  } catch (error) {
    console.error('Memory context error:', error);

    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to get memory context',
          code: 'MEMORY_CONTEXT_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sessionId, userId } = z.object({
      sessionId: z.string(),
      userId: z.string().optional(),
    }).parse(body);

    const memoryClient = getMem0Client();

    const result = await memoryClient.cleanup({
      sessionId: sessionId as SessionId,
      userId: userId as UserId,
    });

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Memory cleanup error:', error);

    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to clear memory',
          code: 'MEMORY_CLEANUP_ERROR',
        },
      },
      { status: 500 }
    );
  }
}