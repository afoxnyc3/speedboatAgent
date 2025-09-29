/**
 * Vercel Analytics Provider
 * Enhanced analytics integration with custom events for monitoring
 */

'use client';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect } from 'react';

// Custom analytics interface
interface CustomAnalytics {
  track: (event: string, properties?: Record<string, any>) => void;
  page: (path: string, properties?: Record<string, any>) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
}

declare global {
  interface Window {
    analytics?: CustomAnalytics;
  }
}

/**
 * Enhanced analytics tracking functions
 */
class AnalyticsManager {
  private static instance: AnalyticsManager;

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    this.track('performance_metric', {
      metric,
      value,
      unit: 'ms',
      ...properties
    });
  }

  /**
   * Track user interactions
   */
  trackUserAction(action: string, properties?: Record<string, any>): void {
    this.track('user_action', {
      action,
      timestamp: Date.now(),
      ...properties
    });
  }

  /**
   * Track API usage
   */
  trackAPIUsage(endpoint: string, method: string, responseTime: number, status: number): void {
    this.track('api_usage', {
      endpoint,
      method,
      response_time: responseTime,
      status,
      status_class: `${Math.floor(status / 100)}xx`
    });
  }

  /**
   * Track search queries
   */
  trackSearch(query: string, resultCount: number, responseTime: number, source?: string): void {
    this.track('search_query', {
      query_length: query.length,
      result_count: resultCount,
      response_time: responseTime,
      source: source || 'unknown',
      has_results: resultCount > 0
    });
  }

  /**
   * Track cache performance
   */
  trackCacheMetrics(type: string, hitRate: number, totalOperations: number): void {
    this.track('cache_metrics', {
      cache_type: type,
      hit_rate: hitRate,
      total_operations: totalOperations,
      performance_tier: hitRate > 0.8 ? 'excellent' : hitRate > 0.6 ? 'good' : 'poor'
    });
  }

  /**
   * Track errors
   */
  trackError(error: string, context?: Record<string, any>): void {
    this.track('error_occurred', {
      error_type: error,
      timestamp: Date.now(),
      ...context
    });
  }

  /**
   * Track system health
   */
  trackSystemHealth(status: string, components: Record<string, boolean>, uptime: number): void {
    this.track('system_health', {
      overall_status: status,
      redis_healthy: components.redis || false,
      weaviate_healthy: components.weaviate || false,
      openai_healthy: components.openai || false,
      uptime_seconds: uptime,
      health_score: Object.values(components).filter(Boolean).length / Object.keys(components).length
    });
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(metric: string, value: number, properties?: Record<string, any>): void {
    this.track('business_metric', {
      metric_name: metric,
      value,
      ...properties
    });
  }

  /**
   * Core tracking function
   */
  public track(event: string, properties?: Record<string, any>): void {
    try {
      // Vercel Analytics
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track(event, properties);
      }

      // Custom analytics (if configured)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', event, properties);
      }

      // Console logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Analytics: ${event}`, properties);
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
}

/**
 * Analytics Provider Component
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize analytics manager
    const analytics = AnalyticsManager.getInstance();

    // Track initial page load
    analytics.trackUserAction('page_load', {
      path: window.location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent.slice(0, 100)
    });

    // Track system capabilities
    analytics.track('system_capabilities', {
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      color_depth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      online: navigator.onLine,
      cookies_enabled: navigator.cookieEnabled
    });

    // Set up performance observers
    if ('PerformanceObserver' in window) {
      try {
        // Observe navigation timing
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              const t0 = performance.timeOrigin + navEntry.startTime;
              analytics.trackPerformance('page_load_time', navEntry.loadEventEnd - t0);
              analytics.trackPerformance('dom_content_loaded', navEntry.domContentLoadedEventEnd - t0);
              analytics.trackPerformance('first_paint', navEntry.loadEventStart - t0);
            }
          }
        });
        navObserver.observe({ type: 'navigation', buffered: true });

        // Observe Core Web Vitals
        const webVitalsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Type guard for entries with value property (like LayoutShift, LargestContentfulPaint)
            if ('value' in entry && typeof entry.value === 'number') {
              analytics.trackPerformance(entry.name, entry.value, {
                metric_type: 'core_web_vital',
                rating: entry.value < 2500 ? 'good' : entry.value < 4000 ? 'needs_improvement' : 'poor'
              });
            }
          }
        });

        // Observe different metric types
        ['largest-contentful-paint', 'first-input', 'layout-shift'].forEach(type => {
          try {
            webVitalsObserver.observe({ type, buffered: true });
          } catch {
            // Type might not be supported
          }
        });
      } catch (error) {
        console.warn('Performance observer setup failed:', error);
      }
    }

    // Set up unload tracking
    const handleUnload = () => {
      analytics.trackUserAction('page_unload', {
        path: window.location.pathname,
        session_duration: Date.now() - performance.timing.navigationStart
      });
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

// Export analytics manager for use in other components
export const analytics = AnalyticsManager.getInstance();