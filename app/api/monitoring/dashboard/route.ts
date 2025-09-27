/**
 * Real-time Monitoring Dashboard API
 * Provides comprehensive system metrics for production monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '../../../../src/lib/cache/redis-cache';

// Real-time metrics interface
interface DashboardMetrics {
  timestamp: string;
  system: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    environment: string;
    version: string;
  };
  performance: {
    responseTime: {
      current: number;
      average: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerSecond: number;
      requestsPerMinute: number;
      totalRequests: number;
    };
    errorRate: {
      current: number;
      last5min: number;
      last1hour: number;
    };
  };
  cache: {
    hitRate: {
      overall: number;
      embedding: number;
      classification: number;
      searchResult: number;
    };
    performance: {
      averageLatency: number;
      totalOperations: number;
    };
    health: 'optimal' | 'degraded' | 'critical';
  };
  resources: {
    memory: {
      used: number;
      total: number;
      usage: number;
      heap: NodeJS.MemoryUsage;
    };
    connections: {
      redis: boolean;
      weaviate: boolean;
      openai: boolean;
      mem0: boolean;
    };
  };
  activeUsers: {
    current: number;
    peak: number;
    sessions: number;
  };
  alerts: {
    active: number;
    critical: number;
    warnings: number;
    recent: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      timestamp: string;
      resolved: boolean;
    }>;
  };
}

// Performance tracker for storing metrics in memory
class PerformanceTracker {
  private static instance: PerformanceTracker;
  private responseTimes: number[] = [];
  private errorCounts: { timestamp: number; count: number }[] = [];
  private requestCounts: { timestamp: number; count: number }[] = [];
  private activeConnections = new Set<string>();
  private sessionCount = 0;
  private startTime = Date.now();

  public static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  addResponseTime(time: number): void {
    this.responseTimes.push(time);
    // Keep only last 1000 entries
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  incrementRequests(): void {
    const now = Date.now();
    this.requestCounts.push({ timestamp: now, count: 1 });
    // Keep only last hour of data
    const oneHourAgo = now - 60 * 60 * 1000;
    this.requestCounts = this.requestCounts.filter(r => r.timestamp > oneHourAgo);
  }

  incrementErrors(): void {
    const now = Date.now();
    this.errorCounts.push({ timestamp: now, count: 1 });
    // Keep only last hour of data
    const oneHourAgo = now - 60 * 60 * 1000;
    this.errorCounts = this.errorCounts.filter(e => e.timestamp > oneHourAgo);
  }

  addActiveConnection(sessionId: string): void {
    this.activeConnections.add(sessionId);
    this.sessionCount = Math.max(this.sessionCount, this.activeConnections.size);
  }

  removeActiveConnection(sessionId: string): void {
    this.activeConnections.delete(sessionId);
  }

  getMetrics(): {
    responseTime: { current: number; average: number; p95: number; p99: number };
    throughput: { requestsPerSecond: number; requestsPerMinute: number; totalRequests: number };
    errorRate: { current: number; last5min: number; last1hour: number };
    activeUsers: { current: number; peak: number; sessions: number };
    uptime: number;
  } {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinAgo = now - 60 * 1000;

    // Calculate response time metrics
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const current = sortedTimes[sortedTimes.length - 1] || 0;
    const average = sortedTimes.length > 0 ?
      sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length : 0;
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    const p95 = sortedTimes[p95Index] || 0;
    const p99 = sortedTimes[p99Index] || 0;

    // Calculate throughput
    const recentRequests = this.requestCounts.filter(r => r.timestamp > oneMinAgo);
    const requestsPerSecond = recentRequests.length / 60;
    const requestsPerMinute = this.requestCounts.filter(r => r.timestamp > oneMinAgo).length;
    const totalRequests = this.requestCounts.length;

    // Calculate error rates
    const recentErrors = this.errorCounts.filter(e => e.timestamp > fiveMinAgo);
    const hourlyErrors = this.errorCounts.filter(e => e.timestamp > oneHourAgo);
    const recentRequests5min = this.requestCounts.filter(r => r.timestamp > fiveMinAgo);
    const hourlyRequests = this.requestCounts.filter(r => r.timestamp > oneHourAgo);

    const currentErrorRate = recentRequests.length > 0 ?
      this.errorCounts.filter(e => e.timestamp > oneMinAgo).length / recentRequests.length * 100 : 0;
    const last5minErrorRate = recentRequests5min.length > 0 ?
      recentErrors.length / recentRequests5min.length * 100 : 0;
    const last1hourErrorRate = hourlyRequests.length > 0 ?
      hourlyErrors.length / hourlyRequests.length * 100 : 0;

    return {
      responseTime: { current, average, p95, p99 },
      throughput: { requestsPerSecond, requestsPerMinute, totalRequests },
      errorRate: { current: currentErrorRate, last5min: last5minErrorRate, last1hour: last1hourErrorRate },
      activeUsers: {
        current: this.activeConnections.size,
        peak: this.sessionCount,
        sessions: this.activeConnections.size
      },
      uptime: (now - this.startTime) / 1000
    };
  }
}

/**
 * Check component health status
 */
