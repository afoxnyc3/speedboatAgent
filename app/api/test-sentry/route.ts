/**
 * Sentry Error Testing Endpoint
 * Test both server-side error tracking and performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const errorType = searchParams.get('type') || 'general';

  // Add custom context for RAG-specific tracking
  Sentry.setContext('rag_operation', {
    endpoint: '/api/test-sentry',
    errorType,
    timestamp: new Date().toISOString(),
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'development'
  });

  // Add tags for filtering
  Sentry.setTag('component', 'test-endpoint');
  Sentry.setTag('error_category', errorType);

  try {
    // Different types of test errors
    switch (errorType) {
      case 'server':
        throw new Error('Test server-side error tracking - this is intentional for Sentry validation');

      case 'async':
        // Test async error handling
        await new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Test async error - timeout failure'));
          }, 100);
        });
        break;

      case 'validation':
        // Test validation error
        const invalidData = null as Record<string, unknown>;
        invalidData.property.nested.value = 'test';
        break;

      case 'database':
        // Simulate database connection error
        throw new Error('Connection to database failed - timeout after 30s');

      case 'openai':
        // Simulate OpenAI API error
        throw new Error('OpenAI API rate limit exceeded - quota exhausted');

      case 'performance':
        // Test performance monitoring with slow operation
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay

        return NextResponse.json({
          success: true,
          message: 'Performance test completed',
          duration: Date.now() - startTime,
          type: 'performance'
        });

      default:
        // Default test error
        throw new Error(`Test Sentry error tracking - type: ${errorType}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Test completed without error',
      type: errorType
    });

  } catch (error) {
    // Add additional context to the error
    Sentry.setExtra('request_info', {
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Capture the error with full context
    Sentry.captureException(error);

    console.error('Test error (sent to Sentry):', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Test error captured and sent to Sentry',
        type: errorType,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Test with custom user context
  Sentry.setUser({
    id: 'test-user-123',
    email: 'test@example.com',
    username: 'test_user'
  });

  try {
    const body = await request.json();

    // Simulate processing error
    if (body.shouldFail) {
      throw new Error('Test POST error with user context');
    }

    return NextResponse.json({
      success: true,
      message: 'POST request processed successfully',
      data: body
    });

  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      {
        success: false,
        error: 'POST error captured with user context'
      },
      { status: 500 }
    );
  }
}