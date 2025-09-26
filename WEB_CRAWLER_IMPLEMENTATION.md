# Firecrawl Web Ingestion Pipeline Implementation

## Overview

This implementation provides a production-ready web crawling service using Firecrawl for Week 3 Hybrid Data integration, following the specifications in `CLAUDE.md`.

## Components Implemented

### 1. Core Web Crawler (`/src/lib/ingestion/web-crawler.ts`)

**Key Features:**
- ✅ Firecrawl SDK integration with retry logic and rate limiting
- ✅ Selective domain crawling (docs.*, api.*, help.*)
- ✅ Exclusion patterns (/blog/*, /careers/*, /legal/*)
- ✅ Authority weighting (0.8x for web content vs 1.2x for GitHub)
- ✅ Content type detection and language classification
- ✅ Comprehensive error handling with exponential backoff
- ✅ Health check functionality

**Configuration:**
```typescript
const DEFAULT_WEB_CRAWL_CONFIG: WebCrawlConfig = {
  maxPages: 100,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000,
  excludePatterns: ['/blog/*', '/careers/*', '/legal/*'],
  includePatterns: ['docs.*', 'api.*', 'help.*'],
  authorityWeight: 0.8, // Lower than GitHub (1.2)
  crawlDelay: 1000,
}
```

### 2. Deduplication Pipeline (`/src/lib/ingestion/deduplication.ts`)

**Key Features:**
- ✅ SHA-256 content hashing for exact duplicate detection
- ✅ Content similarity analysis (Jaccard, Cosine, Levenshtein)
- ✅ Source priority weighting (GitHub > Web > Local)
- ✅ Batch processing for large document sets
- ✅ Integration with Weaviate for existence checking

**Algorithms:**
- Exact hash matching for identical content
- URL similarity for web content deduplication
- Near-duplicate detection with configurable thresholds
- Source-based canonical document selection

### 3. API Endpoint (`/app/api/ingest/web/route.ts`)

**Endpoints:**
- `POST /api/ingest/web` - Trigger web crawling
- `GET /api/ingest/web` - Service health and configuration
- Rate limiting: 5 requests per 15 minutes per IP

**Request Schema:**
```typescript
{
  targets: Array<{
    url: string;
    domain?: string;
    maxDepth?: number; // 1-5, default 3
    priority?: number; // 0.1-2.0, default 0.8
  }>;
  config?: {
    maxPages?: number; // 1-1000, default 100
    timeout?: number; // 5-60 seconds
    excludePatterns?: string[];
    includePatterns?: string[];
    forceRecrawl?: boolean;
  };
}
```

### 4. Testing Framework (`/scripts/test-web-crawler.ts`)

**Test Coverage:**
- ✅ Environment validation
- ✅ Service availability (Weaviate, Firecrawl)
- ✅ Single URL crawling
- ✅ Multiple domain crawling
- ✅ Deduplication functionality
- ✅ URL filtering patterns

**Usage:**
```bash
npm run test-web-crawler
```

## Environment Setup

Required environment variables:
```env
FIRECRAWL_API_KEY=your_firecrawl_api_key
WEAVIATE_HOST=https://your-weaviate-host.com
WEAVIATE_API_KEY=your_weaviate_api_key
```

## Integration with Existing Architecture

### Weaviate Schema Compatibility
- Uses existing `Document` class schema
- Stores web content with `source: 'web'`
- Maintains metadata compatibility with GitHub ingestion

### Search Integration
- Web documents are indexed with 0.8x authority weighting
- Hybrid search automatically includes web content
- Query classification routes appropriately between sources

### Performance Considerations
- Rate limiting prevents API abuse
- Batch processing for large crawl operations
- Deduplication reduces storage overhead
- Configurable timeouts prevent hanging requests

## Code Quality Standards

Follows CLAUDE.md standards:
- ✅ Functions < 15 lines
- ✅ Files < 100 lines (split into logical components)
- ✅ Comprehensive TypeScript types
- ✅ Zod validation schemas
- ✅ Error handling with detailed messages
- ✅ Unit test coverage

## Usage Examples

### Basic Web Crawling
```typescript
import { getWebCrawler } from './src/lib/ingestion/web-crawler';

const crawler = getWebCrawler();
const results = await crawler.crawl({
  targets: [
    {
      url: 'https://docs.example.com',
      domain: 'docs.example.com',
      maxDepth: 2,
      priority: 1.0,
    }
  ],
  forceRecrawl: false,
});
```

### Documentation Site Crawling
```typescript
import { crawlDocumentationSites } from './src/lib/ingestion/web-crawler';

const results = await crawlDocumentationSites([
  'docs.github.com',
  'api.stripe.com',
  'help.shopify.com',
]);
```

### Content Deduplication
```typescript
import { deduplicateDocuments } from './src/lib/ingestion/deduplication';

const result = await deduplicateDocuments(documents, {
  similarityThreshold: 0.95,
  sourceWinners: ['github', 'web', 'local'],
});
```

## API Usage

### Trigger Web Crawl
```bash
curl -X POST /api/ingest/web \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [
      {
        "url": "https://docs.example.com",
        "maxDepth": 2,
        "priority": 0.9
      }
    ],
    "config": {
      "maxPages": 50,
      "timeout": 30000
    }
  }'
```

### Check Service Status
```bash
curl /api/ingest/web
```

## Performance Metrics

Expected performance:
- Single page scraping: < 5 seconds
- Deduplication: < 1 second per 100 documents
- Indexing to Weaviate: < 2 seconds per document
- Memory usage: < 100MB per crawl session

## Error Handling

Comprehensive error handling includes:
- Network timeouts and retries
- API rate limit handling
- Malformed content graceful degradation
- Service unavailability fallbacks
- Detailed error logging with context

## Security Considerations

- API key validation and rotation support
- Request rate limiting by IP address
- Input validation with Zod schemas
- URL sanitization and validation
- Safe content processing (no code execution)

## Future Enhancements

Planned improvements for Week 4:
1. Full crawl mode (multi-page crawling)
2. Real-time content change detection
3. Advanced content filtering
4. Bulk crawl job scheduling
5. Enhanced similarity algorithms
6. Performance monitoring and metrics

## Dependencies

Key packages added:
- `@mendable/firecrawl-js@^4.3.5` - Firecrawl SDK
- Existing: `weaviate-ts-client`, `zod`, `crypto`

## File Structure

```
/src/lib/ingestion/
├── web-crawler.ts              # Main Firecrawl integration
├── deduplication.ts           # Content deduplication pipeline
└── __tests__/
    └── web-crawler.test.ts    # Unit tests

/app/api/ingest/
└── web/
    └── route.ts              # API endpoints

/scripts/
└── test-web-crawler.ts       # Integration tests
```

## Next Steps

1. **Environment Setup**: Configure `FIRECRAWL_API_KEY`
2. **Testing**: Run `npm run test-web-crawler`
3. **Integration**: Test API endpoints
4. **Production**: Deploy with monitoring
5. **Documentation**: Update team on new capabilities

This implementation provides a solid foundation for Week 3 Hybrid Data integration and sets the stage for Week 4 Production enhancements.