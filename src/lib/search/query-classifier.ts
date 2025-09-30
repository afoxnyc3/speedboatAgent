/**
 * Query Classification System
 * Simplified implementation with dependency injection for testability
 * Based on mon.md recommendations
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { createHash } from 'crypto';
import { z } from 'zod';

import {
  QueryClassification,
  ClassificationOptions,
  SOURCE_WEIGHT_CONFIGS,
  DEFAULT_WEIGHTS,
  ClassificationMetrics,
  QueryType,
  type SourceWeights
} from '../../types/query-classification';

// Zod schema for GPT response validation
const ClassificationResponseSchema = z.object({
  type: z.enum(['technical', 'business', 'operational']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

/**
 * Enhanced error handling with structured error responses
 */
export class QueryClassificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'QueryClassificationError';
  }
}

// Simple in-memory cache
const _cache = new Map<string, QueryClassification>();
let _cacheHits = 0;
let _cacheMisses = 0;

// Dependencies interface for injection
interface ClassifierDeps {
  generateObject?: typeof generateObject;
  createHash?: typeof createHash;
  openai?: typeof openai;
}

let _deps: ClassifierDeps | undefined;

/**
 * Set dependencies for testing (call this in test setup)
 */
export function setClassifierDependencies(deps?: ClassifierDeps) {
  _deps = deps;
}

/**
 * Validate and normalize query
 */
function validateAndNormalizeQuery(query: string): string {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new QueryClassificationError('Query cannot be empty', 'INVALID_QUERY');
  }
  return query.trim();
}

/**
 * Generate cache key from query
 */
function generateCacheKey(query: string): string {
  const _createHash = _deps?.createHash || createHash;
  return _createHash('sha256')
    .update(query.toLowerCase().trim())
    .digest('hex');
}

/**
 * Get source weights for classification type
 */
function getWeightsForType(type: QueryType): SourceWeights {
  return type === 'business'
    ? SOURCE_WEIGHT_CONFIGS.business
    : type === 'operational'
    ? SOURCE_WEIGHT_CONFIGS.operational
    : SOURCE_WEIGHT_CONFIGS.technical;
}

/**
 * Create fallback classification for errors
 */
function createFallbackClassification(query: string, error: unknown): QueryClassification {
  const message = error instanceof Error ? error.message : String(error);
  return {
    query,
    type: 'operational',
    confidence: 0.0,
    weights: DEFAULT_WEIGHTS,
    reasoning: `Fallback due to error: ${message}`,
    cached: false
  };
}

/**
 * Classify a single query
 */
export async function classifyQuery(
  query: string,
  options: ClassificationOptions = {}
): Promise<QueryClassification> {
  const { useCache = true, timeout = 5000, fallbackWeights = true } = options;

  // Use injected dependencies or defaults
  const _generateObject = _deps?.generateObject || generateObject;
  const _openai = _deps?.openai || openai;

  const normalizedQuery = validateAndNormalizeQuery(query);
  const cacheKey = generateCacheKey(normalizedQuery);

  // Check cache first
  if (useCache && _cache.has(cacheKey)) {
    _cacheHits++;
    const hit = _cache.get(cacheKey)!;
    return { ...hit, cached: true, reasoning: 'Cached response' };
  }

  _cacheMisses++;

  try {
    // Set up timeout
    const controller = new AbortController();
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;

    // Call GPT for classification
    const result = await _generateObject({
      model: _openai('gpt-4o-mini'),
      system: 'You are an expert at classifying user queries.',
      prompt: `Classify this query: "${normalizedQuery}"`,
      schema: ClassificationResponseSchema,
      abortSignal: controller.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    // Validate GPT response
    const validTypes: QueryType[] = ['technical', 'business', 'operational'];
    if (!validTypes.includes(result.object.type) ||
        typeof result.object.confidence !== 'number' ||
        result.object.confidence < 0 || result.object.confidence > 1) {
      // Invalid response, use fallback
      if (!fallbackWeights) {
        throw new QueryClassificationError('Invalid classification response', 'INVALID_RESPONSE');
      }
      return createFallbackClassification(normalizedQuery, new Error('Invalid GPT response format'));
    }

    const weights = getWeightsForType(result.object.type);
    const classification: QueryClassification = {
      query: normalizedQuery,
      type: result.object.type,
      confidence: result.object.confidence ?? 0.9,
      weights: weights as Record<string, number> & SourceWeights,
      reasoning: result.object.reasoning ?? 'Model classification',
      cached: false
    };

    // Cache the result
    _cache.set(cacheKey, classification);

    return classification;
  } catch (error) {
    if (!fallbackWeights) {
      throw new QueryClassificationError('API Error', 'PROVIDER_ERROR', { originalError: error });
    }
    return createFallbackClassification(normalizedQuery, error);
  }
}

/**
 * Classify multiple queries in parallel
 */
export async function classifyQueries(
  queries: string[],
  options?: ClassificationOptions
): Promise<QueryClassification[]> {
  return Promise.all(queries.map(q => classifyQuery(q, options)));
}

/**
 * Classify query with performance metrics
 */
export async function classifyQueryWithMetrics(
  query: string,
  options: ClassificationOptions = {}
): Promise<{
  classification: QueryClassification;
  metrics: ClassificationMetrics;
}> {
  const startTime = Date.now();

  try {
    const classification = await classifyQuery(query, options);
    const responseTime = Date.now() - startTime;
    const fromCache = classification.cached === true && classification.reasoning === 'Cached response';
    const isFallback = classification.confidence === 0.0 && (classification.reasoning?.includes('Fallback due to error') ?? false);

    return {
      classification,
      metrics: {
        responseTime,
        cacheHit: fromCache,
        source: isFallback ? 'fallback' : (fromCache ? 'cache' : 'openai'),
        confidence: classification.confidence
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const fallback = createFallbackClassification(validateAndNormalizeQuery(query), error);

    return {
      classification: fallback,
      metrics: {
        responseTime,
        cacheHit: false,
        source: 'fallback',
        confidence: 0.0
      }
    };
  }
}

/**
 * Validate classification result
 */
export function validateClassification(
  classification: QueryClassification
): boolean {
  try {
    if (!classification) return false;
    if (typeof classification.query !== 'string' || classification.query.trim().length === 0) return false;
    if (!['technical', 'business', 'operational'].includes(classification.type)) return false;
    if (typeof classification.confidence !== 'number') return false;
    if (classification.confidence < 0 || classification.confidence > 1) return false;
    if (typeof classification.reasoning !== 'string') return false;
    if (!classification.weights || typeof classification.weights !== 'object') return false;

    // Validate weight values are positive numbers
    for (const key in classification.weights) {
      const value = classification.weights[key];
      if (typeof value !== 'number' || value <= 0 || !isFinite(value)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get classification metrics and cache management
 */
export function getClassificationMetrics() {
  return {
    cacheSize: _cache.size,
    cacheHits: _cacheHits,
    cacheMisses: _cacheMisses,
    hitRate: _cacheHits + _cacheMisses > 0
      ? _cacheHits / (_cacheHits + _cacheMisses)
      : 0,
    clearCache: () => {
      _cache.clear();
      _cacheHits = 0;
      _cacheMisses = 0;
    },
    getCacheEntry: (query: string) => {
      const key = generateCacheKey(query);
      return _cache.get(key) || null;
    }
  };
}