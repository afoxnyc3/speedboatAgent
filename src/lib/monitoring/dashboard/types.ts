/**
 * Dashboard Monitoring Type Definitions
 */

export interface PerformanceMetrics {
  responseTime: { current: number; average: number; p95: number; p99: number };
  throughput: { requestsPerSecond: number; requestsPerMinute: number; totalRequests: number };
  errorRate: { current: number; fiveMinute: number; oneHour: number };
}

export interface CacheHealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  hitRate: number;
  operations: { hits: number; misses: number; total: number };
  latency: { average: number; p95: number };
}

export interface DashboardMetrics {
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