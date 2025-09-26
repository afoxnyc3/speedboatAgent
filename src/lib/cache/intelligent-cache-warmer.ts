/**
 * Intelligent Cache Warming Service
 * Analyzes usage patterns and proactively warms cache with high-value queries
 */

import { getEnhancedCacheManager } from './enhanced-redis-manager';
import { getTTLManager } from './advanced-ttl-manager';
import { getEmbeddingService } from './embedding-service';

export interface WarmingStrategy {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  config: Record<string, any>;
}

export interface WarmingQuery {
  text: string;
  type: 'embedding' | 'search' | 'classification' | 'contextual';
  priority: number;
  sessionId?: string;
  userId?: string;
  context?: string;
  estimatedValue: number;
  source: 'usage_pattern' | 'frequency_analysis' | 'predictive' | 'manual';
}

export interface WarmingResult {
  strategy: string;
  totalQueries: number;
  successful: number;
  failed: number;
  skipped: number;
  alreadyCached: number;
  executionTime: number;
  estimatedImpact: {
    hitRateImprovement: number;
    responseTimeImprovement: number;
    costSavings: number;
  };
}

/**
 * Intelligent cache warming service with pattern analysis
 */
export class IntelligentCacheWarmer {
  private enhancedCache = getEnhancedCacheManager();
  private ttlManager = getTTLManager();
  private embeddingService = getEmbeddingService();

  private readonly strategies: Record<string, WarmingStrategy> = {
    usagePatterns: {
      name: 'Usage Pattern Analysis',
      description: 'Warm cache based on historical usage patterns',
      priority: 1,
      enabled: true,
      config: {
        minAccessCount: 10,
        lookbackHours: 168, // 7 days
        maxQueries: 50
      }
    },
    frequencyAnalysis: {
      name: 'Query Frequency Analysis',
      description: 'Identify and cache frequently requested queries',
      priority: 2,
      enabled: true,
      config: {
        frequencyThreshold: 5,
        timeWindow: 24, // hours
        maxQueries: 30
      }
    },
    predictiveWarming: {
      name: 'Predictive Cache Warming',
      description: 'Predict likely queries based on current trends',
      priority: 3,
      enabled: true,
      config: {
        predictionWindow: 4, // hours
        confidenceThreshold: 0.7,
        maxQueries: 20
      }
    },
    domainSpecific: {
      name: 'Domain-Specific Warming',
      description: 'Cache domain-specific queries based on current context',
      priority: 4,
      enabled: true,
      config: {
        domains: ['technical', 'business', 'operational'],
        queriesPerDomain: 10
      }
    },
    proactiveRefresh: {
      name: 'Proactive Refresh',
      description: 'Refresh entries nearing expiration with high usage',
      priority: 5,
      enabled: true,
      config: {
        refreshThreshold: 0.8, // Refresh when 80% of TTL elapsed
        minUsageCount: 5
      }
    }
  };

  /**
   * Execute intelligent cache warming with all enabled strategies
   */
  async executeIntelligentWarming(): Promise<WarmingResult[]> {
    const results: WarmingResult[] = [];

    // Execute strategies in priority order
    const enabledStrategies = Object.entries(this.strategies)
      .filter(([_, strategy]) => strategy.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority);

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
        queries = await this.generateUsagePatternQueries(strategy.config);
        break;
      case 'frequencyAnalysis':
        queries = await this.generateFrequencyQueries(strategy.config);
        break;
      case 'predictiveWarming':
        queries = await this.generatePredictiveQueries(strategy.config);
        break;
      case 'domainSpecific':
        queries = await this.generateDomainQueries(strategy.config);
        break;
      case 'proactiveRefresh':
        queries = await this.generateProactiveRefreshQueries(strategy.config);
        break;
      default:
        throw new Error(`Unknown strategy: ${strategyName}`);
    }

    // Execute warming for generated queries
    const warmingResult = await this.executeWarmingQueries(queries);

    const executionTime = Date.now() - startTime;
    const estimatedImpact = this.estimateWarmingImpact(queries, warmingResult);

    return {
      strategy: strategyName,
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
   * Generate queries based on usage patterns
   */
  private async generateUsagePatternQueries(config: any): Promise<WarmingQuery[]> {
    const usageStats = this.ttlManager.getUsageStats();
    const exportedPatterns = this.ttlManager.exportPatterns();

    const queries: WarmingQuery[] = [];

    // Convert usage patterns to warming queries
    Object.entries(exportedPatterns).forEach(([key, pattern]) => {
      if (pattern.accessCount >= config.minAccessCount) {
        // Extract original query from key (simplified)
        const queryText = this.extractQueryFromKey(key);
        if (queryText) {
          queries.push({
            text: queryText,
            type: this.inferQueryType(queryText),
            priority: this.calculatePriorityFromPattern(pattern),
            estimatedValue: this.estimateQueryValue(pattern),
            source: 'usage_pattern'
          });
        }
      }
    });

    // Sort by estimated value and limit
    return queries
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, config.maxQueries);
  }

