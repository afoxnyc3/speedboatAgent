/**
 * Enhanced Cache Analytics and Management
 * Intelligent cache warming, metrics, health monitoring, and optimization
 */

import type { Redis } from '@upstash/redis';
import { getTTLManager } from './advanced-ttl-manager';
import { countKeys } from './scan-utils';
import { EnhancedCacheOperations } from './enhanced-cache-operations';
import type {
  CacheType,
  IntelligentWarmingQuery,
  CacheWarmingResult,
  EnhancedHealthCheck,
  CacheOptimizationResult,
  DetailedCacheMetrics,
  CacheUsageStatistics,
  CacheMetrics,
  EnhancedCacheConfig
} from './enhanced-cache-types';

import {
  CachePriority,
  MemoryPressureLevel
} from './enhanced-cache-types';

/**
 * Enhanced Cache Analytics and Management
 */
export class EnhancedCacheAnalytics {
  private client: Redis | null;
  private operations: EnhancedCacheOperations;
  private ttlManager = getTTLManager();

  constructor(client: Redis | null, operations: EnhancedCacheOperations) {
    this.client = client;
    this.operations = operations;
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async warmCacheIntelligently(
    queries: IntelligentWarmingQuery[]
  ): Promise<CacheWarmingResult> {
    let warmed = 0;
    let skipped = 0;
    let failed = 0;
    let alreadyCached = 0;

    // Sort by priority
    const sortedQueries = queries.sort((a, b) => (b.priority || 5) - (a.priority || 5));

    for (const query of sortedQueries) {
      try {
        // Check if already cached
        const existing = await this.operations.getOptimized(query.key, query.type as string, {
          sessionId: query.sessionId
        });

        if (existing.success && existing.data !== null) {
          alreadyCached++;
          continue;
        }

        // Check if worth caching based on estimated value
        const shouldCache = await this.shouldWarmEntry(query.key, query.type as keyof EnhancedCacheConfig, query.priority || 5);
        if (!shouldCache) {
          skipped++;
          continue;
        }

        // Warm the cache
        const result = await this.operations.setOptimized(
          query.key,
          query.data,
          query.type as string,
          {
            sessionId: query.sessionId,
            priority: query.priority
          }
        );

        if (result.success) {
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
    type: keyof EnhancedCacheConfig,
    priority: number
  ): Promise<boolean> {
    // Always warm high priority items
    if (priority >= CachePriority.CRITICAL) return true;

    // Check memory pressure
    const memoryPressure = await this.getMemoryPressure();
    if (memoryPressure > MemoryPressureLevel.HIGH) {
      return priority >= CachePriority.HIGH; // More selective under pressure
    }

    // Check current cache performance
    const metrics = this.operations.getMetrics();
    const typeMetrics = metrics[type];
    if (typeMetrics && typeMetrics.hitRate < 0.6) {
      return true; // Aggressive warming for poor performance
    }

    return priority >= CachePriority.NORMAL; // Default threshold
  }

  /**
   * Get memory pressure estimation
   */
  async getMemoryPressure(): Promise<number> {
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
   * Get cache sizes for all types
   */
  async getCacheSizes(): Promise<Record<string, number>> {
    if (!this.client) return {};

    const sizes: Record<string, number> = {};
    const configs = {
      embedding: { keyPrefix: 'emb:opt:' },
      search: { keyPrefix: 'search:opt:' },
      classification: { keyPrefix: 'class:opt:' },
      contextual: { keyPrefix: 'ctx:opt:' }
    };

    try {
      // Use SCAN-based counting for non-blocking operation
      for (const [type, config] of Object.entries(configs)) {
        sizes[type] = await countKeys(this.client, `${config.keyPrefix}*`);
      }
    } catch (error) {
      console.error('Error getting cache sizes:', error);
    }

    return sizes;
  }

  /**
   * Health check with enhanced diagnostics
   */
  async healthCheck(): Promise<EnhancedHealthCheck> {
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
   * Calculate compression efficiency across all cache types
   */
  private calculateCompressionEfficiency(): number {
    const metrics = this.operations.getMetrics();
    let totalSaved = 0;
    let totalOriginal = 0;

    Object.values(metrics).forEach(metric => {
      totalSaved += metric.compressionStats.spaceSaved;
      totalOriginal += totalSaved + metric.compressionStats.spaceSaved;
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
  async optimize(): Promise<CacheOptimizationResult> {
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
   * Get detailed metrics including health and cache sizes
   */
  async getDetailedMetrics(): Promise<DetailedCacheMetrics> {
    const metrics = this.operations.getMetrics();
    const cacheSize = await this.getCacheSizes();
    const health = await this.healthCheck();

    return {
      metrics,
      cacheSize,
      health,
      timestamp: new Date()
    };
  }

  /**
   * Get comprehensive usage statistics
   */
  async getUsageStatistics(): Promise<CacheUsageStatistics> {
    const metrics = this.operations.getMetrics();
    const ttlStats = this.ttlManager.getUsageStats();

    let totalHits = 0;
    let totalMisses = 0;

    Object.values(metrics).forEach(m => {
      totalHits += m.hits;
      totalMisses += m.misses;
    });

    return {
      totalRequests: totalHits + totalMisses,
      totalHits,
      totalMisses,
      hitRate: totalHits / (totalHits + totalMisses || 1),
      ttlPatterns: ttlStats.totalPatterns,
      ttlHits: (ttlStats as any).totalHits || 0,
      timestamp: new Date()
    };
  }

  /**
   * Generate cache performance recommendations
   */
  async getPerformanceRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const health = await this.healthCheck();
    const metrics = this.operations.getMetrics();

    // Memory pressure recommendations
    if (health.memoryPressure > MemoryPressureLevel.HIGH) {
      recommendations.push('High memory pressure detected. Consider increasing cache limits or implementing more aggressive TTL policies.');
    }

    // Hit rate recommendations
    Object.entries(metrics).forEach(([type, metric]) => {
      if (metric.hitRate < 0.6) {
        recommendations.push(`Low hit rate for ${type} cache (${(metric.hitRate * 100).toFixed(1)}%). Consider warming cache or adjusting TTL settings.`);
      }
    });

    // Compression recommendations
    if (health.compressionEfficiency < 0.3) {
      recommendations.push('Low compression efficiency. Consider adjusting compression thresholds or enabling compression for more cache types.');
    }

    // TTL optimization recommendations
    if (health.ttlOptimization < 0.5) {
      recommendations.push('TTL optimization could be improved. Review usage patterns and consider adaptive TTL strategies.');
    }

    // Latency recommendations
    if (health.latency && health.latency > 100) {
      recommendations.push(`High Redis latency detected (${health.latency}ms). Check Redis connection and server performance.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal. No recommendations at this time.');
    }

    return recommendations;
  }

  /**
   * Predict cache performance based on current metrics
   */
  async predictPerformance(hoursAhead: number = 24): Promise<{
    predictedHitRate: number;
    predictedMemoryUsage: number;
    confidence: number;
    recommendations: string[];
  }> {
    const metrics = this.operations.getMetrics();
    const health = await this.healthCheck();

    // Simple linear prediction based on current trends
    const currentHitRate = Object.values(metrics).reduce((sum, m) => sum + m.hitRate, 0) / Object.keys(metrics).length;

    // Predict slight degradation over time without maintenance
    const degradationFactor = 1 - (hoursAhead / 168) * 0.1; // 10% degradation over a week
    const predictedHitRate = Math.max(currentHitRate * degradationFactor, 0.4);

    // Predict memory growth
    const growthRate = 1.02; // 2% growth per day
    const daysAhead = hoursAhead / 24;
    const predictedMemoryUsage = Math.min(health.memoryPressure * Math.pow(growthRate, daysAhead), 1.0);

    // Confidence decreases with time
    const confidence = Math.max(1 - (hoursAhead / 168), 0.5);

    const recommendations = await this.getPerformanceRecommendations();

    return {
      predictedHitRate,
      predictedMemoryUsage,
      confidence,
      recommendations
    };
  }

  /**
   * Generate cache optimization strategy
   */
  async generateOptimizationStrategy(): Promise<{
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    estimatedImpact: {
      hitRateImprovement: number;
      memoryReduction: number;
      latencyImprovement: number;
    };
  }> {
    const health = await this.healthCheck();
    const metrics = this.operations.getMetrics();

    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Immediate actions (can be done now)
    if (health.memoryPressure > MemoryPressureLevel.CRITICAL) {
      immediate.push('Clear expired keys and run memory optimization');
    }

    const avgHitRate = Object.values(metrics).reduce((sum, m) => sum + m.hitRate, 0) / Object.keys(metrics).length;
    if (avgHitRate < 0.5) {
      immediate.push('Implement aggressive cache warming for high-priority queries');
    }

    // Short-term actions (within days)
    if (health.compressionEfficiency < 0.4) {
      shortTerm.push('Optimize compression settings and thresholds');
    }

    if (health.ttlOptimization < 0.6) {
      shortTerm.push('Implement adaptive TTL strategies based on usage patterns');
    }

    // Long-term actions (weeks to months)
    longTerm.push('Implement predictive cache warming based on user behavior patterns');
    longTerm.push('Consider cache hierarchy with multiple tiers');
    longTerm.push('Implement cache analytics dashboard for ongoing monitoring');

    // Estimate impact
    const estimatedImpact = {
      hitRateImprovement: immediate.length * 0.1 + shortTerm.length * 0.05 + longTerm.length * 0.02,
      memoryReduction: health.memoryPressure > MemoryPressureLevel.HIGH ? 0.2 : 0.1,
      latencyImprovement: health.latency && health.latency > 50 ? 0.3 : 0.1
    };

    return {
      immediate,
      shortTerm,
      longTerm,
      estimatedImpact
    };
  }
}