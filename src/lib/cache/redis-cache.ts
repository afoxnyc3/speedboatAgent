/**
 * Redis Cache Implementation for Query Classifications
 */

import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { QueryClassification } from '../../types/query-classification';
import { scanKeys, batchDeleteKeys, countKeys } from './scan-utils';

// Cache configuration interface
interface CacheConfig {
  ttlSeconds: number;
  keyPrefix: string;
  enableCompression: boolean;
  maxKeySize: number;
}

// Cache metrics interface
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  lastUpdated: Date;
}

// Embedding cache entry
interface EmbeddingCacheEntry {
  embedding: number[];
  model: string;
  dimensions: number;
  cached: boolean;
  timestamp: Date;
}

// Search result cache entry
interface SearchResultCacheEntry {
  documents: Document[];
  metadata: SearchMetadata;
  cached: boolean;
  timestamp: Date;
}

// Search metadata interface
interface SearchMetadata {
  query: string;
  resultCount: number;
  searchTime: number;
  sources?: string[];
}

// Document interface (simplified)
interface Document {
  id: string;
  content: string;
  source?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

// Redis client instance
let redis: Redis | null = null;

/**
 * Initialize Redis client
 */
function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn('Redis credentials not found, using memory cache');
    return null;
  }

  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken
    });
    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

/**
 * Redis-based cache for query classifications
 */
export class RedisClassificationCache {
  private readonly prefix = 'query:classification:';
  private readonly ttlSeconds = 24 * 60 * 60; // 24 hours
  private client: Redis | null;

  constructor() {
    this.client = getRedisClient();
  }

  /**
   * Generate Redis key for query
   */
  private getKey(cacheKey: string): string {
    return `${this.prefix}${cacheKey}`;
  }

  /**
   * Set classification in cache
   */
  async set(cacheKey: string, classification: QueryClassification): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.getKey(cacheKey);
      const value = JSON.stringify({ ...classification, cached: true });

      await this.client.setex(key, this.ttlSeconds, value);
      return true;
    } catch (error) {
      console.error('Redis cache set error:', error);
      return false;
    }
  }

  /**
   * Get classification from cache
   */
  async get(cacheKey: string): Promise<QueryClassification | null> {
    if (!this.client) return null;

    try {
      const key = this.getKey(cacheKey);
      const value = await this.client.get(key);

      if (!value) return null;

      return JSON.parse(value as string) as QueryClassification;
    } catch (error) {
      console.error('Redis cache get error:', error);
      return null;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Clear all classification cache
   */
  async clear(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Use SCAN-based batch delete for non-blocking operation
      const deletedCount = await batchDeleteKeys(this.client, `${this.prefix}*`);
      console.log(`Cleared ${deletedCount} classification cache keys`);
      return true;
    } catch (error) {
      console.error('Redis cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; keys: string[] } | null> {
    if (!this.client) return null;

    try {
      // Use SCAN to get keys without blocking
      const keys = await scanKeys(this.client, `${this.prefix}*`);
      return {
        count: keys.length,
        keys: keys.slice(0, 100).map(key => key.replace(this.prefix, '')) // Return sample of first 100 keys
      };
    } catch (error) {
      console.error('Redis cache stats error:', error);
      return null;
    }
  }
}

/**
 * Enhanced Redis Cache Manager for embeddings and search results
 */
export class RedisCacheManager {
  private client: Redis | null;
  private metrics: Map<string, CacheMetrics> = new Map();

  private readonly configs: Record<string, CacheConfig> = {
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
      return JSON.parse(value as string) as EmbeddingCacheEntry;
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
      return JSON.parse(value as string) as SearchResultCacheEntry;
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
  async warmCache(queries: Array<{ query: string; context?: string }>): Promise<number> {
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
  getCacheHealth(): {
    overall: { hitRate: number; totalRequests: number };
    byType: Record<string, CacheMetrics>;
    recommendations: string[];
  } {
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
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
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
}

// Singleton instance for global cache management
let cacheManager: RedisCacheManager | null = null;

/**
 * Get singleton cache manager instance
 */
export function getCacheManager(): RedisCacheManager {
  if (!cacheManager) {
    cacheManager = new RedisCacheManager();
  }
  return cacheManager;
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