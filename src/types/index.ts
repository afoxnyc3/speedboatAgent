/**
 * Types Index
 * Central export file for all TypeScript definitions and validation schemas
 */

// Re-export all type definitions
export * from './search';
export * from './chat';
export * from './api';
export * from './rag';
export * from './query-classification';
export * from './memory';

// Re-export specific commonly used types for convenience
export type {
  // Core entity IDs from search
  DocumentId,
  QueryId,
  SessionId,
} from './search';

export type {
  // Core entity IDs from chat
  MessageId,
  ConversationId,
  CitationId,
} from './chat';

export type {
  // Core entity IDs from api
  RequestId,
  TraceId,
} from './api';

export type {
  // Core entity IDs from rag
  EmbeddingId,
  RetrievalId,
  ContextId,
} from './rag';

export type {
  // Core entity IDs from memory
  MemoryId,
  UserId,
  SessionId,
  RunId,
  AgentId,
} from './memory';

export type {
  // Search interfaces
  Document,
  SearchRequest,
  SearchResponse,
} from './search';

export type {
  // Chat interfaces
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from './chat';

export type {
  // API interfaces
  APIResponse,
  APIErrorResponse,
} from './api';

export type {
  // RAG interfaces
  RAGRequest,
  RAGResponse,
} from './rag';

export type {
  // Search error types
  SearchError,
} from './search';

export type {
  // Chat error types
  ChatError,
} from './chat';

export type {
  // API error types
  APIError,
} from './api';

export type {
  // RAG error types
  RAGError,
} from './rag';

export type {
  // Search configuration types
  SearchConfig,
} from './search';

export type {
  // Chat configuration types
  UserPreferences,
} from './chat';

export type {
  // RAG configuration types
  RAGSystemConfig,
  EmbeddingConfig,
  GenerationConfig,
} from './rag';

// Import Zod for additional schemas
import { z } from 'zod';

// Environment configuration schema
export const EnvironmentConfigSchema = z.object({
  // Core services
  OPENAI_API_KEY: z.string().min(1),
  WEAVIATE_HOST: z.string().url(),
  WEAVIATE_API_KEY: z.string().min(1),
  UPSTASH_REDIS_URL: z.string().url(),
  UPSTASH_REDIS_TOKEN: z.string().min(1),

  // GitHub integration
  GITHUB_TOKEN: z.string().min(1).optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Memory service
  MEM0_API_KEY: z.string().min(1).optional(),

  // Web crawling
  FIRECRAWL_API_KEY: z.string().min(1).optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

  // Application settings
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PORT: z.coerce.number().positive().default(3000),

  // Rate limiting
  RATE_LIMIT_REQUESTS: z.coerce.number().positive().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().positive().default(900), // 15 minutes

  // Search configuration
  DEFAULT_SEARCH_LIMIT: z.coerce.number().positive().max(100).default(10),
  MAX_SEARCH_RESULTS: z.coerce.number().positive().max(1000).default(100),
  SEARCH_TIMEOUT: z.coerce.number().positive().max(60000).default(5000),

  // Chat configuration
  MAX_MESSAGE_LENGTH: z.coerce.number().positive().max(50000).default(10000),
  MAX_CONVERSATION_HISTORY: z.coerce.number().positive().max(200).default(50),
  STREAMING_ENABLED: z.coerce.boolean().default(true),

  // RAG configuration
  RAG_CONTEXT_LIMIT: z.coerce.number().positive().max(20000).default(8000),
  RAG_MAX_SOURCES: z.coerce.number().positive().max(50).default(5),
  EMBEDDING_DIMENSIONS: z.coerce.number().positive().default(1024),

  // Cache settings
  CACHE_TTL: z.coerce.number().positive().default(300),
  CACHE_ENABLED: z.coerce.boolean().default(true),

  // Performance settings
  REQUEST_TIMEOUT: z.coerce.number().positive().max(120000).default(30000),
  RETRY_ATTEMPTS: z.coerce.number().nonnegative().max(5).default(3),
}).strict();

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// Application configuration schema
export const ApplicationConfigSchema = z.object({
  app: z.object({
    name: z.string().default('RAG Agent'),
    version: z.string().default('1.0.0'),
    environment: z.enum(['development', 'staging', 'production']),
    debug: z.boolean().default(false),
  }),

  search: z.object({
    defaultLimit: z.number().positive().max(100).default(10),
    maxResults: z.number().positive().max(1000).default(100),
    timeout: z.number().positive().max(60000).default(5000),
    cacheEnabled: z.boolean().default(true),
    cacheTtl: z.number().positive().default(300),
    hybridWeights: z.object({
      vector: z.number().min(0).max(1).default(0.75),
      keyword: z.number().min(0).max(1).default(0.25),
    }),
  }),

  chat: z.object({
    maxMessageLength: z.number().positive().max(50000).default(10000),
    maxConversationHistory: z.number().positive().max(200).default(50),
    streamingEnabled: z.boolean().default(true),
    defaultResponseStyle: z.enum(['concise', 'detailed', 'technical', 'friendly']).default('detailed'),
    maxSources: z.number().positive().max(20).default(5),
  }),

  rag: z.object({
    contextLimit: z.number().positive().max(20000).default(8000),
    maxSources: z.number().positive().max(50).default(5),
    embeddingDimensions: z.number().positive().default(1024),
    retrievalStrategy: z.enum(['semantic', 'hybrid', 'keyword']).default('hybrid'),
    generationStrategy: z.enum(['faithful', 'creative', 'balanced', 'technical']).default('faithful'),
    temperature: z.number().min(0).max(2).default(0.1),
  }),

  services: z.object({
    weaviate: z.object({
      timeout: z.number().positive().default(10000),
      retryAttempts: z.number().nonnegative().default(3),
      batchSize: z.number().positive().default(100),
    }),
    openai: z.object({
      timeout: z.number().positive().default(30000),
      retryAttempts: z.number().nonnegative().default(3),
      maxTokens: z.number().positive().default(4000),
      model: z.string().default('gpt-4-turbo'),
      embeddingModel: z.string().default('text-embedding-3-large'),
    }),
    redis: z.object({
      timeout: z.number().positive().default(5000),
      retryAttempts: z.number().nonnegative().default(3),
      keyPrefix: z.string().default('rag:'),
    }),
  }),

  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsEnabled: z.boolean().default(true),
    tracingEnabled: z.boolean().default(false),
    errorReportingEnabled: z.boolean().default(true),
    performanceMonitoring: z.boolean().default(true),
  }),

  security: z.object({
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      requests: z.number().positive().default(100),
      windowMs: z.number().positive().default(900000), // 15 minutes
    }),
    cors: z.object({
      enabled: z.boolean().default(true),
      origins: z.array(z.string()).default(['http://localhost:3000']),
      methods: z.array(z.string()).default(['GET', 'POST']),
    }),
    headers: z.object({
      contentSecurityPolicy: z.boolean().default(true),
      hsts: z.boolean().default(true),
      noSniff: z.boolean().default(true),
    }),
  }),
}).strict();

