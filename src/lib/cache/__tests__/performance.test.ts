/**
 * Cache Performance Tests
 * Tests for cache hit rate targets and performance metrics
 */

import { RedisCacheManager, getCacheManager } from '../redis-cache';

// Mock Redis with performance simulation
const mockRedisStorage = new Map<string, { value: string; expiry: number }>();
let mockLatency = 15; // Default 15ms latency

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockImplementation(async (key: string, ttl: number, value: string) => {
      // Simulate network latency
      await new Promise(resolve => setTimeout(resolve, mockLatency));
      const expiry = Date.now() + (ttl * 1000);
      mockRedisStorage.set(key, { value, expiry });
      return 'OK';
    }),
    get: jest.fn().mockImplementation(async (key: string) => {
      // Simulate network latency
      await new Promise(resolve => setTimeout(resolve, mockLatency));
      const item = mockRedisStorage.get(key);
      if (!item) return null;
      if (Date.now() > item.expiry) {
        mockRedisStorage.delete(key);
        return null;
      }
      return item.value;
    }),
    ping: jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, mockLatency));
      return 'PONG';
    }),
    keys: jest.fn().mockImplementation(async (pattern: string) => {
      await new Promise(resolve => setTimeout(resolve, mockLatency));
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Array.from(mockRedisStorage.keys()).filter(key => regex.test(key));
    }),
    del: jest.fn().mockImplementation(async (...keys: string[]) => {
      await new Promise(resolve => setTimeout(resolve, mockLatency));
      let deletedCount = 0;
      for (const key of keys) {
        if (mockRedisStorage.delete(key)) {
          deletedCount++;
        }
      }
      return deletedCount;
    })
  }))
}));

// Set Redis URL for testing
process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
process.env.UPSTASH_REDIS_TOKEN = 'test-token';

