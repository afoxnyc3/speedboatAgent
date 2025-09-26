/**
 * Rate Limiter Tests
 * Test rate limiting functionality with Redis
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Redis client
const mockRedis = {
  pipeline: jest.fn(),
  ping: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  zadd: jest.fn(),
  expire: jest.fn(),
  zcount: jest.fn(),
};

const mockPipeline = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

// Mock the Redis import
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => mockRedis),
}));

import { RateLimiter, extractIP, DEFAULT_RATE_LIMIT_CONFIG } from '../rate-limiter';

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

      const result = await rateLimiter.checkLimit('127.0.0.1');

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

      const result = await rateLimiter.checkLimit('127.0.0.1');

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