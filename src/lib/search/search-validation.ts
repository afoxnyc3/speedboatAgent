/**
 * Search Request Validation
 * Zod schema validation and request processing utilities
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  SearchRequestSchema,
  DEFAULT_SEARCH_CONFIG,
  type SearchRequest,
  type SearchConfig
} from '../../types/search';

export interface ValidatedSearchRequest extends SearchRequest {
  readonly config: SearchConfig;
}

/**
 * Parses and validates JSON request body
 */
async function parseRequestBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Validates search request using Zod schema
 */
function validateSearchRequest(body: unknown): SearchRequest {
  try {
    return SearchRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new z.ZodError([{
        code: 'custom',
        message: `Validation failed: ${message}`,
        path: []
      }]);
    }
    throw error;
  }
}

/**
 * Merges request config with defaults
 */
function mergeWithDefaultConfig(requestConfig?: Partial<SearchConfig>): SearchConfig {
  return {
    ...DEFAULT_SEARCH_CONFIG,
    ...requestConfig
  };
}

/**
 * Sets up request timeout controller
 */
export function createTimeoutController(timeout: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return { controller, timeoutId, cleanup };
}

/**
 * Validates and processes search request
 */
export async function validateAndProcessRequest(
  request: NextRequest
): Promise<ValidatedSearchRequest> {
  const body = await parseRequestBody(request);
  const searchRequest = validateSearchRequest(body);
  const config = mergeWithDefaultConfig(searchRequest.config);

  return {
    ...searchRequest,
    config
  };
}

/**
 * Validates query length constraints
 */
export function validateQueryConstraints(query: string): void {
  if (query.length < 1) {
    throw new Error('Query cannot be empty');
  }

  if (query.length > 1000) {
    throw new Error('Query exceeds maximum length of 1000 characters');
  }
}

/**
 * Validates pagination parameters
 */
export function validatePagination(limit: number, offset: number): void {
  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }

  if (offset < 0) {
    throw new Error('Offset cannot be negative');
  }
}

/**
 * Validates timeout parameter
 */
export function validateTimeout(timeout: number): void {
  if (timeout < 1000 || timeout > 30000) {
    throw new Error('Timeout must be between 1000ms and 30000ms');
  }
}