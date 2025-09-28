import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { Database } from 'lucide-react';

interface CacheMetricsSectionProps {
  metrics: {
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
  } | null;
}

export function CacheMetricsSection({ metrics }: CacheMetricsSectionProps) {
  const getHealthColor = (health: string): string => {
    switch (health) {
      case 'optimal': return 'success';
      case 'degraded': return 'warning';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache Performance
        </CardTitle>
        <CardDescription>
          Redis cache hit rates and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {metrics && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Hit Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {(metrics.cache.hitRate.overall * 100).toFixed(1)}%
                  </span>
                  <Progress
                    value={metrics.cache.hitRate.overall * 100}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Embedding Cache</p>
                  <p className="text-lg font-semibold">
                    {(metrics.cache.hitRate.embedding * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Classification Cache</p>
                  <p className="text-lg font-semibold">
                    {(metrics.cache.hitRate.classification * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Search Results</p>
                  <p className="text-lg font-semibold">
                    {(metrics.cache.hitRate.searchResult * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                  <p className="text-sm font-medium">
                    {metrics.cache.performance.averageLatency}ms
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Operations</p>
                  <p className="text-sm font-medium">
                    {metrics.cache.performance.totalOperations.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Health Status</p>
                  <Badge variant={getHealthColor(metrics.cache.health) as any}>
                    {metrics.cache.health}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}