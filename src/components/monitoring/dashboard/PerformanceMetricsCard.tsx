import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Activity, Clock, AlertTriangle } from 'lucide-react';

interface PerformanceMetricsCardProps {
  metrics: {
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
        fiveMinute: number;
        oneHour: number;
      };
    };
  } | null;
}

export function PerformanceMetricsCard({ metrics }: PerformanceMetricsCardProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics ? `${metrics.performance.responseTime.current}ms` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Avg: {metrics ? `${metrics.performance.responseTime.average}ms` : 'N/A'}
          </p>
          <div className="text-xs mt-1">
            <span className="text-muted-foreground">P95: </span>
            <span className="font-medium">
              {metrics ? `${metrics.performance.responseTime.p95}ms` : 'N/A'}
            </span>
            <span className="text-muted-foreground ml-2">P99: </span>
            <span className="font-medium">
              {metrics ? `${metrics.performance.responseTime.p99}ms` : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Throughput</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics ? `${metrics.performance.throughput.requestsPerSecond.toFixed(1)} req/s` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics ? `${metrics.performance.throughput.requestsPerMinute} requests/min` : 'N/A'}
          </p>
          <div className="text-xs mt-1">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">
              {metrics ? metrics.performance.throughput.totalRequests.toLocaleString() : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={metrics && metrics.performance.errorRate.current > 1 ? 'text-red-600' : ''}>
              {metrics ? `${metrics.performance.errorRate.current.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Last 5min: {metrics ? `${metrics.performance.errorRate.fiveMinute.toFixed(2)}%` : 'N/A'}
          </p>
          <div className="text-xs mt-1">
            <span className="text-muted-foreground">1hr avg: </span>
            <span className="font-medium">
              {metrics ? `${metrics.performance.errorRate.oneHour.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}