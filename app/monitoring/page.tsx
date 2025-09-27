/**
 * Real-time Production Monitoring Dashboard
 * Provides comprehensive system visibility for demo day confidence
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../src/components/ui/button';
import {
  SystemStatusCard,
  PerformanceMetricsCard,
  CacheMetricsSection,
  AlertsSection,
  ResourcesSection
} from '../../src/components/monitoring/dashboard';
import { RefreshCw, Eye } from 'lucide-react';

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
        <SystemStatusCard metrics={metrics} />
        <PerformanceMetricsCard metrics={metrics} />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <CacheMetricsSection metrics={metrics} />
      </div>

      {/* Alerts and Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AlertsSection alerts={alerts} metrics={metrics} />
        <ResourcesSection metrics={metrics} />
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MonitoringDashboard;