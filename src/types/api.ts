/**
 * API Infrastructure Types
 * Generic API response wrappers, error handling, and infrastructure types
 */

import { z } from 'zod';

// HTTP method types
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// HTTP status code categories
export type HTTPStatusCode =
  | 200 | 201 | 202 | 204 | 206
  | 300 | 301 | 302 | 304 | 307 | 308
  | 400 | 401 | 403 | 404 | 405 | 409 | 410 | 422 | 429
  | 500 | 501 | 502 | 503 | 504 | 507;

// Request ID for tracing
export type RequestId = string & { readonly __brand: 'RequestId' };
export type TraceId = string & { readonly __brand: 'TraceId' };
export type SpanId = string & { readonly __brand: 'SpanId' };

// Generic success response
export interface APIResponse<T = unknown> {
  readonly success: true;
  readonly data: T;
  readonly metadata?: ResponseMetadata;
  readonly pagination?: PaginationMetadata;
}

// Generic error response
export interface APIErrorResponse {
  readonly success: false;
  readonly error: APIError;
  readonly metadata?: ResponseMetadata;
}

// Union type for all API responses
export type APIResult<T = unknown> = APIResponse<T> | APIErrorResponse;

// Response metadata for debugging and analytics
export interface ResponseMetadata {
  readonly requestId: RequestId;
  readonly traceId?: TraceId;
  readonly spanId?: SpanId;
  readonly timestamp: Date;
  readonly version: string;
  readonly processingTime: number;
  readonly server?: string;
  readonly region?: string;
  readonly cacheHit?: boolean;
  readonly retryCount?: number;
}

// Structured error information
export interface APIError {
  readonly code: APIErrorCode;
  readonly message: string;
  readonly details?: ErrorDetails;
  readonly timestamp: Date;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly path?: string;
  readonly method?: HTTPMethod;
  readonly statusCode: HTTPStatusCode;
  readonly retryable: boolean;
  readonly context?: Record<string, unknown>;
}

// Error detail types
export interface ErrorDetails {
  readonly field?: string;
  readonly value?: unknown;
  readonly constraint?: string;
  readonly expected?: string;
  readonly received?: string;
  readonly stack?: string;
  readonly cause?: string;
  readonly validation?: ValidationError[];
}

// Validation error for form/input validation
export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly value?: unknown;
  readonly constraint?: string | number;
}

// Comprehensive error codes
export type APIErrorCode =
  // Client errors (4xx)
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'GONE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  // Server errors (5xx)
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'INSUFFICIENT_STORAGE'
  // Custom application errors
  | 'SEARCH_TIMEOUT'
  | 'LLM_ERROR'
  | 'EMBEDDING_FAILED'
  | 'WEAVIATE_ERROR'
  | 'CACHE_ERROR'
  | 'QUEUE_ERROR'
  | 'INGESTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'FEATURE_DISABLED'
  | 'MAINTENANCE_MODE';

// Pagination support
export interface PaginationRequest {
  readonly limit?: number;
  readonly offset?: number;
  readonly cursor?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface PaginationMetadata {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
  readonly nextCursor?: string;
  readonly previousCursor?: string;
  readonly totalPages?: number;
  readonly currentPage?: number;
}

// Filtering and sorting
export interface FilterOperator<T = unknown> {
  readonly eq?: T;
  readonly ne?: T;
  readonly gt?: T;
  readonly gte?: T;
  readonly lt?: T;
  readonly lte?: T;
  readonly in?: readonly T[];
  readonly nin?: readonly T[];
  readonly like?: string;
  readonly regex?: string;
  readonly exists?: boolean;
  readonly null?: boolean;
}

export type FilterCriteria<T = Record<string, unknown>> = {
  readonly [K in keyof T]?: FilterOperator<T[K]> | T[K];
};

export interface SortCriteria {
  readonly field: string;
  readonly order: 'asc' | 'desc';
  readonly nullsFirst?: boolean;
}

// Request context and headers
export interface RequestContext {
  readonly requestId: RequestId;
  readonly traceId?: TraceId;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
  readonly origin?: string;
  readonly referer?: string;
  readonly timestamp: Date;
  readonly method: HTTPMethod;
  readonly path: string;
  readonly query?: Record<string, string | string[]>;
  readonly headers?: Record<string, string>;
}

// Rate limiting information
export interface RateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: Date;
  readonly retryAfter?: number;
  readonly scope: 'ip' | 'user' | 'global';
  readonly windowSize: number;
}

