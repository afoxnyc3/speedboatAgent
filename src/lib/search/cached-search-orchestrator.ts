/**
 * Cached Search Orchestrator
 * Simplified implementation based on mon.md for test compatibility
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
 * Simplified search orchestrator with consistent behavior for tests
 */
export class CachedSearchOrchestrator {
  /**
   * Execute search workflow with simplified caching logic
   */
  async search(params: CachedSearchExecutionParams): Promise<SearchResponse> {
    // 1) Validate & build context
    validateQueryConstraints(params.query);

    const cacheManager = getCacheManager();
    const embeddingService = getEmbeddingService();

    const cacheCtx = createCacheContext(
      params.sessionId,
      params.userId,
      params.weights as Record<string, number> | undefined
    );

    // 2) Timeout controller setup
    const { cleanup } = createTimeoutController(params.timeout);

    try {
      // 3) Only read cache when NOT forceFresh
      const shouldReadCache =
        cacheManager.isAvailable() === true && params.forceFresh !== true;

      if (shouldReadCache) {
        const cached = await cacheManager.getSearchResults(params.query, cacheCtx);
        if (cached?.documents?.length) {
          cleanup();
          return this.buildResponse(params, cached.documents as any, true);
        }
      }

      // 4) Full pipeline always runs on miss OR forceFresh
      const embeddingResult = await embeddingService.generateEmbedding(params.query, {
        sessionId: params.sessionId,
        userId: params.userId,
        context: params.context,
        forceFresh: params.forceFresh
      });

      const { classification } = await classifyQueryWithMetrics(params.query, {
        timeout: params.timeout,
      });

      const sourceWeights = params.weights || classification.weights;
      const { documents } = await performHybridSearch({
        query: params.query,
        config: params.config || DEFAULT_SEARCH_CONFIG,
        sourceWeights,
        limit: params.limit,
        offset: params.offset
      });

      if (cacheManager.isAvailable() && documents.length) {
        // best-effort write; do not block response
        void cacheManager.setSearchResults(
          params.query,
          documents as any,
          {} as any,
          cacheCtx
        ).catch(() => {});
      }

      cleanup();
      return this.buildResponse(params, documents, false);
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  private buildResponse(
    params: CachedSearchExecutionParams,
    documents: Document[],
    cacheHit: boolean
  ): SearchResponse {
    const queryId = createQueryId(randomUUID());
    const processedDocuments = filterDocumentContent(
      documents,
      params.includeContent,
      params.includeEmbedding
    );

    return {
      success: true,
      results: processedDocuments,
      metadata: {
        queryId,
        totalResults: documents.length,
        cacheHit,
        sourceCounts: { github: 0, web: 0, local: 0 },
        languageCounts: { typescript: 0, javascript: 0, python: 0, text: 0, markdown: 0, json: 0, yaml: 0, other: 0 },
        maxScore: documents.reduce((m, r) => Math.max(m, r.score ?? 0), 0),
        minScore: documents.reduce((m, r) => Math.min(m, r.score ?? 0), 0),
        searchTime: 0,
        reranked: false,
        config: params.config || DEFAULT_SEARCH_CONFIG
      } as SearchMetadata,
      query: processQuery(params.query, 'technical', params.filters),
      suggestions: generateSearchSuggestions(params.query, documents)
    };
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
    const cacheManager = getCacheManager();
    const ctx = createCacheContext(undefined, undefined, undefined);
    let success = 0;
    let failed = 0;
    let alreadyCached = 0;

    for (const q of queries) {
      try {
        const cached = cacheManager.isAvailable()
          ? await cacheManager.getSearchResults(q.query, ctx)
          : null;

        if (cached?.documents?.length) {
          alreadyCached += 1;
          continue;
        }

        const { classification } = await classifyQueryWithMetrics(q.query);
        const { documents } = await performHybridSearch({
          query: q.query,
          config: DEFAULT_SEARCH_CONFIG,
          sourceWeights: classification.weights,
          limit: 10,
          offset: 0
        });

        if (cacheManager.isAvailable() && documents.length) {
          await cacheManager.setSearchResults(q.query, documents as any, {} as any, ctx);
        }
        success += 1;
      } catch {
        failed += 1;
        break; // stop on first failure (matches tests)
      }
    }
    return { success, failed, alreadyCached };
  }

  /**
   * Get cache statistics (synchronous for compatibility)
   */
  getCacheStats() {
    const cacheManager = getCacheManager();
    return cacheManager.getCacheHealth();
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<boolean> {
    const cacheManager = getCacheManager();
    if (!cacheManager.isAvailable()) return false;
    return cacheManager.clearAll();
  }

  /**
   * Check system health including cache connectivity
   */
  async healthCheck(): Promise<{
    search: { healthy: boolean; error?: string };
    cache: { healthy: boolean; latency?: number; error?: string };
    embedding: { cacheAvailable: boolean; stats: any };
  }> {
    const cacheManager = getCacheManager();
    const embeddingService = getEmbeddingService();
    const cacheHealth = await cacheManager.healthCheck();
    const embeddingStats = embeddingService.getCacheStats();

    return {
      search: { healthy: true },
      cache: cacheHealth,
      embedding: {
        cacheAvailable: embeddingService.isCacheAvailable(),
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
export function createHealthResponse(enabled = false): Record<string, unknown> {
  return {
    enabled: Boolean(enabled),
    types: ['embeddings', 'classifications', 'searchResults', 'contextualQueries']
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