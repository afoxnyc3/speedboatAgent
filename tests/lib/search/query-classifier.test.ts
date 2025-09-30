/**
 * Query Classifier Unit Tests
 */

import {
  classifyQuery,
  classifyQueries,
  classifyQueryWithMetrics,
  validateClassification,
  getClassificationMetrics,
  QueryClassificationError
} from '../../../src/lib/search/query-classifier';
import {
  QueryClassification,
  SOURCE_WEIGHT_CONFIGS,
  DEFAULT_WEIGHTS
} from '../../../src/types/query-classification';

// Mock the AI SDK
jest.mock('@ai-sdk/openai');
jest.mock('ai', () => ({
  generateObject: jest.fn()
}));

// Mock Redis cache
jest.mock('../../../src/lib/cache/redis-cache');

import { generateObject } from 'ai';

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

describe('Query Classifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    const { clearCache } = getClassificationMetrics();
    clearCache();
  });

  describe('classifyQuery', () => {
    it('should classify technical queries correctly', async () => {
      // Mock GPT response
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: 'technical',
          confidence: 0.9,
          reasoning: 'Query asks about code implementation'
        }
      } as any);

      const result = await classifyQuery('How do I implement React hooks?');

      expect(result).toMatchObject({
        query: 'How do I implement React hooks?',
        type: 'technical',
        confidence: 0.9,
        weights: SOURCE_WEIGHT_CONFIGS.technical,
        cached: false
      });

      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it('should classify business queries correctly', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: 'business',
          confidence: 0.85,
          reasoning: 'Query asks about product features'
        }
      } as any);

      const result = await classifyQuery('What features does the speedboat booking system have?');

      expect(result).toMatchObject({
        type: 'business',
        weights: SOURCE_WEIGHT_CONFIGS.business
      });
    });

    it('should classify operational queries correctly', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: 'operational',
          confidence: 0.8,
          reasoning: 'Query asks about deployment process'
        }
      } as any);

      const result = await classifyQuery('How do I deploy to production?');

      expect(result).toMatchObject({
        type: 'operational',
        weights: SOURCE_WEIGHT_CONFIGS.operational
      });
    });

    it('should use cache for repeated queries', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: 'technical',
          confidence: 0.9,
          reasoning: 'Query asks about code implementation'
        }
      } as any);

      const query = 'How do I use useState hook?';

      // First call
      const result1 = await classifyQuery(query);
      expect(result1.cached).toBe(false);

      // Second call should use cache
      const result2 = await classifyQuery(query);
      expect(result2.cached).toBe(true);
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it('should handle empty/invalid queries', async () => {
      await expect(classifyQuery('')).rejects.toThrow('Query cannot be empty');
      await expect(classifyQuery('   ')).rejects.toThrow('Query cannot be empty');
      await expect(classifyQuery(null as any)).rejects.toThrow('Query must be a non-empty string');
    });

    it('should use fallback weights on GPT error', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('API Error'));

      const result = await classifyQuery('Test query', { fallbackWeights: true });

      expect(result).toMatchObject({
        type: 'operational',
        confidence: 0.0,
        weights: DEFAULT_WEIGHTS
      });
      expect(result.reasoning).toBe(
        'Fallback classification due to error: Classification provider error: API Error'
      );
    });

    it('should surface invalid JSON responses in fallback reasoning', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('Invalid JSON response'));

      const result = await classifyQuery('Test query', { fallbackWeights: true });

      expect(result.reasoning).toBe(
        'Fallback classification due to error: Invalid JSON response from classification provider'
      );
    });

    it('should throw QueryClassificationError when fallback is disabled', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('Invalid JSON response'));

      await expect(
        classifyQuery('Test query', { fallbackWeights: false })
      ).rejects.toThrow(QueryClassificationError);
    });

    it('should respect timeout option', async () => {
      mockGenerateObject.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const start = Date.now();
      await expect(
        classifyQuery('Test query', { timeout: 100, fallbackWeights: true })
      ).resolves.toMatchObject({
        type: 'operational',
        weights: DEFAULT_WEIGHTS
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500); // Should fail fast and use fallback
    });

    it('should disable cache when useCache is false', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          type: 'technical',
          confidence: 0.9,
          reasoning: 'Test reasoning'
        }
      } as any);

      const query = 'Test caching';

      // First call with cache disabled
      await classifyQuery(query, { useCache: false });

      // Second call should not use cache
      await classifyQuery(query, { useCache: false });

      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    });
  });

  describe('classifyQueries', () => {
    it('should classify multiple queries', async () => {
      mockGenerateObject
        .mockResolvedValueOnce({
          object: { type: 'technical', confidence: 0.9, reasoning: 'Code question' }
        } as any)
        .mockResolvedValueOnce({
          object: { type: 'business', confidence: 0.8, reasoning: 'Feature question' }
        } as any);

      const queries = [
        'How to implement authentication?',
        'What are the main product features?'
      ];

      const results = await classifyQueries(queries);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('technical');
      expect(results[1].type).toBe('business');
    });

    it('should handle mixed success/failure scenarios', async () => {
      mockGenerateObject
        .mockResolvedValueOnce({
          object: { type: 'technical', confidence: 0.9, reasoning: 'Code question' }
        } as any)
        .mockRejectedValueOnce(new Error('API Error'));

      const queries = ['Valid query', 'Another query'];

      const results = await classifyQueries(queries, { fallbackWeights: true });

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('technical');
      expect(results[1].type).toBe('operational'); // Fallback
    });
  });

  describe('classifyQueryWithMetrics', () => {
    it('should return classification with metrics', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          type: 'technical',
          confidence: 0.9,
          reasoning: 'Code implementation question'
        }
      } as any);

      const { classification, metrics } = await classifyQueryWithMetrics('Test query');

      expect(classification.type).toBe('technical');
      expect(metrics).toMatchObject({
        responseTime: expect.any(Number),
        cacheHit: false,
        confidence: 0.9,
        source: 'openai'
      });
      expect(metrics.responseTime).toBeGreaterThan(0);
    });

    it('should track cache hits in metrics', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { type: 'business', confidence: 0.8, reasoning: 'Test' }
      } as any);

      const query = 'Test cache metrics';

      // First call
      const { metrics: metrics1 } = await classifyQueryWithMetrics(query);
      expect(metrics1.cacheHit).toBe(false);
      expect(metrics1.source).toBe('openai');

      // Second call (cached)
      const { metrics: metrics2 } = await classifyQueryWithMetrics(query);
      expect(metrics2.cacheHit).toBe(true);
      expect(metrics2.source).toBe('cache');
    });

    it('should handle errors gracefully with fallback metrics', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('API Error'));

      const { classification, metrics } = await classifyQueryWithMetrics('Test query');

      expect(classification.type).toBe('operational');
      expect(classification.confidence).toBe(0.0);
      expect(classification.reasoning).toBe(
        'Fallback due to error: Classification provider error: API Error'
      );
      expect(metrics.source).toBe('fallback');
      expect(metrics.cacheHit).toBe(false);
    });
  });

  describe('validateClassification', () => {
    it('should validate correct classifications', () => {
      const validClassification: QueryClassification = {
        query: 'Test query',
        type: 'technical',
        confidence: 0.8,
        weights: { github: 1.5, web: 0.5 },
        reasoning: 'Test reasoning'
      };

      expect(validateClassification(validClassification)).toBe(true);
    });

    it('should reject invalid classifications', () => {
      const invalidCases = [
        { ...{} as QueryClassification }, // Empty object
        { query: '', type: 'technical', confidence: 0.8, weights: { github: 1, web: 1 } },
        { query: 'Test', type: 'invalid', confidence: 0.8, weights: { github: 1, web: 1 } },
        { query: 'Test', type: 'technical', confidence: -1, weights: { github: 1, web: 1 } },
        { query: 'Test', type: 'technical', confidence: 2, weights: { github: 1, web: 1 } },
        { query: 'Test', type: 'technical', confidence: 0.8, weights: { github: 0, web: 1 } },
        { query: 'Test', type: 'technical', confidence: 0.8, weights: { github: 1, web: 0 } }
      ];

      invalidCases.forEach((classification, index) => {
        expect(validateClassification(classification as QueryClassification))
          .toBe(false);
      });
    });

    it('should handle malformed objects safely', () => {
      expect(validateClassification(null as any)).toBe(false);
      expect(validateClassification(undefined as any)).toBe(false);
      expect(validateClassification('string' as any)).toBe(false);
    });
  });

  describe('getClassificationMetrics', () => {
    it('should return cache metrics', () => {
      const metrics = getClassificationMetrics();

      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('clearCache');
      expect(typeof metrics.cacheSize).toBe('number');
      expect(typeof metrics.clearCache).toBe('function');
    });

    it('should clear cache successfully', async () => {
      // Add item to cache
      mockGenerateObject.mockResolvedValueOnce({
        object: { type: 'technical', confidence: 0.9, reasoning: 'Test' }
      } as any);

      await classifyQuery('Test query for cache');

      const { clearCache } = getClassificationMetrics();
      await clearCache();

      // Verify cache is cleared by making same query again
      await classifyQuery('Test query for cache');
      expect(mockGenerateObject).toHaveBeenCalledTimes(2); // Should call API again
    });
  });

  describe('Source Weight Configurations', () => {
    it('should have correct weight ratios', () => {
      expect(SOURCE_WEIGHT_CONFIGS.technical).toEqual({ github: 1.5, web: 0.5 });
      expect(SOURCE_WEIGHT_CONFIGS.business).toEqual({ github: 0.5, web: 1.5 });
      expect(SOURCE_WEIGHT_CONFIGS.operational).toEqual({ github: 1.0, web: 1.0 });
    });

    it('should use default weights as fallback', () => {
      expect(DEFAULT_WEIGHTS).toEqual({ github: 1.0, web: 1.0 });
    });
  });
});