/**
 * Advanced TTL Manager for Intelligent Cache Policies
 * Implements dynamic TTL based on content type, usage patterns, and performance metrics
 */

import { createHash } from 'crypto';

export interface TTLPolicy {
  baseSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  adaptiveFactor: number;
  contentType: 'embedding' | 'search' | 'classification' | 'contextual';
}

export interface UsagePattern {
  accessCount: number;
  lastAccessed: Date;
  avgResponseTime: number;
  hitRate: number;
  userSessions: Set<string>;
}

export interface CacheMetrics {
  hitRate: number;
  responseTime: number;
  memoryPressure: number;
  errorRate: number;
}

/**
 * Advanced TTL Manager with intelligent cache policies
 */
export class AdvancedTTLManager {
  private usagePatterns = new Map<string, UsagePattern>();
  private readonly policies: Record<string, TTLPolicy> = {
    embedding: {
      baseSeconds: 24 * 60 * 60, // 24 hours
      minSeconds: 6 * 60 * 60,   // 6 hours minimum
      maxSeconds: 7 * 24 * 60 * 60, // 7 days maximum
      adaptiveFactor: 1.5,
      contentType: 'embedding'
    },
    search: {
      baseSeconds: 1 * 60 * 60,  // 1 hour
      minSeconds: 30 * 60,       // 30 minutes minimum
      maxSeconds: 6 * 60 * 60,   // 6 hours maximum
      adaptiveFactor: 2.0,
      contentType: 'search'
    },
    classification: {
      baseSeconds: 24 * 60 * 60, // 24 hours
      minSeconds: 12 * 60 * 60,  // 12 hours minimum
      maxSeconds: 3 * 24 * 60 * 60, // 3 days maximum
      adaptiveFactor: 1.2,
      contentType: 'classification'
    },
    contextual: {
      baseSeconds: 6 * 60 * 60,  // 6 hours
      minSeconds: 2 * 60 * 60,   // 2 hours minimum
      maxSeconds: 24 * 60 * 60,  // 24 hours maximum
      adaptiveFactor: 1.8,
      contentType: 'contextual'
    }
  };

  /**
   * Calculate optimal TTL based on usage patterns and content type
   */
  calculateOptimalTTL(
    cacheKey: string,
    contentType: keyof typeof this.policies,
    metrics?: CacheMetrics
  ): number {
    const policy = this.policies[contentType];
    const pattern = this.usagePatterns.get(cacheKey);

    let ttl = policy.baseSeconds;

    // Apply usage-based adjustments
    if (pattern) {
      ttl = this.applyUsageAdjustments(ttl, pattern, policy);
    }

    // Apply performance-based adjustments
    if (metrics) {
      ttl = this.applyPerformanceAdjustments(ttl, metrics, policy);
    }

    // Ensure TTL is within bounds
    return Math.max(
      policy.minSeconds,
      Math.min(policy.maxSeconds, Math.round(ttl))
    );
  }

  /**
   * Apply usage pattern adjustments to TTL
   */
  private applyUsageAdjustments(
    baseTTL: number,
    pattern: UsagePattern,
    policy: TTLPolicy
  ): number {
    let adjustedTTL = baseTTL;

    // High access count = longer TTL
    if (pattern.accessCount > 50) {
      adjustedTTL *= 1.5;
    } else if (pattern.accessCount > 20) {
      adjustedTTL *= 1.2;
    } else if (pattern.accessCount < 5) {
      adjustedTTL *= 0.8;
    }

    // Recent access = longer TTL
    const hoursSinceAccess = (Date.now() - pattern.lastAccessed.getTime()) / (1000 * 60 * 60);
    if (hoursSinceAccess < 1) {
      adjustedTTL *= 1.3;
    } else if (hoursSinceAccess > 24) {
      adjustedTTL *= 0.7;
    }

    // Multiple user sessions = longer TTL
    if (pattern.userSessions.size > 5) {
      adjustedTTL *= 1.4;
    } else if (pattern.userSessions.size > 2) {
      adjustedTTL *= 1.1;
    }

    // High hit rate = longer TTL
    if (pattern.hitRate > 0.8) {
      adjustedTTL *= 1.2;
    } else if (pattern.hitRate < 0.4) {
      adjustedTTL *= 0.8;
    }

    return adjustedTTL;
  }

  /**
   * Apply performance metrics adjustments to TTL
   */
  private applyPerformanceAdjustments(
    baseTTL: number,
    metrics: CacheMetrics,
    policy: TTLPolicy
  ): number {
    let adjustedTTL = baseTTL;

    // High cache hit rate = longer TTL for popular content
    if (metrics.hitRate > 0.8) {
      adjustedTTL *= 1.3;
    } else if (metrics.hitRate < 0.5) {
      adjustedTTL *= 0.9;
    }

    // Fast response time = normal TTL, slow = shorter TTL
    if (metrics.responseTime > 500) {
      adjustedTTL *= 0.8;
    } else if (metrics.responseTime < 100) {
      adjustedTTL *= 1.1;
    }

    // Memory pressure = shorter TTL for less critical content
    if (metrics.memoryPressure > 0.8) {
      adjustedTTL *= 0.7;
    } else if (metrics.memoryPressure < 0.3) {
      adjustedTTL *= 1.2;
    }

    // High error rate = shorter TTL to refresh potentially stale data
    if (metrics.errorRate > 0.1) {
      adjustedTTL *= 0.6;
    }

    return adjustedTTL;
  }

