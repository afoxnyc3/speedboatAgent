#!/usr/bin/env npx tsx
/**
 * Quick Performance Test for Chat API
 * Measures response times with detailed breakdown
 */

async function testChatPerformance() {
  const queries = [
    "What is the project architecture?",
    "How does caching work?",
    "Explain the search implementation",
  ];

  console.log('🚀 Quick Performance Test\n');
  console.log('Testing', queries.length, 'queries...\n');

  const results: any[] = [];

  for (const query of queries) {
    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          sessionId: `test-${Date.now()}`,
          maxSources: 3,
          streaming: false,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const totalTime = Date.now() - startTime;
      const data = await response.json();

      // Extract performance headers
      const perfHeaders: any = {};
      response.headers.forEach((value, key) => {
        if (key.startsWith('x-performance-')) {
          perfHeaders[key] = parseInt(value);
        }
      });

      // Debug: log all headers to see what's available
      console.log('    Available headers:', Object.fromEntries(response.headers.entries()));
      console.log('    Performance headers found:', perfHeaders);

      results.push({
        query: query.substring(0, 40) + '...',
        success: response.ok,
        total: perfHeaders['x-performance-total'] || totalTime,
        memory: perfHeaders['x-performance-memory'] || 0,
        search: perfHeaders['x-performance-search'] || 0,
        llm: perfHeaders['x-performance-llm'] || 0,
      });

      console.log(`✓ Query: "${query.substring(0, 40)}..."`);
      console.log(`  Total: ${perfHeaders['x-performance-total'] || totalTime}ms`);
      console.log(`  Breakdown: Memory=${perfHeaders['x-performance-memory']}ms, Search=${perfHeaders['x-performance-search']}ms, LLM=${perfHeaders['x-performance-llm']}ms\n`);

    } catch (error: any) {
      console.log(`✗ Query: "${query.substring(0, 40)}..."`);
      console.log(`  Error: ${error.message}\n`);
      results.push({
        query: query.substring(0, 40) + '...',
        success: false,
        error: error.message,
      });
    }
  }

  // Summary
  console.log('=' .repeat(60));
  console.log('PERFORMANCE SUMMARY\n');

  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const avgTotal = Math.round(
      successfulResults.reduce((sum, r) => sum + r.total, 0) / successfulResults.length
    );
    const avgMemory = Math.round(
      successfulResults.reduce((sum, r) => sum + r.memory, 0) / successfulResults.length
    );
    const avgSearch = Math.round(
      successfulResults.reduce((sum, r) => sum + r.search, 0) / successfulResults.length
    );
    const avgLLM = Math.round(
      successfulResults.reduce((sum, r) => sum + r.llm, 0) / successfulResults.length
    );

    console.log(`Average Total Response Time: ${avgTotal}ms`);
    console.log(`Average Breakdown:`);
    console.log(`  - Memory Operations: ${avgMemory}ms (${Math.round((avgMemory / avgTotal) * 100)}%)`);
    console.log(`  - Search Operations: ${avgSearch}ms (${Math.round((avgSearch / avgTotal) * 100)}%)`);
    console.log(`  - LLM Generation: ${avgLLM}ms (${Math.round((avgLLM / avgTotal) * 100)}%)`);

    console.log(`\nTarget Achievement:`);
    if (avgTotal <= 2000) {
      console.log(`✅ MEETS TARGET: ${avgTotal}ms <= 2000ms`);
    } else if (avgTotal <= 3000) {
      console.log(`⚠️  CLOSE TO TARGET: ${avgTotal}ms (target: 2000ms)`);
    } else {
      console.log(`❌ EXCEEDS TARGET: ${avgTotal}ms > 3000ms`);
    }

    // Identify bottleneck
    const operations = [
      { name: 'Memory', time: avgMemory },
      { name: 'Search', time: avgSearch },
      { name: 'LLM', time: avgLLM },
    ].sort((a, b) => b.time - a.time);

    console.log(`\nPrimary Bottleneck: ${operations[0].name} (${operations[0].time}ms)`);
  }

  console.log('\n' + '=' .repeat(60));
}

// Run the test
testChatPerformance().catch(console.error);