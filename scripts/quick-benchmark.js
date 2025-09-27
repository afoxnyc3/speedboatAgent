/**
 * Quick Memory Benchmark Test
 */

// Simple color functions for console output
const colors = {
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
};

async function testConfiguration(name, envOverrides) {
  console.log(colors.cyan(`\n🔄 Testing: ${name}`));

  // Apply environment overrides
  const originalEnv = {};
  for (const [key, value] of Object.entries(envOverrides)) {
    originalEnv[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const times = [];

  for (let i = 0; i < 3; i++) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'What is the purpose of the RAG agent?',
          sessionId: `benchmark-${Date.now()}`,
          conversationId: `conv-${Date.now()}`,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log(colors.green(`  ✓ Request ${i + 1}: ${responseTime}ms`));
        times.push(responseTime);

        // Show memory impact if available
        if (data.metrics) {
          console.log(colors.gray(`    Memory: ${data.metrics.memoryFetchTime}, Search: ${data.metrics.searchTime}ms`));
        }
      } else {
        console.log(colors.red(`  ✗ Request ${i + 1} failed: ${response.status}`));
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(colors.red(`  ✗ Request ${i + 1} timeout (20s)`));
      } else {
        console.log(colors.red(`  ✗ Request ${i + 1} error: ${error.message}`));
      }
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Restore environment
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  // Calculate average
  if (times.length > 0) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(colors.bold(`  Average: ${avg.toFixed(0)}ms`));
    return avg;
  }

  return null;
}

async function main() {
  console.log(colors.bold(colors.blue('🚀 Quick RAG Agent Memory Benchmark\n')));

  // Check server health
  try {
    const health = await fetch('http://localhost:3000/api/health');
    if (!health.ok) {
      console.error(colors.red('❌ Server health check failed'));
      process.exit(1);
    }
  } catch (error) {
    console.error(colors.red('❌ Cannot connect to server. Please run: npm run dev'));
    process.exit(1);
  }

  const results = {};

  // Test 1: Baseline (No Memory)
  results.baseline = await testConfiguration('Baseline (No Memory)', {
    MEM0_API_KEY: undefined,
  });

  // Test 2: With Mem0
  results.withMem0 = await testConfiguration('With Mem0', {
    MEM0_API_KEY: process.env.MEM0_API_KEY,
  });

  // Test 3: Redis-Only Memory
  results.redisOnly = await testConfiguration('Redis-Only Memory', {
    MEM0_API_KEY: undefined,
    USE_REDIS_MEMORY: 'true',
  });

  // Summary
  console.log(colors.bold(colors.cyan('\n📊 Summary:\n')));
  console.log(`  Baseline:     ${results.baseline ? results.baseline.toFixed(0) + 'ms' : 'Failed'}`);
  console.log(`  With Mem0:    ${results.withMem0 ? results.withMem0.toFixed(0) + 'ms' : 'Failed'}`);
  console.log(`  Redis-Only:   ${results.redisOnly ? results.redisOnly.toFixed(0) + 'ms' : 'Failed'}`);

  if (results.baseline && results.withMem0) {
    const overhead = results.withMem0 - results.baseline;
    const overheadPercent = (overhead / results.baseline * 100).toFixed(1);
    console.log(colors.yellow(`\n  Mem0 Overhead: +${overhead.toFixed(0)}ms (${overheadPercent}%)`));

    if (results.withMem0 > 3000) {
      console.log(colors.red(`  ❌ Current response time exceeds 3s target`));
      console.log(colors.bold(colors.red('\n💡 Recommendation: REMOVE or OPTIMIZE Mem0')));
      console.log('  - Response time is too high (target: <3s)');
      console.log('  - Consider Redis-only memory solution');
      console.log('  - Or implement aggressive caching for Mem0 calls');
    } else {
      console.log(colors.green(`  ✅ Response time meets 3s target`));
      console.log(colors.bold(colors.green('\n💡 Recommendation: KEEP Mem0 with optimizations')));
    }
  }
}

// Load environment variables
require('dotenv').config();

// Run the benchmark
main().catch(console.error);