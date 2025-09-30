/**
 * Mem0 Diagnostic Test Endpoint
 * Tests Mem0 API connectivity, authentication, and basic operations
 */

import { NextResponse } from 'next/server';
import { getMem0Client } from '@/lib/memory/mem0-client';
import type { MemoryClient, MemoryMessage, SessionId, UserId, RunId, AgentId, ConversationId, MemoryCategory } from '@/types/memory';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration?: number;
  error?: string;
  details?: Record<string, unknown>;
}

async function runHealthCheck(): Promise<TestResult> {
  const healthTest: TestResult = {
    name: 'Mem0 API Health Check',
    status: 'fail',
    duration: 0,
  };

  try {
    const start = Date.now();
    const response = await fetch('https://api.mem0.ai/v1/health', {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.MEM0_API_KEY || '',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    healthTest.duration = Date.now() - start;

    if (response.ok) {
      healthTest.status = 'pass';
      healthTest.details = {
        statusCode: response.status,
        statusText: response.statusText,
      };
    } else {
      healthTest.error = `HTTP ${response.status}: ${response.statusText}`;
      const errorText = await response.text().catch(() => 'Unable to read response');
      healthTest.details = { responseBody: errorText };
    }
  } catch (error) {
    healthTest.error = error instanceof Error ? error.message : String(error);
  }

  return healthTest;
}

async function runMemoryTests(memoryClient: MemoryClient): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 2: Memory Add Operation
  const addTest: TestResult = {
    name: 'Memory Add Operation',
    status: 'fail',
    duration: 0,
  };

  try {
    const start = Date.now();
    const testMessage: MemoryMessage = {
      role: 'user',
      content: 'This is a diagnostic test message from Mem0 test endpoint',
      timestamp: new Date(),
    };

    const sessionId = `test_session_${Date.now()}` as SessionId;
    const userId = `test_user_${Date.now()}` as UserId;
    const runId = `test_run_${Date.now()}` as RunId;

    // eslint-disable-next-line no-console
    console.log('[Mem0 Test] Adding memory with:', { userId, sessionId, runId });

    const result = await memoryClient.add([testMessage], {
      sessionId,
      userId,
      runId,
      agentId: 'speedboat-agent' as AgentId,
      conversationId: 'test_diagnostic' as ConversationId,
      category: 'context' as MemoryCategory,
      metadata: {
        diagnosticTest: true,
        timestamp: new Date().toISOString(),
      },
    });

    addTest.duration = Date.now() - start;

    if (result.success) {
      addTest.status = 'pass';
      addTest.details = {
        memoryId: result.memoryId,
        operationType: result.operationType,
      };
    } else {
      addTest.error = result.error?.message || 'Unknown error';
      addTest.details = result.error ? { error: result.error } : undefined;
    }
  } catch (error) {
    addTest.error = error instanceof Error ? error.message : String(error);
  }

  results.push(addTest);

  // Test 3: Memory Search Operation
  const searchTest: TestResult = {
    name: 'Memory Search Operation',
    status: 'fail',
    duration: 0,
  };

  try {
    const start = Date.now();
    const sessionId = `test_session_${Date.now()}` as SessionId;

    const result = await memoryClient.search('diagnostic test', {
      sessionId,
      limit: 5,
      relevanceThreshold: 0.1,
    });

    searchTest.duration = Date.now() - start;
    searchTest.status = 'pass';
    searchTest.details = {
      memoriesFound: result.memories.length,
      totalCount: result.totalCount,
      searchTime: result.searchTime,
    };
  } catch (error) {
    searchTest.error = error instanceof Error ? error.message : String(error);
  }

  results.push(searchTest);

  // Test 4: Conversation Context Retrieval
  const contextTest: TestResult = {
    name: 'Conversation Context Retrieval',
    status: 'fail',
    duration: 0,
  };

  try {
    const start = Date.now();
    const sessionId = `test_session_${Date.now()}` as SessionId;
    const conversationId = 'test_diagnostic';

    const context = await memoryClient.getConversationContext(conversationId, sessionId);

    contextTest.duration = Date.now() - start;
    contextTest.status = 'pass';
    contextTest.details = {
      conversationId: context.conversationId,
      sessionId: context.sessionId,
      relevantMemories: context.relevantMemories.length,
      entityMentions: context.entityMentions.length,
      topicContinuity: context.topicContinuity.length,
    };
  } catch (error) {
    contextTest.error = error instanceof Error ? error.message : String(error);
  }

  results.push(contextTest);
  return results;
}

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    tests: [] as TestResult[],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    configuration: {
      apiKeyConfigured: !!process.env.MEM0_API_KEY,
      apiKeyPrefix: process.env.MEM0_API_KEY?.substring(0, 10) + '...',
      baseUrl: 'https://api.mem0.ai/v1',
    },
  };

  const memoryClient = getMem0Client();

  // Run health check
  const healthTest = await runHealthCheck();
  diagnostics.tests.push(healthTest);

  // Run memory tests
  const memoryTests = await runMemoryTests(memoryClient);
  diagnostics.tests.push(...memoryTests);

  // Calculate summary
  diagnostics.summary.total = diagnostics.tests.length;
  diagnostics.summary.passed = diagnostics.tests.filter(t => t.status === 'pass').length;
  diagnostics.summary.failed = diagnostics.tests.filter(t => t.status === 'fail').length;
  diagnostics.summary.skipped = diagnostics.tests.filter(t => t.status === 'skip').length;

  // Overall health determination
  const overallHealth = diagnostics.summary.passed === diagnostics.summary.total
    ? 'healthy'
    : diagnostics.summary.passed > 0
    ? 'degraded'
    : 'unhealthy';

  return NextResponse.json({
    health: overallHealth,
    ...diagnostics,
  }, {
    status: overallHealth === 'healthy' ? 200 : 500,
    headers: {
      'X-Mem0-Health': overallHealth,
      'X-Tests-Passed': diagnostics.summary.passed.toString(),
      'X-Tests-Failed': diagnostics.summary.failed.toString(),
    },
  });
}