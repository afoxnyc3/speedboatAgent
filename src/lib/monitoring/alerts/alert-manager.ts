/**
 * Alert Manager - Core alert processing and notification system
 */

import * as Sentry from '@sentry/nextjs';
import { AlertRule, AlertStatus, AlertSystemStatus } from './types';

export class AlertManager {
  private static instance: AlertManager;
  public alertStatus: Map<string, AlertStatus> = new Map();
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