  /**
   * Record access pattern for cache key
   */
  recordAccess(
    cacheKey: string,
    sessionId: string,
    responseTime: number,
    isHit: boolean
  ): void {
    const pattern = this.usagePatterns.get(cacheKey) || {
      accessCount: 0,
      lastAccessed: new Date(),
      avgResponseTime: 0,
      hitRate: 0,
      userSessions: new Set<string>()
    };

    // Update access metrics
    pattern.accessCount++;
    pattern.lastAccessed = new Date();
    pattern.userSessions.add(sessionId);

    // Update average response time
    pattern.avgResponseTime = (
      (pattern.avgResponseTime * (pattern.accessCount - 1)) + responseTime
    ) / pattern.accessCount;

    // Update hit rate (simplified calculation)
    const hitCount = isHit ? 1 : 0;
    pattern.hitRate = (
      (pattern.hitRate * (pattern.accessCount - 1)) + hitCount
    ) / pattern.accessCount;

    this.usagePatterns.set(cacheKey, pattern);
  }

  /**
   * Get stale threshold for content type (when to proactively refresh)
   */
  getStaleThreshold(contentType: keyof typeof this.policies): number {
    const policy = this.policies[contentType];
    return policy.baseSeconds * 0.8; // Refresh when 80% of TTL has elapsed
  }

  /**
   * Determine if cache entry should be proactively refreshed
   */
  shouldProactivelyRefresh(
    cacheKey: string,
    contentType: keyof typeof this.policies,
    ageSeconds: number
  ): boolean {
    const pattern = this.usagePatterns.get(cacheKey);
    const staleThreshold = this.getStaleThreshold(contentType);

    // High-usage items should be refreshed proactively
    if (pattern && pattern.accessCount > 20 && ageSeconds > staleThreshold) {
      return true;
    }

    // Recent access + near expiry = proactive refresh
    if (pattern) {
      const hoursSinceAccess = (Date.now() - pattern.lastAccessed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceAccess < 2 && ageSeconds > staleThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get cache priority for eviction (lower = evict first)
   */
  getEvictionPriority(cacheKey: string): number {
    const pattern = this.usagePatterns.get(cacheKey);
    if (!pattern) return 1; // No pattern = low priority

    let priority = 5; // Base priority

    // Higher access count = higher priority
    priority += Math.log10(pattern.accessCount + 1) * 2;

    // More recent access = higher priority
    const hoursSinceAccess = (Date.now() - pattern.lastAccessed.getTime()) / (1000 * 60 * 60);
    priority += Math.max(0, 10 - hoursSinceAccess);

    // More user sessions = higher priority
    priority += Math.log10(pattern.userSessions.size + 1) * 3;

    // Better hit rate = higher priority
    priority += pattern.hitRate * 5;

    return Math.round(priority * 10) / 10;
  }

  /**
   * Clean up old usage patterns to prevent memory leaks
   */
  cleanupOldPatterns(maxAgeHours: number = 168): void { // Default 7 days
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [key, pattern] of this.usagePatterns.entries()) {
      if (pattern.lastAccessed < cutoffTime) {
        this.usagePatterns.delete(key);
      }
    }
  }

  /**
   * Get usage statistics for monitoring
   */
  getUsageStats(): {
    totalPatterns: number;
    highUsageKeys: number;
    avgAccessCount: number;
    avgSessionCount: number;
  } {
    const patterns = Array.from(this.usagePatterns.values());

    if (patterns.length === 0) {
      return { totalPatterns: 0, highUsageKeys: 0, avgAccessCount: 0, avgSessionCount: 0 };
    }

    const totalAccess = patterns.reduce((sum, p) => sum + p.accessCount, 0);
    const totalSessions = patterns.reduce((sum, p) => sum + p.userSessions.size, 0);
    const highUsageKeys = patterns.filter(p => p.accessCount > 20).length;

    return {
      totalPatterns: patterns.length,
      highUsageKeys,
      avgAccessCount: Math.round(totalAccess / patterns.length),
      avgSessionCount: Math.round(totalSessions / patterns.length)
    };
  }

  /**
   * Export usage patterns for backup/analysis
   */
  exportPatterns(): Record<string, Omit<UsagePattern, 'userSessions'> & { userSessionCount: number }> {
    const exported: Record<string, any> = {};

    for (const [key, pattern] of this.usagePatterns.entries()) {
      exported[key] = {
        accessCount: pattern.accessCount,
        lastAccessed: pattern.lastAccessed,
        avgResponseTime: pattern.avgResponseTime,
        hitRate: pattern.hitRate,
        userSessionCount: pattern.userSessions.size
      };
    }

    return exported;
  }
}

// Singleton instance
let ttlManager: AdvancedTTLManager | null = null;

/**
 * Get singleton TTL manager instance
 */
export function getTTLManager(): AdvancedTTLManager {
  if (!ttlManager) {
    ttlManager = new AdvancedTTLManager();
  }
  return ttlManager;
}

/**
 * Utility to generate TTL key from cache key
 */
export function generateTTLKey(cacheKey: string): string {
  return createHash('md5').update(cacheKey).digest('hex').slice(0, 16);
}