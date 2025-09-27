/**
 * Search API Load Test
 * Tests the /api/search endpoint under various load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import {
  BASE_URL,
  STAGES,
  THRESHOLDS,
  getHeaders,
  SAMPLE_QUERIES,
  getRandomItem,
  checkResponse
} from '../config/base.js';

// Custom metrics
const errorRate = new Rate('search_errors');
const cacheHitRate = new Rate('cache_hits');

// Test configuration
export const options = {
  stages: STAGES.load, // Use load profile by default
  thresholds: {
    ...THRESHOLDS,
    search_errors: ['rate<0.01'],     // Custom error rate for search
    'http_req_duration{name:search}': ['p(95)<1500'], // Search specific target
  },
};

export default function searchLoadTest() {
  const query = getRandomItem(SAMPLE_QUERIES);
  const payload = JSON.stringify({
    query: query,
    limit: 10,
    source: 'all',
  });

  const params = {
    headers: getHeaders(),
    tags: { name: 'search' },
  };

  // Make the search request
  const res = http.post(`${BASE_URL}/api/search`, payload, params);

  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.results && Array.isArray(body.results);
      } catch {
        return false;
      }
    },
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has source attribution': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.results.every(result => result.source);
      } catch {
        return false;
      }
    },
  });

  // Track custom metrics
  errorRate.add(!success);

  // Check if response was from cache
  if (res.headers['X-Cache-Hit'] === 'true') {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }

  // Think time between requests
  sleep(Math.random() * 2 + 1); // Random 1-3 second delay
}

// Scenario for different load patterns
export function searchStressTest() {
  options.stages = STAGES.stress;
  return searchLoadTest();
}

export function searchSmokeTest() {
  options.stages = STAGES.smoke;
  return searchLoadTest();
}

export function searchSpikeTest() {
  options.stages = STAGES.spike;
  return searchLoadTest();
}