async function checkComponentHealth(): Promise<{
  redis: boolean;
  weaviate: boolean;
  openai: boolean;
  mem0: boolean;
}> {
  const cacheManager = getCacheManager();

  // Check Redis
  const redisHealth = await cacheManager.healthCheck();

  // Check other components (simplified checks)
  const weaviateHealthy = !!process.env.WEAVIATE_HOST;
  const openaiHealthy = !!process.env.OPENAI_API_KEY;
  const mem0Healthy = !!process.env.MEM0_API_KEY;

  return {
    redis: redisHealth.healthy,
    weaviate: weaviateHealthy,
    openai: openaiHealthy,
    mem0: mem0Healthy
  };
}

/**
 * Generate active alerts based on current metrics
 */
function generateAlerts(metrics: any, cacheHealth: any): DashboardMetrics['alerts'] {
  const alerts: DashboardMetrics['alerts']['recent'] = [];
  let critical = 0;
  let warnings = 0;

  // Response time alerts
  if (metrics.responseTime.p95 > 10000) {
    alerts.push({
      type: 'error',
      message: `P95 response time exceeds 10s: ${metrics.responseTime.p95}ms`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    critical++;
  } else if (metrics.responseTime.p95 > 5000) {
    alerts.push({
      type: 'warning',
      message: `P95 response time above 5s: ${metrics.responseTime.p95}ms`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    warnings++;
  }

  // Error rate alerts
  if (metrics.errorRate.last5min > 5) {
    alerts.push({
      type: 'error',
      message: `Error rate exceeds 5%: ${metrics.errorRate.last5min.toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    critical++;
  } else if (metrics.errorRate.last5min > 2) {
    alerts.push({
      type: 'warning',
      message: `Error rate elevated: ${metrics.errorRate.last5min.toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    warnings++;
  }

  // Cache hit rate alerts
  if (cacheHealth.overall.hitRate < 0.6) {
    alerts.push({
      type: 'error',
      message: `Cache hit rate below 60%: ${(cacheHealth.overall.hitRate * 100).toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    critical++;
  } else if (cacheHealth.overall.hitRate < 0.7) {
    alerts.push({
      type: 'warning',
      message: `Cache hit rate below 70%: ${(cacheHealth.overall.hitRate * 100).toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    warnings++;
  }

  // Memory usage alerts
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  if (memoryUsagePercent > 90) {
    alerts.push({
      type: 'error',
      message: `Memory usage critical: ${memoryUsagePercent.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    critical++;
  } else if (memoryUsagePercent > 80) {
    alerts.push({
      type: 'warning',
      message: `Memory usage high: ${memoryUsagePercent.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    warnings++;
  }

  return {
    active: alerts.length,
    critical,
    warnings,
    recent: alerts.slice(0, 10) // Show most recent 10 alerts
  };
}

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
    const cacheMetrics = cacheManager.getCacheMetrics();

    // Get component health
    const connections = await checkComponentHealth();

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const memoryTotal = memoryUsage.heapTotal + memoryUsage.external;
    const memoryUsed = memoryUsage.heapUsed + memoryUsage.external;
    const memoryUsagePercent = (memoryUsed / memoryTotal) * 100;

    // Determine overall system status
    const systemStatus =
      connections.redis && connections.weaviate && connections.openai &&
      performanceMetrics.errorRate.last5min < 5 &&
      performanceMetrics.responseTime.p95 < 10000 &&
      memoryUsagePercent < 90
        ? 'healthy'
        : performanceMetrics.errorRate.last5min > 10 ||
          performanceMetrics.responseTime.p95 > 30000 ||
          memoryUsagePercent > 95
        ? 'unhealthy'
        : 'degraded';

    // Determine cache health
    const cacheHealthStatus =
      cacheHealth.overall.hitRate >= 0.7 ? 'optimal' :
      cacheHealth.overall.hitRate >= 0.5 ? 'degraded' : 'critical';

    // Generate alerts
    const alerts = generateAlerts(performanceMetrics, cacheHealth);

    const dashboardMetrics: DashboardMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        status: systemStatus,
        uptime: performanceMetrics.uptime,
        environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',
        version: '0.6.0'
      },
      performance: {
        responseTime: performanceMetrics.responseTime,
        throughput: performanceMetrics.throughput,
        errorRate: performanceMetrics.errorRate
      },
      cache: {
        hitRate: {
          overall: cacheHealth.overall.hitRate,
          embedding: cacheMetrics.embedding?.hitRate || 0,
          classification: cacheMetrics.classification?.hitRate || 0,
          searchResult: cacheMetrics.searchResult?.hitRate || 0
        },
        performance: {
          averageLatency: 0, // Would be calculated from cache operation times
          totalOperations: cacheHealth.overall.totalRequests
        },
        health: cacheHealthStatus
      },
      resources: {
        memory: {
          used: memoryUsed,
          total: memoryTotal,
          usage: memoryUsagePercent,
          heap: memoryUsage
        },
        connections
      },
      activeUsers: performanceMetrics.activeUsers,
      alerts
    };

    // Track response time
    const responseTime = Date.now() - startTime;
    tracker.addResponseTime(responseTime);

    return new NextResponse(JSON.stringify(dashboardMetrics, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': responseTime.toString()
      }
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);

    // Track error
    const tracker = PerformanceTracker.getInstance();
    tracker.incrementErrors();

    const errorResponse = {
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch dashboard metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      system: { status: 'unhealthy' }
    };

    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Export the performance tracker for use in other parts of the app
export { PerformanceTracker };