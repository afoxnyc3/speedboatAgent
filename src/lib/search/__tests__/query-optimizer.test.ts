/**
 * Query Optimizer Unit Tests
 * TDD approach for confidence scoring and intelligent routing
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type {
  QueryOptimizationResult,
  ConfidenceScore,
  ComplexityAnalysis,
  RoutingDecision,
  TokenOptimizationConfig,
} from '../../../types/query-optimization';
import type { QueryClassification } from '../../../types/query-classification';
import {
  analyzeQueryComplexity,
  calculateConfidenceScore,
  optimizeTokenUsage,
  determineRoutingStrategy,
  optimizeQuery,
  getOptimizationMetrics,
  clearOptimizationCache,
} from '../query-optimizer';

// Mock the query classifier
jest.mock('../query-classifier', () => ({
  classifyQueryWithMetrics: jest.fn(async (query: string) => ({
    classification: {
      query,
      type: query.includes('API') || query.includes('implement') ? 'technical' : 'business',
      confidence: 0.85,
      weights: { github: 1.5, web: 0.5 },
      reasoning: 'Mock classification',
      cached: false,
    },
    metrics: {
      responseTime: 100,
      cacheHit: false,
      source: 'openai' as const,
      confidence: 0.85,
    },
  })),
}));

describe('Query Optimizer', () => {
  beforeEach(() => {
    clearOptimizationCache();
  });

  afterEach(() => {
    clearOptimizationCache();
  });

  describe('Complexity Analysis', () => {
    it('should classify simple single-concept queries correctly', () => {
      const classification: QueryClassification = {
        query: 'What is Redis?',
        type: 'technical',
        confidence: 0.9,
        weights: { github: 1.5, web: 0.5 },
      };

      const result = analyzeQueryComplexity('What is Redis?', classification);

      expect(result.complexity).toBe('simple');
      expect(result.conceptCount).toBe(1);
      expect(result.estimatedTokens).toBeLessThan(500);
    });

    it('should classify complex multi-part queries correctly', () => {
      const classification: QueryClassification = {
        query: 'How do I implement rate limiting with Redis and integrate it with Next.js middleware?',
        type: 'technical',
        confidence: 0.8,
        weights: { github: 1.5, web: 0.5 },
      };

      const result = analyzeQueryComplexity(
        'How do I implement rate limiting with Redis and integrate it with Next.js middleware?',
        classification
      );

      expect(result.complexity).toBe('complex');
      expect(result.conceptCount).toBeGreaterThan(2);
      expect(result.estimatedTokens).toBeGreaterThan(1000);
    });

    it('should detect ambiguous queries', () => {
      const classification: QueryClassification = {
        query: 'it',
        type: 'operational',
        confidence: 0.5,
        weights: { github: 1.0, web: 1.0 },
      };

      const result = analyzeQueryComplexity('it', classification);

      expect(result.complexity).toBe('ambiguous');
      expect(result.reasoning).toContain('Vague');
    });

    it('should detect technical depth in queries', () => {
      const classification: QueryClassification = {
        query: 'Explain the API architecture and database pipeline implementation system',
        type: 'technical',
        confidence: 0.85,
        weights: { github: 1.5, web: 0.5 },
      };

      const result = analyzeQueryComplexity(
        'Explain the API architecture and database pipeline implementation system',
        classification
      );

      expect(result.technicalDepth).toBeGreaterThan(0.5);
      expect(result.estimatedTokens).toBeGreaterThan(1000);
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate high confidence for clear, specific queries', () => {
      const classification: QueryClassification = {
        query: 'What is the API endpoint for user authentication?',
        type: 'technical',
        confidence: 0.9,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const result = calculateConfidenceScore(classification.query, classification, complexity);

      expect(result.overall).toBeGreaterThan(0.7);
      expect(result.queryClarity).toBeGreaterThan(0.6);
      expect(result.sourceCoverage).toBeGreaterThan(0.8);
    });

    it('should penalize ambiguous queries', () => {
      const classification: QueryClassification = {
        query: 'it',
        type: 'operational',
        confidence: 0.5,
        weights: { github: 1.0, web: 1.0 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const result = calculateConfidenceScore(classification.query, classification, complexity);

      expect(result.overall).toBeLessThan(0.5);
      expect(result.reasoning).toContain('clarity');
    });

    it('should incorporate historical performance', () => {
      const classification: QueryClassification = {
        query: 'How to implement caching?',
        type: 'technical',
        confidence: 0.8,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const historical = {
        similarQueryCount: 10,
        avgSuccessRate: 0.95,
        avgConfidence: 0.9,
        avgTokens: 1000,
        userSatisfaction: 0.9,
      };

      const result = calculateConfidenceScore(classification.query, classification, complexity, historical);

      expect(result.historicalSuccess).toBe(0.95);
      expect(result.overall).toBeGreaterThan(0.8);
    });
  });

  describe('Token Optimization', () => {
    it('should optimize for simple queries with minimal tokens', () => {
      const classification: QueryClassification = {
        query: 'What is Redis?',
        type: 'technical',
        confidence: 0.9,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const confidence = calculateConfidenceScore(classification.query, classification, complexity);
      const result = optimizeTokenUsage(complexity, confidence, classification);

      expect(result.maxTokens).toBeLessThanOrEqual(500);
      expect(result.optimalSources).toBeLessThanOrEqual(3);
      expect(result.contextStrategy).toBe('minimal');
      expect(result.promptTemplate).toBe('concise');
    });

    it('should allocate more tokens for complex queries', () => {
      const classification: QueryClassification = {
        query: 'Explain the entire RAG pipeline architecture with all integrations',
        type: 'technical',
        confidence: 0.8,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const confidence = calculateConfidenceScore(classification.query, classification, complexity);
      const result = optimizeTokenUsage(complexity, confidence, classification);

      expect(result.maxTokens).toBeGreaterThan(1000);
      expect(result.optimalSources).toBeGreaterThanOrEqual(4);
      expect(result.contextStrategy).toBe('comprehensive');
      expect(result.promptTemplate).toBe('detailed');
    });

    it('should calculate token savings', () => {
      const classification: QueryClassification = {
        query: 'What is caching?',
        type: 'technical',
        confidence: 0.9,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const confidence = calculateConfidenceScore(classification.query, classification, complexity);
      const result = optimizeTokenUsage(complexity, confidence, classification);

      expect(result.estimatedSavings).toBeGreaterThan(0);
    });
  });

  describe('Routing Strategy', () => {
    it('should route simple high-confidence queries to cached strategy', () => {
      const classification: QueryClassification = {
        query: 'What is Redis?',
        type: 'technical',
        confidence: 0.9,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const confidence = calculateConfidenceScore(classification.query, classification, complexity);
      const tokens = optimizeTokenUsage(complexity, confidence, classification);
      const result = determineRoutingStrategy(complexity, confidence, classification, tokens);

      expect(result.strategy).toBe('cached');
      expect(result.skipMemory).toBe(true);
      expect(result.minSources).toBeLessThanOrEqual(2);
    });

    it('should route complex queries to full pipeline', () => {
      const classification: QueryClassification = {
        query: 'Explain how to implement distributed caching with Redis cluster and handle failover scenarios',
        type: 'technical',
        confidence: 0.8,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const confidence = calculateConfidenceScore(classification.query, classification, complexity);
      const tokens = optimizeTokenUsage(complexity, confidence, classification);
      const result = determineRoutingStrategy(complexity, confidence, classification, tokens);

      expect(result.strategy).toBe('full');
      expect(result.skipMemory).toBe(false);
      expect(result.useReranking).toBe(true);
      expect(result.minSources).toBeGreaterThanOrEqual(4);
    });

    it('should use fallback strategy for ambiguous queries', () => {
      const classification: QueryClassification = {
        query: 'it',
        type: 'operational',
        confidence: 0.3,
        weights: { github: 1.0, web: 1.0 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const confidence = calculateConfidenceScore(classification.query, classification, complexity);
      const tokens = optimizeTokenUsage(complexity, confidence, classification);
      const result = determineRoutingStrategy(complexity, confidence, classification, tokens);

      expect(result.strategy).toBe('fallback');
      expect(result.sourceWeights.github).toBe(1.0);
      expect(result.sourceWeights.web).toBe(1.0);
    });

    it('should enhance source weights for technical queries', () => {
      const classification: QueryClassification = {
        query: 'How is the search API implemented in the codebase?',
        type: 'technical',
        confidence: 0.85,
        weights: { github: 1.5, web: 0.5 },
      };

      const complexity = analyzeQueryComplexity(classification.query, classification);
      const confidence = calculateConfidenceScore(classification.query, classification, complexity);
      const tokens = optimizeTokenUsage(complexity, confidence, classification);
      const result = determineRoutingStrategy(complexity, confidence, classification, tokens);

      expect(result.sourceWeights.github).toBeGreaterThan(1.5);
      expect(result.sourceWeights.web).toBeLessThan(0.8);
    });
  });

  describe('Full Query Optimization', () => {
    it('should optimize simple queries end-to-end', async () => {
      const result = await optimizeQuery('What is Redis?');

      expect(result.query).toBe('What is Redis?');
      expect(result.classification.type).toBeDefined();
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.complexity.complexity).toBe('simple');
      expect(result.routing.strategy).toBe('cached');
      expect(result.tokenOptimization.estimatedSavings).toBeGreaterThan(0);
    });

    it('should cache optimization results', async () => {
      const query = 'How to implement caching?';

      const result1 = await optimizeQuery(query);
      expect(result1.cached).toBe(false);

      const result2 = await optimizeQuery(query);
      expect(result2.cached).toBe(true);
      expect(result2.query).toBe(query);
    });

    it('should respect optimization options', async () => {
      const result = await optimizeQuery('Complex query', {
        useCache: false,
        includeHistorical: true,
        targetReduction: 0.3,
      });

      expect(result.historical).toBeDefined();
      expect(result.cached).toBe(false);
    });

    it('should track metrics across optimizations', async () => {
      clearOptimizationCache();

      await optimizeQuery('Query 1');
      await optimizeQuery('Query 2');
      await optimizeQuery('Query 1'); // Cache hit

      const metrics = getOptimizationMetrics();

      expect(metrics.totalOptimizations).toBeGreaterThanOrEqual(2);
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
      expect(metrics.avgTokenSavings).toBeGreaterThan(0);
    });

    it('should handle optimization errors gracefully', async () => {
      // This should not throw, even with potential errors
      const result = await optimizeQuery('');

      expect(result).toBeDefined();
      expect(result.routing.strategy).toBeDefined();
    });
  });
});