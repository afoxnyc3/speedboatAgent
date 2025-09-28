/**
 * Redis Memory Helper Functions
 * Extracted from redis-memory-client.ts to reduce file size
 */

import type { MemoryItem, MemoryId, MemoryOperationResult } from '../../types/memory';

export function extractTopics(memories: readonly MemoryItem[]): string[] {
  // Simple topic extraction - in production, use NLP
  const topics = new Set<string>();

  for (const memory of memories) {
    const words = memory.content.toLowerCase().split(/\s+/);
    // Extract potential topics (words longer than 5 chars)
    words.filter(w => w.length > 5).forEach(w => topics.add(w));
  }

  return Array.from(topics).slice(0, 10);
}

export function extractPreferences(memories: readonly MemoryItem[]): Record<string, unknown> {
  const preferences: Record<string, unknown> = {};

  for (const memory of memories) {
    if (memory.category === 'preference' && memory.metadata) {
      Object.assign(preferences, memory.metadata);
    }
  }

  return preferences;
}

export function determineStage(memories: readonly MemoryItem[]): 'initial' | 'exploring' | 'deep' {
  if (memories.length < 3) return 'initial';
  if (memories.length < 10) return 'exploring';
  return 'deep';
}

export interface RedisMemoryEntry {
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

export function createMemoryEntry(
  memoryId: string,
  message: { content: string; role: 'user' | 'assistant' },
  options: {
    sessionId?: string;
    conversationId?: string;
    userId?: string;
    category?: string;
    metadata?: Record<string, unknown>;
  },
  timestamp: number
): RedisMemoryEntry {
  return {
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
}

export function convertEntryToMemoryItem(entry: RedisMemoryEntry): MemoryItem {
  return {
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
  } as MemoryItem;
}

// Custom error codes for Redis memory operations
type RedisMemoryErrorCode =
  | 'REDIS_NOT_AVAILABLE'
  | 'STORAGE_ERROR'
  | 'MEMORY_NOT_FOUND'
  | 'UPDATE_ERROR'
  | 'DELETE_ERROR';

export function createErrorResult(
  operationType: 'add' | 'update' | 'delete',
  code: RedisMemoryErrorCode,
  message: string,
  retryable = false
): MemoryOperationResult {
  return {
    success: false,
    operationType,
    timestamp: new Date(),
    error: {
      code: code as RedisMemoryErrorCode & string,
      message,
      timestamp: new Date(),
      retryable,
    },
  };
}

export function createSuccessResult(
  operationType: 'add' | 'update' | 'delete',
  memoryId: MemoryId
): MemoryOperationResult {
  return {
    success: true,
    memoryId,
    operationType,
    timestamp: new Date(),
  };
}

