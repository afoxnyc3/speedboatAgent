/**
 * Web Crawl Ingestion API Endpoint
 * POST /api/ingest/web - Triggers Firecrawl web crawling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getWebCrawler } from '../../../lib/ingestion/web-crawler';
import { createWeaviateClient } from '../../../lib/weaviate/client';

// API request validation
const APIWebCrawlRequestSchema = z.object({
  targets: z.array(z.object({
    url: z.string().url(),
    domain: z.string().optional(),
    maxDepth: z.number().min(1).max(5).default(3),
    priority: z.number().min(0.1).max(2.0).default(0.8),
  })).min(1).max(10),
  config: z.object({
    maxPages: z.number().min(1).max(1000).default(100),
    timeout: z.number().min(5000).max(60000).default(30000),
    excludePatterns: z.array(z.string()).optional(),
    includePatterns: z.array(z.string()).optional(),
    forceRecrawl: z.boolean().default(false),
  }).optional(),
  deduplication: z.object({
    enabled: z.boolean().default(true),
    similarityThreshold: z.number().min(0.5).max(1.0).default(0.95),
  }).optional(),
}).strict();

// type APIWebCrawlRequest = z.infer<typeof APIWebCrawlRequestSchema>;

// API response interfaces
interface WebCrawlAPIResponse {
  success: true;
  data: {
    results: Array<{
      target: {
        url: string;
        domain: string;
      };
      success: boolean;
      pagesFound: number;
      documentsCreated: number;
      duplicatesRemoved: number;
      crawlTime: number;
      errors: string[];
    }>;
    summary: {
      totalTargets: number;
      successfulCrawls: number;
      totalPages: number;
      totalDocuments: number;
      totalDuplicates: number;
      totalTime: number;
    };
    deduplication: {
      enabled: boolean;
      processed: number;
      duplicatesFound: number;
      processingTime: number;
    } | null;
  };
  timestamp: string;
}

interface WebCrawlAPIError {
  success: false;
  error: {
    code: 'INVALID_REQUEST' | 'CRAWL_FAILED' | 'SERVICE_UNAVAILABLE' | 'RATE_LIMITED';
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

type WebCrawlAPIResult = WebCrawlAPIResponse | WebCrawlAPIError;

/**
 * Validates environment and service availability
 */
async function validateEnvironment(): Promise<string | null> {
  if (!process.env.FIRECRAWL_API_KEY) {
    return 'FIRECRAWL_API_KEY environment variable is required';
  }

  if (!process.env.WEAVIATE_HOST || !process.env.WEAVIATE_API_KEY) {
    return 'Weaviate configuration (WEAVIATE_HOST, WEAVIATE_API_KEY) is required';
  }

  // Test Weaviate connection
  try {
    const client = createWeaviateClient();
    await client.misc.metaGetter().do();
  } catch (error) {
    return `Weaviate connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Test Firecrawl service
  try {
    const crawler = getWebCrawler();
    const isHealthy = await crawler.healthCheck();
    if (!isHealthy) {
      return 'Firecrawl service is not available';
    }
  } catch (error) {
    return `Firecrawl service error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return null;
}

/**
 * Rate limiting check (simple in-memory implementation)
 */
const crawlAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const clientData = crawlAttempts.get(clientIp);

  if (!clientData) {
    crawlAttempts.set(clientIp, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset if window expired
  if (now - clientData.lastAttempt > windowMs) {
    crawlAttempts.set(clientIp, { count: 1, lastAttempt: now });
    return true;
  }

  // Check if within limits
  if (clientData.count >= maxAttempts) {
    return false;
  }

  // Increment counter
  clientData.count++;
  clientData.lastAttempt = now;
  return true;
}

/**
 * POST /api/ingest/web
 * Crawls web content and indexes it to Weaviate
 */
export async function POST(request: NextRequest): Promise<NextResponse<WebCrawlAPIResult>> {
  const startTime = Date.now();

  try {
    // Environment validation
    const envError = await validateEnvironment();
    if (envError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: envError,
        },
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }

    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many crawl requests. Please wait before trying again.',
          details: { clientIp, limit: '5 requests per 15 minutes' },
        },
        timestamp: new Date().toISOString(),
      }, { status: 429 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = APIWebCrawlRequestSchema.parse(body);

    // Normalize targets
    const normalizedTargets = validatedRequest.targets.map(target => ({
      ...target,
      domain: target.domain || new URL(target.url).hostname,
    }));

    // Create crawler and execute crawl
    const crawler = getWebCrawler(validatedRequest.config);
    const crawlResults = await crawler.crawl({
      targets: normalizedTargets,
      config: validatedRequest.config,
      forceRecrawl: validatedRequest.config?.forceRecrawl || false,
    });

    // Documents are already indexed by crawler, no need for deduplication here

    // Build response data
    const results = crawlResults.map(result => ({
      target: {
        url: result.target.url,
        domain: result.target.domain || new URL(result.target.url).hostname,
      },
      success: result.success,
      pagesFound: result.pages.length,
      documentsCreated: result.documentsCreated,
      duplicatesRemoved: 0, // Will be updated if deduplication runs
      crawlTime: result.crawlTime,
      errors: [...result.errors],
    }));

    const summary = {
      totalTargets: crawlResults.length,
      successfulCrawls: crawlResults.filter(r => r.success).length,
      totalPages: crawlResults.reduce((sum, r) => sum + r.pages.length, 0),
      totalDocuments: crawlResults.reduce((sum, r) => sum + r.documentsCreated, 0),
      totalDuplicates: 0,
      totalTime: Date.now() - startTime,
    };

    const response: WebCrawlAPIResponse = {
      success: true,
      data: {
        results,
        summary,
        deduplication: null, // Not implemented in this version
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Web crawl API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request validation failed',
          details: {
            issues: error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'CRAWL_FAILED',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: { processingTime: Date.now() - startTime },
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * GET /api/ingest/web
 * Returns web crawling service status and configuration
 */
export async function GET(): Promise<NextResponse> {
  try {
    const envError = await validateEnvironment();

    const status = {
      service: 'web-crawling',
      status: envError ? 'unavailable' : 'available',
      timestamp: new Date().toISOString(),
      configuration: {
        firecrawlConfigured: !!process.env.FIRECRAWL_API_KEY,
        weaviateConfigured: !!(process.env.WEAVIATE_HOST && process.env.WEAVIATE_API_KEY),
        maxTargetsPerRequest: 10,
        maxPagesPerTarget: 1000,
        supportedDomains: ['docs.*', 'api.*', 'help.*'],
        excludedPaths: ['/blog/*', '/careers/*', '/legal/*'],
      },
      error: envError || undefined,
    };

    return NextResponse.json(status);

  } catch (error) {
    return NextResponse.json({
      service: 'web-crawling',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service check failed',
    }, { status: 500 });
  }
}

/**
 * OPTIONS /api/ingest/web
 * CORS preflight handler
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: 'GET, POST, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}