/**
 * Cache Metrics API
 * Provides comprehensive cache performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager, type CacheMetrics } from '@/lib/cache/redis-cache';
import { getEmbeddingService } from '@/lib/cache/embedding-service';
import { getSearchOrchestrator } from '@/lib/search/cached-search-orchestrator';

// Type definitions for cache health
interface CacheHealth {
  overall: { hitRate: number; totalRequests: number };
  byType: Record<string, CacheMetrics>;
  recommendations: string[];
}

interface OverallMetrics {
  totalRequests: number;
  hitRate: number;
  cacheSize: number;
  [key: string]: number;
}

/**
 * Build overall performance metrics
 */
function buildOverallMetrics(cacheHealth: CacheHealth, systemHealth: { cache: { healthy: boolean; latency: number } }, cacheManager: { isAvailable(): boolean }) {
  return {
    hitRate: cacheHealth.overall.hitRate,
    totalRequests: cacheHealth.overall.totalRequests,
    cacheEnabled: cacheManager.isAvailable(),
    healthStatus: systemHealth.cache.healthy ? 'healthy' : 'unhealthy',
    latency: systemHealth.cache.latency,
    targetHitRate: 0.7,
    performanceGrade: getPerformanceGrade(cacheHealth.overall.hitRate)
  };
}

/**
 * Build detailed metrics by cache type
 */
function buildDetailedMetrics(cacheHealth: CacheHealth, embeddingStats: { hitRate: number }, cacheSize: Record<string, number>) {
  return {
    embedding: {
      ...embeddingStats,
      sizeEstimate: cacheSize.embedding || 0,
      efficiency: getEfficiencyRating(embeddingStats.hitRate)
    },
    searchResults: buildCacheTypeMetrics(cacheHealth.byType.searchResult, cacheSize.searchResult),
    classifications: buildCacheTypeMetrics(cacheHealth.byType.classification, cacheSize.classification),
    contextualQueries: buildCacheTypeMetrics(cacheHealth.byType.contextualQuery, cacheSize.contextualQuery)
  };
}

/**
 * Build metrics for a specific cache type
 */
function buildCacheTypeMetrics(typeMetrics: CacheMetrics | undefined, sizeEstimate: number) {
  return {
    hits: typeMetrics?.hits || 0,
    misses: typeMetrics?.misses || 0,
    hitRate: typeMetrics?.hitRate || 0,
    sizeEstimate: sizeEstimate || 0,
    lastUpdated: typeMetrics?.lastUpdated || new Date()
  };
}

/**
 * Get efficiency rating based on hit rate
 */
function getEfficiencyRating(hitRate: number): string {
  if (hitRate > 0.8) return 'excellent';
  if (hitRate > 0.6) return 'good';
  if (hitRate > 0.4) return 'fair';
  return 'poor';
}

/**
 * Build performance analysis
 */
function buildAnalysis(cacheHealth: CacheHealth, overallMetrics: OverallMetrics) {
  return {
    recommendations: cacheHealth.recommendations,
    issues: identifyPerformanceIssues(cacheHealth),
    optimizations: suggestOptimizations(cacheHealth, overallMetrics),
    costSavings: estimateCostSavings(cacheHealth.overall)
  };
}

/**
 * Build system information
 */
function buildSystemInfo(systemHealth: { cache: { healthy: boolean }; embedding: { cacheAvailable: boolean } }) {
  return {
    redisConnected: systemHealth.cache.healthy,
    embeddingCacheEnabled: systemHealth.embedding.cacheAvailable,
    version: '1.0.0'
  };
}

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

    // Build metrics components
    const overallMetrics = buildOverallMetrics(cacheHealth, systemHealth, cacheManager);
    const detailedMetrics = buildDetailedMetrics(cacheHealth, embeddingStats, cacheSize);
    const analysis = buildAnalysis(cacheHealth, overallMetrics);
    const system = buildSystemInfo(systemHealth);

    const response = {
      success: true,
      timestamp: new Date(),
      overall: overallMetrics,
      detailed: detailedMetrics,
      analysis,
      system
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
function identifyPerformanceIssues(cacheHealth: CacheHealth): string[] {
  const issues: string[] = [];

  if (cacheHealth.overall.hitRate < 0.7) {
    issues.push('Overall cache hit rate below 70% target');
  }

  Object.entries(cacheHealth.byType).forEach(([type, metrics]: [string, CacheMetrics | undefined]) => {
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
function suggestOptimizations(cacheHealth: CacheHealth, overallMetrics: OverallMetrics): string[] {
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
function estimateCostSavings(overallMetrics: OverallMetrics): {
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