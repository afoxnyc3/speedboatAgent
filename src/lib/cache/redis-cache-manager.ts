/**
 * Enhanced Redis Cache Manager
 * Multi-layer cache management with metrics and health monitoring
 */

import type { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { getRedisClient } from './redis-connection';
import { scanKeys, batchDeleteKeys, countKeys } from './scan-utils';
import type {
  CacheConfig,
  CacheMetrics,
  EmbeddingCacheEntry,
  SearchResultCacheEntry,
  SearchMetadata,
  Document,
  CacheHealthResponse,
  CacheHealthSummary,
  CacheWarmingQuery,
  DEFAULT_CACHE_CONFIGS
} from './redis-cache-types';

// Import default configurations
const CACHE_CONFIGS = {
  embedding: {
    ttlSeconds: 24 * 60 * 60, // 24 hours
    keyPrefix: 'embedding:',
    enableCompression: true,
    maxKeySize: 1000
  },
  classification: {
    ttlSeconds: 24 * 60 * 60, // 24 hours
    keyPrefix: 'classification:',
    enableCompression: false,
    maxKeySize: 500
  },
  searchResult: {
    ttlSeconds: 1 * 60 * 60, // 1 hour - shorter for search results
    keyPrefix: 'search:',
    enableCompression: true,
    maxKeySize: 2000
  },
  contextualQuery: {
    ttlSeconds: 6 * 60 * 60, // 6 hours - contextual queries change more frequently
    keyPrefix: 'context:',
    enableCompression: true,
    maxKeySize: 1500
  }
};

/**
 * Enhanced Redis Cache Manager for embeddings and search results
 */
export class RedisCacheManager {
  private client: Redis | null;
  private metrics: Map<string, CacheMetrics> = new Map();
  private readonly configs: Record<string, CacheConfig> = CACHE_CONFIGS;

  constructor() {
    this.client = getRedisClient();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    Object.keys(this.configs).forEach(type => {
      this.metrics.set(type, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        cacheSize: 0,
        lastUpdated: new Date()
      });
    });
  }

  /**
   * Generate cache key with SHA-256 hash for consistency
   */
  private generateCacheKey(data: string, type: string, context?: string): string {
    const config = this.configs[type];
    if (!config) throw new Error(`Unknown cache type: ${type}`);

    const input = context ? `${data}:${context}` : data;
    const hash = createHash('sha256')
      .update(input.toLowerCase().trim())
      .digest('hex');

    return `${config.keyPrefix}${hash}`;
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(type: string, isHit: boolean): void {
    const metrics = this.metrics.get(type);
    if (!metrics) return;

    if (isHit) {
      metrics.hits++;
    } else {
      metrics.misses++;
    }

    metrics.totalRequests++;
    metrics.hitRate = metrics.hits / metrics.totalRequests;
    metrics.lastUpdated = new Date();
  }

  /**
   * Set embedding in cache
   */
  async setEmbedding(
    query: string,
    embedding: number[],
    model: string = 'text-embedding-3-large',
    context?: string
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.generateCacheKey(query, 'embedding', context);
      const config = this.configs.embedding;

      const entry: EmbeddingCacheEntry = {
        embedding,
        model,
        dimensions: embedding.length,
        cached: true,
        timestamp: new Date()
      };

      const value = config.enableCompression
        ? JSON.stringify(entry)
        : JSON.stringify(entry);

      await this.client.setex(key, config.ttlSeconds, value);
      return true;
    } catch (error) {
      console.error('Redis embedding cache set error:', error);
      return false;
    }
  }

  /**
   * Get embedding from cache
   */
  async getEmbedding(
    query: string,
    context?: string
  ): Promise<EmbeddingCacheEntry | null> {
    if (!this.client) {
      this.updateMetrics('embedding', false);
      return null;
    }

    try {
      const key = this.generateCacheKey(query, 'embedding', context);
      const value = await this.client.get(key);

      if (!value) {
        this.updateMetrics('embedding', false);
        return null;
      }

      this.updateMetrics('embedding', true);
      try {
        return JSON.parse(value as string) as EmbeddingCacheEntry;
      } catch (parseError) {
        console.error('Failed to parse embedding cache:', parseError, 'Value type:', typeof value);
        this.updateMetrics('embedding', false);
        return null;
      }
    } catch (error) {
      console.error('Redis embedding cache get error:', error);
      this.updateMetrics('embedding', false);
      return null;
    }
  }

  /**
   * Set search results in cache
   */
  async setSearchResults(
    query: string,
    documents: Document[],
    metadata: SearchMetadata,
    context?: string
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.generateCacheKey(query, 'searchResult', context);
      const config = this.configs.searchResult;

      const entry: SearchResultCacheEntry = {
        documents: documents.map(doc => ({
          ...doc,
          // Strip embedding to reduce cache size
          embedding: undefined
        })),
        metadata,
        cached: true,
        timestamp: new Date()
      };

      const value = JSON.stringify(entry);
      await this.client.setex(key, config.ttlSeconds, value);
      return true;
    } catch (error) {
      console.error('Redis search cache set error:', error);
      return false;
    }
  }

  /**
   * Get search results from cache
   */
  async getSearchResults(
    query: string,
    context?: string
  ): Promise<SearchResultCacheEntry | null> {
    if (!this.client) {
      this.updateMetrics('searchResult', false);
      return null;
    }

    try {
      const key = this.generateCacheKey(query, 'searchResult', context);
      const value = await this.client.get(key);

      if (!value) {
        this.updateMetrics('searchResult', false);
        return null;
      }

      this.updateMetrics('searchResult', true);
      try {
        return JSON.parse(value as string) as SearchResultCacheEntry;
      } catch (parseError) {
        console.error('Failed to parse search result cache:', parseError, 'Value type:', typeof value);
        this.updateMetrics('searchResult', false);
        return null;
      }
    } catch (error) {
      console.error('Redis search cache get error:', error);
      this.updateMetrics('searchResult', false);
      return null;
    }
  }

  /**
   * Cache contextual queries for memory-enhanced searches
   */
  async setContextualQuery(
    originalQuery: string,
    enhancedQuery: string,
    context: string
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.generateCacheKey(originalQuery, 'contextualQuery', context);
      const config = this.configs.contextualQuery;

      await this.client.setex(key, config.ttlSeconds, enhancedQuery);
      return true;
    } catch (error) {
      console.error('Redis contextual query cache set error:', error);
      return false;
    }
  }

  /**
   * Get contextual query from cache
   */
  async getContextualQuery(
    originalQuery: string,
    context: string
  ): Promise<string | null> {
    if (!this.client) {
      this.updateMetrics('contextualQuery', false);
      return null;
    }

    try {
      const key = this.generateCacheKey(originalQuery, 'contextualQuery', context);
      const value = await this.client.get(key);

      if (!value) {
        this.updateMetrics('contextualQuery', false);
        return null;
      }

      this.updateMetrics('contextualQuery', true);
      return value as string;
    } catch (error) {
      console.error('Redis contextual query cache get error:', error);
      this.updateMetrics('contextualQuery', false);
      return null;
    }
  }

  /**
   * Warm cache with frequently used queries
   */
  async warmCache(queries: CacheWarmingQuery[]): Promise<number> {
    let warmedCount = 0;

    for (const { query, context } of queries) {
      try {
        // Check if already cached
        const cached = await this.getEmbedding(query, context);
        if (!cached) {
          // This would trigger embedding generation in the actual implementation
          console.log(`Cache warming needed for query: ${query}`);
        }
        warmedCount++;
      } catch (error) {
        console.error('Cache warming error:', error);
      }
    }

    return warmedCount;
  }

  /**
   * Get comprehensive cache metrics
   */
  getCacheMetrics(): Record<string, CacheMetrics> {
    const result: Record<string, CacheMetrics> = {};

    this.metrics.forEach((metrics, type) => {
      result[type] = { ...metrics };
    });

    return result;
  }

  /**
   * Get overall cache health
   */
  getCacheHealth(): CacheHealthSummary {
    const byType = this.getCacheMetrics();
    const recommendations: string[] = [];

    let totalHits = 0;
    let totalRequests = 0;

    Object.values(byType).forEach(metrics => {
      totalHits += metrics.hits;
      totalRequests += metrics.totalRequests;

      if (metrics.hitRate < 0.7) {
        recommendations.push(`Low hit rate for ${Object.keys(byType).find(k => byType[k] === metrics)}: ${metrics.hitRate.toFixed(2)}`);
      }
    });

    const overallHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    if (overallHitRate < 0.7) {
      recommendations.push('Overall cache hit rate below 70% target');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }

    return {
      overall: { hitRate: overallHitRate, totalRequests },
      byType,
      recommendations
    };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<boolean> {
    if (!this.client) return false;

    try {
      let totalDeleted = 0;

      // Use SCAN-based batch delete for each cache type
      for (const config of Object.values(this.configs)) {
        const deletedCount = await batchDeleteKeys(this.client, `${config.keyPrefix}*`);
        totalDeleted += deletedCount;
      }

      console.log(`Cleared ${totalDeleted} total cache keys`);

      // Reset metrics
      this.initializeMetrics();

      return true;
    } catch (error) {
      console.error('Redis clear all error:', error);
      return false;
    }
  }

  /**
   * Check Redis connection health
   */
  async healthCheck(): Promise<CacheHealthResponse> {
    if (!this.client) {
      return { healthy: false, error: 'Redis client not initialized' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cache size estimation
   */
  async getCacheSize(): Promise<Record<string, number>> {
    if (!this.client) return {};

    const sizes: Record<string, number> = {};

    try {
      // Use SCAN-based counting for non-blocking operation
      for (const [type, config] of Object.entries(this.configs)) {
        sizes[type] = await countKeys(this.client, `${config.keyPrefix}*`);
      }
    } catch (error) {
      console.error('Error getting cache sizes:', error);
    }

    return sizes;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get cache configuration for a specific type
   */
  getConfig(type: string): CacheConfig | undefined {
    return this.configs[type];
  }

  /**
   * Update cache configuration for a specific type
   */
  updateConfig(type: string, config: Partial<CacheConfig>): boolean {
    if (!this.configs[type]) {
      console.error(`Unknown cache type: ${type}`);
      return false;
    }

    this.configs[type] = { ...this.configs[type], ...config };
    return true;
  }
}