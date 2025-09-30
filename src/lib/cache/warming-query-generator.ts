/**
 * Cache Warming Query Generation
 * Generates warming queries using different strategies and pattern analysis
 */

import { getTTLManager } from './advanced-ttl-manager';
import type { WarmingQuery } from './warming-strategy-manager';

/**
 * Cache Warming Query Generator
 */
export class WarmingQueryGenerator {
  private ttlManager = getTTLManager();

  /**
   * Generate queries based on usage patterns
   */
  async generateUsagePatternQueries(config: {
    minAccessCount: number;
    lookbackHours: number;
    maxQueries: number;
  }): Promise<WarmingQuery[]> {
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
  async generateFrequencyQueries(config: {
    frequencyThreshold: number;
    timeWindow: number;
    maxQueries: number;
  }): Promise<WarmingQuery[]> {
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

    return commonQueries
      .slice(0, config.maxQueries)
      .map((text, index) => ({
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
  async generatePredictiveQueries(config: {
    predictionWindow: number;
    confidenceThreshold: number;
    maxQueries: number;
  }): Promise<WarmingQuery[]> {
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

    return predictedQueries
      .slice(0, config.maxQueries)
      .map((text, index) => ({
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
  async generateDomainQueries(config: {
    domains: string[];
    queriesPerDomain: number;
  }): Promise<WarmingQuery[]> {
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
  async generateProactiveRefreshQueries(config: {
    refreshThreshold: number;
    minUsageCount: number;
  }): Promise<WarmingQuery[]> {
    // This would identify cache entries that are heavily used and nearing expiration
    // For now, return a placeholder implementation
    const queries: WarmingQuery[] = [];

    // Get usage patterns from TTL manager
    const patterns = this.ttlManager.exportPatterns();
    const now = Date.now();

    Object.entries(patterns).forEach(([key, pattern]) => {
      // Check if entry is nearing expiration and has high usage
      const hoursOld = (now - new Date(pattern.lastAccessed).getTime()) / (1000 * 60 * 60);
      const isNearExpiration = hoursOld / 24 > config.refreshThreshold; // Assuming 24h default TTL
      const hasHighUsage = pattern.accessCount >= config.minUsageCount;

      if (isNearExpiration && hasHighUsage) {
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

    return queries.sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  /**
   * Generate queries for specific user or session
   */
  async generatePersonalizedQueries(
    userId?: string,
    sessionId?: string,
    maxQueries: number = 10
  ): Promise<WarmingQuery[]> {
    const queries: WarmingQuery[] = [];

    // This would analyze user-specific patterns
    // For now, return some common personalized queries
    const personalizedQueries = [
      'recent code changes',
      'my pull requests',
      'assigned issues',
      'team notifications',
      'project status'
    ];

    return personalizedQueries
      .slice(0, maxQueries)
      .map((text, index) => ({
        text,
        type: 'search' as const,
        priority: 8 - index,
        estimatedValue: 8 - index,
        source: 'manual' as const,
        userId,
        sessionId
      }));
  }

  /**
   * Generate contextual queries based on current system state
   */
  async generateContextualQueries(context: {
    currentTime?: Date;
    userActivity?: string;
    systemLoad?: number;
    recentQueries?: string[];
  }): Promise<WarmingQuery[]> {
    const queries: WarmingQuery[] = [];
    const now = context.currentTime || new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Time-based queries
    if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Business hours on weekdays
      queries.push(
        ...['daily standup notes', 'code review checklist', 'deployment status']
          .map((text, index) => ({
            text,
            type: 'search' as const,
            priority: 7 - index,
            estimatedValue: 7 - index,
            source: 'predictive' as const
          }))
      );
    }

    // Activity-based queries
    if (context.userActivity === 'coding') {
      queries.push(
        ...['function examples', 'best practices', 'common patterns']
          .map((text, index) => ({
            text,
            type: 'search' as const,
            priority: 6 - index,
            estimatedValue: 6 - index,
            source: 'predictive' as const
          }))
      );
    }

    // System load based queries
    if (context.systemLoad && context.systemLoad > 0.8) {
      queries.push({
        text: 'performance optimization',
        type: 'search',
        priority: 9,
        estimatedValue: 9,
        source: 'predictive'
      });
    }

    // Related queries based on recent activity
    if (context.recentQueries && context.recentQueries.length > 0) {
      const relatedQueries = this.generateRelatedQueries(context.recentQueries);
      queries.push(...relatedQueries);
    }

    return queries;
  }

  /**
   * Generate related queries based on query history
   */
  private generateRelatedQueries(recentQueries: string[]): WarmingQuery[] {
    const related: WarmingQuery[] = [];

    recentQueries.forEach((query, index) => {
      // Simple related query generation
      const queryTerms = query.toLowerCase().split(' ');

      if (queryTerms.includes('react')) {
        related.push({
          text: 'React hooks patterns',
          type: 'search',
          priority: 5 - index,
          estimatedValue: 5 - index,
          source: 'predictive'
        });
      }

      if (queryTerms.includes('typescript')) {
        related.push({
          text: 'TypeScript advanced types',
          type: 'search',
          priority: 5 - index,
          estimatedValue: 5 - index,
          source: 'predictive'
        });
      }

      if (queryTerms.includes('api')) {
        related.push({
          text: 'API error handling',
          type: 'search',
          priority: 5 - index,
          estimatedValue: 5 - index,
          source: 'predictive'
        });
      }
    });

    return related;
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

  /**
   * Validate and filter generated queries
   */
  validateQueries(queries: WarmingQuery[]): {
    valid: WarmingQuery[];
    invalid: Array<{ query: WarmingQuery; reason: string }>;
  } {
    const valid: WarmingQuery[] = [];
    const invalid: Array<{ query: WarmingQuery; reason: string }> = [];

    queries.forEach(query => {
      // Basic validation
      if (!query.text || query.text.trim().length === 0) {
        invalid.push({ query, reason: 'Empty query text' });
        return;
      }

      if (query.text.length > 500) {
        invalid.push({ query, reason: 'Query text too long' });
        return;
      }

      if (query.priority < 1 || query.priority > 10) {
        invalid.push({ query, reason: 'Invalid priority range' });
        return;
      }

      if (query.estimatedValue < 0) {
        invalid.push({ query, reason: 'Negative estimated value' });
        return;
      }

      valid.push(query);
    });

    return { valid, invalid };
  }

  /**
   * Deduplicate queries based on text similarity
   */
  deduplicateQueries(queries: WarmingQuery[], similarityThreshold: number = 0.8): WarmingQuery[] {
    const deduplicated: WarmingQuery[] = [];
    const processed = new Set<string>();

    queries.forEach(query => {
      const normalized = query.text.toLowerCase().trim();

      // Check if we've seen a very similar query
      let isDuplicate = false;
      for (const processedQuery of processed) {
        if (this.calculateTextSimilarity(normalized, processedQuery) > similarityThreshold) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        deduplicated.push(query);
        processed.add(normalized);
      }
    });

    return deduplicated;
  }

  /**
   * Calculate simple text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Get query generation statistics
   */
  getGenerationStatistics(): {
    totalPatternsAnalyzed: number;
    highValuePatterns: number;
    recentPatterns: number;
    averagePatternAge: number;
  } {
    const patterns = this.ttlManager.exportPatterns();
    const now = Date.now();

    let totalAge = 0;
    let highValueCount = 0;
    let recentCount = 0;

    Object.values(patterns).forEach(pattern => {
      const ageHours = (now - new Date(pattern.lastAccessed).getTime()) / (1000 * 60 * 60);
      totalAge += ageHours;

      if (this.estimateQueryValue(pattern) > 10) {
        highValueCount++;
      }

      if (ageHours < 24) { // Recent = within last 24 hours
        recentCount++;
      }
    });

    const totalPatterns = Object.keys(patterns).length;

    return {
      totalPatternsAnalyzed: totalPatterns,
      highValuePatterns: highValueCount,
      recentPatterns: recentCount,
      averagePatternAge: totalPatterns > 0 ? totalAge / totalPatterns : 0
    };
  }
}