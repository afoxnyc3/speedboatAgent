/**
 * Search Error Handling Utilities
 * Centralized error processing and response generation
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SearchError,
  QueryId,
  type SearchErrorCode
} from '../../types/search';

/**
 * Maps error types to HTTP status codes
 */
const ERROR_STATUS_MAP: Record<SearchErrorCode, number> = {
  QUERY_TOO_SHORT: 400,
  QUERY_TOO_LONG: 400,
  INVALID_FILTERS: 400,
  PARSING_ERROR: 400,
  TIMEOUT: 408,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 500,
  EMBEDDING_FAILED: 500
};

/**
 * Creates standardized search error response
 */
function createSearchError(
  code: SearchErrorCode,
  message: string,
  queryId?: QueryId,
  details?: Record<string, unknown>
): SearchError {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      queryId
    }
  };
}

/**
 * Handles Zod validation errors
 */
export function handleValidationError(
  error: z.ZodError,
  queryId?: QueryId
): { errorResponse: SearchError; status: number } {
  const errorResponse = createSearchError(
    'PARSING_ERROR',
    'Invalid request format',
    queryId,
    error.errors
  );

  return {
    errorResponse,
    status: ERROR_STATUS_MAP.PARSING_ERROR
  };
}

/**
 * Handles timeout errors
 */
export function handleTimeoutError(
  queryId?: QueryId
): { errorResponse: SearchError; status: number } {
  const errorResponse = createSearchError(
    'TIMEOUT',
    'Search request timed out',
    queryId
  );

  return {
    errorResponse,
    status: ERROR_STATUS_MAP.TIMEOUT
  };
}

/**
 * Handles rate limit errors
 */
export function handleRateLimitError(
  queryId?: QueryId
): { errorResponse: SearchError; status: number } {
  const errorResponse = createSearchError(
    'RATE_LIMITED',
    'Too many requests',
    queryId
  );

  return {
    errorResponse,
    status: ERROR_STATUS_MAP.RATE_LIMITED
  };
}

/**
 * Handles generic service errors
 */
export function handleServiceError(
  error: Error,
  queryId?: QueryId
): { errorResponse: SearchError; status: number } {
  const errorResponse = createSearchError(
    'SERVICE_UNAVAILABLE',
    error.message,
    queryId
  );

  return {
    errorResponse,
    status: ERROR_STATUS_MAP.SERVICE_UNAVAILABLE
  };
}

/**
 * Handles unknown errors with fallback
 */
export function handleUnknownError(
  queryId?: QueryId
): { errorResponse: SearchError; status: number } {
  const errorResponse = createSearchError(
    'SERVICE_UNAVAILABLE',
    'An unknown error occurred',
    queryId
  );

  return {
    errorResponse,
    status: ERROR_STATUS_MAP.SERVICE_UNAVAILABLE
  };
}

/**
 * Determines error type and creates appropriate response
 */
export function processSearchError(
  error: unknown,
  queryId?: QueryId
): { errorResponse: SearchError; status: number } {
  console.error('Search API error:', error);

  if (error instanceof z.ZodError) {
    return handleValidationError(error, queryId);
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return handleTimeoutError(queryId);
    }

    if (error.message.includes('rate limit')) {
      return handleRateLimitError(queryId);
    }

    return handleServiceError(error, queryId);
  }

  return handleUnknownError(queryId);
}

/**
 * Creates error response with headers
 */
export function createErrorResponse(
  errorResponse: SearchError,
  status: number,
  totalTime: number
): NextResponse {
  const errorHeaders = new Headers({
    'X-Query-ID': errorResponse.error.queryId || 'unknown',
    'X-Total-Time-Ms': totalTime.toString()
  });

  return NextResponse.json(errorResponse, {
    status,
    headers: errorHeaders
  });
}