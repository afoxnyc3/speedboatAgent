/**
 * Feedback System Types
 * User feedback collection and analysis for RAG responses
 */

import { z } from 'zod';
import type { MessageId, ConversationId } from './chat';
import type { SessionId, UserId } from './memory';

// Branded types for feedback system
export type FeedbackId = string & { readonly __brand: 'FeedbackId' };
export type FeedbackSessionId = string & { readonly __brand: 'FeedbackSessionId' };

// Feedback types
export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'correction' | 'comment';
export type FeedbackCategory = 'relevance' | 'accuracy' | 'completeness' | 'clarity' | 'sources' | 'other';

// Core feedback structure
export interface Feedback {
  readonly id: FeedbackId;
  readonly type: FeedbackType;
  readonly category?: FeedbackCategory;
  readonly messageId: MessageId;
  readonly conversationId: ConversationId;
  readonly sessionId?: SessionId;
  readonly userId?: UserId;
  readonly timestamp: Date;
  readonly context: FeedbackContext;
  readonly metadata?: FeedbackMetadata;
  readonly comment?: string;
}

// Context for understanding the feedback
export interface FeedbackContext {
  readonly query: string;
  readonly response: string;
  readonly sources?: readonly string[];
  readonly searchResults?: number;
  readonly responseTime?: number;
  readonly memoryUsed?: boolean;
  readonly modelUsed?: string;
}

// Additional metadata
export interface FeedbackMetadata {
  readonly userAgent?: string;
  readonly ipHash?: string;
  readonly experimentId?: string;
  readonly version?: string;
  readonly tags?: readonly string[];
}

// Feedback submission request
export interface FeedbackRequest {
  readonly type: FeedbackType;
  readonly messageId: MessageId;
  readonly conversationId: ConversationId;
  readonly category?: FeedbackCategory;
  readonly comment?: string;
  readonly context?: Partial<FeedbackContext>;
}

// Feedback response
export interface FeedbackResponse {
  readonly success: boolean;
  readonly feedbackId?: FeedbackId;
  readonly error?: string;
  readonly timestamp: Date;
}

// Feedback analytics
export interface FeedbackAnalytics {
  readonly totalFeedback: number;
  readonly thumbsUp: number;
  readonly thumbsDown: number;
  readonly satisfactionRate: number;
  readonly topIssues: readonly FeedbackIssue[];
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

// Identified feedback patterns
export interface FeedbackIssue {
  readonly category: FeedbackCategory;
  readonly count: number;
  readonly percentage: number;
  readonly examples: readonly string[];
  readonly suggestedAction?: string;
}

// Feedback storage interface
export interface FeedbackStore {
  save(feedback: Feedback): Promise<FeedbackResponse>;
  get(id: FeedbackId): Promise<Feedback | null>;
  list(options?: FeedbackListOptions): Promise<readonly Feedback[]>;
  analyze(options?: FeedbackAnalysisOptions): Promise<FeedbackAnalytics>;
  delete(id: FeedbackId): Promise<boolean>;
}

// List options
export interface FeedbackListOptions {
  readonly conversationId?: ConversationId;
  readonly sessionId?: SessionId;
  readonly userId?: UserId;
  readonly type?: FeedbackType;
  readonly category?: FeedbackCategory;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly limit?: number;
  readonly offset?: number;
}

// Analysis options
export interface FeedbackAnalysisOptions {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly groupBy?: 'day' | 'week' | 'month';
  readonly includeExamples?: boolean;
}

// Zod schemas for validation
export const FeedbackTypeSchema = z.enum(['thumbs_up', 'thumbs_down', 'correction', 'comment']);
export const FeedbackCategorySchema = z.enum(['relevance', 'accuracy', 'completeness', 'clarity', 'sources', 'other']);

export const FeedbackRequestSchema = z.object({
  type: FeedbackTypeSchema,
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  category: FeedbackCategorySchema.optional(),
  comment: z.string().max(1000).optional(),
  context: z.object({
    query: z.string().optional(),
    response: z.string().optional(),
    sources: z.array(z.string()).optional(),
    searchResults: z.number().optional(),
    responseTime: z.number().optional(),
    memoryUsed: z.boolean().optional(),
    modelUsed: z.string().optional(),
  }).optional(),
}).strict();

// Type utility functions
export const createFeedbackId = (id: string): FeedbackId => id as FeedbackId;
export const createFeedbackSessionId = (id: string): FeedbackSessionId => id as FeedbackSessionId;

// Type guards
export const isPositiveFeedback = (feedback: Feedback): boolean => feedback.type === 'thumbs_up';
export const isNegativeFeedback = (feedback: Feedback): boolean => feedback.type === 'thumbs_down';

// Constants
export const FEEDBACK_CONSTANTS = {
  MAX_COMMENT_LENGTH: 1000,
  DEFAULT_LIST_LIMIT: 50,
  MAX_LIST_LIMIT: 500,
  RETENTION_DAYS: 90,
  MIN_SATISFACTION_THRESHOLD: 0.7,
} as const;