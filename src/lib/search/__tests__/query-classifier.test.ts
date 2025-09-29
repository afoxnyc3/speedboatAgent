/**
 * Query Classifier Tests
 * Comprehensive test suite for query classification system
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createHash } from 'crypto';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import {
  classifyQuery,
  classifyQueries,
  validateClassification,
  classifyQueryWithMetrics,
  getClassificationMetrics,
  QueryClassificationError
} from '../query-classifier';
import {
  QueryClassification,
  QueryType,
  SOURCE_WEIGHT_CONFIGS,
  DEFAULT_WEIGHTS
} from '../../../types/query-classification';
import { RedisClassificationCache } from '../../cache/redis-cache';

// Mock dependencies
jest.mock('@ai-sdk/openai');
jest.mock('ai');
jest.mock('crypto');
jest.mock('../../cache/redis-cache');

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;
const mockCreateHash = createHash as jest.MockedFunction<typeof createHash>;
const mockRedisClassificationCache = RedisClassificationCache as jest.MockedClass<typeof RedisClassificationCache>;

describe('QueryClassifier', () => {
  let mockHashDigest: jest.MockedFunction<any>;
  let mockHashUpdate: jest.MockedFunction<any>;
  let mockRedisCacheInstance: jest.Mocked<RedisClassificationCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Mock crypto hash
    mockHashDigest = jest.fn().mockReturnValue('mock-hash-key');
    mockHashUpdate = jest.fn().mockReturnValue({ digest: mockHashDigest });
    mockCreateHash.mockReturnValue({ update: mockHashUpdate } as any);

    // Mock Redis cache
    mockRedisCacheInstance = {
      isAvailable: jest.fn().mockReturnValue(true),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(void 0),
      clear: jest.fn().mockResolvedValue(void 0)
    } as any;

    mockRedisClassificationCache.mockImplementation(() => mockRedisCacheInstance);

    // Clear any existing cache
    const metrics = getClassificationMetrics();
    metrics.clearCache();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('classifyQuery', () => {
    const mockGPTResponse = {
      object: {
        type: 'technical' as QueryType,
        confidence: 0.9,
        reasoning: 'Query asks about React implementation details'
      }
    };

    beforeEach(() => {
      mockGenerateObject.mockResolvedValue(mockGPTResponse);
    });

    it('should classify technical queries correctly', async () => {
      // Arrange
      const query = 'How do I implement React hooks?';

      // Act
      const result = await classifyQuery(query);

      // Assert
      expect(result).toMatchObject({
        query,
        type: 'technical',
        confidence: 0.9,
        weights: SOURCE_WEIGHT_CONFIGS.technical,
        reasoning: expect.stringContaining('React implementation'),
        cached: false
      });

      expect(mockGenerateObject).toHaveBeenCalledWith({
        model: openai('gpt-4o-mini'),
        system: expect.stringContaining('expert at classifying user queries'),
        prompt: `Classify this query: "${query}"`,
        schema: expect.any(Object),
        abortSignal: expect.any(AbortSignal)
      });
    });

    it('should classify business queries correctly', async () => {
      // Arrange
      const query = 'What features does the product have?';
      mockGenerateObject.mockResolvedValue({
        object: {
          type: 'business' as QueryType,
          confidence: 0.85,
          reasoning: 'Query asks about product features and capabilities'
        }
      });

      // Act
      const result = await classifyQuery(query);

      // Assert
      expect(result).toMatchObject({
        type: 'business',
        confidence: 0.85,
        weights: SOURCE_WEIGHT_CONFIGS.business
      });
    });

    it('should classify operational queries correctly', async () => {
      // Arrange
      const query = 'How do I deploy this application?';
      mockGenerateObject.mockResolvedValue({
        object: {
          type: 'operational' as QueryType,
          confidence: 0.95,
          reasoning: 'Query asks about deployment procedures'
        }
      });

      // Act
      const result = await classifyQuery(query);

      // Assert
      expect(result).toMatchObject({
        type: 'operational',
        confidence: 0.95,
        weights: SOURCE_WEIGHT_CONFIGS.operational
      });
    });

    it('should return cached results when available', async () => {
      // Arrange
      const query = 'How do I implement React hooks?';
      const cachedResult: QueryClassification = {
        query,
        type: 'technical',
        confidence: 0.9,
        weights: SOURCE_WEIGHT_CONFIGS.technical,
        reasoning: 'Cached response',
        cached: true
      };

      // First call should hit GPT, second should hit cache
      await classifyQuery(query);
      mockGenerateObject.mockClear();

      // Mock the cache to return cached result
      const originalGet = mockRedisCacheInstance.get;
      mockRedisCacheInstance.get.mockResolvedValueOnce(cachedResult);

      // Act - second call
      const result = await classifyQuery(query);

      // Assert
      expect(result.cached).toBe(true);
      expect(result.reasoning).toBe('Cached response');
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('should handle GPT timeout errors', async () => {
      // Arrange
      const query = 'Test query';
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'AbortError';
      mockGenerateObject.mockRejectedValue(timeoutError);

      // Act
      const result = await classifyQuery(query, { fallbackWeights: true });

      // Assert
      expect(result).toMatchObject({
        type: 'operational',
        confidence: 0.0,
        weights: DEFAULT_WEIGHTS,
        reasoning: expect.stringContaining('Classification timeout'),
        cached: false
      });
    });

    it('should handle GPT API errors with fallback', async () => {
      // Arrange
      const query = 'Test query';
      mockGenerateObject.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await classifyQuery(query, { fallbackWeights: true });

      // Assert
      expect(result).toMatchObject({
        type: 'operational',
        confidence: 0.0,
        weights: DEFAULT_WEIGHTS,
        reasoning: expect.stringContaining('API Error'),
        cached: false
      });
    });

    it('should throw error when fallbackWeights is false', async () => {
      // Arrange
      const query = 'Test query';
      mockGenerateObject.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(
        classifyQuery(query, { fallbackWeights: false })
      ).rejects.toThrow('API Error');
    });

    it('should validate and normalize query input', async () => {
      // Test empty string
      await expect(classifyQuery('')).rejects.toThrow('Query cannot be empty');

      // Test null/undefined
      await expect(classifyQuery(null as any)).rejects.toThrow('Query must be a non-empty string');
      await expect(classifyQuery(undefined as any)).rejects.toThrow('Query must be a non-empty string');

      // Test non-string
      await expect(classifyQuery(123 as any)).rejects.toThrow('Query must be a non-empty string');

      // Test whitespace-only string
      await expect(classifyQuery('   ')).rejects.toThrow('Query cannot be empty');

      // Test valid query with whitespace
      const result = await classifyQuery('  valid query  ');
      expect(result.query).toBe('valid query'); // Should be trimmed
    });

    it('should respect useCache option', async () => {
      // Arrange
      const query = 'Test query';

      // Act - first call with cache disabled
      await classifyQuery(query, { useCache: false });

      // Act - second call with cache disabled
      mockGenerateObject.mockClear();
      await classifyQuery(query, { useCache: false });

      // Assert - should call GPT both times
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it('should handle custom timeout', async () => {
      // Arrange
      const query = 'Test query';
      const customTimeout = 3000;

      // Act
      await classifyQuery(query, { timeout: customTimeout });

      // Assert
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal)
        })
      );
    });

    it('should generate proper cache keys', async () => {
      // Arrange
      const query = 'Test Query With Cases';

      // Act
      await classifyQuery(query);

      // Assert
      expect(mockCreateHash).toHaveBeenCalledWith('sha256');
      expect(mockHashUpdate).toHaveBeenCalledWith('test query with cases'); // Lowercased and trimmed
    });
  });

  describe('classifyQueries', () => {
    beforeEach(() => {
      mockGenerateObject.mockResolvedValue({
        object: {
          type: 'technical',
          confidence: 0.9,
          reasoning: 'Test reasoning'
        }
      });
    });

    it('should classify multiple queries in parallel', async () => {
      // Arrange
      const queries = [
        'How do I implement React hooks?',
        'What is the deployment process?',
        'What features are available?'
      ];

      // Act
      const results = await classifyQueries(queries);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].query).toBe(queries[0]);
      expect(results[1].query).toBe(queries[1]);
      expect(results[2].query).toBe(queries[2]);
      expect(mockGenerateObject).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      // Act
      const results = await classifyQueries([]);

      // Assert
      expect(results).toEqual([]);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('should pass options to individual classifications', async () => {
      // Arrange
      const queries = ['Test query 1', 'Test query 2'];
      const options = { useCache: false, timeout: 3000 };

      // Act
      await classifyQueries(queries, options);

      // Assert - Each query should be called with the same options
      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateClassification', () => {
    const validClassification: QueryClassification = {
      query: 'test query',
      type: 'technical',
      confidence: 0.9,
      weights: { github: 1.5, web: 0.5 },
      reasoning: 'test reasoning',
      cached: false
    };

    it('should validate correct classification', () => {
      expect(validateClassification(validClassification)).toBe(true);
    });

    it('should reject invalid query', () => {
      expect(validateClassification({ ...validClassification, query: '' })).toBe(false);
      expect(validateClassification({ ...validClassification, query: '   ' })).toBe(false);
      expect(validateClassification({ ...validClassification, query: null as any })).toBe(false);
    });

    it('should reject invalid type', () => {
      expect(validateClassification({ ...validClassification, type: 'invalid' as any })).toBe(false);
      expect(validateClassification({ ...validClassification, type: null as any })).toBe(false);
    });

    it('should reject invalid confidence', () => {
      expect(validateClassification({ ...validClassification, confidence: -0.1 })).toBe(false);
      expect(validateClassification({ ...validClassification, confidence: 1.1 })).toBe(false);
      expect(validateClassification({ ...validClassification, confidence: 'invalid' as any })).toBe(false);
    });

    it('should reject invalid weights', () => {
      expect(validateClassification({ ...validClassification, weights: null as any })).toBe(false);
      expect(validateClassification({ ...validClassification, weights: { github: -1, web: 0.5 } })).toBe(false);
      expect(validateClassification({ ...validClassification, weights: { github: 1.5, web: 0 } })).toBe(false);
      expect(validateClassification({ ...validClassification, weights: { github: 'invalid' as any, web: 0.5 } })).toBe(false);
    });

    it('should handle exceptions gracefully', () => {
      // Test with null/undefined input
      expect(validateClassification(null as any)).toBe(false);
      expect(validateClassification(undefined as any)).toBe(false);

      // Test with circular reference (should not throw)
      const circular: any = { ...validClassification };
      circular.circular = circular;
      expect(validateClassification(circular)).toBe(false);
    });
  });

  describe('classifyQueryWithMetrics', () => {
    beforeEach(() => {
      mockGenerateObject.mockResolvedValue({
        object: {
          type: 'technical',
          confidence: 0.9,
          reasoning: 'Test reasoning'
        }
      });
    });

    it('should return classification with metrics', async () => {
      // Arrange
      const query = 'How do I implement React hooks?';

      // Act
      const result = await classifyQueryWithMetrics(query);

      // Assert
      expect(result.classification).toMatchObject({
        query,
        type: 'technical',
        confidence: 0.9
      });

      expect(result.metrics).toMatchObject({
        responseTime: expect.any(Number),
        cacheHit: false,
        confidence: 0.9,
        source: 'openai'
      });

      expect(result.metrics.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should report cache hit metrics correctly', async () => {
      // Arrange
      const query = 'Test query';
      const cachedResult: QueryClassification = {
        query,
        type: 'technical',
        confidence: 0.8,
        weights: SOURCE_WEIGHT_CONFIGS.technical,
        reasoning: 'Cached',
        cached: true
      };

      // Mock cache hit
      mockRedisCacheInstance.get.mockResolvedValueOnce(cachedResult);

      // Act
      const result = await classifyQueryWithMetrics(query);

      // Assert
      expect(result.metrics).toMatchObject({
        cacheHit: true,
        source: 'cache'
      });
    });

    it('should return fallback metrics on error', async () => {
      // Arrange
      const query = 'Test query';
      mockGenerateObject.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await classifyQueryWithMetrics(query);

      // Assert
      expect(result.classification).toMatchObject({
        type: 'operational',
        confidence: 0.0,
        weights: DEFAULT_WEIGHTS
      });

      expect(result.metrics).toMatchObject({
        cacheHit: false,
        confidence: 0.0,
        source: 'fallback'
      });
    });
  });

  describe('Cache Management', () => {
    it('should provide cache metrics', async () => {
      // Act
      const metrics = getClassificationMetrics();

      // Assert
      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('clearCache');
      expect(typeof metrics.cacheSize).toBe('number');
      expect(typeof metrics.clearCache).toBe('function');
    });

    it('should clear cache successfully', async () => {
      // Arrange
      const metrics = getClassificationMetrics();

      // Act & Assert - Should not throw
      await expect(metrics.clearCache()).resolves.toBeUndefined();
    });
  });

  describe('HybridClassificationCache', () => {
    it('should handle Redis unavailability gracefully', async () => {
      // Arrange
      mockRedisCacheInstance.isAvailable.mockReturnValue(false);
      const query = 'Test query';

      // Act - Should not throw despite Redis being unavailable
      const result = await classifyQuery(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('technical'); // From GPT response
    });

    it('should handle Redis errors gracefully', async () => {
      // Arrange
      mockRedisCacheInstance.get.mockRejectedValue(new Error('Redis connection error'));
      mockRedisCacheInstance.set.mockRejectedValue(new Error('Redis connection error'));
      const query = 'Test query';

      // Act - Should not throw despite Redis errors
      const result = await classifyQuery(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('technical');
    });
  });

  describe('QueryClassificationError', () => {
    it('should create structured error with code and details', () => {
      // Arrange
      const message = 'Classification failed';
      const code = 'CLASSIFICATION_ERROR';
      const details = { query: 'test', timeout: 5000 };

      // Act
      const error = new QueryClassificationError(message, code, details);

      // Assert
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.details).toBe(details);
      expect(error.name).toBe('QueryClassificationError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed GPT responses', async () => {
      // Arrange
      mockGenerateObject.mockResolvedValue({
        object: {
          type: 'invalid_type',
          confidence: 'invalid_confidence',
          reasoning: null
        }
      });

      // Act
      const result = await classifyQuery('test query', { fallbackWeights: true });

      // Assert - Should fallback to default classification
      expect(result.type).toBe('operational');
      expect(result.confidence).toBe(0.0);
    });

    it('should handle network interruptions', async () => {
      // Arrange
      mockGenerateObject.mockRejectedValue(new Error('ECONNRESET'));

      // Act
      const result = await classifyQuery('test query', { fallbackWeights: true });

      // Assert
      expect(result.type).toBe('operational');
      expect(result.reasoning).toContain('ECONNRESET');
    });

    it('should handle very long queries', async () => {
      // Arrange
      const longQuery = 'a'.repeat(10000); // 10KB query

      // Act
      const result = await classifyQuery(longQuery);

      // Assert
      expect(result.query).toBe(longQuery);
      expect(mockHashUpdate).toHaveBeenCalledWith(longQuery.toLowerCase());
    });
  });
});