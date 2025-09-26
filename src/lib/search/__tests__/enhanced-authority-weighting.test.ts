/**
 * Enhanced Authority Weighting System Tests
 * Validates combined query-type and authority-level weighting
 */

import {
  calculateEnhancedWeight,
  generateEnhancedSourceWeights,
  applyAuthorityWeighting,
  calculateMixedAuthorityWeights,
  getAuthorityRecommendation,
  explainWeightCalculation,
  type WeightingContext
} from '../enhanced-authority-weighting';

import { SOURCE_WEIGHT_CONFIGS } from '../../../types/query-classification';
import { AUTHORITY_WEIGHTS } from '../../../types/source-attribution';

describe('Enhanced Authority Weighting System', () => {
  describe('calculateEnhancedWeight', () => {
    it('should calculate base weight for technical query with GitHub source', () => {
      const context: WeightingContext = {
        queryType: 'technical',
        sourceType: 'github'
      };

      const weight = calculateEnhancedWeight(context);
      expect(weight).toBe(1.5); // Base weight from SOURCE_WEIGHT_CONFIGS
    });

    it('should apply authority multiplier correctly', () => {
      const context: WeightingContext = {
        queryType: 'technical',
        sourceType: 'github',
        authority: 'primary'
      };

      const weight = calculateEnhancedWeight(context);
      expect(weight).toBe(1.5 * 1.5); // Base weight * primary authority weight
    });

    it('should apply content type bonus for code in technical queries', () => {
      const context: WeightingContext = {
        queryType: 'technical',
        sourceType: 'github',
        authority: 'primary',
        contentType: 'code'
      };

      const weight = calculateEnhancedWeight(context);
      expect(weight).toBe(1.5 * 1.5 * 1.1); // Base * authority * code bonus
    });

    it('should handle business queries with web sources', () => {
      const context: WeightingContext = {
        queryType: 'business',
        sourceType: 'web',
        authority: 'authoritative'
      };

      const weight = calculateEnhancedWeight(context);
      expect(weight).toBe(1.5 * 1.2); // Business web weight * authoritative
    });
  });

  describe('generateEnhancedSourceWeights', () => {
    it('should generate enhanced weights with authority multipliers', () => {
      const weights = generateEnhancedSourceWeights('technical', {
        github: 'primary',
        web: 'supplementary'
      });

      expect(weights.github).toBe(1.5 * 1.5); // technical github * primary
      expect(weights.web).toBe(0.5 * 0.8); // technical web * supplementary
      expect(weights.authority).toBeDefined();
    });

    it('should fall back to base weights without authorities', () => {
      const weights = generateEnhancedSourceWeights('operational');

      expect(weights.github).toBe(1.0);
      expect(weights.web).toBe(1.0);
      expect(weights.authority).toBeUndefined();
    });
  });

  describe('applyAuthorityWeighting', () => {
    it('should apply weighting to base score', () => {
      const context: WeightingContext = {
        queryType: 'technical',
        sourceType: 'github',
        authority: 'primary'
      };

      const weightedScore = applyAuthorityWeighting(0.8, context);
      expect(weightedScore).toBe(Math.min(0.8 * 1.5 * 1.5, 1.0));
    });

    it('should cap weighted score at 1.0', () => {
      const context: WeightingContext = {
        queryType: 'technical',
        sourceType: 'github',
        authority: 'primary',
        contentType: 'code'
      };

      const weightedScore = applyAuthorityWeighting(0.9, context);
      expect(weightedScore).toBe(1.0); // Capped at maximum
    });
  });

  describe('calculateMixedAuthorityWeights', () => {
    it('should calculate average authority weights for mixed sources', () => {
      const sourcesInfo = [
        { source: 'github' as const, authority: 'primary' as const },
        { source: 'github' as const, authority: 'authoritative' as const },
        { source: 'web' as const, authority: 'supplementary' as const }
      ];

      const weights = calculateMixedAuthorityWeights('technical', sourcesInfo);

      const expectedGithubAvg = (1.5 + 1.2) / 2; // primary + authoritative / 2
      const expectedWebAvg = 0.8; // only supplementary

      expect(weights.github).toBe(1.5 * expectedGithubAvg);
      expect(weights.web).toBe(0.5 * expectedWebAvg);
    });
  });

  describe('getAuthorityRecommendation', () => {
    it('should recommend primary for technical code queries', () => {
      const recommendation = getAuthorityRecommendation('technical', 'github', 'code');
      expect(recommendation).toBe('primary');
    });

    it('should recommend authoritative for business web docs', () => {
      const recommendation = getAuthorityRecommendation('business', 'web', 'documentation');
      expect(recommendation).toBe('authoritative');
    });

    it('should recommend authoritative for operational queries', () => {
      const recommendation = getAuthorityRecommendation('operational', 'github');
      expect(recommendation).toBe('authoritative');
    });
  });

  describe('explainWeightCalculation', () => {
    it('should provide detailed weight calculation explanation', () => {
      const context: WeightingContext = {
        queryType: 'technical',
        sourceType: 'github',
        authority: 'primary',
        contentType: 'code'
      };

      const explanation = explainWeightCalculation(context);

      expect(explanation.baseWeight).toBe(1.5);
      expect(explanation.authorityMultiplier).toBe(1.5);
      expect(explanation.contentBonus).toBe(1.1);
      expect(explanation.finalWeight).toBe(1.5 * 1.5 * 1.1);
      expect(explanation.explanation).toContain('Query type: technical');
      expect(explanation.explanation).toContain('Authority: primary');
      expect(explanation.explanation).toContain('Content bonus: 1.1');
    });
  });

  describe('Integration with existing weight configs', () => {
    it('should preserve existing weight ratios', () => {
      const technicalWeights = generateEnhancedSourceWeights('technical');
      const businessWeights = generateEnhancedSourceWeights('business');

      // Technical should still favor GitHub
      expect(technicalWeights.github).toBeGreaterThan(technicalWeights.web);

      // Business should still favor Web
      expect(businessWeights.web).toBeGreaterThan(businessWeights.github);
    });

    it('should enhance but not override base weighting strategy', () => {
      const baseConfig = SOURCE_WEIGHT_CONFIGS.technical;
      const enhanced = generateEnhancedSourceWeights('technical', {
        github: 'primary',
        web: 'primary'
      });

      // Enhanced weights should maintain the same ratio
      const baseRatio = baseConfig.github / baseConfig.web;
      const enhancedRatio = enhanced.github / enhanced.web;

      expect(enhancedRatio).toBeCloseTo(baseRatio, 1);
    });
  });

  describe('Authority validation tests', () => {
    it('should pass all validation test cases', () => {
      // Test 1: Basic technical query with GitHub
      const test1Result = calculateEnhancedWeight({
        queryType: 'technical',
        sourceType: 'github'
      });
      expect(test1Result).toBe(1.5);

      // Test 2: Technical query with primary authority
      const test2Result = calculateEnhancedWeight({
        queryType: 'technical',
        sourceType: 'github',
        authority: 'primary'
      });
      expect(test2Result).toBeCloseTo(2.25, 3); // 1.5 * 1.5

      // Test 3: Business query with web source
      const test3Result = calculateEnhancedWeight({
        queryType: 'business',
        sourceType: 'web',
        authority: 'authoritative'
      });
      expect(test3Result).toBeCloseTo(1.8, 3); // 1.5 * 1.2

      // Test 4: Code content bonus
      const test4Result = calculateEnhancedWeight({
        queryType: 'technical',
        sourceType: 'github',
        authority: 'primary',
        contentType: 'code'
      });
      expect(test4Result).toBeCloseTo(2.475, 3); // 1.5 * 1.5 * 1.1

      // Test 5: Enhanced source weights generation
      const test5Result = generateEnhancedSourceWeights('technical', {
        github: 'primary',
        web: 'supplementary'
      });
      expect(test5Result.github).toBeCloseTo(2.25, 3);
      expect(test5Result.web).toBeCloseTo(0.4, 3); // 0.5 * 0.8
    });
  });

  describe('Performance considerations', () => {
    it('should handle large numbers of weight calculations efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        calculateEnhancedWeight({
          queryType: 'technical',
          sourceType: 'github',
          authority: 'primary',
          contentType: 'code'
        });
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});