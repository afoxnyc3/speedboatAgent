/**
 * Alert System Type Definitions
 */

export interface AlertRule {
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

export interface AlertStatus {
  ruleId: string;
  triggered: boolean;
  firstTriggered?: string;
  lastTriggered?: string;
  count: number;
  resolved?: string;
  currentValue?: number;
}

export interface AlertSystemStatus {
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