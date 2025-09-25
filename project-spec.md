# RAG Agent Project Specification

## Product Requirements

### Overview
AI-powered knowledge assistant for company website that provides instant, accurate answers from GitHub repository documentation and codebase.

### Core Features
- **Intelligent Q&A**: Natural language queries against company codebase
- **Hybrid Data Sources**: GitHub repos + web-scraped documentation
- **Auto-sync**: GitHub webhook integration for real-time updates
- **Source Attribution**: Direct links to relevant code/docs with authority weighting
- **Session Memory**: Contextual awareness across conversations
- **Feedback Loop**: Continuous improvement from user corrections

### Success Metrics
- Response time < 2s (p95)
- Relevance score > 85%
- Cache hit rate > 70%
- Zero hallucination policy
- 40 engineering hours saved vs custom search infrastructure

## Architecture

### Tech Stack
```yaml
Frontend:       Next.js 14 (App Router) + TypeScript
Vector DB:      Weaviate Cloud (Hybrid Search)
Embeddings:     OpenAI text-embedding-3-large (1024 dims)
LLM:            OpenAI GPT-4 Turbo
Doc Processing: LlamaIndex + Firecrawl
Memory:         Mem0
Cache:          Upstash Redis
Queue:          BullMQ
Monitoring:     Sentry + Vercel Analytics
```

### Data Flow
```mermaid
GitHub Push → Webhook → BullMQ → LlamaIndex → Embeddings → Weaviate
                                       ↓                        ↑
Web Crawl → Firecrawl → Deduplication → Embeddings ───────────┘
                                       ↓
User Query → Query Classifier → Hybrid Search → Rerank → GPT-4 → Stream
                ↓                                           ↑
              Mem0 ←────────────── Feedback ───────────────┘
```

### API Endpoints
```typescript
POST   /api/chat          // Streaming chat interface
POST   /api/ingest/github // GitHub webhook receiver
POST   /api/ingest/web    // Web crawl trigger
GET    /api/search        // Direct hybrid search
POST   /api/feedback      // User feedback collection
GET    /api/health        // System status
```

### Security
- API key rotation via Vercel KV
- Rate limiting: 100 req/min per IP
- Input sanitization with Zod schemas
- GitHub webhook signature verification

## Data Ingestion Strategy

### Phase 1: GitHub Foundation (Week 1)
- Direct repository ingestion via GitHub API
- AST-aware code parsing with LlamaIndex
- Priority: 1.2x boost for authoritative source
- File types: `.ts`, `.tsx`, `.md`, `.mdx`, `.json`, `.yaml`

### Phase 2: Hybrid Enhancement (Week 3)
- Selective web crawling with Firecrawl
- Targets: `docs.company.com`, `api.company.com`, `help.company.com`
- Deduplication via content hashing (SHA-256)
- Priority: 0.8x for web-scraped content
- Exclude patterns: `/blog/*`, `/careers/*`, `/legal/*`

### Intelligent Query Routing
```typescript
// Query classification and source boosting
const routeQuery = async (query: string) => {
  const queryType = await classifyQuery(query);
  
  return {
    'technical':    { github: 1.5, web: 0.5 },
    'business':     { github: 0.5, web: 1.5 },
    'operational':  { github: 1.0, web: 1.0 }
  }[queryType];
};
```

### Deduplication Pipeline
```typescript
// Content hashing strategy
interface ContentHash {
  hash: string;
  source: 'github' | 'web';
  priority: number;
  canonical: boolean;
}

// GitHub content takes precedence
const deduplicateContent = (sources: Document[]) => {
  const seen = new Map<string, Document>();
  
  sources
    .sort((a, b) => b.priority - a.priority)
    .forEach(doc => {
      const hash = sha256(normalize(doc.content));
      if (!seen.has(hash)) {
        seen.set(hash, doc);
      }
    });
  
  return Array.from(seen.values());
};
```

## UX Design

### Chat Interface
```
┌─────────────────────────────────────┐
│ 🔍 Ask about our codebase...        │
├─────────────────────────────────────┤
│                                     │
│ User: How do we handle auth?       │
│                                     │
│ Assistant: We use JWT tokens...    │
│ 📎 auth/middleware.ts:L42-58 (GitHub)│
│ 📄 docs.company.com/auth (Web)     │
│                                     │
│ [👍] [👎] [Copy] [Share]           │
└─────────────────────────────────────┘
```

### Key Interactions
- **Streaming responses** with token-by-token display
- **Source indicators** (GitHub vs Web) with authority levels
- **Collapsible source viewer** for code references
- **Inline feedback** without interrupting flow
- **Copy code** with syntax highlighting preserved
- **Search history** in local storage

### Performance
- Skeleton loaders during search
- Optimistic UI updates
- 50KB initial JS bundle target
- Progressive enhancement

## Weaviate Configuration

