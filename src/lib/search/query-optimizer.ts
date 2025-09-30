/**
 * Query Optimizer - Advanced query optimization with confidence scoring
 * Implements intelligent routing and token optimization (Issue #76)
 */

import { createHash } from 'crypto';
import { classifyQueryWithMetrics } from './query-classifier';
import type {
  QueryOptimizationResult,
  QueryComplexity,
  RoutingStrategy,
  ConfidenceScore,
  ComplexityAnalysis,
  TokenOptimizationConfig,
  RoutingDecision,
  OptimizationOptions,
  HistoricalPerformance,
  OptimizationMetrics,
} from '../../types/query-optimization';
import type { QueryClassification, SourceWeights } from '../../types/query-classification';

// Simple in-memory cache for optimization results
const _optimizationCache = new Map<string, QueryOptimizationResult>();
let _metrics = {
  totalOptimizations: 0,
  cacheHits: 0,
  cacheMisses: 0,
  strategyCount: { cached: 0, lightweight: 0, full: 0, fallback: 0 },
  tokenSavings: [] as number[],
  confidenceScores: [] as number[],
};

/**
 * Generate cache key for optimization result
 */
function generateOptimizationCacheKey(query: string): string {
  return createHash('sha256')
    .update(query.toLowerCase().trim())
    .digest('hex');
}

/**
 * Analyze query complexity based on structure and content
 */
export function analyzeQueryComplexity(query: string, classification: QueryClassification): ComplexityAnalysis {
  const words = query.trim().split(/\s+/);
  const wordCount = words.length;

  // Detect concepts by looking for question words, conjunctions, technical terms
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'explain', 'describe'];
  const conjunctions = ['and', 'or', 'but', 'with', 'plus', 'using', 'including'];
  const technicalTerms = ['api', 'implement', 'architect', 'system', 'pipeline', 'database', 'auth', 'redis', 'middleware', 'limiting', 'codebase', 'search'];

  const lowerQuery = query.toLowerCase();

  const questionMatches = questionWords.filter(w => lowerQuery.includes(w)).length;
  const conjunctionMatches = conjunctions.filter(w => lowerQuery.includes(w)).length;
  const technicalMatches = technicalTerms.filter(term => lowerQuery.includes(term)).length;

  const conceptCount = Math.max(1, questionMatches + conjunctionMatches);

  // Calculate technical depth
  const technicalDepth = Math.min(1.0, technicalMatches / 2);

  // Determine complexity
  let complexity: QueryComplexity;
  let estimatedTokens: number;
  let requiredContext: number;
  let reasoning: string;

  // Simple queries first: short, single concept with question word
  if (wordCount <= 8 && conceptCount <= 2 && questionMatches > 0) {
    complexity = 'simple';
    estimatedTokens = 300;
    requiredContext = 1000;
    reasoning = 'Simple single-concept query';
  }
  // Check for ambiguous queries (short and vague with no question word)
  else if (wordCount <= 5 && (questionMatches === 0 || (wordCount <= 2))) {
    complexity = 'ambiguous';
    estimatedTokens = 200;
    requiredContext = 1500;
    reasoning = 'Vague query lacking specificity';
  }
  // Complex queries: long OR multiple concepts OR high technical depth
  else if (wordCount > 15 || conceptCount >= 4 || technicalDepth > 0.6) {
    complexity = 'complex';
    estimatedTokens = 1500;
    requiredContext = 4000;
    reasoning = 'Complex multi-part query requiring comprehensive analysis';
  }
  // Everything else is moderate
  else {
    complexity = 'moderate';
    estimatedTokens = 800;
    requiredContext = 2500;
    reasoning = 'Multi-concept query with moderate complexity';
  }

  // Adjust for technical depth
  if (technicalDepth > 0.5) {
    estimatedTokens = Math.round(estimatedTokens * 1.3);
    requiredContext = Math.round(requiredContext * 1.2);
  }

  return {
    complexity,
    conceptCount,
    technicalDepth,
    estimatedTokens: Math.round(estimatedTokens),
    requiredContext: Math.round(requiredContext),
    reasoning,
  };
}

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidenceScore(
  query: string,
  classification: QueryClassification,
  complexity: ComplexityAnalysis,
  historical?: HistoricalPerformance
): ConfidenceScore {
  // Query clarity score (based on length and specificity)
  const words = query.trim().split(/\s+/);
  const hasQuestionWord = /^(what|how|why|when|where|which|who|explain|describe|show|tell)/i.test(query);
  const queryClarity = hasQuestionWord ?
    Math.min(1.0, 0.6 + (words.length / 50)) :
    Math.min(0.8, words.length / 30);

  // Source coverage score (higher confidence if we have good classification)
  const sourceCoverage = classification.confidence > 0.7 ? 0.9 : classification.confidence;

  // Historical success score
  const historicalSuccess = historical?.avgSuccessRate ?? 0.7; // Default to moderate if no history

  // Calculate overall confidence
  const overall = (
    queryClarity * 0.4 +
    sourceCoverage * 0.4 +
    historicalSuccess * 0.2
  );

  // Penalize for ambiguity (stronger penalty)
  const penalized = complexity.complexity === 'ambiguous' ?
    overall * 0.5 :
    overall;

  return {
    overall: Math.min(1.0, Math.max(0.0, penalized)),
    queryClarity,
    sourceCoverage,
    historicalSuccess,
    reasoning: `Confidence based on clarity (${queryClarity.toFixed(2)}), source coverage (${sourceCoverage.toFixed(2)}), and historical success (${historicalSuccess.toFixed(2)})`,
  };
}

