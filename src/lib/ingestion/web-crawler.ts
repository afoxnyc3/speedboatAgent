/**
 * Firecrawl Web Ingestion Pipeline
 * Production-ready web crawling with selective domain filtering
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import { createWeaviateClient } from '../weaviate/client';
import { createDocumentHash } from '../search/search-utils';
import {
  Document,
  DocumentSource,
  DocumentLanguage,
  DocumentMetadata,
  createDocumentId,
} from '../../types/search';

// Web crawl configuration
export interface WebCrawlConfig {
  readonly maxPages: number;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly excludePatterns: readonly string[];
  readonly includePatterns: readonly string[];
  readonly authorityWeight: number;
  readonly crawlDelay: number;
}

// Default configuration following CLAUDE.md specs
export const DEFAULT_WEB_CRAWL_CONFIG: WebCrawlConfig = {
  maxPages: 100,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000,
  excludePatterns: ['/blog/*', '/careers/*', '/legal/*', '/privacy/*'],
  includePatterns: ['docs.*', 'api.*', 'help.*'],
  authorityWeight: 0.8, // Lower than GitHub (1.2)
  crawlDelay: 1000,
} as const;

// Validation schemas
export const CrawlTargetSchema = z.object({
  url: z.string().url(),
  domain: z.string(),
  maxDepth: z.number().min(1).max(5).default(3),
  priority: z.number().min(0.1).max(2.0).default(0.8),
}).strict();

export const WebCrawlRequestSchema = z.object({
  targets: z.array(CrawlTargetSchema).min(1).max(10),
  config: z.object({
    maxPages: z.number().min(1).max(1000).optional(),
    timeout: z.number().min(5000).max(60000).optional(),
    excludePatterns: z.array(z.string()).optional(),
    includePatterns: z.array(z.string()).optional(),
  }).optional(),
  forceRecrawl: z.boolean().default(false),
}).strict();

export type CrawlTarget = z.infer<typeof CrawlTargetSchema>;
export type WebCrawlRequest = z.infer<typeof WebCrawlRequestSchema>;

// Crawl result interfaces
export interface CrawledPage {
  readonly url: string;
  readonly title: string;
  readonly content: string;
  readonly metadata: {
    readonly statusCode: number;
    readonly contentType: string;
    readonly lastModified?: string;
    readonly size: number;
    readonly links: readonly string[];
  };
}

export interface WebCrawlResult {
  readonly success: boolean;
  readonly pages: readonly CrawledPage[];
  readonly documentsCreated: number;
  readonly errors: readonly string[];
  readonly crawlTime: number;
  readonly target: CrawlTarget;
}

/**
 * Firecrawl client with retry logic and rate limiting
 */
class WebCrawlerService {
  private readonly firecrawl: FirecrawlApp;
  private readonly config: WebCrawlConfig;

