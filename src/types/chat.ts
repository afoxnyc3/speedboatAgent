/**
 * Chat System Types
 * Comprehensive type definitions for conversational interface and streaming
 */

import { z } from 'zod';
import type { DocumentId, Document } from './search';

// Branded types for chat system
export type MessageId = string & { readonly __brand: 'MessageId' };
export type ConversationId = string & { readonly __brand: 'ConversationId' };
export type CitationId = string & { readonly __brand: 'CitationId' };
export type ThreadId = string & { readonly __brand: 'ThreadId' };

// Message role types
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Message status for streaming and processing
export type MessageStatus =
  | 'sending'
  | 'processing'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Citation and source attribution
export interface Citation {
  readonly id: CitationId;
  readonly documentId: DocumentId;
  readonly excerpt: string;
  readonly startLine?: number;
  readonly endLine?: number;
  readonly relevanceScore: number;
  readonly sourceUrl?: string;
  readonly sourcePath: string;
  readonly sourceType: 'github' | 'web' | 'local';
  readonly timestamp: Date;
  readonly context?: {
    readonly before?: string;
    readonly after?: string;
  };
}

// Source attribution with authority weighting
export interface SourceAttribution {
  readonly url: string;
  readonly title: string;
  readonly domain: string;
  readonly authorityScore: number;
  readonly lastVerified: Date;
  readonly trustLevel: 'high' | 'medium' | 'low';
  readonly sourceType: 'github' | 'web' | 'local';
  readonly citations: readonly Citation[];
}

// Message metadata for tracking and analytics
export interface MessageMetadata {
  readonly tokens?: {
    readonly input: number;
    readonly output: number;
    readonly total: number;
  };
  readonly model?: string;
  readonly temperature?: number;
  readonly processingTime?: number;
  readonly searchTime?: number;
  readonly retrievalCount?: number;
  readonly cost?: number;
  readonly version?: string;
  readonly flags?: readonly string[];
}

// Core message interface
export interface ChatMessage {
  readonly id: MessageId;
  readonly role: MessageRole;
  readonly content: string;
  readonly conversationId: ConversationId;
  readonly threadId?: ThreadId;
  readonly parentId?: MessageId;
  readonly timestamp: Date;
  readonly status: MessageStatus;
  readonly sources?: readonly Citation[];
  readonly attribution?: readonly SourceAttribution[];
  readonly metadata?: MessageMetadata;
  readonly streaming?: boolean;
  readonly error?: ChatError;
  readonly reactions?: readonly MessageReaction[];
  readonly editHistory?: readonly MessageEdit[];
}

// Streaming message chunk
export interface StreamingChunk {
  readonly messageId: MessageId;
  readonly conversationId: ConversationId;
  readonly chunk: string;
  readonly delta?: string;
  readonly isComplete: boolean;
  readonly sources?: readonly Citation[];
  readonly metadata?: Partial<MessageMetadata>;
  readonly timestamp: Date;
  readonly chunkIndex: number;
  readonly totalChunks?: number;
}

// Real-time streaming response
export interface StreamingResponse {
  readonly type: 'chunk' | 'sources' | 'metadata' | 'complete' | 'error';
  readonly messageId: MessageId;
  readonly conversationId: ConversationId;
  readonly timestamp: Date;
  readonly data: StreamingChunk | Citation[] | MessageMetadata | ChatError;
}

