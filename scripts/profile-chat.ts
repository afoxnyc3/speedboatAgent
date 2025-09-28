#!/usr/bin/env node
/**
 * Performance Profiling Script for Chat API
 * Measures response times and identifies bottlenecks
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TimingMetrics {
  requestParsing: number;
  clientInit: number;
  memoryRetrieval: number;
  queryEnhancement: number;
  ragSearch: number;
  responseGeneration: number;
  memoryStorage: number;
  responsePreparation: number;
  total: number;
}

interface TestResult {
  query: string;
  success: boolean;
  timings?: TimingMetrics;
  headers?: Record<string, string>;
  error?: string;
  responseSize?: number;
}

interface PerformanceReport {
  timestamp: Date;
  environment: string;
  tests: TestResult[];
  statistics: {
    avgTotal: number;
    p50Total: number;
    p95Total: number;
    p99Total: number;
    minTotal: number;
    maxTotal: number;
    avgByOperation: Record<string, number>;
    bottlenecks: Array<{ operation: string; avgTime: number; percentage: number }>;
  };
  recommendations: string[];
}

// Test queries with different characteristics
const TEST_QUERIES = [
  { query: "What is the project architecture?", type: "simple" },
  { query: "How does the caching system work with Redis and what are the performance implications?", type: "complex" },
  { query: "Show me the authentication flow", type: "technical" },
  { query: "What are the main features?", type: "general" },
  { query: "Explain the vector search implementation with Weaviate", type: "detailed" },
];

// Performance test configuration
const TEST_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  iterations: 2,
  warmupRuns: 1,
  concurrency: 1,
  timeout: 5000,
};

/**
 * Make a single chat API request and measure performance
 */
async function makeRequest(query: string, sessionId?: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        sessionId: sessionId || `test-session-${Date.now()}`,
        maxSources: 5,
        streaming: false,
      }),
      signal: AbortSignal.timeout(TEST_CONFIG.timeout),
    });

    const totalTime = Date.now() - startTime;
    const data = await response.json();
    const responseSize = JSON.stringify(data).length;

    // Extract performance headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (key.startsWith('x-performance-') || key === 'x-performance-total') {
        headers[key] = value;
      }
    });

    if (!response.ok) {
      return {
        query,
        success: false,
        error: `HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`,
      };
    }

    // Parse timing from headers
    const timings: TimingMetrics = {
      total: parseInt(headers['x-performance-total'] || '0'),
      memoryRetrieval: parseInt(headers['x-performance-memory'] || '0'),
      ragSearch: parseInt(headers['x-performance-search'] || '0'),
      responseGeneration: parseInt(headers['x-performance-llm'] || '0'),
      requestParsing: 0,
      clientInit: 0,
      queryEnhancement: 0,
      memoryStorage: 0,
      responsePreparation: 0,
    };

    return {
      query,
      success: true,
      timings,
      headers,
      responseSize,
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    return {
      query,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timings: { total: totalTime } as TimingMetrics,
    };
  }
}

/**
 * Run warmup requests to prime caches
 */
async function runWarmup(): Promise<void> {
  console.log('Running warmup requests...');
  for (let i = 0; i < TEST_CONFIG.warmupRuns; i++) {
    const query = TEST_QUERIES[i % TEST_QUERIES.length];
    await makeRequest(query.query);
    console.log(`  Warmup ${i + 1}/${TEST_CONFIG.warmupRuns} complete`);
  }
  console.log('Warmup complete\n');
}

/**
 * Run performance tests
 */
