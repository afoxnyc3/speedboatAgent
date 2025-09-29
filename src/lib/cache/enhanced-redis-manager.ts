/**
 * Enhanced Redis Cache Manager - Main Entry Point
 * Integrates all enhanced caching functionality with backward compatibility
 */

import { Redis } from '@upstash/redis';
import { EnhancedCacheOperations } from './enhanced-cache-operations';
import { EnhancedCacheAnalytics } from './enhanced-cache-analytics';

// Re-export all types and interfaces
export type {
  CacheType,
  EnhancedCacheConfig,
  CacheMetrics,
  EnhancedCacheEntry,
  CacheSetOptions,
  CacheGetOptions,
  IntelligentWarmingQuery,
  CacheWarmingResult,
  EnhancedHealthCheck,
  CacheOptimizationResult,
  DetailedCacheMetrics,
  CacheUsageStatistics,
  CacheOperationResult
} from './enhanced-cache-types';

export {
  ENHANCED_CACHE_CONFIGS,
  CachePriority,
  MemoryPressureLevel
} from './enhanced-cache-types';

/**
 * Enhanced Redis Cache Manager with Advanced Optimizations
 * Integrates TTL management, compression, and intelligent caching strategies
 */
export class EnhancedRedisCacheManager {
  private client: Redis | null;
  private operations: EnhancedCacheOperations;
  private analytics: EnhancedCacheAnalytics;

  constructor() {
    this.client = this.initializeRedisClient();
    this.operations = new EnhancedCacheOperations(this.client);
    this.analytics = new EnhancedCacheAnalytics(this.client, this.operations);
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

  // Delegate core operations to operations module
  async setOptimized(key: string, data: any, type: string, options: any = {}) {
    return this.operations.setOptimized(key, data, type, options);
  }

  async getOptimized(key: string, type: string, options: any = {}) {
    return this.operations.getOptimized(key, type, options);
  }

  async exists(key: string, type: string, context?: string) {
    return this.operations.exists(key, type, context);
  }

  async delete(key: string, type: string, context?: string) {
    return this.operations.delete(key, type, context);
  }

  async getTTL(key: string, type: string, context?: string) {
    return this.operations.getTTL(key, type, context);
  }

  // Delegate analytics operations to analytics module
  async warmCacheIntelligently(queries: any[]) {
    return this.analytics.warmCacheIntelligently(queries);
  }

  async getMemoryPressure() {
    return this.analytics.getMemoryPressure();
  }

  async getCacheSizes() {
    return this.analytics.getCacheSizes();
  }

  async healthCheck() {
    return this.analytics.healthCheck();
  }

  async optimize() {
    return this.analytics.optimize();
  }

  async getDetailedMetrics() {
    return this.analytics.getDetailedMetrics();
  }

  async getUsageStatistics() {
    return this.analytics.getUsageStatistics();
  }

  async getPerformanceRecommendations() {
    return this.analytics.getPerformanceRecommendations();
  }

  async predictPerformance(hoursAhead: number = 24) {
    return this.analytics.predictPerformance(hoursAhead);
  }

  async generateOptimizationStrategy() {
    return this.analytics.generateOptimizationStrategy();
  }

  // Direct access to operations and analytics for advanced usage
  getOperations(): EnhancedCacheOperations {
    return this.operations;
  }

  getAnalytics(): EnhancedCacheAnalytics {
    return this.analytics;
  }

  // Common utility methods
  getMetrics() {
    return this.operations.getMetrics();
  }

  isAvailable(): boolean {
    return this.operations.isAvailable();
  }

  getConfig(type: string) {
    return this.operations.getConfig(type);
  }

  updateConfig(type: string, config: any) {
    return this.operations.updateConfig(type, config);
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

/**
 * Reset singleton for testing purposes
 */
export function resetEnhancedCacheManager(): void {
  enhancedCacheManager = null;
}

// Export module classes for direct usage if needed
export { EnhancedCacheOperations } from './enhanced-cache-operations';
export { EnhancedCacheAnalytics } from './enhanced-cache-analytics';