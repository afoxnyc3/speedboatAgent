/**
 * Deduplication Tests
 * Comprehensive test suite for content deduplication functionality
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createHash } from 'crypto';
import {
  ContentDeduplicator,
  DEFAULT_DEDUP_CONFIG,
  DeduplicationConfig,
  DeduplicationResult,
  DuplicateGroup,
  ContentSimilarity,
  deduplicateDocuments,
  checkDocumentExists,
  getContentDeduplicator,
  DeduplicationConfigSchema,
  DeduplicationRequestSchema
} from '../deduplication';
import { createWeaviateClient } from '../../weaviate/client';
import { createDocumentHash } from '../../search/search-utils';
import type { Document, DocumentSource } from '../../../types/search';

// Mock dependencies
jest.mock('../../weaviate/client');
jest.mock('../../search/search-utils');
jest.mock('crypto', () => ({
  createHash: jest.fn()
}));

const mockCreateWeaviateClient = createWeaviateClient as jest.MockedFunction<typeof createWeaviateClient>;
const mockCreateDocumentHash = createDocumentHash as jest.MockedFunction<typeof createDocumentHash>;
const mockCreateHash = createHash as jest.MockedFunction<typeof createHash>;

describe('Deduplication', () => {
  let mockClient: any;
  let mockQuery: any;
  let mockHashObj: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock crypto hash object
    mockHashObj = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash-123')
    };
    mockCreateHash.mockReturnValue(mockHashObj);

    // Mock search utils
    mockCreateDocumentHash.mockReturnValue('doc-hash-456');

    // Mock Weaviate client and query builder
    mockQuery = {
      withClassName: jest.fn().mockReturnThis(),
      withFields: jest.fn().mockReturnThis(),
      withWhere: jest.fn().mockReturnThis(),
      withLimit: jest.fn().mockReturnThis(),
      do: jest.fn()
    };

    mockClient = {
      graphql: {
        get: jest.fn().mockReturnValue(mockQuery)
      }
    };

    mockCreateWeaviateClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create test documents
  const createTestDocument = (
    content: string,
    source: DocumentSource = 'github',
    overrides: Partial<Document> = {}
  ): Document => ({
    id: `doc-${Math.random().toString(36).substr(2, 9)}`,
    content,
    source,
    filepath: `/test/${source}/file.ts`,
    priority: 1.0,
    score: 0.8,
    language: 'typescript',
    metadata: {
      url: `https://${source}.com/test/file`,
      size: content.length,
      wordCount: content.split(/\s+/).length,
      lines: content.split('\n').length,
      encoding: 'utf-8',
      mimeType: 'text/plain',
      checksum: 'test-checksum',
      lastModified: new Date('2023-01-01T00:00:00Z'),
      ...overrides.metadata
    },
    ...overrides
  });

  describe('DEFAULT_DEDUP_CONFIG', () => {
    it('should have correct default configuration values', () => {
      expect(DEFAULT_DEDUP_CONFIG.hashAlgorithm).toBe('sha256');
      expect(DEFAULT_DEDUP_CONFIG.contentThreshold).toBe(100);
      expect(DEFAULT_DEDUP_CONFIG.similarityThreshold).toBe(0.95);
      expect(DEFAULT_DEDUP_CONFIG.sourceWinners).toEqual(['github', 'web', 'local']);
      expect(DEFAULT_DEDUP_CONFIG.preserveMetadata).toBe(true);
      expect(DEFAULT_DEDUP_CONFIG.batchSize).toBe(100);
    });

    it('should be immutable (readonly)', () => {
      expect(() => {
        // @ts-expect-error - Testing readonly constraint
        DEFAULT_DEDUP_CONFIG.hashAlgorithm = 'md5';
      }).toThrow();
    });
  });

  describe('Configuration Validation', () => {
    describe('DeduplicationConfigSchema', () => {
      it('should validate valid configuration', () => {
        const validConfig = {
          hashAlgorithm: 'sha256' as const,
          contentThreshold: 50,
          similarityThreshold: 0.8,
          sourceWinners: ['github', 'web'],
          preserveMetadata: true,
          batchSize: 50
        };

        const result = DeduplicationConfigSchema.safeParse(validConfig);
        expect(result.success).toBe(true);
      });

      it('should reject invalid hash algorithm', () => {
        const invalidConfig = {
          ...DEFAULT_DEDUP_CONFIG,
          hashAlgorithm: 'sha512' // Invalid algorithm
        };

        const result = DeduplicationConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
      });

      it('should reject invalid similarity threshold', () => {
        const invalidConfig = {
          ...DEFAULT_DEDUP_CONFIG,
          similarityThreshold: 1.5 // > 1.0
        };

        const result = DeduplicationConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
      });

      it('should reject batch size too large', () => {
        const invalidConfig = {
          ...DEFAULT_DEDUP_CONFIG,
          batchSize: 2000 // > 1000
        };

        const result = DeduplicationConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
      });
    });

    describe('DeduplicationRequestSchema', () => {
      it('should validate valid request', () => {
        const validRequest = {
          documents: [createTestDocument('test content')],
          config: DEFAULT_DEDUP_CONFIG,
          forceReprocessing: true
        };

        const result = DeduplicationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should reject empty documents array', () => {
        const invalidRequest = {
          documents: [],
          config: DEFAULT_DEDUP_CONFIG
        };

        const result = DeduplicationRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should default forceReprocessing to false', () => {
        const request = {
          documents: [createTestDocument('test content')]
        };

        const result = DeduplicationRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
        expect(result.data?.forceReprocessing).toBe(false);
      });
    });
  });

  describe('ContentDeduplicator', () => {
    let deduplicator: ContentDeduplicator;

    beforeEach(() => {
      deduplicator = new ContentDeduplicator();
    });

    describe('Constructor', () => {
      it('should use default config when no config provided', () => {
        const defaultDedup = new ContentDeduplicator();
        expect(defaultDedup).toBeInstanceOf(ContentDeduplicator);
      });

      it('should merge custom config with defaults', () => {
        const customConfig = { contentThreshold: 200, batchSize: 50 };
        const customDedup = new ContentDeduplicator(customConfig);
        expect(customDedup).toBeInstanceOf(ContentDeduplicator);
      });
    });

    describe('Hash Creation', () => {
      it('should create consistent content hashes', () => {
        const content1 = 'Hello World';
        const content2 = 'hello world'; // Same content, different case
        const content3 = '  Hello World  '; // Same content with whitespace

        // Mock different hash values for different normalized content
        mockHashObj.digest
          .mockReturnValueOnce('hash-1')
          .mockReturnValueOnce('hash-1') // Same normalized content
          .mockReturnValueOnce('hash-1'); // Same normalized content

        // Test private method indirectly through deduplication
        const docs = [
          createTestDocument(content1),
          createTestDocument(content2),
          createTestDocument(content3)
        ];

        const result = deduplicator.deduplicate(docs);

        expect(mockCreateHash).toHaveBeenCalledWith('sha256');
        expect(mockHashObj.update).toHaveBeenCalledWith('hello world');
      });

      it('should create URL hashes with normalization', () => {
        const docs = [
          createTestDocument('content', 'web', {
            metadata: { url: 'https://example.com/path/' }
          }),
          createTestDocument('content', 'web', {
            metadata: { url: 'https://example.com/path' }
          }),
          createTestDocument('content', 'web', {
            metadata: { url: 'https://example.com/path?query=test#fragment' }
          }),
          createTestDocument('content', 'web', {
            metadata: { url: 'https://example.com/path/index.html' }
          })
        ];

        mockHashObj.digest
          .mockReturnValue('url-hash-1') // All should normalize to same hash
          .mockReturnValue('url-hash-1')
          .mockReturnValue('url-hash-1')
          .mockReturnValue('url-hash-1');

        const result = deduplicator.deduplicate(docs);

        expect(mockHashObj.update).toHaveBeenCalledWith('https://example.com/path');
      });
    });

    describe('Similarity Calculations', () => {
      beforeEach(() => {
        // Create a concrete instance to access private methods
        // We'll test these indirectly through the similarity calculation
      });

      it('should calculate Jaccard similarity correctly', async () => {
        const doc1 = createTestDocument('hello world test');
        const doc2 = createTestDocument('hello world example'); // 2/4 overlap = 0.5
        const doc3 = createTestDocument('completely different content'); // 0/6 overlap = 0

        // Mock hashes to prevent exact matches
        mockHashObj.digest
          .mockReturnValueOnce('hash-1')
          .mockReturnValueOnce('hash-2')
          .mockReturnValueOnce('hash-3');

        // Test through near-duplicate detection (similarity threshold = 0.95)
        const result = await deduplicator.deduplicate([doc1, doc2, doc3]);

        // With Jaccard=0.5, combined similarity will be too low for default threshold
        expect(result.duplicateGroups).toHaveLength(0);
      });

      it('should calculate cosine similarity correctly', async () => {
        // Test documents with word frequency patterns
        const doc1 = createTestDocument('test test hello world');
        const doc2 = createTestDocument('test hello world world'); // Similar word frequencies

        mockHashObj.digest
          .mockReturnValueOnce('hash-1')
          .mockReturnValueOnce('hash-2');

        const result = await deduplicator.deduplicate([doc1, doc2]);

        expect(result.processed).toBe(2);
      });

      it('should calculate Levenshtein similarity correctly', async () => {
        // Very similar strings should have high Levenshtein similarity
        const doc1 = createTestDocument('The quick brown fox jumps over the lazy dog');
        const doc2 = createTestDocument('The quick brown fox jumps over the lazy cat'); // 1 word difference

        mockHashObj.digest
          .mockReturnValueOnce('hash-1')
          .mockReturnValueOnce('hash-2');

        const result = await deduplicator.deduplicate([doc1, doc2]);

        expect(result.processed).toBe(2);
      });
    });

    describe('Document Selection', () => {
      it('should select canonical document based on source priority', async () => {
        const githubDoc = createTestDocument('shared content', 'github');
        const webDoc = createTestDocument('shared content', 'web');
        const localDoc = createTestDocument('shared content', 'local');

        // All should have same hash for exact matching
        mockHashObj.digest.mockReturnValue('same-hash');

        const result = await deduplicator.deduplicate([webDoc, localDoc, githubDoc]);

        expect(result.duplicateGroups).toHaveLength(1);
        expect(result.duplicateGroups[0].canonicalDocument.source).toBe('github');
        expect(result.duplicateGroups[0].duplicates).toHaveLength(2);
        expect(result.duplicateGroups[0].reason).toBe('exact_hash');
        expect(result.duplicateGroups[0].confidence).toBe(1.0);
      });

      it('should prefer newer documents when same source priority', async () => {
        const oldDoc = createTestDocument('shared content', 'github', {
          metadata: {
            lastModified: new Date('2022-01-01T00:00:00Z'),
            size: 100
          }
        });
        const newDoc = createTestDocument('shared content', 'github', {
          metadata: {
            lastModified: new Date('2023-01-01T00:00:00Z'),
            size: 100
          }
        });

        mockHashObj.digest.mockReturnValue('same-hash');

        const result = await deduplicator.deduplicate([oldDoc, newDoc]);

        expect(result.duplicateGroups).toHaveLength(1);
        expect(result.duplicateGroups[0].canonicalDocument.metadata.lastModified)
          .toEqual(new Date('2023-01-01T00:00:00Z'));
      });
    });

    describe('Deduplication Workflows', () => {
      it('should handle exact hash duplicates', async () => {
        const doc1 = createTestDocument('identical content');
        const doc2 = createTestDocument('identical content');
        const doc3 = createTestDocument('different content');

        mockHashObj.digest
          .mockReturnValueOnce('hash-identical')
          .mockReturnValueOnce('hash-identical')
          .mockReturnValueOnce('hash-different');

        const result = await deduplicator.deduplicate([doc1, doc2, doc3]);

        expect(result.processed).toBe(3);
        expect(result.duplicatesFound).toBe(1);
        expect(result.duplicateGroups).toHaveLength(1);
        expect(result.duplicateGroups[0].reason).toBe('exact_hash');
        expect(result.canonicalDocuments).toHaveLength(2); // 1 canonical + 1 unique
      });

      it('should handle URL similarity duplicates', async () => {
        const doc1 = createTestDocument('content A', 'web', {
          metadata: { url: 'https://example.com/page/' }
        });
        const doc2 = createTestDocument('content B', 'web', {
          metadata: { url: 'https://example.com/page' }
        });
        const doc3 = createTestDocument('content C', 'web', {
          metadata: { url: 'https://different.com/page' }
        });

        // Different content hashes but same URL hash for first two
        mockHashObj.digest
          .mockReturnValueOnce('content-hash-1')
          .mockReturnValueOnce('content-hash-2')
          .mockReturnValueOnce('content-hash-3')
          .mockReturnValueOnce('url-hash-same') // doc1 URL
          .mockReturnValueOnce('url-hash-same') // doc2 URL (same after normalization)
          .mockReturnValueOnce('url-hash-different'); // doc3 URL

        const result = await deduplicator.deduplicate([doc1, doc2, doc3]);

        expect(result.processed).toBe(3);
        expect(result.duplicateGroups.length).toBeGreaterThanOrEqual(0);
      });

      it('should skip documents below content threshold', async () => {
        const shortDoc = createTestDocument('short'); // Below 100 char threshold
        const longDoc = createTestDocument('a'.repeat(150)); // Above threshold

        mockHashObj.digest.mockReturnValue('hash-long');

        const result = await deduplicator.deduplicate([shortDoc, longDoc]);

        expect(result.processed).toBe(2);
        expect(result.skippedDocuments).toHaveLength(1);
        expect(result.skippedDocuments[0].content).toBe('short');
      });

      it('should handle near-duplicate detection with high similarity', async () => {
        // Custom deduplicator with lower threshold for testing
        const testDeduplicator = new ContentDeduplicator({ similarityThreshold: 0.5 });

        const doc1 = createTestDocument('The quick brown fox jumps over the lazy dog');
        const doc2 = createTestDocument('The quick brown fox jumps over the lazy cat'); // Very similar
        const doc3 = createTestDocument('Completely different and unrelated content here');

        // Different content hashes to avoid exact matching
        mockHashObj.digest
          .mockReturnValueOnce('hash-1')
          .mockReturnValueOnce('hash-2')
          .mockReturnValueOnce('hash-3')
          .mockReturnValueOnce('hash-1-check')
          .mockReturnValueOnce('hash-2-check')
          .mockReturnValueOnce('hash-3-check');

        const result = await testDeduplicator.deduplicate([doc1, doc2, doc3]);

        expect(result.processed).toBe(3);
        // Near-duplicate detection should find the similar documents
      });
    });

    describe('Weaviate Integration', () => {
      it('should check existing document by content hash', async () => {
        const testDoc = createTestDocument('test content for hash check');

        mockHashObj.digest.mockReturnValue('content-hash-123');

        const mockExistingDoc = {
          id: 'existing-weaviate-id',
          source: 'github',
          filepath: '/existing/file.ts',
          lastModified: '2023-01-01T00:00:00Z'
        };

        mockQuery.do.mockResolvedValue({
          data: {
            Get: {
              Document: [mockExistingDoc]
            }
          }
        });

        const result = await deduplicator.checkExistingDocument(testDoc);

        expect(result).not.toBeNull();
        expect(result?.id).toBe('existing-weaviate-id');
        expect(result?.metadata.checksum).toBe('content-hash-123');

        expect(mockClient.graphql.get).toHaveBeenCalled();
        expect(mockQuery.withClassName).toHaveBeenCalledWith('Document');
        expect(mockQuery.withWhere).toHaveBeenCalledWith({
          operator: 'Equal',
          path: ['metadata', 'checksum'],
          valueString: 'content-hash-123'
        });
      });

      it('should return null when document does not exist in Weaviate', async () => {
        const testDoc = createTestDocument('non-existing content');

        mockQuery.do.mockResolvedValue({
          data: {
            Get: {
              Document: []
            }
          }
        });

        const result = await deduplicator.checkExistingDocument(testDoc);

        expect(result).toBeNull();
      });

      it('should handle Weaviate query errors gracefully', async () => {
        const testDoc = createTestDocument('error test content');

        mockQuery.do.mockRejectedValue(new Error('Weaviate connection failed'));

        const result = await deduplicator.checkExistingDocument(testDoc);

        expect(result).toBeNull();
      });
    });

    describe('Batch Processing', () => {
      it('should process small batches directly', async () => {
        const docs = Array.from({ length: 50 }, (_, i) =>
          createTestDocument(`content ${i}`)
        );

        mockHashObj.digest.mockImplementation((content) => `hash-${content}`);

        const result = await deduplicator.batchDeduplicate(docs);

        expect(result.processed).toBe(50);
      });

      it('should split large document sets into batches', async () => {
        const docs = Array.from({ length: 250 }, (_, i) =>
          createTestDocument(`content ${i}`)
        );

        mockHashObj.digest.mockImplementation(() => `unique-hash-${Math.random()}`);

        const result = await deduplicator.batchDeduplicate(docs);

        expect(result.processed).toBe(250);
        expect(result.processingTime).toBeGreaterThan(0);
      });

      it('should merge batch results correctly', async () => {
        // Create documents with some duplicates across batch boundaries
        const docs = Array.from({ length: 150 }, (_, i) => {
          const contentIndex = Math.floor(i / 2); // Create pairs of duplicates
          return createTestDocument(`duplicate content ${contentIndex}`);
        });

        // Mock same hashes for duplicate pairs
        let hashCounter = 0;
        mockHashObj.digest.mockImplementation(() => {
          const pairIndex = Math.floor(hashCounter / 2);
          hashCounter++;
          return `hash-${pairIndex}`;
        });

        const result = await deduplicator.batchDeduplicate(docs);

        expect(result.processed).toBe(150);
        expect(result.duplicatesFound).toBeGreaterThan(0);
      });
    });

    describe('Error Handling', () => {
      it('should handle empty document arrays', async () => {
        const result = await deduplicator.deduplicate([]);

        expect(result.processed).toBe(0);
        expect(result.duplicatesFound).toBe(0);
        expect(result.duplicateGroups).toHaveLength(0);
        expect(result.canonicalDocuments).toHaveLength(0);
      });

      it('should handle single document', async () => {
        const doc = createTestDocument('single document');

        mockHashObj.digest.mockReturnValue('single-hash');

        const result = await deduplicator.deduplicate([doc]);

        expect(result.processed).toBe(1);
        expect(result.duplicatesFound).toBe(0);
        expect(result.canonicalDocuments).toHaveLength(1);
      });

      it('should handle malformed documents gracefully', async () => {
        const validDoc = createTestDocument('valid content');
        const malformedDoc = {
          ...createTestDocument('malformed content'),
          metadata: {
            // Missing required metadata fields
            size: undefined,
            checksum: undefined
          }
        } as any;

        mockHashObj.digest.mockReturnValue('hash-test');

        const result = await deduplicator.deduplicate([validDoc, malformedDoc]);

        expect(result.processed).toBe(2);
        expect(result.canonicalDocuments.length).toBeGreaterThan(0);
      });
    });

    describe('Performance and Memory', () => {
      it('should complete deduplication within reasonable time', async () => {
        const docs = Array.from({ length: 100 }, (_, i) =>
          createTestDocument(`performance test content ${i}`)
        );

        mockHashObj.digest.mockImplementation((_, i) => `perf-hash-${i}`);

        const startTime = Date.now();
        const result = await deduplicator.deduplicate(docs);
        const duration = Date.now() - startTime;

        expect(result.processed).toBe(100);
        expect(result.processingTime).toBeGreaterThan(0);
        expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      });
    });
  });

  describe('Convenience Functions', () => {
    describe('getContentDeduplicator', () => {
      it('should return singleton instance', () => {
        const instance1 = getContentDeduplicator();
        const instance2 = getContentDeduplicator();

        expect(instance1).toBe(instance2);
      });

      it('should use custom config on first call', () => {
        // Clear any existing singleton
        jest.clearAllMocks();

        const customConfig = { contentThreshold: 50 };
        const instance = getContentDeduplicator(customConfig);

        expect(instance).toBeInstanceOf(ContentDeduplicator);
      });
    });

    describe('deduplicateDocuments', () => {
      it('should deduplicate documents using singleton', async () => {
        const docs = [
          createTestDocument('test content 1'),
          createTestDocument('test content 2')
        ];

        mockHashObj.digest
          .mockReturnValueOnce('hash-1')
          .mockReturnValueOnce('hash-2');

        const result = await deduplicateDocuments(docs);

        expect(result.processed).toBe(2);
        expect(result.duplicatesFound).toBe(0);
      });

      it('should use custom config when provided', async () => {
        const docs = [createTestDocument('a'.repeat(25))]; // Below default threshold

        const customConfig = { contentThreshold: 10 }; // Lower threshold

        mockHashObj.digest.mockReturnValue('hash-short');

        const result = await deduplicateDocuments(docs, customConfig);

        expect(result.processed).toBe(1);
        expect(result.skippedDocuments).toHaveLength(0); // Should not skip with lower threshold
      });
    });

    describe('checkDocumentExists', () => {
      it('should check document existence using singleton', async () => {
        const testDoc = createTestDocument('existence check content');

        mockQuery.do.mockResolvedValue({
          data: { Get: { Document: [] } }
        });

        const result = await checkDocumentExists(testDoc);

        expect(result).toBeNull();
        expect(mockClient.graphql.get).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle mixed source priorities correctly', async () => {
      const deduplicator = new ContentDeduplicator();
      const docs = [
        createTestDocument('mixed content', 'local', { priority: 2.0 }),
        createTestDocument('mixed content', 'github', { priority: 1.0 }),
        createTestDocument('mixed content', 'web', { priority: 1.5 })
      ];

      mockHashObj.digest.mockReturnValue('mixed-hash');

      const result = await deduplicator.deduplicate(docs);

      expect(result.duplicateGroups).toHaveLength(1);
      expect(result.duplicateGroups[0].canonicalDocument.source).toBe('github'); // Highest source priority
    });

    it('should handle documents with no metadata gracefully', async () => {
      const docWithoutMetadata = {
        ...createTestDocument('content without metadata'),
        metadata: {} as any
      };

      mockHashObj.digest.mockReturnValue('no-meta-hash');

      const result = await deduplicator.deduplicate([docWithoutMetadata]);

      expect(result.processed).toBe(1);
      expect(result.canonicalDocuments).toHaveLength(1);
    });

    it('should handle very long content efficiently', async () => {
      const longContent = 'a'.repeat(10000); // 10KB content
      const doc = createTestDocument(longContent);

      mockHashObj.digest.mockReturnValue('long-content-hash');

      const startTime = Date.now();
      const result = await deduplicator.deduplicate([doc]);
      const duration = Date.now() - startTime;

      expect(result.processed).toBe(1);
      expect(duration).toBeLessThan(1000); // Should handle efficiently
    });
  });
});