// Health check response
export interface HealthCheckResponse {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: Date;
  readonly version: string;
  readonly uptime: number;
  readonly services: Record<string, ServiceHealth>;
  readonly metrics?: HealthMetrics;
}

export interface ServiceHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly responseTime?: number;
  readonly lastCheck: Date;
  readonly error?: string;
  readonly version?: string;
}

export interface HealthMetrics {
  readonly requestsPerSecond: number;
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly diskUsage?: number;
}

// Batch operations
export interface BatchRequest<T = unknown> {
  readonly operations: readonly BatchOperation<T>[];
  readonly transactional?: boolean;
  readonly continueOnError?: boolean;
  readonly timeout?: number;
}

export interface BatchOperation<T = unknown> {
  readonly id: string;
  readonly method: HTTPMethod;
  readonly path: string;
  readonly data?: T;
  readonly headers?: Record<string, string>;
}

export interface BatchResponse<T = unknown> {
  readonly results: readonly BatchResult<T>[];
  readonly transactional: boolean;
  readonly totalOperations: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly processingTime: number;
}

export interface BatchResult<T = unknown> {
  readonly id: string;
  readonly success: boolean;
  readonly data?: T;
  readonly error?: APIError;
  readonly statusCode: HTTPStatusCode;
}

// Webhook types
export interface WebhookPayload<T = unknown> {
  readonly id: string;
  readonly event: string;
  readonly timestamp: Date;
  readonly data: T;
  readonly version: string;
  readonly source: string;
  readonly signature?: string;
}

export interface WebhookResponse {
  readonly received: boolean;
  readonly processed: boolean;
  readonly timestamp: Date;
  readonly processingTime?: number;
  readonly error?: string;
}

// API versioning
export interface APIVersion {
  readonly version: string;
  readonly releaseDate: Date;
  readonly deprecated?: boolean;
  readonly deprecationDate?: Date;
  readonly endOfLife?: Date;
  readonly changelog?: string;
  readonly breaking: boolean;
}

// Cache control
export interface CacheConfig {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly tags?: readonly string[];
  readonly vary?: readonly string[];
  readonly private?: boolean;
  readonly immutable?: boolean;
  readonly staleWhileRevalidate?: number;
}

// Search and query parameters
export interface QueryParams {
  readonly q?: string;
  readonly filters?: Record<string, unknown>;
  readonly sort?: readonly SortCriteria[];
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly expand?: readonly string[];
  readonly fields?: readonly string[];
  readonly locale?: string;
  readonly timezone?: string;
}

// File upload types
export interface FileUpload {
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
  readonly checksum?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface UploadResponse {
  readonly id: string;
  readonly url: string;
  readonly filename: string;
  readonly size: number;
  readonly mimeType: string;
  readonly uploadedAt: Date;
  readonly expiresAt?: Date;
}

// Zod validation schemas
export const RequestIdSchema = z.string().brand('RequestId');
export const TraceIdSchema = z.string().brand('TraceId');
export const SpanIdSchema = z.string().brand('SpanId');

export const HTTPMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export const PaginationRequestSchema = z.object({
  limit: z.number().positive().max(1000).default(10),
  offset: z.number().nonnegative().default(0),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).strict();

export const FilterOperatorSchema = z.object({
  eq: z.unknown().optional(),
  ne: z.unknown().optional(),
  gt: z.unknown().optional(),
  gte: z.unknown().optional(),
  lt: z.unknown().optional(),
  lte: z.unknown().optional(),
  in: z.array(z.unknown()).optional(),
  nin: z.array(z.unknown()).optional(),
  like: z.string().optional(),
  regex: z.string().optional(),
  exists: z.boolean().optional(),
  null: z.boolean().optional(),
}).strict();

export const SortCriteriaSchema = z.object({
  field: z.string().min(1),
  order: z.enum(['asc', 'desc']),
  nullsFirst: z.boolean().optional(),
}).strict();

export const ValidationErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
  value: z.unknown().optional(),
  constraint: z.union([z.string(), z.number()]).optional(),
}).strict();

