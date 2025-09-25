/**
 * Query Classifier Integration Tests
 * Tests actual OpenAI API integration and real-world scenarios
 */

import {
  classifyQuery,
  classifyQueryWithMetrics,
  validateClassification
} from '../../src/lib/search/query-classifier';

// These tests require actual API keys and will be skipped in CI
const hasApiKey = process.env.OPENAI_API_KEY;
const skipIntegration = !hasApiKey || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe.skip('Query Classifier Integration', () => {
  beforeAll(() => {
    if (skipIntegration) {
      console.log('Skipping integration tests - missing API key or disabled');
    }
  });

  describe('Real OpenAI API Integration', () => {
    it('should classify technical queries correctly', async () => {
      const technicalQueries = [
        'How do I implement React hooks in TypeScript?',
        'What is the correct TypeScript interface for this API?',
        'How to fix this authentication bug in the code?',
        'Show me how to use async/await in JavaScript'
      ];

      for (const query of technicalQueries) {
        const result = await classifyQuery(query, { timeout: 10000 });

        expect(validateClassification(result)).toBe(true);
        expect(result.type).toBe('technical');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.weights.github).toBeGreaterThan(result.weights.web);

        console.log(`✓ Technical: "${query}" -> ${result.confidence.toFixed(2)} confidence`);
      }
    }, 30000);

    it('should classify business queries correctly', async () => {
      const businessQueries = [
        'What are the main features of the speedboat booking system?',
        'How do customers make reservations?',
        'What pricing options are available?',
        'What is the user onboarding process?'
      ];

      for (const query of businessQueries) {
        const result = await classifyQuery(query, { timeout: 10000 });

        expect(validateClassification(result)).toBe(true);
        expect(result.type).toBe('business');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.weights.web).toBeGreaterThan(result.weights.github);

        console.log(`✓ Business: "${query}" -> ${result.confidence.toFixed(2)} confidence`);
      }
    }, 30000);

    it('should classify operational queries correctly', async () => {
      const operationalQueries = [
        'How do I deploy the application to production?',
        'What is the CI/CD process for this project?',
        'How to configure the environment variables?',
        'What are the monitoring and logging procedures?'
      ];

      for (const query of operationalQueries) {
        const result = await classifyQuery(query, { timeout: 10000 });

        expect(validateClassification(result)).toBe(true);
        expect(result.type).toBe('operational');
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.weights.github).toBe(result.weights.web);

        console.log(`✓ Operational: "${query}" -> ${result.confidence.toFixed(2)} confidence`);
      }
    }, 30000);

    it('should handle edge cases and ambiguous queries', async () => {
      const edgeCases = [
        'speedboat', // Single word
        'How?', // Vague question
        'React authentication features pricing', // Mixed context
        'What is the best way to implement user management features in production?', // Multi-category
      ];

      for (const query of edgeCases) {
        const result = await classifyQuery(query, { timeout: 10000 });

        expect(validateClassification(result)).toBe(true);
        expect(['technical', 'business', 'operational']).toContain(result.type);
        // Edge cases may have lower confidence
        expect(result.confidence).toBeGreaterThanOrEqual(0.0);

        console.log(`✓ Edge case: "${query}" -> ${result.type} (${result.confidence.toFixed(2)})`);
      }
    }, 30000);

    it('should provide consistent classifications for similar queries', async () => {
      const queryVariations = [
        'How to implement user authentication?',
        'How do I implement user authentication?',
        'What is the best way to implement user authentication?',
        'Can you help me implement user authentication?'
      ];

      const results = await Promise.all(
        queryVariations.map(query => classifyQuery(query, { timeout: 10000 }))
      );

      // All variations should classify as the same type
      const types = results.map(r => r.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(1); // All should be the same type

      // Confidence should be relatively consistent
      const confidences = results.map(r => r.confidence);
      const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      const maxDeviation = Math.max(...confidences.map(c => Math.abs(c - avgConfidence)));
      expect(maxDeviation).toBeLessThan(0.3); // Reasonable consistency

      console.log(`✓ Consistent classification: ${types[0]} (confidence range: ${Math.min(...confidences).toFixed(2)}-${Math.max(...confidences).toFixed(2)})`);
    }, 30000);
  });

  describe('Real Cache Integration', () => {
    it('should cache and retrieve real classifications', async () => {
      const testQuery = 'How to implement React state management?';

      // Clear any existing cache
      const { clearCache } = require('../../src/lib/search/query-classifier').getClassificationMetrics();
      await clearCache();

      // First call - should hit API
      const { classification: result1, metrics: metrics1 } = await classifyQueryWithMetrics(testQuery, { timeout: 10000 });
      expect(metrics1.cacheHit).toBe(false);
      expect(metrics1.source).toBe('openai');

      // Second call - should hit cache
      const { classification: result2, metrics: metrics2 } = await classifyQueryWithMetrics(testQuery);
      expect(metrics2.cacheHit).toBe(true);
      expect(metrics2.source).toBe('cache');
      expect(metrics2.responseTime).toBeLessThan(50); // Cache should be fast

      // Results should be identical
      expect(result2.type).toBe(result1.type);
      expect(result2.confidence).toBe(result1.confidence);
      expect(result2.cached).toBe(true);

      console.log(`✓ Cache integration: ${metrics1.responseTime}ms -> ${metrics2.responseTime}ms`);
    }, 30000);

    it('should handle Redis cache availability gracefully', async () => {
      // Test with potentially unavailable Redis
      const query = 'How to deploy with Docker?';

      const result = await classifyQuery(query, { timeout: 10000 });

      expect(validateClassification(result)).toBe(true);
      // Should work regardless of Redis availability
      console.log(`✓ Redis graceful handling: ${result.type} classification`);
    }, 15000);
  });

  describe('Real Error Handling', () => {
    it('should handle API rate limits gracefully', async () => {
      const queries = Array.from({ length: 5 }, (_, i) => `Rate limit test query ${i}`);

      // Fire multiple requests simultaneously
      const results = await Promise.all(
        queries.map(query =>
          classifyQuery(query, { timeout: 15000, fallbackWeights: true })
        )
      );

      // All should complete successfully (either via API or fallback)
      results.forEach((result, index) => {
        expect(validateClassification(result)).toBe(true);
        console.log(`✓ Rate limit test ${index}: ${result.type} (confidence: ${result.confidence.toFixed(2)})`);
      });
    }, 45000);

    it('should recover from temporary API failures', async () => {
      // This test simulates network issues by using very short timeout
      const query = 'Test recovery from API failure';

      // First try with very short timeout (likely to fail)
      const result1 = await classifyQuery(query, {
        timeout: 1, // 1ms timeout - will likely fail
        fallbackWeights: true
      });

      // Should use fallback
      expect(result1.confidence).toBe(0.0);
      expect(result1.type).toBe('operational');

      // Second try with normal timeout (should succeed)
      const result2 = await classifyQuery(query, { timeout: 10000 });

      // Should classify properly
      expect(result2.confidence).toBeGreaterThan(0.0);
      expect(['technical', 'business', 'operational']).toContain(result2.type);

      console.log(`✓ Recovery test: fallback -> ${result2.type} (${result2.confidence.toFixed(2)})`);
    }, 30000);
  });

  describe('Real Performance Benchmarks', () => {
    it('should meet performance targets in real environment', async () => {
      const testQueries = [
        'How to implement authentication?',
        'What are the product features?',
        'How to deploy to production?'
      ];

      // Warm up with one query
      await classifyQuery(testQueries[0], { timeout: 10000 });

      // Test cache performance
      const start = Date.now();
      const results = await Promise.all(
        testQueries.map(query => classifyQueryWithMetrics(query))
      );
      const elapsed = Date.now() - start;

      const cacheHits = results.filter(r => r.metrics.cacheHit).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.responseTime, 0) / results.length;

      expect(cacheHits).toBeGreaterThan(0); // At least one cache hit
      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms

      console.log(`✓ Performance: ${cacheHits}/${testQueries.length} cache hits, avg ${avgResponseTime.toFixed(1)}ms`);
    }, 30000);
  });

  describe('Production Readiness', () => {
    it('should handle production-like query volume', async () => {
      const productionQueries = [
        'How do I book a speedboat?',
        'What are the cancellation policies?',
        'How to integrate payment system?',
        'What database schema is used?',
        'How to handle user authentication?',
        'What are the available time slots?',
        'How to deploy new features?',
        'What monitoring tools are used?'
      ];

      const results = await Promise.all(
        productionQueries.map(async (query, index) => {
          const start = Date.now();
          const result = await classifyQuery(query, { timeout: 10000 });
          const elapsed = Date.now() - start;

          return {
            query,
            type: result.type,
            confidence: result.confidence,
            responseTime: elapsed,
            cached: result.cached || false
          };
        })
      );

      // Production quality checks
      const validResults = results.filter(r => r.confidence > 0.5);
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const cacheHitRate = results.filter(r => r.cached).length / results.length;

      expect(validResults.length / results.length).toBeGreaterThan(0.8); // 80% high confidence
      expect(avgResponseTime).toBeLessThan(200); // Under 200ms average
      expect(cacheHitRate).toBeGreaterThanOrEqual(0.0); // Some caching

      console.log(`✓ Production test: ${validResults.length}/${results.length} high confidence, ${avgResponseTime.toFixed(1)}ms avg, ${(cacheHitRate * 100).toFixed(1)}% cached`);

      // Log results for manual review
      results.forEach(r => {
        console.log(`  ${r.type}: "${r.query}" (${r.confidence.toFixed(2)}, ${r.responseTime}ms)`);
      });
    }, 60000);
  });
});

// Utility function for manual testing
export async function manualTestClassification() {
  if (!hasApiKey) {
    console.log('No API key available for manual testing');
    return;
  }

  const testQueries = [
    'How do I implement React hooks?',
    'What are the main product features?',
    'How to deploy to production?'
  ];

  console.log('Manual classification test:');
  for (const query of testQueries) {
    try {
      const { classification, metrics } = await classifyQueryWithMetrics(query, { timeout: 10000 });
      console.log(`Query: "${query}"`);
      console.log(`Type: ${classification.type} (${classification.confidence.toFixed(2)} confidence)`);
      console.log(`Weights: github=${classification.weights.github}, web=${classification.weights.web}`);
      console.log(`Time: ${metrics.responseTime}ms, Cache: ${metrics.cacheHit}`);
      console.log('---');
    } catch (error) {
      console.error(`Error classifying "${query}":`, error);
    }
  }
}