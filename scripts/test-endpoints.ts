#!/usr/bin/env npx tsx
/**
 * Test individual endpoints to isolate performance issues
 */

async function testEndpoint(name: string, url: string, body: any) {
  console.log(`\nTesting ${name}...`);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    const data = await response.json();

    console.log(`  ✓ Response in ${elapsed}ms`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Success: ${data.success}`);

    return { success: true, time: elapsed };
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.log(`  ✗ Failed after ${elapsed}ms`);
    console.log(`  Error: ${error.message}`);
    return { success: false, time: elapsed, error: error.message };
  }
}

async function main() {
  console.log('🔍 Testing Individual Endpoints');
  console.log('=' .repeat(40));

  // Test search endpoint
  await testEndpoint(
    'Search API',
    'http://localhost:3000/api/search',
    { query: 'test', limit: 1 }
  );

  // Test chat endpoint with minimal config
  await testEndpoint(
    'Chat API (minimal)',
    'http://localhost:3000/api/chat',
    { message: 'test', maxSources: 1 }
  );

  // Test chat with session
  await testEndpoint(
    'Chat API (with session)',
    'http://localhost:3000/api/chat',
    {
      message: 'test',
      maxSources: 1,
      sessionId: 'test-session',
      conversationId: 'test-conv'
    }
  );
}

main().catch(console.error);