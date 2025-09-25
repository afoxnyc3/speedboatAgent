/**
 * Type Safety Integration Tests
 * Comprehensive tests to validate type correctness and runtime behavior
 */

import { describe, test, expect, jest } from '@jest/globals';
import { z } from 'zod';
import {
  // Core types
  createDocumentId,
  createMessageId,
  createConversationId,
  createQueryId,
  isValidDocument,
  isValidCitation,
  isValidSearchRequest,

  // Schemas
  SearchRequestSchema,
  ChatRequestSchema,
  DocumentSchema,
  CitationSchema,
  APIErrorSchema,
  EnvironmentConfigSchema,

  // Utils
  TypeUtils,
  validateSchema,
  safeParseSchema,
  LRUCache,
} from '../index';

import type {
  Document,
  SearchRequest,
  SearchResponse,
  ChatMessage,
  Citation,
  APIResponse,
  APIErrorResponse,
  DocumentId,
  MessageId,
  ConversationId,
  EnvironmentConfig,
  ValidationResult,
} from '../index';

describe('Type Safety Tests', () => {
  describe('Branded Types', () => {
    test('should create and validate branded IDs', () => {
      const docId = createDocumentId('test-doc-123');
      const msgId = createMessageId('test-msg-456');
      const convId = createConversationId('test-conv-789');
      const queryId = createQueryId('test-query-abc');

      expect(docId).toBe('test-doc-123');
      expect(msgId).toBe('test-msg-456');
      expect(convId).toBe('test-conv-789');
      expect(queryId).toBe('test-query-abc');

      // Type safety: these should all be different types at compile time
      // but same runtime value
      expect(typeof docId).toBe('string');
      expect(typeof msgId).toBe('string');
      expect(typeof convId).toBe('string');
      expect(typeof queryId).toBe('string');
    });

    test('should prevent mixing branded IDs', () => {
      const docId = createDocumentId('test-123');
      const msgId = createMessageId('test-123');

      // Runtime values are same
      expect(docId).toBe(msgId);

      // But TypeScript should prevent assignment without casting
      // This is compile-time only, so we just verify the values
      expect(typeof docId).toBe('string');
      expect(typeof msgId).toBe('string');
    });
  });

  describe('Schema Validation', () => {
    test('should validate SearchRequest schema', () => {
      const validRequest: SearchRequest = {
        query: 'test query',
        limit: 10,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
      };

      const result = SearchRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.query).toBe('test query');
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(0);
      }
    });

    test('should reject invalid SearchRequest', () => {
      const invalidRequest = {
        query: '', // Empty query should fail
        limit: -1, // Negative limit should fail
      };

      const result = SearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues.some(e => e.path.includes('query'))).toBe(true);
      }
    });

    test('should validate Document schema', () => {
      const validDocument: Document = {
        id: createDocumentId('doc-123'),
        content: 'Test content',
        filepath: '/test/file.ts',
        language: 'typescript',
        source: 'github',
        score: 0.85,
        priority: 1.2,
        metadata: {
          size: 1024,
          wordCount: 100,
          lines: 20,
          encoding: 'utf-8',
          mimeType: 'text/typescript',
          tags: ['test', 'typescript'],
          lastModified: new Date(),
          created: new Date(),
          checksum: 'abc123',
        },
      };

      const result = DocumentSchema.safeParse(validDocument);
      expect(result.success).toBe(true);
    });

    test('should validate Citation schema', () => {
      const validCitation: Citation = {
        id: 'citation-123' as any, // Type assertion for test
        documentId: createDocumentId('doc-123'),
        excerpt: 'This is a test excerpt',
        relevanceScore: 0.75,
        sourcePath: '/test/source.ts',
        sourceType: 'github',
        timestamp: new Date(),
      };

      const result = CitationSchema.safeParse(validCitation);
      expect(result.success).toBe(true);
    });

    test('should validate Environment configuration', () => {
      const validEnv: Partial<EnvironmentConfig> = {
        OPENAI_API_KEY: 'sk-test-key',
        WEAVIATE_HOST: 'https://test.weaviate.network',
        WEAVIATE_API_KEY: 'test-api-key',
        UPSTASH_REDIS_URL: 'https://test.upstash.com',
        UPSTASH_REDIS_TOKEN: 'test-token',
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
        PORT: 3000,
      };

      const result = EnvironmentConfigSchema.partial().safeParse(validEnv);
      expect(result.success).toBe(true);
    });
  });

  describe('Type Guards and Validation', () => {
    test('should validate Document objects', () => {
      const validDoc: Document = {
        id: createDocumentId('test-123'),
        content: 'Test content',
        filepath: '/test.ts',
        language: 'typescript',
        source: 'github',
        score: 0.5,
        priority: 1.0,
        metadata: {
          size: 100,
          wordCount: 20,
          lines: 5,
          encoding: 'utf-8',
          mimeType: 'text/plain',
          tags: [],
          lastModified: new Date(),
          created: new Date(),
          checksum: 'test',
        },
      };

      expect(isValidDocument(validDoc)).toBe(true);

      // Test invalid documents
      expect(isValidDocument(null)).toBe(false);
      expect(isValidDocument({})).toBe(false);
      expect(isValidDocument({ ...validDoc, id: '' })).toBe(false);
      expect(isValidDocument({ ...validDoc, content: undefined })).toBe(false);
    });

    test('should validate Citation objects', () => {
      const validCitation: Citation = {
        id: 'citation-123' as any,
        documentId: createDocumentId('doc-123'),
        excerpt: 'Test excerpt',
        relevanceScore: 0.8,
        sourcePath: '/test.ts',
        sourceType: 'github',
        timestamp: new Date(),
      };

      expect(isValidCitation(validCitation)).toBe(true);

      // Test invalid citations
      expect(isValidCitation(null)).toBe(false);
      expect(isValidCitation({})).toBe(false);
      expect(isValidCitation({ ...validCitation, relevanceScore: -1 })).toBe(false);
    });

    test('should validate SearchRequest objects', () => {
      const validRequest: SearchRequest = {
        query: 'test query',
        limit: 10,
        offset: 0,
        includeContent: true,
        includeEmbedding: false,
      };

      expect(isValidSearchRequest(validRequest)).toBe(true);
      expect(isValidSearchRequest({})).toBe(false);
      expect(isValidSearchRequest({ query: '' })).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    test('should handle type narrowing', () => {
      expect(TypeUtils.isString('test')).toBe(true);
      expect(TypeUtils.isString(123)).toBe(false);
      expect(TypeUtils.isNumber(123)).toBe(true);
      expect(TypeUtils.isNumber('123')).toBe(false);
      expect(TypeUtils.isBoolean(true)).toBe(true);
      expect(TypeUtils.isBoolean('true')).toBe(false);
    });

    test('should validate arrays and objects', () => {
      expect(TypeUtils.isArray([1, 2, 3])).toBe(true);
      expect(TypeUtils.isArray('not array')).toBe(false);
      expect(TypeUtils.isNonEmptyArray([1])).toBe(true);
      expect(TypeUtils.isNonEmptyArray([])).toBe(false);
      expect(TypeUtils.isObject({})).toBe(true);
      expect(TypeUtils.isObject(null)).toBe(false);
      expect(TypeUtils.isObject([])).toBe(false);
    });

    test('should validate strings and numbers', () => {
      expect(TypeUtils.isNonEmptyString('test')).toBe(true);
      expect(TypeUtils.isNonEmptyString('')).toBe(false);
      expect(TypeUtils.isPositiveNumber(5)).toBe(true);
      expect(TypeUtils.isPositiveNumber(-1)).toBe(false);
      expect(TypeUtils.isNonNegativeNumber(0)).toBe(true);
      expect(TypeUtils.isNonNegativeNumber(-1)).toBe(false);
    });

    test('should validate URLs and emails', () => {
      expect(TypeUtils.isValidUrl('https://example.com')).toBe(true);
      expect(TypeUtils.isValidUrl('not-a-url')).toBe(false);
      expect(TypeUtils.isValidEmail('test@example.com')).toBe(true);
      expect(TypeUtils.isValidEmail('invalid-email')).toBe(false);
    });

    test('should handle object manipulation', () => {
      const obj = { a: 1, b: 2, c: 3 };

      expect(TypeUtils.pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
      expect(TypeUtils.omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
      expect(TypeUtils.merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    });

    test('should handle array operations', () => {
      const arr = [1, 2, 2, 3, 3, 3];

      expect(TypeUtils.unique(arr)).toEqual([1, 2, 3]);
      expect(TypeUtils.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);

      const objects = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 1, name: 'c' }];
      expect(TypeUtils.uniqueBy(objects, obj => obj.id)).toHaveLength(2);
    });

    test('should handle string operations', () => {
      expect(TypeUtils.capitalize('hello')).toBe('Hello');
      expect(TypeUtils.camelCase('hello-world')).toBe('helloWorld');
      expect(TypeUtils.kebabCase('HelloWorld')).toBe('hello-world');
      expect(TypeUtils.snakeCase('HelloWorld')).toBe('hello_world');
      expect(TypeUtils.truncate('long string', 8)).toBe('long ...');
    });

    test('should handle number operations', () => {
      expect(TypeUtils.clamp(5, 0, 10)).toBe(5);
      expect(TypeUtils.clamp(-1, 0, 10)).toBe(0);
      expect(TypeUtils.clamp(15, 0, 10)).toBe(10);
      expect(TypeUtils.round(3.14159, 2)).toBe(3.14);
      expect(TypeUtils.formatBytes(1024)).toBe('1 KB');
    });
  });

  describe('Schema Validation Utilities', () => {
    test('should validate with schema and return results', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().positive(),
      });

      const validData = { name: 'John', age: 30 };
      const result = validateSchema(schema, validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toBeUndefined();
    });

    test('should handle validation errors', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().positive(),
      });

      const invalidData = { name: 123, age: -1 };
      const result = validateSchema(schema, invalidData);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('should safely parse schemas', () => {
      const schema = z.string();

      expect(safeParseSchema(schema, 'valid string')).toBe('valid string');
      expect(safeParseSchema(schema, 123)).toBeNull();
    });
  });

  describe('LRU Cache', () => {
    test('should implement LRU cache correctly', () => {
      const cache = new LRUCache<string, number>(2);

      // Add two items
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);

      // Access 'a' to make it recently used
      expect(cache.get('a')).toBe(1);

      // Add third item, should evict 'b' (least recently used)
      cache.set('c', 3);
      expect(cache.size).toBe(2);
      expect(cache.get('a')).toBe(1); // 'a' should still be there (recently used)
      expect(cache.get('c')).toBe(3); // 'c' should be there (just added)
      expect(cache.get('b')).toBeUndefined(); // 'b' should be evicted
    });

    test('should handle cache operations', () => {
      const cache = new LRUCache<string, string>(3);

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);

      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
      expect(cache.size).toBe(0);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('Promise Utilities', () => {
    test('should handle delay', async () => {
      const start = Date.now();
      await TypeUtils.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    test('should handle timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 200));

      await expect(TypeUtils.timeout(slowPromise, 100))
        .rejects
        .toThrow('Operation timed out');
    });

    test('should handle retry with success', async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await TypeUtils.retry(fn, 5, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should handle retry with failure', async () => {
      const fn = jest.fn(async () => {
        throw new Error('Permanent failure');
      });

      await expect(TypeUtils.retry(fn, 3, 10))
        .rejects
        .toThrow('Permanent failure');

      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Utilities', () => {
    test('should measure execution time', async () => {
      const fn = async () => {
        await TypeUtils.delay(50);
        return 'result';
      };

      const { result, duration } = await TypeUtils.measureTime(fn);

      expect(result).toBe('result');
      expect(duration).toBeGreaterThan(40);
      expect(duration).toBeLessThan(100);
    });

    test('should debounce function calls', (done) => {
      const fn = jest.fn();
      const debouncedFn = TypeUtils.debounce(fn, 50);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should not be called immediately
      expect(fn).not.toHaveBeenCalled();

      // Should be called once after delay
      setTimeout(() => {
        expect(fn).toHaveBeenCalledTimes(1);
        done();
      }, 60);
    });

    test('should throttle function calls', (done) => {
      const fn = jest.fn();
      const throttledFn = TypeUtils.throttle(fn, 50);

      throttledFn();
      throttledFn();
      throttledFn();

      // Should be called immediately once
      expect(fn).toHaveBeenCalledTimes(1);

      // Should not be called again within throttle window
      setTimeout(() => {
        expect(fn).toHaveBeenCalledTimes(1);
        done();
      }, 30);
    });
  });

  describe('Error Handling', () => {
    test('should create structured errors', () => {
      const error = TypeUtils.createError(
        'TEST_ERROR',
        'This is a test error',
        { context: 'testing' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('This is a test error');
      expect((error as any).code).toBe('TEST_ERROR');
      expect((error as any).details).toEqual({ context: 'testing' });
    });

    test('should check error codes', () => {
      const error = TypeUtils.createError('SPECIFIC_ERROR', 'Test');

      expect(TypeUtils.isErrorWithCode(error, 'SPECIFIC_ERROR')).toBe(true);
      expect(TypeUtils.isErrorWithCode(error, 'OTHER_ERROR')).toBe(false);
      expect(TypeUtils.isErrorWithCode(new Error('regular'), 'SPECIFIC_ERROR')).toBe(false);
    });

    test('should extract error messages', () => {
      expect(TypeUtils.getErrorMessage(new Error('Error message'))).toBe('Error message');
      expect(TypeUtils.getErrorMessage('String error')).toBe('String error');
      expect(TypeUtils.getErrorMessage(123)).toBe('Unknown error occurred');
      expect(TypeUtils.getErrorMessage(null)).toBe('Unknown error occurred');
    });
  });

  describe('Type Assertions', () => {
    test('should assert string types', () => {
      expect(() => TypeUtils.isString('valid')).not.toThrow();
      // Note: TypeScript assertions are compile-time, so we can't easily test runtime failures
      // without circumventing the type system
    });

    test('should validate deep equality', () => {
      expect(TypeUtils.isDeepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
      expect(TypeUtils.isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(TypeUtils.isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(TypeUtils.isDeepEqual([1, 2], [1, 2, 3])).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end with search types', () => {
      const searchRequest = TypeUtils.createDefaultSearchRequest('test query');
      expect(isValidSearchRequest(searchRequest)).toBe(true);

      const validation = validateSchema(SearchRequestSchema, searchRequest);
      expect(validation.success).toBe(true);

      if (validation.success) {
        expect(validation.data.query).toBe('test query');
        expect(validation.data.limit).toBe(10);
      }
    });

    test('should validate complete document workflow', () => {
      const docId = createDocumentId('integration-test');
      const document: Document = {
        id: docId,
        content: 'Integration test content',
        filepath: '/test/integration.ts',
        language: 'typescript',
        source: 'github',
        score: 0.95,
        priority: 1.5,
        metadata: {
          size: 2048,
          wordCount: 200,
          lines: 40,
          encoding: 'utf-8',
          mimeType: 'text/typescript',
          tags: ['integration', 'test'],
          lastModified: new Date(),
          created: new Date(),
          checksum: 'integration-checksum',
        },
      };

      expect(isValidDocument(document)).toBe(true);

      const validation = validateSchema(DocumentSchema, document);
      expect(validation.success).toBe(true);
    });
  });
});

describe('Compile-Time Type Tests', () => {
  test('should enforce type safety at compile time', () => {
    // These tests primarily verify that the code compiles correctly
    // with strict TypeScript settings

    const docId: DocumentId = createDocumentId('test');
    const msgId: MessageId = createMessageId('test');

    // This should compile without error
    const useDocId = (id: DocumentId) => id;
    const useMsgId = (id: MessageId) => id;

    expect(useDocId(docId)).toBe(docId);
    expect(useMsgId(msgId)).toBe(msgId);

    // Type narrowing should work
    const value: unknown = 'test';
    if (TypeUtils.isString(value)) {
      // TypeScript should know 'value' is a string here
      expect(value.charAt(0)).toBe('t');
    }
  });
});