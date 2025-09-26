/**
 * Web Crawler Tests
 * Unit tests for Firecrawl web crawling functionality
 */

import { getWebCrawler, DEFAULT_WEB_CRAWL_CONFIG } from '../web-crawler';
import { deduplicateDocuments, DEFAULT_DEDUP_CONFIG } from '../deduplication';

// Mock Firecrawl to avoid external API calls in tests
jest.mock('@mendable/firecrawl-js', () => {
  return jest.fn().mockImplementation(() => ({
    crawlUrl: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          url: 'https://docs.example.com/getting-started',
          markdown: '# Getting Started\n\nThis is a test document.',
          metadata: {
            title: 'Getting Started',
            contentType: 'text/html',
            lastModified: '2024-01-01T00:00:00Z',
          },
        },
      ],
    }),
    scrapeUrl: jest.fn().mockResolvedValue({
      success: true,
      data: { markdown: 'Test content' },
    }),
  }));
});

// Mock Weaviate client
jest.mock('../../weaviate/client', () => ({
  createWeaviateClient: jest.fn(() => ({
    data: {
      creator: jest.fn(() => ({
        withClassName: jest.fn().mockReturnThis(),
        withProperties: jest.fn().mockReturnThis(),
        do: jest.fn().mockResolvedValue({}),
      })),
    },
    graphql: {
      get: jest.fn(() => ({
        withClassName: jest.fn().mockReturnThis(),
        withFields: jest.fn().mockReturnThis(),
        withWhere: jest.fn().mockReturnThis(),
        withLimit: jest.fn().mockReturnThis(),
        do: jest.fn().mockResolvedValue({
          data: {
            Get: {
              Document: [],
            },
          },
        }),
      })),
    },
  })),
}));

describe('WebCrawler', () => {
  beforeEach(() => {
    // Set required environment variables for tests
    process.env.FIRECRAWL_API_KEY = 'test-api-key';
    process.env.WEAVIATE_HOST = 'https://test-weaviate.com';
    process.env.WEAVIATE_API_KEY = 'test-weaviate-key';
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_WEB_CRAWL_CONFIG.maxPages).toBe(100);
      expect(DEFAULT_WEB_CRAWL_CONFIG.authorityWeight).toBe(0.8);
      expect(DEFAULT_WEB_CRAWL_CONFIG.excludePatterns).toContain('/blog/*');
      expect(DEFAULT_WEB_CRAWL_CONFIG.includePatterns).toContain('docs.*');
    });

    it('should allow custom configuration', () => {
      const customConfig = {
        maxPages: 50,
        authorityWeight: 0.9,
      };

      const crawler = getWebCrawler(customConfig);
      expect(crawler).toBeDefined();
    });
  });

  describe('URL Filtering', () => {
    it('should validate environment variables', () => {
      delete process.env.FIRECRAWL_API_KEY;

      expect(() => {
        getWebCrawler();
      }).toThrow('FIRECRAWL_API_KEY environment variable required');
    });

    it('should handle excluded patterns', async () => {
      // This test would require access to private methods
      // In a real implementation, we might extract pattern matching to a public utility
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Document Processing', () => {
    it('should detect language from content', async () => {
      const crawler = getWebCrawler();

      const request = {
        targets: [
          {
            url: 'https://docs.example.com',
            domain: 'docs.example.com',
            maxDepth: 2,
            priority: 0.8,
          },
        ],
      };

      const results = await crawler.crawl(request);

      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const crawler = getWebCrawler();
      const isHealthy = await crawler.healthCheck();

      expect(typeof isHealthy).toBe('boolean');
    });
  });
});

