/**
 * Type Utility Functions and Helpers
 * Comprehensive utilities for type safety, validation, and transformation
 */

import { z } from 'zod';
import type {
  Document,
  SearchRequest,
  Citation,
  DocumentId,
  MessageId,
  ConversationId,
  QueryId,
  RequestId,
} from './index';

// Type transformation utilities
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object | undefined ? DeepRequired<NonNullable<T[P]>> : T[P];
};

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Branded type utilities
export type Brand<T, B> = T & { readonly __brand: B };

export const createBrandedId = <B extends string>(_brand: B) =>
  (id: string): Brand<string, B> => id as Brand<string, B>;

export const isBrandedId = <B extends string>(_brand: B) =>
  (id: unknown): id is Brand<string, B> =>
    typeof id === 'string' && id.length > 0;

// ID creation utilities
export const createDocumentId = createBrandedId('DocumentId');
export const createMessageId = createBrandedId('MessageId');
export const createConversationId = createBrandedId('ConversationId');
export const createQueryId = createBrandedId('QueryId');
export const createRequestId = createBrandedId('RequestId');

export const isDocumentId = isBrandedId('DocumentId');
export const isMessageId = isBrandedId('MessageId');
export const isConversationId = isBrandedId('ConversationId');
export const isQueryId = isBrandedId('QueryId');
export const isRequestId = isBrandedId('RequestId');

// Type narrowing utilities
export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isArray = <T>(value: unknown): value is T[] =>
  Array.isArray(value);

export const isNonEmptyArray = <T>(value: unknown): value is [T, ...T[]] =>
  Array.isArray(value) && value.length > 0;

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

export const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isValidUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const isValidEmail = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

// Date utilities
export const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !isNaN(value.getTime());

export const isISODateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return isValidDate(date) && date.toISOString() === value;
};

export const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  return null;
};

// Validation result types
export interface ValidationResult<T> {
  readonly success: boolean;
  readonly data?: T | undefined;
  readonly errors?: readonly ValidationError[] | undefined;
}

export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly code: string;
  readonly expected?: string;
  readonly received?: unknown;
}

// Schema validation utilities
export const createValidationResult = <T>(
  success: boolean,
  data?: T | undefined,
  errors?: ValidationError[] | undefined
): ValidationResult<T> => ({
  success,
  ...(data !== undefined && { data }),
  ...(errors !== undefined && { errors: [...errors] }),
});

export const validateSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  path = ''
): ValidationResult<T> => {
  try {
    const parsed = schema.parse(data);
    return createValidationResult(true, parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map(err => ({
        path: path + (err.path.length > 0 ? '.' + err.path.join('.') : ''),
        message: err.message,
        code: err.code,
        expected: 'expected' in err ? String(err.expected) : undefined,
        received: 'received' in err ? err.received : undefined,
      }));
      return createValidationResult(false, undefined, errors);
    }
    return createValidationResult(false, undefined, [
      {
        path,
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'UNKNOWN_ERROR',
      },
    ]);
  }
};

export const safeParseSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T | null => {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
};

// Object manipulation utilities
export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const omit = <T, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> => {
  const result = { ...obj } as Omit<T, K>;
  for (const key of keys) {
    delete (result as any)[key];
  }
  return result;
};

export const merge = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  obj1: T,
  obj2: U
): T & U => ({
  ...obj1,
  ...obj2,
});

export const deepMerge = <T extends Record<string, unknown>>(
  target: T,
  ...sources: Record<string, unknown>[]
): T => {
  if (!sources.length) return target;
  const source = sources.shift()!;

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const isDeepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isDeepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => isDeepEqual((a as any)[key], (b as any)[key]));
  }

  return false;
};

// Array utilities
export const unique = <T>(array: readonly T[]): T[] =>
  Array.from(new Set(array));

export const uniqueBy = <T, K>(array: readonly T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const groupBy = <T, K extends string | number | symbol>(
  array: readonly T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  const result = {} as Record<K, T[]>;
  for (const item of array) {
    const key = keyFn(item);
    if (!(key in result)) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
};

export const sortBy = <T>(array: readonly T[], keyFn: (item: T) => number | string): T[] =>
  [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });

export const chunk = <T>(array: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// String utilities
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const camelCase = (str: string): string =>
  str.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase());

export const kebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const snakeCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

export const truncate = (str: string, maxLength: number, suffix = '...'): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

export const sanitizeString = (str: string): string =>
  str.replace(/[<>\"'&]/g, match => {
    const escapeMap: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '&': '&amp;',
    };
    return escapeMap[match] || match;
  });

// Number utilities
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const round = (value: number, decimals = 0): number =>
  Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// Promise utilities
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    ),
  ]);

export const retry = async <T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < attempts - 1) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError!;
};

// Error handling utilities
export const createError = (
  code: string,
  message: string,
  details?: Record<string, unknown>
): Error => {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).details = details;
  return error;
};

export const isErrorWithCode = (error: unknown, code: string): boolean =>
  error instanceof Error && (error as any).code === code;

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
};

// Type-specific utilities
export const isValidDocument = (obj: unknown): obj is Document => {
  if (!isObject(obj)) return false;
  const doc = obj as Partial<Document>;
  return !!(
    isNonEmptyString(doc.id) &&
    isNonEmptyString(doc.content) &&
    isNonEmptyString(doc.filepath) &&
    isNonEmptyString(doc.language) &&
    isNonEmptyString(doc.source) &&
    isNonNegativeNumber(doc.score) &&
    isObject(doc.metadata)
  );
};

export const isValidCitation = (obj: unknown): obj is Citation => {
  if (!isObject(obj)) return false;
  const citation = obj as Partial<Citation>;
  return !!(
    isNonEmptyString(citation.id) &&
    isNonEmptyString(citation.documentId) &&
    isNonEmptyString(citation.excerpt) &&
    isNonNegativeNumber(citation.relevanceScore) &&
    isNonEmptyString(citation.sourcePath) &&
    isValidDate(citation.timestamp)
  );
};

export const isValidSearchRequest = (obj: unknown): obj is SearchRequest => {
  if (!isObject(obj)) return false;
  const req = obj as Partial<SearchRequest>;
  return isNonEmptyString(req.query);
};

export const createDefaultSearchRequest = (query: string): SearchRequest => ({
  query,
  limit: 10,
  offset: 0,
  includeContent: true,
  includeEmbedding: false,
});

// Performance utilities
export const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
};

// Cache utilities
export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly cache = new Map<K, V>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Export all utilities
export const TypeUtils = {
  // Type checks
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isNonEmptyArray,
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidUrl,
  isValidEmail,
  isValidDate,
  isISODateString,

  // Object manipulation
  pick,
  omit,
  merge,
  deepMerge,
  isEmpty,
  isDeepEqual,

  // Array utilities
  unique,
  uniqueBy,
  groupBy,
  sortBy,
  chunk,

  // String utilities
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  truncate,
  sanitizeString,

  // Number utilities
  clamp,
  round,
  formatBytes,
  formatDuration,

  // Promise utilities
  delay,
  timeout,
  retry,

  // Performance utilities
  measureTime,
  debounce,
  throttle,

  // Validation
  validateSchema,
  safeParseSchema,
  createValidationResult,

  // Error handling
  createError,
  isErrorWithCode,
  getErrorMessage,

  // Type-specific validation
  isValidDocument,
  isValidCitation,
  isValidSearchRequest,
  createDefaultSearchRequest,
} as const;

export default TypeUtils;