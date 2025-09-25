/**
 * RAG System Types
 * Comprehensive type definitions for Retrieval-Augmented Generation system
 */

import { z } from 'zod';
import type { Document, DocumentSource, SearchFilters, QueryId } from './search';
import type { Citation, MessageId, ConversationId } from './chat';
import type { SourceWeights, QueryClassification } from './query-classification';

// Branded types for RAG system
export type EmbeddingId = string & { readonly __brand: 'EmbeddingId' };
export type IndexId = string & { readonly __brand: 'IndexId' };
export type ContextId = string & { readonly __brand: 'ContextId' };
export type RetrievalId = string & { readonly __brand: 'RetrievalId' };

// LLM Provider types
export type LLMProvider = 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'local';
export type EmbeddingProvider = 'openai' | 'cohere' | 'sentence-transformers' | 'custom';

// RAG Pipeline stages
export type RAGStage = 'query' | 'retrieval' | 'rerank' | 'context' | 'generation' | 'response';

// Context retrieval strategies
export type RetrievalStrategy =
  | 'semantic'
  | 'hybrid'
  | 'keyword'
  | 'hierarchical'
  | 'multi_query'
  | 'adaptive';

// Context ranking methods
export type RankingMethod =
  | 'relevance'
  | 'recency'
  | 'authority'
  | 'diversity'
  | 'mmr'
  | 'cross_encoder'
  | 'custom';

// Generation strategies
export type GenerationStrategy =
  | 'faithful'
  | 'creative'
  | 'balanced'
  | 'technical'
  | 'summarization'
  | 'extraction';

// Embedding configuration
export interface EmbeddingConfig {
  readonly provider: EmbeddingProvider;
  readonly model: string;
  readonly dimensions: number;
  readonly maxTokens: number;
  readonly batchSize: number;
  readonly temperature?: number;
  readonly apiKey?: string;
  readonly endpoint?: string;
  readonly timeout: number;
  readonly retryAttempts: number;
}

// Vector index configuration
export interface VectorIndexConfig {
  readonly indexType: 'flat' | 'hnsw' | 'ivf' | 'pq' | 'hybrid';
  readonly dimensions: number;
  readonly metric: 'cosine' | 'euclidean' | 'dot_product' | 'manhattan';
  readonly parameters: Record<string, unknown>;
  readonly shards?: number;
  readonly replicas?: number;
  readonly cacheable: boolean;
}

// Retrieval configuration
export interface RetrievalConfig {
  readonly strategy: RetrievalStrategy;
  readonly topK: number;
  readonly minScore: number;
  readonly maxDocuments: number;
  readonly diversityThreshold?: number;
  readonly temporalWeighting?: boolean;
  readonly sourceWeighting: SourceWeights;
  readonly filters?: SearchFilters;
  readonly rerank: RerankConfig;
  readonly timeout: number;
}

// Reranking configuration
export interface RerankConfig {
  readonly enabled: boolean;
  readonly method: RankingMethod;
  readonly model?: string;
  readonly topK: number;
  readonly threshold: number;
  readonly weights: {
    readonly relevance: number;
    readonly recency: number;
    readonly authority: number;
    readonly diversity: number;
  };
  readonly crossEncoder?: {
    readonly model: string;
    readonly threshold: number;
    readonly batchSize: number;
  };
}

// Context assembly configuration
export interface ContextConfig {
  readonly maxTokens: number;
  readonly maxDocuments: number;
  readonly summaryLength?: number;
  readonly includeMetadata: boolean;
  readonly includeCitations: boolean;
  readonly templateFormat: 'markdown' | 'xml' | 'json' | 'text';
  readonly chunkStrategy: 'sentence' | 'paragraph' | 'semantic' | 'fixed';
  readonly overlap: number;
  readonly contextWindow: number;
}

// LLM generation configuration
export interface GenerationConfig {
  readonly provider: LLMProvider;
  readonly model: string;
  readonly strategy: GenerationStrategy;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly topP?: number;
  readonly frequencyPenalty?: number;
  readonly presencePenalty?: number;
  readonly stopSequences?: readonly string[];
  readonly streaming: boolean;
  readonly timeout: number;
  readonly retryAttempts: number;
}

