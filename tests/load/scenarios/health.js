/**
 * Health Check Reliability Test
 * Ensures health endpoint remains stable under extreme load
 */

import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, getHeaders } from '../config/base.js';

// Custom metrics
const healthSuccess = new Rate('health_check_success');
const responseTime = new Trend('health_response_time');

// Test configuration - aggressive load for health checks
export const options = {
  stages: [
    { duration: '10s', target: 500 },   // Quick ramp to 500
    { duration: '30s', target: 1000 },  // Push to 1000
    { duration: '1m', target: 1000 },   // Sustain 1000 users
    { duration: '10s', target: 0 },     // Quick ramp down
  ],
  thresholds: {
    health_check_success: ['rate>0.99'],         // 99% success rate
    health_response_time: ['p(99)<500'],         // 99% under 500ms
    'http_req_duration{name:health}': ['p(99)<300'], // Very fast response
    http_req_failed: ['rate<0.001'],            // 0.1% error rate
  },
};

export default function healthCheckTest() {
  const res = http.get(
    `${BASE_URL}/api/health`,
    {
      headers: getHeaders(false), // No auth for health checks
      tags: { name: 'health' },
      timeout: '5s',
    }
  );

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
    'has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch {
        return false;
      }
    },
    'all systems healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy' || body.status === 'operational';
      } catch {
        return false;
      }
    },
    'has component status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.components && Object.keys(body.components).length > 0;
      } catch {
        return false;
      }
    },
  });

  // Track metrics
  healthSuccess.add(success ? 1 : 0);
  responseTime.add(res.timings.duration);

  // No sleep - maximum pressure test
}

// Component-specific health check
export function componentHealthTest() {
  const components = ['database', 'cache', 'search', 'ingestion'];

  components.forEach(component => {
    const res = http.get(
      `${BASE_URL}/api/health?component=${component}`,
      {
        headers: getHeaders(false),
        tags: { name: `health_${component}` },
      }
    );

    check(res, {
      [`${component} is healthy`]: (r) => {
        if (r.status !== 200) return false;
        try {
          const body = JSON.parse(r.body);
          return body.components &&
                 body.components[component] &&
                 body.components[component].status === 'healthy';
        } catch {
          return false;
        }
      },
      [`${component} response < 200ms`]: (r) => r.timings.duration < 200,
    });
  });
}