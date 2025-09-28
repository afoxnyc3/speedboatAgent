/**
 * Status calculation utilities
 */

import { DashboardMetrics } from './types';

export function calculateSystemStatus(
  errorRate: number,
  responseTimeP95: number,
  cacheHitRate: number
): DashboardMetrics['system']['status'] {
  if (errorRate > 5 || responseTimeP95 > 10000) {
    return 'unhealthy';
  } else if (errorRate > 2 || responseTimeP95 > 5000 || cacheHitRate < 0.7) {
    return 'degraded';
  }
  return 'healthy';
}

export function calculateCacheHealthStatus(
  hitRate: number
): DashboardMetrics['cache']['health'] {
  if (hitRate < 0.6) {
    return 'critical';
  } else if (hitRate < 0.7) {
    return 'degraded';
  }
  return 'optimal';
}