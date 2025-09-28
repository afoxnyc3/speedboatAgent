import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Brain, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertsSectionProps {
  alerts: {
    timestamp: string;
    alertsEnabled: boolean;
    totalRules: number;
    activeAlerts: number;
    systemHealth: {
      alertingSystem: 'healthy' | 'degraded' | 'down';
      lastCheck: string;
      checks: {
        sentryConnection: boolean;
        metricsCollection: boolean;
        ruleEvaluation: boolean;
      };
    };
  } | null;
  metrics: {
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
  } | null;
}

export function AlertsSection({ alerts, metrics }: AlertsSectionProps) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };


  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Alert System
        </CardTitle>
        <CardDescription>
          Real-time alerts and system notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <Badge variant={alerts.alertsEnabled ? 'success' : 'secondary'}>
                  {alerts.alertsEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Badge variant="outline">
                  {alerts.totalRules} rules
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={
                  alerts.systemHealth.alertingSystem === 'healthy' ? 'success' :
                  alerts.systemHealth.alertingSystem === 'degraded' ? 'warning' : 'destructive'
                }>
                  {alerts.systemHealth.alertingSystem}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center">
                {alerts.systemHealth.checks.sentryConnection ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                )}
                <p className="text-xs mt-1">Sentry</p>
              </div>
              <div className="text-center">
                {alerts.systemHealth.checks.metricsCollection ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                )}
                <p className="text-xs mt-1">Metrics</p>
              </div>
              <div className="text-center">
                {alerts.systemHealth.checks.ruleEvaluation ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                )}
                <p className="text-xs mt-1">Rules</p>
              </div>
            </div>

            {metrics && metrics.alerts.recent.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Recent Alerts</p>
                {metrics.alerts.recent.slice(0, 3).map((alert, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    {alert.resolved && (
                      <Badge variant="success" className="text-xs">Resolved</Badge>
                    )}
                  </div>
                ))}
                {metrics.alerts.recent.length > 3 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{metrics.alerts.recent.length - 3} more alerts
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{alerts.activeAlerts}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {metrics ? metrics.alerts.critical : 0}
                </p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {metrics ? metrics.alerts.warnings : 0}
                </p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}