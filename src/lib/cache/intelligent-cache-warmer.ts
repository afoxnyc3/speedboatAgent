/**
 * Intelligent Cache Warming Service - Main Entry Point
 * Integrates strategy management, query generation, and execution analytics
 */

import {
  WarmingStrategyManager,
  type WarmingStrategy,
  type WarmingQuery,
  type WarmingResult
} from './warming-strategy-manager';
import { WarmingQueryGenerator } from './warming-query-generator';
import { WarmingExecutionAnalytics } from './warming-execution-analytics';

// Re-export types for backward compatibility
export type {
  WarmingStrategy,
  WarmingQuery,
  WarmingResult
} from './warming-strategy-manager';

/**
 * Intelligent cache warming service with pattern analysis
 */
export class IntelligentCacheWarmer {
  private strategyManager = new WarmingStrategyManager();
  private queryGenerator = new WarmingQueryGenerator();
  private executionAnalytics = new WarmingExecutionAnalytics();

  /**
   * Execute intelligent cache warming with all enabled strategies
   */
  async executeIntelligentWarming(): Promise<WarmingResult[]> {
    const results: WarmingResult[] = [];

    // Get enabled strategies in priority order
    const enabledStrategies = this.strategyManager.getEnabledStrategies();

    for (const [strategyName, strategy] of enabledStrategies) {
      try {
        const result = await this.executeStrategy(strategyName, strategy);
        results.push(result);
      } catch (error) {
        console.error(`Cache warming strategy ${strategyName} failed:`, error);
        results.push({
          strategy: strategyName,
          totalQueries: 0,
          successful: 0,
          failed: 1,
          skipped: 0,
          alreadyCached: 0,
          executionTime: 0,
          estimatedImpact: {
            hitRateImprovement: 0,
            responseTimeImprovement: 0,
            costSavings: 0
          }
        });
      }
    }

    return results;
  }

  /**
   * Execute specific warming strategy
   */
  private async executeStrategy(
    strategyName: string,
    strategy: WarmingStrategy
  ): Promise<WarmingResult> {
    const startTime = Date.now();

    let queries: WarmingQuery[] = [];

    switch (strategyName) {
      case 'usagePatterns':
        queries = await this.queryGenerator.generateUsagePatternQueries(strategy.config as { minAccessCount: number; lookbackHours: number; maxQueries: number });
        break;
      case 'frequencyAnalysis':
        queries = await this.queryGenerator.generateFrequencyQueries(strategy.config as { frequencyThreshold: number; timeWindow: number; maxQueries: number });
        break;
      case 'predictiveWarming':
        queries = await this.queryGenerator.generatePredictiveQueries(strategy.config as { predictionWindow: number; confidenceThreshold: number; maxQueries: number });
        break;
      case 'domainSpecific':
        queries = await this.queryGenerator.generateDomainQueries(strategy.config as { domains: string[]; queriesPerDomain: number });
        break;
      case 'proactiveRefresh':
        queries = await this.queryGenerator.generateProactiveRefreshQueries(strategy.config as { refreshThreshold: number; minUsageCount: number });
        break;
      default:
        throw new Error(`Unknown strategy: ${strategyName}`);
    }

    // Validate and deduplicate queries
    const { valid: validQueries } = this.queryGenerator.validateQueries(queries);
    const dedupedQueries = this.queryGenerator.deduplicateQueries(validQueries);

    // Execute warming for generated queries
    const warmingResult = await this.executionAnalytics.executeWarmingQueries(dedupedQueries);

    const executionTime = Date.now() - startTime;
    const estimatedImpact = this.executionAnalytics.estimateWarmingImpact(dedupedQueries, warmingResult);

    return {
      strategy: strategyName,
      totalQueries: dedupedQueries.length,
      successful: warmingResult.warmed,
      failed: warmingResult.failed,
      skipped: warmingResult.skipped,
      alreadyCached: warmingResult.alreadyCached,
      executionTime,
      estimatedImpact
    };
  }

  /**
   * Get warming statistics and recommendations
   */
  getWarmingRecommendations(): {
    recommendations: string[];
    nextWarmingTime: Date;
    expectedQueries: number;
    estimatedBenefit: number;
  } {
    return this.executionAnalytics.getWarmingRecommendations();
  }

  /**
   * Execute warming for specific user or session
   */
  async executePersonalizedWarming(
    userId?: string,
    sessionId?: string,
    maxQueries: number = 10
  ): Promise<WarmingResult> {
    const startTime = Date.now();

    const queries = await this.queryGenerator.generatePersonalizedQueries(
      userId,
      sessionId,
      maxQueries
    );

    const warmingResult = await this.executionAnalytics.executeWarmingQueries(queries);
    const executionTime = Date.now() - startTime;
    const estimatedImpact = this.executionAnalytics.estimateWarmingImpact(queries, warmingResult);

    return {
      strategy: 'personalized',
      totalQueries: queries.length,
      successful: warmingResult.warmed,
      failed: warmingResult.failed,
      skipped: warmingResult.skipped,
      alreadyCached: warmingResult.alreadyCached,
      executionTime,
      estimatedImpact
    };
  }

  /**
   * Execute contextual warming based on current system state
   */
  async executeContextualWarming(context: {
    currentTime?: Date;
    userActivity?: string;
    systemLoad?: number;
    recentQueries?: string[];
  }): Promise<WarmingResult> {
    const startTime = Date.now();

    const queries = await this.queryGenerator.generateContextualQueries(context);
    const warmingResult = await this.executionAnalytics.executeWarmingQueries(queries);
    const executionTime = Date.now() - startTime;
    const estimatedImpact = this.executionAnalytics.estimateWarmingImpact(queries, warmingResult);

    return {
      strategy: 'contextual',
      totalQueries: queries.length,
      successful: warmingResult.warmed,
      failed: warmingResult.failed,
      skipped: warmingResult.skipped,
      alreadyCached: warmingResult.alreadyCached,
      executionTime,
      estimatedImpact
    };
  }

  // Strategy Management Methods
  /**
   * Get all available strategies
   */
  getStrategies(): Record<string, WarmingStrategy> {
    return this.strategyManager.getStrategies();
  }

  /**
   * Update strategy configuration
   */
  updateStrategy(name: string, updates: Partial<WarmingStrategy>): boolean {
    return this.strategyManager.updateStrategy(name, updates);
  }

  /**
   * Enable or disable a strategy
   */
  setStrategyEnabled(name: string, enabled: boolean): boolean {
    return this.strategyManager.setStrategyEnabled(name, enabled);
  }

  /**
   * Get strategy statistics
   */
  getStrategyStatistics() {
    return this.strategyManager.getStrategyStatistics();
  }

  // Query Generation Methods
  /**
   * Generate queries for specific strategy
   */
  async generateQueriesForStrategy(
    strategyName: string,
    config?: Record<string, any>
  ): Promise<WarmingQuery[]> {
    const strategy = this.strategyManager.getStrategy(strategyName);
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    const strategyConfig = config || strategy.config;

    switch (strategyName) {
      case 'usagePatterns':
        return this.queryGenerator.generateUsagePatternQueries(strategyConfig as { minAccessCount: number; lookbackHours: number; maxQueries: number });
      case 'frequencyAnalysis':
        return this.queryGenerator.generateFrequencyQueries(strategyConfig as { frequencyThreshold: number; timeWindow: number; maxQueries: number });
      case 'predictiveWarming':
        return this.queryGenerator.generatePredictiveQueries(strategyConfig as { predictionWindow: number; confidenceThreshold: number; maxQueries: number });
      case 'domainSpecific':
        return this.queryGenerator.generateDomainQueries(strategyConfig as { domains: string[]; queriesPerDomain: number });
      case 'proactiveRefresh':
        return this.queryGenerator.generateProactiveRefreshQueries(strategyConfig as { refreshThreshold: number; minUsageCount: number });
      default:
        throw new Error(`Unknown strategy: ${strategyName}`);
    }
  }

  /**
   * Get query generation statistics
   */
  getQueryGenerationStatistics() {
    return this.queryGenerator.getGenerationStatistics();
  }

