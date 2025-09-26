/**
 * Sentry Server Configuration
 * Error tracking and performance monitoring for server-side
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment configuration
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',

  // Server-specific configuration
  debug: process.env.NODE_ENV === 'development',

  // Performance monitoring for server
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Error filtering for server
  beforeSend(event) {
    // Enhanced error context for RAG agent
    if (event.request) {
      // Add RAG-specific context
      event.tags = {
        ...event.tags,
        api_endpoint: event.request.url,
        component: 'rag-server'
      };
    }

    // Filter out known development issues
    if (process.env.NODE_ENV === 'development') {
      console.warn('Sentry server error (dev mode):', event);
      return null;
    }

    return event;
  },

  // Server-specific integrations
  integrations: [
    // HTTP integration for API monitoring
    Sentry.httpIntegration({
      tracing: {
        ignoreIncomingRequests: (url) => {
          // Ignore health checks and static assets
          return url.includes('/health') ||
                 url.includes('/_next/') ||
                 url.includes('/favicon');
        }
      }
    }),
  ],

  // Add server context
  initialScope: {
    tags: {
      component: 'rag-server',
      version: '0.6.0',
      service: 'speedboat-agent'
    }
  }
});