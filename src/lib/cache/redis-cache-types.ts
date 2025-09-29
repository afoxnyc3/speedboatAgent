/**
 * Redis Cache Types and Configuration
 * Shared interfaces and types for Redis caching system
 */

// Cache configuration interface
export interface CacheConfig {
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
export interface EmbeddingCacheEntry {
  embedding: number[];
  model: string;
  dimensions: number;
  cached: boolean;
  timestamp: Date;
}

// Search result cache entry
export interface SearchResultCacheEntry {
  documents: Document[];
  metadata: SearchMetadata;
  cached: boolean;
  timestamp: Date;
}

// Search metadata interface
export interface SearchMetadata {
  query: string;
  resultCount: number;
  searchTime: number;
  sources?: string[];
}

// Document interface (simplified)
export interface Document {
  id: string;
  content: string;
  source?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

// Cache health response interface
export interface CacheHealthResponse {
  healthy: boolean;
  latency?: number;
  error?: string;
}

// Comprehensive cache health interface
export interface CacheHealthSummary {
  overall: { hitRate: number; totalRequests: number };
  byType: Record<string, CacheMetrics>;
  recommendations: string[];
}

// Cache configuration presets for different data types
export const DEFAULT_CACHE_CONFIGS: Record<string, CacheConfig> = {
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

// Cache operation types
export type CacheOperation = 'get' | 'set' | 'delete' | 'clear';

// Cache statistics interface
export interface CacheStats {
  count: number;
  keys: string[];
}

// Contextual query cache parameters
export interface ContextualQueryParams {
  originalQuery: string;
  enhancedQuery: string;
  context: string;
}

// Cache warming query interface
export interface CacheWarmingQuery {
  query: string;
  context?: string;
}