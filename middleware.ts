/**
 * Next.js Middleware - Rate Limiting and Security
 * Applied to all API routes with security headers
 */

import { NextRequest, NextResponse } from 'next/server';
// Temporarily disable middleware imports to fix deployment
// import { getRateLimiter, extractIP } from './src/lib/security/rate-limiter';
// import { validateApiKeyMiddleware, isApiKeyAuthEnabled } from './src/lib/security/api-keys';

/**
 * Security headers configuration
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // CORS headers
  response.headers.set('Access-Control-Allow-Origin',
    process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS || 'https://yourdomain.com')
      : '*'
  );
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-API-Key,X-Forwarded-For'
  );

  // Security headers (OWASP recommendations)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self' data:;"
  );

  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

/**
 * Rate limiting logic - temporarily disabled
 */
async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  // Temporarily disable rate limiting to fix deployment
  return null;
}

/**
 * API key authentication - temporarily disabled
 */
async function applyApiKeyAuth(request: NextRequest): Promise<NextResponse | null> {
  // Temporarily disable API key auth to fix deployment
  return null;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return addSecurityHeaders(response);
  }

  // Apply to API routes only
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for health checks
    if (pathname === '/api/health') {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Apply API key authentication
    const authResult = await applyApiKeyAuth(request);
    if (authResult) {
      return authResult; // Authentication failed
    }

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult; // Rate limited or processed
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};