describe('Cache Performance Tests', () => {
  let cacheManager: RedisCacheManager;

  beforeEach(() => {
    mockRedisStorage.clear();
    mockLatency = 15;
    cacheManager = new RedisCacheManager();
  });

  describe('Hit Rate Target Achievement', () => {
    it('should achieve 70% hit rate for realistic workload', async () => {
      // Simulate production-like query patterns
      const commonQueries = [
        'how to implement authentication',
        'database connection setup',
        'API error handling',
        'testing best practices',
        'deployment configuration',
        'performance optimization',
        'error handling patterns',
        'component architecture',
        'state management',
        'routing configuration'
      ];

      // Pre-warm cache with common queries (simulate initial usage)
      for (const query of commonQueries) {
        await cacheManager.setEmbedding(query, [Math.random(), Math.random()], 'test-model');
      }

      // Simulate realistic production workload:
      // 70% queries hit cache (common patterns)
      // 30% queries miss cache (new/unique queries)
      const workloadQueries = [
        // 70% cached queries (hits)
        ...commonQueries.slice(0, 7), // First 7 common queries
        ...commonQueries.slice(0, 3), // Repeat some common queries
        ...commonQueries.slice(7, 10), // Last 3 common queries
        ...commonQueries.slice(2, 5), // More repeats

        // 30% new queries (misses)
        'unique query about microservices',
        'specific implementation detail X',
        'edge case handling for Y',
        'custom configuration for Z',
        'troubleshooting specific error ABC',
        'integration with service DEF'
      ];

      // Execute workload
      for (const query of workloadQueries) {
        await cacheManager.getEmbedding(query);
      }

      const metrics = cacheManager.getCacheMetrics();
      const embeddingMetrics = metrics.embedding;

      // Verify 70% hit rate target
      expect(embeddingMetrics.hitRate).toBeGreaterThanOrEqual(0.7);
      expect(embeddingMetrics.totalRequests).toBe(workloadQueries.length);

      // Log performance details for debugging
      console.log(`Cache Performance: ${Math.round(embeddingMetrics.hitRate * 100)}% hit rate`);
      console.log(`Total requests: ${embeddingMetrics.totalRequests}, Hits: ${embeddingMetrics.hits}, Misses: ${embeddingMetrics.misses}`);
    });

    it('should achieve 70% hit rate for search results cache', async () => {
      const commonSearches = [
        'authentication flow',
        'database schema',
        'API endpoints',
        'testing setup',
        'deployment guide',
        'configuration options',
        'troubleshooting'
      ];

      // Pre-warm search cache
      for (const search of commonSearches) {
        const mockDocuments = [
          { id: '1', content: `Content for ${search}`, source: 'github' }
        ];
        const metadata = {
          query: search,
          resultCount: 1,
          searchTime: 150,
          sources: ['github']
        };
        await cacheManager.setSearchResults(search, mockDocuments, metadata);
      }

      // Simulate mixed workload (70% cached, 30% new)
      const searchWorkload = [
        ...commonSearches, // 7 hits
        ...commonSearches.slice(0, 3), // 3 more hits (10 total)
        'new search query 1', // miss
        'new search query 2', // miss
        'new search query 3', // miss
        'new search query 4'  // miss (4 total misses)
      ];

      // Execute search workload
      for (const search of searchWorkload) {
        await cacheManager.getSearchResults(search);
      }

      const metrics = cacheManager.getCacheMetrics();
      const searchMetrics = metrics.searchResult;

      expect(searchMetrics.hitRate).toBeGreaterThanOrEqual(0.7);
      expect(searchMetrics.totalRequests).toBe(searchWorkload.length);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet latency requirements for cache operations', async () => {
      const query = 'performance test query';
      const embedding = Array.from({ length: 1024 }, () => Math.random());

      // Test cache set performance
      const setStart = Date.now();
      await cacheManager.setEmbedding(query, embedding, 'test-model');
      const setTime = Date.now() - setStart;

      // Test cache get performance (hit)
      const getStart = Date.now();
      const result = await cacheManager.getEmbedding(query);
      const getTime = Date.now() - getStart;

      // Cache operations should be fast (under 100ms with 15ms mock latency)
      expect(setTime).toBeLessThan(100);
      expect(getTime).toBeLessThan(100);
      expect(result).toBeTruthy();
      expect(result?.embedding).toEqual(embedding);
    });

    it('should handle high-latency Redis gracefully', async () => {
      // Simulate high latency (poor network conditions)
      mockLatency = 200;

      const query = 'high latency test';
      const embedding = [0.1, 0.2, 0.3];

      const start = Date.now();
      await cacheManager.setEmbedding(query, embedding, 'test-model');
      await cacheManager.getEmbedding(query);
      const totalTime = Date.now() - start;

      // Should still complete operations, just slower
      expect(totalTime).toBeGreaterThan(300); // At least 2 * 200ms latency
      expect(totalTime).toBeLessThan(1000); // But not too slow
    });

    it('should maintain performance under concurrent load', async () => {
      const queries = Array.from({ length: 50 }, (_, i) => `concurrent query ${i}`);
      const embeddings = queries.map(() => Array.from({ length: 10 }, () => Math.random()));

      // Concurrent cache operations
      const startTime = Date.now();

      // Set all embeddings concurrently
      await Promise.all(
        queries.map((query, i) =>
          cacheManager.setEmbedding(query, embeddings[i], 'test-model')
        )
      );

      // Get all embeddings concurrently
      const results = await Promise.all(
        queries.map(query => cacheManager.getEmbedding(query))
      );

      const totalTime = Date.now() - startTime;

      // All operations should succeed
      expect(results.every(result => result !== null)).toBe(true);

      // Concurrent operations should be faster than sequential
      expect(totalTime).toBeLessThan(5000); // Should complete in reasonable time

      // Verify hit rate is 100% for this test
      const metrics = cacheManager.getCacheMetrics();
      expect(metrics.embedding.hitRate).toBe(1.0);
    });
  });

  describe('Cache Health Monitoring', () => {
    it('should provide accurate health metrics', async () => {
      // Generate mixed cache activity
      await cacheManager.setEmbedding('query1', [0.1], 'model');
      await cacheManager.setEmbedding('query2', [0.2], 'model');

      await cacheManager.getEmbedding('query1'); // hit
      await cacheManager.getEmbedding('query2'); // hit
      await cacheManager.getEmbedding('query3'); // miss

      const health = cacheManager.getCacheHealth();

      expect(health.overall.hitRate).toBeCloseTo(0.67, 2); // 2/3 = 66.67%
      expect(health.overall.totalRequests).toBe(3);
      expect(health.byType.embedding.hits).toBe(2);
      expect(health.byType.embedding.misses).toBe(1);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });

    it('should provide appropriate recommendations based on performance', async () => {
      // Simulate poor performance (low hit rate)
      await cacheManager.getEmbedding('miss1'); // miss
      await cacheManager.getEmbedding('miss2'); // miss
      await cacheManager.getEmbedding('miss3'); // miss

      let health = cacheManager.getCacheHealth();
      expect(health.overall.hitRate).toBe(0);
      expect(health.recommendations.some(r => r.includes('hit rate'))).toBe(true);

      // Improve performance
      await cacheManager.setEmbedding('hit1', [0.1], 'model');
      await cacheManager.setEmbedding('hit2', [0.2], 'model');
      await cacheManager.getEmbedding('hit1'); // hit
      await cacheManager.getEmbedding('hit2'); // hit

      health = cacheManager.getCacheHealth();
      expect(health.overall.hitRate).toBeGreaterThan(0);
    });

    it('should detect Redis health issues', async () => {
      // Test healthy Redis
      let healthCheck = await cacheManager.healthCheck();
      expect(healthCheck.healthy).toBe(true);
      expect(typeof healthCheck.latency).toBe('number');
      expect(healthCheck.latency).toBeGreaterThan(0);

      // Test health check structure is always present
      expect(healthCheck).toHaveProperty('healthy');
      expect(healthCheck).toHaveProperty('latency');

      // In production, unhealthy Redis would return { healthy: false, error: string }
      // For this test, we verify the interface works correctly
      expect(typeof healthCheck.healthy).toBe('boolean');
    });
  });

  describe('Cache Efficiency Metrics', () => {
    it('should track cache size accurately', async () => {
      const initialSizes = await cacheManager.getCacheSize();

      // Add embeddings
      await cacheManager.setEmbedding('size-test-1', [0.1], 'model');
      await cacheManager.setEmbedding('size-test-2', [0.2], 'model');

      // Add search results
      await cacheManager.setSearchResults('search-test', [], {
        query: 'test',
        resultCount: 0,
        searchTime: 100
      });

      const finalSizes = await cacheManager.getCacheSize();

      expect(finalSizes.embedding).toBeGreaterThan(initialSizes.embedding || 0);
      expect(finalSizes.searchResult).toBeGreaterThan(initialSizes.searchResult || 0);
    });

    it('should handle cache eviction gracefully', async () => {
      // This test simulates TTL expiration
      const query = 'ttl-test-query';
      await cacheManager.setEmbedding(query, [0.1], 'model');

      // Verify it's cached
      let result = await cacheManager.getEmbedding(query);
      expect(result).toBeTruthy();

      // Simulate TTL expiration by manually removing from mock storage
      const keyPattern = 'embedding:';
      const keys = Array.from(mockRedisStorage.keys()).filter(k => k.includes(keyPattern));
      keys.forEach(key => {
        const item = mockRedisStorage.get(key);
        if (item) {
          mockRedisStorage.set(key, { ...item, expiry: Date.now() - 1000 }); // Expired
        }
      });

      // Should now be a cache miss
      result = await cacheManager.getEmbedding(query);
      expect(result).toBeNull();
    });
  });
});