### Schema Design
```javascript
{
  "classes": [{
    "class": "Document",
    "properties": [
      { "name": "content", "dataType": ["text"] },
      { "name": "source", "dataType": ["string"] },  // github|web
      { "name": "filepath", "dataType": ["string"] },
      { "name": "url", "dataType": ["string"] },
      { "name": "lastModified", "dataType": ["date"] },
      { "name": "priority", "dataType": ["number"] },
      { "name": "language", "dataType": ["string"] },
      { "name": "metadata", "dataType": ["object"] }
    ],
    "vectorizer": "text2vec-openai",
    "moduleConfig": {
      "text2vec-openai": {
        "model": "text-embedding-3-large",
        "dimensions": 1024
      },
      "reranker-transformers": {
        "model": "cross-encoder-ms-marco-MiniLM-L-6-v2"
      }
    }
  }]
}
```

### Hybrid Search Configuration
```typescript
const search = await client.graphql
  .get('Document')
  .withHybrid({
    query: userQuery,
    alpha: 0.75,  // 75% vector, 25% keyword
    fusionType: 'relativeScoreFusion'
  })
  .withWhere({
    path: ['source'],
    operator: 'Equal',
    valueString: sourceFilter
  })
  .withLimit(10)
  .do();
```

## External References

### Core Technologies
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)

### Vector & Processing
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [Weaviate Hybrid Search](https://weaviate.io/developers/weaviate/search/hybrid)
- [LlamaIndex GitHub Reader](https://docs.llamaindex.ai/en/stable/examples/data_connectors/GithubRepositoryReaderDemo/)
- [Firecrawl Documentation](https://docs.firecrawl.dev/)

### Infrastructure
- [Upstash Redis](https://docs.upstash.com/redis)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Mem0 SDK](https://docs.mem0.ai/)
- [Vercel Deployment](https://vercel.com/docs)

### Monitoring & Analytics
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Analytics](https://vercel.com/docs/analytics)

### Embedding Models
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Text-embedding-3 Details](https://platform.openai.com/docs/guides/embeddings/embedding-models)

## Implementation Timeline

### Week 1: Foundation
- Weaviate schema design & setup
- GitHub ingestion pipeline with LlamaIndex
- Basic hybrid search implementation

### Week 2: Intelligence
- Query classification system
- Source authority weighting
- Response streaming with citations

### Week 3: Hybrid Data
- Firecrawl web ingestion
- Deduplication pipeline
- Source routing optimization

### Week 4: Production
- Mem0 conversation memory
- Feedback system
- Cache layer & monitoring

## Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=
WEAVIATE_HOST=
WEAVIATE_API_KEY=
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=

# Cache & Queue
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Memory
MEM0_API_KEY=

# Web Crawling
FIRECRAWL_API_KEY=

# Monitoring
SENTRY_DSN=
VERCEL_ENV=
```

### Repository Structure
```
/src
  /app          # Next.js app router
  /lib
    /ingestion  # GitHub & web crawl pipelines
    /search     # Hybrid search & routing
    /cache      # Redis caching layer
  /components   # React components
  /types        # TypeScript definitions
/scripts        # Build and deployment
/tests          # Test suites
```

## Cost Projections

| Component | Monthly Estimate | Optimization Strategy |
|-----------|-----------------|----------------------|
| OpenAI API | $200-400 | Embedding cache, dimension reduction |
| Weaviate | $99 | Hybrid search reduces dual queries |
| Upstash | $10 | TTL policies, selective caching |
| Mem0 | $49 | User-level memory only |
| Firecrawl | $29 | Weekly crawls, change detection |
| **Total** | **~$387-587** | Target 40% reduction via cache |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API Rate Limits | Queue-based processing, exponential backoff |
| Stale Data | 5-minute webhook retry, daily sync validation |
| Content Duplication | SHA-256 hashing, source priority weighting |
| Hallucination | Temperature 0.3, mandatory source citations |
| Cost Overrun | Request throttling, embedding cache, budget alerts |

## Success Criteria

### Technical Metrics
- 95% query coverage from hybrid sources
- < 100ms p50 vector search latency
- 0% hallucination rate with source verification
- 70%+ cache hit rate for embeddings

### Business Metrics
- 40 engineering hours saved vs custom implementation
- 50% reduction in documentation discovery time
- 85%+ user satisfaction score
- ROI positive within 60 days

## Launch Checklist

- [ ] Weaviate schema configured with hybrid search
- [ ] GitHub webhook integrated and tested
- [ ] Initial repository content indexed
- [ ] Web crawl targets identified and tested
- [ ] Deduplication pipeline validated
- [ ] Query routing logic deployed
- [ ] Rate limiting enabled
- [ ] Error tracking active with Sentry
- [ ] Load testing complete (1000 concurrent users)
- [ ] Security review passed
- [ ] Cost monitoring dashboards live
- [ ] Team training completed