#!/usr/bin/env node

/**
 * Rate Limiting Load Test Script
 * Tests the enhanced rate limiting with endpoint-specific limits
 */

const ENDPOINTS = [
  { path: '/api/health', expectedLimit: Infinity, description: 'Health check (no limit)' },
  { path: '/api/chat', expectedLimit: 20, description: 'Chat endpoint (resource intensive)' },
  { path: '/api/search', expectedLimit: 50, description: 'Search endpoint (medium limit)' },
  { path: '/api/cache/metrics', expectedLimit: 200, description: 'Cache metrics (high limit)' },
];

async function testEndpoint(baseUrl, endpoint) {
  console.log(`\n🧪 Testing ${endpoint.description}`);
  console.log(`   URL: ${baseUrl}${endpoint.path}`);
  console.log(`   Expected limit: ${endpoint.expectedLimit === Infinity ? 'No limit' : endpoint.expectedLimit}`);

  let requestCount = 0;
  let rateLimitHeaders = {};

  try {
    // Send requests until rate limited or max attempts
    const maxAttempts = endpoint.expectedLimit === Infinity ? 5 : Math.min(endpoint.expectedLimit + 5, 25);

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        headers: {
          'X-Forwarded-For': '8.8.8.8', // Use public IP to avoid internal bypass
        },
      });

      requestCount++;

      // Collect rate limit headers
      rateLimitHeaders = {
        limit: response.headers.get('x-ratelimit-limit'),
        remaining: response.headers.get('x-ratelimit-remaining'),
        reset: response.headers.get('x-ratelimit-reset'),
        bypass: response.headers.get('x-ratelimit-bypass'),
      };

      console.log(`   Request ${requestCount}: ${response.status} (remaining: ${rateLimitHeaders.remaining})`);

      if (response.status === 429) {
        const body = await response.json();
        console.log(`   ⚠️  Rate limited after ${requestCount} requests`);
        console.log(`   Message: ${body.message}`);
        console.log(`   Retry after: ${body.retryAfter}s`);
        break;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`   📊 Results:`);
    console.log(`      - Requests made: ${requestCount}`);
    console.log(`      - Rate limit headers: ${JSON.stringify(rateLimitHeaders, null, 8)}`);

    return {
      endpoint: endpoint.path,
      requestsMade: requestCount,
      headers: rateLimitHeaders,
    };

  } catch (error) {
    console.error(`   ❌ Error testing ${endpoint.path}:`, error.message);
    return {
      endpoint: endpoint.path,
      error: error.message,
    };
  }
}

async function testInternalIPBypass(baseUrl) {
  console.log(`\n🔓 Testing Internal IP Bypass`);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      headers: {
        'X-Forwarded-For': '192.168.1.100', // Internal IP
      },
    });

    const bypass = response.headers.get('x-ratelimit-bypass');
    console.log(`   Status: ${response.status}`);
    console.log(`   Bypass reason: ${bypass || 'None'}`);
    console.log(`   ${bypass === 'internal_ip' ? '✅' : '❌'} Internal IP bypass ${bypass === 'internal_ip' ? 'working' : 'failed'}`);

    return { bypass, status: response.status };

  } catch (error) {
    console.error(`   ❌ Error testing internal IP bypass:`, error.message);
    return { error: error.message };
  }
}

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';

  console.log(`🚀 Rate Limiting Load Test`);
  console.log(`   Target: ${baseUrl}`);
  console.log(`   Time: ${new Date().toISOString()}`);

  const results = [];

  // Test each endpoint
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(baseUrl, endpoint);
    results.push(result);
  }

  // Test internal IP bypass
  const bypassResult = await testInternalIPBypass(baseUrl);

  console.log(`\n📈 Summary:`);
  results.forEach(result => {
    if (result.error) {
      console.log(`   ${result.endpoint}: ❌ Error - ${result.error}`);
    } else {
      console.log(`   ${result.endpoint}: ${result.requestsMade} requests (limit: ${result.headers.limit || 'unknown'})`);
    }
  });

  console.log(`   Internal IP bypass: ${bypassResult.bypass ? '✅' : '❌'} ${bypassResult.bypass || 'Failed'}`);
  console.log(`\nTest completed at ${new Date().toISOString()}`);
}

main().catch(console.error);