/**
 * Determine optimal token configuration
 */
export function optimizeTokenUsage(
  complexity: ComplexityAnalysis,
  confidence: ConfidenceScore,
  classification: QueryClassification
): TokenOptimizationConfig {
  const { complexity: level, estimatedTokens, requiredContext } = complexity;

  let maxTokens: number;
  let optimalSources: number;
  let contextStrategy: 'minimal' | 'balanced' | 'comprehensive';
  let promptTemplate: 'concise' | 'standard' | 'detailed';

  // Optimize based on complexity
  switch (level) {
    case 'simple':
      maxTokens = 500;
      optimalSources = 2;
      contextStrategy = 'minimal';
      promptTemplate = 'concise';
      break;
    case 'moderate':
      maxTokens = 1000;
      optimalSources = 3;
      contextStrategy = 'balanced';
      promptTemplate = 'standard';
      break;
    case 'complex':
      maxTokens = 2000;
      optimalSources = 5;
      contextStrategy = 'comprehensive';
      promptTemplate = 'detailed';
      break;
    case 'ambiguous':
      maxTokens = 800;
      optimalSources = 4; // Get more sources to clarify intent
      contextStrategy = 'balanced';
      promptTemplate = 'standard';
      break;
  }

  // Adjust based on confidence
  if (confidence.overall < 0.5) {
    optimalSources += 1; // Get more sources for low confidence
  }

  // Calculate estimated savings (baseline is ~1500 tokens for full pipeline)
  const baseline = 1500;
  const optimized = Math.min(maxTokens + requiredContext * 0.2, baseline);
  const estimatedSavings = Math.max(0, baseline - optimized);

  return {
    maxTokens,
    optimalSources,
    contextStrategy,
    promptTemplate,
    estimatedSavings: Math.round(estimatedSavings),
  };
}

/**
 * Determine intelligent routing strategy
 */
export function determineRoutingStrategy(
  complexity: ComplexityAnalysis,
  confidence: ConfidenceScore,
  classification: QueryClassification,
  tokenConfig: TokenOptimizationConfig
): RoutingDecision {
  let strategy: RoutingStrategy;
  let sourceWeights: SourceWeights;
  let minSources: number;
  let maxSources: number;
  let skipMemory: boolean;
  let useReranking: boolean;
  let reasoning: string;

  // Decision logic based on complexity and confidence
  if (complexity.complexity === 'simple' && confidence.overall > 0.7) {
    strategy = 'cached';
    sourceWeights = classification.weights;
    minSources = 1;
    maxSources = 2;
    skipMemory = true;
    useReranking = false;
    reasoning = 'Simple high-confidence query - use cached/lightweight processing';
  } else if (confidence.overall < 0.5 || complexity.complexity === 'ambiguous') {
    strategy = 'fallback';
    sourceWeights = { github: 1.0, web: 1.0 }; // Balanced for ambiguous queries
    minSources = 3;
    maxSources = 6;
    skipMemory = false;
    useReranking = true;
    reasoning = 'Low confidence or ambiguous query - use fallback with expanded search';
  } else if (complexity.complexity === 'complex' || complexity.technicalDepth > 0.7) {
    strategy = 'full';
    sourceWeights = classification.weights;
    minSources = 4;
    maxSources = 8;
    skipMemory = false;
    useReranking = true;
    reasoning = 'Complex or technical query - use full RAG pipeline';
  } else {
    strategy = 'lightweight';
    sourceWeights = classification.weights;
    minSources = 2;
    maxSources = 4;
    skipMemory = confidence.overall > 0.6; // Skip memory if confident
    useReranking = complexity.conceptCount > 2;
    reasoning = 'Moderate query - use lightweight processing';
  }

  // Enhance source weights based on classification type
  if (classification.type === 'technical' && complexity.technicalDepth > 0.5) {
    sourceWeights = {
      github: Math.round(sourceWeights.github * 1.41 * 100) / 100,
      web: Math.round(sourceWeights.web * 0.6 * 100) / 100,
    };
  } else if (classification.type === 'business') {
    sourceWeights = {
      github: Math.round(sourceWeights.github * 0.6 * 100) / 100,
      web: Math.round(sourceWeights.web * 1.41 * 100) / 100,
    };
  }

  return {
    strategy,
    sourceWeights,
    minSources,
    maxSources,
    skipMemory,
    useReranking,
    reasoning,
  };
}

