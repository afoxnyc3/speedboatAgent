/**
 * Redis-based Rate Limiter
 * Sliding window rate limiting with IP-based tracking
 */

import { Redis } from '@upstash/redis';
import { z } from 'zod';

// Rate limit configuration
export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly keyPrefix: string;
  readonly trustedIPs?: readonly string[];
}

// Default configuration: 100 requests per minute
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 60 seconds
  maxRequests: 100,
  keyPrefix: 'rl:',
} as const;

// Rate limit result
export interface RateLimitResult {
  readonly success: boolean;
  readonly remaining: number;
  readonly resetTime: number;
  readonly retryAfter?: number;
  readonly bypassReason?: 'trusted_ip' | 'internal_ip';
}

// IP validation regex
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// Rate limit validation schema
export const RateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000).max(3600000), // 1s to 1hour
  maxRequests: z.number().min(1).max(10000),
  keyPrefix: z.string().min(1).max(50),
  trustedIPs: z.array(z.string().regex(IP_REGEX, 'Invalid IP address')).optional(),
}).strict();

/**
 * Check if an IP address is in a private/internal range
 */
export function isInternalIP(ip: string): boolean {
  // Private IP ranges (RFC 1918 and loopback)
  const privateRanges = [
    { start: '10.0.0.0', end: '10.255.255.255' },     // 10.0.0.0/8
    { start: '172.16.0.0', end: '172.31.255.255' },   // 172.16.0.0/12
    { start: '192.168.0.0', end: '192.168.255.255' }, // 192.168.0.0/16
    { start: '127.0.0.0', end: '127.255.255.255' },   // 127.0.0.0/8 (loopback)
  ];

  function ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => acc * 256 + parseInt(octet, 10), 0);
  }

  const ipInt = ipToInt(ip);

  return privateRanges.some(range => {
    const startInt = ipToInt(range.start);
    const endInt = ipToInt(range.end);
    return ipInt >= startInt && ipInt <= endInt;
  });
}

/**
 * Trusted IP checker for custom allowlists
 */
export class TrustedIPChecker {
  private trustedIPs: Set<string>;

  constructor(trustedIPs: readonly string[] = []) {
    this.trustedIPs = new Set(trustedIPs);
  }

  isTrusted(ip: string): boolean {
    return this.trustedIPs.has(ip) || isInternalIP(ip);
  }

  addTrustedIP(ip: string): void {
    this.trustedIPs.add(ip);
  }

  removeTrustedIP(ip: string): void {
    this.trustedIPs.delete(ip);
  }
}

/**
 * Endpoint-specific rate limit configuration
 */
export interface EndpointConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
}

/**
 * Get rate limit configuration for specific endpoint
 */
export function getEndpointConfig(pathname: string): EndpointConfig {
  // Environment-based configuration with fallbacks
  const defaultWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const defaultMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

  // Health checks should never be rate limited
  if (pathname === '/api/health') {
    return {
      maxRequests: Infinity,
      windowMs: defaultWindow,
    };
  }

  // Resource-intensive endpoints get lower limits
  if (pathname.startsWith('/api/chat')) {
    return {
      maxRequests: parseInt(process.env.RATE_LIMIT_CHAT_MAX || '20', 10),
      windowMs: defaultWindow,
    };
  }

  // Search endpoints get medium limits
  if (pathname.startsWith('/api/search')) {
    return {
      maxRequests: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '50', 10),
      windowMs: defaultWindow,
    };
  }

  // Cache operations are lightweight, higher limits
  if (pathname.startsWith('/api/cache/')) {
    return {
      maxRequests: parseInt(process.env.RATE_LIMIT_CACHE_MAX || '200', 10),
      windowMs: defaultWindow,
    };
  }

  // Memory operations are also lightweight
  if (pathname.startsWith('/api/memory/')) {
    return {
      maxRequests: parseInt(process.env.RATE_LIMIT_MEMORY_MAX || '100', 10),
      windowMs: defaultWindow,
    };
  }

  // Default limits for all other endpoints
  return {
    maxRequests: defaultMax,
    windowMs: defaultWindow,
  };
}

/**
 * Redis-based sliding window rate limiter
 */
export class RateLimiter {
  private readonly redis: Redis;
  private readonly config: RateLimitConfig;
  private readonly trustedIPChecker: TrustedIPChecker;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    RateLimitConfigSchema.parse(this.config);

    // Initialize trusted IP checker
    this.trustedIPChecker = new TrustedIPChecker(this.config.trustedIPs || []);

    // Initialize Redis client
    if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
      throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN required');
    }

    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }

  /**
   * Check rate limit for IP address
   */
  async checkLimit(ip: string): Promise<RateLimitResult> {
    // Check if IP is trusted (bypass rate limiting)
    if (this.trustedIPChecker.isTrusted(ip)) {
      // Determine bypass reason: explicit trusted IP takes precedence
      const isExplicitlyTrusted = this.config.trustedIPs?.includes(ip) ?? false;
      const bypassReason = isExplicitlyTrusted ? 'trusted_ip' : 'internal_ip';

      return {
        success: true,
        remaining: this.config.maxRequests - 1,
        resetTime: Date.now() + this.config.windowMs,
        bypassReason,
      };
    }

    const key = `${this.config.keyPrefix}${ip}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries from sorted set
      // Use '-inf' string instead of -Infinity to avoid null args error
      // TypeScript expects number, but Redis accepts '-inf' as special string value
      pipeline.zremrangebyscore(key, '-inf' as unknown as number, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request timestamp
      pipeline.zadd(key, { score: now, member: now });

      // Set expiration
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results || results.length < 4) {
        throw new Error('Pipeline execution failed');
      }

      const currentCount = (results[1] && typeof (results[1] as any).result === 'number' ? (results[1] as any).result : 0) || 0;
      const remaining = Math.max(0, this.config.maxRequests - currentCount - 1);
      const resetTime = now + this.config.windowMs;

      if (currentCount >= this.config.maxRequests) {
        return {
          success: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil(this.config.windowMs / 1000),
        };
      }

      return {
        success: true,
        remaining,
        resetTime,
      };

    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open in case of Redis issues
      return {
        success: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(ip: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}${ip}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const count = await this.redis.zcount(key, windowStart, '+inf');
      const remaining = Math.max(0, this.config.maxRequests - count);
      const resetTime = now + this.config.windowMs;

      return {
        success: count < this.config.maxRequests,
        remaining,
        resetTime,
        retryAfter: count >= this.config.maxRequests
          ? Math.ceil(this.config.windowMs / 1000)
          : undefined,
      };

    } catch (error) {
      console.error('Rate limiter status error:', error);
      return {
        success: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
      };
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get rate limiter singleton
 */
export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(config);
  }
  return rateLimiterInstance;
}

/**
 * Extract IP address from request headers
 */
export function extractIP(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback for localhost development
  return '127.0.0.1';
}