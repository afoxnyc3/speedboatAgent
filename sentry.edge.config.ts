/**
 * Sentry Edge Runtime Configuration
 * Error tracking for Edge Runtime functions
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Lower sampling rate for edge functions
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,

  // Environment configuration
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',

  // Edge-specific configuration
  debug: false, // Edge runtime has limited debugging

  // Error filtering for edge
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Add edge context
    event.tags = {
      ...event.tags,
      runtime: 'edge',
      component: 'rag-edge'
    };

    return event;
  },

  // Minimal integrations for edge
  integrations: [],

  // Edge context
  initialScope: {
    tags: {
      component: 'rag-edge',
      runtime: 'edge',
      version: '0.6.0'
    }
  }
});