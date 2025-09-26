/**
 * Cache Metrics API
 * Real-time performance monitoring for Redis cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '../../../../src/lib/cache/redis-cache';

export async function GET(_request: NextRequest) {
  try {
    const cacheManager = getCacheManager();

    // Get comprehensive cache metrics
    const metrics = cacheManager.getCacheMetrics();
    const health = cacheManager.getCacheHealth();
    const healthCheck = await cacheManager.healthCheck();
    const cacheSize = await cacheManager.getCacheSize();

    // Calculate performance grade
    const overallHitRate = health.overall.hitRate;
    const performanceGrade = getPerformanceGrade(overallHitRate);

    // Calculate cost savings (estimated)
    const totalRequests = health.overall.totalRequests;
    const cacheHits = Math.round(totalRequests * overallHitRate);
    const estimatedSavings = calculateCostSavings(cacheHits);

    const response = {
      timestamp: new Date().toISOString(),
      status: 'success',
      data: {
        overview: {
          totalRequests,
          overallHitRate: Math.round(overallHitRate * 100 * 100) / 100, // Round to 2 decimals
          performanceGrade,
          targetMet: overallHitRate >= 0.7,
          estimatedSavings
        },
        health: {
          redis: healthCheck.healthy,
          latency: healthCheck.latency || 0,
          error: healthCheck.error
        },
        metrics: {
          byType: Object.entries(metrics).map(([type, data]) => ({
            type,
            hits: data.hits,
            misses: data.misses,
            hitRate: Math.round(data.hitRate * 100 * 100) / 100,
            totalRequests: data.totalRequests,
            lastUpdated: data.lastUpdated,
            grade: getPerformanceGrade(data.hitRate)
          })),
          cacheSize
        },
        recommendations: health.recommendations
      }
    };

    // Add cache headers for metrics API
    const headers = new Headers();
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Cache metrics API error:', error);

    const errorResponse = {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CACHE_METRICS_ERROR'
      }
    };

    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get performance grade based on hit rate
 */
function getPerformanceGrade(hitRate: number): string {
  if (hitRate >= 0.9) return 'A+';
  if (hitRate >= 0.8) return 'A';
  if (hitRate >= 0.7) return 'B';
  if (hitRate >= 0.6) return 'C';
  if (hitRate >= 0.5) return 'D';
  return 'F';
}

/**
 * Calculate estimated cost savings from cache hits
 */
function calculateCostSavings(cacheHits: number): {
  apiCallsSaved: number;
  estimatedDollars: number;
  timeRange: string;
} {
  // Rough estimates:
  // - OpenAI embedding API: ~$0.0001 per 1K tokens
  // - Average query: ~50 tokens = $0.000005 per call
  // - Search processing time saved: ~200ms per hit

  const apiCallsSaved = cacheHits;
  const estimatedDollars = Math.round(cacheHits * 0.000005 * 100) / 100;

  return {
    apiCallsSaved,
    estimatedDollars,
    timeRange: 'lifetime'
  };
}