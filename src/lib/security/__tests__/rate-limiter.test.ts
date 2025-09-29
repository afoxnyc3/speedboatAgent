/**
 * Rate Limiter Tests
 * Test rate limiting functionality with Redis
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Redis } from '@upstash/redis';
import { RateLimiter, extractIP, DEFAULT_RATE_LIMIT_CONFIG } from '../rate-limiter';

// Create mock pipeline
const mockPipeline = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

// Create mock Redis instance
const mockRedis = {
  pipeline: jest.fn().mockReturnValue(mockPipeline),
  ping: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  zadd: jest.fn(),
  expire: jest.fn(),
  zcount: jest.fn(),
};

// Mock Redis constructor to return our mock instance
(Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.UPSTASH_REDIS_URL = 'test-url';
    process.env.UPSTASH_REDIS_TOKEN = 'test-token';

    // Set up mock pipeline
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    rateLimiter = new RateLimiter();
  });

  describe('checkLimit', () => {
    it('should allow requests under the limit', async () => {
      // Mock successful pipeline execution
      mockPipeline.exec.mockResolvedValue([
        { result: 1 }, // zremrangebyscore result
        { result: 5 }, // zcard result (current count)
        { result: 1 }, // zadd result
        { result: 1 }, // expire result
      ]);

      // Use a public IP to avoid internal IP bypass
      const result = await rateLimiter.checkLimit('8.8.8.8');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(94); // 100 - 5 - 1 = 94
      expect(result.retryAfter).toBeUndefined();
    });

    it('should block requests over the limit', async () => {
      // Mock pipeline execution with rate limit exceeded
      mockPipeline.exec.mockResolvedValue([
        { result: 1 }, // zremrangebyscore result
        { result: 100 }, // zcard result (at limit)
        { result: 1 }, // zadd result
        { result: 1 }, // expire result
      ]);

      // Use a public IP to avoid internal IP bypass
      const result = await rateLimiter.checkLimit('8.8.8.8');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60); // windowMs / 1000
    });

    it('should fail open on Redis errors', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis error'));

      const result = await rateLimiter.checkLimit('127.0.0.1');

      expect(result.success).toBe(true); // Fail open
    });
  });

  describe('getStatus', () => {
    it('should return current rate limit status', async () => {
      mockRedis.zcount.mockResolvedValue(25);

      const result = await rateLimiter.getStatus('127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(75); // 100 - 25
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.zcount.mockRejectedValue(new Error('Redis error'));

      const result = await rateLimiter.getStatus('127.0.0.1');

      expect(result.success).toBe(true); // Fail open
      expect(result.remaining).toBe(100);
    });
  });

  describe('healthCheck', () => {
    it('should return true when Redis is healthy', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await rateLimiter.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when Redis is unhealthy', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await rateLimiter.healthCheck();

      expect(result).toBe(false);
    });
  });
});

describe('extractIP', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
    });

    const ip = extractIP(headers);

    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers({
      'x-real-ip': '192.168.1.2',
    });

    const ip = extractIP(headers);

    expect(ip).toBe('192.168.1.2');
  });

  it('should fallback to localhost for development', () => {
    const headers = new Headers();

    const ip = extractIP(headers);

    expect(ip).toBe('127.0.0.1');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.1',
      'x-real-ip': '192.168.1.2',
    });

    const ip = extractIP(headers);

    expect(ip).toBe('192.168.1.1');
  });
});

describe('Rate Limit Configuration', () => {
  it('should use default configuration', () => {
    expect(DEFAULT_RATE_LIMIT_CONFIG.windowMs).toBe(60000);
    expect(DEFAULT_RATE_LIMIT_CONFIG.maxRequests).toBe(100);
    expect(DEFAULT_RATE_LIMIT_CONFIG.keyPrefix).toBe('rl:');
  });

  it('should validate configuration schema', () => {
    expect(() => {
      new RateLimiter({
        windowMs: -1000, // Invalid
        maxRequests: 100,
        keyPrefix: 'test:',
      });
    }).toThrow();
  });
});

describe('Internal IP Bypass', () => {
  it('should identify internal IP ranges', () => {
    const { isInternalIP } = require('../rate-limiter');

    // Private IP ranges
    expect(isInternalIP('10.0.0.1')).toBe(true);
    expect(isInternalIP('192.168.1.1')).toBe(true);
    expect(isInternalIP('172.16.0.1')).toBe(true);
    expect(isInternalIP('127.0.0.1')).toBe(true);

    // Public IPs
    expect(isInternalIP('8.8.8.8')).toBe(false);
    expect(isInternalIP('1.1.1.1')).toBe(false);
  });

  it('should support custom trusted IPs', () => {
    const { TrustedIPChecker } = require('../rate-limiter');

    const checker = new TrustedIPChecker(['8.8.8.8', '1.1.1.1']);

    expect(checker.isTrusted('8.8.8.8')).toBe(true);
    expect(checker.isTrusted('1.1.1.1')).toBe(true);
    expect(checker.isTrusted('4.4.4.4')).toBe(false);
  });

  it('should bypass rate limiting for trusted IPs', async () => {
    const trustedIPs = ['8.8.4.4']; // Public IP set as trusted
    const rateLimiter = new RateLimiter({ trustedIPs });

    const result = await rateLimiter.checkLimit('8.8.4.4');

    expect(result.success).toBe(true);
    expect(result.bypassReason).toBe('trusted_ip');
  });

  it('should bypass rate limiting for internal IPs', async () => {
    const rateLimiter = new RateLimiter();

    const result = await rateLimiter.checkLimit('192.168.1.100');

    expect(result.success).toBe(true);
    expect(result.bypassReason).toBe('internal_ip');
  });
});

describe('Endpoint-Specific Limits', () => {
  it('should apply different limits per endpoint', () => {
    const { getEndpointConfig } = require('../rate-limiter');

    // Health check should have no limit
    expect(getEndpointConfig('/api/health').maxRequests).toBe(Infinity);

    // Chat should have lower limits (resource intensive)
    expect(getEndpointConfig('/api/chat').maxRequests).toBe(20);

    // Search should have medium limits
    expect(getEndpointConfig('/api/search').maxRequests).toBe(50);

    // Cache operations should have higher limits
    expect(getEndpointConfig('/api/cache/metrics').maxRequests).toBe(200);
  });
});