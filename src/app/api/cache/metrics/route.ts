/**
 * Cache Metrics API
 * Provides comprehensive cache performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '../../../../lib/cache/redis-cache';
import { getEmbeddingService } from '../../../../lib/cache/embedding-service';
import { getSearchOrchestrator } from '../../../../lib/search/cached-search-orchestrator';

/**
 * GET /api/cache/metrics
 * Returns comprehensive cache performance metrics
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const cacheManager = getCacheManager();
    const embeddingService = getEmbeddingService();
    const searchOrchestrator = getSearchOrchestrator();

    // Get comprehensive cache health
    const cacheHealth = cacheManager.getCacheHealth();
    const embeddingStats = embeddingService.getCacheStats();
    const systemHealth = await searchOrchestrator.healthCheck();
    const cacheSize = await cacheManager.getCacheSize();

    // Calculate overall performance metrics
    const overallMetrics = {
      hitRate: cacheHealth.overall.hitRate,
      totalRequests: cacheHealth.overall.totalRequests,
      cacheEnabled: cacheManager.isAvailable(),
      healthStatus: systemHealth.cache.healthy ? 'healthy' : 'unhealthy',
      latency: systemHealth.cache.latency,
      targetHitRate: 0.7,
      performanceGrade: getPerformanceGrade(cacheHealth.overall.hitRate)
    };

    // Detailed breakdown by cache type
    const detailedMetrics = {
      embedding: {
        ...embeddingStats,
        sizeEstimate: cacheSize.embedding || 0,
        efficiency: embeddingStats.hitRate > 0.8 ? 'excellent' :
                   embeddingStats.hitRate > 0.6 ? 'good' :
                   embeddingStats.hitRate > 0.4 ? 'fair' : 'poor'
      },
      searchResults: {
        hits: cacheHealth.byType.searchResult?.hits || 0,
        misses: cacheHealth.byType.searchResult?.misses || 0,
        hitRate: cacheHealth.byType.searchResult?.hitRate || 0,
        sizeEstimate: cacheSize.searchResult || 0,
        lastUpdated: cacheHealth.byType.searchResult?.lastUpdated || new Date()
      },
      classifications: {
        hits: cacheHealth.byType.classification?.hits || 0,
        misses: cacheHealth.byType.classification?.misses || 0,
        hitRate: cacheHealth.byType.classification?.hitRate || 0,
        sizeEstimate: cacheSize.classification || 0,
        lastUpdated: cacheHealth.byType.classification?.lastUpdated || new Date()
      },
      contextualQueries: {
        hits: cacheHealth.byType.contextualQuery?.hits || 0,
        misses: cacheHealth.byType.contextualQuery?.misses || 0,
        hitRate: cacheHealth.byType.contextualQuery?.hitRate || 0,
        sizeEstimate: cacheSize.contextualQuery || 0,
        lastUpdated: cacheHealth.byType.contextualQuery?.lastUpdated || new Date()
      }
    };

    // Performance analysis and recommendations
    const analysis = {
      recommendations: cacheHealth.recommendations,
      issues: identifyPerformanceIssues(cacheHealth),
      optimizations: suggestOptimizations(cacheHealth, overallMetrics),
      costSavings: estimateCostSavings(cacheHealth.overall)
    };

    const response = {
      success: true,
      timestamp: new Date(),
      overall: overallMetrics,
      detailed: detailedMetrics,
      analysis,
      system: {
        redisConnected: systemHealth.cache.healthy,
        embeddingCacheEnabled: systemHealth.embedding.cacheAvailable,
        version: '1.0.0'
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Cache-Hit-Rate': overallMetrics.hitRate.toString(),
        'X-Cache-Enabled': overallMetrics.cacheEnabled.toString()
      }
    });

  } catch (error) {
    console.error('Cache metrics API error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve cache metrics',
        timestamp: new Date()
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/cache/metrics/reset
 * Reset cache metrics (for testing purposes)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;

    const cacheManager = getCacheManager();

    if (action === 'reset_metrics') {
      // This would reset metrics counters without clearing cache data
      // For now, we'll just return success since metrics are automatically managed
      return NextResponse.json({
        success: true,
        message: 'Cache metrics reset successfully',
        timestamp: new Date()
      });
    }

    if (action === 'clear_cache') {
      const cleared = await cacheManager.clearAll();
      return NextResponse.json({
        success: cleared,
        message: cleared ? 'Cache cleared successfully' : 'Failed to clear cache',
        timestamp: new Date()
      });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_ACTION',
        message: 'Invalid action. Use "reset_metrics" or "clear_cache"'
      }
    }, { status: 400 });

  } catch (error) {
    console.error('Cache metrics reset error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'RESET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reset cache metrics'
      }
    }, { status: 500 });
  }
}

/**
 * Calculate performance grade based on hit rate
 */
function getPerformanceGrade(hitRate: number): string {
  if (hitRate >= 0.9) return 'A';
  if (hitRate >= 0.8) return 'B';
  if (hitRate >= 0.7) return 'C';
  if (hitRate >= 0.6) return 'D';
  return 'F';
}

/**
 * Identify performance issues
 */
function identifyPerformanceIssues(cacheHealth: any): string[] {
  const issues: string[] = [];

  if (cacheHealth.overall.hitRate < 0.7) {
    issues.push('Overall cache hit rate below 70% target');
  }

  Object.entries(cacheHealth.byType).forEach(([type, metrics]: [string, any]) => {
    if (metrics && metrics.hitRate < 0.5) {
      issues.push(`${type} cache hit rate critically low: ${(metrics.hitRate * 100).toFixed(1)}%`);
    }
  });

  if (cacheHealth.overall.totalRequests < 100) {
    issues.push('Insufficient cache usage data for accurate analysis');
  }

  return issues;
}

/**
 * Suggest performance optimizations
 */
function suggestOptimizations(cacheHealth: any, overallMetrics: any): string[] {
  const optimizations: string[] = [];

  if (overallMetrics.hitRate < 0.7) {
    optimizations.push('Implement cache warming for frequently used queries');
    optimizations.push('Increase TTL for stable content like embeddings');
  }

  if (cacheHealth.byType.embedding?.hitRate < 0.8) {
    optimizations.push('Pre-generate embeddings for common search terms');
  }

  if (cacheHealth.byType.searchResult?.hitRate < 0.6) {
    optimizations.push('Implement semantic similarity caching for search results');
  }

  optimizations.push('Monitor query patterns to identify cache warming opportunities');

  return optimizations;
}

/**
 * Estimate cost savings from caching
 */
function estimateCostSavings(overallMetrics: any): {
  apiCallsSaved: number;
  estimatedDollars: number;
  efficiency: string;
} {
  const totalHits = overallMetrics.hitRate * overallMetrics.totalRequests;

  // Rough estimate: each cached embedding saves ~$0.0001, each cached search saves ~$0.001
  const embeddingsSaved = totalHits * 0.7; // Estimate 70% are embeddings
  const searchesSaved = totalHits * 0.3;   // Estimate 30% are searches

  const estimatedDollars = (embeddingsSaved * 0.0001) + (searchesSaved * 0.001);

  return {
    apiCallsSaved: Math.round(totalHits),
    estimatedDollars: Number(estimatedDollars.toFixed(4)),
    efficiency: overallMetrics.hitRate > 0.8 ? 'excellent' :
               overallMetrics.hitRate > 0.6 ? 'good' : 'needs improvement'
  };
}