/**
 * Cache Optimization API
 * Provides access to enhanced caching features and optimization controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnhancedCacheManager } from '../../../../src/lib/cache/enhanced-redis-manager';
import { getIntelligentCacheWarmer } from '../../../../src/lib/cache/intelligent-cache-warmer';
import { getTTLManager } from '../../../../src/lib/cache/advanced-ttl-manager';
import { getCompressionManager } from '../../../../src/lib/cache/compression-utils';
import {
  handleAnalyze,
  handleIntelligentWarming,
  handleTTLOptimization,
  handleCompressionAnalysis,
  handleHealthCheck,
  handleCleanup,
  handleRecommendations,
} from '../../../../src/lib/cache/optimization-handlers';
import {
  calculatePerformanceScore,
  generateCompressionRecommendations,
  generateImmediateRecommendations,
  generateOptimizationRecommendations,
  generatePerformanceRecommendations,
} from '../../../../src/lib/cache/optimization-recommendations';

// Validation schemas
const OptimizationRequestSchema = z.object({
  action: z.enum([
    'analyze',
    'warm_intelligent',
    'optimize_ttl',
    'compress_analyze',
    'health_check',
    'cleanup',
    'recommendations'
  ]),
  options: z.object({
    warmingStrategies: z.array(z.string()).optional(),
    maxQueries: z.number().min(1).max(100).optional(),
    targetHitRate: z.number().min(0).max(1).optional(),
    compressionThreshold: z.number().min(0).optional(),
    ttlOptimization: z.boolean().optional()
  }).optional()
});

/**
 * POST /api/cache/optimize
 * Execute cache optimization operations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, options = {} } = OptimizationRequestSchema.parse(body);

    const enhancedCache = getEnhancedCacheManager();
    const intelligentWarmer = getIntelligentCacheWarmer();
    const ttlManager = getTTLManager();
    const compressionManager = getCompressionManager();

    switch (action) {
      case 'analyze':
        return handleAnalyze(enhancedCache, ttlManager, compressionManager);

      case 'warm_intelligent':
        return handleIntelligentWarming(intelligentWarmer, options);

      case 'optimize_ttl':
        return handleTTLOptimization(enhancedCache, ttlManager, options);

      case 'compress_analyze':
        return handleCompressionAnalysis(enhancedCache, compressionManager, options);

      case 'health_check':
        return handleHealthCheck(enhancedCache);

      case 'cleanup':
        return handleCleanup(enhancedCache, ttlManager);

      case 'recommendations':
        return handleRecommendations(enhancedCache, ttlManager, compressionManager);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cache/optimize
 * Get cache optimization status and recommendations
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const includeRecommendations = searchParams.get('recommendations') === 'true';

    interface CacheManager {
      getDetailedMetrics(): Promise<unknown>;
      healthCheck(): Promise<unknown>;
      getUsageStatistics(): Promise<unknown>;
    }

    const enhancedCache = getEnhancedCacheManager();
    const cache = enhancedCache as CacheManager;
    const metrics = await cache.getDetailedMetrics();
    const health = await cache.healthCheck();
    const usageStats = await cache.getUsageStatistics();

    const performanceScore = calculatePerformanceScore(metrics, health, usageStats);

    const response: {
      success: boolean;
      status: unknown;
      recommendations?: unknown;
    } = {
      success: true,
      status: {
        metrics,
        health,
        performance: performanceScore,
        timestamp: new Date().toISOString()
      }
    };

    if (includeRecommendations) {
      response.recommendations = {
        immediate: generateImmediateRecommendations(health, metrics),
        optimization: generateOptimizationRecommendations(metrics, usageStats),
        performance: generatePerformanceRecommendations(health, metrics),
        compression: generateCompressionRecommendations(metrics)
      };
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to get optimization status' },
      { status: 500 }
    );
  }
}