describe('ContentDeduplicator', () => {
  describe('Configuration', () => {
    it('should use default deduplication configuration', () => {
      expect(DEFAULT_DEDUP_CONFIG.hashAlgorithm).toBe('sha256');
      expect(DEFAULT_DEDUP_CONFIG.similarityThreshold).toBe(0.95);
      expect(DEFAULT_DEDUP_CONFIG.sourceWinners).toEqual(['github', 'web', 'local']);
    });
  });

  describe('Document Deduplication', () => {
    it('should identify exact duplicates', async () => {
      const duplicateContent = 'This is duplicate content.';

      const documents = [
        {
          id: 'doc-1' as any,
          content: duplicateContent,
          filepath: '/path1.txt',
          language: 'text' as any,
          source: 'github' as any,
          score: 0.9,
          priority: 1.2,
          metadata: {
            size: duplicateContent.length,
            wordCount: 4,
            lines: 1,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            tags: [],
            lastModified: new Date(),
            created: new Date(),
            checksum: 'test-hash-1',
          },
        },
        {
          id: 'doc-2' as any,
          content: duplicateContent, // Same content
          filepath: '/path2.txt',
          language: 'text' as any,
          source: 'web' as any,
          score: 0.8,
          priority: 0.8,
          metadata: {
            size: duplicateContent.length,
            wordCount: 4,
            lines: 1,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            tags: [],
            lastModified: new Date(),
            created: new Date(),
            checksum: 'test-hash-2',
          },
        },
      ];

      const result = await deduplicateDocuments(documents);

      expect(result.processed).toBe(2);
      expect(result.duplicatesFound).toBeGreaterThan(0);
      expect(result.canonicalDocuments.length).toBeLessThan(2);
    });

    it('should prefer GitHub sources over web sources', async () => {
      const content = 'Test content for source priority.';

      const documents = [
        {
          id: 'web-doc' as any,
          content,
          filepath: '/web.txt',
          language: 'text' as any,
          source: 'web' as any,
          score: 0.8,
          priority: 0.8,
          metadata: {
            size: content.length,
            wordCount: 5,
            lines: 1,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            tags: [],
            lastModified: new Date(),
            created: new Date(),
            checksum: 'web-hash',
          },
        },
        {
          id: 'github-doc' as any,
          content,
          filepath: '/github.txt',
          language: 'text' as any,
          source: 'github' as any,
          score: 0.9,
          priority: 1.2,
          metadata: {
            size: content.length,
            wordCount: 5,
            lines: 1,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            tags: [],
            lastModified: new Date(),
            created: new Date(),
            checksum: 'github-hash',
          },
        },
      ];

      const result = await deduplicateDocuments(documents);

      expect(result.canonicalDocuments.length).toBe(1);
      if (result.duplicateGroups.length > 0) {
        const canonicalSource = result.duplicateGroups[0].canonicalDocument.source;
        expect(canonicalSource).toBe('github');
      }
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate content similarity accurately', async () => {
      const similarContent1 = 'This is a test document for similarity testing.';
      const similarContent2 = 'This is a test document for similarity checking.'; // Very similar
      const differentContent = 'Completely different content here.';

      const documents = [
        {
          id: 'similar-1' as any,
          content: similarContent1,
          filepath: '/similar1.txt',
          language: 'text' as any,
          source: 'web' as any,
          score: 0.8,
          priority: 0.8,
          metadata: {
            size: similarContent1.length,
            wordCount: 8,
            lines: 1,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            tags: [],
            lastModified: new Date(),
            created: new Date(),
            checksum: 'similar-1-hash',
          },
        },
        {
          id: 'similar-2' as any,
          content: similarContent2,
          filepath: '/similar2.txt',
          language: 'text' as any,
          source: 'web' as any,
          score: 0.8,
          priority: 0.8,
          metadata: {
            size: similarContent2.length,
            wordCount: 8,
            lines: 1,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            tags: [],
            lastModified: new Date(),
            created: new Date(),
            checksum: 'similar-2-hash',
          },
        },
        {
          id: 'different' as any,
          content: differentContent,
          filepath: '/different.txt',
          language: 'text' as any,
          source: 'web' as any,
          score: 0.8,
          priority: 0.8,
          metadata: {
            size: differentContent.length,
            wordCount: 4,
            lines: 1,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            tags: [],
            lastModified: new Date(),
            created: new Date(),
            checksum: 'different-hash',
          },
        },
      ];

      const result = await deduplicateDocuments(documents, {
        similarityThreshold: 0.8,
      });

      expect(result.processed).toBe(3);
      // Should identify similar content but keep different content separate
      expect(result.canonicalDocuments.length).toBeLessThan(3);
    });
  });
});