  /**
   * Generate queries based on frequency analysis
   */
  private async generateFrequencyQueries(config: any): Promise<WarmingQuery[]> {
    // This would analyze recent query logs to identify frequent patterns
    // For now, return common technical queries that are likely to be frequent
    const commonQueries = [
      'React hooks implementation',
      'TypeScript interface definition',
      'Next.js API routes setup',
      'Database connection configuration',
      'Authentication middleware',
      'Error handling patterns',
      'Testing framework setup',
      'Performance optimization techniques',
      'Security best practices',
      'Deployment configuration'
    ];

    return commonQueries.map((text, index) => ({
      text,
      type: 'search' as const,
      priority: 8 - Math.floor(index / 2), // Decreasing priority
      estimatedValue: 9 - index,
      source: 'frequency_analysis' as const
    }));
  }

  /**
   * Generate predictive queries based on trends
   */
  private async generatePredictiveQueries(config: any): Promise<WarmingQuery[]> {
    // This would use ML/statistical models to predict likely queries
    // For now, return queries based on time of day and common patterns
    const hour = new Date().getHours();
    let predictedQueries: string[] = [];

    if (hour >= 9 && hour <= 17) {
      // Business hours - more technical queries
      predictedQueries = [
        'code review best practices',
        'API documentation',
        'debugging techniques',
        'performance monitoring',
        'integration testing'
      ];
    } else {
      // Off hours - more learning/research queries
      predictedQueries = [
        'architecture patterns',
        'design principles',
        'technology roadmap',
        'learning resources',
        'industry trends'
      ];
    }

    return predictedQueries.map((text, index) => ({
      text,
      type: 'search' as const,
      priority: 7 - index,
      estimatedValue: 7 - index,
      source: 'predictive' as const
    }));
  }

  /**
   * Generate domain-specific queries
   */
  private async generateDomainQueries(config: any): Promise<WarmingQuery[]> {
    const queries: WarmingQuery[] = [];

    const domainQueries = {
      technical: [
        'function implementation',
        'class definition',
        'module structure',
        'dependency management',
        'build configuration'
      ],
      business: [
        'product requirements',
        'user stories',
        'feature specifications',
        'acceptance criteria',
        'business logic'
      ],
      operational: [
        'deployment process',
        'monitoring setup',
        'backup procedures',
        'scaling strategies',
        'maintenance tasks'
      ]
    };

    for (const domain of config.domains) {
      const domainQueriesList = domainQueries[domain] || [];
      for (let i = 0; i < Math.min(domainQueriesList.length, config.queriesPerDomain); i++) {
        queries.push({
          text: domainQueriesList[i],
          type: 'search',
          priority: 6,
          estimatedValue: 6,
          source: 'manual',
          context: domain
        });
      }
    }

    return queries;
  }

  /**
   * Generate proactive refresh queries
   */
  private async generateProactiveRefreshQueries(config: any): Promise<WarmingQuery[]> {
    // This would identify cache entries that are heavily used and nearing expiration
    // For now, return a placeholder implementation
    return [];
  }

