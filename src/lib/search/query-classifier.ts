/**
 * Query Classification System
 * Intelligent RAG query routing with GPT-4 classification
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { createHash } from 'crypto';
import { z } from 'zod';

import {
  QueryClassification,
  ClassificationOptions,
  GPTClassificationResponse,
  SOURCE_WEIGHT_CONFIGS,
  DEFAULT_WEIGHTS,
  ClassificationMetrics,
  QueryType
} from '../../types/query-classification';
import { RedisClassificationCache } from '../cache/redis-cache';

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

function normalizeClassificationError(
  error: unknown,
  context: { timeout?: number } = {}
): QueryClassificationError {
  if (error instanceof QueryClassificationError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new QueryClassificationError('Classification response validation failed', 'INVALID_RESPONSE', {
      issues: error.issues
    });
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new QueryClassificationError(
      `Classification timeout after ${context.timeout ?? 0}ms`,
      'TIMEOUT',
      {
        timeout: context.timeout
      }
    );
  }

  if (error instanceof SyntaxError || (error instanceof Error && /Invalid JSON response/i.test(error.message))) {
    return new QueryClassificationError(
      'Invalid JSON response from classification provider',
      'INVALID_RESPONSE',
      {
        originalError: error
      }
    );
  }

  if (error instanceof Error) {
    return new QueryClassificationError(
      `Classification provider error: ${error.message}`,
      'PROVIDER_ERROR',
      {
        originalError: error
      }
    );
  }

  return new QueryClassificationError('Classification provider error: Unknown error', 'PROVIDER_ERROR', {
    originalError: error
  });
}

/**
 * System prompt for consistent query classification
 */
const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert at classifying user queries for a RAG system containing code repositories and business documentation.

Classify queries into these categories:

1. TECHNICAL: Code implementation, API usage, programming concepts, architectural details, debugging
   - Examples: "How do I implement React hooks?", "What's the TypeScript interface?", "Fix this error"

2. BUSINESS: Product features, user stories, business requirements, processes, policies
   - Examples: "What features does the product have?", "How do users onboard?", "What's our pricing?"

3. OPERATIONAL: Deployment, configuration, DevOps, workflows, setup procedures
   - Examples: "How do I deploy?", "What's the CI/CD process?", "How to configure environment?"

Return confidence score (0-1) and brief reasoning.

