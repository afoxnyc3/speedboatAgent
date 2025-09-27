/**
 * Real-time Production Monitoring Dashboard
 * Provides comprehensive system visibility for demo day confidence
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Progress } from '../../src/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  Database,
  Clock,
  Minus,
  RefreshCw,
  Server,
  Brain,
  Eye
} from 'lucide-react';

// Import dashboard metrics interface from the API route
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

interface AlertSystemStatus {
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
}

const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard metrics
  const fetchMetrics = async () => {
    try {
      const [metricsResponse, alertsResponse] = await Promise.all([
        fetch('/api/monitoring/dashboard'),
        fetch('/api/monitoring/alerts')
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      setLoading(false);
    }
  };

  // Auto-refresh setup
  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Format time duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': case 'optimal': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': case 'critical': case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'optimal': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': case 'critical': case 'down': return <AlertTriangle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Production Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 ${getStatusColor(metrics?.system.status || 'unknown')}`}>
              {getStatusIcon(metrics?.system.status || 'unknown')}
              <span className="text-2xl font-bold capitalize">
                {metrics?.system.status || 'Unknown'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {metrics ? formatDuration(metrics.system.uptime) : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? `${metrics.performance.responseTime.p95.toFixed(0)}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              P95 • Avg: {metrics ? `${metrics.performance.responseTime.average.toFixed(0)}ms` : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? `${metrics.performance.errorRate.last5min.toFixed(2)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 5 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? `${(metrics.cache.hitRate.overall * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall cache performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Real-time application performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Response Time (P95)</span>
                <span>{metrics ? `${metrics.performance.responseTime.p95.toFixed(0)}ms` : 'N/A'}</span>
              </div>
              <Progress value={metrics ? Math.min((metrics.performance.responseTime.p95 / 5000) * 100, 100) : 0} />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Throughput</span>
                <span>{metrics ? `${metrics.performance.throughput.requestsPerSecond.toFixed(1)} req/s` : 'N/A'}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics ? `${metrics.performance.throughput.totalRequests} total requests` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Error Rate</span>
                <span className={metrics?.performance.errorRate.last5min > 5 ? 'text-red-600' : ''}>
                  {metrics ? `${metrics.performance.errorRate.last5min.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
              <Progress
                value={metrics ? Math.min(metrics.performance.errorRate.last5min * 20, 100) : 0}
                className={metrics?.performance.errorRate.last5min > 5 ? '[&>div]:bg-red-500' : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cache Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Performance
            </CardTitle>
            <CardDescription>Cache hit rates by type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center gap-2 ${getStatusColor(metrics?.cache.health || 'unknown')}`}>
              {getStatusIcon(metrics?.cache.health || 'unknown')}
              <span className="font-medium capitalize">
                Cache Health: {metrics?.cache.health || 'Unknown'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall</span>
                  <span>{metrics ? `${(metrics.cache.hitRate.overall * 100).toFixed(1)}%` : 'N/A'}</span>
                </div>
                <Progress value={metrics ? metrics.cache.hitRate.overall * 100 : 0} />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Embeddings</span>
                  <span>{metrics ? `${(metrics.cache.hitRate.embedding * 100).toFixed(1)}%` : 'N/A'}</span>
                </div>
                <Progress value={metrics ? metrics.cache.hitRate.embedding * 100 : 0} />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Search Results</span>
                  <span>{metrics ? `${(metrics.cache.hitRate.searchResult * 100).toFixed(1)}%` : 'N/A'}</span>
                </div>
                <Progress value={metrics ? metrics.cache.hitRate.searchResult * 100 : 0} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resources & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Resources
            </CardTitle>
            <CardDescription>Memory usage and service connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span>{metrics ? `${metrics.resources.memory.usage.toFixed(1)}%` : 'N/A'}</span>
              </div>
              <Progress
                value={metrics ? metrics.resources.memory.usage : 0}
                className={metrics?.resources.memory.usage > 80 ? '[&>div]:bg-yellow-500' : ''}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {metrics ? `${formatBytes(metrics.resources.memory.used)} / ${formatBytes(metrics.resources.memory.total)}` : 'N/A'}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Service Connections</h4>
              <div className="grid grid-cols-2 gap-2">
                {metrics && Object.entries(metrics.resources.connections).map(([service, connected]) => (
                  <div key={service} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{service}</span>
                    <Badge variant={connected ? "default" : "destructive"}>
                      {connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
            <CardDescription>
              {metrics ? `${metrics.alerts.active} active alerts` : 'Loading alerts...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.alerts.active === 0 ? (
              <div className="flex items-center justify-center py-8 text-green-600">
                <CheckCircle className="h-12 w-12 mb-2" />
                <div className="text-center">
                  <p className="font-medium">All systems operational</p>
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics?.alerts.recent.slice(0, 5).map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`mt-0.5 ${
                      alert.type === 'error' ? 'text-red-500' :
                      alert.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                        {alert.resolved && ' • Resolved'}
                      </p>
                    </div>
                    <Badge variant={
                      alert.type === 'error' ? 'destructive' :
                      alert.type === 'warning' ? 'secondary' : 'default'
                    }>
                      {alert.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Users & Environment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Users
            </CardTitle>
            <CardDescription>Real-time user activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {metrics?.activeUsers.current || 0}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Peak today: {metrics?.activeUsers.peak || 0}</p>
              <p>Active sessions: {metrics?.activeUsers.sessions || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>Environment and version details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Environment:</span>
                <Badge variant="outline">{metrics?.system.environment || 'Unknown'}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {metrics?.system.version || 'Unknown'}
                </code>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span className="text-muted-foreground">
                  {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Alert System:</span>
                <Badge variant={alerts?.systemHealth.alertingSystem === 'healthy' ? 'default' : 'destructive'}>
                  {alerts?.systemHealth.alertingSystem || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringDashboard;