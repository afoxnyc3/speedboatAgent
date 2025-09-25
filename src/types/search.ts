/**
 * Search System Types
 * Comprehensive type definitions for hybrid search functionality
 */

import { z } from 'zod';
import type { SourceWeights, QueryType } from './query-classification';

// Branded types for ID safety
export type DocumentId = string & { readonly __brand: 'DocumentId' };
export type QueryId = string & { readonly __brand: 'QueryId' };
export type SessionId = string & { readonly __brand: 'SessionId' };

// Document source types
export type DocumentSource = 'github' | 'web' | 'local';
export type DocumentLanguage = 'typescript' | 'javascript' | 'markdown' | 'json' | 'yaml' | 'text' | 'python' | 'other';

// Search filter types
export interface SearchFilters {
  readonly source?: DocumentSource[];
  readonly language?: DocumentLanguage[];
  readonly dateRange?: {
    readonly from?: Date;
    readonly to?: Date;
  };
  readonly minScore?: number;
  readonly maxResults?: number;
  readonly tags?: string[];
}

// Document metadata interface
export interface DocumentMetadata {
  readonly size: number;
  readonly wordCount: number;
  readonly lines: number;
  readonly encoding: string;
  readonly mimeType: string;
  readonly tags: readonly string[];
  readonly author?: string;
  readonly lastModified: Date;
  readonly created: Date;
  readonly version?: string;
  readonly branch?: string;
  readonly commit?: string;
  readonly url?: string;
  readonly checksum: string;
}

// Core Document interface
export interface Document {
  readonly id: DocumentId;
  readonly content: string;
  readonly filepath: string;
  readonly language: DocumentLanguage;
  readonly source: DocumentSource;
  readonly score: number;
  readonly priority: number;
  readonly metadata: DocumentMetadata;
  readonly embedding?: readonly number[];
  readonly chunks?: readonly DocumentChunk[];
}

// Document chunk for large files
export interface DocumentChunk {
  readonly id: string;
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly chunkIndex: number;
  readonly totalChunks: number;
  readonly score?: number;
}

// Processed query interface
export interface ProcessedQuery {
  readonly original: string;
  readonly processed: string;
  readonly tokens: readonly string[];
  readonly embedding?: readonly number[];
  readonly queryType?: QueryType;
  readonly intent?: QueryIntent;
  readonly entities?: readonly string[];
  readonly filters?: SearchFilters;
}

// Query intent classification
export type QueryIntent =
  | 'code_search'
  | 'documentation'
  | 'api_reference'
  | 'troubleshooting'
  | 'configuration'
  | 'best_practices'
  | 'examples';

// Search configuration
export interface SearchConfig {
  readonly hybridWeights: {
    readonly vector: number;
    readonly keyword: number;
  };
  readonly sourceWeights: SourceWeights;
  readonly rerankEnabled: boolean;
  readonly maxResults: number;
  readonly minScore: number;
  readonly timeout: number;
  readonly cacheEnabled: boolean;
  readonly cacheTtl: number;
}

// Search metadata
export interface SearchMetadata {
  readonly queryId: QueryId;
  readonly totalResults: number;
  readonly maxScore: number;
  readonly minScore: number;
  readonly searchTime: number;
  readonly cacheHit: boolean;
  readonly sourceCounts: Record<DocumentSource, number>;
  readonly languageCounts: Record<DocumentLanguage, number>;
  readonly reranked: boolean;
  readonly filters?: SearchFilters;
  readonly config: SearchConfig;
}

// Main search interfaces
export interface SearchRequest {
  readonly query: string;
  readonly sessionId?: SessionId;
  readonly limit?: number;
  readonly offset?: number;
  readonly filters?: SearchFilters;
  readonly weights?: SourceWeights;
  readonly config?: Partial<SearchConfig>;
  readonly includeContent?: boolean;
  readonly includeEmbedding?: boolean;
  readonly timeout?: number;
}

export interface SearchResponse {
  readonly success: true;
  readonly results: readonly Document[];
  readonly metadata: SearchMetadata;
  readonly query: ProcessedQuery;
  readonly suggestions?: readonly string[];
}

// Search error types
export interface SearchError {
  readonly success: false;
  readonly error: {
    readonly code: SearchErrorCode;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly queryId?: QueryId;
  };
}

export type SearchErrorCode =
  | 'QUERY_TOO_SHORT'
  | 'QUERY_TOO_LONG'
  | 'INVALID_FILTERS'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'EMBEDDING_FAILED'
  | 'PARSING_ERROR';

// Result type for search operations
export type SearchResult = SearchResponse | SearchError;

// Ranking and scoring
export interface RankingFactors {
  readonly vectorSimilarity: number;
  readonly keywordMatches: number;
  readonly sourceAuthority: number;
  readonly recency: number;
  readonly filePopularity: number;
  readonly contextRelevance: number;
}

export interface ScoredDocument extends Document {
  readonly rankingFactors: RankingFactors;
  readonly finalScore: number;
  readonly rank: number;
}

// Aggregation types
export interface SearchAggregation {
  readonly sources: Record<DocumentSource, number>;
  readonly languages: Record<DocumentLanguage, number>;
  readonly dateHistogram: Array<{
    readonly date: string;
    readonly count: number;
  }>;
  readonly scoreDistribution: Array<{
    readonly range: string;
    readonly count: number;
  }>;
}

