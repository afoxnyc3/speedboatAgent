/**
 * Redis Connection Management
 * Handles Redis client initialization and connection lifecycle
 */

import { Redis } from '@upstash/redis';
import type { CacheHealthResponse } from './redis-cache-types';

// Redis client singleton
let redis: Redis | null = null;

/**
 * Initialize and return Redis client
 */
export function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn('Redis credentials not found, using memory cache');
    return null;
  }

  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken
    });
    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

/**
 * Check if Redis connection is available
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}

/**
 * Test Redis connection health
 */
export async function testRedisConnection(): Promise<CacheHealthResponse> {
  const client = getRedisClient();

  if (!client) {
    return {
      healthy: false,
      error: 'Redis client not initialized'
    };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;

    return { healthy: true, latency };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reset Redis connection (force reconnection)
 */
export function resetRedisConnection(): void {
  redis = null;
}

/**
 * Get Redis connection info for debugging
 */
export function getRedisConnectionInfo(): {
  hasClient: boolean;
  hasCredentials: boolean;
  url?: string;
} {
  return {
    hasClient: redis !== null,
    hasCredentials: !!(process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN),
    url: process.env.UPSTASH_REDIS_URL ?
      process.env.UPSTASH_REDIS_URL.split('@')[1] || 'hidden' :
      undefined
  };
}