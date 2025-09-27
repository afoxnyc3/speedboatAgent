/**
 * Chat API Streaming Load Test
 * Tests the /api/chat endpoint with streaming responses
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  STAGES,
  THRESHOLDS,
  getHeaders,
  SAMPLE_MESSAGES,
  getRandomItem
} from '../config/base.js';

// Custom metrics
const errorRate = new Rate('chat_errors');
const streamingErrors = new Rate('streaming_errors');
const timeToFirstByte = new Trend('time_to_first_byte');

// Test configuration - lower concurrent users for streaming
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Push to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ...THRESHOLDS,
    chat_errors: ['rate<0.02'],              // Allow 2% error for streaming
    streaming_errors: ['rate<0.05'],         // 5% streaming error tolerance
    time_to_first_byte: ['p(95)<1000'],     // First byte within 1s
    'http_req_duration{name:chat}': ['p(95)<5000'], // Chat can take longer
  },
};

export default function chatLoadTest() {
  const message = getRandomItem(SAMPLE_MESSAGES);
  const sessionId = `session_${__VU}_${Date.now()}`; // Unique session per VU

  const payload = JSON.stringify({
    message: message,
    sessionId: sessionId,
    stream: true,
  });

  const params = {
    headers: getHeaders(),
    tags: { name: 'chat' },
    timeout: '30s', // Longer timeout for streaming
  };

  // Make the chat request
  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/chat`, payload, params);

  // Measure time to first byte
  if (res.timings.waiting) {
    timeToFirstByte.add(res.timings.waiting);
  }

  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response is streaming': (r) => {
      return r.headers['content-type'] &&
             r.headers['content-type'].includes('text/event-stream');
    },
    'response has content': (r) => r.body && r.body.length > 0,
    'time to first byte < 1s': (r) => r.timings.waiting < 1000,
    'total time < 10s': (r) => r.timings.duration < 10000,
  });

  // Parse streaming response
  let streamSuccess = false;
  if (success && res.body) {
    try {
      const lines = res.body.split('\n');
      const dataLines = lines.filter(line => line.startsWith('data:'));

      streamSuccess = check(dataLines, {
        'has multiple chunks': (lines) => lines.length > 1,
        'has done signal': (lines) => {
          return lines.some(line => line.includes('[DONE]'));
        },
        'chunks are valid': (lines) => {
          return lines.every(line => {
            if (line.includes('[DONE]')) return true;
            try {
              const data = line.replace('data: ', '');
              JSON.parse(data);
              return true;
            } catch {
              return false;
            }
          });
        },
      });
    } catch (e) {
      console.error('Streaming parse error:', e);
    }
  }

  // Track custom metrics
  errorRate.add(!success);
  streamingErrors.add(!streamSuccess);

  // Longer think time for chat interactions
  sleep(Math.random() * 5 + 3); // Random 3-8 second delay
}

// Scenario for stress testing chat
export function chatStressTest() {
  options.stages = [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 200 },  // Push to 200 concurrent chats
    { duration: '1m', target: 0 },
  ];
  return chatLoadTest();
}