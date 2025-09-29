/**
 * Cache Warming Strategy Management
 * Manages warming strategies, configurations, and execution coordination
 */

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

export interface StrategyExecutionResult {
  warmed: number;
  failed: number;
  skipped: number;
  alreadyCached: number;
}

/**
 * Cache Warming Strategy Manager
 */
export class WarmingStrategyManager {
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
   * Get all available strategies
   */
  getStrategies(): Record<string, WarmingStrategy> {
    return { ...this.strategies };
  }

  /**
   * Get enabled strategies sorted by priority
   */
  getEnabledStrategies(): Array<[string, WarmingStrategy]> {
    return Object.entries(this.strategies)
      .filter(([_, strategy]) => strategy.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority);
  }

  /**
   * Get specific strategy by name
   */
  getStrategy(name: string): WarmingStrategy | null {
    return this.strategies[name] || null;
  }

  /**
   * Update strategy configuration
   */
  updateStrategy(name: string, updates: Partial<WarmingStrategy>): boolean {
    if (!this.strategies[name]) {
      return false;
    }

    this.strategies[name] = {
      ...this.strategies[name],
      ...updates,
      config: {
        ...this.strategies[name].config,
        ...(updates.config || {})
      }
    };

    return true;
  }

  /**
   * Enable or disable a strategy
   */
  setStrategyEnabled(name: string, enabled: boolean): boolean {
    if (!this.strategies[name]) {
      return false;
    }

    this.strategies[name].enabled = enabled;
    return true;
  }

  /**
   * Add a new custom strategy
   */
  addStrategy(name: string, strategy: WarmingStrategy): boolean {
    if (this.strategies[name]) {
      return false; // Strategy already exists
    }

    this.strategies[name] = { ...strategy };
    return true;
  }

  /**
   * Remove a strategy
   */
  removeStrategy(name: string): boolean {
    if (!this.strategies[name]) {
      return false;
    }

    delete this.strategies[name];
    return true;
  }

  /**
   * Get strategy statistics
   */
  getStrategyStatistics(): {
    totalStrategies: number;
    enabledStrategies: number;
    averagePriority: number;
    mostImportantStrategy: string;
    strategyBreakdown: Record<string, { enabled: boolean; priority: number }>;
  } {
    const strategies = Object.entries(this.strategies);
    const enabled = strategies.filter(([_, s]) => s.enabled);

    const averagePriority = enabled.length > 0
      ? enabled.reduce((sum, [_, s]) => sum + s.priority, 0) / enabled.length
      : 0;

    const mostImportant = enabled.length > 0
      ? enabled.reduce((best, [name, strategy]) =>
          strategy.priority < best[1].priority ? [name, strategy] : best
        )[0]
      : 'none';

    const strategyBreakdown: Record<string, { enabled: boolean; priority: number }> = {};
    strategies.forEach(([name, strategy]) => {
      strategyBreakdown[name] = {
        enabled: strategy.enabled,
        priority: strategy.priority
      };
    });

    return {
      totalStrategies: strategies.length,
      enabledStrategies: enabled.length,
      averagePriority,
      mostImportantStrategy: mostImportant,
      strategyBreakdown
    };
  }

  /**
   * Validate strategy configuration
   */
  validateStrategyConfig(name: string, config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.strategies[name]) {
      errors.push(`Strategy '${name}' does not exist`);
      return { valid: false, errors };
    }

    // Basic validation rules for each strategy type
    switch (name) {
      case 'usagePatterns':
        if (typeof config.minAccessCount !== 'number' || config.minAccessCount < 1) {
          errors.push('minAccessCount must be a positive number');
        }
        if (typeof config.lookbackHours !== 'number' || config.lookbackHours < 1) {
          errors.push('lookbackHours must be a positive number');
        }
        if (typeof config.maxQueries !== 'number' || config.maxQueries < 1) {
          errors.push('maxQueries must be a positive number');
        }
        break;

      case 'frequencyAnalysis':
        if (typeof config.frequencyThreshold !== 'number' || config.frequencyThreshold < 1) {
          errors.push('frequencyThreshold must be a positive number');
        }
        if (typeof config.timeWindow !== 'number' || config.timeWindow < 1) {
          errors.push('timeWindow must be a positive number');
        }
        break;

      case 'predictiveWarming':
        if (typeof config.confidenceThreshold !== 'number' ||
            config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
          errors.push('confidenceThreshold must be between 0 and 1');
        }
        break;

      case 'domainSpecific':
        if (!Array.isArray(config.domains) || config.domains.length === 0) {
          errors.push('domains must be a non-empty array');
        }
        if (typeof config.queriesPerDomain !== 'number' || config.queriesPerDomain < 1) {
          errors.push('queriesPerDomain must be a positive number');
        }
        break;

      case 'proactiveRefresh':
        if (typeof config.refreshThreshold !== 'number' ||
            config.refreshThreshold < 0 || config.refreshThreshold > 1) {
          errors.push('refreshThreshold must be between 0 and 1');
        }
        if (typeof config.minUsageCount !== 'number' || config.minUsageCount < 1) {
          errors.push('minUsageCount must be a positive number');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended strategy configuration based on system state
   */
  getRecommendedConfiguration(systemMetrics?: {
    memoryPressure: number;
    hitRate: number;
    avgResponseTime: number;
  }): Record<string, Partial<WarmingStrategy>> {
    const recommendations: Record<string, Partial<WarmingStrategy>> = {};

    if (systemMetrics) {
      // Adjust strategies based on system performance
      if (systemMetrics.memoryPressure > 0.8) {
        // High memory pressure - be more conservative
        recommendations.usagePatterns = {
          config: { maxQueries: 25, minAccessCount: 15 }
        };
        recommendations.frequencyAnalysis = {
          config: { maxQueries: 15 }
        };
      } else if (systemMetrics.hitRate < 0.6) {
        // Low hit rate - be more aggressive
        recommendations.usagePatterns = {
          config: { maxQueries: 75, minAccessCount: 5 }
        };
        recommendations.frequencyAnalysis = {
          config: { maxQueries: 50, frequencyThreshold: 3 }
        };
      }

      if (systemMetrics.avgResponseTime > 1000) {
        // Slow responses - prioritize high-impact strategies
        recommendations.usagePatterns = { priority: 1 };
        recommendations.predictiveWarming = { priority: 2 };
      }
    }

    return recommendations;
  }
}