  /**
   * Execute warming for a batch of queries
   */
  private async executeWarmingQueries(queries: WarmingQuery[]): Promise<{
    warmed: number;
    failed: number;
    skipped: number;
    alreadyCached: number;
  }> {
    let warmed = 0;
    let failed = 0;
    let skipped = 0;
    let alreadyCached = 0;

    // Process queries in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchPromises = batch.map(query => this.processSingleQuery(query));

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const outcome = result.value;
          switch (outcome) {
            case 'warmed': warmed++; break;
            case 'failed': failed++; break;
            case 'skipped': skipped++; break;
            case 'already_cached': alreadyCached++; break;
          }
        } else {
          failed++;
        }
      });

      // Small delay between batches
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { warmed, failed, skipped, alreadyCached };
  }

  /**
   * Process a single warming query
   */
  private async processSingleQuery(
    query: WarmingQuery
  ): Promise<'warmed' | 'failed' | 'skipped' | 'already_cached'> {
    try {
      if (query.type === 'embedding') {
        // Generate and cache embedding
        const result = await this.embeddingService.generateEmbedding(query.text, {
          sessionId: query.sessionId,
          userId: query.userId,
          context: query.context
        });

        return result.cached ? 'already_cached' : 'warmed';
      } else {
        // For other types, check if already cached
        const cached = await this.enhancedCache.getOptimized(
          query.text,
          query.type,
          {
            sessionId: query.sessionId,
            context: query.context
          }
        );

        if (cached) {
          return 'already_cached';
        }

        // Simulate cache warming (in real implementation, this would
        // trigger actual search/classification to generate and cache result)
        const mockData = this.generateMockData(query.type);
        const success = await this.enhancedCache.setOptimized(
          query.text,
          mockData,
          query.type,
          {
            sessionId: query.sessionId,
            priority: query.priority
          }
        );

        return success ? 'warmed' : 'failed';
      }
    } catch (error) {
      console.error('Query warming error:', error);
      return 'failed';
    }
  }

  /**
   * Generate mock data for cache warming
   */
  private generateMockData(type: string): any {
    switch (type) {
      case 'search':
        return {
          documents: [],
          metadata: { resultCount: 0, searchTime: 0 },
          cached: true
        };
      case 'classification':
        return {
          type: 'technical',
          confidence: 0.8,
          weights: { github: 1.5, web: 0.5 }
        };
      case 'contextual':
        return {
          enhancedQuery: 'enhanced version',
          context: 'mock context'
        };
      default:
        return {};
    }
  }

  /**
   * Helper methods for pattern analysis
   */
  private extractQueryFromKey(key: string): string | null {
    // Simplified key extraction - in reality, this would be more sophisticated
    const parts = key.split(':');
    return parts.length > 2 ? parts[2] : null;
  }

  private inferQueryType(queryText: string): 'embedding' | 'search' | 'classification' | 'contextual' {
    // Simple heuristics for query type inference
    if (queryText.includes('classify') || queryText.includes('type')) {
      return 'classification';
    }
    if (queryText.includes('context') || queryText.includes('memory')) {
      return 'contextual';
    }
    if (queryText.includes('embed') || queryText.includes('vector')) {
      return 'embedding';
    }
    return 'search';
  }

  private calculatePriorityFromPattern(pattern: any): number {
    let priority = 5; // Base priority

    // Higher access count = higher priority
    priority += Math.log10(pattern.accessCount + 1);

    // More recent access = higher priority
    const hoursOld = (Date.now() - new Date(pattern.lastAccessed).getTime()) / (1000 * 60 * 60);
    priority += Math.max(0, 5 - hoursOld / 24);

    // Better hit rate = higher priority
    priority += pattern.hitRate * 2;

    return Math.min(10, Math.max(1, Math.round(priority)));
  }

  private estimateQueryValue(pattern: any): number {
    // Combine access count, recency, and hit rate
    const accessScore = Math.log10(pattern.accessCount + 1) * 2;
    const recencyScore = Math.max(0, 10 - (Date.now() - new Date(pattern.lastAccessed).getTime()) / (1000 * 60 * 60));
    const hitRateScore = pattern.hitRate * 5;

    return accessScore + recencyScore + hitRateScore;
  }

  private estimateWarmingImpact(queries: WarmingQuery[], result: any): {
    hitRateImprovement: number;
    responseTimeImprovement: number;
    costSavings: number;
  } {
    const totalValue = queries.reduce((sum, q) => sum + q.estimatedValue, 0);
    const successRate = result.warmed / Math.max(1, queries.length);

    return {
      hitRateImprovement: (totalValue * successRate) / 1000, // Normalized
      responseTimeImprovement: result.warmed * 50, // Estimated ms saved per cached query
      costSavings: result.warmed * 0.001 // Estimated cost savings per cached query
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
    const recommendations: string[] = [];
    const currentMetrics = this.enhancedCache.getMetrics();

    // Analyze current performance
    Object.entries(currentMetrics).forEach(([type, metrics]) => {
      if (metrics.hitRate < 0.7) {
        recommendations.push(`Increase warming frequency for ${type} queries (current hit rate: ${(metrics.hitRate * 100).toFixed(1)}%)`);
      }
      if (metrics.compressionStats.compressionRate < 0.5) {
        recommendations.push(`Enable compression for ${type} cache entries for memory savings`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal - continue current warming strategy');
    }

    // Calculate next warming time (example: every 4 hours)
    const nextWarmingTime = new Date(Date.now() + 4 * 60 * 60 * 1000);

    // Estimate queries and benefit
    const usageStats = this.ttlManager.getUsageStats();
    const expectedQueries = Math.min(50, usageStats.highUsageKeys * 2);
    const estimatedBenefit = expectedQueries * 0.02; // 2% hit rate improvement per warmed query

    return {
      recommendations,
      nextWarmingTime,
      expectedQueries,
      estimatedBenefit
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