  constructor(config: Partial<WebCrawlConfig> = {}) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable required');
    }

    this.firecrawl = new FirecrawlApp({ apiKey });
    this.config = { ...DEFAULT_WEB_CRAWL_CONFIG, ...config };
  }

  /**
   * Validates if URL should be crawled based on patterns
   */
  private shouldCrawlUrl(url: string): boolean {
    const urlPath = new URL(url).pathname;

    // Check exclude patterns first
    const isExcluded = this.config.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(urlPath);
    });

    if (isExcluded) return false;

    // Check include patterns for domain
    const domain = new URL(url).hostname;
    const isIncluded = this.config.includePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(domain);
    });

    return isIncluded;
  }

  /**
   * Detects document language from content and URL
   */
  private detectLanguage(url: string, content: string): DocumentLanguage {
    const extension = url.split('.').pop()?.toLowerCase();

    // Check for code blocks or technical patterns
    if (content.includes('```') || content.includes('function ') || content.includes('const ')) {
      return extension === 'ts' ? 'typescript' : 'javascript';
    }

    if (content.includes('# ') || content.includes('## ') || url.includes('readme')) {
      return 'markdown';
    }

    if (extension === 'json' || content.trim().startsWith('{')) {
      return 'json';
    }

    if (extension === 'yaml' || extension === 'yml') {
      return 'yaml';
    }

    return 'text';
  }

  /**
   * Creates document metadata from crawled page
   */
  private createWebDocumentMetadata(page: CrawledPage): DocumentMetadata {
    const content = page.content;
    const wordCount = content.split(/\s+/).length;
    const lines = content.split('\n').length;

    return {
      size: content.length,
      wordCount,
      lines,
      encoding: 'utf-8',
      mimeType: page.metadata.contentType || 'text/html',
      tags: ['web-crawled'],
      lastModified: page.metadata.lastModified
        ? new Date(page.metadata.lastModified)
        : new Date(),
      created: new Date(),
      url: page.url,
      checksum: createDocumentHash(content),
    };
  }

  /**
   * Converts crawled page to Document format
   */
  private pageToDocument(page: CrawledPage, target: CrawlTarget): Document {
    const content = page.content;
    const filepath = new URL(page.url).pathname || '/';
    const language = this.detectLanguage(page.url, content);
    const metadata = this.createWebDocumentMetadata(page);

    return {
      id: createDocumentId(`web-${createDocumentHash(page.url)}`),
      content,
      filepath,
      language,
      source: 'web' as DocumentSource,
      score: 0.8, // Base score for web content
      priority: target.priority * this.config.authorityWeight,
      metadata,
    };
  }

  /**
   * Crawls single target with retry logic
   */
  private async crawlTarget(target: CrawlTarget): Promise<WebCrawlResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (!this.shouldCrawlUrl(target.url)) {
          return {
            success: false,
            pages: [],
            documentsCreated: 0,
            errors: [`URL ${target.url} excluded by patterns`],
            crawlTime: Date.now() - startTime,
            target,
          };
        }

        // Use simple scraping approach for initial implementation
        const result = await this.firecrawl.scrape(target.url);

        if (!result || typeof result !== 'object') {
          throw new Error('Scrape failed with no data');
        }

        // Process scraped page (assuming Firecrawl returns basic data)
        const scrapedData = result as any;
        const content = scrapedData.markdown || scrapedData.content || '';

        const pages: CrawledPage[] = [{
          url: target.url,
          title: scrapedData.title || 'Untitled',
          content,
          metadata: {
            statusCode: 200,
            contentType: 'text/html',
            lastModified: undefined,
            size: content.length,
            links: [],
          },
        }];

        const crawlTime = Date.now() - startTime;

        return {
          success: true,
          pages,
          documentsCreated: 0, // Will be set after indexing
          errors: [],
          crawlTime,
          target,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve =>
            setTimeout(resolve, this.config.retryDelay * attempt)
          );
        }
      }
    }

    return {
      success: false,
      pages: [],
      documentsCreated: 0,
      errors: [lastError?.message || 'Unknown crawl error'],
      crawlTime: Date.now() - startTime,
      target,
    };
  }

  /**
   * Indexes documents to Weaviate with deduplication
   */
  private async indexDocuments(documents: Document[]): Promise<number> {
    if (documents.length === 0) return 0;

    const client = createWeaviateClient();
    let indexedCount = 0;

    for (const doc of documents) {
      try {
        // Check for existing document by URL
        const existingQuery = client.graphql
          .get()
          .withClassName('Document')
          .withFields('content')
          .withWhere({
            operator: 'Equal',
            path: ['url'],
            valueString: doc.metadata?.url || doc.filepath,
          })
          .withLimit(1);

        const existing = await existingQuery.do();

        if (existing?.data?.Get?.Document?.length > 0) {
          continue; // Skip duplicate by URL
        }

        // Index new document
        await client.data
          .creator()
          .withClassName('Document')
          .withProperties({
            content: doc.content,
            source: doc.source,
            filepath: doc.filepath,
            url: doc.metadata?.url || doc.filepath,
            language: doc.language,
            priority: doc.priority,
            lastModified: doc.metadata.lastModified.toISOString(),
            isCode: false,
            isDocumentation: true,
            fileType: 'documentation',
            size: doc.metadata.size || 0,
          })
          .do();

        indexedCount++;

        // Rate limiting between requests
        await new Promise(resolve =>
          setTimeout(resolve, this.config.crawlDelay)
        );

      } catch (error) {
        console.error(`Failed to index document ${doc.id}:`, error);
      }
    }

    return indexedCount;
  }

  /**
   * Main crawl method - processes multiple targets
   */
  async crawl(request: WebCrawlRequest): Promise<WebCrawlResult[]> {
    const validatedRequest = WebCrawlRequestSchema.parse(request);
    const results: WebCrawlResult[] = [];

    for (const target of validatedRequest.targets) {
      try {
        const crawlResult = await this.crawlTarget(target);

        if (crawlResult.success && crawlResult.pages.length > 0) {
          // Convert pages to documents
          const documents = crawlResult.pages.map(page =>
            this.pageToDocument(page, target)
          );

          // Index documents with deduplication
          const indexedCount = await this.indexDocuments(documents);

          results.push({
            ...crawlResult,
            documentsCreated: indexedCount,
          });
        } else {
          results.push(crawlResult);
        }

      } catch (error) {
        results.push({
          success: false,
          pages: [],
          documentsCreated: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          crawlTime: 0,
          target,
        });
      }

      // Delay between targets
      if (validatedRequest.targets.length > 1) {
        await new Promise(resolve =>
          setTimeout(resolve, this.config.crawlDelay * 2)
        );
      }
    }

    return results;
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple API key validation
      const testResult = await this.firecrawl.scrape('https://httpbin.org/status/200');
      return testResult != null;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let crawlerInstance: WebCrawlerService | null = null;

/**
 * Gets or creates web crawler singleton
 */
export function getWebCrawler(config?: Partial<WebCrawlConfig>): WebCrawlerService {
  if (!crawlerInstance) {
    crawlerInstance = new WebCrawlerService(config);
  }
  return crawlerInstance;
}

/**
 * Convenience method for crawling common documentation patterns
 */
export async function crawlDocumentationSites(
  domains: string[],
  config?: Partial<WebCrawlConfig>
): Promise<WebCrawlResult[]> {
  const crawler = getWebCrawler(config);

  const targets: CrawlTarget[] = domains.map(domain => ({
    url: `https://${domain}`,
    domain,
    maxDepth: 3,
    priority: domain.includes('docs') ? 1.0 : 0.8,
  }));

  return crawler.crawl({ targets, forceRecrawl: false });
}

/**
 * Type exports for external usage
 */
export type { WebCrawlerService };