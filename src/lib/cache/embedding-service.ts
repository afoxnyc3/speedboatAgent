/**
 * Embedding Service with Redis Caching
 * Handles OpenAI embeddings with intelligent caching layer
 */

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { getCacheManager, createCacheContext } from './redis-cache';
import type { EmbeddingCacheEntry } from './redis-cache';

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  sessionId?: string;
  userId?: string;
  context?: string;
  forceFresh?: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
  cached: boolean;
  model: string;
  dimensions: number;
  responseTime: number;
}

/**
 * Enhanced embedding service with Redis caching
 */
export class EmbeddingService {
  private cacheManager = getCacheManager();
  private readonly defaultModel = 'text-embedding-3-large';
  private readonly defaultDimensions = 1024;

  /**
   * Generate embedding with caching
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const {
      model = this.defaultModel,
      dimensions = this.defaultDimensions,
      sessionId,
      userId,
      context,
      forceFresh = false
    } = options;

    // Create cache context for this request
    const cacheContext = createCacheContext(sessionId, userId, { model, dimensions });
    const fullContext = context ? `${cacheContext}:${context}` : cacheContext;

    // Check cache first (unless forced fresh)
    if (!forceFresh && this.cacheManager.isAvailable()) {
      const cached = await this.cacheManager.getEmbedding(text, fullContext);
      if (cached && cached.model === model && cached.dimensions === dimensions) {
        return {
          embedding: cached.embedding,
          cached: true,
          model: cached.model,
          dimensions: cached.dimensions,
          responseTime: Date.now() - startTime
        };
      }
    }

    // Generate fresh embedding
    try {
      const { embedding } = await embed({
        model: openai.embedding(model, {
          dimensions
        }),
        value: text
      });

      // Cache the result
      if (this.cacheManager.isAvailable()) {
        await this.cacheManager.setEmbedding(text, embedding, model, fullContext);
      }

      return {
        embedding,
        cached: false,
        model,
        dimensions,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    // Process in parallel but with reasonable concurrency
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text, options));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get embedding with semantic similarity caching
   * This method also checks for semantically similar cached queries
   */
  async getEmbeddingWithSimilarity(
    text: string,
    options: EmbeddingOptions & { similarityThreshold?: number } = {}
  ): Promise<EmbeddingResult> {
    const { similarityThreshold = 0.95, ...embeddingOptions } = options;

    // For now, just use direct cache lookup
    // In a production system, you might implement semantic similarity search
    // across cached embeddings to find near-matches
    return this.generateEmbedding(text, embeddingOptions);
  }

  /**
   * Warm cache with frequently used queries
   */
  async warmCache(
    queries: Array<{ text: string; options?: EmbeddingOptions }>
  ): Promise<{ warmed: number; failed: number; cached: number }> {
    let warmed = 0;
    let failed = 0;
    let cached = 0;

    for (const { text, options = {} } of queries) {
      try {
        const result = await this.generateEmbedding(text, options);
        if (result.cached) {
          cached++;
        } else {
          warmed++;
        }
      } catch (error) {
        console.error(`Cache warming failed for query: ${text}`, error);
        failed++;
      }
    }

    return { warmed, failed, cached };
  }

  /**
   * Get cache statistics for embeddings
   */
  getCacheStats() {
    return this.cacheManager.getCacheMetrics().embedding || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Check if caching is available
   */
  isCacheAvailable(): boolean {
    return this.cacheManager.isAvailable();
  }

  /**
   * Clear embedding cache
   */
  async clearCache(): Promise<boolean> {
    if (!this.cacheManager.isAvailable()) return false;

    try {
      // This clears all caches - in production you might want more granular control
      return await this.cacheManager.clearAll();
    } catch (error) {
      console.error('Error clearing embedding cache:', error);
      return false;
    }
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

/**
 * Get singleton embedding service instance
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}

/**
 * Utility function to normalize text for consistent caching
 */
export function normalizeTextForCaching(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .slice(0, 1000); // Truncate very long queries
}

/**
 * Helper to estimate cache memory usage
 */
export function estimateEmbeddingSize(embedding: number[]): number {
  // Each float64 is 8 bytes, plus JSON overhead
  return embedding.length * 8 + 100; // rough estimate
}