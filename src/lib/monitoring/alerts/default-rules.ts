/**
 * Default Alert Rules Configuration
 */

import { AlertRule } from './types';

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'response-time-critical',
    name: 'Response Time Critical',
    description: 'P95 response time exceeds 10 seconds',
    metric: 'response_time_p95',
    operator: 'gt',
    threshold: 10000,
    duration: 2,
    severity: 'critical',
    enabled: true,
    notifications: {
      sentry: true,
      console: true
    }
  },
  {
    id: 'response-time-warning',
    name: 'Response Time Warning',
    description: 'P95 response time exceeds 5 seconds',
    metric: 'response_time_p95',
    operator: 'gt',
    threshold: 5000,
    duration: 5,
    severity: 'warning',
    enabled: true,
    notifications: {
      sentry: false,
      console: true
    }
  },
  {
    id: 'error-rate-critical',
    name: 'Error Rate Critical',
    description: 'Error rate exceeds 5% over 5 minutes',
    metric: 'error_rate_5min',
    operator: 'gt',
    threshold: 5,
    duration: 5,
    severity: 'critical',
    enabled: true,
    notifications: {
      sentry: true,
      console: true
    }
  },
  {
    id: 'error-rate-warning',
    name: 'Error Rate Warning',
    description: 'Error rate exceeds 2% over 5 minutes',
    metric: 'error_rate_5min',
    operator: 'gt',
    threshold: 2,
    duration: 3,
    severity: 'warning',
    enabled: true,
    notifications: {
      sentry: false,
      console: true
    }
  },
  {
    id: 'cache-hit-rate-critical',
    name: 'Cache Hit Rate Critical',
    description: 'Cache hit rate below 60%',
    metric: 'cache_hit_rate',
    operator: 'lt',
    threshold: 60,
    duration: 10,
    severity: 'critical',
    enabled: true,
    notifications: {
      sentry: true,
      console: true
    }
  },
  {
    id: 'cache-hit-rate-warning',
    name: 'Cache Hit Rate Warning',
    description: 'Cache hit rate below 70%',
    metric: 'cache_hit_rate',
    operator: 'lt',
    threshold: 70,
    duration: 15,
    severity: 'warning',
    enabled: true,
    notifications: {
      sentry: false,
      console: true
    }
  },
  {
    id: 'memory-usage-critical',
    name: 'Memory Usage Critical',
    description: 'Memory usage exceeds 90%',
    metric: 'memory_usage_percent',
    operator: 'gt',
    threshold: 90,
    duration: 5,
    severity: 'critical',
    enabled: true,
    notifications: {
      sentry: true,
      console: true
    }
  },
  {
    id: 'memory-usage-warning',
    name: 'Memory Usage Warning',
    description: 'Memory usage exceeds 80%',
    metric: 'memory_usage_percent',
    operator: 'gt',
    threshold: 80,
    duration: 10,
    severity: 'warning',
    enabled: true,
    notifications: {
      sentry: false,
      console: true
    }
  },
  {
    id: 'uptime-critical',
    name: 'Service Down',
    description: 'Service uptime indicates restart or crash',
    metric: 'uptime_seconds',
    operator: 'lt',
    threshold: 300, // 5 minutes
    duration: 1,
    severity: 'critical',
    enabled: true,
    notifications: {
      sentry: true,
      console: true
    }
  }
];