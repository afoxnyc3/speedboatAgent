/**
 * Search Orchestrator Tests
 * Comprehensive test suite for search workflow coordination
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Create mock functions BEFORE jest.mock() calls
const mockRandomUUIDFn = jest.fn();
const mockClassifyQueryWithMetricsFn = jest.fn();
const mockPerformHybridSearchFn = jest.fn();
const mockGenerateSearchSuggestionsFn = jest.fn();
const mockBuildSearchMetadataFn = jest.fn();
const mockProcessQueryFn = jest.fn();
const mockFilterDocumentContentFn = jest.fn();
const mockCreateTimeoutControllerFn = jest.fn();
const mockValidateQueryConstraintsFn = jest.fn();

// Mock all dependencies before imports
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

// Import after mocks
import {
  executeSearchWorkflow,
  createHealthResponse,
  createUnhealthyResponse,
  type SearchExecutionParams
} from '../search-orchestrator';
import type { Document, DocumentSource } from '../../../types/search';

// Get mock references
const mockRandomUUID = mockRandomUUIDFn;
const mockClassifyQueryWithMetrics = mockClassifyQueryWithMetricsFn;
const mockPerformHybridSearch = mockPerformHybridSearchFn;
const mockGenerateSearchSuggestions = mockGenerateSearchSuggestionsFn;
const mockBuildSearchMetadata = mockBuildSearchMetadataFn;
const mockProcessQuery = mockProcessQueryFn;
const mockFilterDocumentContent = mockFilterDocumentContentFn;
const mockCreateTimeoutController = mockCreateTimeoutControllerFn;
const mockValidateQueryConstraints = mockValidateQueryConstraintsFn;

describe('SearchOrchestrator', () => {
  const mockCleanup = jest.fn();

  // Helper to create test documents
  const createTestDoc = (id: string, content: string): Document => ({
    id: `doc-${id}` as any,
    content,
    source: 'github' as DocumentSource,
    filepath: `/test/${id}.ts`,
    priority: 1.0,
    score: 0.9,
    language: 'typescript',
    metadata: {
      url: `https://github.com/test/${id}`,
      size: content.length,
      wordCount: content.split(/\s+/).length,
      lines: content.split('\n').length,
      encoding: 'utf-8',
      mimeType: 'text/plain',
      checksum: `checksum-${id}`,
      lastModified: new Date('2023-01-01T00:00:00Z')
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockRandomUUID.mockReturnValue('test-uuid-123');
    mockCreateTimeoutController.mockReturnValue({ cleanup: mockCleanup });
    mockValidateQueryConstraints.mockImplementation(() => {});

    mockClassifyQueryWithMetrics.mockResolvedValue({
      classification: {
        query: 'test query',
        type: 'technical',
        confidence: 0.9,
        weights: { github: 1.5, web: 0.5 },
        reasoning: 'Test reasoning',
        cached: false
      },
      metrics: {
        responseTime: 100,
        cacheHit: false,
        confidence: 0.9,
        source: 'openai'
      }
    });

    const mockDocs = [
      createTestDoc('1', 'First document'),
      createTestDoc('2', 'Second document')
    ];

    mockPerformHybridSearch.mockResolvedValue({
      documents: mockDocs,
      totalResults: 2,
      searchTime: 150
    });

    mockFilterDocumentContent.mockImplementation((docs) => docs);
    mockGenerateSearchSuggestions.mockReturnValue(['suggestion 1', 'suggestion 2']);
    mockBuildSearchMetadata.mockReturnValue({
      queryId: 'query-test-uuid-123' as any,
      resultCount: 2,
      searchTime: 150,
      cacheHit: false
    });
    mockProcessQuery.mockReturnValue({
      original: 'test query',
      processed: 'test query',
      type: 'technical'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('executeSearchWorkflow', () => {
    const defaultParams: SearchExecutionParams = {
      query: 'How to implement React hooks',
      limit: 10,
      offset: 0,
      includeContent: true,
      includeEmbedding: false,
      timeout: 30000
    };

    it('should execute complete search workflow successfully', async () => {
      // Act
      const result = await executeSearchWorkflow(defaultParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.metadata.resultCount).toBe(2);
      expect(result.suggestions).toHaveLength(2);

      // Verify workflow steps
      expect(mockValidateQueryConstraints).toHaveBeenCalledWith(defaultParams.query);
      expect(mockClassifyQueryWithMetrics).toHaveBeenCalledWith(
        defaultParams.query,
        expect.objectContaining({ timeout: expect.any(Number) })
      );
      expect(mockPerformHybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: defaultParams.query,
          limit: defaultParams.limit,
          offset: defaultParams.offset
        })
      );
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should use classification weights when custom weights not provided', async () => {
      // Act
      await executeSearchWorkflow(defaultParams);

      // Assert
      expect(mockPerformHybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceWeights: { github: 1.5, web: 0.5 } // From classification
        })
      );
    });

    it('should use custom weights when provided', async () => {
      // Arrange
      const customWeights = { github: 2.0, web: 1.0 };
      const paramsWithWeights = { ...defaultParams, weights: customWeights };

      // Act
      await executeSearchWorkflow(paramsWithWeights);

      // Assert
      expect(mockPerformHybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceWeights: customWeights
        })
      );
    });

    it('should filter document content based on parameters', async () => {
      // Arrange
      const params = {
        ...defaultParams,
        includeContent: false,
        includeEmbedding: true
      };

      // Act
      await executeSearchWorkflow(params);

      // Assert
      expect(mockFilterDocumentContent).toHaveBeenCalledWith(
        expect.any(Array),
        false,
        true
      );
    });

    it('should generate search suggestions', async () => {
      // Act
      const result = await executeSearchWorkflow(defaultParams);

      // Assert
      expect(mockGenerateSearchSuggestions).toHaveBeenCalledWith(
        defaultParams.query,
        expect.any(Array)
      );
      expect(result.suggestions).toEqual(['suggestion 1', 'suggestion 2']);
    });

    it('should build search metadata with correct parameters', async () => {
      // Act
      await executeSearchWorkflow(defaultParams);

      // Assert
      expect(mockBuildSearchMetadata).toHaveBeenCalledWith(
        expect.stringContaining('query-'),
        expect.any(Array),
        150, // searchTime
        false, // cacheHit
        undefined, // filters
        undefined // config
      );
    });

    it('should process query with classification type', async () => {
      // Act
      await executeSearchWorkflow(defaultParams);

      // Assert
      expect(mockProcessQuery).toHaveBeenCalledWith(
        defaultParams.query,
        'technical',
        undefined
      );
    });

    it('should apply classification timeout correctly', async () => {
      // Arrange
      const params = { ...defaultParams, timeout: 9000 };

      // Act
      await executeSearchWorkflow(params);

      // Assert - timeout should be max(1000, min(timeout/3, 2000))
      // 9000 / 3 = 3000, min(3000, 2000) = 2000, max(1000, 2000) = 2000
      expect(mockClassifyQueryWithMetrics).toHaveBeenCalledWith(
        params.query,
        expect.objectContaining({ timeout: 2000 })
      );
    });

    it('should apply minimum classification timeout', async () => {
      // Arrange
      const params = { ...defaultParams, timeout: 1500 };

      // Act
      await executeSearchWorkflow(params);

      // Assert - timeout should be max(1000, min(1500/3, 2000))
      // 1500 / 3 = 500, min(500, 2000) = 500, max(1000, 500) = 1000
      expect(mockClassifyQueryWithMetrics).toHaveBeenCalledWith(
        params.query,
        expect.objectContaining({ timeout: 1000 })
      );
    });

    it('should handle validation errors', async () => {
      // Arrange
      mockValidateQueryConstraints.mockImplementation(() => {
        throw new Error('Query too long');
      });

      // Act & Assert
      await expect(executeSearchWorkflow(defaultParams)).rejects.toThrow('Query too long');
      expect(mockCleanup).toHaveBeenCalled(); // Cleanup called even on error
    });

    it('should handle classification errors', async () => {
      // Arrange
      mockClassifyQueryWithMetrics.mockRejectedValue(new Error('Classification failed'));

      // Act & Assert
      await expect(executeSearchWorkflow(defaultParams)).rejects.toThrow('Classification failed');
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should handle search errors', async () => {
      // Arrange
      mockPerformHybridSearch.mockRejectedValue(new Error('Search failed'));

      // Act & Assert
      await expect(executeSearchWorkflow(defaultParams)).rejects.toThrow('Search failed');
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should create timeout controller with correct timeout', async () => {
      // Act
      await executeSearchWorkflow(defaultParams);

      // Assert
      expect(mockCreateTimeoutController).toHaveBeenCalledWith(30000);
    });

    it('should handle empty search results gracefully', async () => {
      // Arrange
      mockPerformHybridSearch.mockResolvedValue({
        documents: [],
        totalResults: 0,
        searchTime: 50
      });
      mockBuildSearchMetadata.mockReturnValue({
        queryId: 'query-test-uuid-123' as any,
        resultCount: 0,
        searchTime: 50,
        cacheHit: false
      });

      // Act
      const result = await executeSearchWorkflow(defaultParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.metadata.resultCount).toBe(0);
    });

    it('should handle cached classification results', async () => {
      // Arrange
      mockClassifyQueryWithMetrics.mockResolvedValue({
        classification: {
          query: 'test query',
          type: 'technical',
          confidence: 0.9,
          weights: { github: 1.5, web: 0.5 },
          reasoning: 'Cached response',
          cached: true
        },
        metrics: {
          responseTime: 5,
          cacheHit: true,
          confidence: 0.9,
          source: 'cache'
        }
      });
      mockBuildSearchMetadata.mockReturnValue({
        queryId: 'query-test-uuid-123' as any,
        resultCount: 2,
        searchTime: 150,
        cacheHit: true
      });

      // Act
      const result = await executeSearchWorkflow(defaultParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata.cacheHit).toBe(true);
    });

    it('should pass filters to metadata builder', async () => {
      // Arrange
      const filters = {
        sources: ['github' as DocumentSource],
        languages: ['typescript' as any],
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31')
        }
      };
      const params = { ...defaultParams, filters };

      // Act
      await executeSearchWorkflow(params);

      // Assert
      expect(mockBuildSearchMetadata).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(Number),
        expect.any(Boolean),
        filters,
        undefined
      );
    });

    it('should respect pagination parameters', async () => {
      // Arrange
      const params = { ...defaultParams, limit: 20, offset: 10 };

      // Act
      await executeSearchWorkflow(params);

      // Assert
      expect(mockPerformHybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 10
        })
      );
    });
  });

  describe('createHealthResponse', () => {
    it('should return healthy status with correct structure', () => {
      // Act
      const response = createHealthResponse();

      // Assert
      expect(response.status).toBe('healthy');
      expect(response.version).toBe('1.0.0');
      expect(response.capabilities).toEqual([
        'hybrid_search',
        'query_classification',
        'source_weighting',
        'result_caching'
      ]);
      expect(response.limits).toEqual({
        maxQueryLength: 1000,
        maxResults: 100,
        timeout: 30000
      });
    });

    it('should return immutable configuration', () => {
      // Act
      const response1 = createHealthResponse();
      const response2 = createHealthResponse();

      // Assert - Each call should return consistent data
      expect(response1).toEqual(response2);
    });
  });

  describe('createUnhealthyResponse', () => {
    it('should create unhealthy response from Error object', () => {
      // Arrange
      const error = new Error('Database connection failed');

      // Act
      const response = createUnhealthyResponse(error);

      // Assert
      expect(response.status).toBe('unhealthy');
      expect(response.error).toBe('Database connection failed');
    });

    it('should handle non-Error objects', () => {
      // Arrange
      const error = 'String error message';

      // Act
      const response = createUnhealthyResponse(error);

      // Assert
      expect(response.status).toBe('unhealthy');
      expect(response.error).toBe('Unknown error');
    });

    it('should handle null errors', () => {
      // Act
      const response = createUnhealthyResponse(null);

      // Assert
      expect(response.status).toBe('unhealthy');
      expect(response.error).toBe('Unknown error');
    });

    it('should handle undefined errors', () => {
      // Act
      const response = createUnhealthyResponse(undefined);

      // Assert
      expect(response.status).toBe('unhealthy');
      expect(response.error).toBe('Unknown error');
    });

    it('should handle custom error objects with messages', () => {
      // Arrange
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error occurred');

      // Act
      const response = createUnhealthyResponse(error);

      // Assert
      expect(response.status).toBe('unhealthy');
      expect(response.error).toBe('Custom error occurred');
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    const defaultParams: SearchExecutionParams = {
      query: 'test query',
      limit: 10,
      offset: 0,
      includeContent: true,
      includeEmbedding: false,
      timeout: 30000
    };

    it('should handle concurrent workflow executions', async () => {
      // Act - Execute multiple workflows in parallel
      const results = await Promise.all([
        executeSearchWorkflow(defaultParams),
        executeSearchWorkflow({ ...defaultParams, query: 'query 2' }),
        executeSearchWorkflow({ ...defaultParams, query: 'query 3' })
      ]);

      // Assert - All should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(mockCleanup).toHaveBeenCalledTimes(3);
    });

    it('should ensure cleanup is called exactly once per workflow', async () => {
      // Act
      await executeSearchWorkflow(defaultParams);

      // Assert
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('should ensure cleanup is called on error', async () => {
      // Arrange
      mockPerformHybridSearch.mockRejectedValue(new Error('Search failed'));

      // Act & Assert
      await expect(executeSearchWorkflow(defaultParams)).rejects.toThrow();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });
  });
});