export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.object({
    field: z.string().optional(),
    value: z.unknown().optional(),
    constraint: z.string().optional(),
    expected: z.string().optional(),
    received: z.string().optional(),
    stack: z.string().optional(),
    cause: z.string().optional(),
    validation: z.array(ValidationErrorSchema).optional(),
  }).optional(),
  timestamp: z.date(),
  requestId: RequestIdSchema.optional(),
  traceId: TraceIdSchema.optional(),
  path: z.string().optional(),
  method: HTTPMethodSchema.optional(),
  statusCode: z.number(),
  retryable: z.boolean(),
  context: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const ResponseMetadataSchema = z.object({
  requestId: RequestIdSchema,
  traceId: TraceIdSchema.optional(),
  spanId: SpanIdSchema.optional(),
  timestamp: z.date(),
  version: z.string(),
  processingTime: z.number().positive(),
  server: z.string().optional(),
  region: z.string().optional(),
  cacheHit: z.boolean().optional(),
  retryCount: z.number().nonnegative().optional(),
}).strict();

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date(),
  version: z.string(),
  uptime: z.number().nonnegative(),
  services: z.record(z.string(), z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    responseTime: z.number().positive().optional(),
    lastCheck: z.date(),
    error: z.string().optional(),
    version: z.string().optional(),
  })),
  metrics: z.object({
    requestsPerSecond: z.number().nonnegative(),
    averageResponseTime: z.number().nonnegative(),
    errorRate: z.number().min(0).max(1),
    memoryUsage: z.number().nonnegative(),
    cpuUsage: z.number().min(0).max(100),
    diskUsage: z.number().min(0).max(100).optional(),
  }).optional(),
}).strict();

// Type utility functions
export const createRequestId = (id: string): RequestId => id as RequestId;
export const createTraceId = (id: string): TraceId => id as TraceId;
export const createSpanId = (id: string): SpanId => id as SpanId;

export const isValidRequestId = (id: unknown): id is RequestId =>
  typeof id === 'string' && id.length > 0;

// Type guards
export const isAPIResponse = <T>(result: APIResult<T>): result is APIResponse<T> =>
  result.success === true;

export const isAPIErrorResponse = (result: APIResult): result is APIErrorResponse =>
  result.success === false;

export const isRetryableError = (error: APIError): boolean =>
  error.retryable && [500, 502, 503, 504, 507].includes(error.statusCode);

export const isClientError = (error: APIError): boolean =>
  error.statusCode >= 400 && error.statusCode < 500;

export const isServerError = (error: APIError): boolean =>
  error.statusCode >= 500 && error.statusCode < 600;

// Helper functions
export const createSuccessResponse = <T>(
  data: T,
  metadata?: ResponseMetadata,
  pagination?: PaginationMetadata
): APIResponse<T> => ({
  success: true,
  data,
  metadata,
  pagination,
});

export const createErrorResponse = (
  error: APIError,
  metadata?: ResponseMetadata
): APIErrorResponse => ({
  success: false,
  error,
  metadata,
});

export const createValidationError = (
  field: string,
  message: string,
  value?: unknown,
  code = 'VALIDATION_ERROR'
): ValidationError => ({
  field,
  code,
  message,
  value,
});

// Error status code mappings
export const ERROR_STATUS_CODES: Record<APIErrorCode, HTTPStatusCode> = {
  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,

  // Server errors
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  INSUFFICIENT_STORAGE: 507,

  // Custom errors
  SEARCH_TIMEOUT: 504,
  LLM_ERROR: 502,
  EMBEDDING_FAILED: 502,
  WEAVIATE_ERROR: 502,
  CACHE_ERROR: 503,
  QUEUE_ERROR: 503,
  INGESTION_FAILED: 422,
  AUTHENTICATION_FAILED: 401,
  AUTHORIZATION_FAILED: 403,
  QUOTA_EXCEEDED: 429,
  FEATURE_DISABLED: 503,
  MAINTENANCE_MODE: 503,
} as const;

// Default configurations
export const DEFAULT_PAGINATION_LIMIT = 10;
export const MAX_PAGINATION_LIMIT = 1000;
export const DEFAULT_API_TIMEOUT = 30000;
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_CACHE_TTL = 300; // 5 minutes