/**
 * Main query optimization function
 */
export async function optimizeQuery(
  query: string,
  options: OptimizationOptions = {}
): Promise<QueryOptimizationResult> {
  const startTime = Date.now();
  const {
    useCache = true,
    includeHistorical = false,
    targetReduction = 0.2,
    minConfidence = 0.5,
    timeout = 3000,
  } = options;

  // Check cache
  const cacheKey = generateOptimizationCacheKey(query);
  if (useCache && _optimizationCache.has(cacheKey)) {
    _metrics.cacheHits++;
    const cached = _optimizationCache.get(cacheKey)!;
    return { ...cached, cached: true };
  }

  _metrics.cacheMisses++;
  _metrics.totalOptimizations++;

  try {
    // Step 1: Classify query
    const { classification, metrics: classificationMetrics } = await classifyQueryWithMetrics(query);

    // Step 2: Analyze complexity
    const complexity = analyzeQueryComplexity(query, classification);

    // Step 3: Get historical performance (if enabled)
    let historical: HistoricalPerformance | undefined;
    if (includeHistorical) {
      // TODO: Implement historical performance lookup
      // For now, use default values
      historical = {
        similarQueryCount: 0,
        avgSuccessRate: 0.7,
        avgConfidence: 0.75,
        avgTokens: 1200,
        userSatisfaction: 0.8,
      };
    }

    // Step 4: Calculate confidence
    const confidence = calculateConfidenceScore(query, classification, complexity, historical);

    // Step 5: Optimize token usage
    const tokenOptimization = optimizeTokenUsage(complexity, confidence, classification);

    // Step 6: Determine routing strategy
    const routing = determineRoutingStrategy(complexity, confidence, classification, tokenOptimization);

    const optimizationTime = Date.now() - startTime;

    const result: QueryOptimizationResult = {
      query,
      classification,
      confidence,
      complexity,
      tokenOptimization,
      routing,
      historical,
      optimizationTime,
      cached: false,
    };

    // Cache the result
    _optimizationCache.set(cacheKey, result);

    // Update metrics
    _metrics.strategyCount[routing.strategy]++;
    _metrics.tokenSavings.push(tokenOptimization.estimatedSavings);
    _metrics.confidenceScores.push(confidence.overall);

    return result;
  } catch (error) {
    // Return fallback optimization on error
    const fallbackClassification: QueryClassification = {
      query,
      type: 'operational',
      confidence: 0.3,
      weights: { github: 1.0, web: 1.0 },
      reasoning: 'Fallback due to optimization error',
      cached: false,
    };

    const fallbackComplexity = analyzeQueryComplexity(query, fallbackClassification);
    const fallbackConfidence = calculateConfidenceScore(query, fallbackClassification, fallbackComplexity);
    const fallbackTokens = optimizeTokenUsage(fallbackComplexity, fallbackConfidence, fallbackClassification);
    const fallbackRouting = determineRoutingStrategy(fallbackComplexity, fallbackConfidence, fallbackClassification, fallbackTokens);

    return {
      query,
      classification: fallbackClassification,
      confidence: fallbackConfidence,
      complexity: fallbackComplexity,
      tokenOptimization: fallbackTokens,
      routing: fallbackRouting,
      optimizationTime: Date.now() - startTime,
      cached: false,
    };
  }
}

/**
 * Get optimization metrics
 */
export function getOptimizationMetrics(): OptimizationMetrics {
  const avgTokenSavings = _metrics.tokenSavings.length > 0
    ? _metrics.tokenSavings.reduce((sum, val) => sum + val, 0) / _metrics.tokenSavings.length
    : 0;

  const avgConfidence = _metrics.confidenceScores.length > 0
    ? _metrics.confidenceScores.reduce((sum, val) => sum + val, 0) / _metrics.confidenceScores.length
    : 0;

  const cacheHitRate = _metrics.cacheHits + _metrics.cacheMisses > 0
    ? _metrics.cacheHits / (_metrics.cacheHits + _metrics.cacheMisses)
    : 0;

  return {
    totalOptimizations: _metrics.totalOptimizations,
    cacheHitRate,
    avgTokenSavings: Math.round(avgTokenSavings),
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    strategyDistribution: { ..._metrics.strategyCount },
    qualityTrend: [], // TODO: Implement quality trend tracking
  };
}

/**
 * Clear optimization cache
 */
export function clearOptimizationCache(): void {
  _optimizationCache.clear();
  _metrics = {
    totalOptimizations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    strategyCount: { cached: 0, lightweight: 0, full: 0, fallback: 0 },
    tokenSavings: [],
    confidenceScores: [],
  };
}