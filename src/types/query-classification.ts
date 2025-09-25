/**
 * Query Classification System Types
 * Defines interfaces for intelligent RAG query routing
 */

export type QueryType = 'technical' | 'business' | 'operational';

export interface SourceWeights {
  github: number;
  web: number;
}

export interface QueryClassification {
  query: string;
  type: QueryType;
  confidence: number;
  weights: SourceWeights;
  reasoning?: string;
  cached?: boolean;
}

export interface ClassificationOptions {
  useCache?: boolean;
  timeout?: number;
  fallbackWeights?: boolean;
}

export interface ClassificationCache {
  key: string;
  classification: QueryClassification;
  timestamp: number;
  ttl: number;
}

export interface ClassificationMetrics {
  responseTime: number;
  cacheHit: boolean;
  confidence: number;
  source: 'openai' | 'cache' | 'fallback';
}

// Predefined weight configurations
export const SOURCE_WEIGHT_CONFIGS: Record<QueryType, SourceWeights> = {
  technical: { github: 1.5, web: 0.5 },
  business: { github: 0.5, web: 1.5 },
  operational: { github: 1.0, web: 1.0 }
} as const;

// Default fallback weights
export const DEFAULT_WEIGHTS: SourceWeights = {
  github: 1.0,
  web: 1.0
} as const;

export interface GPTClassificationResponse {
  type: QueryType;
  confidence: number;
  reasoning: string;
}