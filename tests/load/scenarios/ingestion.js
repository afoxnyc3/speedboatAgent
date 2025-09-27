/**
 * Ingestion Pipeline Load Test
 * Tests the web ingestion endpoint under concurrent load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, getHeaders } from '../config/base.js';

// Custom metrics
const ingestionSuccess = new Rate('ingestion_success');
const queueTime = new Trend('ingestion_queue_time');
const processingTime = new Trend('ingestion_processing_time');

// Test configuration - lower concurrency for ingestion
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp to 10 concurrent ingestions
    { duration: '2m', target: 20 },   // Push to 20
    { duration: '2m', target: 20 },   // Sustain
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    ...THRESHOLDS,
    ingestion_success: ['rate>0.90'],           // 90% success rate
    ingestion_queue_time: ['p(95)<5000'],       // Queue within 5s
    'http_req_duration{name:ingestion}': ['p(95)<10000'], // 10s timeout
  },
};

// Sample URLs for testing
const SAMPLE_URLS = [
  'https://example.com/docs/api',
  'https://example.com/docs/getting-started',
  'https://example.com/docs/tutorials',
  'https://example.com/help/faq',
  'https://example.com/api/reference',
];

export default function ingestionLoadTest() {
  const url = SAMPLE_URLS[Math.floor(Math.random() * SAMPLE_URLS.length)];

  const payload = JSON.stringify({
    urls: [url],
    options: {
      maxDepth: 1,
      limit: 10,
      excludePatterns: ['/blog', '/careers'],
    },
  });

  const params = {
    headers: getHeaders(),
    tags: { name: 'ingestion' },
    timeout: '30s',
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/ingest/web`, payload, params);
  const totalTime = Date.now() - startTime;

  // Check response
  const success = check(res, {
    'status is 202 or 200': (r) => r.status === 202 || r.status === 200,
    'has job ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jobId || body.success;
      } catch {
        return false;
      }
    },
    'queued successfully': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'queued' || body.status === 'processing';
      } catch {
        return false;
      }
    },
  });

  // Track metrics
  ingestionSuccess.add(success ? 1 : 0);
  processingTime.add(totalTime);

  // Extract queue time if available
  if (res.headers['X-Queue-Time']) {
    queueTime.add(parseInt(res.headers['X-Queue-Time']));
  }

  // Longer sleep for ingestion operations
  sleep(Math.random() * 10 + 5); // 5-15 second delay
}

// Bulk ingestion stress test
export function bulkIngestionTest() {
  const urls = SAMPLE_URLS.slice(0, 3); // Take first 3 URLs

  const payload = JSON.stringify({
    urls: urls,
    options: {
      maxDepth: 2,
      limit: 50,
      excludePatterns: ['/blog', '/careers', '/legal'],
    },
  });

  const params = {
    headers: getHeaders(),
    tags: { name: 'bulk_ingestion' },
    timeout: '60s',
  };

  const res = http.post(`${BASE_URL}/api/ingest/web`, payload, params);

  check(res, {
    'bulk status is 202': (r) => r.status === 202,
    'bulk has job ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jobId !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(20); // Longer delay for bulk operations
}

// Job status checking
export function jobStatusTest() {
  // First create a job
  const createRes = http.post(
    `${BASE_URL}/api/ingest/web`,
    JSON.stringify({
      urls: ['https://example.com/test'],
      options: { maxDepth: 1, limit: 5 },
    }),
    { headers: getHeaders() }
  );

  let jobId;
  try {
    const body = JSON.parse(createRes.body);
    jobId = body.jobId;
  } catch {
    return;
  }

  if (!jobId) return;

  sleep(2);

  // Check job status
  const statusRes = http.get(
    `${BASE_URL}/api/crawl/status/${jobId}`,
    { headers: getHeaders() }
  );

  check(statusRes, {
    'status check is 200': (r) => r.status === 200,
    'has job status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch {
        return false;
      }
    },
    'status is valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        const validStatuses = ['queued', 'processing', 'completed', 'failed'];
        return validStatuses.includes(body.status);
      } catch {
        return false;
      }
    },
  });

  sleep(3);
}