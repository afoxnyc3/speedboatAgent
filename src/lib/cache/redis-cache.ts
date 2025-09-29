/**
 * Redis Cache - Main Entry Point
 * Re-exports all cache functionality from modular structure for backward compatibility
 */

import { createHash } from 'crypto';

// Re-export types and interfaces
export type {
  CacheConfig,
  CacheMetrics,
  EmbeddingCacheEntry,
  SearchResultCacheEntry,
  SearchMetadata,
  Document,
  CacheHealthResponse,
  CacheHealthSummary,
  CacheStats,
  ContextualQueryParams,
  CacheWarmingQuery
} from './redis-cache-types';

export { DEFAULT_CACHE_CONFIGS } from './redis-cache-types';

// Re-export connection management
export {
  getRedisClient,
  isRedisAvailable,
  testRedisConnection,
  resetRedisConnection,
  getRedisConnectionInfo
} from './redis-connection';

// Re-export classification cache
export { RedisClassificationCache } from './redis-classification-cache';

// Re-export cache manager
export { RedisCacheManager } from './redis-cache-manager';

// Singleton instance for global cache management
let cacheManager: import('./redis-cache-manager').RedisCacheManager | null = null;

/**
 * Get singleton cache manager instance
 */
export function getCacheManager(): import('./redis-cache-manager').RedisCacheManager {
  if (!cacheManager) {
    const { RedisCacheManager } = require('./redis-cache-manager');
    cacheManager = new RedisCacheManager();
  }
  return cacheManager as import('./redis-cache-manager').RedisCacheManager;
}

/**
 * Utility function to create cache context from memory and search parameters
 */
export function createCacheContext(
  sessionId?: string,
  userId?: string,
  sourceWeights?: Record<string, number>
): string {
  const parts = [
    sessionId || 'anonymous',
    userId || 'guest',
    sourceWeights ? JSON.stringify(sourceWeights) : 'default'
  ];

  return createHash('md5').update(parts.join('::')).digest('hex').slice(0, 8);
}

/**
 * Reset all cache singletons (useful for testing)
 */
export function resetCacheSingletons(): void {
  cacheManager = null;
}

/**
 * Legacy export - for backward compatibility with existing imports
 */
export const redis = {
  getCacheManager,
  createCacheContext,
  resetCacheSingletons
};