Query context: Chelsea Piers speedboat booking and management system.`;

/**
 * Hybrid cache implementation (memory + Redis)
 */
class HybridClassificationCache {
  private memCache = new Map<string, { data: QueryClassification; expires: number }>();
  private redisCache = new RedisClassificationCache();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  async set(key: string, classification: QueryClassification): Promise<void> {
    // Set in memory cache immediately
    const expires = Date.now() + this.TTL_MS;
    this.memCache.set(key, { data: { ...classification, cached: true }, expires });

    // Set in Redis cache asynchronously (don't wait)
    if (this.redisCache.isAvailable()) {
      this.redisCache.set(key, classification).catch(error => {
        console.warn('Failed to set Redis cache:', error);
      });
    }
  }

  async get(key: string): Promise<QueryClassification | null> {
    // Check memory cache first
    const memEntry = this.memCache.get(key);
    if (memEntry && memEntry.expires > Date.now()) {
      return memEntry.data;
    }

    // Clean expired memory entry
    if (memEntry) {
      this.memCache.delete(key);
    }

    // Check Redis cache
    if (this.redisCache.isAvailable()) {
      try {
        const redisResult = await this.redisCache.get(key);
        if (redisResult) {
          // Warm memory cache
          const expires = Date.now() + this.TTL_MS;
          this.memCache.set(key, { data: redisResult, expires });
          return redisResult;
        }
      } catch (error) {
        console.warn('Redis cache get failed:', error);
      }
    }

    return null;
  }

  async clear(): Promise<void> {
    this.memCache.clear();
    if (this.redisCache.isAvailable()) {
      await this.redisCache.clear();
    }
  }

  size(): number {
    return this.memCache.size;
  }
}

const cache = new HybridClassificationCache();

/**
 * Generate cache key from query
 */
function generateCacheKey(query: string): string {
  return createHash('sha256')
    .update(query.toLowerCase().trim())
    .digest('hex');
}

/**
 * Classify query using GPT-4
 */
async function classifyWithGPT(
  query: string,
  timeout: number = 5000
): Promise<GPTClassificationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      system: CLASSIFICATION_SYSTEM_PROMPT,
      prompt: `Classify this query: "${query}"`,
      schema: ClassificationResponseSchema,
      abortSignal: controller.signal
    });

    clearTimeout(timeoutId);
    const parsed = ClassificationResponseSchema.safeParse(result?.object);

    if (!parsed.success) {
      throw new QueryClassificationError(
        'Classification response validation failed',
        'INVALID_RESPONSE',
        {
          issues: parsed.error.issues,
          response: result?.object
        }
      );
    }

    return parsed.data as GPTClassificationResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    throw normalizeClassificationError(error, { timeout });
  }
}

/**
 * Apply source authority weighting based on query type
 */
function applySourceWeights(type: QueryType) {
  return SOURCE_WEIGHT_CONFIGS[type];
}

/**
 * Validates and normalizes query input
 */
function validateAndNormalizeQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error('Query cannot be empty');
  }

  return trimmedQuery;
}

/**
 * Attempts to retrieve cached classification
 */
async function getCachedClassification(
  cacheKey: string,
  useCache: boolean
): Promise<QueryClassification | null> {
  if (!useCache) {
    return null;
  }

  return await cache.get(cacheKey);
}

/**
 * Creates classification result from GPT response
 */
function createClassificationResult(
  query: string,
  gptResponse: any
): QueryClassification {
  return {
    query,
    type: gptResponse.type,
    confidence: gptResponse.confidence,
    weights: applySourceWeights(gptResponse.type),
    reasoning: gptResponse.reasoning,
    cached: false
  };
}

/**
 * Creates fallback classification for errors
 */
function createFallbackClassification(
  query: string,
  error: unknown
): QueryClassification {
  const classificationError = normalizeClassificationError(error);

  return {
    query,
    type: 'operational',
    confidence: 0.0,
    weights: DEFAULT_WEIGHTS,
    reasoning: `Fallback classification due to error: ${classificationError.message}`,
    cached: false
  };
}

/**
 * Main query classification function
 */
export async function classifyQuery(
  query: string,
  options: ClassificationOptions = {}
): Promise<QueryClassification> {
  const { useCache = true, timeout = 5000, fallbackWeights = true } = options;

  const trimmedQuery = validateAndNormalizeQuery(query);
  const cacheKey = generateCacheKey(trimmedQuery);

  const cached = await getCachedClassification(cacheKey, useCache);
  if (cached) {
    return cached;
  }

  try {
    const gptResponse = await classifyWithGPT(trimmedQuery, timeout);
    const classification = createClassificationResult(trimmedQuery, gptResponse);

    if (useCache) {
      await cache.set(cacheKey, classification);
    }

    return classification;

  } catch (error) {
    const classificationError = normalizeClassificationError(error, { timeout });

    if (fallbackWeights) {
      console.warn('Classification failed, using fallback weights:', classificationError);
      return createFallbackClassification(trimmedQuery, classificationError);
    }

    throw classificationError;
  }
}

/**
 * Batch classify multiple queries
 */
export async function classifyQueries(
  queries: string[],
  options: ClassificationOptions = {}
): Promise<QueryClassification[]> {
  const promises = queries.map(query => classifyQuery(query, options));
  return Promise.all(promises);
}

/**
 * Get classification metrics
 */
export function getClassificationMetrics(): {
  cacheSize: number;
  clearCache: () => Promise<void>;
} {
  return {
    cacheSize: cache.size(),
    clearCache: () => cache.clear()
  };
}

/**
 * Validate classification result
 */
export function validateClassification(
  classification: QueryClassification
): boolean {
  try {
    return (
      typeof classification.query === 'string' &&
      classification.query.trim().length > 0 &&
      ['technical', 'business', 'operational'].includes(classification.type) &&
      typeof classification.confidence === 'number' &&
      classification.confidence >= 0 &&
      classification.confidence <= 1 &&
      typeof classification.weights === 'object' &&
      typeof classification.weights.github === 'number' &&
      typeof classification.weights.web === 'number' &&
      classification.weights.github > 0 &&
      classification.weights.web > 0
    );
  } catch {
    return false;
  }
}

/**
 * Classify with enhanced error handling and telemetry
 */
export async function classifyQueryWithMetrics(
  query: string,
  options: ClassificationOptions = {}
): Promise<{
  classification: QueryClassification;
  metrics: ClassificationMetrics;
}> {
  const startTime = Date.now();
  let cacheHit = false;
  let source: 'openai' | 'cache' | 'fallback' = 'openai';

  try {
    const classification = await classifyQuery(query, options);

    cacheHit = classification.cached || false;
    source = cacheHit ? 'cache' : 'openai';

    const metrics: ClassificationMetrics = {
      responseTime: Date.now() - startTime,
      cacheHit,
      confidence: classification.confidence,
      source
    };

    return { classification, metrics };
  } catch (error) {
    const classificationError = normalizeClassificationError(error);

    // Fallback classification with metrics
    const fallbackClassification: QueryClassification = {
      query: query.trim(),
      type: 'operational',
      confidence: 0.0,
      weights: DEFAULT_WEIGHTS,
      reasoning: `Fallback due to error: ${classificationError.message}`,
      cached: false
    };

    const metrics: ClassificationMetrics = {
      responseTime: Date.now() - startTime,
      cacheHit: false,
      confidence: 0.0,
      source: 'fallback'
    };

    return { classification: fallbackClassification, metrics };
  }
}