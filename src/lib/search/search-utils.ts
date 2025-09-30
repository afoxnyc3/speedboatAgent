/**
 * Search Utility Functions - Main Export
 * Centralized exports from modularized search utilities
 */

// Document processing and analysis utilities
export {
  createDocumentHash,
  generateSearchSuggestions,
  countDocumentsBySource,
  countDocumentsByLanguage,
  calculateScoreRange,
  extractKeywords,
  calculateDocumentSimilarity,
  groupDocumentsBySimilarity
} from './search-document-utils';

// Search metadata and statistics utilities
export {
  buildSearchMetadata,
  calculateSearchPerformanceMetrics,
  generateSearchSummary,
  calculateResultFreshness,
  generateSearchRecommendations
} from './search-metadata-utils';

// Query processing and analysis utilities
export {
  processQuery,
  extractQueryEntities,
  analyzeQueryIntent,
  generateQueryVariations,
  validateQuery,
  normalizeQuery
} from './search-query-utils';

// Response formatting and processing utilities
export {
  filterDocumentContent,
  createPerformanceHeaders,
  formatSearchResponse,
  createStreamingSearchResponse,
  estimateResponseSize
} from './search-response-utils';

// Re-export types for convenience
export type {
  Document,
  DocumentSource,
  DocumentLanguage,
  SearchMetadata,
  ProcessedQuery,
  QueryId,
  SearchFilters,
  SearchConfig
} from '../../types/search';

export type { QueryType } from '../../types/query-classification';