  // Analytics and Monitoring Methods
  /**
   * Analyze warming performance over time
   */
  async analyzeWarmingPerformance(timeRangeHours: number = 24) {
    return this.executionAnalytics.analyzeWarmingPerformance(timeRangeHours);
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(timeRangeHours: number = 168) {
    return this.executionAnalytics.generatePerformanceReport(timeRangeHours);
  }

  /**
   * Calculate cost-benefit analysis for warming strategies
   */
  calculateCostBenefit(
    queries: WarmingQuery[],
    executionResult: any,
    executionTimeMs: number
  ) {
    return this.executionAnalytics.calculateCostBenefit(queries, executionResult, executionTimeMs);
  }

  /**
   * Get real-time warming metrics
   */
  getRealTimeMetrics() {
    return this.executionAnalytics.getRealTimeMetrics();
  }

  /**
   * Predict optimal warming schedule
   */
  predictOptimalSchedule(historicalData?: { hour: number; demand: number }[]) {
    return this.executionAnalytics.predictOptimalSchedule(historicalData);
  }

  /**
   * Monitor warming job execution
   */
  async monitorWarmingExecution(
    jobId: string,
    onProgress?: (progress: { completed: number; total: number; status: string }) => void,
    onComplete?: (result: any) => void
  ) {
    return this.executionAnalytics.monitorWarmingExecution(jobId, onProgress, onComplete);
  }

  // Direct access to modules for advanced usage
  /**
   * Get strategy manager instance
   */
  getStrategyManager(): WarmingStrategyManager {
    return this.strategyManager;
  }

  /**
   * Get query generator instance
   */
  getQueryGenerator(): WarmingQueryGenerator {
    return this.queryGenerator;
  }

  /**
   * Get execution analytics instance
   */
  getExecutionAnalytics(): WarmingExecutionAnalytics {
    return this.executionAnalytics;
  }

  /**
   * Comprehensive warming execution with full monitoring
   */
  async executeComprehensiveWarming(options: {
    strategies?: string[];
    maxQueriesPerStrategy?: number;
    includePersonalized?: boolean;
    includeContextual?: boolean;
    userId?: string;
    sessionId?: string;
    monitorProgress?: boolean;
  } = {}): Promise<{
    results: WarmingResult[];
    summary: {
      totalQueries: number;
      totalWarmed: number;
      totalFailed: number;
      totalSkipped: number;
      totalAlreadyCached: number;
      executionTime: number;
      estimatedImpact: {
        hitRateImprovement: number;
        responseTimeImprovement: number;
        costSavings: number;
      };
    };
    recommendations: string[];
  }> {
    const startTime = Date.now();
    const results: WarmingResult[] = [];

    // Execute standard strategies
    const enabledStrategies = options.strategies
      ? options.strategies.map(name => [name, this.strategyManager.getStrategy(name)]).filter(([_, s]) => s)
      : this.strategyManager.getEnabledStrategies();

    for (const [strategyName, strategy] of enabledStrategies as Array<[string, WarmingStrategy]>) {
      if (strategy) {
        const result = await this.executeStrategy(strategyName, strategy);
        results.push(result);
      }
    }

    // Execute personalized warming if requested
    if (options.includePersonalized) {
      const personalizedResult = await this.executePersonalizedWarming(
        options.userId,
        options.sessionId,
        options.maxQueriesPerStrategy
      );
      results.push(personalizedResult);
    }

    // Execute contextual warming if requested
    if (options.includeContextual) {
      const contextualResult = await this.executeContextualWarming({
        currentTime: new Date(),
        userActivity: 'warming'
      });
      results.push(contextualResult);
    }

    // Calculate summary statistics
    const summary = {
      totalQueries: results.reduce((sum, r) => sum + r.totalQueries, 0),
      totalWarmed: results.reduce((sum, r) => sum + r.successful, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      totalAlreadyCached: results.reduce((sum, r) => sum + r.alreadyCached, 0),
      executionTime: Date.now() - startTime,
      estimatedImpact: {
        hitRateImprovement: results.reduce((sum, r) => sum + r.estimatedImpact.hitRateImprovement, 0),
        responseTimeImprovement: results.reduce((sum, r) => sum + r.estimatedImpact.responseTimeImprovement, 0),
        costSavings: results.reduce((sum, r) => sum + r.estimatedImpact.costSavings, 0)
      }
    };

    const recommendations = this.getWarmingRecommendations().recommendations;

    return {
      results,
      summary,
      recommendations
    };
  }
}

// Singleton instance
let intelligentWarmer: IntelligentCacheWarmer | null = null;

/**
 * Get singleton intelligent cache warmer instance
 */
export function getIntelligentCacheWarmer(): IntelligentCacheWarmer {
  if (!intelligentWarmer) {
    intelligentWarmer = new IntelligentCacheWarmer();
  }
  return intelligentWarmer;
}

/**
 * Reset singleton for testing purposes
 */
export function resetIntelligentCacheWarmer(): void {
  intelligentWarmer = null;
}

// Export module classes for direct usage if needed
export { WarmingStrategyManager } from './warming-strategy-manager';
export { WarmingQueryGenerator } from './warming-query-generator';
export { WarmingExecutionAnalytics } from './warming-execution-analytics';