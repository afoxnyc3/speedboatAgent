/**
 * Real-time Monitoring Dashboard API
 * Provides comprehensive system metrics for production monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '@/lib/cache/redis-cache';
import { DashboardMetrics } from '@/lib/monitoring/dashboard/types';
import { PerformanceTracker } from '@/lib/monitoring/dashboard/performance-tracker';
import { checkComponentHealth, generateAlerts } from '@/lib/monitoring/dashboard/utils';
import { calculateSystemStatus, calculateCacheHealthStatus } from '@/lib/monitoring/dashboard/status-calculator';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Track this request
    const tracker = PerformanceTracker.getInstance();
    tracker.incrementRequests();

    // Add session tracking from headers
    const sessionId = request.headers.get('x-session-id') ||
                     request.headers.get('x-vercel-ip-country') ||
                     'anonymous';
    tracker.addActiveConnection(sessionId);

    // Get performance metrics
    const performanceMetrics = tracker.getMetrics();

    // Get cache metrics
    const cacheManager = getCacheManager();
    const cacheHealth = cacheManager.getCacheHealth();

    // Get component health
    const connections = await checkComponentHealth();

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const memoryTotal = memoryUsage.heapTotal + memoryUsage.external;
    const memoryUsed = memoryUsage.heapUsed + memoryUsage.external;

    // Determine overall system status
    const systemStatus = calculateSystemStatus(
      performanceMetrics.errorRate.fiveMinute,
      performanceMetrics.responseTime.p95,
      cacheHealth.overall.hitRate
    );

    // Determine cache health status
    const cacheHealthStatus = calculateCacheHealthStatus(cacheHealth.overall.hitRate);

    // Generate alerts based on metrics
    const alerts = generateAlerts(performanceMetrics, cacheHealth);

    // Build the complete dashboard metrics response
    const dashboardMetrics: DashboardMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        status: systemStatus,
        uptime: performanceMetrics.uptime,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      },
      performance: {
        responseTime: performanceMetrics.responseTime,
        throughput: performanceMetrics.throughput,
        errorRate: performanceMetrics.errorRate
      },
      cache: {
        hitRate: {
          overall: cacheHealth.overall.hitRate,
          embedding: cacheHealth.byType.embedding?.hitRate || 0,
          classification: cacheHealth.byType.classification?.hitRate || 0,
          searchResult: cacheHealth.byType.searchResult?.hitRate || 0
        },
        performance: {
          averageLatency: 0, // TODO: Calculate from cache metrics when available
          totalOperations: cacheHealth.overall.totalRequests
        },
        health: cacheHealthStatus
      },
      resources: {
        memory: {
          used: memoryUsed,
          total: memoryTotal,
          usage: memoryUsed / memoryTotal,
          heap: memoryUsage
        },
        connections
      },
      activeUsers: performanceMetrics.activeUsers,
      alerts
    };

    // Track response time for this request
    const responseTime = Date.now() - startTime;
    tracker.addResponseTime(responseTime);

    // Clean up session on response
    setTimeout(() => {
      tracker.removeActiveConnection(sessionId);
    }, 60000); // Remove after 1 minute

    return new NextResponse(JSON.stringify(dashboardMetrics, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`
      }
    });

  } catch (error) {
    // Track error
    const tracker = PerformanceTracker.getInstance();
    tracker.incrementErrors();

    console.error('Dashboard API error:', error);

    const errorResponse = {
      timestamp: new Date().toISOString(),
      error: 'Failed to generate dashboard metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      system: {
        status: 'unhealthy',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}