// Conversation context and history
export interface ConversationContext {
  readonly conversationId: ConversationId;
  readonly title?: string;
  readonly summary?: string;
  readonly participants: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly messageCount: number;
  readonly isActive: boolean;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

// Session data for conversation management
export interface SessionData {
  readonly sessionId: string;
  readonly userId?: string;
  readonly conversationId: ConversationId;
  readonly preferences: UserPreferences;
  readonly context: ConversationMemory;
  readonly activity: SessionActivity;
  readonly createdAt: Date;
  readonly lastActivity: Date;
  readonly expiresAt?: Date;
}

// User preferences for chat experience
export interface UserPreferences {
  readonly language?: string;
  readonly responseStyle?: 'concise' | 'detailed' | 'technical' | 'friendly';
  readonly maxSources?: number;
  readonly sourcePreference?: readonly ('github' | 'web' | 'local')[];
  readonly streamingEnabled?: boolean;
  readonly citationsEnabled?: boolean;
  readonly darkMode?: boolean;
  readonly notificationsEnabled?: boolean;
}

// Conversation memory for context retention
export interface ConversationMemory {
  readonly recentMessages: readonly ChatMessage[];
  readonly importantTopics: readonly string[];
  readonly mentionedFiles: readonly string[];
  readonly codeSnippets: readonly CodeReference[];
  readonly userIntent?: string;
  readonly conversationStage?: 'greeting' | 'inquiry' | 'clarification' | 'resolution';
}

// Code reference tracking
export interface CodeReference {
  readonly filepath: string;
  readonly language: string;
  readonly snippet: string;
  readonly lineNumbers?: readonly number[];
  readonly context: string;
  readonly mentioned: Date;
}

// Session activity tracking
export interface SessionActivity {
  readonly totalMessages: number;
  readonly totalQueries: number;
  readonly averageResponseTime: number;
  readonly sourcesUsed: Record<string, number>;
  readonly topicsDiscussed: readonly string[];
  readonly feedbackGiven: number;
  readonly errorsEncountered: number;
}

// Chat request and response interfaces
export interface ChatRequest {
  readonly message: string;
  readonly conversationId?: ConversationId;
  readonly parentMessageId?: MessageId;
  readonly context?: {
    readonly files?: readonly string[];
    readonly references?: readonly string[];
    readonly previousMessages?: readonly MessageId[];
  };
  readonly preferences?: Partial<UserPreferences>;
  readonly streaming?: boolean;
  readonly maxSources?: number;
  readonly timeout?: number;
}

export interface ChatResponse {
  readonly success: true;
  readonly message: ChatMessage;
  readonly conversationId: ConversationId;
  readonly suggestions?: readonly string[];
  readonly relatedTopics?: readonly string[];
}

// Error handling for chat operations
export interface ChatError {
  readonly code: ChatErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly messageId?: MessageId;
  readonly conversationId?: ConversationId;
  readonly retryable: boolean;
  readonly context?: string;
}

export type ChatErrorCode =
  | 'MESSAGE_TOO_LONG'
  | 'RATE_LIMITED'
  | 'CONTEXT_LIMIT_EXCEEDED'
  | 'STREAMING_FAILED'
  | 'SEARCH_TIMEOUT'
  | 'LLM_ERROR'
  | 'CITATION_FAILED'
  | 'INVALID_CONVERSATION'
  | 'SESSION_EXPIRED'
  | 'PERMISSION_DENIED';

// Result type for chat operations
export type ChatResult = ChatResponse | { readonly success: false; readonly error: ChatError };

// Message reactions and feedback
export interface MessageReaction {
  readonly type: 'like' | 'dislike' | 'helpful' | 'not_helpful' | 'incorrect' | 'incomplete';
  readonly userId?: string;
  readonly timestamp: Date;
  readonly feedback?: string;
}

// Message editing and history
export interface MessageEdit {
  readonly timestamp: Date;
  readonly previousContent: string;
  readonly newContent: string;
  readonly reason?: string;
  readonly editedBy?: string;
}

// Conversation export formats
export interface ConversationExport {
  readonly format: 'json' | 'markdown' | 'html' | 'pdf';
  readonly conversation: ConversationContext;
  readonly messages: readonly ChatMessage[];
  readonly metadata: {
    readonly exportedAt: Date;
    readonly exportedBy?: string;
    readonly version: string;
    readonly includeSources: boolean;
    readonly includeMetadata: boolean;
  };
}

// Chat analytics and metrics
export interface ChatMetrics {
  readonly conversationId: ConversationId;
  readonly duration: number;
  readonly messageCount: number;
  readonly averageResponseTime: number;
  readonly sourcesRetrieved: number;
  readonly userSatisfaction?: number;
  readonly completionRate: number;
  readonly errorRate: number;
  readonly topics: readonly string[];
  readonly timeToResolution?: number;
}

// Real-time typing indicators
export interface TypingIndicator {
  readonly conversationId: ConversationId;
  readonly userId?: string;
  readonly isTyping: boolean;
  readonly timestamp: Date;
}

// Conversation search and filtering
export interface ConversationFilter {
  readonly userId?: string;
  readonly dateRange?: {
    readonly from: Date;
    readonly to: Date;
  };
  readonly tags?: readonly string[];
  readonly hasErrors?: boolean;
  readonly minMessages?: number;
  readonly maxMessages?: number;
  readonly topics?: readonly string[];
}

export interface ConversationSearchRequest {
  readonly query?: string;
  readonly filters?: ConversationFilter;
  readonly sortBy?: 'created' | 'updated' | 'messages' | 'relevance';
  readonly sortOrder?: 'asc' | 'desc';
  readonly limit?: number;
  readonly offset?: number;
}

export interface ConversationSearchResponse {
  readonly conversations: readonly ConversationContext[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly metadata: {
    readonly searchTime: number;
    readonly totalResults: number;
  };
}

// Zod validation schemas
export const MessageIdSchema = z.string().brand('MessageId');
export const ConversationIdSchema = z.string().brand('ConversationId');
export const CitationIdSchema = z.string().brand('CitationId');
export const ThreadIdSchema = z.string().brand('ThreadId');

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);
export const MessageStatusSchema = z.enum(['sending', 'processing', 'streaming', 'completed', 'failed', 'cancelled']);

export const CitationSchema = z.object({
  id: CitationIdSchema,
  documentId: z.string(),
  excerpt: z.string().max(1000),
  startLine: z.number().positive().optional(),
  endLine: z.number().positive().optional(),
  relevanceScore: z.number().min(0).max(1),
  sourceUrl: z.string().url().optional(),
  sourcePath: z.string(),
  sourceType: z.enum(['github', 'web', 'local']),
  timestamp: z.date(),
  context: z.object({
    before: z.string().optional(),
    after: z.string().optional(),
  }).optional(),
}).strict();

export const ChatMessageSchema = z.object({
  id: MessageIdSchema,
  role: MessageRoleSchema,
  content: z.string().min(1).max(10000),
  conversationId: ConversationIdSchema,
  threadId: ThreadIdSchema.optional(),
  parentId: MessageIdSchema.optional(),
  timestamp: z.date(),
  status: MessageStatusSchema,
  sources: z.array(CitationSchema).optional(),
  streaming: z.boolean().optional(),
  metadata: z.object({
    tokens: z.object({
      input: z.number().nonnegative(),
      output: z.number().nonnegative(),
      total: z.number().nonnegative(),
    }).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    processingTime: z.number().positive().optional(),
    searchTime: z.number().positive().optional(),
    retrievalCount: z.number().nonnegative().optional(),
    cost: z.number().positive().optional(),
    version: z.string().optional(),
    flags: z.array(z.string()).optional(),
  }).optional(),
}).strict();

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: ConversationIdSchema.optional(),
  parentMessageId: MessageIdSchema.optional(),
  context: z.object({
    files: z.array(z.string()).optional(),
    references: z.array(z.string()).optional(),
    previousMessages: z.array(MessageIdSchema).optional(),
  }).optional(),
  preferences: z.object({
    language: z.string().optional(),
    responseStyle: z.enum(['concise', 'detailed', 'technical', 'friendly']).optional(),
    maxSources: z.number().positive().max(20).optional(),
    sourcePreference: z.array(z.enum(['github', 'web', 'local'])).optional(),
    streamingEnabled: z.boolean().optional(),
    citationsEnabled: z.boolean().optional(),
  }).optional(),
  streaming: z.boolean().default(true),
  maxSources: z.number().positive().max(20).default(5),
  timeout: z.number().positive().max(60000).optional(),
}).strict();

