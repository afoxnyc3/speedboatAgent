/**
 * Cache Warming API
 * Proactive cache population for improved performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '../../../../src/lib/cache/redis-cache';

// Common queries for different domains
const COMMON_QUERIES = {
  technical: [
    'how to implement authentication',
    'database connection setup',
    'API error handling',
    'testing best practices',
    'deployment configuration',
    'environment variables setup',
    'Docker configuration',
    'TypeScript types',
    'React components',
    'performance optimization'
  ],
  business: [
    'product requirements',
    'user stories',
    'business logic',
    'data models',
    'workflow processes',
    'integration requirements',
    'security policies',
    'compliance requirements',
    'user permissions',
    'business rules'
  ],
  operational: [
    'monitoring setup',
    'logging configuration',
    'alerting rules',
    'backup procedures',
    'security guidelines',
    'incident response',
    'maintenance windows',
    'capacity planning',
    'performance metrics',
    'troubleshooting guides'
  ]
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain = 'all', customQueries = [] } = body;

    const cacheManager = getCacheManager();

    // Determine which queries to warm
    const queriesToWarm: Array<{ query: string; context?: string }> = [];

    if (domain === 'all') {
      // Warm all domains
      Object.values(COMMON_QUERIES).forEach(queries => {
        queriesToWarm.push(...queries.map(query => ({ query })));
      });
    } else if (COMMON_QUERIES[domain as keyof typeof COMMON_QUERIES]) {
      // Warm specific domain
      const domainQueries = COMMON_QUERIES[domain as keyof typeof COMMON_QUERIES];
      queriesToWarm.push(...domainQueries.map(query => ({ query })));
    }

    // Add custom queries
    if (customQueries.length > 0) {
      queriesToWarm.push(...customQueries);
    }

    // Check current cache status before warming
    const preWarmMetrics = cacheManager.getCacheMetrics();
    const preWarmHitRate = cacheManager.getCacheHealth().overall.hitRate;

    // Execute cache warming
    const warmedCount = await cacheManager.warmCache(queriesToWarm);

    // Get updated metrics
    const postWarmMetrics = cacheManager.getCacheMetrics();
    const postWarmHitRate = cacheManager.getCacheHealth().overall.hitRate;

    const response = {
      timestamp: new Date().toISOString(),
      status: 'success',
      data: {
        domain,
        queriesProcessed: queriesToWarm.length,
        successfullyWarmed: warmedCount,
        customQueriesCount: customQueries.length,
        metrics: {
          before: {
            hitRate: Math.round(preWarmHitRate * 100 * 100) / 100,
            totalRequests: Object.values(preWarmMetrics).reduce((sum, m) => sum + m.totalRequests, 0)
          },
          after: {
            hitRate: Math.round(postWarmHitRate * 100 * 100) / 100,
            totalRequests: Object.values(postWarmMetrics).reduce((sum, m) => sum + m.totalRequests, 0)
          },
          improvement: {
            hitRateIncrease: Math.round((postWarmHitRate - preWarmHitRate) * 100 * 100) / 100,
            newCacheEntries: warmedCount
          }
        },
        availableDomains: Object.keys(COMMON_QUERIES),
        nextRecommendation: getNextWarmingRecommendation(postWarmHitRate)
      }
    };

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cache warming API error:', error);

    const errorResponse = {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CACHE_WARMING_ERROR'
      }
    };

    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Return available warming options and current cache status
    const cacheManager = getCacheManager();
    const health = cacheManager.getCacheHealth();

    const response = {
      timestamp: new Date().toISOString(),
      status: 'success',
      data: {
        currentStatus: {
          overallHitRate: Math.round(health.overall.hitRate * 100 * 100) / 100,
          totalRequests: health.overall.totalRequests,
          targetMet: health.overall.hitRate >= 0.7
        },
        availableDomains: Object.keys(COMMON_QUERIES),
        domainQueryCounts: Object.entries(COMMON_QUERIES).map(([domain, queries]) => ({
          domain,
          queryCount: queries.length
        })),
        recommendations: health.recommendations,
        warmingNeeded: health.overall.hitRate < 0.7,
        suggestedAction: getSuggestedWarmingAction(health.overall.hitRate)
      }
    };

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cache warming status API error:', error);

    const errorResponse = {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CACHE_WARMING_STATUS_ERROR'
      }
    };

    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get next warming recommendation based on hit rate
 */
function getNextWarmingRecommendation(hitRate: number): string {
  if (hitRate >= 0.9) return 'Excellent performance! Consider domain-specific warming for edge cases.';
  if (hitRate >= 0.8) return 'Good performance. Consider warming additional technical queries.';
  if (hitRate >= 0.7) return 'Target met. Monitor and warm based on usage patterns.';
  if (hitRate >= 0.5) return 'Below target. Warm all domains to improve hit rate.';
  return 'Critical: Immediate warming of all domains recommended.';
}

/**
 * Get suggested warming action
 */
function getSuggestedWarmingAction(hitRate: number): string {
  if (hitRate < 0.7) {
    return 'POST /api/cache/warm with {"domain": "all"} to improve performance';
  }
  return 'Performance is acceptable. Monitor and warm specific domains as needed.';
}