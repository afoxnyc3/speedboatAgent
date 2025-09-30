/**
 * Redis Classification Cache
 * Simple cache implementation for query classifications
 */

import type { Redis } from '@upstash/redis';
import { QueryClassification } from '../../types/query-classification';
import { scanKeys, batchDeleteKeys } from './scan-utils';
import { getRedisClient } from './redis-connection';
import type { CacheStats } from './redis-cache-types';

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

      try {
        return JSON.parse(value as string) as QueryClassification;
      } catch (parseError) {
        console.error('Failed to parse classification cache:', parseError, 'Value:', value);
        return null;
      }
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
      // Use SCAN-based batch delete for non-blocking operation
      const deletedCount = await batchDeleteKeys(this.client, `${this.prefix}*`);
      console.log(`Cleared ${deletedCount} classification cache keys`);
      return true;
    } catch (error) {
      console.error('Redis cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats | null> {
    if (!this.client) return null;

    try {
      // Use SCAN to get keys without blocking
      const keys = await scanKeys(this.client, `${this.prefix}*`);
      return {
        count: keys.length,
        keys: keys.slice(0, 100).map(key => key.replace(this.prefix, '')) // Return sample of first 100 keys
      };
    } catch (error) {
      console.error('Redis cache stats error:', error);
      return null;
    }
  }

  /**
   * Check if specific key exists in cache
   */
  async exists(cacheKey: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.getKey(cacheKey);
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Redis cache exists error:', error);
      return false;
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(cacheKey: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.getKey(cacheKey);
      const deleted = await this.client.del(key);
      return deleted === 1;
    } catch (error) {
      console.error('Redis cache delete error:', error);
      return false;
    }
  }

  /**
   * Get TTL for a specific key
   */
  async getTTL(cacheKey: string): Promise<number | null> {
    if (!this.client) return null;

    try {
      const key = this.getKey(cacheKey);
      const ttl = await this.client.ttl(key);
      return ttl >= 0 ? ttl : null; // Returns -1 if key has no expiry, -2 if key doesn't exist
    } catch (error) {
      console.error('Redis cache TTL error:', error);
      return null;
    }
  }

  /**
   * Extend TTL for a specific key
   */
  async extendTTL(cacheKey: string, additionalSeconds: number = 3600): Promise<boolean> {
    if (!this.client) return false;

    try {
      const key = this.getKey(cacheKey);
      const currentTTL = await this.client.ttl(key);

      if (currentTTL > 0) {
        const newTTL = currentTTL + additionalSeconds;
        await this.client.expire(key, newTTL);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Redis cache extend TTL error:', error);
      return false;
    }
  }
}