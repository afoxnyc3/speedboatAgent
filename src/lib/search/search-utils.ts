/**
 * Search Utility Functions
 * Helper functions for search operations and data processing
 */

import { createHash } from 'crypto';
import {
  Document,
  DocumentSource,
  DocumentLanguage,
  SearchMetadata,
  ProcessedQuery,
  QueryId,
  SearchFilters,
  type SearchConfig
} from '../../types/search';
import type { QueryType } from '../../types/query-classification';

/**
 * Creates MD5 hash for document content deduplication
 */
export function createDocumentHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * Generates search suggestions based on document content
 */
export function generateSearchSuggestions(
  query: string,
  documents: Document[]
): string[] {
  const topDocs = documents.slice(0, 3);
  const keywords = new Set<string>();

  topDocs.forEach(doc => {
    const words = doc.content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    words.slice(0, 5).forEach(word => keywords.add(word));
  });

  return Array.from(keywords)
    .slice(0, 3)
    .filter(keyword => !query.toLowerCase().includes(keyword))
    .map(keyword => `${query} ${keyword}`);
}

/**
 * Counts documents by source type
 */
export function countDocumentsBySource(
  documents: Document[]
): Record<DocumentSource, number> {
  return documents.reduce(
    (counts, doc) => {
      counts[doc.source]++;
      return counts;
    },
    { github: 0, web: 0, local: 0 } as Record<DocumentSource, number>
  );
}

/**
 * Counts documents by language type
 */
export function countDocumentsByLanguage(
  documents: Document[]
): Record<DocumentLanguage, number> {
  return documents.reduce(
    (counts, doc) => {
      counts[doc.language]++;
      return counts;
    },
    {
      typescript: 0, javascript: 0, markdown: 0, json: 0,
      yaml: 0, text: 0, python: 0, other: 0
    } as Record<DocumentLanguage, number>
  );
}

/**
 * Calculates min and max scores from document array
 */
export function calculateScoreRange(documents: Document[]): {
  maxScore: number;
  minScore: number;
} {
  if (documents.length === 0) {
    return { maxScore: 0, minScore: 0 };
  }

  const scores = documents.map(d => d.score);
  return {
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores)
  };
}

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
 * Processes raw query into structured format
 */
export function processQuery(
  originalQuery: string,
  queryType?: QueryType,
  filters?: SearchFilters
): ProcessedQuery {
  const processed = originalQuery.trim().toLowerCase();
  const tokens = processed.split(/\s+/);

  return {
    original: originalQuery,
    processed,
    tokens,
    queryType,
    entities: [],
    filters
  };
}

/**
 * Filters documents based on include content flag
 */
export function filterDocumentContent(
  documents: Document[],
  includeContent: boolean,
  includeEmbedding: boolean
): Document[] {
  return documents.map(doc => ({
    ...doc,
    content: includeContent ? doc.content : '',
    embedding: includeEmbedding ? doc.embedding : undefined
  }));
}

/**
 * Creates performance headers for search response
 */
export function createPerformanceHeaders(
  queryId: string,
  searchTime: number,
  totalTime: number,
  cacheHit: boolean,
  totalResults: number
): Headers {
  return new Headers({
    'X-Query-ID': queryId,
    'X-Search-Time-Ms': searchTime.toString(),
    'X-Total-Time-Ms': totalTime.toString(),
    'X-Cache-Hit': cacheHit.toString(),
    'X-Results-Count': totalResults.toString()
  });
}