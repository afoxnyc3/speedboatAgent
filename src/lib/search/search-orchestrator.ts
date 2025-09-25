/**
 * Search Orchestration
 * High-level search workflow coordination
 */

import { randomUUID } from 'crypto';
import {
  createQueryId,
  SearchResponse,
  DEFAULT_SEARCH_CONFIG,
  type SearchFilters,
  type SearchConfig,
  type SourceWeights
} from '../../types/search';
import { classifyQueryWithMetrics } from './query-classifier';
import { performHybridSearch } from './hybrid-search';
import {
  generateSearchSuggestions,
  buildSearchMetadata,
  processQuery,
  filterDocumentContent
} from './search-utils';
import { createTimeoutController, validateQueryConstraints } from './search-validation';

export interface SearchExecutionParams {
  readonly query: string;
  readonly limit: number;
  readonly offset: number;
  readonly weights?: SourceWeights;
  readonly includeContent: boolean;
  readonly includeEmbedding: boolean;
  readonly timeout: number;
  readonly filters?: SearchFilters;
  readonly config?: SearchConfig;
}

/**
 * Executes complete search workflow with classification and processing
 */
export async function executeSearchWorkflow(
  params: SearchExecutionParams
): Promise<SearchResponse> {
  const queryId = createQueryId(randomUUID());
  validateQueryConstraints(params.query);

  const { cleanup } = createTimeoutController(params.timeout);

  try {
    const { classification, metrics } = await classifyQueryWithMetrics(
      params.query,
      { timeout: Math.min(params.timeout / 3, 2000) }
    );

    const sourceWeights = params.weights || classification.weights;
    const { documents, searchTime } = await performHybridSearch({
      query: params.query,
      config: DEFAULT_SEARCH_CONFIG,
      sourceWeights,
      limit: params.limit,
      offset: params.offset
    });

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
      metrics.cacheHit,
      params.filters,
      params.config
    );

    cleanup();

    return {
      success: true,
      results: processedDocuments,
      metadata,
      query: processQuery(params.query, classification.type, params.filters),
      suggestions
    };

  } catch (error) {
    cleanup();
    throw error;
  }
}

/**
 * Creates API health status response
 */
export function createHealthResponse(): Record<string, unknown> {
  return {
    status: 'healthy',
    version: '1.0.0',
    capabilities: [
      'hybrid_search',
      'query_classification',
      'source_weighting',
      'result_caching'
    ],
    limits: {
      maxQueryLength: 1000,
      maxResults: 100,
      timeout: 30000
    }
  };
}

/**
 * Creates unhealthy API status response
 */
export function createUnhealthyResponse(error: unknown): Record<string, unknown> {
  return {
    status: 'unhealthy',
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}