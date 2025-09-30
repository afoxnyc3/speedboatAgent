/**
 * Memory Client Factory
 * Switched from Mem0 to Redis for better performance and reliability
 *
 * Redis provides:
 * - Local storage (no external API calls)
 * - Fast access (<10ms vs 2-3s with Mem0)
 * - Same MemoryClient interface
 * - 24-hour TTL for conversations
 */

import { createRedisMemoryClient } from './redis-memory-client';
import type {
  MemoryClient,
  MemoryMessage,
  MemoryAddOptions,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryOperationResult,
  ConversationMemoryContext,
  MemoryCleanupOptions,
  MemoryConfig,
  MemoryError,
  MemoryId,
  SessionId,
} from '../../types/memory';

const DEFAULT_CONFIG: Partial<MemoryConfig> = {
  timeout: 5000, // 5 second timeout for API calls
  retryAttempts: 2, // Try twice before giving up
  defaultScope: 'session',
  retention: {
    sessionMemoryTtl: 24 * 60 * 60 * 1000, // 24 hours
    userMemoryTtl: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  privacy: {
    enablePiiDetection: true,
    allowedCategories: ['preference', 'entity', 'context'],
    dataRetentionDays: 30,
  },
};

export class Mem0Client implements MemoryClient {
  private config: MemoryConfig;
  private baseUrl: string;

  constructor(config: MemoryConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = config.baseUrl || 'https://api.mem0.ai/v1';
  }

  async add(
    messages: readonly MemoryMessage[],
    options: MemoryAddOptions
  ): Promise<MemoryOperationResult> {
    try {
      const payload = this.buildAddPayload(messages, options);
      const response = await this.makeRequest('POST', '/memories', payload);

      return {
        success: true,
        memoryId: response.id as MemoryId,
        operationType: 'add',
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleError('add', error);
    }
  }

  async search(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult> {
    const searchParams = this.buildSearchParams(query, options);
    const response = await this.makeRequest('GET', '/memories/search', searchParams);

    return {
      memories: response.memories || [],
      totalCount: response.total || 0,
      searchTime: response.searchTime || 0,
      context: {
        entities: response.entities || [],
        relationships: response.relationships || [],
        preferences: response.preferences || [],
      },
    };
  }

  async update(
    memoryId: MemoryId,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryOperationResult> {
    try {
      const payload = { content, metadata };
      await this.makeRequest('PUT', `/memories/${memoryId}`, payload);

      return {
        success: true,
        memoryId,
        operationType: 'update',
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleError('update', error);
    }
  }

  async delete(memoryId: MemoryId): Promise<MemoryOperationResult> {
    try {
      await this.makeRequest('DELETE', `/memories/${memoryId}`);

      return {
        success: true,
        memoryId,
        operationType: 'delete',
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleError('delete', error);
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
      entityMentions: searchResult.context.entities,
      topicContinuity: this.extractTopics(searchResult.memories),
      userPreferences: this.extractPreferences(searchResult.memories),
      conversationStage: this.determineStage(searchResult.memories),
    };
  }

  async cleanup(options: MemoryCleanupOptions): Promise<{ deletedCount: number }> {
    const params = this.buildCleanupParams(options);
    const response = await this.makeRequest('DELETE', '/memories/cleanup', params);

    return { deletedCount: response.deletedCount || 0 };
  }

  private buildAddPayload(messages: readonly MemoryMessage[], options: MemoryAddOptions) {
    return {
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      user_id: options.userId,
      session_id: options.sessionId,
      run_id: options.runId,
      agent_id: options.agentId,
      metadata: {
        ...options.metadata,
        conversationId: options.conversationId,
        category: options.category,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private buildSearchParams(query: string, options: MemorySearchOptions) {
    return {
      query,
      user_id: options.userId,
      session_id: options.sessionId,
      run_id: options.runId,
      agent_id: options.agentId,
      limit: options.limit || 10,
      metadata: options.metadata,
    };
  }

  private buildCleanupParams(options: MemoryCleanupOptions) {
    return {
      user_id: options.userId,
      session_id: options.sessionId,
      older_than: options.olderThan?.toISOString(),
      categories: options.categories,
      dry_run: options.dryRun || false,
    };
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    let url = `${this.baseUrl}${endpoint}`;

    // Mem0 uses "Authorization: Token" header for authentication
    const config: RequestInit = {
      method,
      headers: {
        Authorization: `Token ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: process.env.NODE_ENV === 'test' ? undefined : AbortSignal.timeout(this.config.timeout!),
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
      const params = new URLSearchParams(data);
      url = url + `?${params}`;
    }

    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          // Log detailed error for debugging
          if (response.status === 401) {
            console.error('[Mem0] Authentication failed (401). Check API key in .env.local');
          }
          const errorText = await response.text().catch(() => response.statusText);
          console.error(`[Mem0] API Error ${response.status}: ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.config.retryAttempts! - 1) throw error;
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }

  private handleError(operation: string, error: unknown): MemoryOperationResult {
    const memoryError: MemoryError = {
      code: this.mapErrorCode(error),
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
      retryable: this.isRetryable(error),
    };

    return {
      success: false,
      error: memoryError,
      operationType: operation as any,
      timestamp: new Date(),
    };
  }

  private mapErrorCode(error: unknown): any {
    if (error instanceof Error) {
      if (error.message.includes('401')) return 'API_KEY_INVALID';
      if (error.message.includes('429')) return 'RATE_LIMITED';
      if (error.message.includes('404')) return 'MEMORY_NOT_FOUND';
      if (error.message.includes('timeout')) return 'TIMEOUT';
    }
    return 'NETWORK_ERROR';
  }

  private isRetryable(error: unknown): boolean {
    return error instanceof Error &&
           (error.message.includes('500') || error.message.includes('timeout'));
  }

  private extractTopics(memories: readonly any[]): string[] {
    return memories
      .flatMap(m => m.metadata?.tags || [])
      .slice(0, 10);
  }

  private extractPreferences(memories: readonly any[]): Record<string, unknown> {
    return memories
      .filter(m => m.category === 'preference')
      .reduce((acc, m) => ({ ...acc, [m.entityType]: m.entityValue }), {});
  }

  private determineStage(memories: readonly any[]): string {
    if (memories.length === 0) return 'greeting';
    if (memories.some(m => m.category === 'fact')) return 'resolution';
    return 'inquiry';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory function for creating configured client
export const createMem0Client = (apiKey: string, config?: Partial<MemoryConfig>): MemoryClient => {
  return new Mem0Client({
    apiKey,
    ...DEFAULT_CONFIG,
    ...config,
  } as MemoryConfig);
};

// Singleton instance for application use
let mem0Instance: MemoryClient | null = null;

export const getMem0Client = (): MemoryClient => {
  if (!mem0Instance) {
    // Check for opt-in Mem0 usage
    if (process.env.USE_MEM0 === 'true') {
      // Opt-in to Mem0 with environment variable
      const apiKey = process.env.MEM0_API_KEY;
      if (!apiKey) {
        console.warn('[Memory] Mem0 enabled but API key missing, falling back to Redis');
        mem0Instance = createRedisMemoryClient();
      } else {
        // eslint-disable-next-line no-console
        console.log('[Memory] Using Mem0 with API key');
        mem0Instance = createMem0Client(apiKey);
      }
    } else if (process.env.USE_PG_MEMORY_MOCK === 'true') {
      // Use PostgreSQL pattern mock for benchmarking
      const { createPostgreSQLMemoryClient } = require('./pg-memory-client');
      mem0Instance = createPostgreSQLMemoryClient();
    } else {
      // Default to Redis memory (fast, reliable, local)
      // eslint-disable-next-line no-console
      console.log('[Memory] Using Redis memory client (default)');
      mem0Instance = createRedisMemoryClient();
    }
  }
  return mem0Instance!; // Non-null assertion - we always initialize it above
};