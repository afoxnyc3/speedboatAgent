/**
 * Next.js Middleware - Rate Limiting and Security
 * Applied to all API routes with security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter, extractIP, getEndpointConfig } from './src/lib/security/rate-limiter';
// Temporarily disable API key middleware
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
 * Rate limiting logic with endpoint-specific limits and IP bypass
 */
async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const { pathname } = request.nextUrl;
    const ip = extractIP(request.headers);

    // Get endpoint-specific configuration
    const endpointConfig = getEndpointConfig(pathname);

    // Create rate limiter with endpoint-specific config
    const rateLimiter = getRateLimiter({
      windowMs: endpointConfig.windowMs,
      maxRequests: endpointConfig.maxRequests,
      trustedIPs: process.env.RATE_LIMIT_TRUSTED_IPS?.split(',').map(ip => ip.trim()) || [],
    });

    // Check rate limit
    const result = await rateLimiter.checkLimit(ip);

    if (!result.success) {
      // Rate limit exceeded
      console.warn(`Rate limit exceeded for IP ${ip} on ${pathname}`, {
        ip,
        pathname,
        remaining: result.remaining,
        retryAfter: result.retryAfter,
      });

      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': result.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': endpointConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          },
        }
      );
    }

    // Rate limit passed, add headers for debugging
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', endpointConfig.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    // Add bypass reason if applicable
    if (result.bypassReason) {
      response.headers.set('X-RateLimit-Bypass', result.bypassReason);
    }

    return response;

  } catch (error) {
    // Log error but fail open (don't block requests on rate limiter errors)
    console.error('Rate limiter error:', error);
    return null;
  }
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
    // Apply API key authentication
    const authResult = await applyApiKeyAuth(request);
    if (authResult) {
      return authResult; // Authentication failed
    }

    // Apply rate limiting (with endpoint-specific logic including health checks)
    const rateLimitResult = await applyRateLimit(request);
    if (rateLimitResult) {
      return addSecurityHeaders(rateLimitResult); // Rate limited or processed with headers
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