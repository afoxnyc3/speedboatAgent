/**
 * Enhanced Cache Operations
 * Core cache get/set operations with compression and adaptive TTL
 */

import type { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { getTTLManager, type CacheMetrics as TTLCacheMetrics } from './advanced-ttl-manager';
import { getCompressionManager, type CompressedEntry } from './compression-utils';
import type {
  EnhancedCacheConfig,
  EnhancedCacheEntry,
  CacheSetOptions,
  CacheGetOptions,
  CacheMetrics,
  CacheOperationResult,
  ENHANCED_CACHE_CONFIGS
} from './enhanced-cache-types';

// Import default configurations
const CACHE_CONFIGS: Record<string, EnhancedCacheConfig> = {
  embedding: {
    keyPrefix: 'emb:opt:',
    enableCompression: true,
    enableAdaptiveTTL: true,
    enableUsageTracking: true,
    compressionThreshold: 1024,
    maxKeySize: 1000,
    contentType: 'embedding'
  },
  search: {
    keyPrefix: 'search:opt:',
    enableCompression: true,
    enableAdaptiveTTL: true,
    enableUsageTracking: true,
    compressionThreshold: 2048,
    maxKeySize: 2000,
    contentType: 'search'
  },
  classification: {
    keyPrefix: 'class:opt:',
    enableCompression: false,
    enableAdaptiveTTL: true,
    enableUsageTracking: true,
    compressionThreshold: 512,
    maxKeySize: 500,
    contentType: 'classification'
  },
  contextual: {
    keyPrefix: 'ctx:opt:',
    enableCompression: true,
    enableAdaptiveTTL: true,
    enableUsageTracking: true,
    compressionThreshold: 1500,
    maxKeySize: 1500,
    contentType: 'contextual'
  }
};

/**
 * Enhanced Cache Operations Manager
 */
export class EnhancedCacheOperations {
  private client: Redis | null;
  private ttlManager = getTTLManager();
  private compressionManager = getCompressionManager();
  private metrics = new Map<string, CacheMetrics>();
  private readonly configs: Record<string, EnhancedCacheConfig> = CACHE_CONFIGS;

  constructor(client: Redis | null) {
    this.client = client;
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
        compressionStats: {
          compressedEntries: 0,
          compressionRate: 0,
          spaceSaved: 0
        },
        ttlStats: {
          avgTTL: 0,
          adaptiveHits: 0,
          proactiveRefreshes: 0
        },
        lastUpdated: new Date()
      });
    });
  }

  /**
   * Generate optimized cache key with compression considerations
   */
  private generateOptimizedKey(
    input: string,
    type: string,
    context?: string
  ): string {
    const config = this.configs[type];
    if (!config) throw new Error(`Unknown cache type: ${type}`);

    // Create deterministic key
    const keyInput = context ? `${input}:${context}` : input;
    const hash = createHash('sha256')
      .update(keyInput.toLowerCase().trim())
      .digest('hex');

    // Use shorter hash for better performance
    const shortHash = hash.slice(0, 24);
    return `${config.keyPrefix}${shortHash}`;
  }

  /**
   * Set enhanced cache entry with compression and adaptive TTL
   */
  async setOptimized(
    key: string,
    data: any,
    type: keyof typeof this.configs,
    options: CacheSetOptions = {}
  ): Promise<CacheOperationResult<boolean>> {
    if (!this.client) {
      return { success: false, error: 'Redis client not available' };
    }

    const config = this.configs[type];
    const cacheKey = this.generateOptimizedKey(key, type, options.context);

    try {
      const startTime = Date.now();

      // Apply compression if enabled
      let compressedData: CompressedEntry;
      if (config.enableCompression) {
        compressedData = await this.compressionManager.compressEntry(data, config.contentType);
      } else {
        const serialized = JSON.stringify(data);
        compressedData = {
          data: serialized,
          compressed: false,
          originalSize: Buffer.byteLength(serialized, 'utf8'),
          compressedSize: Buffer.byteLength(serialized, 'utf8'),
          compressionRatio: 1.0,
          algorithm: 'none',
          contentType: config.contentType,
          timestamp: new Date()
        };
      }

      // Calculate adaptive TTL
      let ttl = 24 * 60 * 60; // Default 24 hours
      if (config.enableAdaptiveTTL) {
        const metrics: TTLCacheMetrics = {
          hitRate: this.metrics.get(type)?.hitRate || 0,
          responseTime: Date.now() - startTime,
          memoryPressure: await this.getMemoryPressureEstimate(),
          errorRate: 0
        };
        ttl = this.ttlManager.calculateOptimalTTL(cacheKey, config.contentType, metrics);
      }

      // Create enhanced cache entry
      const entry: EnhancedCacheEntry = {
        data: compressedData,
        metadata: {
          originalKey: key,
          contentType: config.contentType,
          sessionId: options.sessionId,
          userId: options.userId,
          accessCount: 1,
          lastAccessed: new Date(),
          ttl,
          priority: options.priority || 5
        }
      };

      // Store in Redis
      await this.client.setex(cacheKey, ttl, JSON.stringify(entry));

      // Update metrics
      this.updateCompressionMetrics(type, compressedData);

      // Record usage pattern if tracking enabled
      if (config.enableUsageTracking && options.sessionId) {
        this.ttlManager.recordAccess(
          cacheKey,
          options.sessionId,
          Date.now() - startTime,
          false // New entry
        );
      }

      return {
        success: true,
        data: true,
        compressionUsed: compressedData.compressed,
        ttlSeconds: ttl
      };

    } catch (error) {
      console.error('Enhanced cache set error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get enhanced cache entry with decompression and usage tracking
   */
  async getOptimized(
    key: string,
    type: keyof typeof this.configs,
    options: CacheGetOptions = {}
  ): Promise<CacheOperationResult<any>> {
    if (!this.client) {
      this.updateMetrics(type, false);
      return { success: false, error: 'Redis client not available' };
    }

    const config = this.configs[type];
    const cacheKey = this.generateOptimizedKey(key, type, options.context);

    try {
      const startTime = Date.now();
      const value = await this.client.get(cacheKey);

      if (!value) {
        this.updateMetrics(type, false);
        return { success: true, data: null, fromCache: false };
      }

      const entry: EnhancedCacheEntry = JSON.parse(value as string);

      // Check if proactive refresh is needed
      const ageSeconds = (Date.now() - entry.metadata.lastAccessed.getTime()) / 1000;
      if (this.ttlManager.shouldProactivelyRefresh(cacheKey, config.contentType, ageSeconds)) {
        // Mark for background refresh (would be handled by a separate process)
        console.log(`Proactive refresh recommended for key: ${cacheKey}`);
      }

      // Decompress data
      const decompressedData = await this.compressionManager.decompressEntry(entry.data);

      // Update access metadata
      entry.metadata.accessCount++;
      entry.metadata.lastAccessed = new Date();

      // Store updated metadata (fire and forget)
      this.client.setex(cacheKey, entry.metadata.ttl, JSON.stringify(entry))
        .catch(error => console.error('Failed to update access metadata:', error));

      // Record usage pattern if tracking enabled
      if (config.enableUsageTracking && options.sessionId) {
        this.ttlManager.recordAccess(
          cacheKey,
          options.sessionId,
          Date.now() - startTime,
          true // Cache hit
        );
      }

      this.updateMetrics(type, true);

      return {
        success: true,
        data: decompressedData,
        fromCache: true,
        compressionUsed: entry.data.compressed,
        ttlSeconds: entry.metadata.ttl
      };

    } catch (error) {
      console.error('Enhanced cache get error:', error);
      this.updateMetrics(type, false);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if entry exists in cache
   */
  async exists(key: string, type: keyof typeof this.configs, context?: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const cacheKey = this.generateOptimizedKey(key, type, context);
      const exists = await this.client.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      console.error('Enhanced cache exists error:', error);
      return false;
    }
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string, type: keyof typeof this.configs, context?: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const cacheKey = this.generateOptimizedKey(key, type, context);
      const deleted = await this.client.del(cacheKey);
      return deleted === 1;
    } catch (error) {
      console.error('Enhanced cache delete error:', error);
      return false;
    }
  }

  /**
   * Get TTL for a cache entry
   */
  async getTTL(key: string, type: keyof typeof this.configs, context?: string): Promise<number | null> {
    if (!this.client) return null;

    try {
      const cacheKey = this.generateOptimizedKey(key, type, context);
      const ttl = await this.client.ttl(cacheKey);
      return ttl >= 0 ? ttl : null;
    } catch (error) {
      console.error('Enhanced cache TTL error:', error);
      return null;
    }
  }

  /**
   * Get memory pressure estimation (simple)
   */
  private async getMemoryPressureEstimate(): Promise<number> {
    // Simple implementation - could be enhanced with actual Redis memory info
    try {
      if (!this.client) return 0.5;

      // Basic estimation based on key count
      const info = await this.client.dbsize();
      const keyCount = typeof info === 'number' ? info : 0;

      // Rough estimation: assume pressure based on key count
      const maxKeys = 100000; // Adjust based on your Redis instance
      return Math.min(keyCount / maxKeys, 1.0);
    } catch (error) {
      return 0.5; // Conservative estimate
    }
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
   * Update compression metrics
   */
  private updateCompressionMetrics(type: string, compressedEntry: CompressedEntry): void {
    const metrics = this.metrics.get(type);
    if (!metrics) return;

    if (compressedEntry.compressed) {
      metrics.compressionStats.compressedEntries++;
      metrics.compressionStats.spaceSaved +=
        compressedEntry.originalSize - compressedEntry.compressedSize;
    }

    metrics.compressionStats.compressionRate =
      metrics.compressionStats.compressedEntries / (metrics.hits + metrics.misses);
  }

  /**
   * Get cache metrics
   */
  getMetrics(): Record<string, CacheMetrics> {
    const result: Record<string, CacheMetrics> = {};
    this.metrics.forEach((metrics, type) => {
      result[type] = { ...metrics };
    });
    return result;
  }

  /**
   * Check if operations manager is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get cache configuration
   */
  getConfig(type: string): EnhancedCacheConfig | undefined {
    return this.configs[type];
  }

  /**
   * Update cache configuration
   */
  updateConfig(type: string, config: Partial<EnhancedCacheConfig>): boolean {
    if (!this.configs[type]) {
      console.error(`Unknown cache type: ${type}`);
      return false;
    }

    this.configs[type] = { ...this.configs[type], ...config };
    return true;
  }
}