/**
 * Sentry Client Configuration
 * Error tracking and performance monitoring for client-side
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment configuration
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',

  // Integration configuration
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content, but capture clicks and navigation
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance monitoring
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Error filtering
  beforeSend(event) {
    // Filter out development errors and known issues
    if (process.env.NODE_ENV === 'development') {
      // Log to console in development but don't send to Sentry
      console.warn('Sentry error (dev mode):', event);
      return null;
    }

    // Filter out common client-side errors that we can't control
    if (event.exception?.values?.[0]?.value?.includes('Script error')) {
      return null;
    }

    return event;
  },

  // Add user context for RAG agent usage
  initialScope: {
    tags: {
      component: 'rag-agent',
      version: '0.6.0'
    }
  }
});