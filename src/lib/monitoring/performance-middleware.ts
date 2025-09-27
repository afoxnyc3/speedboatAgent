/**
 * Performance Tracking Middleware
 * Integrates with Vercel Analytics and Sentry for comprehensive monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { Sentry } from '../../../sentry.server.config';

// Performance tracker interface
interface PerformanceEvent {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  tags?: Record<string, string>;
  timestamp: number;
}

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private events: PerformanceEvent[] = [];
  private readonly maxEvents = 1000;

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Track a performance event
   */
  track(event: PerformanceEvent): void {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Send to Vercel Analytics if available
    if (typeof window !== 'undefined' && 'analytics' in window) {
      try {
        (window as any).analytics.track(event.name, {
          value: event.value,
          unit: event.unit,
          ...event.tags
        });
      } catch (error) {
        console.warn('Failed to send analytics event:', error);
      }
    }

    // Send to Sentry for server-side tracking
    if (typeof window === 'undefined') {
      try {
        Sentry.addBreadcrumb({
          message: `Performance: ${event.name}`,
          category: 'performance',
          data: {
            value: event.value,
            unit: event.unit,
            ...event.tags
          },
          level: event.value > this.getThreshold(event.name) ? 'warning' : 'info'
        });
      } catch (error) {
        console.warn('Failed to send Sentry breadcrumb:', error);
      }
    }
  }

  /**
   * Get performance threshold for alerting
   */
  private getThreshold(eventName: string): number {
    const thresholds: Record<string, number> = {
      api_response_time: 5000, // 5 seconds
      cache_operation: 1000,   // 1 second
      db_query: 2000,          // 2 seconds
      embedding_generation: 3000, // 3 seconds
      search_operation: 4000   // 4 seconds
    };

    return thresholds[eventName] || 1000;
  }

  /**
   * Get recent events for dashboard
   */
  getEvents(limit = 100): PerformanceEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): {
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
    cacheHitRate: number;
  } {
    const responseTimeEvents = this.events.filter(e => e.name === 'api_response_time');
    const requestEvents = this.events.filter(e => e.name === 'api_request');
    const errorEvents = this.events.filter(e => e.name === 'api_error');
    const cacheEvents = this.events.filter(e => e.name.includes('cache'));

    const averageResponseTime = responseTimeEvents.length > 0 ?
      responseTimeEvents.reduce((sum, e) => sum + e.value, 0) / responseTimeEvents.length : 0;

    const requestCount = requestEvents.length;
    const errorRate = requestCount > 0 ? (errorEvents.length / requestCount) * 100 : 0;

    const cacheHits = cacheEvents.filter(e => e.tags?.result === 'hit').length;
    const cacheMisses = cacheEvents.filter(e => e.tags?.result === 'miss').length;
    const cacheHitRate = (cacheHits + cacheMisses) > 0 ?
      (cacheHits / (cacheHits + cacheMisses)) * 100 : 0;

    return {
      averageResponseTime,
      requestCount,
      errorRate,
      cacheHitRate
    };
  }
}

/**
 * Performance monitoring middleware
 */
export function performanceMiddleware(request: NextRequest): NextResponse {
  const startTime = Date.now();
  const tracker = PerformanceTracker.getInstance();

  // Track request start
  tracker.track({
    name: 'api_request',
    value: 1,
    unit: 'count',
    tags: {
      method: request.method,
      pathname: request.nextUrl.pathname,
      user_agent: request.headers.get('user-agent')?.slice(0, 50) || 'unknown'
    },
    timestamp: startTime
  });

  // Continue with the request
  const response = NextResponse.next();

  // Add performance headers
  response.headers.set('X-Request-Start', startTime.toString());

  return response;
}

/**
 * Performance tracking decorator for API routes
 */
export function withPerformanceTracking<T extends any[], R>(
  name: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const tracker = PerformanceTracker.getInstance();

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      // Track successful operation
      tracker.track({
        name,
        value: duration,
        unit: 'ms',
        tags: {
          status: 'success',
          operation: name
        },
        timestamp: startTime
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track failed operation
      tracker.track({
        name: `${name}_error`,
        value: duration,
        unit: 'ms',
        tags: {
          status: 'error',
          operation: name,
          error_type: error instanceof Error ? error.constructor.name : 'unknown'
        },
        timestamp: startTime
      });

      // Track error for metrics
      tracker.track({
        name: 'api_error',
        value: 1,
        unit: 'count',
        tags: {
          operation: name,
          error_message: error instanceof Error ? error.message.slice(0, 100) : 'unknown'
        },
        timestamp: Date.now()
      });

      throw error;
    }
  };
}

/**
 * Track cache operations
 */
export function trackCacheOperation(
  operation: 'get' | 'set' | 'delete',
  cacheType: string,
  result: 'hit' | 'miss' | 'success' | 'error',
  duration?: number
): void {
  const tracker = PerformanceTracker.getInstance();

  tracker.track({
    name: `cache_${operation}`,
    value: duration || 0,
    unit: 'ms',
    tags: {
      cache_type: cacheType,
      result,
      operation
    },
    timestamp: Date.now()
  });
}

/**
 * Track database operations
 */
export function trackDatabaseOperation(
  operation: string,
  duration: number,
  resultCount?: number,
  error?: boolean
): void {
  const tracker = PerformanceTracker.getInstance();

  tracker.track({
    name: 'db_query',
    value: duration,
    unit: 'ms',
    tags: {
      operation,
      result_count: resultCount?.toString() || '0',
      status: error ? 'error' : 'success'
    },
    timestamp: Date.now()
  });
}

/**
 * Track AI service operations
 */
export function trackAIOperation(
  service: 'openai' | 'embedding' | 'chat',
  operation: string,
  duration: number,
  tokenCount?: number,
  error?: boolean
): void {
  const tracker = PerformanceTracker.getInstance();

  tracker.track({
    name: `ai_${service}`,
    value: duration,
    unit: 'ms',
    tags: {
      service,
      operation,
      token_count: tokenCount?.toString() || '0',
      status: error ? 'error' : 'success'
    },
    timestamp: Date.now()
  });
}

/**
 * Complete request tracking
 */
export function completeRequestTracking(
  request: NextRequest,
  response: NextResponse,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  const tracker = PerformanceTracker.getInstance();

  // Track response time
  tracker.track({
    name: 'api_response_time',
    value: duration,
    unit: 'ms',
    tags: {
      method: request.method,
      pathname: request.nextUrl.pathname,
      status: response.status.toString(),
      status_class: `${Math.floor(response.status / 100)}xx`
    },
    timestamp: startTime
  });

  // Add response headers
  response.headers.set('X-Response-Time', `${duration}ms`);
  response.headers.set('X-Timestamp', new Date().toISOString());
}

// Export the performance tracker for external use
export const performanceTracker = PerformanceTracker.getInstance();