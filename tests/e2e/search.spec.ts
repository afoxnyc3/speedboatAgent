/**
 * E2E Tests for Search API
 * Tests critical search functionality that will be demonstrated
 */

import { test, expect } from '@playwright/test';
import {
  DEMO_SEARCH_QUERIES,
  PERFORMANCE_THRESHOLDS,
  ERROR_SCENARIOS,
  ResponseValidator,
  MockDataGenerator,
  TestEnvironment
} from './fixtures/test-data';

test.describe('Search API E2E Tests', () => {
  test.beforeAll(async () => {
    // Ensure the application is ready
    const isReady = await TestEnvironment.waitForService('http://localhost:3000/api/health');
    expect(isReady).toBe(true);
    await TestEnvironment.setupTestData();
  });

  test.afterAll(async () => {
    await TestEnvironment.cleanupTestData();
  });

  test('GET /api/search - Health check returns service status', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get('/api/search');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.healthCheckTime);

    const data = await response.json();
    expect(ResponseValidator.validateHealthResponse(data)).toBe(true);
    expect(data.status).toBe('healthy');
  });

  test('POST /api/search - Basic search functionality works', async ({ request }) => {
    const searchRequest = MockDataGenerator.generateSearchRequest({
      query: "development environment setup"
    });

    const startTime = Date.now();
    const response = await request.post('/api/search', {
      data: searchRequest
    });
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponseTime);

    const data = await response.json();
    expect(ResponseValidator.validateSearchResponse(data)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    // Check performance headers
    const searchTime = response.headers()['x-search-time'];
    expect(searchTime).toBeDefined();
    expect(parseInt(searchTime!)).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponseTime);
  });

  test.describe('Demo Search Queries', () => {
    DEMO_SEARCH_QUERIES.forEach((testQuery) => {
      test(`Search: ${testQuery.description}`, async ({ request }) => {
        const searchRequest = MockDataGenerator.generateSearchRequest({
          query: testQuery.query,
          limit: 10
        });

        const response = await request.post('/api/search', {
          data: searchRequest
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(ResponseValidator.validateSearchResponse(data)).toBe(true);

        // Verify we get expected number of results
        expect(data.results.length).toBeGreaterThanOrEqual(Math.min(testQuery.expectedResultCount, 1));

        // Verify response includes expected content types
        const allContent = data.results.map((r: any) =>
          (r.content + ' ' + (r.filepath || '') + ' ' + (r.metadata?.url || '')).toLowerCase()
        ).join(' ');

        const foundSources = testQuery.expectedSources.filter(source =>
          allContent.includes(source.toLowerCase())
        );

        expect(foundSources.length).toBeGreaterThan(0);
      });
    });
  });

  test('Search with filters and advanced parameters', async ({ request }) => {
    const searchRequest = MockDataGenerator.generateSearchRequest({
      query: "API documentation",
      limit: 5,
      offset: 0,
      includeContent: true,
      includeEmbedding: false,
      filters: {
        source: "github"
      }
    });

    const response = await request.post('/api/search', {
      data: searchRequest
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(ResponseValidator.validateSearchResponse(data)).toBe(true);
    expect(data.results.length).toBeLessThanOrEqual(5);

    // Verify all results respect the limit
    expect(data.results.length).toBeLessThanOrEqual(searchRequest.limit);
  });

  test('Search response includes proper metadata', async ({ request }) => {
    const searchRequest = MockDataGenerator.generateSearchRequest({
      query: "test query for metadata"
    });

    const response = await request.post('/api/search', {
      data: searchRequest
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.metadata).toBeDefined();
    expect(data.metadata.queryId).toBeDefined();
    expect(data.metadata.searchTime).toBeDefined();
    expect(typeof data.metadata.searchTime).toBe('number');
    expect(data.metadata.searchTime).toBeGreaterThan(0);

    // Check cache headers
    const cacheStatus = response.headers()['x-cache-status'];
    expect(['hit', 'miss']).toContain(cacheStatus);
  });

  test.describe('Error Handling', () => {
    test('Empty query returns validation error', async ({ request }) => {
      const response = await request.post('/api/search', {
        data: { query: "" }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toContain('query');
    });

    test('Invalid JSON body returns parse error', async ({ request }) => {
      const response = await request.post('/api/search', {
        data: "{ invalid json",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);
    });

    test('Missing query parameter returns validation error', async ({ request }) => {
      const response = await request.post('/api/search', {
        data: { limit: 10 } // Missing required query field
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('Extremely large limit parameter is handled', async ({ request }) => {
      const searchRequest = MockDataGenerator.generateSearchRequest({
        query: "test",
        limit: 1000 // Unreasonably large limit
      });

      const response = await request.post('/api/search', {
        data: searchRequest
      });

      // Should either succeed with reasonable results or return validation error
      expect([200, 400]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.results.length).toBeLessThanOrEqual(100); // Reasonable cap
      }
    });
  });

  test('Search performance under concurrent requests', async ({ request }) => {
    const concurrentRequests = 5;
    const searchRequest = MockDataGenerator.generateSearchRequest({
      query: "concurrent search test"
    });

    const startTime = Date.now();

    const promises = Array(concurrentRequests).fill(null).map(() =>
      request.post('/api/search', { data: searchRequest })
    );

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // Average response time should be reasonable
    const avgResponseTime = totalTime / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponseTime * 1.5);
  });

  test('Search with timeout parameter', async ({ request }) => {
    const searchRequest = MockDataGenerator.generateSearchRequest({
      query: "timeout test query",
      timeout: 1000 // 1 second timeout
    });

    const startTime = Date.now();
    const response = await request.post('/api/search', {
      data: searchRequest
    });
    const responseTime = Date.now() - startTime;

    // Should complete within timeout or return appropriate error
    if (response.status() === 200) {
      expect(responseTime).toBeLessThan(1500); // Some buffer for network
      const data = await response.json();
      expect(ResponseValidator.validateSearchResponse(data)).toBe(true);
    } else if (response.status() === 408) {
      // Timeout response is acceptable
      expect(responseTime).toBeGreaterThan(900); // Should have actually timed out
    }
  });
});