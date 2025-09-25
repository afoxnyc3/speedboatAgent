/**
 * Search API Route
 * Production-ready hybrid search endpoint with query classification
 */

import { NextRequest, NextResponse } from 'next/server';
import { testWeaviateConnection } from '../../../src/lib/search/hybrid-search';
import { validateAndProcessRequest } from '../../../src/lib/search/search-validation';
import { createPerformanceHeaders } from '../../../src/lib/search/search-utils';
import { processSearchError, createErrorResponse } from '../../../src/lib/search/error-handler';
import { SearchResponse } from '../../../src/types/search';
import {
  executeSearchWorkflow,
  createHealthResponse,
  createUnhealthyResponse
} from '../../../src/lib/search/search-orchestrator';

/**
 * Extracts search parameters from validated request
 */
function extractSearchParams(searchRequest: Record<string, unknown>) {
  return {
    query: searchRequest.query,
    limit: searchRequest.limit ?? 10,
    offset: searchRequest.offset ?? 0,
    weights: searchRequest.weights,
    includeContent: searchRequest.includeContent ?? true,
    includeEmbedding: searchRequest.includeEmbedding ?? false,
    timeout: searchRequest.timeout ?? 5000,
    filters: searchRequest.filters,
    config: searchRequest.config
  };
}

/**
 * Creates successful search response with headers
 */
function createSearchResponse(response: SearchResponse, startTime: number): NextResponse {
  const totalTime = Date.now() - startTime;
  const headers = createPerformanceHeaders(
    response.metadata.queryId,
    response.metadata.searchTime,
    totalTime,
    response.metadata.cacheHit,
    response.results.length
  );

  return NextResponse.json(response, { status: 200, headers });
}

/**
 * POST /api/search - Hybrid search endpoint
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const searchRequest = await validateAndProcessRequest(request);
    const params = extractSearchParams(searchRequest as Record<string, unknown>);
    const response = await executeSearchWorkflow(params);
    return createSearchResponse(response, startTime);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const { errorResponse, status } = processSearchError(error);
    return createErrorResponse(errorResponse, status, totalTime);
  }
}

/**
 * GET /api/search - Health check and API info
 */
export async function GET(): Promise<NextResponse> {
  try {
    await testWeaviateConnection();
    return NextResponse.json(createHealthResponse());
  } catch (error) {
    return NextResponse.json(createUnhealthyResponse(error), { status: 503 });
  }
}