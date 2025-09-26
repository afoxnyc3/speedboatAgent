/**
 * Enhanced Authority Weighting System
 * Combines query-type weighting with source authority levels
 */

import type { QueryType, SourceWeights } from '../../types/query-classification';
import type { SourceAuthority } from '../../types/source-attribution';
import { SOURCE_WEIGHT_CONFIGS } from '../../types/query-classification';
import { AUTHORITY_WEIGHTS } from '../../types/source-attribution';

export interface EnhancedSourceWeights extends SourceWeights {
  readonly authority?: Record<SourceAuthority, number>;
}

export interface WeightingContext {
  readonly queryType: QueryType;
  readonly sourceType: 'github' | 'web';
  readonly authority?: SourceAuthority;
  readonly contentType?: 'code' | 'documentation' | 'general';
}

/**
 * Calculate enhanced weight combining query type, source type, and authority level
 */
export function calculateEnhancedWeight(context: WeightingContext): number {
  // Base weight from query classification
  const baseWeight = SOURCE_WEIGHT_CONFIGS[context.queryType][context.sourceType];

  // Authority multiplier (defaults to 1.0 if no authority specified)
  const authorityMultiplier = context.authority
    ? AUTHORITY_WEIGHTS[context.authority]
    : 1.0;

  // Content type bonus for technical queries
  const contentBonus = getContentTypeBonus(context);

  return baseWeight * authorityMultiplier * contentBonus;
}

/**
 * Apply content type bonuses for better relevance
 */
function getContentTypeBonus(context: WeightingContext): number {
  if (context.queryType === 'technical' && context.sourceType === 'github') {
    switch (context.contentType) {
      case 'code': return 1.1; // 10% bonus for code in technical queries
      case 'documentation': return 1.05; // 5% bonus for docs
      default: return 1.0;
    }
  }

  if (context.queryType === 'business' && context.contentType === 'documentation') {
    return 1.1; // 10% bonus for documentation in business queries
  }

  return 1.0;
}

/**
 * Generate enhanced source weights for search
 */
export function generateEnhancedSourceWeights(
  queryType: QueryType,
  authorities?: Partial<Record<'github' | 'web', SourceAuthority>>
): EnhancedSourceWeights {
  const baseWeights = SOURCE_WEIGHT_CONFIGS[queryType];

  // Calculate enhanced weights
  const githubWeight = calculateEnhancedWeight({
    queryType,
    sourceType: 'github',
    authority: authorities?.github
  });

  const webWeight = calculateEnhancedWeight({
    queryType,
    sourceType: 'web',
    authority: authorities?.web
  });

  return {
    github: githubWeight,
    web: webWeight,
    authority: authorities ? {
      primary: AUTHORITY_WEIGHTS.primary,
      authoritative: AUTHORITY_WEIGHTS.authoritative,
      supplementary: AUTHORITY_WEIGHTS.supplementary,
      community: AUTHORITY_WEIGHTS.community
    } : undefined
  };
}

/**
 * Apply authority-aware weighting to search results
 */
export function applyAuthorityWeighting(
  baseScore: number,
  context: WeightingContext
): number {
  const enhancedWeight = calculateEnhancedWeight(context);
  return Math.min(baseScore * enhancedWeight, 1.0);
}

/**
 * Smart weighting for mixed-authority results
 */
export function calculateMixedAuthorityWeights(
  queryType: QueryType,
  sourcesInfo: Array<{ source: 'github' | 'web'; authority: SourceAuthority }>
): SourceWeights {
  // Group by source type
  const githubSources = sourcesInfo.filter(s => s.source === 'github');
  const webSources = sourcesInfo.filter(s => s.source === 'web');

  // Calculate average authority weight for each source type
  const avgGithubAuthority = githubSources.length > 0
    ? githubSources.reduce((sum, s) => sum + AUTHORITY_WEIGHTS[s.authority], 0) / githubSources.length
    : 1.0;

  const avgWebAuthority = webSources.length > 0
    ? webSources.reduce((sum, s) => sum + AUTHORITY_WEIGHTS[s.authority], 0) / webSources.length
    : 1.0;

  // Apply to base weights
  const baseWeights = SOURCE_WEIGHT_CONFIGS[queryType];

  return {
    github: baseWeights.github * avgGithubAuthority,
    web: baseWeights.web * avgWebAuthority
  };
}

/**
 * Get authority recommendation for source type and query
 */
export function getAuthorityRecommendation(
  queryType: QueryType,
  sourceType: 'github' | 'web',
  contentType?: 'code' | 'documentation' | 'general'
): SourceAuthority {
  // Technical queries prefer primary sources for code
  if (queryType === 'technical') {
    if (sourceType === 'github') {
      return contentType === 'code' ? 'primary' : 'authoritative';
    }
    return 'supplementary'; // Web sources less authoritative for technical
  }

  // Business queries prefer authoritative documentation
  if (queryType === 'business') {
    if (sourceType === 'web' && contentType === 'documentation') {
      return 'authoritative';
    }
    return sourceType === 'web' ? 'authoritative' : 'supplementary';
  }

  // Operational queries are balanced
  return 'authoritative';
}

/**
 * Debug utilities for weight calculation transparency
 */
export function explainWeightCalculation(context: WeightingContext): {
  baseWeight: number;
  authorityMultiplier: number;
  contentBonus: number;
  finalWeight: number;
  explanation: string;
} {
  const baseWeight = SOURCE_WEIGHT_CONFIGS[context.queryType][context.sourceType];
  const authorityMultiplier = context.authority ? AUTHORITY_WEIGHTS[context.authority] : 1.0;
  const contentBonus = getContentTypeBonus(context);
  const finalWeight = baseWeight * authorityMultiplier * contentBonus;

  const explanation = [
    `Query type: ${context.queryType} → Base weight: ${baseWeight}`,
    context.authority ? `Authority: ${context.authority} → Multiplier: ${authorityMultiplier}` : 'No authority specified',
    contentBonus !== 1.0 ? `Content bonus: ${contentBonus}` : 'No content bonus',
    `Final weight: ${finalWeight.toFixed(3)}`
  ].filter(Boolean).join(' | ');

  return {
    baseWeight,
    authorityMultiplier,
    contentBonus,
    finalWeight,
    explanation
  };
}