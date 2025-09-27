/**
 * Enhanced Redis Cache Manager with Advanced Optimizations
 * Integrates TTL management, compression, and intelligent caching strategies
 */

import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { getTTLManager, type CacheMetrics as TTLCacheMetrics } from './advanced-ttl-manager';
import { getCompressionManager, type CompressedEntry } from './compression-utils';
import type { QueryClassification } from '../../types/query-classification';
import { countKeys } from './scan-utils';

export interface EnhancedCacheConfig {
  keyPrefix: string;
  enableCompression: boolean;
  enableAdaptiveTTL: boolean;
  enableUsageTracking: boolean;
  compressionThreshold: number;
  maxKeySize: number;
  contentType: 'embedding' | 'search' | 'classification' | 'contextual';
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  compressionStats: {
    compressedEntries: number;
    compressionRate: number;
    spaceSaved: number;
  };
  ttlStats: {
    avgTTL: number;
    adaptiveHits: number;
    proactiveRefreshes: number;
  };
  lastUpdated: Date;
}

export interface EnhancedCacheEntry {
  data: CompressedEntry;
  metadata: {
    originalKey: string;
    contentType: string;
    sessionId?: string;
    userId?: string;
    accessCount: number;
    lastAccessed: Date;
    ttl: number;
    priority: number;
  };
}

/**
 * Enhanced Redis Cache Manager with intelligent optimizations
 */
export class EnhancedRedisCacheManager {
  private client: Redis | null;
  private ttlManager = getTTLManager();
  private compressionManager = getCompressionManager();
  private metrics = new Map<string, CacheMetrics>();

