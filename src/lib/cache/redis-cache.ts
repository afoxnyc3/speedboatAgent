/**
 * Redis Cache Implementation for Query Classifications
 */

import { Redis } from '@upstash/redis';
import { QueryClassification } from '../../types/query-classification';

// Redis client instance
let redis: Redis | null = null;

/**
 * Initialize Redis client
 */
function getRedisClient(): Redis | null {
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
 * Redis-based cache for query classifications
 */
export class RedisClassificationCache {
  private readonly prefix = 'query:classification:';
  private readonly ttlSeconds = 24 * 60 * 60; // 24 hours
  private client: Redis | null;

  constructor() {
    this.client = getRedisClient();
  }

  /**
   * Generate Redis key for query
   */
  private getKey(cacheKey: string): string {
    return `${this.prefix}${cacheKey}`;
  }

  /**
   * Set classification in cache
   */
  async set(cacheKey: string, classification: QueryClassification): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.getKey(cacheKey);
      const value = JSON.stringify({ ...classification, cached: true });

      await this.client.setex(key, this.ttlSeconds, value);
      return true;
    } catch (error) {
      console.error('Redis cache set error:', error);
      return false;
    }
  }

  /**
   * Get classification from cache
   */
  async get(cacheKey: string): Promise<QueryClassification | null> {
    if (!this.client) return null;

    try {
      const key = this.getKey(cacheKey);
      const value = await this.client.get(key);

      if (!value) return null;

      return JSON.parse(value as string) as QueryClassification;
    } catch (error) {
      console.error('Redis cache get error:', error);
      return null;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Clear all classification cache
   */
  async clear(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Redis cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; keys: string[] } | null> {
    if (!this.client) return null;

    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      return {
        count: keys.length,
        keys: keys.map(key => key.replace(this.prefix, ''))
      };
    } catch (error) {
      console.error('Redis cache stats error:', error);
      return null;
    }
  }
}