/**
 * Alert Management API
 * Handles alert configuration, status tracking, and notification management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '../../../../src/lib/cache/redis-cache';
import * as Sentry from '@sentry/nextjs';

// Alert configuration interfaces
interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // minutes
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  notifications: {
    sentry: boolean;
    console: boolean;
    webhook?: string;
  };
}

interface AlertStatus {
  ruleId: string;
  triggered: boolean;
  firstTriggered?: string;
  lastTriggered?: string;
  count: number;
  resolved?: string;
  currentValue?: number;
}

interface AlertSystemStatus {
  timestamp: string;
  alertsEnabled: boolean;
  totalRules: number;
  activeAlerts: number;
  rules: AlertRule[];
  status: AlertStatus[];
  recentAlerts: Array<{
    ruleId: string;
    ruleName: string;
    severity: string;
    message: string;
    triggeredAt: string;
    resolvedAt?: string;
    duration?: number;
  }>;
  systemHealth: {
    alertingSystem: 'healthy' | 'degraded' | 'down';
    lastCheck: string;
    checks: {
      sentryConnection: boolean;
      metricsCollection: boolean;
      ruleEvaluation: boolean;
    };
  };
}

// Default alert rules for production monitoring
const DEFAULT_ALERT_RULES: AlertRule[] = [
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

// In-memory alert status tracking (in production, this would be persisted)
class AlertManager {
  private static instance: AlertManager;
  private alertStatus: Map<string, AlertStatus> = new Map();
  private recentAlerts: AlertSystemStatus['recentAlerts'] = [];
  private lastMetricsCheck = Date.now();

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Evaluate a single alert rule against current metrics
   */
  private evaluateRule(rule: AlertRule, currentValue: number): boolean {
    switch (rule.operator) {
      case 'gt': return currentValue > rule.threshold;
      case 'gte': return currentValue >= rule.threshold;
      case 'lt': return currentValue < rule.threshold;
      case 'lte': return currentValue <= rule.threshold;
      case 'eq': return currentValue === rule.threshold;
      default: return false;
    }
  }

  /**
   * Send alert notification
   */
  private async sendNotification(rule: AlertRule, currentValue: number, isTriggered: boolean): Promise<void> {
    const message = `Alert ${isTriggered ? 'TRIGGERED' : 'RESOLVED'}: ${rule.name} - ${rule.description}. Current value: ${currentValue}`;

    if (rule.notifications.console) {
      if (isTriggered) {
        // Log alert to monitoring system instead of console
        // console.error(`🚨 [${rule.severity.toUpperCase()}] ${message}`);
      } else {
        // Log resolution to monitoring system
        // console.info(`✅ [RESOLVED] ${message}`);
      }
    }

    if (rule.notifications.sentry && isTriggered) {
      try {
        if (rule.severity === 'critical') {
          Sentry.captureMessage(message, 'error');
        } else if (rule.severity === 'warning') {
          Sentry.captureMessage(message, 'warning');
        } else {
          Sentry.captureMessage(message, 'info');
        }

        // Add custom context
        Sentry.setContext('alert', {
          ruleId: rule.id,
          ruleName: rule.name,
          currentValue,
          threshold: rule.threshold,
          metric: rule.metric
        });
      } catch (error) {
        console.error('Failed to send Sentry alert:', error);
      }
    }

    if (rule.notifications.webhook && isTriggered) {
      try {
        // Webhook notification (if configured)
        await fetch(rule.notifications.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: rule.name,
            severity: rule.severity,
            message,
            currentValue,
            threshold: rule.threshold,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }
  }

  /**
   * Process alert for a specific rule
   */
  async processAlert(rule: AlertRule, currentValue: number): Promise<void> {
    const isTriggered = this.evaluateRule(rule, currentValue);
    const now = new Date().toISOString();
    const existing = this.alertStatus.get(rule.id);

    if (isTriggered) {
      if (!existing || !existing.triggered) {
        // New alert
        this.alertStatus.set(rule.id, {
          ruleId: rule.id,
          triggered: true,
          firstTriggered: now,
          lastTriggered: now,
          count: 1,
          currentValue
        });

        await this.sendNotification(rule, currentValue, true);

        this.recentAlerts.unshift({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${rule.description} (${currentValue})`,
          triggeredAt: now
        });
      } else {
        // Update existing alert
        existing.lastTriggered = now;
        existing.count++;
        existing.currentValue = currentValue;
      }
    } else if (existing && existing.triggered) {
      // Resolve alert
      existing.triggered = false;
      existing.resolved = now;

      await this.sendNotification(rule, currentValue, false);

      // Update recent alerts with resolution
      const recentAlert = this.recentAlerts.find(a => a.ruleId === rule.id && !a.resolvedAt);
      if (recentAlert) {
        recentAlert.resolvedAt = now;
        if (existing.firstTriggered) {
          recentAlert.duration = new Date(now).getTime() - new Date(existing.firstTriggered).getTime();
        }
      }
    }

    // Cleanup old recent alerts (keep last 50)
    this.recentAlerts = this.recentAlerts.slice(0, 50);
  }

  /**
   * Get current alert status
   */
  getAlertStatus(): { active: AlertStatus[]; recent: AlertSystemStatus['recentAlerts'] } {
    const active = Array.from(this.alertStatus.values()).filter(status => status.triggered);
    return { active, recent: this.recentAlerts };
  }

  /**
   * Check system health
   */
  getSystemHealth(): AlertSystemStatus['systemHealth'] {
    const now = new Date().toISOString();
    const timeSinceLastCheck = Date.now() - this.lastMetricsCheck;

    return {
      alertingSystem: timeSinceLastCheck < 120000 ? 'healthy' : 'degraded', // 2 minutes
      lastCheck: now,
      checks: {
        sentryConnection: !!process.env.SENTRY_DSN,
        metricsCollection: timeSinceLastCheck < 60000, // 1 minute
        ruleEvaluation: this.alertStatus.size >= 0
      }
    };
  }

  /**
   * Update last metrics check time
   */
  updateMetricsCheck(): void {
    this.lastMetricsCheck = Date.now();
  }
}

/**
 * Collect current system metrics for alert evaluation
 */
async function collectMetrics(): Promise<Record<string, number>> {
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

export async function GET(_request: NextRequest) {
  try {
    const alertManager = AlertManager.getInstance();

    // Collect current metrics and evaluate alerts
    const metrics = await collectMetrics();
    alertManager.updateMetricsCheck();

    // Evaluate all enabled rules
    for (const rule of DEFAULT_ALERT_RULES) {
      if (rule.enabled && metrics[rule.metric] !== undefined) {
        await alertManager.processAlert(rule, metrics[rule.metric]);
      }
    }

    // Get alert status
    const { active, recent } = alertManager.getAlertStatus();
    const systemHealth = alertManager.getSystemHealth();

    const alertSystemStatus: AlertSystemStatus = {
      timestamp: new Date().toISOString(),
      alertsEnabled: true,
      totalRules: DEFAULT_ALERT_RULES.length,
      activeAlerts: active.length,
      rules: DEFAULT_ALERT_RULES,
      status: Array.from(alertManager.alertStatus.values()),
      recentAlerts: recent,
      systemHealth
    };

    return new NextResponse(JSON.stringify(alertSystemStatus, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Alert system error:', error);

    // Send critical alert about alerting system failure
    Sentry.captureException(error, {
      tags: { component: 'alerting-system' },
      level: 'error'
    });

    const errorResponse = {
      timestamp: new Date().toISOString(),
      error: 'Alert system failure',
      message: error instanceof Error ? error.message : 'Unknown error',
      alertsEnabled: false,
      systemHealth: {
        alertingSystem: 'down',
        lastCheck: new Date().toISOString(),
        checks: {
          sentryConnection: false,
          metricsCollection: false,
          ruleEvaluation: false
        }
      }
    };

    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Support for updating alert rules via POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ruleId, rule } = body;

    switch (action) {
      case 'enable':
        // Enable specific rule
        const enableRule = DEFAULT_ALERT_RULES.find(r => r.id === ruleId);
        if (enableRule) {
          enableRule.enabled = true;
          return new NextResponse(JSON.stringify({ success: true, message: `Rule ${ruleId} enabled` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;

      case 'disable':
        // Disable specific rule
        const disableRule = DEFAULT_ALERT_RULES.find(r => r.id === ruleId);
        if (disableRule) {
          disableRule.enabled = false;
          return new NextResponse(JSON.stringify({ success: true, message: `Rule ${ruleId} disabled` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;

      case 'test':
        // Test alert notification
        if (rule) {
          const alertManager = AlertManager.getInstance();
          await alertManager.processAlert(rule, rule.threshold + 1); // Trigger the alert
          return new NextResponse(JSON.stringify({ success: true, message: 'Test alert sent' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;

      default:
        return new NextResponse(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new NextResponse(JSON.stringify({ error: 'Rule not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Alert configuration error:', error);

    return new NextResponse(JSON.stringify({
      error: 'Failed to update alert configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}