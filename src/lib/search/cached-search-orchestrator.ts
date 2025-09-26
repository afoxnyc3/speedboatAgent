/**
 * Cached Search Orchestrator
 * High-level search workflow with Redis caching integration
 */

import { randomUUID } from 'crypto';
import {
  createQueryId,
  SearchResponse,
  DEFAULT_SEARCH_CONFIG,
  type SearchFilters,
  type SearchConfig,
  type Document,
  type SearchMetadata
} from '../../types/search';
import type { SourceWeights } from '../../types/query-classification';
import { classifyQueryWithMetrics } from './query-classifier';
import { performHybridSearch } from './hybrid-search';
import {
  generateSearchSuggestions,
  buildSearchMetadata,
  processQuery,
  filterDocumentContent
} from './search-utils';
import { createTimeoutController, validateQueryConstraints } from './search-validation';
import { getCacheManager, createCacheContext } from '../cache/redis-cache';
import { getEmbeddingService } from '../cache/embedding-service';

export interface CachedSearchExecutionParams {
  readonly query: string;
  readonly limit: number;
  readonly offset: number;
  readonly weights?: SourceWeights;
  readonly includeContent: boolean;
  readonly includeEmbedding: boolean;
  readonly timeout: number;
  readonly filters?: SearchFilters;
  readonly config?: SearchConfig;
  readonly sessionId?: string;
  readonly userId?: string;
  readonly context?: string;
  readonly forceFresh?: boolean;
}

/**
 * Enhanced search orchestrator with comprehensive caching
 */
export class CachedSearchOrchestrator {
  private cacheManager = getCacheManager();
  private embeddingService = getEmbeddingService();

  /**
   * Execute search workflow with multi-layer caching
   */
  async search(params: CachedSearchExecutionParams): Promise<SearchResponse> {
    const queryId = createQueryId(randomUUID());
    validateQueryConstraints(params.query);

    const startTime = Date.now();
    const { cleanup } = createTimeoutController(params.timeout);

    try {
      // Create cache context for this search
      const cacheContext = createCacheContext(
        params.sessionId,
        params.userId,
        params.weights
      );

      // 1. Check search result cache first (unless forced fresh)
      if (!params.forceFresh && this.cacheManager.isAvailable()) {
        const cachedResults = await this.cacheManager.getSearchResults(
          params.query,
          cacheContext
        );

        if (cachedResults) {
          cleanup();
          return {
            success: true,
            results: cachedResults.documents,
            metadata: {
              ...cachedResults.metadata,
              queryId,
              cacheHit: true,
              searchTime: Date.now() - startTime
            },
            query: processQuery(params.query, 'operational', params.filters),
            suggestions: generateSearchSuggestions(params.query, cachedResults.documents)
          };
        }
      }

      // 2. Query classification (with its own cache)
      const { classification, metrics } = await classifyQueryWithMetrics(
        params.query,
        { timeout: Math.min(params.timeout / 3, 2000) }
      );

      // 3. Generate embedding with cache
      const embeddingResult = await this.embeddingService.generateEmbedding(
        params.query,
        {
          sessionId: params.sessionId,
          userId: params.userId,
          context: params.context,
          forceFresh: params.forceFresh
        }
      );

      // 4. Perform hybrid search
      const sourceWeights = params.weights || classification.weights;
      const { documents, searchTime } = await performHybridSearch({
        query: params.query,
        config: params.config || DEFAULT_SEARCH_CONFIG,
        sourceWeights,
        limit: params.limit,
        offset: params.offset
      });

      // 5. Process results
      const processedDocuments = filterDocumentContent(
        documents,
        params.includeContent,
        params.includeEmbedding
      );

      const suggestions = generateSearchSuggestions(params.query, documents);
      const metadata = buildSearchMetadata(
        queryId,
        documents,
        searchTime,
        metrics.cacheHit || embeddingResult.cached,
        params.filters,
        params.config
      );

      // 6. Cache the search results for future use
      if (this.cacheManager.isAvailable() && documents.length > 0) {
        await this.cacheManager.setSearchResults(
          params.query,
          documents,
          metadata,
          cacheContext
        );
      }

      cleanup();

      return {
        success: true,
        results: processedDocuments,
        metadata: {
          ...metadata,
          cacheHit: embeddingResult.cached,
          embeddingCached: embeddingResult.cached,
          embeddingResponseTime: embeddingResult.responseTime
        },
        query: processQuery(params.query, classification.type, params.filters),
        suggestions
      };

    } catch (error) {
      cleanup();
      throw error;
    }
  }

