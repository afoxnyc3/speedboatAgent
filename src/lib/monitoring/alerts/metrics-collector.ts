/**
 * Metrics Collection for Alert System
 */

import { getCacheManager } from '../../cache/redis-cache';

/**
 * Collect current system metrics for alert evaluation
 */
export async function collectMetrics(): Promise<Record<string, number>> {
  try {
    // Get cache metrics
    const cacheManager = getCacheManager();
    const cacheHealth = cacheManager.getCacheHealth();

    // Get memory metrics
    const memoryUsage = process.memoryUsage();
    const memoryTotal = memoryUsage.heapTotal + memoryUsage.external;
    const memoryUsed = memoryUsage.heapUsed + memoryUsage.external;
    const memoryUsagePercent = (memoryUsed / memoryTotal) * 100;

    // For this demo, we'll use mock values for response time and error rate
    // In production, these would come from the performance tracker
    const mockResponseTimeP95 = Math.random() * 3000 + 500; // 500-3500ms
    const mockErrorRate5min = Math.random() * 3; // 0-3%

    return {
      response_time_p95: mockResponseTimeP95,
      error_rate_5min: mockErrorRate5min,
      cache_hit_rate: cacheHealth.overall.hitRate * 100,
      memory_usage_percent: memoryUsagePercent,
      uptime_seconds: process.uptime()
    };
  } catch (error) {
    console.error('Failed to collect metrics for alerting:', error);
    return {};
  }
}