/**
 * Redis-Only Memory Client
 * Lightweight alternative to Mem0 for conversation memory
 */

import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import type {
  MemoryClient,
  MemoryMessage,
  MemoryAddOptions,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryOperationResult,
  ConversationMemoryContext,
  MemoryCleanupOptions,
  MemoryId,
  SessionId,
  MemoryItem,
  MemoryConfig,
} from '../../types/memory';

interface RedisMemoryEntry {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  sessionId: string;
  conversationId?: string;
  userId?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export class RedisMemoryClient implements MemoryClient {
  private redis: Redis | null = null;
  private readonly prefix = 'memory:';
  private readonly ttl = 24 * 60 * 60; // 24 hours default TTL

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisUrl = process.env.UPSTASH_REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
      console.warn('Redis credentials not found for memory client');
      return;
    }

    try {
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
    } catch (error) {
      console.error('Failed to initialize Redis memory client:', error);
    }
  }

  /**
   * Generate memory key
   */
  private generateKey(type: string, id: string): string {
    return `${this.prefix}${type}:${id}`;
  }

  /**
   * Generate memory ID
   */
  private generateMemoryId(): MemoryId {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .slice(0, 16) as MemoryId;
  }

  async add(
    messages: readonly MemoryMessage[],
    options: MemoryAddOptions
  ): Promise<MemoryOperationResult> {
    if (!this.redis) {
      return {
        success: false,
        operationType: 'add',
        timestamp: new Date(),
        error: {
          code: 'REDIS_NOT_AVAILABLE' as any,
          message: 'Redis client not initialized',
          timestamp: new Date(),
          retryable: false,
        },
      };
    }

    try {
      const memoryId = this.generateMemoryId();
      const timestamp = Date.now();

      // Store each message
      const pipeline = this.redis.pipeline();

      for (const message of messages) {
        const entry: RedisMemoryEntry = {
          id: `${memoryId}_${message.role}`,
          content: message.content,
          role: message.role,
          timestamp,
          sessionId: options.sessionId as string,
          conversationId: options.conversationId as string,
          userId: options.userId,
          category: options.category,
          metadata: options.metadata,
        };

        const key = this.generateKey('message', entry.id);
        pipeline.setex(key, this.ttl, JSON.stringify(entry));

        // Add to conversation index
        if (options.conversationId) {
          const indexKey = this.generateKey('conversation', options.conversationId as string);
          pipeline.zadd(indexKey, timestamp, entry.id);
          pipeline.expire(indexKey, this.ttl);
        }

        // Add to session index
        if (options.sessionId) {
          const indexKey = this.generateKey('session', options.sessionId as string);
          pipeline.zadd(indexKey, timestamp, entry.id);
          pipeline.expire(indexKey, this.ttl);
        }
      }

      await pipeline.exec();

      return {
        success: true,
        memoryId,
        operationType: 'add',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        operationType: 'add',
        timestamp: new Date(),
        error: {
          code: 'STORAGE_ERROR' as any,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          retryable: true,
        },
      };
    }
  }

  async search(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult> {
    if (!this.redis) {
      return {
        memories: [],
        totalCount: 0,
        searchTime: 0,
        context: {
          entities: [],
          relationships: [],
          preferences: [],
        },
      };
    }

    const searchStartTime = Date.now();

    try {
      const memories: MemoryItem[] = [];
      const limit = options.limit || 10;

      // Get messages from the appropriate index
      let messageIds: string[] = [];

      if (options.sessionId) {
        const indexKey = this.generateKey('session', options.sessionId as string);
        const results = await this.redis.zrange(indexKey, 0, limit - 1, { rev: true });
        messageIds = results as string[];
      } else if (query.startsWith('conversation:')) {
        const conversationId = query.replace('conversation:', '');
        const indexKey = this.generateKey('conversation', conversationId);
        const results = await this.redis.zrange(indexKey, 0, limit - 1, { rev: true });
        messageIds = results as string[];
      }

      // Fetch actual messages
      if (messageIds.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const id of messageIds) {
          pipeline.get(this.generateKey('message', id));
        }

        const results = await pipeline.exec();

        for (const result of results) {
          if (result[1]) {
            const entry = JSON.parse(result[1] as string) as RedisMemoryEntry;

            // Apply relevance filtering if specified
            if (!options.relevanceThreshold || Math.random() > options.relevanceThreshold) {
              memories.push({
                id: entry.id as MemoryId,
                content: entry.content,
                role: entry.role,
                timestamp: new Date(entry.timestamp),
                metadata: {
                  sessionId: entry.sessionId,
                  conversationId: entry.conversationId,
                  userId: entry.userId,
                  category: entry.category,
                  ...entry.metadata,
                },
                category: entry.category || 'context',
              } as MemoryItem);
            }
          }
        }
      }

      const searchTime = Date.now() - searchStartTime;

      return {
        memories,
        totalCount: memories.length,
        searchTime,
        context: {
          entities: [],
          relationships: [],
          preferences: [],
        },
      };
    } catch (error) {
      console.error('Redis memory search error:', error);
      return {
        memories: [],
        totalCount: 0,
        searchTime: Date.now() - searchStartTime,
        context: {
          entities: [],
          relationships: [],
          preferences: [],
        },
      };
    }
  }

  async update(
    memoryId: MemoryId,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryOperationResult> {
    if (!this.redis) {
      return {
        success: false,
        operationType: 'update',
        timestamp: new Date(),
        error: {
          code: 'REDIS_NOT_AVAILABLE' as any,
          message: 'Redis client not initialized',
          timestamp: new Date(),
          retryable: false,
        },
      };
    }

    try {
      const key = this.generateKey('message', memoryId as string);
      const existing = await this.redis.get(key);

      if (!existing) {
        return {
          success: false,
          operationType: 'update',
          timestamp: new Date(),
          error: {
            code: 'MEMORY_NOT_FOUND' as any,
            message: 'Memory not found',
            timestamp: new Date(),
            retryable: false,
          },
        };
      }

      const entry = JSON.parse(existing as string) as RedisMemoryEntry;
      entry.content = content;
      if (metadata) {
        entry.metadata = { ...entry.metadata, ...metadata };
      }

      await this.redis.setex(key, this.ttl, JSON.stringify(entry));

      return {
        success: true,
        memoryId,
        operationType: 'update',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        operationType: 'update',
        timestamp: new Date(),
        error: {
          code: 'UPDATE_ERROR' as any,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          retryable: true,
        },
      };
    }
  }

  async delete(memoryId: MemoryId): Promise<MemoryOperationResult> {
    if (!this.redis) {
      return {
        success: false,
        operationType: 'delete',
        timestamp: new Date(),
        error: {
          code: 'REDIS_NOT_AVAILABLE' as any,
          message: 'Redis client not initialized',
          timestamp: new Date(),
          retryable: false,
        },
      };
    }

    try {
      const key = this.generateKey('message', memoryId as string);
      await this.redis.del(key);

      return {
        success: true,
        memoryId,
        operationType: 'delete',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        operationType: 'delete',
        timestamp: new Date(),
        error: {
          code: 'DELETE_ERROR' as any,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          retryable: true,
        },
      };
    }
  }

  async getConversationContext(
    conversationId: string,
    sessionId: SessionId
  ): Promise<ConversationMemoryContext> {
    const searchOptions: MemorySearchOptions = {
      sessionId,
      limit: 20,
      relevanceThreshold: 0.3,
    };

    const searchResult = await this.search(`conversation:${conversationId}`, searchOptions);

    return {
      conversationId,
      sessionId,
      relevantMemories: searchResult.memories,
      entityMentions: [],
      topicContinuity: this.extractTopics(searchResult.memories),
      userPreferences: this.extractPreferences(searchResult.memories),
      conversationStage: this.determineStage(searchResult.memories),
    };
  }

  async cleanup(options: MemoryCleanupOptions): Promise<{ deletedCount: number }> {
    if (!this.redis) {
      return { deletedCount: 0 };
    }

    try {
      let deletedCount = 0;
      const keysToDelete: string[] = [];

      // Find keys to delete based on options
      if (options.sessionId) {
        const indexKey = this.generateKey('session', options.sessionId as string);
        const messageIds = await this.redis.zrange(indexKey, 0, -1);

        for (const id of messageIds as string[]) {
          keysToDelete.push(this.generateKey('message', id));
        }
        keysToDelete.push(indexKey);
      }

      // Delete in batches
      if (keysToDelete.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const key of keysToDelete) {
          pipeline.del(key);
        }
        await pipeline.exec();
        deletedCount = keysToDelete.length;
      }

      return { deletedCount };
    } catch (error) {
      console.error('Redis memory cleanup error:', error);
      return { deletedCount: 0 };
    }
  }

  private extractTopics(memories: readonly MemoryItem[]): string[] {
    // Simple topic extraction - in production, use NLP
    const topics = new Set<string>();

    for (const memory of memories) {
      const words = memory.content.toLowerCase().split(/\s+/);
      // Extract potential topics (words longer than 5 chars)
      words.filter(w => w.length > 5).forEach(w => topics.add(w));
    }

    return Array.from(topics).slice(0, 10);
  }

  private extractPreferences(memories: readonly MemoryItem[]): Record<string, unknown> {
    const preferences: Record<string, unknown> = {};

    for (const memory of memories) {
      if (memory.category === 'preference' && memory.metadata) {
        Object.assign(preferences, memory.metadata);
      }
    }

    return preferences;
  }

  private determineStage(memories: readonly MemoryItem[]): string {
    if (memories.length === 0) return 'greeting';
    if (memories.length < 3) return 'inquiry';
    if (memories.some(m => m.content.toLowerCase().includes('thank'))) return 'resolution';
    return 'discussion';
  }
}

// Factory function
export const createRedisMemoryClient = (): MemoryClient => {
  return new RedisMemoryClient();
};