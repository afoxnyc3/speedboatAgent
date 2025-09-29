/**
 * Enhanced Cache Types and Configuration
 * Types and interfaces for advanced Redis caching with optimizations
 */

import type { CompressedEntry } from './compression-utils';

export type CacheType = 'embedding' | 'search' | 'classification' | 'contextual';

// Enhanced cache configuration interface
export interface EnhancedCacheConfig {
  keyPrefix: string;
  enableCompression: boolean;
  enableAdaptiveTTL: boolean;
  enableUsageTracking: boolean;
  compressionThreshold: number;
  maxKeySize: number;
  contentType: 'embedding' | 'search' | 'classification' | 'contextual';
}

// Enhanced cache metrics with compression and TTL stats
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

// Enhanced cache entry with metadata
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

// Cache operation options
export interface CacheSetOptions {
  sessionId?: string;
  userId?: string;
  context?: string;
  priority?: number;
}

export interface CacheGetOptions {
  sessionId?: string;
  context?: string;
}

// Cache warming query interface
export interface IntelligentWarmingQuery {
  key: string;
  data: any;
  type: CacheType;
  priority?: number;
  sessionId?: string;
}

// Cache warming results
export interface CacheWarmingResult {
  warmed: number;
  skipped: number;
  failed: number;
  alreadyCached: number;
}

// Health check result with advanced metrics
export interface EnhancedHealthCheck {
  healthy: boolean;
  latency?: number;
  memoryPressure: number;
  compressionEfficiency: number;
  ttlOptimization: number;
  error?: string;
}

// Optimization result interface
export interface CacheOptimizationResult {
  patternsCleanedUp: number;
  memorySaved: number;
  performanceImprovement: number;
}

// Detailed metrics interface
export interface DetailedCacheMetrics {
  metrics: Record<string, CacheMetrics>;
  cacheSize: Record<string, number>;
  health: EnhancedHealthCheck;
  timestamp: Date;
}

// Usage statistics interface
export interface CacheUsageStatistics {
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  ttlPatterns: number;
  ttlHits: number;
  timestamp: Date;
}

// Default enhanced cache configurations
export const ENHANCED_CACHE_CONFIGS: Record<string, EnhancedCacheConfig> = {
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

// Cache priority levels
export enum CachePriority {
  LOW = 3,
  NORMAL = 5,
  HIGH = 7,
  CRITICAL = 9
}

// Memory pressure thresholds
export enum MemoryPressureLevel {
  LOW = 0.3,
  MEDIUM = 0.6,
  HIGH = 0.8,
  CRITICAL = 0.95
}

// Cache operation result interface
export interface CacheOperationResult<T = any> {
  success: boolean;
  data?: T;
  fromCache?: boolean;
  compressionUsed?: boolean;
  ttlSeconds?: number;
  error?: string;
}