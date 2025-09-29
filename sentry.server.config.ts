/**
 * Enhanced Sentry Server Configuration
 * Error tracking and performance monitoring with production alerts
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring - higher sample rate for production monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Environment configuration
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',

  // Server-specific configuration
  debug: process.env.NODE_ENV === 'development',

  // Performance monitoring for server
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enhanced error filtering and context
  beforeSend(event) {
    // Add comprehensive RAG agent context
    if (event.request) {
      event.tags = {
        ...event.tags,
        api_endpoint: event.request.url,
        component: 'rag-server',
        method: event.request.method,
        user_agent: event.request.headers?.['user-agent'] || 'unknown'
      };

      // Add performance context
      if (event.request.headers?.['x-response-time']) {
        event.tags.response_time = event.request.headers['x-response-time'];
      }
    }

    // Add system context
    event.contexts = {
      ...event.contexts,
      runtime: {
        name: 'node',
        version: process.version,
        type: 'server'
      },
      system: {
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
      }
    };

    // Enhanced error categorization
    if (event.exception?.values?.[0]) {
      const error = event.exception.values[0];

      // Categorize errors for better alerting
      if (error.type?.includes('Cache') || error.value?.includes('Redis')) {
        // @ts-ignore
        event.tags.error_category = 'cache';
        event.level = 'warning';
      } else if (error.type?.includes('Weaviate') || error.value?.includes('vector')) {
        // @ts-ignore
        event.tags.error_category = 'vector_db';
        event.level = 'error';
      } else if (error.type?.includes('OpenAI') || error.value?.includes('embedding')) {
        // @ts-ignore
        event.tags.error_category = 'ai_service';
        event.level = 'error';
      } else if (error.value?.includes('timeout') || error.value?.includes('ETIMEDOUT')) {
        // @ts-ignore
        event.tags.error_category = 'timeout';
        event.level = 'warning';
      } else {
        // @ts-ignore
        event.tags.error_category = 'application';
      }
    }

    // Filter out known development issues
    if (process.env.NODE_ENV === 'development') {
      console.warn('Sentry server error (dev mode):', event);
      return null;
    }

    // Filter out non-critical errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send 404s to Sentry
      // @ts-ignore
      if (event.tags?.api_endpoint?.includes('404')) {
        return null;
      }

      // Filter out health check errors
      // @ts-ignore
      if (event.tags?.api_endpoint?.includes('/health') ||
          // @ts-ignore
          event.tags?.api_endpoint?.includes('/monitoring')) {
        return null;
      }
    }

    return event;
  },

  // Enhanced integrations for production monitoring
  integrations: [
    // HTTP integration for API monitoring
    Sentry.httpIntegration({
      tracing: {
        ignoreIncomingRequests: (url: string) => {
          // More specific filtering for production
          return url.includes('/health') ||
                 url.includes('/_next/') ||
                 url.includes('/favicon') ||
                 url.includes('/_vercel/') ||
                 url.includes('/api/monitoring/dashboard'); // Don't trace monitoring itself
        },
        ignoreOutgoingRequests: (url: string) => {
          // Don't trace Sentry requests
          return url.includes('sentry.io') ||
                 url.includes('ingest.sentry.io');
        }
      }
    }) as any
  ],

  // Enhanced scope configuration
  initialScope: {
    tags: {
      component: 'rag-server',
      version: '0.6.0',
      service: 'speedboat-agent',
      deployment: process.env.VERCEL_ENV || 'development',
      region: process.env.VERCEL_REGION || 'unknown'
    },
    contexts: {
      app: {
        name: 'SpeedBoat RAG Agent',
        version: '0.6.0',
        build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown'
      }
    }
  },

  // Enhanced release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

  // Performance monitoring thresholds
  beforeSendTransaction(event) {
    // Add custom performance context
    if (event.transaction) {
      event.tags = {
        ...event.tags,
        transaction_name: event.transaction
      };
    }

    // Filter out very fast transactions to reduce noise
    if (event.start_timestamp && event.timestamp) {
      const duration = (event.timestamp - event.start_timestamp) * 1000;
      if (duration < 10) { // Less than 10ms
        return null;
      }

      // Add duration context
      // @ts-ignore
      event.tags.duration_ms = duration.toFixed(0);

      // Flag slow transactions
      if (duration > 5000) {
        // @ts-ignore
        event.tags.performance_issue = 'slow_transaction';
        event.level = 'warning';
      }
    }

    return event;
  }
});

// Export Sentry for use in monitoring endpoints
export { Sentry };