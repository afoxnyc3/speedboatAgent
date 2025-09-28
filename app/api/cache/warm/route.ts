/**
 * Cache Warming API
 * Proactively populates cache with frequently used queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSearchOrchestrator } from '../../../../src/lib/search/cached-search-orchestrator';
import { getEmbeddingService } from '../../../../src/lib/cache/embedding-service';
import { type CacheMetrics } from '../../../../src/lib/cache/redis-cache';

// Cache stats interface for warming decisions
interface CacheStats {
  overall: { hitRate: number; totalRequests: number };
  byType: {
    embedding?: CacheMetrics;
    searchResult?: CacheMetrics;
  };
  recommendations: string[];
}

// Validation schema for warming requests
const WarmingRequestSchema = z.object({
  queries: z.array(z.object({
    text: z.string().min(1).max(1000),
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    context: z.string().optional(),
    priority: z.number().min(1).max(10).default(5)
  })).min(1).max(50),
  warmingType: z.enum(['embeddings', 'searches', 'both']).default('both'),
  concurrent: z.number().min(1).max(10).default(3)
});

/**
 * Common search queries for different domains
 */
const COMMON_QUERIES = {
  technical: [
    'How to implement React hooks',
    'TypeScript interface definition',
    'Next.js API routes',
    'Database connection setup',
    'Authentication implementation',
    'Error handling patterns',
    'Testing best practices',
    'Performance optimization',
    'Security considerations',
    'Deployment configuration'
  ],
  business: [
    'Product features overview',
    'User onboarding process',
    'Pricing and billing',
    'Support documentation',
    'Terms of service',
    'Privacy policy',
    'Company information',
    'Contact details',
    'FAQ common issues',
    'Getting started guide'
  ],
  operational: [
    'System requirements',
    'Installation instructions',
    'Configuration options',
    'Troubleshooting guide',
    'Monitoring setup',
    'Backup procedures',
    'Update process',
    'Health checks',
    'Performance metrics',
    'Log analysis'
  ]
};

/**
 * POST /api/cache/warm
 * Warm cache with provided or common queries
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedRequest = WarmingRequestSchema.parse(body);

    const searchOrchestrator = getSearchOrchestrator();
    const embeddingService = getEmbeddingService();

    const startTime = Date.now();
    let embeddingResults = { warmed: 0, failed: 0, cached: 0 };
    let searchResults = { success: 0, failed: 0, alreadyCached: 0 };

    // Warm embeddings
    if (validatedRequest.warmingType === 'embeddings' || validatedRequest.warmingType === 'both') {
      const embeddingQueries = validatedRequest.queries.map(q => ({
        text: q.text,
        options: {
          sessionId: q.sessionId,
          userId: q.userId,
          context: q.context
        }
      }));

      embeddingResults = await embeddingService.warmCache(embeddingQueries);
    }

    // Warm search results
    if (validatedRequest.warmingType === 'searches' || validatedRequest.warmingType === 'both') {
      const searchQueries = validatedRequest.queries.map(q => ({
        query: q.text,
        sessionId: q.sessionId,
        userId: q.userId,
        context: q.context
      }));

      searchResults = await searchOrchestrator.warmCache(searchQueries);
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Cache warming completed',
      results: {
        embeddings: embeddingResults,
        searches: searchResults,
        totalTime,
        queriesProcessed: validatedRequest.queries.length
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Cache warming error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid warming request',
          details: error.errors
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'WARMING_ERROR',
        message: error instanceof Error ? error.message : 'Cache warming failed'
      }
    }, { status: 500 });
  }
}

/**
 * GET /api/cache/warm
 * Get common queries and warming status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const domain = url.searchParams.get('domain') as keyof typeof COMMON_QUERIES;

  try {
    if (action === 'common_queries') {
      const queries = domain && COMMON_QUERIES[domain]
        ? COMMON_QUERIES[domain]
        : Object.values(COMMON_QUERIES).flat();

      return NextResponse.json({
        success: true,
        queries: queries.map((text, _index) => ({
          text,
          priority: Math.floor(Math.random() * 5) + 6, // Random priority 6-10
          suggested: true
        })),
        domains: Object.keys(COMMON_QUERIES)
      });
    }

    if (action === 'warm_common') {
      // Auto-warm with common queries
      const allQueries = Object.values(COMMON_QUERIES).flat()
        .slice(0, 20) // Limit to 20 most common
        .map(text => ({ text, priority: 8 }));

      const searchOrchestrator = getSearchOrchestrator();
      const embeddingService = getEmbeddingService();

      const embeddingQueries = allQueries.map(q => ({ text: q.text, options: {} }));
      const searchQueries = allQueries.map(q => ({ query: q.text }));

      const [embeddingResults, searchResults] = await Promise.all([
        embeddingService.warmCache(embeddingQueries),
        searchOrchestrator.warmCache(searchQueries)
      ]);

      return NextResponse.json({
        success: true,
        message: 'Common queries cache warming completed',
        results: {
          embeddings: embeddingResults,
          searches: searchResults,
          queriesProcessed: allQueries.length
        },
        timestamp: new Date()
      });
    }

    // Default: return warming capabilities and status
    const searchOrchestrator = getSearchOrchestrator();
    const cacheStats = searchOrchestrator.getCacheStats();

    return NextResponse.json({
      success: true,
      warming: {
        available: true,
        types: ['embeddings', 'searches', 'both'],
        maxConcurrent: 10,
        maxQueries: 50
      },
      currentStats: {
        overallHitRate: cacheStats.overall.hitRate,
        totalRequests: cacheStats.overall.totalRequests,
        recommendations: cacheStats.recommendations
      },
      commonQueries: {
        available: true,
        domains: Object.keys(COMMON_QUERIES),
        totalQueries: Object.values(COMMON_QUERIES).flat().length
      }
    });

  } catch (error) {
    console.error('Cache warming GET error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'WARMING_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get warming status'
      }
    }, { status: 500 });
  }
}

/**
 * Background cache warming scheduler
 * This would be called by a cron job or background process
 */
export async function scheduleBackgroundWarming(): Promise<{
  success: boolean;
  warmedQueries: number;
  errors: number;
}> {
  try {
    const searchOrchestrator = getSearchOrchestrator();
    const cacheStats = searchOrchestrator.getCacheStats();

    // Only warm if hit rate is below target
    if (cacheStats.overall.hitRate >= 0.7) {
      return { success: true, warmedQueries: 0, errors: 0 };
    }

    // Select queries based on current performance
    const selectedQueries = selectQueriesForWarming(cacheStats);
    const searchQueries = selectedQueries.map(text => ({ query: text }));

    const results = await searchOrchestrator.warmCache(searchQueries);

    return {
      success: true,
      warmedQueries: results.success,
      errors: results.failed
    };

  } catch (error) {
    console.error('Background cache warming error:', error);
    return { success: false, warmedQueries: 0, errors: 1 };
  }
}

/**
 * Select queries for warming based on cache performance
 */
function selectQueriesForWarming(cacheStats: CacheStats): string[] {
  const queries: string[] = [];

  // If embedding cache is low, focus on technical queries
  if (cacheStats.byType.embedding?.hitRate < 0.6) {
    queries.push(...COMMON_QUERIES.technical.slice(0, 5));
  }

  // If search result cache is low, add business queries
  if (cacheStats.byType.searchResult?.hitRate < 0.6) {
    queries.push(...COMMON_QUERIES.business.slice(0, 5));
  }

  // Always include some operational queries
  queries.push(...COMMON_QUERIES.operational.slice(0, 3));

  return queries.slice(0, 15); // Limit total
}