  private readonly configs: Record<string, EnhancedCacheConfig> = {
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

  constructor() {
    this.client = this.initializeRedisClient();
    this.initializeMetrics();
  }

  private initializeRedisClient(): Redis | null {
    const redisUrl = process.env.UPSTASH_REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
      console.warn('Redis credentials not found for enhanced cache manager');
      return null;
    }

    try {
      return new Redis({ url: redisUrl, token: redisToken });
    } catch (error) {
      console.error('Failed to initialize enhanced Redis client:', error);
      return null;
    }
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
    options: {
      sessionId?: string;
      userId?: string;
      context?: string;
      priority?: number;
    } = {}
  ): Promise<boolean> {
    if (!this.client) return false;

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
          memoryPressure: await this.getMemoryPressure(),
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

      return true;

    } catch (error) {
      console.error('Enhanced cache set error:', error);
      return false;
    }
  }

  /**
   * Get enhanced cache entry with decompression and usage tracking
   */
  async getOptimized(
    key: string,
    type: keyof typeof this.configs,
    options: {
      sessionId?: string;
      context?: string;
    } = {}
  ): Promise<any | null> {
    if (!this.client) {
      this.updateMetrics(type, false);
      return null;
    }

    const config = this.configs[type];
    const cacheKey = this.generateOptimizedKey(key, type, options.context);

    try {
      const startTime = Date.now();
      const value = await this.client.get(cacheKey);

      if (!value) {
        this.updateMetrics(type, false);
        return null;
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
      return decompressedData;

    } catch (error) {
      console.error('Enhanced cache get error:', error);
      this.updateMetrics(type, false);
      return null;
    }
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async warmCacheIntelligently(
    queries: Array<{
      key: string;
      data: any;
      type: keyof typeof this.configs;
      priority?: number;
      sessionId?: string;
    }>
  ): Promise<{
    warmed: number;
    skipped: number;
    failed: number;
    alreadyCached: number;
  }> {
    let warmed = 0;
    let skipped = 0;
    let failed = 0;
    let alreadyCached = 0;

    // Sort by priority
    const sortedQueries = queries.sort((a, b) => (b.priority || 5) - (a.priority || 5));

    for (const query of sortedQueries) {
      try {
        // Check if already cached
        const existing = await this.getOptimized(query.key, query.type, {
          sessionId: query.sessionId
        });

        if (existing) {
          alreadyCached++;
          continue;
        }

        // Check if worth caching based on estimated value
        const shouldCache = await this.shouldWarmEntry(query.key, query.type, query.priority || 5);
        if (!shouldCache) {
          skipped++;
          continue;
        }

        // Warm the cache
        const success = await this.setOptimized(
          query.key,
          query.data,
          query.type,
          {
            sessionId: query.sessionId,
            priority: query.priority
          }
        );

        if (success) {
          warmed++;
        } else {
          failed++;
        }

      } catch (error) {
        console.error('Cache warming error:', error);
        failed++;
      }
    }

    return { warmed, skipped, failed, alreadyCached };
  }

  /**
   * Determine if entry should be warmed based on cost-benefit analysis
   */
  private async shouldWarmEntry(
    key: string,
    type: keyof typeof this.configs,
    priority: number
  ): Promise<boolean> {
    // Always warm high priority items
    if (priority >= 8) return true;

    // Check memory pressure
    const memoryPressure = await this.getMemoryPressure();
    if (memoryPressure > 0.8) {
      return priority >= 7; // More selective under pressure
    }

    // Check current cache performance
    const metrics = this.metrics.get(type);
    if (metrics && metrics.hitRate < 0.6) {
      return true; // Aggressive warming for poor performance
    }

    return priority >= 6; // Default threshold
  }

  /**
   * Get memory pressure estimation
   */
  private async getMemoryPressure(): Promise<number> {
    if (!this.client) return 0;

    try {
      // Simple estimation based on cache sizes
      const sizes = await this.getCacheSizes();
      const totalSize = Object.values(sizes).reduce((sum, size) => sum + size, 0);

      // Assume 100MB cache limit (adjust based on your Redis instance)
      const limitMB = 100;
      const usageMB = totalSize / (1024 * 1024);

      return Math.min(usageMB / limitMB, 1.0);

    } catch (error) {
      console.error('Error estimating memory pressure:', error);
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
   * Get cache sizes for all types
   */
  async getCacheSizes(): Promise<Record<string, number>> {
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
   * Get comprehensive metrics
   */
  getMetrics(): Record<string, CacheMetrics> {
    const result: Record<string, CacheMetrics> = {};
    this.metrics.forEach((metrics, type) => {
      result[type] = { ...metrics };
    });
    return result;
  }

  /**
   * Health check with enhanced diagnostics
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    memoryPressure: number;
    compressionEfficiency: number;
    ttlOptimization: number;
    error?: string;
  }> {
    if (!this.client) {
      return {
        healthy: false,
        memoryPressure: 0,
        compressionEfficiency: 0,
        ttlOptimization: 0,
        error: 'Redis client not initialized'
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      const memoryPressure = await this.getMemoryPressure();
      const compressionEfficiency = this.calculateCompressionEfficiency();
      const ttlOptimization = this.calculateTTLOptimization();

      return {
        healthy: true,
        latency,
        memoryPressure,
        compressionEfficiency,
        ttlOptimization
      };

    } catch (error) {
      return {
        healthy: false,
        memoryPressure: 0,
        compressionEfficiency: 0,
        ttlOptimization: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate compression efficiency
   */
  private calculateCompressionEfficiency(): number {
    let totalSaved = 0;
    let totalOriginal = 0;

    this.metrics.forEach(metrics => {
      totalSaved += metrics.compressionStats.spaceSaved;
      totalOriginal += totalSaved + metrics.compressionStats.spaceSaved;
    });

    return totalOriginal > 0 ? totalSaved / totalOriginal : 0;
  }

  /**
   * Calculate TTL optimization effectiveness
   */
  private calculateTTLOptimization(): number {
    const usageStats = this.ttlManager.getUsageStats();
    const highUsageRatio = usageStats.totalPatterns > 0
      ? usageStats.highUsageKeys / usageStats.totalPatterns
      : 0;

    // Higher ratio of high-usage keys indicates better TTL optimization
    return highUsageRatio;
  }

  /**
   * Clean up old patterns and optimize performance
   */
  async optimize(): Promise<{
    patternsCleanedUp: number;
    memorySaved: number;
    performanceImprovement: number;
  }> {
    const beforeStats = this.ttlManager.getUsageStats();

    // Clean up old patterns
    this.ttlManager.cleanupOldPatterns(168); // 7 days

    const afterStats = this.ttlManager.getUsageStats();
    const patternsCleanedUp = beforeStats.totalPatterns - afterStats.totalPatterns;

    // Estimate memory savings (rough approximation)
    const memorySaved = patternsCleanedUp * 200; // ~200 bytes per pattern

    // Performance improvement estimate
    const performanceImprovement = patternsCleanedUp > 0 ? 0.05 : 0; // 5% for cleanup

    return {
      patternsCleanedUp,
      memorySaved,
      performanceImprovement
    };
  }

  /**
   * Check if cache manager is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
}

// Singleton instance
let enhancedCacheManager: EnhancedRedisCacheManager | null = null;

/**
 * Get singleton enhanced cache manager instance
 */
export function getEnhancedCacheManager(): EnhancedRedisCacheManager {
  if (!enhancedCacheManager) {
    enhancedCacheManager = new EnhancedRedisCacheManager();
  }
  return enhancedCacheManager;
}