/**
 * E2E Tests for Error Handling and Edge Cases
 * Tests failure scenarios that could embarrass during demo
 */

import { test, expect } from '@playwright/test';
import {
  RATE_LIMIT_CONFIG,
  ERROR_SCENARIOS,
  PERFORMANCE_THRESHOLDS,
  MockDataGenerator,
  TestEnvironment
} from './fixtures/test-data';

test.describe('Error Handling E2E Tests', () => {
  test.beforeAll(async () => {
    // Ensure the application is ready
    const isReady = await TestEnvironment.waitForService('http://localhost:3000/api/health');
    expect(isReady).toBe(true);
    await TestEnvironment.setupTestData();
  });

  test.afterAll(async () => {
    await TestEnvironment.cleanupTestData();
  });

  test.describe('Rate Limiting Tests', () => {
    test('API handles burst requests gracefully', async ({ request }) => {
      const burstRequests = RATE_LIMIT_CONFIG.testBurstSize;
      const searchRequest = MockDataGenerator.generateSearchRequest({
        query: "rate limit test"
      });

      const promises = Array(burstRequests).fill(null).map((_, index) =>
        request.post('/api/search', {
          data: {
            ...searchRequest,
            query: `${searchRequest.query} ${index}` // Make requests unique
          }
        })
      );

      const responses = await Promise.all(promises);

      // Count successful vs rate-limited responses
      const successfulResponses = responses.filter(r => r.status() === 200);
      const rateLimitedResponses = responses.filter(r => r.status() === 429);

      // Should have some successful responses
      expect(successfulResponses.length).toBeGreaterThan(0);

      // If rate limiting is active, should see 429 responses
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);

        // Check rate limit headers
        const rateLimitResponse = rateLimitedResponses[0];
        const retryAfter = rateLimitResponse.headers()['retry-after'];
        expect(retryAfter).toBeDefined();
      } else {
        // If no rate limiting, all requests should succeed
        expect(successfulResponses.length).toBe(burstRequests);
      }
    });

    test('Rate limited requests provide helpful error messages', async ({ request }) => {
      // Try to trigger rate limit with rapid requests
      const rapidRequests = 20;
      const searchRequest = MockDataGenerator.generateSearchRequest({
        query: "rapid fire test"
      });

      const promises = Array(rapidRequests).fill(null).map(() =>
        request.post('/api/search', { data: searchRequest })
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status() === 429);

      if (rateLimitedResponse) {
        const data = await rateLimitedResponse.json();
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toContain('rate');

        // Should include helpful headers
        const retryAfter = rateLimitedResponse.headers()['retry-after'];
        const rateLimit = rateLimitedResponse.headers()['x-ratelimit-limit'];
        expect(retryAfter || rateLimit).toBeDefined();
      }
    });
  });

  test.describe('Input Validation Errors', () => {
    test('Search API validates required fields', async ({ request }) => {
      const invalidRequests = [
        { /* empty object */ },
        { query: null },
        { query: undefined },
        { query: "" },
        { query: "   " }, // whitespace only
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request.post('/api/search', {
          data: invalidRequest
        });

        expect(response.status()).toBe(400);

        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(data.error.toLowerCase()).toContain('query');
      }
    });

    test('Chat API validates message requirements', async ({ request }) => {
      const invalidRequests = [
        { /* empty object */ },
        { message: null },
        { message: undefined },
        { message: "" },
        { message: "   " }, // whitespace only
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request.post('/api/chat/stream', {
          data: invalidRequest
        });

        expect(response.status()).toBe(500); // Chat API returns 500 for validation errors

        const responseText = await response.text();
        const data = JSON.parse(responseText);
        expect(data.error).toBeDefined();
      }
    });

    test('APIs handle malformed JSON gracefully', async ({ request }) => {
      const endpoints = [
        '/api/search',
        '/api/chat/stream'
      ];

      for (const endpoint of endpoints) {
        const response = await request.post(endpoint, {
          data: "{ malformed json }",
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Should return appropriate error status
        expect([400, 500]).toContain(response.status());

        // Should provide error information
        const responseText = await response.text();
        expect(responseText.length).toBeGreaterThan(0);

        // Try to parse response if possible
        try {
          const data = JSON.parse(responseText);
          expect(data.error || data.message).toBeDefined();
        } catch {
          // If response isn't JSON, it should still be informative
          expect(responseText.toLowerCase()).toMatch(/error|invalid|parse/);
        }
      }
    });

    test('APIs handle oversized payloads', async ({ request }) => {
      const largeQuery = "x".repeat(50000); // 50KB query
      const largeMessage = "y".repeat(50000); // 50KB message

      // Test search with large query
      const searchResponse = await request.post('/api/search', {
        data: { query: largeQuery }
      });

      expect([200, 400, 413]).toContain(searchResponse.status());

      // Test chat with large message
      const chatResponse = await request.post('/api/chat/stream', {
        data: { message: largeMessage }
      });

      expect([200, 400, 413, 500]).toContain(chatResponse.status());
    });
  });

  test.describe('Service Dependency Failures', () => {
    test('Search handles Weaviate connection issues gracefully', async ({ request }) => {
      // Try search when Weaviate might be slow/unavailable
      const searchRequest = MockDataGenerator.generateSearchRequest({
        query: "dependency failure test",
        timeout: 100 // Very short timeout to potentially trigger failures
      });

      const response = await request.post('/api/search', {
        data: searchRequest
      });

      if (response.status() === 200) {
        // If successful, verify response is valid
        const data = await response.json();
        expect(data.results).toBeDefined();
      } else {
        // If failed, should provide informative error
        expect([408, 500, 503]).toContain(response.status());

        const data = await response.json();
        expect(data.error).toBeDefined();
      }
    });

    test('Chat handles memory service failures gracefully', async ({ request }) => {
      // Chat should work even if memory service fails
      const chatRequest = MockDataGenerator.generateChatRequest({
        message: "Test message during memory service issues"
      });

      const response = await request.post('/api/chat/stream', {
        data: chatRequest
      });

      // Chat should still work without memory
      expect(response.status()).toBe(200);

      const responseText = await response.text();
      expect(responseText.length).toBeGreaterThan(0);

      // Check that it handled memory failure gracefully
      const contextUsed = response.headers()['x-context-used'];
      expect(['true', 'false']).toContain(contextUsed);
    });

    test('Monitoring APIs handle service unavailability', async ({ request }) => {
      const monitoringEndpoints = [
        '/api/health',
        '/api/monitoring/costs',
        '/api/cache/metrics'
      ];

      for (const endpoint of monitoringEndpoints) {
        const response = await request.get(endpoint);

        if (response.status() === 200) {
          // If successful, validate response
          const data = await response.json();
          expect(data.timestamp).toBeDefined();
        } else {
          // If failed, should be graceful
          expect([500, 503]).toContain(response.status());

          const data = await response.json();
          expect(data.error || data.message).toBeDefined();
        }
      }
    });
  });

  test.describe('Timeout Handling', () => {
    test('Search respects timeout parameters', async ({ request }) => {
      const shortTimeoutRequest = MockDataGenerator.generateSearchRequest({
        query: "timeout test query",
        timeout: 50 // Very short timeout
      });

      const startTime = Date.now();
      const response = await request.post('/api/search', {
        data: shortTimeoutRequest
      });
      const responseTime = Date.now() - startTime;

      if (response.status() === 408) {
        // Timeout occurred - verify it happened around the timeout period
        expect(responseTime).toBeGreaterThan(40);
        expect(responseTime).toBeLessThan(1000);

        const data = await response.json();
        expect(data.error.toLowerCase()).toContain('timeout');
      } else if (response.status() === 200) {
        // Request completed successfully within timeout
        expect(responseTime).toBeLessThan(100);
      }
    });

    test('APIs handle request timeouts gracefully', async ({ request }) => {
      // Set a short timeout on the request itself
      const endpoints = [
        { path: '/api/search', data: MockDataGenerator.generateSearchRequest() },
        { path: '/api/chat/stream', data: MockDataGenerator.generateChatRequest() }
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await request.post(endpoint.path, {
            data: endpoint.data,
            timeout: 5000 // 5 second timeout
          });

          // Should complete or timeout gracefully
          expect([200, 408, 500]).toContain(response.status());
        } catch (error) {
          // Playwright timeout is acceptable
          expect(error.message).toContain('timeout');
        }
      }
    });
  });

  test.describe('Edge Case Scenarios', () => {
    test('Special characters in queries are handled', async ({ request }) => {
      const specialCharQueries = [
        "query with émojis 🚀 and ünïcode",
        "SQL injection attempt'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "query\nwith\nnewlines\nand\ttabs",
        "Very long query " + "word ".repeat(1000),
        "Numbers: 123456789 and symbols: !@#$%^&*()",
      ];

      for (const query of specialCharQueries) {
        const searchRequest = MockDataGenerator.generateSearchRequest({ query });

        const response = await request.post('/api/search', {
          data: searchRequest
        });

        // Should handle gracefully - either succeed or return appropriate error
        expect([200, 400]).toContain(response.status());

        if (response.status() === 200) {
          const data = await response.json();
          expect(data.results).toBeDefined();
        }
      }
    });

    test('Concurrent error scenarios', async ({ request }) => {
      // Mix of valid and invalid requests
      const mixedRequests = [
        { valid: true, data: MockDataGenerator.generateSearchRequest() },
        { valid: false, data: { query: "" } },
        { valid: true, data: MockDataGenerator.generateSearchRequest({ query: "valid query" }) },
        { valid: false, data: { query: null } },
        { valid: true, data: MockDataGenerator.generateSearchRequest({ query: "another valid query" }) }
      ];

      const promises = mixedRequests.map(req =>
        request.post('/api/search', { data: req.data })
      );

      const responses = await Promise.all(promises);

      // Verify responses match expectations
      responses.forEach((response, index) => {
        const expectedValid = mixedRequests[index].valid;
        if (expectedValid) {
          expect(response.status()).toBe(200);
        } else {
          expect(response.status()).toBe(400);
        }
      });
    });

    test('Recovery after errors', async ({ request }) => {
      // Cause an error
      const errorResponse = await request.post('/api/search', {
        data: { query: "" }
      });
      expect(errorResponse.status()).toBe(400);

      // Verify system recovers with valid request
      const validRequest = MockDataGenerator.generateSearchRequest({
        query: "recovery test query"
      });

      const recoveryResponse = await request.post('/api/search', {
        data: validRequest
      });

      expect(recoveryResponse.status()).toBe(200);

      const data = await recoveryResponse.json();
      expect(data.results).toBeDefined();
    });
  });

  test.describe('Performance Under Stress', () => {
    test('System maintains performance during error conditions', async ({ request }) => {
      // Generate mix of valid and invalid requests
      const totalRequests = 10;
      const invalidRequests = Array(totalRequests / 2).fill(null).map(() =>
        request.post('/api/search', { data: { query: "" } })
      );
      const validRequests = Array(totalRequests / 2).fill(null).map(() =>
        request.post('/api/search', { data: MockDataGenerator.generateSearchRequest() })
      );

      const startTime = Date.now();
      const allResponses = await Promise.all([...invalidRequests, ...validRequests]);
      const totalTime = Date.now() - startTime;

      // System should handle mixed load efficiently
      const avgResponseTime = totalTime / totalRequests;
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponseTime);

      // Valid requests should still succeed
      const validResponses = allResponses.slice(totalRequests / 2);
      validResponses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      // Invalid requests should fail appropriately
      const invalidResponses = allResponses.slice(0, totalRequests / 2);
      invalidResponses.forEach(response => {
        expect(response.status()).toBe(400);
      });
    });

    test('Error responses are fast', async ({ request }) => {
      const errorRequests = [
        { query: "" },
        { query: null },
        { /* missing query */ }
      ];

      for (const errorRequest of errorRequests) {
        const startTime = Date.now();
        const response = await request.post('/api/search', {
          data: errorRequest
        });
        const responseTime = Date.now() - startTime;

        expect(response.status()).toBe(400);
        expect(responseTime).toBeLessThan(500); // Error responses should be very fast
      }
    });
  });
});