async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log(`Running ${TEST_CONFIG.iterations} iterations of ${TEST_QUERIES.length} queries...`);

  for (let iteration = 0; iteration < TEST_CONFIG.iterations; iteration++) {
    console.log(`\nIteration ${iteration + 1}/${TEST_CONFIG.iterations}:`);

    for (const testQuery of TEST_QUERIES) {
      const result = await makeRequest(testQuery.query);
      results.push(result);

      if (result.success && result.timings) {
        console.log(`  ✓ ${testQuery.type}: ${result.timings.total}ms`);
        console.log(`    Memory: ${result.timings.memoryRetrieval}ms | Search: ${result.timings.ragSearch}ms | LLM: ${result.timings.responseGeneration}ms`);
      } else {
        console.log(`  ✗ ${testQuery.type}: ${result.error}`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Calculate statistics from test results
 */
function calculateStatistics(results: TestResult[]): PerformanceReport['statistics'] {
  const successfulResults = results.filter(r => r.success && r.timings);
  const totals = successfulResults.map(r => r.timings!.total).sort((a, b) => a - b);

  if (totals.length === 0) {
    throw new Error('No successful test results to analyze');
  }

  // Calculate percentiles
  const p50Index = Math.floor(totals.length * 0.5);
  const p95Index = Math.floor(totals.length * 0.95);
  const p99Index = Math.floor(totals.length * 0.99);

  // Calculate averages by operation
  const operations = ['memoryRetrieval', 'ragSearch', 'responseGeneration'] as const;
  const avgByOperation: Record<string, number> = {};

  for (const op of operations) {
    const values = successfulResults
      .map(r => r.timings![op as keyof TimingMetrics] as number)
      .filter(v => v > 0);
    avgByOperation[op] = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }

  // Identify bottlenecks
  const totalAvg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const bottlenecks = Object.entries(avgByOperation)
    .map(([op, time]) => ({
      operation: op,
      avgTime: time,
      percentage: Math.round((time / totalAvg) * 100),
    }))
    .filter(b => b.avgTime > 0)
    .sort((a, b) => b.avgTime - a.avgTime);

  return {
    avgTotal: Math.round(totalAvg),
    p50Total: totals[p50Index],
    p95Total: totals[p95Index],
    p99Total: totals[Math.min(p99Index, totals.length - 1)],
    minTotal: totals[0],
    maxTotal: totals[totals.length - 1],
    avgByOperation,
    bottlenecks,
  };
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(stats: PerformanceReport['statistics']): string[] {
  const recommendations: string[] = [];

  // Check if average exceeds target
  if (stats.avgTotal > 3000) {
    recommendations.push(`CRITICAL: Average response time (${stats.avgTotal}ms) exceeds 3s target`);
  } else if (stats.avgTotal > 2000) {
    recommendations.push(`WARNING: Average response time (${stats.avgTotal}ms) exceeds 2s target`);
  } else {
    recommendations.push(`SUCCESS: Average response time (${stats.avgTotal}ms) meets target (<2s)`);
  }

  // Analyze bottlenecks
  const topBottleneck = stats.bottlenecks[0];
  if (topBottleneck) {
    if (topBottleneck.operation === 'memoryRetrieval' && topBottleneck.avgTime > 1000) {
      recommendations.push(
        `Memory retrieval is slow (${topBottleneck.avgTime}ms, ${topBottleneck.percentage}% of total)`,
        'Consider: Reducing Mem0 timeout, implementing local cache, or making memory optional'
      );
    }

    if (topBottleneck.operation === 'ragSearch' && topBottleneck.avgTime > 2000) {
      recommendations.push(
        `RAG search is slow (${topBottleneck.avgTime}ms, ${topBottleneck.percentage}% of total)`,
        'Consider: Optimizing Weaviate queries, improving caching, reducing result limits'
      );
    }

    if (topBottleneck.operation === 'responseGeneration' && topBottleneck.avgTime > 3000) {
      recommendations.push(
        `LLM generation is slow (${topBottleneck.avgTime}ms, ${topBottleneck.percentage}% of total)`,
        'Consider: Using faster model, reducing prompt size, implementing streaming'
      );
    }
  }

  // P95 analysis
  if (stats.p95Total > 5000) {
    recommendations.push(
      `P95 latency is high (${stats.p95Total}ms)`,
      'Consider: Adding circuit breakers, improving error handling, implementing request queueing'
    );
  }

  // Variability analysis
  const variability = (stats.maxTotal - stats.minTotal) / stats.avgTotal;
  if (variability > 2) {
    recommendations.push(
      `High variability detected (${Math.round(variability * 100)}%)`,
      'Consider: Investigating cold starts, connection pooling, cache warming'
    );
  }

  return recommendations;
}

/**
 * Generate and display performance report
 */
function generateReport(results: TestResult[]): PerformanceReport {
  const stats = calculateStatistics(results);
  const recommendations = generateRecommendations(stats);

  const report: PerformanceReport = {
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    tests: results,
    statistics: stats,
    recommendations,
  };

  // Display report
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE PROFILING REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 RESPONSE TIME STATISTICS:');
  console.log(`  Average:    ${stats.avgTotal}ms`);
  console.log(`  P50:        ${stats.p50Total}ms`);
  console.log(`  P95:        ${stats.p95Total}ms`);
  console.log(`  P99:        ${stats.p99Total}ms`);
  console.log(`  Min:        ${stats.minTotal}ms`);
  console.log(`  Max:        ${stats.maxTotal}ms`);

  console.log('\n🔍 OPERATION BREAKDOWN:');
  for (const bottleneck of stats.bottlenecks) {
    const bar = '█'.repeat(Math.round(bottleneck.percentage / 2));
    console.log(`  ${bottleneck.operation.padEnd(20)} ${bottleneck.avgTime.toString().padStart(5)}ms ${bar} ${bottleneck.percentage}%`);
  }

  console.log('\n💡 RECOMMENDATIONS:');
  for (const rec of recommendations) {
    console.log(`  • ${rec}`);
  }

  console.log('\n' + '='.repeat(80));

  // Success rate
  const successRate = (results.filter(r => r.success).length / results.length) * 100;
  console.log(`\n✅ Success Rate: ${successRate.toFixed(1)}%`);

  if (successRate < 100) {
    console.log('\n❌ Failed Requests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • "${r.query.substring(0, 50)}...": ${r.error}`);
    });
  }

  return report;
}

/**
 * Run concurrent load test
 */
async function runLoadTest(): Promise<void> {
  console.log('\n📈 LOAD TEST (10 concurrent requests):');

  const promises: Promise<TestResult>[] = [];
  for (let i = 0; i < 10; i++) {
    const query = TEST_QUERIES[i % TEST_QUERIES.length];
    promises.push(makeRequest(query.query));
  }

  const startTime = Date.now();
  const results = await Promise.allSettled(promises);
  const totalTime = Date.now() - startTime;

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const avgTime = totalTime / 10;

  console.log(`  Total time: ${totalTime}ms`);
  console.log(`  Average per request: ${Math.round(avgTime)}ms`);
  console.log(`  Success rate: ${(successful / 10) * 100}%`);
  console.log(`  Throughput: ${Math.round((10 / totalTime) * 1000)} req/s`);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Chat API Performance Profiling');
    console.log(`   Target: ${TEST_CONFIG.baseUrl}`);
    console.log(`   Config: ${TEST_CONFIG.iterations} iterations, ${TEST_QUERIES.length} queries\n`);

    // Check if server is running
    try {
      const health = await fetch(`${TEST_CONFIG.baseUrl}/api/health`);
      if (!health.ok) {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.error('❌ Server is not responding. Please start the server first.');
      process.exit(1);
    }

    // Run tests
    await runWarmup();
    const results = await runTests();
    const report = generateReport(results);

    // Run load test
    await runLoadTest();

    // Save report to file
    const reportPath = `/tmp/chat-performance-report-${Date.now()}.json`;
    await require('fs').promises.writeFile(
      reportPath,
      JSON.stringify(report, null, 2)
    );
    console.log(`\n📄 Full report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(report.statistics.avgTotal > 3000 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Profiling failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { makeRequest, runTests, calculateStatistics, generateReport };