// Faceted search support
export interface SearchFacets {
  readonly sources: Array<{ value: DocumentSource; count: number; selected: boolean }>;
  readonly languages: Array<{ value: DocumentLanguage; count: number; selected: boolean }>;
  readonly dateRanges: Array<{ range: string; count: number; selected: boolean }>;
  readonly tags: Array<{ value: string; count: number; selected: boolean }>;
}

// Auto-complete and suggestions
export interface SearchSuggestion {
  readonly text: string;
  readonly type: 'query' | 'file' | 'function' | 'class' | 'concept';
  readonly confidence: number;
  readonly context?: string;
}

export interface AutoCompleteRequest {
  readonly partial: string;
  readonly limit?: number;
  readonly context?: DocumentSource[];
}

export interface AutoCompleteResponse {
  readonly suggestions: readonly SearchSuggestion[];
  readonly metadata: {
    readonly queryTime: number;
    readonly totalSuggestions: number;
  };
}

// Zod validation schemas
export const DocumentIdSchema = z.string().brand('DocumentId');
export const QueryIdSchema = z.string().brand('QueryId');
export const SessionIdSchema = z.string().brand('SessionId');

export const DocumentSourceSchema = z.enum(['github', 'web', 'local']);
export const DocumentLanguageSchema = z.enum([
  'typescript', 'javascript', 'markdown', 'json', 'yaml', 'text', 'python', 'other'
]);

export const SearchFiltersSchema = z.object({
  source: z.array(DocumentSourceSchema).optional(),
  language: z.array(DocumentLanguageSchema).optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  minScore: z.number().min(0).max(1).optional(),
  maxResults: z.number().positive().max(1000).optional(),
  tags: z.array(z.string()).optional(),
}).strict();

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  sessionId: SessionIdSchema.optional(),
  limit: z.number().positive().max(100).default(10),
  offset: z.number().nonnegative().default(0),
  filters: SearchFiltersSchema.optional(),
  weights: z.object({
    github: z.number().positive(),
    web: z.number().positive(),
  }).optional(),
  config: z.object({
    hybridWeights: z.object({
      vector: z.number().min(0).max(1),
      keyword: z.number().min(0).max(1),
    }).optional(),
    maxResults: z.number().positive().optional(),
    minScore: z.number().min(0).max(1).optional(),
    timeout: z.number().positive().optional(),
    cacheEnabled: z.boolean().optional(),
  }).optional(),
  includeContent: z.boolean().default(true),
  includeEmbedding: z.boolean().default(false),
  timeout: z.number().positive().max(30000).optional(),
}).strict();

export const DocumentMetadataSchema = z.object({
  size: z.number().nonnegative(),
  wordCount: z.number().nonnegative(),
  lines: z.number().positive(),
  encoding: z.string(),
  mimeType: z.string(),
  tags: z.array(z.string()),
  author: z.string().optional(),
  lastModified: z.date(),
  created: z.date(),
  version: z.string().optional(),
  branch: z.string().optional(),
  commit: z.string().optional(),
  url: z.string().url().optional(),
  checksum: z.string(),
}).strict();

export const DocumentSchema = z.object({
  id: DocumentIdSchema,
  content: z.string(),
  filepath: z.string(),
  language: DocumentLanguageSchema,
  source: DocumentSourceSchema,
  score: z.number().min(0).max(1),
  priority: z.number().min(0).max(2),
  metadata: DocumentMetadataSchema,
  embedding: z.array(z.number()).optional(),
  chunks: z.array(z.object({
    id: z.string(),
    content: z.string(),
    startLine: z.number().positive(),
    endLine: z.number().positive(),
    chunkIndex: z.number().nonnegative(),
    totalChunks: z.number().positive(),
    score: z.number().min(0).max(1).optional(),
  })).optional(),
}).strict();

// Type utility functions
export const createDocumentId = (id: string): DocumentId => id as DocumentId;
export const createQueryId = (id: string): QueryId => id as QueryId;
export const createSessionId = (id: string): SessionId => id as SessionId;

export const isValidDocumentId = (id: unknown): id is DocumentId =>
  typeof id === 'string' && id.length > 0;

export const isValidQueryId = (id: unknown): id is QueryId =>
  typeof id === 'string' && id.length > 0;

export const isValidSessionId = (id: unknown): id is SessionId =>
  typeof id === 'string' && id.length > 0;

// Type guards
export const isSearchResponse = (result: SearchResult): result is SearchResponse =>
  result.success === true;

export const isSearchError = (result: SearchResult): result is SearchError =>
  result.success === false;

// Default configurations
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  hybridWeights: { vector: 0.75, keyword: 0.25 },
  sourceWeights: { github: 1.0, web: 1.0 },
  rerankEnabled: true,
  maxResults: 10,
  minScore: 0.1,
  timeout: 5000,
  cacheEnabled: true,
  cacheTtl: 300,
} as const;

export const MAX_QUERY_LENGTH = 1000;
export const MAX_RESULTS_LIMIT = 100;
export const DEFAULT_TIMEOUT = 5000;