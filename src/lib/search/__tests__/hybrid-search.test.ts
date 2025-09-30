/**
 * Hybrid Search Tests
 * Comprehensive test suite for hybrid search functionality
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies at module level BEFORE any other imports
const mockCreateWeaviateClientFn = jest.fn();

// Mock Weaviate client and GraphQL
jest.mock('weaviate-ts-client'); // Uses __mocks__/weaviate-ts-client.ts automatically
jest.mock('graphql-request');
jest.mock('crypto'); // Uses __mocks__/crypto.ts automatically
jest.mock('../search-utils'); // Uses src/lib/search/__mocks__/search-utils.ts automatically
jest.mock('../../weaviate/client', () => ({
  createWeaviateClient: mockCreateWeaviateClientFn
}));

// Import after mocks are set up
import {
  performHybridSearch,
  testWeaviateConnection,
  type HybridSearchParams,
  type HybridSearchResult
} from '../hybrid-search';
import { DEFAULT_SEARCH_CONFIG, DocumentSource, DocumentLanguage } from '../../../types/search';
// Import the GLOBAL mocks
import { mockQuery, mockClient } from 'weaviate-ts-client';
// For search-utils, import from the __mocks__ folder
import * as searchUtilsMock from '../__mocks__/search-utils';
// For crypto (node module), Jest will use __mocks__/crypto.ts at project root
import * as cryptoMock from 'crypto';

const mockCreateWeaviateClient = mockCreateWeaviateClientFn;
const mockCreateDocumentHash = searchUtilsMock.createDocumentHash;
const mockRandomUUID = cryptoMock.randomUUID;

describe('HybridSearch', () => {
  // Use the global mockClient and mockQuery exported from __mocks__/weaviate-ts-client.ts
  // NO longer declare as let - they are imported constants

  // Define default params at the top level so all tests can access it
  const defaultParams: HybridSearchParams = {
    query: 'test query',
    config: DEFAULT_SEARCH_CONFIG,
    sourceWeights: { github: 1.2, web: 0.8 },
    limit: 10,
    offset: 0
  };

  beforeEach(() => {
    // Reset mock call counts but preserve mock implementations
    jest.clearAllMocks();

    // Reset the GLOBAL mockQuery.do to return empty by default
    (mockQuery.do as jest.Mock).mockResolvedValue({ data: { Get: { Document: [] } } });

    // Mock createWeaviateClient to return the GLOBAL mockClient
    mockCreateWeaviateClient.mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performHybridSearch', () => {

    it('should perform successful hybrid search with results', async () => {
      // Arrange
      const mockResults = {
        data: {
          Get: {
            Document: [
              {
                content: 'Test content for GitHub source',
                source: 'github' as DocumentSource,
                filepath: '/test/file.ts',
                url: 'https://github.com/test/repo/file.ts',
                language: 'typescript' as DocumentLanguage,
                priority: 1.0,
                lastModified: '2023-01-01T00:00:00Z',
                isCode: true,
                isDocumentation: false,
                fileType: 'typescript',
                size: 1024,
                _additional: {
                  score: 0.95,
                  id: 'weaviate-id-1'
                }
              },
              {
                content: 'Test content for web source',
                source: 'web' as DocumentSource,
                filepath: '/docs/guide.md',
                url: 'https://example.com/docs/guide',
                language: 'markdown' as DocumentLanguage,
                priority: 0.8,
                lastModified: '2023-01-02T00:00:00Z',
                isCode: false,
                isDocumentation: true,
                fileType: 'markdown',
                size: 512,
                _additional: {
                  score: 0.85,
                  id: 'weaviate-id-2'
                }
              }
            ]
          }
        }
      };

      mockQuery.do.mockResolvedValue(mockResults);

      // Act
      const result = await performHybridSearch(defaultParams);

      // Assert
      expect(result.documents).toHaveLength(2);
      expect(result.totalResults).toBe(2);
      expect(result.searchTime).toBeGreaterThanOrEqual(0); // Can be 0 in test environment

      // Verify first document (GitHub source with higher weight)
      const firstDoc = result.documents[0];
      expect(firstDoc.content).toBe('Test content for GitHub source');
      expect(firstDoc.source).toBe('github');
      expect(firstDoc.score).toBe(Math.min(0.95 * 1.2 * 1.0, 1.0)); // baseScore * sourceWeight * priority
      expect(firstDoc.metadata.size).toBe(1024);
      expect(firstDoc.metadata.checksum).toBeTruthy(); // Real hash function is being used (mock not working)

      // Verify second document (web source with lower weight)
      const secondDoc = result.documents[1];
      expect(secondDoc.content).toBe('Test content for web source');
      expect(secondDoc.source).toBe('web');
      expect(secondDoc.score).toBe(Math.min(0.85 * 0.8 * 0.8, 1.0)); // baseScore * sourceWeight * priority
    });

    it('should handle empty results gracefully', async () => {
      // Arrange
      mockQuery.do.mockResolvedValue({ data: { Get: { Document: null } } });

      // Act
      const result = await performHybridSearch(defaultParams);

      // Assert
      expect(result.documents).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.searchTime).toBeGreaterThanOrEqual(0); // Can be 0 in tests
    });

    it('should handle missing data gracefully', async () => {
      // Arrange
      mockQuery.do.mockResolvedValue({});

      // Act
      const result = await performHybridSearch(defaultParams);

      // Assert
      expect(result.documents).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.searchTime).toBeGreaterThanOrEqual(0); // Can be 0 in tests
    });

    it('should filter documents below minimum score', async () => {
      // Arrange
      const mockResults = {
        data: {
          Get: {
            Document: [
              {
                content: 'High score document',
                source: 'github' as DocumentSource,
                filepath: '/high-score.ts',
                priority: 1.0,
                _additional: {
                  score: 0.9,
                  id: 'high-score-id'
                }
              },
              {
                content: 'Low score document',
                source: 'github' as DocumentSource,
                filepath: '/low-score.ts',
                priority: 1.0,
                _additional: {
                  score: 0.1, // Below minScore threshold
                  id: 'low-score-id'
                }
              }
            ]
          }
        }
      };

      mockQuery.do.mockResolvedValue(mockResults);

      // Act
      const result = await performHybridSearch({
        ...defaultParams,
        config: {
          ...DEFAULT_SEARCH_CONFIG,
          minScore: 0.3 // Set minimum score threshold
        }
      });

      // Assert - Only high score document should be returned
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].content).toBe('High score document');
    });

    it('should sort documents by score in descending order', async () => {
      // Arrange
      const mockResults = {
        data: {
          Get: {
            Document: [
              {
                content: 'Medium score document',
                source: 'github' as DocumentSource,
                priority: 1.0,
                _additional: { score: 0.7, id: 'medium' }
              },
              {
                content: 'High score document',
                source: 'github' as DocumentSource,
                priority: 1.0,
                _additional: { score: 0.9, id: 'high' }
              },
              {
                content: 'Low score document',
                source: 'github' as DocumentSource,
                priority: 1.0,
                _additional: { score: 0.5, id: 'low' }
              }
            ]
          }
        }
      };

      mockQuery.do.mockResolvedValue(mockResults);

      // Act
      const result = await performHybridSearch(defaultParams);

      // Assert - Documents should be sorted by score (high to low)
      expect(result.documents).toHaveLength(3);
      expect(result.documents[0].content).toBe('High score document');
      expect(result.documents[1].content).toBe('Medium score document');
      expect(result.documents[2].content).toBe('Low score document');
    });

    it('should apply source weights correctly', async () => {
      // Arrange
      const mockResults = {
        data: {
          Get: {
            Document: [
              {
                content: 'GitHub document',
                source: 'github' as DocumentSource,
                priority: 1.0,
                _additional: { score: 0.8, id: 'github-doc' }
              },
              {
                content: 'Web document',
                source: 'web' as DocumentSource,
                priority: 1.0,
                _additional: { score: 0.8, id: 'web-doc' }
              }
            ]
          }
        }
      };

      mockQuery.do.mockResolvedValue(mockResults);

      // Act
      const result = await performHybridSearch({
        ...defaultParams,
        sourceWeights: { github: 1.5, web: 0.5 }
      });

      // Assert
      expect(result.documents[0].content).toBe('GitHub document'); // Higher weight should rank first
      expect(result.documents[0].score).toBe(Math.min(0.8 * 1.5 * 1.0, 1.0));
      expect(result.documents[1].content).toBe('Web document');
      expect(result.documents[1].score).toBe(0.8 * 0.5 * 1.0);
    });

    it('should handle missing optional fields gracefully', async () => {
      // Arrange
      const mockResults = {
        data: {
          Get: {
            Document: [
              {
                // Minimal document with missing optional fields
                content: 'Minimal document',
                _additional: { id: 'minimal-doc' }
                // Missing: source, filepath, priority, score, etc.
              }
            ]
          }
        }
      };

      mockQuery.do.mockResolvedValue(mockResults);

      // Act - Use config with minScore=0 to allow document with score 0
      const result = await performHybridSearch({
        ...defaultParams,
        config: {
          ...DEFAULT_SEARCH_CONFIG,
          minScore: 0 // Allow documents with score 0
        }
      });

      // Assert
      expect(result.documents).toHaveLength(1);
      const doc = result.documents[0];
      expect(doc.source).toBe('local'); // Default source
      expect(doc.filepath).toBe(''); // Default filepath
      expect(doc.priority).toBe(1.0); // Default priority
      expect(doc.language).toBe('other'); // Default language
      expect(doc.score).toBe(0); // Default score (0 * weight * priority)
    });

    it('should configure Weaviate query correctly', async () => {
      // Arrange
      mockQuery.do.mockResolvedValue({ data: { Get: { Document: [] } } });

      // Act
      await performHybridSearch({
        query: 'search term',
        config: DEFAULT_SEARCH_CONFIG,
        sourceWeights: { github: 1.2, web: 0.8 },
        limit: 20,
        offset: 10
      });

      // Assert query builder calls
      expect(mockClient.graphql.get).toHaveBeenCalled();
      expect(mockQuery.withClassName).toHaveBeenCalledWith('Document');
      expect(mockQuery.withFields).toHaveBeenCalledWith(
        'content source filepath url language priority lastModified isCode isDocumentation fileType size _additional { score id }'
      );
      expect(mockQuery.withHybrid).toHaveBeenCalledWith({
        query: 'search term',
        alpha: DEFAULT_SEARCH_CONFIG.hybridWeights.vector,
        properties: ['content', 'filepath'],
        fusionType: 'relativeScoreFusion'
      });
      expect(mockQuery.withLimit).toHaveBeenCalledWith(30); // limit + offset
      expect(mockQuery.withOffset).toHaveBeenCalledWith(10);
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      mockQuery.do.mockRejectedValue(new Error('Network timeout'));

      // Act & Assert
      await expect(performHybridSearch(defaultParams)).rejects.toThrow('Network timeout');
    });
  });

  describe('testWeaviateConnection', () => {
    it('should test connection successfully', async () => {
      // Arrange
      const mockMetaResult = { version: '1.0.0' };
      mockClient.misc.metaGetter().do.mockResolvedValue(mockMetaResult);

      // Act & Assert - Should not throw
      await expect(testWeaviateConnection()).resolves.toBeUndefined();
      expect(mockClient.misc.metaGetter).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      // Arrange
      mockClient.misc.metaGetter().do.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(testWeaviateConnection()).rejects.toThrow('Connection failed');
    });
  });

  describe('Document Processing', () => {
    it('should create proper document metadata', async () => {
      // Arrange
      const mockResults = {
        data: {
          Get: {
            Document: [
              {
                content: 'Test content with multiple lines\nLine 2\nLine 3',
                source: 'github' as DocumentSource,
                filepath: '/test/multiline.ts',
                size: 2048,
                lastModified: '2023-06-15T10:30:00Z',
                _additional: { score: 0.8, id: 'multiline-doc' }
              }
            ]
          }
        }
      };

      mockQuery.do.mockResolvedValue(mockResults);

      // Act
      const result = await performHybridSearch(defaultParams);

      // Assert
      const doc = result.documents[0];
      expect(doc.metadata.size).toBe(2048);
      expect(doc.metadata.wordCount).toBe(9); // "Test content with multiple lines Line 2 Line 3"
      expect(doc.metadata.lines).toBe(3);
      expect(doc.metadata.encoding).toBe('utf-8');
      expect(doc.metadata.mimeType).toBe('text/plain');
      expect(doc.metadata.lastModified).toEqual(new Date('2023-06-15T10:30:00Z'));
      expect(doc.metadata.checksum).toBeTruthy(); // Real hash function is being used
    });

    it('should cap final score at 1.0', async () => {
      // Arrange - Create scenario where weighted score would exceed 1.0
      const mockResults = {
        data: {
          Get: {
            Document: [
              {
                content: 'High priority document',
                source: 'github' as DocumentSource,
                priority: 2.0, // High priority
                _additional: {
                  score: 0.9, // High base score
                  id: 'high-priority-doc'
                }
              }
            ]
          }
        }
      };

      mockQuery.do.mockResolvedValue(mockResults);

      // Act
      const result = await performHybridSearch({
        ...defaultParams,
        sourceWeights: { github: 2.0, web: 0.5 } // High GitHub weight
      });

      // Assert - Score should be capped at 1.0 despite calculation being > 1.0
      expect(result.documents[0].score).toBe(1.0);
      // Note: 0.9 * 2.0 * 2.0 = 3.6, but should be capped at 1.0
    });
  });
});