import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  FeedbackRequestSchema,
  createFeedbackId,
  type Feedback,
  type FeedbackResponse,
  type FeedbackType
} from '@/types/feedback';
import { createMessageId, createConversationId } from '@/types/chat';
import { FeedbackFileStore } from '@/lib/feedback/feedback-store';

// Initialize feedback store
const feedbackStore = new FeedbackFileStore();

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = FeedbackRequestSchema.parse(body);

    // Create feedback object
    const feedback: Feedback = {
      id: createFeedbackId(generateId()),
      type: validatedData.type,
      category: validatedData.category,
      messageId: createMessageId(validatedData.messageId),
      conversationId: createConversationId(validatedData.conversationId),
      timestamp: new Date(),
      context: {
        query: validatedData.context?.query || '',
        response: validatedData.context?.response || '',
        sources: validatedData.context?.sources,
        searchResults: validatedData.context?.searchResults,
        responseTime: validatedData.context?.responseTime,
        memoryUsed: validatedData.context?.memoryUsed,
        modelUsed: validatedData.context?.modelUsed,
      },
      comment: validatedData.comment,
      metadata: {
        userAgent: request.headers.get('user-agent') || undefined,
        version: '1.0.0',
      },
    };

    // Save feedback
    const result = await feedbackStore.save(feedback);

    // Return response
    const response: FeedbackResponse = {
      success: result.success,
      feedbackId: result.feedbackId,
      error: result.error,
      timestamp: result.timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Feedback API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid feedback data',
          details: error.issues,
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save feedback',
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit');

    const options = {
      conversationId: conversationId ? createConversationId(conversationId) : undefined,
      type: (type as FeedbackType) || undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    };

    const feedbackList = await feedbackStore.list(options);

    return NextResponse.json({
      success: true,
      feedback: feedbackList,
      count: feedbackList.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Feedback list error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve feedback',
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

// Helper function to generate unique IDs
function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}