/**
 * Mock Memory Client for Testing
 * Provides a no-op implementation when MEM0_API_KEY is not configured
 */

import type {
  MemoryClient,
  MemoryOperationResult,
  MemorySearchResult,
  ConversationMemoryContext,
  MemoryAddOptions,
  MemorySearchOptions,
  MemoryCleanupOptions,
  MemoryId,
  MemoryMessage,
  SessionId,
} from '@/types/memory';
import { createSessionId } from '@/types/memory';

export class MockMem0Client implements MemoryClient {
  async add(
    messages: readonly MemoryMessage[],
    options: MemoryAddOptions
  ): Promise<MemoryOperationResult> {
    return {
      success: true,
      operationType: 'add',
      timestamp: new Date(),
    };
  }

  async search(
    query: string,
    options?: MemorySearchOptions
  ): Promise<MemorySearchResult> {
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

  async update(
    memoryId: MemoryId,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryOperationResult> {
    return {
      success: true,
      operationType: 'update',
      timestamp: new Date(),
    };
  }

  async delete(memoryId: MemoryId): Promise<MemoryOperationResult> {
    return {
      success: true,
      operationType: 'delete',
      timestamp: new Date(),
    };
  }

  async getConversationContext(
    conversationId: string,
    sessionId: SessionId
  ): Promise<ConversationMemoryContext> {
    return {
      conversationId,
      sessionId,
      relevantMemories: [],
      entityMentions: [],
      topicContinuity: [],
      userPreferences: {},
      conversationStage: 'greeting',
    };
  }

  async cleanup(options: MemoryCleanupOptions): Promise<{ deletedCount: number }> {
    return { deletedCount: 0 };
  }
}

// Factory function for mock client
export const createMockMem0Client = (): MemoryClient => {
  console.log('Using mock memory client (no MEM0_API_KEY configured)');
  return new MockMem0Client();
};