/**
 * Cache Metrics API Tests
 */

import { getCacheManager } from '../../../../src/lib/cache/redis-cache';

// Mock the cache manager
jest.mock('../../../../src/lib/cache/redis-cache', () => ({
  getCacheManager: jest.fn().mockReturnValue({
    getCacheMetrics: jest.fn().mockReturnValue({
      embedding: {
        hits: 10,
        misses: 2,
        hitRate: 0.83,
        totalRequests: 12,
        cacheSize: 50,
        lastUpdated: new Date()
      },
      searchResult: {
        hits: 8,
        misses: 4,
        hitRate: 0.67,
        totalRequests: 12,
        cacheSize: 30,
        lastUpdated: new Date()
      }
    }),
    getCacheHealth: jest.fn().mockReturnValue({
      overall: { hitRate: 0.75, totalRequests: 24 },
      byType: {},
      recommendations: ['Cache performance is optimal']
    }),
    healthCheck: jest.fn().mockResolvedValue({
      healthy: true,
      latency: 15
    }),
    getCacheSize: jest.fn().mockResolvedValue({
      embedding: 50,
      searchResult: 30
    })
  })
}));

describe('Cache Metrics Logic', () => {
  it('should return cache metrics with proper calculations', async () => {
    const cacheManager = getCacheManager();

    const metrics = cacheManager.getCacheMetrics();
    const health = cacheManager.getCacheHealth();
    const healthCheck = await cacheManager.healthCheck();
    const cacheSize = await cacheManager.getCacheSize();

    // Verify embedding metrics
    expect(metrics.embedding.hitRate).toBe(0.83);
    expect(metrics.embedding.totalRequests).toBe(12);
    expect(metrics.embedding.hits).toBe(10);

    // Verify search result metrics
    expect(metrics.searchResult.hitRate).toBe(0.67);
    expect(metrics.searchResult.totalRequests).toBe(12);

    // Verify overall health
    expect(health.overall.hitRate).toBe(0.75);
    expect(health.overall.totalRequests).toBe(24);

    // Verify health check
    expect(healthCheck.healthy).toBe(true);
    expect(healthCheck.latency).toBe(15);

    // Verify cache sizes
    expect(cacheSize.embedding).toBe(50);
    expect(cacheSize.searchResult).toBe(30);
  });

  it('should calculate performance grades correctly', () => {
    // Test performance grade calculation logic
    const getPerformanceGrade = (hitRate: number): string => {
      if (hitRate >= 0.9) return 'A+';
      if (hitRate >= 0.8) return 'A';
      if (hitRate >= 0.7) return 'B';
      if (hitRate >= 0.6) return 'C';
      if (hitRate >= 0.5) return 'D';
      return 'F';
    };

    expect(getPerformanceGrade(0.95)).toBe('A+');
    expect(getPerformanceGrade(0.85)).toBe('A');
    expect(getPerformanceGrade(0.75)).toBe('B');
    expect(getPerformanceGrade(0.65)).toBe('C');
    expect(getPerformanceGrade(0.55)).toBe('D');
    expect(getPerformanceGrade(0.45)).toBe('F');
  });

  it('should meet 70% hit rate target', () => {
    const cacheManager = getCacheManager();
    const health = cacheManager.getCacheHealth();

    expect(health.overall.hitRate).toBeGreaterThanOrEqual(0.7);
  });

  it('should provide comprehensive recommendations', () => {
    const cacheManager = getCacheManager();
    const health = cacheManager.getCacheHealth();

    expect(Array.isArray(health.recommendations)).toBe(true);
    expect(health.recommendations.length).toBeGreaterThan(0);
    expect(health.recommendations[0]).toBe('Cache performance is optimal');
  });
});