/**
 * Performance Benchmark Suite
 * Establishes baseline performance metrics for all endpoints
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, getHeaders, SAMPLE_QUERIES, getRandomItem } from './config/base.js';

// Custom metrics for benchmarking
const searchLatency = new Trend('benchmark_search_latency');
const chatLatency = new Trend('benchmark_chat_latency');
const cacheLatency = new Trend('benchmark_cache_latency');
const healthLatency = new Trend('benchmark_health_latency');
const throughput = new Counter('benchmark_throughput');
const successRate = new Rate('benchmark_success_rate');

// Benchmark configuration - single user to establish baseline
export const options = {
  vus: 1,
  iterations: 100, // Run each test 100 times
  thresholds: {
    benchmark_search_latency: ['p(50)<500', 'p(95)<1500'],
    benchmark_chat_latency: ['p(50)<1000', 'p(95)<3000'],
    benchmark_cache_latency: ['p(50)<200', 'p(95)<500'],
    benchmark_health_latency: ['p(50)<50', 'p(95)<150'],
    benchmark_success_rate: ['rate>0.98'],
  },
};

export default function performanceBenchmark() {
  // Benchmark Search API
  group('Search Benchmark', () => {
    const query = getRandomItem(SAMPLE_QUERIES);
    const payload = JSON.stringify({
      query: query,
      limit: 10,
      source: 'all',
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/search`, payload, {
      headers: getHeaders(),
      tags: { benchmark: 'search' },
    });
    const duration = Date.now() - start;

    const success = check(res, {
      'search: status 200': (r) => r.status === 200,
      'search: has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.results && Array.isArray(body.results);
        } catch {
          return false;
        }
      },
    });

    searchLatency.add(duration);
    successRate.add(success ? 1 : 0);
    throughput.add(1);

    sleep(0.5);
  });

  // Benchmark Chat API
  group('Chat Benchmark', () => {
    const message = 'What is the system architecture?';
    const payload = JSON.stringify({
      message: message,
      sessionId: `benchmark_${Date.now()}`,
      stream: false, // Non-streaming for consistent benchmarking
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/chat`, payload, {
      headers: getHeaders(),
      tags: { benchmark: 'chat' },
      timeout: '30s',
    });
    const duration = Date.now() - start;

    const success = check(res, {
      'chat: status 200': (r) => r.status === 200,
      'chat: has response': (r) => r.body && r.body.length > 0,
    });

    chatLatency.add(duration);
    successRate.add(success ? 1 : 0);
    throughput.add(1);

    sleep(1);
  });

  // Benchmark Cache Metrics
  group('Cache Benchmark', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/cache/metrics`, {
      headers: getHeaders(),
      tags: { benchmark: 'cache' },
    });
    const duration = Date.now() - start;

    const success = check(res, {
      'cache: status 200': (r) => r.status === 200,
      'cache: has metrics': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.metrics && body.metrics.hitRate !== undefined;
        } catch {
          return false;
        }
      },
    });

    cacheLatency.add(duration);
    successRate.add(success ? 1 : 0);
    throughput.add(1);

    sleep(0.2);
  });

  // Benchmark Health Check
  group('Health Benchmark', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: getHeaders(false),
      tags: { benchmark: 'health' },
    });
    const duration = Date.now() - start;

    const success = check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: is healthy': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy' || body.status === 'operational';
        } catch {
          return false;
        }
      },
    });

    healthLatency.add(duration);
    successRate.add(success ? 1 : 0);
    throughput.add(1);

    sleep(0.1);
  });
}

// Export benchmark results
export function handleSummary(data) {
  const results = {
    timestamp: new Date().toISOString(),
    benchmarks: {
      search: {
        p50: data.metrics.benchmark_search_latency?.values['p(50)'] || 0,
        p95: data.metrics.benchmark_search_latency?.values['p(95)'] || 0,
        p99: data.metrics.benchmark_search_latency?.values['p(99)'] || 0,
        avg: data.metrics.benchmark_search_latency?.values.avg || 0,
      },
      chat: {
        p50: data.metrics.benchmark_chat_latency?.values['p(50)'] || 0,
        p95: data.metrics.benchmark_chat_latency?.values['p(95)'] || 0,
        p99: data.metrics.benchmark_chat_latency?.values['p(99)'] || 0,
        avg: data.metrics.benchmark_chat_latency?.values.avg || 0,
      },
      cache: {
        p50: data.metrics.benchmark_cache_latency?.values['p(50)'] || 0,
        p95: data.metrics.benchmark_cache_latency?.values['p(95)'] || 0,
        p99: data.metrics.benchmark_cache_latency?.values['p(99)'] || 0,
        avg: data.metrics.benchmark_cache_latency?.values.avg || 0,
      },
      health: {
        p50: data.metrics.benchmark_health_latency?.values['p(50)'] || 0,
        p95: data.metrics.benchmark_health_latency?.values['p(95)'] || 0,
        p99: data.metrics.benchmark_health_latency?.values['p(99)'] || 0,
        avg: data.metrics.benchmark_health_latency?.values.avg || 0,
      },
    },
    overall: {
      successRate: data.metrics.benchmark_success_rate?.values.rate || 0,
      totalRequests: data.metrics.benchmark_throughput?.values.count || 0,
      duration: data.state.testRunDurationMs,
    },
  };

  console.log('\n📊 Performance Benchmark Results:');
  console.log('================================');
  console.log(`Search API: P50=${results.benchmarks.search.p50}ms, P95=${results.benchmarks.search.p95}ms`);
  console.log(`Chat API: P50=${results.benchmarks.chat.p50}ms, P95=${results.benchmarks.chat.p95}ms`);
  console.log(`Cache API: P50=${results.benchmarks.cache.p50}ms, P95=${results.benchmarks.cache.p95}ms`);
  console.log(`Health API: P50=${results.benchmarks.health.p50}ms, P95=${results.benchmarks.health.p95}ms`);
  console.log(`Success Rate: ${(results.overall.successRate * 100).toFixed(2)}%`);
  console.log('================================\n');

  return {
    './results/benchmark.json': JSON.stringify(results, null, 2),
    stdout: JSON.stringify(results, null, 2),
  };
}