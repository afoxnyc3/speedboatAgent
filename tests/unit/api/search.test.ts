/**
 * Unit Tests for Search API Route
 * Comprehensive test coverage for hybrid search functionality
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../../../app/api/search/route';
import { SearchRequestSchema } from '../../../src/types/search';

// Mock dependencies
const mockClassifyQueryWithMetrics = jest.fn();
const mockCreateWeaviateClient = jest.fn();

jest.mock('../../../src/lib/search/query-classifier', () => ({
  classifyQueryWithMetrics: mockClassifyQueryWithMetrics
}));

jest.mock('../../../src/lib/weaviate/client', () => ({
  createWeaviateClient: mockCreateWeaviateClient
}));

describe('Search API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(10000);
  });

  describe('POST /api/search', () => {
    const mockWeaviateClient = {
      graphql: {
        get: jest.fn().mockReturnThis(),
        withClassName: jest.fn().mockReturnThis(),
        withFields: jest.fn().mockReturnThis(),
        withHybrid: jest.fn().mockReturnThis(),
        withLimit: jest.fn().mockReturnThis(),
        withOffset: jest.fn().mockReturnThis(),
        withWhere: jest.fn().mockReturnThis(),
        do: jest.fn()
      }
    };

    const mockClassificationResult = {
      classification: {
        query: 'test query',
        type: 'technical' as const,
        confidence: 0.85,
        weights: { github: 1.5, web: 0.5 },
        reasoning: 'Technical query about code',
        cached: false
      },
      metrics: {
        responseTime: 100,
        cacheHit: false,
        confidence: 0.85,
        source: 'openai' as const
      }
    };

    const mockSearchResult = {
      data: {
        Get: {
          Document: [
            {
              content: 'Sample document content',
              source: 'github',
              filepath: '/src/test.ts',
              language: 'typescript',
              priority: 1.2,
              lastModified: '2024-01-01T00:00:00Z',
              metadata: {
                size: 1024,
                wordCount: 150,
                lines: 30,
                encoding: 'utf-8',
                mimeType: 'text/plain',
                tags: ['typescript', 'code'],
                author: 'test@example.com',
                created: '2024-01-01T00:00:00Z',
                checksum: 'abc123'
              },
              _additional: {
                id: 'doc-1',
                score: 0.85
              }
            }
          ]
        }
      }
    };

    beforeEach(() => {
      mockCreateWeaviateClient.mockReturnValue(mockWeaviateClient);
      mockClassifyQueryWithMetrics.mockResolvedValue(mockClassificationResult);
      mockWeaviateClient.graphql.get().do.mockResolvedValue(mockSearchResult);
    });

    it('should handle valid search requests successfully', async () => {
      const requestBody = {
        query: 'How to implement React hooks?',
        limit: 10,
        offset: 0
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toBeDefined();
      expect(data.metadata).toBeDefined();
      expect(data.query).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should validate request schema correctly', async () => {
      const validRequest = {
        query: 'valid query',
        limit: 5
      };

      const result = SearchRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid request schemas', async () => {
      const invalidRequests = [
        { query: '' }, // Empty query
        { query: 'valid', limit: -1 }, // Negative limit
        { query: 'valid', limit: 1001 }, // Limit too high
        { query: 'a'.repeat(1001) }, // Query too long
        { query: 'valid', offset: -1 } // Negative offset
      ];

      for (const invalidRequest of invalidRequests) {
        const request = new NextRequest('http://localhost:3000/api/search', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('PARSING_ERROR');
      }
    });

    it('should handle query classification errors gracefully', async () => {
      mockClassifyQueryWithMetrics.mockRejectedValue(new Error('Classification failed'));

      const requestBody = {
        query: 'test query'
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle Weaviate search errors', async () => {
      mockWeaviateClient.graphql.get().do.mockRejectedValue(new Error('Weaviate connection failed'));

      const requestBody = {
        query: 'test query'
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should apply source weighting correctly', async () => {
      const requestBody = {
        query: 'technical question',
        weights: { github: 2.0, web: 0.5 }
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify that results are properly weighted
      if (data.results.length > 0) {
        const githubDoc = data.results.find((doc: any) => doc.source === 'github');
        if (githubDoc) {
          expect(githubDoc.score).toBeGreaterThan(0);
        }
      }
    });

    it('should handle timeout scenarios', async () => {
      mockClassifyQueryWithMetrics.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 6000)
        )
      );

      const requestBody = {
        query: 'test query',
        timeout: 1000 // 1 second timeout
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).toBe(408);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TIMEOUT');
    });

    it('should exclude content when includeContent is false', async () => {
      const requestBody = {
        query: 'test query',
        includeContent: false
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      if (data.results.length > 0) {
        expect(data.results[0].content).toBe('');
      }
    });

    it('should generate search suggestions', async () => {
      const requestBody = {
        query: 'React hooks'
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
    });

    it('should include proper performance headers', async () => {
      const requestBody = {
        query: 'performance test'
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.headers.get('X-Query-ID')).toBeDefined();
      expect(response.headers.get('X-Search-Time-Ms')).toBeDefined();
      expect(response.headers.get('X-Total-Time-Ms')).toBeDefined();
      expect(response.headers.get('X-Cache-Hit')).toBeDefined();
      expect(response.headers.get('X-Results-Count')).toBeDefined();
    });

    it('should handle empty search results', async () => {
      mockWeaviateClient.graphql.get().do.mockResolvedValue({
        data: { Get: { Document: [] } }
      });

      const requestBody = {
        query: 'nonexistent query'
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(0);
      expect(data.metadata.totalResults).toBe(0);
    });
  });

  describe('GET /api/search', () => {
    const mockWeaviateClient = {
      misc: {
        metaGetter: jest.fn().mockReturnThis(),
        do: jest.fn()
      }
    };

    beforeEach(() => {
      mockCreateWeaviateClient.mockReturnValue(mockWeaviateClient);
    });

    it('should return health status when service is healthy', async () => {
      mockWeaviateClient.misc.metaGetter().do.mockResolvedValue({
        version: '1.0.0'
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.version).toBeDefined();
      expect(data.capabilities).toBeDefined();
      expect(data.limits).toBeDefined();
    });

    it('should return unhealthy status when Weaviate is down', async () => {
      mockWeaviateClient.misc.metaGetter().do.mockRejectedValue(new Error('Connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle rate limiting scenarios', async () => {
      mockClassifyQueryWithMetrics.mockRejectedValue(new Error('rate limit exceeded'));

      const requestBody = {
        query: 'rate limited query'
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      expect(response.status).toBe(500); // Will be 500 unless we specifically detect rate limit
    });
  });

  describe('Performance Tests', () => {
    it('should complete search within acceptable time limits', async () => {
      const startTime = Date.now();

      const requestBody = {
        query: 'performance test query'
      };

      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const requestBody = {
        query: 'concurrent test'
      };

      const requests = Array(5).fill(0).map(() =>
        new NextRequest('http://localhost:3000/api/search', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

describe('Search Request Schema Validation', () => {
  it('should validate correct search request', () => {
    const validRequest = {
      query: 'test query',
      limit: 10,
      offset: 0,
      includeContent: true,
      includeEmbedding: false
    };

    const result = SearchRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject invalid search requests', () => {
    const invalidRequests = [
      { query: '' }, // Empty query
      { query: 'valid', limit: 0 }, // Zero limit
      { query: 'valid', limit: 101 }, // Limit too high
      { query: 'valid', offset: -1 }, // Negative offset
      { query: 'a'.repeat(1001) } // Query too long
    ];

    invalidRequests.forEach(invalidRequest => {
      const result = SearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  it('should apply default values correctly', () => {
    const minimalRequest = {
      query: 'test'
    };

    const result = SearchRequestSchema.safeParse(minimalRequest);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(0);
      expect(result.data.includeContent).toBe(true);
      expect(result.data.includeEmbedding).toBe(false);
    }
  });
});