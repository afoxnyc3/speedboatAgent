/**
 * Dashboard Utility Functions
 */

import { getCacheManager } from '../../cache/redis-cache';
import { DashboardMetrics, PerformanceMetrics } from './types';

/**
 * Check component health status
 */
export async function checkComponentHealth(): Promise<{
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
export function generateAlerts(
  metrics: PerformanceMetrics,
  cacheHealth: { overall: { hitRate: number } }
): DashboardMetrics['alerts'] {
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