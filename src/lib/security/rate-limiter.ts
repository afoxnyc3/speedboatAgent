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
}

// Rate limit validation schema
export const RateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000).max(3600000), // 1s to 1hour
  maxRequests: z.number().min(1).max(10000),
  keyPrefix: z.string().min(1).max(50),
}).strict();

/**
 * Redis-based sliding window rate limiter
 */
export class RateLimiter {
  private readonly redis: Redis;
  private readonly config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    RateLimitConfigSchema.parse(this.config);

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
    const key = `${this.config.keyPrefix}${ip}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries from sorted set
      pipeline.zremrangebyscore(key, -Infinity, windowStart);

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