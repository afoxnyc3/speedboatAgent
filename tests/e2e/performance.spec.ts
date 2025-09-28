/**
 * E2E Tests for Performance Monitoring APIs
 * Tests critical monitoring endpoints that will be demonstrated
 */

import { test, expect } from '@playwright/test';
import {
  PERFORMANCE_THRESHOLDS,
  ResponseValidator,
  TestEnvironment
} from './fixtures/test-data';

test.describe('Performance Monitoring E2E Tests', () => {
  test.beforeAll(async () => {
    // Ensure the application is ready
    const isReady = await TestEnvironment.waitForService('http://localhost:3000/api/health');
    expect(isReady).toBe(true);
    await TestEnvironment.setupTestData();
  });

  test.afterAll(async () => {
    await TestEnvironment.cleanupTestData();
  });

  test('GET /api/health - System health check responds quickly', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get('/api/health');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.healthCheckTime);

    const data = await response.json();
    expect(ResponseValidator.validateHealthResponse(data)).toBe(true);

    // Verify health response structure
    expect(data.status).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeDefined();
    expect(data.version).toBeDefined();

    // Status should be healthy for demo
    expect(data.status).toBe('healthy');
  });

  test('GET /api/monitoring/costs - Cost tracking endpoint works', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get('/api/monitoring/costs');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.costCalculationTime);

    const data = await response.json();
    expect(ResponseValidator.validateMonitoringResponse(data)).toBe(true);

    // Verify cost monitoring structure
    expect(data.timestamp).toBeDefined();
    expect(data.period).toBe('daily');
    expect(typeof data.totalCost).toBe('number');
    expect(data.totalCost).toBeGreaterThan(0);

    // Check cost categories
    expect(data.costByCategory).toBeDefined();
    expect(typeof data.costByCategory).toBe('object');
    expect(Object.keys(data.costByCategory).length).toBeGreaterThan(0);

    // Check services array
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);

    // Verify each service has required fields
    data.services.forEach((service: any) => {
      expect(service.service).toBeDefined();
      expect(service.category).toBeDefined();
      expect(typeof service.estimatedDaily).toBe('number');
      expect(typeof service.estimatedMonthly).toBe('number');
      expect(service.usage).toBeDefined();
      expect(service.optimization).toBeDefined();
    });

    // Check alerts and recommendations
    expect(Array.isArray(data.alerts)).toBe(true);
    expect(Array.isArray(data.recommendations)).toBe(true);

    // Verify trends
    expect(data.trends).toBeDefined();
    expect(data.trends.direction).toBeDefined();
    expect(['increasing', 'stable', 'decreasing']).toContain(data.trends.direction);
  });

  test('GET /api/cache/metrics - Cache performance metrics', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get('/api/cache/metrics');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.monitoringEndpointTime);

    const data = await response.json();

    // Verify cache metrics structure
    expect(data.timestamp).toBeDefined();
    expect(data.metrics).toBeDefined();
    expect(typeof data.metrics).toBe('object');

    // Check hit rate calculation
    if (data.metrics.search) {
      expect(typeof data.metrics.search.hitRate).toBe('number');
      expect(data.metrics.search.hitRate).toBeGreaterThanOrEqual(0);
      expect(data.metrics.search.hitRate).toBeLessThanOrEqual(1);
    }

    // Verify performance indicators
    expect(data.performance).toBeDefined();
    expect(typeof data.performance.avgResponseTime).toBe('number');
    expect(data.performance.avgResponseTime).toBeGreaterThan(0);
  });

  test('Performance monitoring shows realistic metrics', async ({ request }) => {
    // Get health status
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.status()).toBe(200);
    const healthData = await healthResponse.json();

    // Get cost metrics
    const costResponse = await request.get('/api/monitoring/costs');
    expect(costResponse.status()).toBe(200);
    const costData = await costResponse.json();

    // Get cache metrics
    const cacheResponse = await request.get('/api/cache/metrics');
    expect(cacheResponse.status()).toBe(200);
    const cacheData = await cacheResponse.json();

    // Verify metrics are realistic for demo
    expect(healthData.status).toBe('healthy');
    expect(costData.totalCost).toBeGreaterThan(0);
    expect(costData.totalCost).toBeLessThan(1000); // Reasonable daily cost

    // Check that we have all expected service categories
    const categories = Object.keys(costData.costByCategory);
    expect(categories).toContain('AI');
    expect(categories.length).toBeGreaterThan(2);

    // Verify cache performance is reasonable
    if (cacheData.performance) {
      expect(cacheData.performance.avgResponseTime).toBeLessThan(1000);
    }
  });

  test('Monitoring endpoints handle concurrent requests', async ({ request }) => {
    const endpoints = [
      '/api/health',
      '/api/monitoring/costs',
      '/api/cache/metrics'
    ];

    const startTime = Date.now();

    const promises = endpoints.map(endpoint =>
      request.get(endpoint)
    );

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // All endpoints should respond successfully
    responses.forEach((response, index) => {
      expect(response.status()).toBe(200);
    });

    // Should complete all requests reasonably quickly
    expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.monitoringEndpointTime * 2);
  });

  test('Monitoring data consistency across endpoints', async ({ request }) => {
    // Get data from multiple endpoints
    const [healthResponse, costResponse, cacheResponse] = await Promise.all([
      request.get('/api/health'),
      request.get('/api/monitoring/costs'),
      request.get('/api/cache/metrics')
    ]);

    expect(healthResponse.status()).toBe(200);
    expect(costResponse.status()).toBe(200);
    expect(cacheResponse.status()).toBe(200);

    const healthData = await healthResponse.json();
    const costData = await costResponse.json();
    const cacheData = await cacheResponse.json();

    // All endpoints should have recent timestamps
    const now = new Date();
    const healthTime = new Date(healthData.timestamp);
    const costTime = new Date(costData.timestamp);
    const cacheTime = new Date(cacheData.timestamp);

    const timeThreshold = 60000; // 1 minute
    expect(now.getTime() - healthTime.getTime()).toBeLessThan(timeThreshold);
    expect(now.getTime() - costTime.getTime()).toBeLessThan(timeThreshold);
    expect(now.getTime() - cacheTime.getTime()).toBeLessThan(timeThreshold);

    // System should be healthy if cost monitoring is working
    if (healthData.status === 'healthy') {
      expect(costData.totalCost).toBeGreaterThan(0);
    }
  });

  test('Cost breakdown includes all expected services', async ({ request }) => {
    const response = await request.get('/api/monitoring/costs');
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Check for expected services in demo
    const serviceNames = data.services.map((s: any) => s.service.toLowerCase());
    const expectedServices = ['openai', 'weaviate', 'redis', 'vercel'];

    expectedServices.forEach(expectedService => {
      const found = serviceNames.some((name: string) =>
        name.includes(expectedService.toLowerCase())
      );
      expect(found).toBe(true);
    });

    // Verify optimization recommendations exist
    data.services.forEach((service: any) => {
      expect(service.optimization).toBeDefined();
      expect(Array.isArray(service.optimization.recommendations)).toBe(true);
      expect(service.optimization.recommendations.length).toBeGreaterThan(0);
    });
  });

  test('Cache metrics show performance improvements', async ({ request }) => {
    const response = await request.get('/api/cache/metrics');
    expect(response.status()).toBe(200);

    const data = await response.json();

    // If we have cache data, it should show some efficiency
    if (data.metrics && Object.keys(data.metrics).length > 0) {
      const cacheTypes = Object.keys(data.metrics);

      cacheTypes.forEach(cacheType => {
        const metrics = data.metrics[cacheType];
        if (metrics.totalRequests > 0) {
          // Hit rate should be reasonable for demo
          expect(metrics.hitRate).toBeDefined();
          expect(metrics.hitRate).toBeGreaterThanOrEqual(0);

          // Should have some cache activity
          expect(metrics.totalRequests).toBeGreaterThan(0);
        }
      });
    }

    // Performance metrics should be present
    expect(data.performance).toBeDefined();
    expect(typeof data.performance.avgResponseTime).toBe('number');
  });

  test('Error handling in monitoring endpoints', async ({ request }) => {
    // Test with invalid endpoints
    const invalidResponse = await request.get('/api/monitoring/invalid');
    expect(invalidResponse.status()).toBe(404);

    // Valid endpoints should handle errors gracefully
    const endpoints = [
      '/api/health',
      '/api/monitoring/costs',
      '/api/cache/metrics'
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);

      // Should either succeed or fail gracefully
      if (response.status() !== 200) {
        expect([500, 503]).toContain(response.status());

        const data = await response.json();
        expect(data.error || data.message).toBeDefined();
      }
    }
  });

  test('Monitoring response headers include cache control', async ({ request }) => {
    const endpoints = [
      '/api/health',
      '/api/monitoring/costs',
      '/api/cache/metrics'
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(200);

      // Check for appropriate cache headers
      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toBeDefined();

      // Monitoring data should not be aggressively cached
      expect(cacheControl).toContain('no-cache');
    }
  });
});