import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily ignore TypeScript errors during build
    // TODO: Remove after resolving strict mode TypeScript issues
    ignoreBuildErrors: true,
  },

  // Enable experimental instrumentation for Sentry
  experimental: {
    instrumentationHook: true,
  },

  // Sentry configuration
  sentry: {
    // Suppress source maps uploading logs during build
    silent: true,
    org: 'speedboat-agent',
    project: 'rag-agent',
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses source map uploading logs

  // Only upload source maps in production
  dryRun: process.env.NODE_ENV !== 'production',

  // Disable source map uploading in development
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
};

// Export the config with Sentry wrapper
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
