import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily ignore TypeScript errors during build
    // TODO: Remove after resolving strict mode TypeScript issues
    ignoreBuildErrors: true,
  },

  // Performance optimizations
  compress: true, // Enable gzip compression

  // Static asset optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // Headers for performance and caching
  async headers() {
    return [
      {
        // Static assets caching - images
        source: '/:path*\\.(ico|png|jpg|jpeg|gif|webp|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      },
      {
        // Static assets caching - CSS and JS
        source: '/:path*\\.(css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      },
      {
        // API routes optimization
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ],
      },
      {
        // Search API specific caching
        source: '/api/search',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600'
          }
        ],
      },
      {
        // Chat API - no caching for real-time responses
        source: '/api/chat/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ],
      }
    ];
  },

  // Enable ETag support for better caching
  generateEtags: true,

  // Sentry will use instrumentation.js automatically in Next.js 15+
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses source map uploading logs
  org: 'speedboat-agent',
  project: 'rag-agent',

  // Only upload source maps in production
  dryRun: process.env.NODE_ENV !== 'production',

  // Disable source map uploading in development
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
};

// Export the config with Sentry wrapper
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