  /**
   * Warm cache with frequently used queries
   */
  async warmCache(queries: Array<{
    query: string;
    sessionId?: string;
    userId?: string;
    context?: string;
  }>): Promise<{
    success: number;
    failed: number;
    alreadyCached: number;
  }> {
    let success = 0;
    let failed = 0;
    let alreadyCached = 0;

    for (const queryParams of queries) {
      try {
        const cacheContext = createCacheContext(
          queryParams.sessionId,
          queryParams.userId
        );

        // Check if already cached
        const cached = await this.cacheManager.getSearchResults(
          queryParams.query,
          cacheContext
        );

        if (cached) {
          alreadyCached++;
          continue;
        }

        // Execute search to populate cache
        await this.search({
          query: queryParams.query,
          limit: 10,
          offset: 0,
          includeContent: true,
          includeEmbedding: false,
          timeout: 10000,
          sessionId: queryParams.sessionId,
          userId: queryParams.userId,
          context: queryParams.context
        });

        success++;
      } catch (error) {
        console.error(`Cache warming failed for query: ${queryParams.query}`, error);
        failed++;
      }
    }

    return { success, failed, alreadyCached };
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getCacheHealth();
  }

  /**
   * Clear all search-related caches
   */
  async clearAllCaches(): Promise<boolean> {
    return await this.cacheManager.clearAll();
  }

  /**
   * Check system health including cache connectivity
   */
  async healthCheck(): Promise<{
    search: { healthy: boolean; error?: string };
    cache: { healthy: boolean; latency?: number; error?: string };
    embedding: { cacheAvailable: boolean; stats: any };
  }> {
    const cacheHealth = await this.cacheManager.healthCheck();
    const embeddingStats = this.embeddingService.getCacheStats();

    return {
      search: { healthy: true },
      cache: cacheHealth,
      embedding: {
        cacheAvailable: this.embeddingService.isCacheAvailable(),
        stats: embeddingStats
      }
    };
  }
}

// Singleton instance
let cachedSearchOrchestrator: CachedSearchOrchestrator | null = null;

/**
 * Get singleton cached search orchestrator instance
 */
export function getSearchOrchestrator(): CachedSearchOrchestrator {
  if (!cachedSearchOrchestrator) {
    cachedSearchOrchestrator = new CachedSearchOrchestrator();
  }
  return cachedSearchOrchestrator;
}

/**
 * Legacy interface adapter for backward compatibility
 */
export async function executeSearchWorkflow(
  params: Omit<CachedSearchExecutionParams, 'sessionId' | 'userId' | 'context' | 'forceFresh'>
): Promise<SearchResponse> {
  const orchestrator = getSearchOrchestrator();
  return await orchestrator.search({
    ...params,
    sessionId: undefined,
    userId: undefined,
    context: undefined,
    forceFresh: false
  });
}

/**
 * Create health response with cache information
 */
export function createHealthResponse(): Record<string, unknown> {
  return {
    status: 'healthy',
    version: '1.0.0',
    capabilities: [
      'hybrid_search',
      'query_classification',
      'source_weighting',
      'result_caching',
      'embedding_caching',
      'contextual_caching',
      'cache_warming'
    ],
    limits: {
      maxQueryLength: 1000,
      maxResults: 100,
      timeout: 30000
    },
    cache: {
      enabled: getCacheManager().isAvailable(),
      types: ['embeddings', 'classifications', 'searchResults', 'contextualQueries']
    }
  };
}

/**
 * Create unhealthy response
 */
export function createUnhealthyResponse(error: unknown): Record<string, unknown> {
  return {
    status: 'unhealthy',
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString()
  };
}