// Context window and token management
export interface TokenUsage {
  readonly query: number;
  readonly context: number;
  readonly generation: number;
  readonly total: number;
  readonly maxLimit: number;
  readonly efficiency: number;
}

// Retrieved context piece
export interface ContextPiece {
  readonly id: ContextId;
  readonly document: Document;
  readonly excerpt: string;
  readonly relevanceScore: number;
  readonly rankingScore: number;
  readonly startPosition: number;
  readonly endPosition: number;
  readonly tokenCount: number;
  readonly metadata: ContextMetadata;
  readonly embedding?: readonly number[];
}

// Context metadata
export interface ContextMetadata {
  readonly retrievalMethod: RetrievalStrategy;
  readonly rankingMethod: RankingMethod;
  readonly originalRank: number;
  readonly finalRank: number;
  readonly confidence: number;
  readonly extractionTime: Date;
  readonly sourceAuthority: number;
  readonly temporalScore?: number;
  readonly diversityScore?: number;
}

// Assembled context for LLM
export interface RAGContext {
  readonly id: RetrievalId;
  readonly query: string;
  readonly pieces: readonly ContextPiece[];
  readonly totalTokens: number;
  readonly sources: readonly string[];
  readonly assemblyTime: Date;
  readonly template: string;
  readonly metadata: RAGContextMetadata;
  readonly citations: readonly Citation[];
}

// RAG context metadata
export interface RAGContextMetadata {
  readonly retrievalStrategy: RetrievalStrategy;
  readonly rankingMethod: RankingMethod;
  readonly queryClassification: QueryClassification;
  readonly sourceCounts: Record<DocumentSource, number>;
  readonly qualityScore: number;
  readonly completeness: number;
  readonly coherence: number;
  readonly coverage: number;
  readonly redundancy: number;
}

// RAG request and response
export interface RAGRequest {
  readonly query: string;
  readonly conversationId?: ConversationId;
  readonly messageId?: MessageId;
  readonly context?: {
    readonly previousMessages?: readonly string[];
    readonly userIntent?: string;
    readonly sessionData?: Record<string, unknown>;
  };
  readonly retrievalConfig?: Partial<RetrievalConfig>;
  readonly generationConfig?: Partial<GenerationConfig>;
  readonly streaming?: boolean;
  readonly includeDebug?: boolean;
  readonly timeout?: number;
}

export interface RAGResponse {
  readonly success: true;
  readonly messageId: MessageId;
  readonly response: string;
  readonly citations: readonly Citation[];
  readonly context: RAGContext;
  readonly metadata: RAGResponseMetadata;
  readonly debug?: RAGDebugInfo;
}

// RAG response metadata
export interface RAGResponseMetadata {
  readonly queryId: QueryId;
  readonly retrievalId: RetrievalId;
  readonly processingTime: number;
  readonly stages: Record<RAGStage, StageMetadata>;
  readonly tokenUsage: TokenUsage;
  readonly qualityMetrics: QualityMetrics;
  readonly performance: PerformanceMetrics;
  readonly cacheHits: Record<string, boolean>;
}

// Stage processing metadata
export interface StageMetadata {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly status: 'success' | 'error' | 'timeout' | 'cached';
  readonly error?: string;
  readonly metrics?: Record<string, number>;
}

// Quality assessment metrics
export interface QualityMetrics {
  readonly relevance: number;
  readonly coherence: number;
  readonly faithfulness: number;
  readonly completeness: number;
  readonly factualAccuracy: number;
  readonly sourceAttribution: number;
  readonly overall: number;
}

// Performance metrics
export interface PerformanceMetrics {
  readonly retrievalTime: number;
  readonly rerankingTime: number;
  readonly contextAssemblyTime: number;
  readonly generationTime: number;
  readonly totalTime: number;
  readonly throughput: number;
  readonly latencyP95: number;
  readonly cacheHitRate: number;
}

