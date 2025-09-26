/**
 * Aggregate Load Test Runner
 * Runs all test scenarios in sequence with reporting
 */

import { group } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/loadimpact/k6-html-report/master/dist/bundle.js';

// Import all test scenarios
import searchLoadTest from './scenarios/search.js';
import chatLoadTest from './scenarios/chat.js';
import cacheLoadTest from './scenarios/cache.js';
import healthCheckTest from './scenarios/health.js';

// Aggregate test configuration
export const options = {
  scenarios: {
    // Run health checks continuously as baseline
    health_baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '15m',
      exec: 'healthScenario',
      startTime: '0s',
    },
    // Search load test
    search_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      exec: 'searchScenario',
      startTime: '30s',
    },
    // Chat streaming test
    chat_streaming: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      exec: 'chatScenario',
      startTime: '2m',
    },
    // Cache performance test
    cache_ops: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'cacheScenario',
      startTime: '4m',
    },
    // Stress test spike
    stress_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      exec: 'stressScenario',
      startTime: '10m',
    },
  },
  thresholds: {
    // Global thresholds
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'],
    http_reqs: ['rate>5'],

    // Scenario-specific thresholds
    'http_req_duration{scenario:search_load}': ['p(95)<1500'],
    'http_req_duration{scenario:chat_streaming}': ['p(95)<5000'],
    'http_req_duration{scenario:cache_ops}': ['p(95)<1000'],
    'http_req_duration{scenario:health_baseline}': ['p(99)<300'],
    'http_req_failed{scenario:stress_spike}': ['rate<0.05'],
  },
};

// Scenario functions
export function healthScenario() {
  healthCheckTest();
}

export function searchScenario() {
  group('Search API', () => {
    searchLoadTest();
  });
}

export function chatScenario() {
  group('Chat API', () => {
    chatLoadTest();
  });
}

export function cacheScenario() {
  group('Cache Operations', () => {
    cacheLoadTest();
  });
}

export function stressScenario() {
  group('Stress Test', () => {
    // Randomly choose an endpoint to stress
    const choice = Math.random();
    if (choice < 0.5) {
      searchLoadTest();
    } else if (choice < 0.8) {
      healthCheckTest();
    } else {
      cacheLoadTest();
    }
  });
}

// Custom summary generation
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    // Console output
    stdout: textSummary(data, { indent: ' ', enableColors: true }),

    // JSON report
    [`./results/summary-${timestamp}.json`]: JSON.stringify(data, null, 2),

    // HTML report
    [`./results/report-${timestamp}.html`]: htmlReport(data),

    // Simplified metrics for CI
    './results/latest-metrics.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      duration: data.state.testRunDurationMs,
      iterations: data.metrics.iterations,
      requests: data.metrics.http_reqs,
      errors: data.metrics.http_req_failed,
      p95_duration: data.metrics.http_req_duration.values['p(95)'],
      p99_duration: data.metrics.http_req_duration.values['p(99)'],
      passed: data.state.thresholdFailures === 0,
    }, null, 2),
  };
}