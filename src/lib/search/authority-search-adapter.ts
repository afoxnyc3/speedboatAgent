/**
 * Authority Search Adapter
 * Integrates enhanced authority weighting with existing search system
 */

import { performHybridSearch, type HybridSearchParams } from './hybrid-search';
import { classifyQuery } from './query-classifier';
import {
  calculateEnhancedWeight,
  generateEnhancedSourceWeights,
  applyAuthorityWeighting,
  type WeightingContext,
  type EnhancedSourceWeights
} from './enhanced-authority-weighting';
import type { Document } from '../../types/search';
import type { SourceAuthority } from '../../types/source-attribution';
import { DEFAULT_SEARCH_CONFIG } from '../../types/search';

export interface AuthoritySearchParams {
  readonly query: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly authorities?: Partial<Record<'github' | 'web', SourceAuthority>>;
  readonly useEnhancedWeighting?: boolean;
  readonly config?: typeof DEFAULT_SEARCH_CONFIG;
}

export interface AuthoritySearchResult {
  readonly documents: Document[];
  readonly totalResults: number;
  readonly searchTime: number;
  readonly classification: {
    type: string;
    confidence: number;
    weights: Record<string, number>;
  };
  readonly authorityWeights?: Record<string, number>;
}

/**
 * Enhanced hybrid search with authority-aware weighting
 */
export async function performAuthoritySearch(
  params: AuthoritySearchParams
): Promise<AuthoritySearchResult> {
  const startTime = Date.now();

  // Classify query to determine base weights
  const classification = await classifyQuery(params.query);

  // Generate enhanced weights if requested
  const sourceWeights = params.useEnhancedWeighting
    ? generateEnhancedSourceWeights(classification.type, params.authorities)
    : classification.weights;

  // Prepare hybrid search parameters
  const hybridParams: HybridSearchParams = {
    query: params.query,
    config: params.config || DEFAULT_SEARCH_CONFIG,
    sourceWeights: {
      github: sourceWeights.github,
      web: sourceWeights.web
    },
    limit: params.limit || 10,
    offset: params.offset || 0
  };

  // Perform hybrid search
  const searchResult = await performHybridSearch(hybridParams);

  // Apply additional authority weighting if enhanced mode is enabled
  let processedDocuments = searchResult.documents;

  if (params.useEnhancedWeighting && params.authorities) {
    processedDocuments = applyAdditionalAuthorityWeighting(
      searchResult.documents,
      classification.type,
      params.authorities
    );
  }

  const totalTime = Date.now() - startTime;

  return {
    documents: processedDocuments,
    totalResults: processedDocuments.length,
    searchTime: totalTime,
    classification: {
      type: classification.type,
      confidence: classification.confidence,
      weights: classification.weights as unknown as Record<string, number>
    },
    authorityWeights: params.useEnhancedWeighting ? (sourceWeights as EnhancedSourceWeights).authority : undefined
  };
}

/**
 * Apply additional authority-based reweighting to search results
 */
function applyAdditionalAuthorityWeighting(
  documents: Document[],
  queryType: string,
  authorities: Partial<Record<'github' | 'web', SourceAuthority>>
): Document[] {
  return documents.map(doc => {
    // Determine authority level for this document
    const sourceAuthority = authorities[doc.source as 'github' | 'web'];

    if (!sourceAuthority) {
      return doc; // No additional weighting
    }

    // Create weighting context
    const context: WeightingContext = {
      queryType: queryType as any,
      sourceType: doc.source as 'github' | 'web',
      authority: sourceAuthority,
      contentType: determineContentType(doc)
    };

    // Apply authority weighting to score
    const enhancedScore = applyAuthorityWeighting(doc.score, context);

    return {
      ...doc,
      score: enhancedScore,
      metadata: {
        ...doc.metadata,
        authorityWeight: sourceAuthority,
        enhancedScore: true
      }
    };
  }).sort((a, b) => b.score - a.score); // Re-sort by enhanced scores
}

/**
 * Determine content type from document properties
 */
function determineContentType(doc: Document): 'code' | 'documentation' | 'general' {
  // Check file extension or metadata
  const filepath = doc.filepath.toLowerCase();

  // Code files
  if (filepath.match(/\.(ts|tsx|js|jsx|py|java|cpp|c|rs|go)$/)) {
    return 'code';
  }

  // Documentation files
  if (filepath.match(/\.(md|mdx|txt|rst|doc)$/)) {
    return 'documentation';
  }

  // Check content patterns
  if (doc.content.includes('function ') || doc.content.includes('class ') || doc.content.includes('import ')) {
    return 'code';
  }

  return 'general';
}

/**
 * Batch search with different authority configurations
 */
export async function performBatchAuthoritySearch(
  queries: string[],
  authorityConfigs: Array<Partial<Record<'github' | 'web', SourceAuthority>>>
): Promise<AuthoritySearchResult[]> {
  const promises = queries.flatMap(query =>
    authorityConfigs.map(authorities =>
      performAuthoritySearch({
        query,
        authorities,
        useEnhancedWeighting: true,
        limit: 5
      })
    )
  );

  return Promise.all(promises);
}

/**
 * Compare search results with and without enhanced weighting
 */
export async function compareWeightingStrategies(
  query: string,
  authorities?: Partial<Record<'github' | 'web', SourceAuthority>>
): Promise<{
  standard: AuthoritySearchResult;
  enhanced: AuthoritySearchResult;
  comparison: {
    scoreDifference: number[];
    rankingChanges: number;
    authorityImpact: string;
  };
}> {
  const [standard, enhanced] = await Promise.all([
    performAuthoritySearch({ query, useEnhancedWeighting: false }),
    performAuthoritySearch({ query, authorities, useEnhancedWeighting: true })
  ]);

  // Calculate comparison metrics
  const scoreDifferences = enhanced.documents.map((doc, i) => {
    const standardDoc = standard.documents[i];
    return standardDoc ? doc.score - standardDoc.score : doc.score;
  });

  const rankingChanges = calculateRankingChanges(standard.documents, enhanced.documents);

  return {
    standard,
    enhanced,
    comparison: {
      scoreDifference: scoreDifferences,
      rankingChanges,
      authorityImpact: summarizeAuthorityImpact(scoreDifferences, rankingChanges)
    }
  };
}

/**
 * Calculate how many documents changed ranking position
 */
function calculateRankingChanges(standard: Document[], enhanced: Document[]): number {
  const standardIds = new Set(standard.map(d => d.id));
  const enhancedIds = new Set(enhanced.map(d => d.id));

  // Count documents that appear in different positions
  let changes = 0;
  for (let i = 0; i < Math.min(standard.length, enhanced.length); i++) {
    if (standard[i]?.id !== enhanced[i]?.id) {
      changes++;
    }
  }

  return changes;
}

/**
 * Summarize the impact of authority weighting
 */
function summarizeAuthorityImpact(scoreDiffs: number[], rankingChanges: number): string {
  const avgScoreChange = scoreDiffs.reduce((sum, diff) => sum + Math.abs(diff), 0) / scoreDiffs.length;

  if (avgScoreChange < 0.01 && rankingChanges === 0) {
    return 'Minimal impact - authority weighting had little effect on results';
  } else if (rankingChanges > scoreDiffs.length / 2) {
    return 'High impact - authority weighting significantly reordered results';
  } else {
    return 'Moderate impact - authority weighting improved score precision';
  }
}