export type ApplicationConfig = z.infer<typeof ApplicationConfigSchema>;

// Feature flags schema
export const FeatureFlagsSchema = z.object({
  searchEnabled: z.boolean().default(true),
  chatEnabled: z.boolean().default(true),
  streamingEnabled: z.boolean().default(true),
  citationsEnabled: z.boolean().default(true),
  feedbackEnabled: z.boolean().default(true),
  analyticsEnabled: z.boolean().default(true),
  debugMode: z.boolean().default(false),
  betaFeatures: z.object({
    advancedRanking: z.boolean().default(false),
    multiModalSearch: z.boolean().default(false),
    conversationMemory: z.boolean().default(false),
    realTimeUpdates: z.boolean().default(false),
  }),
  experimental: z.object({
    newEmbeddingModel: z.boolean().default(false),
    improvedChunking: z.boolean().default(false),
    customReranking: z.boolean().default(false),
  }),
}).strict();

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// System health schema
export const SystemHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date(),
  version: z.string(),
  uptime: z.number().nonnegative(),
  services: z.object({
    weaviate: z.object({
      status: z.enum(['healthy', 'degraded', 'unhealthy']),
      responseTime: z.number().positive().optional(),
      lastCheck: z.date(),
      error: z.string().optional(),
    }),
    openai: z.object({
      status: z.enum(['healthy', 'degraded', 'unhealthy']),
      responseTime: z.number().positive().optional(),
      lastCheck: z.date(),
      error: z.string().optional(),
    }),
    redis: z.object({
      status: z.enum(['healthy', 'degraded', 'unhealthy']),
      responseTime: z.number().positive().optional(),
      lastCheck: z.date(),
      error: z.string().optional(),
    }),
  }),
  metrics: z.object({
    requestsPerSecond: z.number().nonnegative(),
    averageResponseTime: z.number().nonnegative(),
    errorRate: z.number().min(0).max(1),
    memoryUsage: z.number().nonnegative(),
    cpuUsage: z.number().min(0).max(100),
  }).optional(),
}).strict();

