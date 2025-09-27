/**
 * Performance Tracker for storing metrics in memory
 */

export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private responseTimes: number[] = [];
  private errorCounts: { timestamp: number; count: number }[] = [];
  private requestCounts: { timestamp: number; count: number }[] = [];
  private activeConnections = new Set<string>();
  private sessionCount = 0;
  private startTime = Date.now();

  public static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  addResponseTime(time: number): void {
    this.responseTimes.push(time);
    // Keep only last 1000 entries
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  incrementRequests(): void {
    const now = Date.now();
    this.requestCounts.push({ timestamp: now, count: 1 });
    // Keep only last hour of data
    const oneHourAgo = now - 60 * 60 * 1000;
    this.requestCounts = this.requestCounts.filter(r => r.timestamp > oneHourAgo);
  }

  incrementErrors(): void {
    const now = Date.now();
    this.errorCounts.push({ timestamp: now, count: 1 });
    // Keep only last hour of data
    const oneHourAgo = now - 60 * 60 * 1000;
    this.errorCounts = this.errorCounts.filter(e => e.timestamp > oneHourAgo);
  }

  addActiveConnection(sessionId: string): void {
    this.activeConnections.add(sessionId);
    this.sessionCount = Math.max(this.sessionCount, this.activeConnections.size);
  }

  removeActiveConnection(sessionId: string): void {
    this.activeConnections.delete(sessionId);
  }

  getMetrics(): {
    responseTime: { current: number; average: number; p95: number; p99: number };
    throughput: { requestsPerSecond: number; requestsPerMinute: number; totalRequests: number };
    errorRate: { current: number; last5min: number; last1hour: number };
    activeUsers: { current: number; peak: number; sessions: number };
    uptime: number;
  } {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinAgo = now - 60 * 1000;

    // Calculate response time metrics
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const current = sortedTimes[sortedTimes.length - 1] || 0;
    const average = sortedTimes.length > 0 ?
      sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length : 0;
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    const p95 = sortedTimes[p95Index] || 0;
    const p99 = sortedTimes[p99Index] || 0;

    // Calculate throughput
    const recentRequests = this.requestCounts.filter(r => r.timestamp > oneMinAgo);
    const requestsPerSecond = recentRequests.length / 60;
    const requestsPerMinute = this.requestCounts.filter(r => r.timestamp > oneMinAgo).length;
    const totalRequests = this.requestCounts.length;

    // Calculate error rates
    const recentErrors = this.errorCounts.filter(e => e.timestamp > fiveMinAgo);
    const hourlyErrors = this.errorCounts.filter(e => e.timestamp > oneHourAgo);
    const recentRequests5min = this.requestCounts.filter(r => r.timestamp > fiveMinAgo);
    const hourlyRequests = this.requestCounts.filter(r => r.timestamp > oneHourAgo);

    const currentErrorRate = recentRequests.length > 0 ?
      this.errorCounts.filter(e => e.timestamp > oneMinAgo).length / recentRequests.length * 100 : 0;
    const last5minErrorRate = recentRequests5min.length > 0 ?
      recentErrors.length / recentRequests5min.length * 100 : 0;
    const last1hourErrorRate = hourlyRequests.length > 0 ?
      hourlyErrors.length / hourlyRequests.length * 100 : 0;

    return {
      responseTime: { current, average, p95, p99 },
      throughput: { requestsPerSecond, requestsPerMinute, totalRequests },
      errorRate: { current: currentErrorRate, last5min: last5minErrorRate, last1hour: last1hourErrorRate },
      activeUsers: {
        current: this.activeConnections.size,
        peak: this.sessionCount,
        sessions: this.activeConnections.size
      },
      uptime: (now - this.startTime) / 1000
    };
  }
}