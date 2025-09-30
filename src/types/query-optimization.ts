/**
 * Query Optimization Types
 * Defines interfaces for advanced query optimization with confidence scoring
 * and intelligent routing (Issue #76)
 */

import type { QueryClassification, SourceWeights } from './query-classification';

/**
 * Query complexity levels based on analysis
 */
export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'ambiguous';

/**
 * Routing strategies based on query characteristics
 */
export type RoutingStrategy =
  | 'cached'       // Use cached results for simple/frequent queries
  | 'lightweight'  // Minimal RAG pipeline for straightforward queries
  | 'full'         // Complete RAG pipeline with memory and enhanced processing
  | 'fallback';    // Fallback strategy for ambiguous/low-confidence queries

/**
 * Confidence scoring breakdown
 */
export interface ConfidenceScore {
  /** Overall confidence score (0-1) */
  overall: number;
  /** Query clarity and specificity (0-1) */
  queryClarity: number;
  /** Available source material quality (0-1) */
  sourceCoverage: number;
  /** Historical performance for similar queries (0-1) */
  historicalSuccess: number;
  /** Confidence calculation reasoning */
  reasoning: string;
}

/**
 * Query complexity analysis result
 */
export interface ComplexityAnalysis {
  /** Complexity classification */
  complexity: QueryComplexity;
  /** Number of distinct concepts in query */
  conceptCount: number;
  /** Technical depth indicator (0-1) */
  technicalDepth: number;
  /** Estimated tokens needed for answer */
  estimatedTokens: number;
  /** Required context window size */
  requiredContext: number;
  /** Analysis reasoning */
  reasoning: string;
}

/**
 * Token optimization configuration
 */
export interface TokenOptimizationConfig {
  /** Maximum tokens for response */
  maxTokens: number;
  /** Optimal number of sources to include */
  optimalSources: number;
  /** Context window optimization strategy */
  contextStrategy: 'minimal' | 'balanced' | 'comprehensive';
  /** Prompt template variant */
  promptTemplate: 'concise' | 'standard' | 'detailed';
  /** Estimated token savings vs. baseline */
  estimatedSavings: number;
}

/**
 * Intelligent routing decision
 */
export interface RoutingDecision {
  /** Selected routing strategy */
  strategy: RoutingStrategy;
  /** Source weights adjusted for query */
  sourceWeights: SourceWeights;
  /** Minimum number of sources to fetch */
  minSources: number;
  /** Maximum number of sources to use */
  maxSources: number;
  /** Whether to skip memory retrieval */
  skipMemory: boolean;
  /** Whether to use reranking */
  useReranking: boolean;
  /** Routing decision reasoning */
  reasoning: string;
}

/**
 * Response quality metrics
 */
export interface QualityMetrics {
  /** Answer relevance score (0-1) */
  relevanceScore: number;
  /** Source attribution accuracy (0-1) */
  attributionAccuracy: number;
  /** Completeness of answer (0-1) */
  completeness: number;
  /** Token efficiency score (0-1) */
  tokenEfficiency: number;
  /** Timestamp of measurement */
  timestamp: Date;
}

/**
 * Historical query performance data
 */
export interface HistoricalPerformance {
  /** Similar query count */
  similarQueryCount: number;
  /** Average success rate */
  avgSuccessRate: number;
  /** Average confidence score */
  avgConfidence: number;
  /** Average token usage */
  avgTokens: number;
  /** User satisfaction score (0-1) */
  userSatisfaction: number;
}

/**
 * Complete query optimization result
 */
export interface QueryOptimizationResult {
  /** Original query */
  query: string;
  /** Query classification */
  classification: QueryClassification;
  /** Confidence scoring */
  confidence: ConfidenceScore;
  /** Complexity analysis */
  complexity: ComplexityAnalysis;
  /** Token optimization config */
  tokenOptimization: TokenOptimizationConfig;
  /** Routing decision */
  routing: RoutingDecision;
  /** Historical performance data (if available) */
  historical?: HistoricalPerformance;
  /** Quality metrics (for completed queries) */
  quality?: QualityMetrics;
  /** Total optimization time (ms) */
  optimizationTime: number;
  /** Cache hit indicator */
  cached: boolean;
}

/**
 * Optimization configuration options
 */
export interface OptimizationOptions {
  /** Enable caching of optimization results */
  useCache?: boolean;
  /** Include historical performance analysis */
  includeHistorical?: boolean;
  /** Target token reduction percentage (0-1) */
  targetReduction?: number;
  /** Minimum confidence threshold for full pipeline */
  minConfidence?: number;
  /** Timeout for optimization (ms) */
  timeout?: number;
}

/**
 * Optimization performance tracking
 */
export interface OptimizationMetrics {
  /** Total optimizations performed */
  totalOptimizations: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Average token savings */
  avgTokenSavings: number;
  /** Average confidence score */
  avgConfidence: number;
  /** Strategy distribution */
  strategyDistribution: Record<RoutingStrategy, number>;
  /** Quality score trend */
  qualityTrend: number[];
}