export const StreamingChunkSchema = z.object({
  messageId: MessageIdSchema,
  conversationId: ConversationIdSchema,
  chunk: z.string(),
  delta: z.string().optional(),
  isComplete: z.boolean(),
  sources: z.array(CitationSchema).optional(),
  timestamp: z.date(),
  chunkIndex: z.number().nonnegative(),
  totalChunks: z.number().positive().optional(),
}).strict();

// Type utility functions
export const createMessageId = (id: string): MessageId => id as MessageId;
export const createConversationId = (id: string): ConversationId => id as ConversationId;
export const createCitationId = (id: string): CitationId => id as CitationId;
export const createThreadId = (id: string): ThreadId => id as ThreadId;

export const isValidMessageId = (id: unknown): id is MessageId =>
  typeof id === 'string' && id.length > 0;

export const isValidConversationId = (id: unknown): id is ConversationId =>
  typeof id === 'string' && id.length > 0;

// Type guards
export const isChatResponse = (result: ChatResult): result is ChatResponse =>
  result.success === true;

export const isChatError = (result: ChatResult): result is { success: false; error: ChatError } =>
  result.success === false;

export const isStreamingChunk = (data: unknown): data is StreamingChunk =>
  typeof data === 'object' && data !== null && 'chunk' in data && 'messageId' in data;

export const isUserMessage = (message: ChatMessage): boolean =>
  message.role === 'user';

export const isAssistantMessage = (message: ChatMessage): boolean =>
  message.role === 'assistant';

export const isSystemMessage = (message: ChatMessage): boolean =>
  message.role === 'system';

// Default configurations
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'en',
  responseStyle: 'detailed',
  maxSources: 5,
  sourcePreference: ['github', 'web', 'local'],
  streamingEnabled: true,
  citationsEnabled: true,
  darkMode: false,
  notificationsEnabled: true,
} as const;

export const MAX_MESSAGE_LENGTH = 10000;
export const MAX_CONVERSATION_HISTORY = 50;
export const MAX_SOURCES_PER_MESSAGE = 20;
export const DEFAULT_STREAMING_TIMEOUT = 30000;
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours