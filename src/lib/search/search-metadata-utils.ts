/**
 * Search Metadata Utilities
 * Functions for building search metadata, statistics, and result aggregation
 */

import type {
  Document,
  SearchMetadata,
  SearchFilters,
  SearchConfig,
  QueryId
} from '../../types/search';
import {
  calculateScoreRange,
  countDocumentsBySource,
  countDocumentsByLanguage
} from './search-document-utils';

/**
 * Builds search metadata from results and metrics
 */
export function buildSearchMetadata(
  queryId: QueryId,
  documents: Document[],
  searchTime: number,
  cacheHit: boolean,
  filters?: SearchFilters,
  config?: SearchConfig
): SearchMetadata {
  const { maxScore, minScore } = calculateScoreRange(documents);
  const sourceCounts = countDocumentsBySource(documents);
  const languageCounts = countDocumentsByLanguage(documents);

  return {
    queryId,
    totalResults: documents.length,
    maxScore,
    minScore,
    searchTime,
    cacheHit,
    sourceCounts,
    languageCounts,
    reranked: false,
    filters,
    config: config as SearchConfig
  };
}

/**
 * Calculate search performance metrics
 */
export function calculateSearchPerformanceMetrics(
  documents: Document[],
  searchTime: number,
  processingTime?: number
): {
  averageScore: number;
  scoreDistribution: { low: number; medium: number; high: number };
  performanceRating: 'excellent' | 'good' | 'fair' | 'poor';
  efficiency: number;
} {
  const scores = documents.map(d => d.score);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const scoreDistribution = {
    low: scores.filter(s => s < 0.3).length,
    medium: scores.filter(s => s >= 0.3 && s < 0.7).length,
    high: scores.filter(s => s >= 0.7).length
  };

  // Performance rating based on search time and result quality
  let performanceRating: 'excellent' | 'good' | 'fair' | 'poor';
  if (searchTime < 500 && averageScore > 0.7) {
    performanceRating = 'excellent';
  } else if (searchTime < 1000 && averageScore > 0.5) {
    performanceRating = 'good';
  } else if (searchTime < 2000 && averageScore > 0.3) {
    performanceRating = 'fair';
  } else {
    performanceRating = 'poor';
  }

  // Efficiency score (results quality vs time spent)
  const efficiency = documents.length > 0 ? (averageScore * documents.length) / Math.max(searchTime, 1) : 0;

  return {
    averageScore,
    scoreDistribution,
    performanceRating,
    efficiency
  };
}

/**
 * Generate search result summary statistics
 */
export function generateSearchSummary(
  documents: Document[],
  searchTime: number,
  query: string
): {
  totalResults: number;
  topResult: Document | null;
  diversityScore: number;
  relevanceScore: number;
  completeness: number;
  searchSummary: string;
} {
  const topResult = documents.length > 0 ? documents[0] : null;
  const sourcesFound = new Set(documents.map(d => d.source)).size;
  const languagesFound = new Set(documents.map(d => d.language)).size;

  // Diversity score based on source and language variety
  const diversityScore = Math.min((sourcesFound / 3) * 0.5 + (languagesFound / 8) * 0.5, 1);

  // Average relevance score
  const relevanceScore = documents.length > 0
    ? documents.reduce((sum, doc) => sum + doc.score, 0) / documents.length
    : 0;

  // Completeness based on result count and diversity
  const completeness = Math.min((documents.length / 10) * 0.7 + diversityScore * 0.3, 1);

  // Generate human-readable summary
  const searchSummary = generateSearchSummaryText(documents, searchTime, query);

  return {
    totalResults: documents.length,
    topResult,
    diversityScore,
    relevanceScore,
    completeness,
    searchSummary
  };
}

/**
 * Generate human-readable search summary text
 */
function generateSearchSummaryText(
  documents: Document[],
  searchTime: number,
  query: string
): string {
  if (documents.length === 0) {
    return `No results found for "${query}" in ${searchTime}ms.`;
  }

  const sources = countDocumentsBySource(documents);
  const sourceText = Object.entries(sources)
    .filter(([, count]) => count > 0)
    .map(([source, count]) => `${count} from ${source}`)
    .join(', ');

  const avgScore = documents.reduce((sum, doc) => sum + doc.score, 0) / documents.length;
  const qualityText = avgScore > 0.8 ? 'high' : avgScore > 0.6 ? 'good' : avgScore > 0.4 ? 'moderate' : 'low';

  return `Found ${documents.length} results (${sourceText}) for "${query}" in ${searchTime}ms with ${qualityText} relevance.`;
}

/**
 * Calculate result freshness metrics
 */
export function calculateResultFreshness(documents: Document[]): {
  averageAge: number; // in days
  freshnessScore: number; // 0-1, higher is fresher
  staleResults: number;
  recentResults: number;
} {
  const now = new Date();
  const ages = documents.map(doc => {
    const lastModified = doc.metadata.lastModified;
    if (!lastModified) return 365; // Assume 1 year old if no date

    const ageMs = now.getTime() - new Date(lastModified).getTime();
    return ageMs / (1000 * 60 * 60 * 24); // Convert to days
  });

  const averageAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

  // Freshness score: exponential decay, 90% fresh at 0 days, 50% at 30 days, 10% at 180 days
  const freshnessScore = ages.length > 0
    ? ages.reduce((sum, age) => sum + Math.exp(-age / 30), 0) / ages.length
    : 0;

  const staleResults = ages.filter(age => age > 90).length; // Older than 3 months
  const recentResults = ages.filter(age => age <= 7).length; // Within last week

  return {
    averageAge,
    freshnessScore,
    staleResults,
    recentResults
  };
}

/**
 * Generate recommendations based on search results
 */
export function generateSearchRecommendations(
  documents: Document[],
  searchTime: number,
  query: string
): string[] {
  const recommendations: string[] = [];
  const metrics = calculateSearchPerformanceMetrics(documents, searchTime);
  const freshness = calculateResultFreshness(documents);

  if (documents.length === 0) {
    recommendations.push('Try broadening your search terms or checking for typos');
    recommendations.push('Consider searching in different content types or sources');
    return recommendations;
  }

  if (metrics.averageScore < 0.5) {
    recommendations.push('Consider refining your search query for more relevant results');
  }

  if (searchTime > 2000) {
    recommendations.push('Search performance could be improved - results may benefit from caching');
  }

  if (freshness.staleResults > freshness.recentResults && freshness.staleResults > 2) {
    recommendations.push('Many results are outdated - consider filtering by recent content');
  }

  if (metrics.scoreDistribution.high < 2 && documents.length > 5) {
    recommendations.push('Try more specific keywords to find higher-quality matches');
  }

  const sources = countDocumentsBySource(documents);
  const sourceCount = Object.values(sources).filter(count => count > 0).length;
  if (sourceCount === 1 && documents.length > 3) {
    recommendations.push('Results are from a single source - try expanding search scope');
  }

  if (recommendations.length === 0) {
    recommendations.push('Search results look good! Consider exploring related topics.');
  }

  return recommendations;
}