/**
 * Alert Management API
 * Handles alert configuration, status tracking, and notification management
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { AlertSystemStatus } from '@/lib/monitoring/alerts/types';
import { DEFAULT_ALERT_RULES } from '@/lib/monitoring/alerts/default-rules';
import { AlertManager } from '@/lib/monitoring/alerts/alert-manager';
import { collectMetrics } from '@/lib/monitoring/alerts/metrics-collector';

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