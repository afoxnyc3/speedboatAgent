import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { CheckCircle, XCircle, Users } from 'lucide-react';

interface ResourcesSectionProps {
  metrics: {
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
  } | null;
}

export function ResourcesSection({ metrics }: ResourcesSectionProps) {
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

  return (
    <>
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Resource Utilization</CardTitle>
          <CardDescription>
            Memory usage and connection health
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics && (
            <>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm">
                      {(metrics.resources.memory.usage * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={metrics.resources.memory.usage * 100}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatBytes(metrics.resources.memory.used)}</span>
                    <span>{formatBytes(metrics.resources.memory.total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Heap Used</p>
                    <p className="text-sm font-medium">
                      {formatBytes(metrics.resources.memory.heap.heapUsed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Heap Total</p>
                    <p className="text-sm font-medium">
                      {formatBytes(metrics.resources.memory.heap.heapTotal)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Service Connections</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(metrics.resources.connections).map(([service, connected]) => (
                      <div key={service} className="flex items-center gap-1">
                        {connected ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span className="text-xs capitalize">{service}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users
          </CardTitle>
          <CardDescription>
            Current session activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{metrics.activeUsers.current}</p>
                <p className="text-xs text-muted-foreground">Current Users</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Peak Today</p>
                  <p className="text-lg font-semibold">{metrics.activeUsers.peak}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="text-lg font-semibold">{metrics.activeUsers.sessions}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}