// Debug information for development
export interface RAGDebugInfo {
  readonly retrievedDocuments: readonly Document[];
  readonly rerankedResults: readonly ScoredResult[];
  readonly contextAssembly: ContextAssemblyDebug;
  readonly llmInteraction: LLMDebugInfo;
  readonly timestamps: Record<RAGStage, Date>;
  readonly errors: readonly RAGError[];
  readonly warnings: readonly string[];
}

// Scored result for debugging
export interface ScoredResult {
  readonly document: Document;
  readonly originalScore: number;
  readonly rerankScore: number;
  readonly finalScore: number;
  readonly reasons: readonly string[];
  readonly metadata: Record<string, unknown>;
}

// Context assembly debug information
export interface ContextAssemblyDebug {
  readonly selectedPieces: readonly ContextPiece[];
  readonly rejectedPieces: readonly ContextPiece[];
  readonly tokenBudget: number;
  readonly tokenUsed: number;
  readonly assembly: string;
  readonly template: string;
}

// LLM interaction debug information
export interface LLMDebugInfo {
  readonly prompt: string;
  readonly promptTokens: number;
  readonly response: string;
  readonly responseTokens: number;
  readonly model: string;
  readonly temperature: number;
  readonly finishReason: string;
  readonly usage: Record<string, number>;
}

// RAG system errors
export interface RAGError {
  readonly stage: RAGStage;
  readonly code: RAGErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly retryable: boolean;
}

export type RAGErrorCode =
  | 'QUERY_TOO_LONG'
  | 'QUERY_TOO_SHORT'
  | 'EMBEDDING_FAILED'
  | 'RETRIEVAL_TIMEOUT'
  | 'NO_DOCUMENTS_FOUND'
  | 'RERANKING_FAILED'
  | 'CONTEXT_TOO_LARGE'
  | 'CONTEXT_ASSEMBLY_FAILED'
  | 'LLM_TIMEOUT'
  | 'LLM_RATE_LIMITED'
  | 'LLM_ERROR'
  | 'CITATION_EXTRACTION_FAILED'
  | 'QUALITY_CHECK_FAILED'
  | 'TOKEN_LIMIT_EXCEEDED';

// Result type for RAG operations
export type RAGResult = RAGResponse | { readonly success: false; readonly error: RAGError };

// Memory and caching
export interface RAGCache {
  readonly embeddingCache: EmbeddingCache;
  readonly retrievalCache: RetrievalCache;
  readonly contextCache: ContextCache;
  readonly responseCache: ResponseCache;
}

export interface EmbeddingCache {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly maxSize: number;
  readonly hitRate: number;
}

export interface RetrievalCache {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly keyStrategy: 'query' | 'semantic' | 'hybrid';
  readonly maxResults: number;
}

export interface ContextCache {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly compressionEnabled: boolean;
  readonly deduplication: boolean;
}

export interface ResponseCache {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly conditions: readonly string[];
  readonly invalidation: readonly string[];
}

// Evaluation and metrics
export interface RAGEvaluation {
  readonly evaluationId: string;
  readonly testSet: readonly EvaluationCase[];
  readonly metrics: EvaluationMetrics;
  readonly timestamp: Date;
  readonly config: RAGSystemConfig;
}

export interface EvaluationCase {
  readonly id: string;
  readonly query: string;
  readonly expectedAnswer?: string;
  readonly expectedSources?: readonly string[];
  readonly groundTruth?: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly category: string;
}

export interface EvaluationMetrics {
  readonly accuracy: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1Score: number;
  readonly bleuScore?: number;
  readonly rougeScore?: number;
  readonly semanticSimilarity: number;
  readonly sourceAccuracy: number;
}

// Complete RAG system configuration
export interface RAGSystemConfig {
  readonly embedding: EmbeddingConfig;
  readonly vectorIndex: VectorIndexConfig;
  readonly retrieval: RetrievalConfig;
  readonly context: ContextConfig;
  readonly generation: GenerationConfig;
  readonly cache: RAGCache;
  readonly evaluation?: {
    readonly enabled: boolean;
    readonly frequency: number;
    readonly thresholds: Record<string, number>;
  };
}

