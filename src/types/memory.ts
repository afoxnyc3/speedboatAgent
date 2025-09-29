/**
 * Memory System Types
 * Mem0 integration for conversation memory and context awareness
 */

import { z } from 'zod';
import type { ConversationId, MessageId, MessageRole } from './chat';
import type { SessionId } from './search';
import { SessionIdSchema, createSessionId } from './search';

// Re-export from chat types
export type { ConversationId, MessageId, MessageRole };
// Re-export from search types
export type { SessionId };
export { SessionIdSchema, createSessionId };

// Branded types for memory system
export type MemoryId = string & { readonly __brand: 'MemoryId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type RunId = string & { readonly __brand: 'RunId' };
export type AgentId = string & { readonly __brand: 'AgentId' };

// Memory scope definitions
export type MemoryScope = 'user' | 'session' | 'agent';
export type MemoryCategory = 'preference' | 'entity' | 'relationship' | 'fact' | 'context';

// Memory message format for Mem0 API
export interface MemoryMessage {
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp?: Date;
  readonly metadata?: Record<string, unknown>;
}

// Memory search and filtering
export interface MemorySearchOptions {
  readonly userId?: UserId;
  readonly sessionId?: SessionId;
  readonly runId?: RunId;
  readonly agentId?: AgentId;
  readonly category?: MemoryCategory;
  readonly limit?: number;
  readonly metadata?: Record<string, unknown>;
  readonly relevanceThreshold?: number;
}

// Memory item structure
export interface MemoryItem {
  readonly id: MemoryId;
  readonly content: string;
  readonly scope: MemoryScope;
  readonly category: MemoryCategory;
  readonly relevanceScore?: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly metadata: {
    readonly userId?: UserId;
    readonly sessionId?: SessionId;
    readonly runId?: RunId;
    readonly agentId?: AgentId;
    readonly conversationId?: ConversationId;
    readonly sourceMessageId?: MessageId;
    readonly tags?: readonly string[];
    readonly entityType?: string;
    readonly entityValue?: string;
    readonly relationship?: string;
    readonly confidence?: number;
    readonly expiresAt?: Date;
  };
}

// Memory operation results
export interface MemoryOperationResult {
  readonly success: boolean;
  readonly memoryId?: MemoryId;
  readonly error?: MemoryError;
  readonly operationType: 'add' | 'search' | 'update' | 'delete';
  readonly timestamp: Date;
}

// Memory search results
export interface MemorySearchResult {
  readonly memories: readonly MemoryItem[];
  readonly totalCount: number;
  readonly searchTime: number;
  readonly context: {
    readonly entities: readonly string[];
    readonly relationships: readonly string[];
    readonly preferences: readonly string[];
  };
}

// Memory context for conversation
export interface ConversationMemoryContext {
  readonly conversationId: string;
  readonly sessionId: SessionId;
  readonly userId?: UserId;
  readonly relevantMemories: readonly MemoryItem[];
  readonly entityMentions: readonly string[];
  readonly topicContinuity: readonly string[];
  readonly userPreferences: Record<string, unknown>;
  readonly conversationStage: string;
}

// Memory configuration
export interface MemoryConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
  readonly retryAttempts?: number;
  readonly defaultScope: MemoryScope;
  readonly retention: {
    readonly sessionMemoryTtl: number; // milliseconds
    readonly userMemoryTtl?: number; // null = permanent
    readonly agentMemoryTtl?: number;
  };
  readonly privacy: {
    readonly enablePiiDetection: boolean;
    readonly allowedCategories: readonly MemoryCategory[];
    readonly dataRetentionDays: number;
  };
}

// Memory client interface
export interface MemoryClient {
  add(messages: readonly MemoryMessage[], options: MemoryAddOptions): Promise<MemoryOperationResult>;
  search(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult>;
  update(memoryId: MemoryId, content: string, metadata?: Record<string, unknown>): Promise<MemoryOperationResult>;
  delete(memoryId: MemoryId): Promise<MemoryOperationResult>;
  getConversationContext(conversationId: string, sessionId: SessionId): Promise<ConversationMemoryContext>;
  cleanup(options: MemoryCleanupOptions): Promise<{ deletedCount: number }>;
}

// Memory add options
export interface MemoryAddOptions {
  readonly userId?: UserId;
  readonly sessionId?: SessionId;
  readonly runId?: RunId;
  readonly agentId?: AgentId;
  readonly conversationId?: ConversationId;
  readonly category?: MemoryCategory;
  readonly metadata?: Record<string, unknown>;
  readonly asyncMode?: boolean;
}

// Memory cleanup options
export interface MemoryCleanupOptions {
  readonly userId?: UserId;
  readonly sessionId?: SessionId;
  readonly olderThan?: Date;
  readonly categories?: readonly MemoryCategory[];
  readonly dryRun?: boolean;
}

// Memory error handling
export interface MemoryError {
  readonly code: MemoryErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly retryable: boolean;
}

export type MemoryErrorCode =
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'MEMORY_NOT_FOUND'
  | 'INVALID_SCOPE'
  | 'PII_DETECTED'
  | 'RETENTION_VIOLATION'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_FORMAT';

// Zod schemas for validation
export const MemoryIdSchema = z.string().brand('MemoryId');
export const UserIdSchema = z.string().brand('UserId');
export const RunIdSchema = z.string().brand('RunId');
export const AgentIdSchema = z.string().brand('AgentId');

export const MemoryScopeSchema = z.enum(['user', 'session', 'agent']);
export const MemoryCategorySchema = z.enum(['preference', 'entity', 'relationship', 'fact', 'context']);

export const MemoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1).max(10000),
  timestamp: z.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const MemorySearchOptionsSchema = z.object({
  userId: UserIdSchema.optional(),
  sessionId: SessionIdSchema.optional(),
  runId: RunIdSchema.optional(),
  agentId: AgentIdSchema.optional(),
  category: MemoryCategorySchema.optional(),
  limit: z.number().positive().max(100).default(10),
  metadata: z.record(z.string(), z.unknown()).optional(),
  relevanceThreshold: z.number().min(0).max(1).default(0.5),
}).strict();

// Type utility functions
export const createMemoryId = (id: string): MemoryId => id as MemoryId;
export const createUserId = (id: string): UserId => id as UserId;
export const createRunId = (id: string): RunId => id as RunId;
export const createAgentId = (id: string): AgentId => id as AgentId;

// Type guards
export const isMemoryError = (result: MemoryOperationResult): boolean => !result.success;

// Constants
export const MEMORY_CONSTANTS = {
  MAX_MEMORY_CONTENT_LENGTH: 10000,
  MAX_SEARCH_RESULTS: 100,
  DEFAULT_SESSION_TTL: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_RETENTION_DAYS: 30,
  MAX_ENTITIES_PER_CONTEXT: 50,
  RELEVANCE_THRESHOLD: 0.5,
} as const;