/**
 * Cache Performance Load Test
 * Tests cache warming and metrics endpoints under load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  THRESHOLDS,
  getHeaders,
  SAMPLE_QUERIES,
  getRandomItem
} from '../config/base.js';

// Custom metrics
const warmingSuccess = new Rate('cache_warming_success');
const metricsSuccess = new Rate('cache_metrics_success');
const cacheHitRatio = new Trend('cache_hit_ratio');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS,
    cache_warming_success: ['rate>0.95'],     // 95% warming success
    cache_metrics_success: ['rate>0.98'],     // 98% metrics success
    cache_hit_ratio: ['avg>0.7'],            // Maintain 70% hit rate
    'http_req_duration{group:cache_warm}': ['p(95)<3000'],
    'http_req_duration{group:cache_metrics}': ['p(95)<500'],
  },
};

export default function cacheLoadTest() {
  // Test cache warming
  group('cache_warm', () => {
    const queries = [];
    for (let i = 0; i < 5; i++) {
      queries.push(getRandomItem(SAMPLE_QUERIES));
    }

    const warmPayload = JSON.stringify({
      queries: queries,
      priority: 'high',
    });

    const warmRes = http.post(
      `${BASE_URL}/api/cache/warm`,
      warmPayload,
      {
        headers: getHeaders(),
        tags: { name: 'cache_warm' },
      }
    );

    const success = check(warmRes, {
      'warm status is 200': (r) => r.status === 200,
      'warming completed': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
      'queries were warmed': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.warmed && body.warmed > 0;
        } catch {
          return false;
        }
      },
    });

    warmingSuccess.add(success ? 1 : 0);
  });

  sleep(1);

  // Test cache metrics
  group('cache_metrics', () => {
    const metricsRes = http.get(
      `${BASE_URL}/api/cache/metrics`,
      {
        headers: getHeaders(),
        tags: { name: 'cache_metrics' },
      }
    );

    const success = check(metricsRes, {
      'metrics status is 200': (r) => r.status === 200,
      'has hit rate': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.metrics && body.metrics.hitRate !== undefined;
        } catch {
          return false;
        }
      },
      'hit rate above 70%': (r) => {
        try {
          const body = JSON.parse(r.body);
          const hitRate = body.metrics.hitRate;
          cacheHitRatio.add(hitRate);
          return hitRate >= 0.7;
        } catch {
          return false;
        }
      },
      'has memory usage': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.metrics && body.metrics.memoryUsage !== undefined;
        } catch {
          return false;
        }
      },
    });

    metricsSuccess.add(success ? 1 : 0);
  });

  sleep(Math.random() * 2 + 1);
}

// Cache optimization test
export function cacheOptimizationTest() {
  const optimizePayload = JSON.stringify({
    action: 'analyze',
    options: {
      targetHitRate: 0.8,
      compressionThreshold: 1024,
    },
  });

  const res = http.post(
    `${BASE_URL}/api/cache/optimize`,
    optimizePayload,
    {
      headers: getHeaders(),
      tags: { name: 'cache_optimize' },
      timeout: '10s',
    }
  );

  check(res, {
    'optimize status is 200': (r) => r.status === 200,
    'analysis complete': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.analysis;
      } catch {
        return false;
      }
    },
    'recommendations provided': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.recommendations && body.recommendations.length > 0;
      } catch {
        return false;
      }
    },
  });

  sleep(3);
}