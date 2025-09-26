/**
 * Performance Dashboard Component
 * Real-time monitoring of system performance and health
 */

'use client';

import React, { useState, useEffect } from 'react';

// Type definitions for dashboard data
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    redis: ComponentHealth;
    weaviate: ComponentHealth;
    openai: ComponentHealth;
    memory: ComponentHealth;
  };
  performance: {
    cacheHitRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  resources: {
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    cpuUsage: number;
  };
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

interface CacheMetrics {
  overallHitRate: number;
  totalRequests: number;
  targetMet: boolean;
  performanceGrade: string;
}

/**
 * Status indicator component
 */
const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
  );
};

/**
 * Metric card component
 */
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  status?: string;
  subtitle?: string;
}> = ({ title, value, status, subtitle }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {status && <StatusIndicator status={status} />}
    </div>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

/**
 * Main Performance Dashboard Component
 */
export const PerformanceDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  /**
   * Fetch health data from API
   */
  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    }
  };

  /**
   * Fetch cache metrics from API
   */
  const fetchCacheMetrics = async () => {
    try {
      const response = await fetch('/api/cache/metrics');
      if (!response.ok) {
        throw new Error(`Cache metrics failed: ${response.status}`);
      }
      const data = await response.json();
      setCacheMetrics({
        overallHitRate: data.data.overview.overallHitRate,
        totalRequests: data.data.overview.totalRequests,
        targetMet: data.data.overview.targetMet,
        performanceGrade: data.data.overview.performanceGrade
      });
    } catch (err) {
      console.warn('Failed to fetch cache metrics:', err);
    }
  };

  /**
   * Fetch all dashboard data
   */
  const fetchDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      fetchHealthData(),
      fetchCacheMetrics()
    ]);
    setLastUpdated(new Date());
    setLoading(false);
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  /**
   * Format uptime for display
   */
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  /**
   * Format memory usage for display
   */
  const formatMemory = (bytes: number): string => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  if (loading && !healthData) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Dashboard Error</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Performance Dashboard</h1>
          <p className="text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* System Status */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="System Status"
            value={healthData.status.toUpperCase()}
            status={healthData.status}
            subtitle={`v${healthData.version} (${healthData.environment})`}
          />
          <MetricCard
            title="Uptime"
            value={formatUptime(healthData.uptime)}
            subtitle="System runtime"
          />
          <MetricCard
            title="Memory Usage"
            value={formatMemory(healthData.resources.memoryUsage.heapUsed)}
            subtitle={`of ${formatMemory(healthData.resources.memoryUsage.heapTotal)} heap`}
          />
          <MetricCard
            title="Response Time"
            value={`${healthData.performance.averageResponseTime}ms`}
            subtitle="Average API response"
          />
        </div>
      )}

      {/* Component Health */}
      {healthData && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Component Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(healthData.components).map(([name, component]) => (
              <MetricCard
                key={name}
                title={name.charAt(0).toUpperCase() + name.slice(1)}
                value={component.status.toUpperCase()}
                status={component.status}
                subtitle={component.latency ? `${component.latency}ms latency` : component.error || 'Connected'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {(healthData || cacheMetrics) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cacheMetrics && (
              <>
                <MetricCard
                  title="Cache Hit Rate"
                  value={`${cacheMetrics.overallHitRate}%`}
                  status={cacheMetrics.targetMet ? 'healthy' : 'degraded'}
                  subtitle={`Grade: ${cacheMetrics.performanceGrade}`}
                />
                <MetricCard
                  title="Cache Requests"
                  value={cacheMetrics.totalRequests.toLocaleString()}
                  subtitle="Total cache operations"
                />
              </>
            )}
            {healthData && (
              <>
                <MetricCard
                  title="Error Rate"
                  value={`${healthData.performance.errorRate}%`}
                  status={healthData.performance.errorRate < 1 ? 'healthy' : 'degraded'}
                  subtitle="System error percentage"
                />
                <MetricCard
                  title="CPU Usage"
                  value={`${healthData.resources.cpuUsage.toFixed(1)}ms`}
                  subtitle="Event loop lag"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Status Legend</h3>
        <div className="flex space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <StatusIndicator status="healthy" />
            <span>Healthy</span>
          </div>
          <div className="flex items-center space-x-2">
            <StatusIndicator status="degraded" />
            <span>Degraded</span>
          </div>
          <div className="flex items-center space-x-2">
            <StatusIndicator status="unhealthy" />
            <span>Unhealthy</span>
          </div>
        </div>
      </div>
    </div>
  );
};