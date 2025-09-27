/**
 * Base Configuration for k6 Load Tests
 * Shared configuration and utilities for all load test scenarios
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_KEY = __ENV.API_KEY || 'test_api_key_12345678901234567890';

// Test stages for gradual load increase
export const STAGES = {
  smoke: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  load: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  stress: [
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Push to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  spike: [
    { duration: '10s', target: 1000 }, // Spike to 1000 users immediately
    { duration: '1m', target: 1000 },  // Stay at 1000 users
    { duration: '10s', target: 0 },    // Drop to 0
  ],
};

// Common thresholds for all tests
export const THRESHOLDS = {
  http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
  http_req_failed: ['rate<0.01'],                   // Error rate < 1%
  http_reqs: ['rate>10'],                          // At least 10 req/s throughput
};

// Common headers
export function getHeaders(includeAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  return headers;
}

// Sample data for tests
export const SAMPLE_QUERIES = [
  'How do I implement authentication?',
  'What is the cache hit rate?',
  'Show me the search API documentation',
  'How does the rate limiter work?',
  'Explain the query classification system',
  'What are the performance metrics?',
  'How to optimize database queries?',
  'What is the system architecture?',
  'How to handle errors in production?',
  'What are the security best practices?',
];

export const SAMPLE_MESSAGES = [
  'Tell me about the codebase structure',
  'How does the RAG system work?',
  'What are the main features?',
  'Explain the memory system',
  'How is feedback collected?',
];

// Utility to get random item from array
export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Check response helper
export function checkResponse(res, expectedStatus = 200) {
  const success = res.status === expectedStatus;
  if (!success) {
    console.error(`Request failed: ${res.status} - ${res.body}`);
  }
  return success;
}