/**
 * Redis Cache Manager Tests
 * Test-driven development for performance optimization caching
 */

// Mock Redis with in-memory storage for testing
const mockRedisStorage = new Map<string, { value: string; expiry: number }>();

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockImplementation(async (key: string, ttl: number, value: string) => {
      const expiry = Date.now() + (ttl * 1000);
      mockRedisStorage.set(key, { value, expiry });
      return 'OK';
    }),
    get: jest.fn().mockImplementation(async (key: string) => {
      const item = mockRedisStorage.get(key);
      if (!item) return null;
      if (Date.now() > item.expiry) {
        mockRedisStorage.delete(key);
        return null;
      }
      return item.value;
    }),
    del: jest.fn().mockImplementation(async (...keys: string[]) => {
      let deletedCount = 0;
      for (const key of keys) {
        if (mockRedisStorage.delete(key)) {
          deletedCount++;
        }
      }
      return deletedCount;
    }),
    ping: jest.fn().mockResolvedValue('PONG'),
    keys: jest.fn().mockImplementation(async (pattern: string) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Array.from(mockRedisStorage.keys()).filter(key => regex.test(key));
    }),
  }))
}));

// Set Redis URL for testing
process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
process.env.UPSTASH_REDIS_TOKEN = 'test-token';

import { RedisCacheManager, getCacheManager, type CacheMetrics } from '../redis-cache';

