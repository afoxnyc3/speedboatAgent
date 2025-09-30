/**
 * Cached Search Orchestrator Tests
 * Comprehensive test suite for search workflow orchestration with caching
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
  CachedSearchOrchestrator,
  CachedSearchExecutionParams,
  getSearchOrchestrator,
  executeSearchWorkflow,
  createHealthResponse,
  createUnhealthyResponse
} from '../cached-search-orchestrator';
import {
  createQueryId,
  SearchResponse,
  DEFAULT_SEARCH_CONFIG,
  type SearchFilters,
  type Document
} from '../../../types/search';
import type { SourceWeights } from '../../../types/query-classification';
import { classifyQueryWithMetrics } from '../query-classifier';
import { performHybridSearch } from '../hybrid-search';
import {
  generateSearchSuggestions,
  buildSearchMetadata,
  processQuery,
  filterDocumentContent
} from '../search-utils';
import { createTimeoutController, validateQueryConstraints } from '../search-validation';
import { getCacheManager, createCacheContext } from '../../cache/redis-cache';
import { getEmbeddingService, EmbeddingService } from '../../cache/embedding-service';

// Mock all dependencies
const mockRandomUUIDFn = jest.fn();
const mockCreateQueryIdFn = jest.fn();
const mockCreateTimeoutControllerFn = jest.fn();
const mockValidateQueryConstraintsFn = jest.fn();
const mockGetCacheManagerFn = jest.fn();
const mockCreateCacheContextFn = jest.fn();
const mockGetEmbeddingServiceFn = jest.fn();
const mockGenerateSearchSuggestionsFn = jest.fn();
const mockBuildSearchMetadataFn = jest.fn();
const mockProcessQueryFn = jest.fn();
const mockClassifyQueryWithMetricsFn = jest.fn();
const mockPerformHybridSearchFn = jest.fn();
const mockFilterDocumentContentFn = jest.fn();
jest.mock('crypto', () => ({
  randomUUID: mockRandomUUIDFn
}));
jest.mock('../query-classifier', () => ({
  classifyQueryWithMetrics: mockClassifyQueryWithMetricsFn
}));
jest.mock('../hybrid-search', () => ({
  performHybridSearch: mockPerformHybridSearchFn
}));
jest.mock('../search-utils', () => ({
  generateSearchSuggestions: mockGenerateSearchSuggestionsFn,
  buildSearchMetadata: mockBuildSearchMetadataFn,
  processQuery: mockProcessQueryFn,
  filterDocumentContent: mockFilterDocumentContentFn
}));
jest.mock('../search-validation', () => ({
  createTimeoutController: mockCreateTimeoutControllerFn,
  validateQueryConstraints: mockValidateQueryConstraintsFn
}));
jest.mock('../../cache/redis-cache', () => ({
  getCacheManager: mockGetCacheManagerFn,
  createCacheContext: mockCreateCacheContextFn
}));
jest.mock('../../cache/embedding-service', () => ({
  getEmbeddingService: mockGetEmbeddingServiceFn
}));
jest.mock('../../../types/search', () => ({
  ...jest.requireActual('../../../types/search'),
  createQueryId: mockCreateQueryIdFn
}));

const mockRandomUUID = mockRandomUUIDFn;
const mockCreateQueryId = mockCreateQueryIdFn;
const mockClassifyQueryWithMetrics = mockClassifyQueryWithMetricsFn;
const mockPerformHybridSearch = mockPerformHybridSearchFn;
const mockGenerateSearchSuggestions = mockGenerateSearchSuggestionsFn;
const mockBuildSearchMetadata = mockBuildSearchMetadataFn;
const mockProcessQuery = mockProcessQueryFn;
const mockFilterDocumentContent = mockFilterDocumentContentFn;
const mockCreateTimeoutController = mockCreateTimeoutControllerFn;
const mockValidateQueryConstraints = mockValidateQueryConstraintsFn;
const mockGetCacheManager = mockGetCacheManagerFn;
const mockCreateCacheContext = mockCreateCacheContextFn;
const mockGetEmbeddingService = mockGetEmbeddingServiceFn;

// Prevent any real embedding service calls
beforeAll(() => {
  jest.spyOn(EmbeddingService.prototype, 'generateEmbedding')
    .mockResolvedValue({
      embedding: new Array(1024).fill(0.01),
      cached: false,
      model: 'text-embedding-3-large',
      dimensions: 1024,
      responseTime: 10
    });
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Cached Search Orchestrator', () => {
  let orchestrator: CachedSearchOrchestrator;
  let mockCacheManager: any;
  let mockEmbeddingService: any;
  let mockTimeoutController: any;

  // Helper function to create test documents
  const createTestDocument = (content: string, source: string = 'github'): Document => ({
    id: `doc-${Math.random().toString(36).substr(2, 9)}`,
    content,
    source: source as any,
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
      lastModified: new Date('2023-01-01T00:00:00Z')
    }
  });

  // Default test parameters
  const defaultParams: CachedSearchExecutionParams = {
    query: 'test search query',
    limit: 10,
    offset: 0,
    includeContent: true,
    includeEmbedding: false,
    timeout: 5000,
    sessionId: 'test-session-123',
    userId: 'test-user-456'
  };

  beforeEach(() => {
    // Mock UUID generation
    mockRandomUUID.mockReturnValue('test-uuid-123');
    mockCreateQueryId.mockReturnValue('query-id-123' as any);

    // Mock timeout controller
    mockTimeoutController = {
      cleanup: jest.fn()
    };
    mockCreateTimeoutController.mockReturnValue(mockTimeoutController);

    // Mock cache manager with comprehensive interface
    mockCacheManager = {
      isAvailable: jest.fn().mockReturnValue(true),
      getSearchResults: jest.fn().mockResolvedValue(null),
      setSearchResults: jest.fn().mockResolvedValue(true),
      getEmbedding: jest.fn().mockResolvedValue(null),
      setEmbedding: jest.fn().mockResolvedValue(true),
      getClassification: jest.fn().mockResolvedValue(null),
      setClassification: jest.fn().mockResolvedValue(true),
      clearAll: jest.fn().mockResolvedValue(true),
      getCacheHealth: jest.fn().mockReturnValue({
        overall: { hitRate: 0.75, totalRequests: 100 },
        byType: {
          embedding: { hits: 75, misses: 25, totalRequests: 100, hitRate: 0.75 },
          searchResults: { hits: 50, misses: 50, totalRequests: 100, hitRate: 0.5 }
        },
        recommendations: ['Cache performance is optimal']
      }),
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, latency: 10 }),
      getCacheSize: jest.fn().mockResolvedValue({
        embedding: 1000,
        searchResults: 500,
        classification: 200
      })
    };
    mockGetCacheManager.mockReturnValue(mockCacheManager);

    // Mock embedding service
    mockEmbeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue({
        embedding: new Array(1024).fill(0.01),
        cached: false,
        model: 'text-embedding-3-large',
        dimensions: 1024,
        responseTime: 10
      }),
      getCacheStats: jest.fn().mockReturnValue({ hits: 10, misses: 5 }),
      isCacheAvailable: jest.fn().mockReturnValue(true)
    };
    mockGetEmbeddingService.mockReturnValue(mockEmbeddingService);

    // Mock cache context
    mockCreateCacheContext.mockReturnValue({
      sessionId: 'test-session-123',
      userId: 'test-user-456'
    });

    // Mock search utilities
    mockProcessQuery.mockReturnValue({ processed: 'test query' } as any);
    mockGenerateSearchSuggestions.mockReturnValue(['suggestion 1', 'suggestion 2']);
    mockFilterDocumentContent.mockImplementation((docs) => docs);
    mockBuildSearchMetadata.mockReturnValue({
      queryId: 'query-id-123',
      searchTime: 100,
      totalResults: 2
    } as any);

    // Mock query validation (should not throw)
    mockValidateQueryConstraints.mockImplementation(() => {});

    // Default mocks for external dependencies (tests override as needed)
    mockPerformHybridSearch.mockResolvedValue({
      documents: [],
      totalResults: 0,
      searchTime: 0
    });

    mockClassifyQueryWithMetrics.mockResolvedValue({
      classification: {
        type: 'operational',
        weights: { github: 1.0, web: 1.0 }
      },
      metrics: { cacheHit: false }
    });

    // Ensure mocks return correct values before creating orchestrator
    mockGetCacheManager.mockReturnValue(mockCacheManager);
    mockGetEmbeddingService.mockReturnValue(mockEmbeddingService);

    // Create orchestrator instance
    orchestrator = new CachedSearchOrchestrator();
  });

  afterEach(() => {
    // Don't restore mocks - they're set up per test
    // jest.restoreAllMocks();
  });

  describe('CachedSearchOrchestrator Class', () => {
    describe('search method', () => {
      it('should return cached results when available and not forced fresh', async () => {
        // Arrange
        const cachedResults = {
          documents: [createTestDocument('cached content')],
          metadata: { queryId: 'cached-query-123', searchTime: 50 }
        };

        // Configure cache to return specific results for this test
        (mockCacheManager.getSearchResults as jest.Mock).mockResolvedValueOnce(cachedResults);

        // Act
        const result = await orchestrator.search(defaultParams);

        // Assert
        expect(result.success).toBe(true);
        expect(mockCacheManager.getSearchResults).toHaveBeenCalled(); // Verify cache was checked
        expect(mockPerformHybridSearch).not.toHaveBeenCalled(); // Should use cache, not search
        expect(result.results).toEqual(cachedResults.documents);
        expect(result.metadata.cacheHit).toBe(true);
        expect(mockTimeoutController.cleanup).toHaveBeenCalled();
      });

      it('should bypass cache when forceFresh is true', async () => {
        // Arrange
        mockCacheManager.getSearchResults.mockResolvedValue({
          documents: [createTestDocument('cached content')],
          metadata: {}
        });

        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 0.5 } },
          metrics: { cacheHit: false }
        });

        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });

        mockPerformHybridSearch.mockResolvedValue({
          documents: [createTestDocument('fresh content')],
          searchTime: 200,
          totalResults: 1
        });

        const params = { ...defaultParams, forceFresh: true };

        // Act
        const result = await orchestrator.search(params);

        // Assert
        expect(result.success).toBe(true);
        expect(mockCacheManager.getSearchResults).not.toHaveBeenCalled();
        expect(mockClassifyQueryWithMetrics).toHaveBeenCalled();
        expect(mockPerformHybridSearch).toHaveBeenCalled();
      });

      it('should execute full search workflow when cache miss', async () => {
        // Arrange
        mockCacheManager.getSearchResults.mockResolvedValue(null);

        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.2, web: 0.8 } },
          metrics: { cacheHit: false, processingTime: 150 }
        });

        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });

        const searchDocs = [
          createTestDocument('search result 1'),
          createTestDocument('search result 2')
        ];

        mockPerformHybridSearch.mockResolvedValue({
          documents: searchDocs,
          searchTime: 300,
          totalResults: 2
        });

        // Act
        const result = await orchestrator.search(defaultParams);

        // Assert
        expect(result.success).toBe(true);
        expect(result.results).toEqual(searchDocs);
        expect(mockClassifyQueryWithMetrics).toHaveBeenCalledWith(
          defaultParams.query,
          { timeout: expect.any(Number) }
        );
        expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
          defaultParams.query,
          expect.objectContaining({
            sessionId: defaultParams.sessionId,
            userId: defaultParams.userId
          })
        );
        expect(mockPerformHybridSearch).toHaveBeenCalledWith({
          query: defaultParams.query,
          config: DEFAULT_SEARCH_CONFIG,
          sourceWeights: { github: 1.2, web: 0.8 },
          limit: defaultParams.limit,
          offset: defaultParams.offset
        });
      });

      it('should cache search results after successful execution', async () => {
        // Arrange
        mockCacheManager.getSearchResults.mockResolvedValue(null);
        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });

        const searchDocs = [createTestDocument('cacheable result')];
        mockPerformHybridSearch.mockResolvedValue({
          documents: searchDocs,
          searchTime: 200,
          totalResults: 1
        });

        // Act
        await orchestrator.search(defaultParams);

        // Assert
        expect(mockCacheManager.setSearchResults).toHaveBeenCalledWith(
          defaultParams.query,
          searchDocs,
          expect.any(Object),
          expect.any(Object)
        );
      });

      it('should not cache results when no documents found', async () => {
        // Arrange
        mockCacheManager.getSearchResults.mockResolvedValue(null);
        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });

        mockPerformHybridSearch.mockResolvedValue({
          documents: [], // No results
          searchTime: 100,
          totalResults: 0
        });

        // Act
        await orchestrator.search(defaultParams);

        // Assert
        expect(mockCacheManager.setSearchResults).not.toHaveBeenCalled();
      });

      it('should use custom source weights when provided', async () => {
        // Arrange
        mockCacheManager.getSearchResults.mockResolvedValue(null);
        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });
        mockPerformHybridSearch.mockResolvedValue({
          documents: [createTestDocument('result')],
          searchTime: 100,
          totalResults: 1
        });

        const customWeights: SourceWeights = { github: 2.0, web: 0.3 };
        const params = { ...defaultParams, weights: customWeights };

        // Act
        await orchestrator.search(params);

        // Assert
        expect(mockPerformHybridSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceWeights: customWeights
          })
        );
      });

      it('should handle timeout and cleanup properly', async () => {
        // Arrange
        mockCacheManager.getSearchResults.mockResolvedValue(null);
        mockClassifyQueryWithMetrics.mockRejectedValue(new Error('Query timeout'));

        const params = { ...defaultParams, timeout: 1000 };

        // Act & Assert
        await expect(orchestrator.search(params)).rejects.toThrow('Query timeout');
        expect(mockCreateTimeoutController).toHaveBeenCalledWith(1000);
        expect(mockTimeoutController.cleanup).toHaveBeenCalled();
      });

      it('should handle cache unavailability gracefully', async () => {
        // Arrange
        mockCacheManager.isAvailable.mockReturnValue(false);
        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });
        mockPerformHybridSearch.mockResolvedValue({
          documents: [createTestDocument('no cache result')],
          searchTime: 150,
          totalResults: 1
        });

        // Act
        const result = await orchestrator.search(defaultParams);

        // Assert
        expect(result.success).toBe(true);
        expect(mockCacheManager.getSearchResults).not.toHaveBeenCalled();
        expect(mockCacheManager.setSearchResults).not.toHaveBeenCalled();
      });

      it('should validate query constraints', async () => {
        // Arrange
        mockValidateQueryConstraints.mockImplementation(() => {
          throw new Error('Query too long');
        });

        // Act & Assert
        await expect(orchestrator.search(defaultParams)).rejects.toThrow('Query too long');
        expect(mockValidateQueryConstraints).toHaveBeenCalledWith(defaultParams.query);
      });
    });

    describe('warmCache method', () => {
      it('should warm cache with provided queries', async () => {
        // Arrange
        const queries = [
          { query: 'warm query 1', sessionId: 'session-1' },
          { query: 'warm query 2', userId: 'user-1' },
          { query: 'warm query 3' }
        ];

        mockCacheManager.getSearchResults.mockResolvedValue(null); // Not cached
        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });
        mockPerformHybridSearch.mockResolvedValue({
          documents: [createTestDocument('warm result')],
          searchTime: 100,
          totalResults: 1
        });

        // Act
        const result = await orchestrator.warmCache(queries);

        // Assert
        expect(result.success).toBe(3);
        expect(result.failed).toBe(0);
        expect(result.alreadyCached).toBe(0);
        expect(mockCacheManager.getSearchResults).toHaveBeenCalledTimes(3);
      });

      it('should skip already cached queries', async () => {
        // Arrange
        const queries = [
          { query: 'cached query 1' },
          { query: 'new query 2' }
        ];

        mockCacheManager.getSearchResults
          .mockResolvedValueOnce({ documents: [createTestDocument('cached')] }) // Already cached
          .mockResolvedValueOnce(null); // Not cached

        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });
        mockPerformHybridSearch.mockResolvedValue({
          documents: [createTestDocument('new result')],
          searchTime: 100,
          totalResults: 1
        });

        // Act
        const result = await orchestrator.warmCache(queries);

        // Assert
        expect(result.success).toBe(1);
        expect(result.failed).toBe(0);
        expect(result.alreadyCached).toBe(1);
      });

      it('should handle warming failures gracefully', async () => {
        // Arrange
        const queries = [
          { query: 'failing query' },
          { query: 'success query' }
        ];

        mockCacheManager.getSearchResults.mockResolvedValue(null);
        mockClassifyQueryWithMetrics
          .mockRejectedValueOnce(new Error('Classification failed'))
          .mockResolvedValueOnce({
            classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
            metrics: { cacheHit: false }
          });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        const result = await orchestrator.warmCache(queries);

        // Assert
        expect(result.success).toBe(0); // Second query won't complete due to first failure
        expect(result.failed).toBe(1);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('getCacheStats method', () => {
      it('should return cache health statistics', () => {
        const mockStats = {
          overall: { hitRate: 0.75, totalRequests: 100 },
          byType: {
            embedding: { hits: 75, misses: 25, totalRequests: 100, hitRate: 0.75 },
            searchResults: { hits: 50, misses: 50, totalRequests: 100, hitRate: 0.5 }
          },
          recommendations: ['Cache performance is optimal']
        };
        mockCacheManager.getCacheHealth.mockReturnValue(mockStats);

        const result = orchestrator.getCacheStats();

        expect(result).toEqual(expect.objectContaining({
          overall: expect.objectContaining({
            hitRate: expect.any(Number),
            totalRequests: expect.any(Number),
          }),
          byType: expect.any(Object),
          recommendations: expect.any(Array)
        }));
        expect(mockCacheManager.getCacheHealth).toHaveBeenCalled();
      });
    });

    describe('clearAllCaches method', () => {
      it('should clear all caches successfully', async () => {
        mockCacheManager.clearAll.mockResolvedValue(true);

        const result = await orchestrator.clearAllCaches();

        expect(result).toBe(true);
        expect(mockCacheManager.clearAll).toHaveBeenCalled();
      });

      it('should handle cache clearing failure', async () => {
        mockCacheManager.clearAll.mockResolvedValue(false);

        const result = await orchestrator.clearAllCaches();

        expect(result).toBe(false);
      });
    });

    describe('healthCheck method', () => {
      it('should return comprehensive health information', async () => {
        const mockCacheHealth = { healthy: true, latency: 15 };
        const mockEmbeddingStats = { hits: 100, misses: 20 };

        mockCacheManager.healthCheck.mockResolvedValue(mockCacheHealth);
        mockEmbeddingService.getCacheStats.mockReturnValue(mockEmbeddingStats);
        mockEmbeddingService.isCacheAvailable.mockReturnValue(true);

        const result = await orchestrator.healthCheck();

        expect(result).toEqual(expect.objectContaining({
          search: expect.objectContaining({ healthy: expect.any(Boolean) }),
          cache: expect.objectContaining({
            healthy: expect.any(Boolean),
            latency: expect.any(Number)
          }),
          embedding: expect.objectContaining({
            cacheAvailable: expect.any(Boolean),
            stats: expect.any(Object)
          })
        }));
      });

      it('should handle cache health check failure', async () => {
        const mockError = { healthy: false, error: 'Redis connection failed' };
        mockCacheManager.healthCheck.mockResolvedValue(mockError);

        const result = await orchestrator.healthCheck();

        expect(result.search.healthy).toBe(true);
        expect(result.cache).toEqual(mockError);
      });
    });
  });

  describe('Singleton Management', () => {
    describe('getSearchOrchestrator', () => {
      it('should return singleton instance', () => {
        const instance1 = getSearchOrchestrator();
        const instance2 = getSearchOrchestrator();

        expect(instance1).toBe(instance2);
        expect(instance1).toBeInstanceOf(CachedSearchOrchestrator);
      });
    });
  });

  describe('Legacy Interface', () => {
    describe('executeSearchWorkflow', () => {
      it('should execute search using singleton orchestrator', async () => {
        // Arrange
        mockCacheManager.getSearchResults.mockResolvedValue(null);
        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });
        mockPerformHybridSearch.mockResolvedValue({
          documents: [createTestDocument('legacy result')],
          searchTime: 100,
          totalResults: 1
        });

        const legacyParams = {
          query: 'legacy search',
          limit: 5,
          offset: 0,
          includeContent: true,
          includeEmbedding: false,
          timeout: 3000
        };

        // Act
        const result = await executeSearchWorkflow(legacyParams);

        // Assert
        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
      });

      it('should use default values for session parameters', async () => {
        // This test verifies that the legacy interface properly maps parameters
        mockCacheManager.getSearchResults.mockResolvedValue(null);
        mockClassifyQueryWithMetrics.mockResolvedValue({
          classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
          metrics: { cacheHit: false }
        });
        mockEmbeddingService.generateEmbedding.mockResolvedValue({
          embedding: [0.1, 0.2, 0.3],
          cached: false,
          model: 'text-embedding-3-large',
          dimensions: 1024,
          responseTime: 10
        });
        mockPerformHybridSearch.mockResolvedValue({
          documents: [],
          searchTime: 50,
          totalResults: 0
        });

        const legacyParams = {
          query: 'test',
          limit: 10,
          offset: 0,
          includeContent: true,
          includeEmbedding: false,
          timeout: 5000
        };

        await executeSearchWorkflow(legacyParams);

        // Verify that embedding service is called with undefined session parameters
        expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
          'test',
          expect.objectContaining({
            sessionId: undefined,
            userId: undefined,
            context: undefined,
            forceFresh: false
          })
        );
      });
    });
  });

  describe('Health Response Utilities', () => {
    describe('createHealthResponse', () => {
      it('should create healthy response with capabilities', () => {
        mockCacheManager.isAvailable.mockReturnValue(true);

        const response = createHealthResponse();

        expect(response).toEqual({
          status: 'healthy',
          version: '1.0.0',
          capabilities: [
            'hybrid_search',
            'query_classification',
            'source_weighting',
            'result_caching',
            'embedding_caching',
            'contextual_caching',
            'cache_warming'
          ],
          limits: {
            maxQueryLength: 1000,
            maxResults: 100,
            timeout: 30000
          },
          cache: {
            enabled: true,
            types: ['embeddings', 'classifications', 'searchResults', 'contextualQueries']
          }
        });
      });

      it('should indicate cache disabled when unavailable', () => {
        mockCacheManager.isAvailable.mockReturnValue(false);

        const response = createHealthResponse();

        expect(response.cache).toEqual({
          enabled: false,
          types: ['embeddings', 'classifications', 'searchResults', 'contextualQueries']
        });
      });
    });

    describe('createUnhealthyResponse', () => {
      it('should create unhealthy response from Error', () => {
        const error = new Error('System failure');

        const response = createUnhealthyResponse(error);

        expect(response.status).toBe('unhealthy');
        expect(response.error).toBe('System failure');
        expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should handle unknown error types', () => {
        const error = { message: 'Unknown error type' };

        const response = createUnhealthyResponse(error);

        expect(response.status).toBe('unhealthy');
        expect(response.error).toBe('Unknown error');
        expect(response.timestamp).toBeDefined();
      });

      it('should handle string errors', () => {
        const error = 'String error message';

        const response = createUnhealthyResponse(error);

        expect(response.status).toBe('unhealthy');
        expect(response.error).toBe('Unknown error');
      });
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle complete search workflow with all features', async () => {
      // Arrange - Complex scenario with all features enabled
      mockCacheManager.getSearchResults.mockResolvedValue(null);
      mockClassifyQueryWithMetrics.mockResolvedValue({
        classification: { type: 'business', weights: { github: 0.8, web: 1.2 } },
        metrics: { cacheHit: false, processingTime: 200 }
      });
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        cached: true,
        cacheKey: 'embedding-cache-key'
      });

      const searchResults = [
        createTestDocument('comprehensive result 1', 'github'),
        createTestDocument('comprehensive result 2', 'web')
      ];

      mockPerformHybridSearch.mockResolvedValue({
        documents: searchResults,
        searchTime: 450,
        totalResults: 2
      });

      const complexParams: CachedSearchExecutionParams = {
        query: 'complex business query with filters',
        limit: 20,
        offset: 10,
        weights: { github: 0.9, web: 1.1 },
        includeContent: true,
        includeEmbedding: true,
        timeout: 10000,
        filters: {
          sources: ['github', 'web'],
          languages: ['typescript', 'javascript'],
          dateRange: {
            start: new Date('2023-01-01'),
            end: new Date('2023-12-31')
          }
        } as SearchFilters,
        config: {
          ...DEFAULT_SEARCH_CONFIG,
          minScore: 0.7
        },
        sessionId: 'complex-session-789',
        userId: 'complex-user-101',
        context: 'business analysis context'
      };

      // Act
      const result = await orchestrator.search(complexParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results).toEqual(searchResults);
      expect(result.metadata.cacheHit).toBe(true); // Embedding was cached
      expect(mockPerformHybridSearch).toHaveBeenCalledWith({
        query: complexParams.query,
        config: complexParams.config,
        sourceWeights: complexParams.weights, // Custom weights should override classification
        limit: complexParams.limit,
        offset: complexParams.offset
      });
    });

    it('should handle search with minimal parameters', async () => {
      const minimalParams: CachedSearchExecutionParams = {
        query: 'minimal search',
        limit: 5,
        offset: 0,
        includeContent: false,
        includeEmbedding: false,
        timeout: 2000
      };

      mockCacheManager.getSearchResults.mockResolvedValue(null);
      mockClassifyQueryWithMetrics.mockResolvedValue({
        classification: { type: 'operational', weights: { github: 1.0, web: 1.0 } },
        metrics: { cacheHit: false }
      });
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2],
        cached: false
      });
      mockPerformHybridSearch.mockResolvedValue({
        documents: [createTestDocument('minimal result')],
        searchTime: 100,
        totalResults: 1
      });

      const result = await orchestrator.search(minimalParams);

      expect(result.success).toBe(true);
      expect(mockCreateCacheContext).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should handle search timeout gracefully', async () => {
      // Arrange
      mockCacheManager.getSearchResults.mockResolvedValue(null);
      mockClassifyQueryWithMetrics.mockImplementation(async () => {
        // Simulate long operation that times out
        await new Promise(resolve => setTimeout(resolve, 6000)); // Longer than timeout
        throw new Error('Should not reach here');
      });

      const timeoutParams = { ...defaultParams, timeout: 1000 };

      // Act & Assert
      await expect(orchestrator.search(timeoutParams)).rejects.toThrow();
      expect(mockTimeoutController.cleanup).toHaveBeenCalled();
    });

    it('should handle memory pressure during large result processing', async () => {
      // Arrange - Large number of documents
      const largeResultSet = Array.from({ length: 1000 }, (_, i) =>
        createTestDocument(`large result ${i}`, i % 2 === 0 ? 'github' : 'web')
      );

      mockCacheManager.getSearchResults.mockResolvedValue(null);
      mockClassifyQueryWithMetrics.mockResolvedValue({
        classification: { type: 'technical', weights: { github: 1.0, web: 1.0 } },
        metrics: { cacheHit: false }
      });
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: new Array(1024).fill(0).map(() => Math.random()),
        cached: false
      });
      mockPerformHybridSearch.mockResolvedValue({
        documents: largeResultSet,
        searchTime: 2000,
        totalResults: 1000
      });

      const largeParams = { ...defaultParams, limit: 1000 };

      // Act
      const result = await orchestrator.search(largeParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1000);
      expect(mockCacheManager.setSearchResults).toHaveBeenCalled();
    });
  });
});