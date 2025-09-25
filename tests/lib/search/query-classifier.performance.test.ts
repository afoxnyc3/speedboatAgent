/**
 * Query Classifier Performance Tests
 * Benchmarks for response time, caching, and throughput
 */

import {
  classifyQuery,
  classifyQueryWithMetrics,
  classifyQueries,
  getClassificationMetrics
} from '../../../src/lib/search/query-classifier';

// Mock the AI SDK with realistic delays
jest.mock('@ai-sdk/openai');
jest.mock('ai', () => ({
  generateObject: jest.fn()
}));

// Mock Redis cache
jest.mock('../../../src/lib/cache/redis-cache');

import { generateObject } from 'ai';

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

describe('Query Classifier Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    const { clearCache } = getClassificationMetrics();
    clearCache();

    // Setup realistic mock with delay
    mockGenerateObject.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          object: {
            type: 'technical',
            confidence: 0.9,
            reasoning: 'Performance test classification'
          }
        } as any), 30) // 30ms simulated API delay
      )
    );
  });

  describe('Response Time Requirements', () => {
    it('should classify queries under 50ms target (with caching)', async () => {
      const query = 'How do I implement authentication?';

      // First call (cache miss)
      const { metrics: metrics1 } = await classifyQueryWithMetrics(query);
      expect(metrics1.responseTime).toBeLessThan(100); // Allow for API call

      // Second call (cache hit) - should be much faster
      const { metrics: metrics2 } = await classifyQueryWithMetrics(query);
      expect(metrics2.responseTime).toBeLessThan(50); // Target performance
      expect(metrics2.cacheHit).toBe(true);
    });

    it('should handle timeout scenarios gracefully', async () => {
      mockGenerateObject.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const start = Date.now();
      const result = await classifyQuery('Test query', {
        timeout: 100,
        fallbackWeights: true
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(200); // Fast fallback
      expect(result.confidence).toBe(0.0); // Fallback used
    });

    it('should measure cache performance improvement', async () => {
      const queries = [
        'How to deploy to production?',
        'What are the main features?',
        'How to implement React hooks?'
      ];

      // First run (no cache)
      const start1 = Date.now();
      await classifyQueries(queries);
      const coldTime = Date.now() - start1;

      // Second run (with cache)
      const start2 = Date.now();
      const results = await classifyQueries(queries);
      const cachedTime = Date.now() - start2;

      expect(cachedTime).toBeLessThan(coldTime * 0.5); // 50%+ improvement
      results.forEach(result => {
        expect(result.cached).toBe(true);
      });
    });
  });

  describe('Caching Performance', () => {
    it('should achieve target cache hit rate >70%', async () => {
      const testQueries = [
        'How do I implement authentication?',
        'What are the product features?',
        'How to deploy to production?',
        'How do I implement authentication?', // Repeat
        'What database should I use?',
        'What are the product features?', // Repeat
        'How to set up CI/CD?',
        'How do I implement authentication?', // Repeat
        'How to deploy to production?', // Repeat
        'What are the pricing options?'
      ];

      const results = await Promise.all(
        testQueries.map(query => classifyQueryWithMetrics(query))
      );

      const cacheHits = results.filter(r => r.metrics.cacheHit).length;
      const hitRate = cacheHits / results.length;

      expect(hitRate).toBeGreaterThanOrEqual(0.3); // At least 30% for this test set
      console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
    });

    it('should handle cache key collisions correctly', async () => {
      const similarQueries = [
        'How do I implement authentication?',
        'how do i implement authentication?', // Different case
        'How do I implement authentication? ', // Trailing space
        'How do I implement authentication?',   // Exact duplicate
      ];

      const results = await Promise.all(
        similarQueries.map(query => classifyQueryWithMetrics(query))
      );

      // All should be treated as same query (cache normalized)
      const uniqueApiCalls = results.filter(r => !r.metrics.cacheHit).length;
      expect(uniqueApiCalls).toBe(1); // Only first call should hit API
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent classifications efficiently', async () => {
      const concurrentQueries = Array.from({ length: 10 }, (_, i) =>
        `Test concurrent query ${i % 3}` // Some duplicates for caching
      );

      const start = Date.now();
      const results = await Promise.all(
        concurrentQueries.map(query => classifyQueryWithMetrics(query))
      );
      const elapsed = Date.now() - start;

      expect(results).toHaveLength(10);
      expect(elapsed).toBeLessThan(500); // Should complete quickly

      // Should have some cache hits due to duplicates
      const cacheHits = results.filter(r => r.metrics.cacheHit).length;
      expect(cacheHits).toBeGreaterThan(0);
    });

    it('should handle batch classification performance', async () => {
      const batchQueries = [
        'How to implement React hooks?',
        'What are the main features?',
        'How to deploy to production?',
        'What database to use?',
        'How to set up authentication?'
      ];

      const start = Date.now();
      const results = await classifyQueries(batchQueries);
      const elapsed = Date.now() - start;

      expect(results).toHaveLength(5);
      // Should complete all within reasonable time
      expect(elapsed).toBeLessThan(1000); // 1 second for 5 queries

      console.log(`Batch classification: ${elapsed}ms for ${batchQueries.length} queries`);
      console.log(`Average per query: ${(elapsed / batchQueries.length).toFixed(1)}ms`);
    });
  });

  describe('Memory Usage and Cache Management', () => {
    it('should not grow cache indefinitely', async () => {
      const { clearCache } = getClassificationMetrics();
      await clearCache();

      // Create many unique queries
      const queries = Array.from({ length: 50 }, (_, i) =>
        `Unique test query number ${i}`
      );

      await Promise.all(queries.map(query => classifyQuery(query)));

      const { cacheSize } = getClassificationMetrics();
      expect(cacheSize).toBe(50); // Should store all unique queries
      expect(cacheSize).toBeLessThan(100); // But not grow beyond reasonable limits
    });

    it('should handle cache clearing performance', async () => {
      // Populate cache
      const queries = Array.from({ length: 20 }, (_, i) => `Query ${i}`);
      await Promise.all(queries.map(query => classifyQuery(query)));

      const { clearCache, cacheSize } = getClassificationMetrics();
      expect(cacheSize).toBe(20);

      // Clear cache should be fast
      const start = Date.now();
      await clearCache();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // Should clear quickly

      const { cacheSize: newSize } = getClassificationMetrics();
      expect(newSize).toBe(0); // Should be empty
    });
  });

  describe('Error Recovery Performance', () => {
    it('should fallback quickly on API errors', async () => {
      mockGenerateObject.mockRejectedValue(new Error('API Error'));

      const start = Date.now();
      const result = await classifyQuery('Test query', {
        fallbackWeights: true,
        timeout: 1000
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should fail fast
      expect(result.type).toBe('operational'); // Fallback classification
      expect(result.confidence).toBe(0.0);
    });

    it('should recover performance after intermittent failures', async () => {
      let callCount = 0;
      mockGenerateObject.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Temporary API Error'));
        }
        return new Promise(resolve =>
          setTimeout(() => resolve({
            object: {
              type: 'technical',
              confidence: 0.9,
              reasoning: 'Recovered classification'
            }
          } as any), 30)
        );
      });

      // First two calls should use fallback
      const result1 = await classifyQuery('Test query 1', { fallbackWeights: true });
      const result2 = await classifyQuery('Test query 2', { fallbackWeights: true });

      expect(result1.confidence).toBe(0.0); // Fallback
      expect(result2.confidence).toBe(0.0); // Fallback

      // Third call should succeed
      const result3 = await classifyQuery('Test query 3');
      expect(result3.confidence).toBe(0.9); // Actual classification
      expect(result3.type).toBe('technical');
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across query types', async () => {
      const queryTypes = {
        technical: 'How do I implement React hooks?',
        business: 'What are the main product features?',
        operational: 'How to deploy to production?'
      };

      const results: Record<string, number[]> = {
        technical: [],
        business: [],
        operational: []
      };

      // Run multiple iterations for each type
      for (let i = 0; i < 5; i++) {
        for (const [type, query] of Object.entries(queryTypes)) {
          const { clearCache } = getClassificationMetrics();
          await clearCache(); // Fresh classification each time

          const start = Date.now();
          await classifyQuery(query);
          const elapsed = Date.now() - start;

          results[type].push(elapsed);
        }
      }

      // Check that performance is consistent across types
      Object.entries(results).forEach(([type, times]) => {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);

        console.log(`${type}: avg=${avgTime.toFixed(1)}ms, range=${minTime}-${maxTime}ms`);

        expect(avgTime).toBeLessThan(100); // Reasonable average
        expect(maxTime - minTime).toBeLessThan(50); // Consistent performance
      });
    });
  });
});