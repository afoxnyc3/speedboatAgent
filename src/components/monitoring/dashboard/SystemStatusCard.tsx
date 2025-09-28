import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Server, CheckCircle, AlertTriangle, Minus } from 'lucide-react';

interface SystemStatusCardProps {
  metrics: {
    system: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      uptime: number;
      environment: string;
      version: string;
    };
  } | null;
}

export function SystemStatusCard({ metrics }: SystemStatusCardProps) {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': case 'optimal': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': case 'critical': case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'optimal': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': case 'critical': case 'down': return <AlertTriangle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">System Status</CardTitle>
        <Server className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold flex items-center gap-2">
          {metrics && (
            <>
              <span className={getStatusColor(metrics.system.status)}>
                {getStatusIcon(metrics.system.status)}
              </span>
              <span className="capitalize">{metrics.system.status}</span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Uptime: {metrics ? formatDuration(metrics.system.uptime) : 'N/A'}
        </p>
        <div className="flex gap-2 mt-2">
          {metrics && (
            <>
              <Badge variant="outline" className="text-xs">
                {metrics.system.environment}
              </Badge>
              <Badge variant="outline" className="text-xs">
                v{metrics.system.version}
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}