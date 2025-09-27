/**
 * Memory Benchmark Script for RAG Agent
 * Tests different memory configurations to identify performance bottlenecks
 */

import { config } from 'dotenv';
import { performance } from 'perf_hooks';
import chalk from 'chalk';
import Table from 'cli-table3';

// Load environment variables
config();

// Test configurations
interface TestConfig {
  name: string;
  description: string;
  envOverrides: Record<string, string | undefined>;
}

const configurations: TestConfig[] = [
  {
    name: 'Baseline (No Memory)',
    description: 'Direct search without any memory layer',
    envOverrides: {
      MEM0_API_KEY: undefined, // This will use MockMem0Client
    }
  },
  {
    name: 'With Mem0',
    description: 'Current production setup with Mem0 integration',
    envOverrides: {
      MEM0_API_KEY: process.env.MEM0_API_KEY, // Use actual API key
    }
  },
  // Commenting out for faster initial test
  // {
  //   name: 'Redis-Only Memory',
  //   description: 'Lightweight Redis-based conversation memory',
  //   envOverrides: {
  //     MEM0_API_KEY: undefined,
  //     USE_REDIS_MEMORY: 'true', // Custom flag we'll implement
  //   }
  // },
  // {
  //   name: 'PostgreSQL Pattern',
  //   description: 'Mock PostgreSQL memory (design pattern only)',
  //   envOverrides: {
  //     MEM0_API_KEY: undefined,
  //     USE_PG_MEMORY_MOCK: 'true', // Custom flag for mock PG
  //   }
  // }
];

// Test queries to benchmark - reduced for faster testing
const testQueries = [
  'What is the purpose of the RAG agent?',
  'How does the hybrid search work?',
  'What are the performance requirements?',
  'Explain the memory integration',
  'What databases are used in the system?'
];

interface BenchmarkResult {
  config: string;
  avgResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  minTime: number;
  maxTime: number;
  failures: number;
  memoryImpact: number; // Time spent in memory operations
}

/**
 * Make a request to the chat API and measure response time
 */
async function makeChatRequest(
  query: string,
  sessionId: string,
  conversationId: string
): Promise<{ responseTime: number; success: boolean; memoryTime?: number }> {
  const startTime = performance.now();
  const timeout = 15000; // 15 second timeout per request

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        sessionId,
        conversationId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    if (!response.ok) {
      console.error(`Request failed: ${response.status} ${response.statusText}`);
      return { responseTime, success: false };
    }

    const data = await response.json();

    // Extract memory timing from response metrics if available
    const memoryTime = data.metrics?.memoryFetchTime === 'success' ?
      data.metrics.totalTime - data.metrics.searchTime : 0;

    return {
      responseTime,
      success: true,
      memoryTime
    };
  } catch (error: any) {
    const endTime = performance.now();
    if (error.name === 'AbortError') {
      console.error('Request timeout after 15s');
    } else {
      console.error('Request error:', error.message);
    }
    return {
      responseTime: endTime - startTime,
      success: false
    };
  }
}

/**
 * Calculate percentiles from an array of numbers
 */