export type SystemHealth = z.infer<typeof SystemHealthSchema>;

// Session analytics schema
export const SessionAnalyticsSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().nonnegative().optional(),
  pageViews: z.number().nonnegative().default(0),
  interactions: z.number().nonnegative().default(0),
  searches: z.number().nonnegative().default(0),
  messages: z.number().nonnegative().default(0),
  errors: z.number().nonnegative().default(0),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  referrer: z.string().optional(),
  country: z.string().optional(),
  device: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
}).strict();

export type SessionAnalytics = z.infer<typeof SessionAnalyticsSchema>;

// Webhook payload schemas
export const GitHubWebhookSchema = z.object({
  action: z.string(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    html_url: z.string(),
    clone_url: z.string(),
    updated_at: z.string(),
  }),
  pusher: z.object({
    name: z.string(),
    email: z.string(),
  }).optional(),
  commits: z.array(z.object({
    id: z.string(),
    message: z.string(),
    timestamp: z.string(),
    url: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string(),
    }),
    added: z.array(z.string()),
    removed: z.array(z.string()),
    modified: z.array(z.string()),
  })).optional(),
}).strict();

export type GitHubWebhook = z.infer<typeof GitHubWebhookSchema>;

// Utility type for making properties optional
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

// Utility type for making properties required
export type RequiredDeep<T> = {
  [P in keyof T]-?: T[P] extends object | undefined ? RequiredDeep<NonNullable<T[P]>> : T[P];
};

// Utility type for extracting array element type
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// Utility type for creating a type with selected properties
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Utility type for creating a type without selected properties
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Utility type for nullable fields
export type Nullable<T> = T | null;

// Utility type for optional fields
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Type guard utilities
export const isNonNull = <T>(value: T | null): value is T => value !== null;
export const isNonUndefined = <T>(value: T | undefined): value is T => value !== undefined;
export const isDefined = <T>(value: T | null | undefined): value is T => value != null;

// Constants for type validation
export const TYPE_CONSTANTS = {
  MAX_STRING_LENGTH: 10000,
  MAX_ARRAY_LENGTH: 1000,
  MAX_OBJECT_DEPTH: 10,
  MIN_SCORE: 0,
  MAX_SCORE: 1,
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_RETRY_ATTEMPTS: 3,
} as const;

// Validation helper functions
export const validateStringLength = (str: string, max = TYPE_CONSTANTS.MAX_STRING_LENGTH): boolean =>
  str.length <= max;

export const validateArrayLength = <T>(arr: readonly T[], max = TYPE_CONSTANTS.MAX_ARRAY_LENGTH): boolean =>
  arr.length <= max;

export const validateScore = (score: number): boolean =>
  score >= TYPE_CONSTANTS.MIN_SCORE && score <= TYPE_CONSTANTS.MAX_SCORE;

export const validatePositiveNumber = (num: number): boolean =>
  Number.isFinite(num) && num > 0;

export const validateNonNegativeNumber = (num: number): boolean =>
  Number.isFinite(num) && num >= 0;

// Type assertion helpers
export const assertIsString = (value: unknown): asserts value is string => {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected string, got ${typeof value}`);
  }
};

export const assertIsNumber = (value: unknown): asserts value is number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Expected finite number, got ${typeof value}`);
  }
};

export const assertIsArray = (value: unknown): asserts value is unknown[] => {
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected array, got ${typeof value}`);
  }
};

export const assertIsObject = (value: unknown): asserts value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Expected object, got ${typeof value}`);
  }
};

// Schema validation helpers
export const validateWithSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.issues.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const safeValidateWithSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T | null => {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
};

// Export utility functions
export {
  TypeUtils,
  validateSchema,
  safeParseSchema,
  createValidationResult,
  isValidDocument,
  isValidCitation,
  isValidSearchRequest,
  createDefaultSearchRequest,
  LRUCache,
} from './utils';

// Export all schemas for runtime validation
export const VALIDATION_SCHEMAS = {
  Environment: EnvironmentConfigSchema,
  Application: ApplicationConfigSchema,
  FeatureFlags: FeatureFlagsSchema,
  SystemHealth: SystemHealthSchema,
  SessionAnalytics: SessionAnalyticsSchema,
  GitHubWebhook: GitHubWebhookSchema,
} as const;