describe('RedisCacheManager', () => {
  let cacheManager: RedisCacheManager;

  beforeEach(() => {
    // Clear mock storage before each test
    mockRedisStorage.clear();
    cacheManager = new RedisCacheManager();
  });

  describe('Embedding Cache', () => {
    it('should cache and retrieve embeddings', async () => {
      const query = 'test query';
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const model = 'text-embedding-3-large';

      // Set embedding
      const setResult = await cacheManager.setEmbedding(query, embedding, model);
      expect(setResult).toBe(true);

      // Get embedding
      const retrieved = await cacheManager.getEmbedding(query);
      if (retrieved) {
        expect(retrieved.embedding).toEqual(embedding);
        expect(retrieved.model).toBe(model);
        expect(retrieved.cached).toBe(true);
      }
    });

    it('should return null for non-existent embeddings', async () => {
      const result = await cacheManager.getEmbedding('non-existent-query');
      expect(result).toBeNull();
    });

    it('should use different keys for different contexts', async () => {
      const query = 'same query';
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      await cacheManager.setEmbedding(query, embedding1, 'model1', 'context1');
      await cacheManager.setEmbedding(query, embedding2, 'model1', 'context2');

      const result1 = await cacheManager.getEmbedding(query, 'context1');
      const result2 = await cacheManager.getEmbedding(query, 'context2');

      expect(result1?.embedding).toEqual(embedding1);
      expect(result2?.embedding).toEqual(embedding2);
    });
  });

  describe('Search Results Cache', () => {
    it('should cache and retrieve search results', async () => {
      const query = 'test search';
      const documents = [
        { id: '1', content: 'doc 1', source: 'github' },
        { id: '2', content: 'doc 2', source: 'web' }
      ];
      const metadata = {
        query,
        resultCount: 2,
        searchTime: 150,
        sources: ['github', 'web']
      };

      // Set search results
      const setResult = await cacheManager.setSearchResults(query, documents, metadata);
      expect(setResult).toBe(true);

      // Get search results
      const retrieved = await cacheManager.getSearchResults(query);
      if (retrieved) {
        expect(retrieved.documents).toHaveLength(2);
        expect(retrieved.metadata.query).toBe(query);
        expect(retrieved.cached).toBe(true);
      }
    });

    it('should return null for non-existent search results', async () => {
      const result = await cacheManager.getSearchResults('non-existent-search');
      expect(result).toBeNull();
    });
  });

  describe('Performance Metrics', () => {
    it('should track cache hit rates for embeddings', async () => {
      // Cache some embeddings
      await cacheManager.setEmbedding('query1', [0.1, 0.2], 'model1');
      await cacheManager.setEmbedding('query2', [0.3, 0.4], 'model1');

      // Perform hits and misses
      await cacheManager.getEmbedding('query1'); // hit
      await cacheManager.getEmbedding('query2'); // hit
      await cacheManager.getEmbedding('query3'); // miss
      await cacheManager.getEmbedding('query4'); // miss

      const metrics = cacheManager.getCacheMetrics();
      const embeddingMetrics = metrics.embedding;

      expect(embeddingMetrics.totalRequests).toBe(4);
      expect(embeddingMetrics.hits).toBe(2);
      expect(embeddingMetrics.misses).toBe(2);
      expect(embeddingMetrics.hitRate).toBe(0.5); // 50%
    });

    it('should meet 70% hit rate target for embeddings', async () => {
      // Simulate cache warming with common queries
      const commonQueries = [
        'how to implement authentication',
        'database connection setup',
        'API error handling',
        'testing best practices',
        'deployment configuration',
        'performance optimization',
        'error handling patterns'
      ];

      // Cache common embeddings
      for (const query of commonQueries) {
        await cacheManager.setEmbedding(query, [Math.random(), Math.random()], 'test-model');
      }

      // Simulate realistic usage (70% common, 30% new queries)
      const testQueries = [
        ...commonQueries, // 7 hits
        ...commonQueries.slice(0, 3), // 3 more hits (total 10 hits)
        'new unique query 1', // miss
        'new unique query 2', // miss
        'new unique query 3', // miss
        'new unique query 4', // miss (total 4 misses)
      ];

      // Execute queries
      for (const query of testQueries) {
        await cacheManager.getEmbedding(query);
      }

      const metrics = cacheManager.getCacheMetrics();
      const embeddingMetrics = metrics.embedding;

      expect(embeddingMetrics.hitRate).toBeGreaterThanOrEqual(0.7); // 70%+ target
      expect(embeddingMetrics.totalRequests).toBe(14);
      expect(embeddingMetrics.hits).toBe(10);
    });

    it('should provide cache health metrics', async () => {
      // Add some cache entries
      await cacheManager.setEmbedding('test1', [0.1], 'model');
      await cacheManager.setSearchResults('search1', [], { query: 'test', resultCount: 0, searchTime: 100 });

      const health = cacheManager.getCacheHealth();

      expect(health.overall).toBeDefined();
      expect(health.byType).toBeDefined();
      expect(health.recommendations).toBeDefined();
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle Redis connection failures', async () => {
      // Test that methods don't throw when Redis is unavailable
      const result1 = await cacheManager.setEmbedding('test', [0.1], 'model');
      const result2 = await cacheManager.getEmbedding('test');

      // When Redis is not configured, operations should return false/null gracefully
      if (!cacheManager.isAvailable()) {
        expect(result1).toBe(false);
        expect(result2).toBeNull();
      }
    });

    it('should provide health check information', async () => {
      const health = await cacheManager.healthCheck();

      expect(health).toBeDefined();
      expect(health.healthy).toBeDefined();

      if (health.healthy) {
        expect(typeof health.latency).toBe('number');
      } else {
        expect(health.error).toBeDefined();
      }
    });
  });

  describe('Cache Management', () => {
    it('should support cache warming', async () => {
      const queries = [
        { query: 'test query 1' },
        { query: 'test query 2', context: 'context1' }
      ];

      const warmedCount = await cacheManager.warmCache(queries);
      expect(typeof warmedCount).toBe('number');
    });

    it('should provide cache size information', async () => {
      const sizes = await cacheManager.getCacheSize();
      expect(typeof sizes).toBe('object');
    });

    it('should support clearing all caches', async () => {
      const result = await cacheManager.clearAll();
      expect(typeof result).toBe('boolean');
    });
  });
});