function calculatePercentile(arr: number[], percentile: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Run benchmark for a specific configuration
 */
async function runBenchmark(config: TestConfig): Promise<BenchmarkResult> {
  console.log(chalk.cyan(`\n🔄 Testing: ${config.name}`));
  console.log(chalk.gray(`   ${config.description}`));

  // Apply environment overrides
  const originalEnv: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(config.envOverrides)) {
    originalEnv[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const responseTimes: number[] = [];
  const memoryTimes: number[] = [];
  let failures = 0;
  const sessionId = `benchmark-${Date.now()}`;
  const conversationId = `conv-${Date.now()}`;

  // Warm-up request (not counted)
  console.log(chalk.gray('   Warming up...'));
  await makeChatRequest(testQueries[0], sessionId, conversationId);

  // Run test queries
  const progressBar = '█';
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    process.stdout.write(chalk.green(`   Progress: ${progressBar.repeat(i + 1)}${' '.repeat(10 - i - 1)} [${i + 1}/${testQueries.length}]\r`));

    const result = await makeChatRequest(query, sessionId, conversationId);

    if (result.success) {
      responseTimes.push(result.responseTime);
      if (result.memoryTime !== undefined) {
        memoryTimes.push(result.memoryTime);
      }
    } else {
      failures++;
    }

    // Small delay between requests to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(); // New line after progress

  // Restore original environment
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  // Calculate statistics
  if (responseTimes.length === 0) {
    return {
      config: config.name,
      avgResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      minTime: 0,
      maxTime: 0,
      failures: testQueries.length,
      memoryImpact: 0
    };
  }

  return {
    config: config.name,
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    p50: calculatePercentile(responseTimes, 50),
    p95: calculatePercentile(responseTimes, 95),
    p99: calculatePercentile(responseTimes, 99),
    minTime: Math.min(...responseTimes),
    maxTime: Math.max(...responseTimes),
    failures,
    memoryImpact: memoryTimes.length > 0 ?
      memoryTimes.reduce((a, b) => a + b, 0) / memoryTimes.length : 0
  };
}

/**
 * Display results in a formatted table
 */
function displayResults(results: BenchmarkResult[]) {
  console.log(chalk.bold.cyan('\n📊 Benchmark Results\n'));

  const table = new Table({
    head: [
      chalk.white('Configuration'),
      chalk.white('Avg (ms)'),
      chalk.white('P50 (ms)'),
      chalk.white('P95 (ms)'),
      chalk.white('P99 (ms)'),
      chalk.white('Min (ms)'),
      chalk.white('Max (ms)'),
      chalk.white('Failures'),
      chalk.white('Memory Impact (ms)')
    ],
    colWidths: [25, 12, 12, 12, 12, 12, 12, 10, 18],
    style: {
      head: [],
      border: []
    }
  });

  // Find best performer
  const bestAvg = Math.min(...results.filter(r => r.failures < testQueries.length).map(r => r.avgResponseTime));

  results.forEach(result => {
    const isBest = result.avgResponseTime === bestAvg && result.failures < testQueries.length;
    const avgColor = result.avgResponseTime < 3000 ? chalk.green :
                     result.avgResponseTime < 5000 ? chalk.yellow : chalk.red;

    table.push([
      isBest ? chalk.bold.green(`${result.config} ⭐`) : result.config,
      avgColor(result.avgResponseTime.toFixed(0)),
      result.p50.toFixed(0),
      result.p95.toFixed(0),
      result.p99.toFixed(0),
      result.minTime.toFixed(0),
      result.maxTime.toFixed(0),
      result.failures > 0 ? chalk.red(result.failures.toString()) : chalk.green('0'),
      result.memoryImpact.toFixed(0)
    ]);
  });

  console.log(table.toString());

  // Analysis and recommendations
  console.log(chalk.bold.cyan('\n🔍 Analysis:\n'));

  const baseline = results.find(r => r.config === 'Baseline (No Memory)');
  const withMem0 = results.find(r => r.config === 'With Mem0');

  if (baseline && withMem0) {
    const overhead = withMem0.avgResponseTime - baseline.avgResponseTime;
    const overheadPercent = (overhead / baseline.avgResponseTime * 100).toFixed(1);

    console.log(`• Mem0 adds ${chalk.yellow(`${overhead.toFixed(0)}ms`)} (${overheadPercent}%) overhead to response time`);

    if (withMem0.avgResponseTime > 3000) {
      console.log(chalk.red(`• Current response time (${withMem0.avgResponseTime.toFixed(0)}ms) exceeds target (3000ms)`));
    } else {
      console.log(chalk.green(`• Current response time (${withMem0.avgResponseTime.toFixed(0)}ms) meets target (3000ms)`));
    }
  }

  // Performance categorization
  console.log('\n' + chalk.bold('Performance Breakdown:'));
  results.forEach(result => {
    const rating = result.avgResponseTime < 2000 ? '🚀 Excellent' :
                   result.avgResponseTime < 3000 ? '✅ Good' :
                   result.avgResponseTime < 5000 ? '⚠️  Needs Improvement' :
                   '❌ Poor';
    console.log(`  ${result.config}: ${rating}`);
  });
}

/**
 * Generate recommendations based on results
 */
function generateRecommendations(results: BenchmarkResult[]) {
  console.log(chalk.bold.cyan('\n💡 Recommendations:\n'));

  const baseline = results.find(r => r.config === 'Baseline (No Memory)');
  const withMem0 = results.find(r => r.config === 'With Mem0');
  const redisOnly = results.find(r => r.config === 'Redis-Only Memory');

  if (!baseline || !withMem0) {
    console.log(chalk.red('Unable to generate recommendations - missing baseline data'));
    return;
  }

  const mem0Overhead = withMem0.avgResponseTime - baseline.avgResponseTime;
  const mem0OverheadPercent = (mem0Overhead / baseline.avgResponseTime * 100);

  // Main recommendation
  if (withMem0.avgResponseTime < 3000) {
    console.log(chalk.green.bold('✅ KEEP MEM0') + ' - Response time is within acceptable limits');
    console.log('   However, consider these optimizations:');
    console.log('   • Reduce Mem0 timeout from 2s to 1s for faster failures');
    console.log('   • Implement more aggressive caching for memory lookups');
    console.log('   • Use Redis for session-level memory caching');
  } else if (mem0OverheadPercent > 100) {
    console.log(chalk.red.bold('❌ REMOVE MEM0') + ' - It\'s more than doubling response time');
    console.log('   Alternative approaches:');
    console.log('   • Implement lightweight Redis-based conversation memory');
    console.log('   • Use PostgreSQL for long-term memory with aggressive caching');
    console.log('   • Consider vector-based memory search with Weaviate');
  } else if (redisOnly && redisOnly.avgResponseTime < 3000) {
    console.log(chalk.yellow.bold('⚡ OPTIMIZE MEM0') + ' or switch to Redis-only solution');
    console.log('   Optimization strategies:');
    console.log('   • Implement connection pooling for Mem0');
    console.log('   • Add Redis cache layer in front of Mem0');
    console.log('   • Reduce memory search scope to last 5 messages');
    console.log('   • Use async fire-and-forget for memory writes');
  } else {
    console.log(chalk.yellow.bold('⚠️  OPTIMIZE MEM0') + ' - Current performance needs improvement');
    console.log('   Suggested optimizations:');
    console.log('   • Implement circuit breaker (already done ✓)');
    console.log('   • Add timeout protection (already done ✓)');
    console.log('   • Consider hybrid approach: Redis for hot data, Mem0 for cold');
    console.log('   • Implement query-based memory relevance filtering');
  }

  // Additional insights
  console.log('\n' + chalk.bold('Additional Insights:'));
  console.log(`• Baseline performance: ${baseline.avgResponseTime.toFixed(0)}ms`);
  console.log(`• Mem0 overhead: ${mem0Overhead.toFixed(0)}ms (${mem0OverheadPercent.toFixed(1)}%)`);
  console.log(`• Target response time: 3000ms`);
  console.log(`• Current gap to target: ${Math.max(0, withMem0.avgResponseTime - 3000).toFixed(0)}ms`);

  // Architecture suggestions
  if (withMem0.avgResponseTime > 5000) {
    console.log('\n' + chalk.bold.red('🔴 Critical Performance Issue Detected'));
    console.log('Immediate actions required:');
    console.log('1. Temporarily disable Mem0 in production');
    console.log('2. Implement Redis-based memory as stopgap');
    console.log('3. Investigate Mem0 API latency issues');
    console.log('4. Consider self-hosted memory solution');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.bold.blue('🚀 RAG Agent Memory Benchmark\n'));
  console.log(chalk.gray('Testing different memory configurations...'));
  console.log(chalk.gray(`Running ${testQueries.length} queries per configuration\n`));

  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health');
    if (!healthCheck.ok) {
      console.error(chalk.red('❌ Server health check failed. Please ensure the server is running on port 3000.'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('❌ Cannot connect to server. Please run: npm run dev'));
    process.exit(1);
  }

  const results: BenchmarkResult[] = [];

  // Run benchmarks for each configuration
  for (const config of configurations) {
    try {
      const result = await runBenchmark(config);
      results.push(result);
      console.log(chalk.green(`   ✓ Completed: ${config.name}`));
    } catch (error) {
      console.error(chalk.red(`   ✗ Failed: ${config.name}`), error);
      results.push({
        config: config.name,
        avgResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        minTime: 0,
        maxTime: 0,
        failures: testQueries.length,
        memoryImpact: 0
      });
    }
  }

  // Display results and recommendations
  displayResults(results);
  generateRecommendations(results);

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `benchmark-results-${timestamp}.json`;

  try {
    const fs = await import('fs/promises');
    await fs.writeFile(
      resultsFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        queries: testQueries,
        configurations,
        results
      }, null, 2)
    );
    console.log(chalk.gray(`\n📁 Results saved to: ${resultsFile}`));
  } catch (error) {
    console.error('Failed to save results:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { makeChatRequest, runBenchmark, BenchmarkResult };