// Zod validation schemas
export const EmbeddingIdSchema = z.string().brand('EmbeddingId');
export const IndexIdSchema = z.string().brand('IndexId');
export const ContextIdSchema = z.string().brand('ContextId');
export const RetrievalIdSchema = z.string().brand('RetrievalId');

export const LLMProviderSchema = z.enum(['openai', 'anthropic', 'cohere', 'huggingface', 'local']);
export const EmbeddingProviderSchema = z.enum(['openai', 'cohere', 'sentence-transformers', 'custom']);
export const RetrievalStrategySchema = z.enum(['semantic', 'hybrid', 'keyword', 'hierarchical', 'multi_query', 'adaptive']);
export const GenerationStrategySchema = z.enum(['faithful', 'creative', 'balanced', 'technical', 'summarization', 'extraction']);

export const TokenUsageSchema = z.object({
  query: z.number().nonnegative(),
  context: z.number().nonnegative(),
  generation: z.number().nonnegative(),
  total: z.number().nonnegative(),
  maxLimit: z.number().positive(),
  efficiency: z.number().min(0).max(1),
}).strict();

export const RAGRequestSchema = z.object({
  query: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  context: z.object({
    previousMessages: z.array(z.string()).optional(),
    userIntent: z.string().optional(),
    sessionData: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  retrievalConfig: z.object({
    strategy: RetrievalStrategySchema.optional(),
    topK: z.number().positive().max(100).optional(),
    minScore: z.number().min(0).max(1).optional(),
    maxDocuments: z.number().positive().max(50).optional(),
    timeout: z.number().positive().optional(),
  }).optional(),
  generationConfig: z.object({
    provider: LLMProviderSchema.optional(),
    model: z.string().optional(),
    strategy: GenerationStrategySchema.optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    streaming: z.boolean().optional(),
  }).optional(),
  streaming: z.boolean().default(false),
  includeDebug: z.boolean().default(false),
  timeout: z.number().positive().max(120000).optional(),
}).strict();

export const QualityMetricsSchema = z.object({
  relevance: z.number().min(0).max(1),
  coherence: z.number().min(0).max(1),
  faithfulness: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  factualAccuracy: z.number().min(0).max(1),
  sourceAttribution: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
}).strict();

// Type utility functions
export const createEmbeddingId = (id: string): EmbeddingId => id as EmbeddingId;
export const createIndexId = (id: string): IndexId => id as IndexId;
export const createContextId = (id: string): ContextId => id as ContextId;
export const createRetrievalId = (id: string): RetrievalId => id as RetrievalId;

// Type guards
export const isRAGResponse = (result: RAGResult): result is RAGResponse =>
  result.success === true;

export const isRAGError = (result: RAGResult): result is { success: false; error: RAGError } =>
  result.success === false;

export const isRetryableRAGError = (error: RAGError): boolean =>
  error.retryable && ['RETRIEVAL_TIMEOUT', 'LLM_TIMEOUT', 'LLM_RATE_LIMITED'].includes(error.code);

// Default configurations
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: 'openai',
  model: 'text-embedding-3-large',
  dimensions: 1024,
  maxTokens: 8192,
  batchSize: 100,
  timeout: 30000,
  retryAttempts: 3,
} as const;

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  strategy: 'hybrid',
  topK: 10,
  minScore: 0.1,
  maxDocuments: 5,
  sourceWeighting: { github: 1.2, web: 0.8 },
  rerank: {
    enabled: true,
    method: 'relevance',
    topK: 5,
    threshold: 0.3,
    weights: {
      relevance: 0.4,
      recency: 0.2,
      authority: 0.3,
      diversity: 0.1,
    },
  },
  timeout: 5000,
} as const;

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  provider: 'openai',
  model: 'gpt-4-turbo',
  strategy: 'faithful',
  temperature: 0.1,
  maxTokens: 2000,
  streaming: true,
  timeout: 30000,
  retryAttempts: 2,
} as const;

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxTokens: 8000,
  maxDocuments: 5,
  includeMetadata: true,
  includeCitations: true,
  templateFormat: 'markdown',
  chunkStrategy: 'semantic',
  overlap: 50,
  contextWindow: 4000,
} as const;