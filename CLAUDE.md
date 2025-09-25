# CLAUDE.md - RAG Agent Technical Reference

## Project Overview
AI-powered knowledge assistant that provides instant, accurate answers from GitHub repository documentation and codebase with hybrid web-scraped content.

## Mission Statement
Build a production-ready RAG agent that saves 40 engineering hours through intelligent code understanding and documentation retrieval with zero hallucination tolerance.

## Core Features
- **Intelligent Q&A**: Natural language queries against company codebase
- **Hybrid Data Sources**: GitHub repos + web-scraped documentation
- **Auto-sync**: GitHub webhook integration for real-time updates
- **Source Attribution**: Direct links with authority weighting
- **Session Memory**: Contextual awareness via Mem0
- **Feedback Loop**: Continuous improvement from user corrections

## Technical Architecture

### Core Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Vector DB**: Weaviate Cloud (Hybrid Search)
- **Embeddings**: OpenAI text-embedding-3-large (1024 dims)
- **LLM**: OpenAI GPT-4 Turbo
- **Doc Processing**: LlamaIndex + Firecrawl
- **Memory**: Mem0
- **Cache**: Upstash Redis
- **Queue**: BullMQ
- **Monitoring**: Sentry + Vercel Analytics

### Data Flow
```
GitHub Push → Webhook → BullMQ → LlamaIndex → Embeddings → Weaviate
                                      ↓                        ↑
Web Crawl → Firecrawl → Deduplication → Embeddings ─────────┘
                                      ↓
User Query → Query Classifier → Hybrid Search → Rerank → GPT-4 → Stream
               ↓                                           ↑
             Mem0 ←────────────── Feedback ──────────────┘
```

### Performance Requirements
- Response time: < 2s (p95)
- Relevance score: > 85%
- Cache hit rate: > 70%
- Zero hallucination policy
- Push event processing: < 30s

## Session Documentation Workflow

### Before Starting Work Session
AI agents must create session documentation before beginning implementation work:

1. **Create Session Plan**: `/sessions/YYYY-MM-DD-<topic>-plan.md`
   - Session objectives and goals
   - Current context and dependencies
   - Detailed implementation plan with task breakdown
   - Success criteria and performance targets
   - Time allocation and priority order

2. **Reference Issues**: Link relevant GitHub issues and dependencies

3. **Commit Plan**: Save session plan before starting implementation

### After Completing Work Session
AI agents must document outcomes after completing work:

1. **Create Session Summary**: `/sessions/YYYY-MM-DD-<topic>-summary.md`
   - Completed work with specific details
   - Artifacts created (files, PRs, issues)
   - Performance metrics and benchmarks achieved
   - Challenges encountered and solutions implemented
   - Next session setup and recommendations

2. **Update Progress**: Add high-level summary to `progress.md`

3. **Link Documentation**: Reference session docs from progress.md for traceability

4. **Commit Results**: Save all documentation with implementation

### Session Directory Structure
```
/sessions/
├── README.md                    # Index of all sessions with links
├── templates/
│   ├── session-plan.md         # Planning template
│   └── session-summary.md      # Summary template
└── YYYY-MM-DD-<topic>.md       # Individual session documents
```

### Session Documentation Standards
- Use consistent naming: `YYYY-MM-DD-<week#>-<focus-area>`
- Include GitHub issue numbers and links
- Document both planned and actual outcomes
- Capture technical decisions and rationale
- Measure progress against success criteria
- Provide clear handoff notes for next session

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

## Project Structure
```
/src
  /app
    /api
      /chat/route.ts          # Streaming chat interface
      /ingest
        /github/route.ts      # GitHub webhook receiver
        /web/route.ts         # Web crawl trigger
      /search/route.ts        # Direct hybrid search
      /feedback/route.ts      # User feedback collection
      /health/route.ts        # System status
  /lib
    /ingestion
      /github-processor.ts    # LlamaIndex GitHub ingestion
      /web-crawler.ts        # Firecrawl web ingestion
      /deduplication.ts      # Content deduplication
    /search
      /hybrid-search.ts      # Weaviate queries
      /query-classifier.ts   # Query type detection
      /reranker.ts          # Result reranking
    /cache
      /embedding-cache.ts    # Redis caching layer
    /memory
      /mem0-client.ts       # Conversation memory
    /weaviate
      /client.ts            # Connection management
      /schema.ts            # Schema definition
  /components
    /chat
      /ChatInterface.tsx    # Main UI component
      /SourceViewer.tsx     # Citation display
      /FeedbackWidget.tsx   # User feedback
  /types
    /index.ts              # TypeScript definitions
```

## Development Standards

### Code Quality Gates
- **TypeScript**: No 'any' types, strict mode enabled
- **Validation**: Zod schemas for all API inputs
- **Error Handling**: Try-catch with Sentry reporting
- **Testing**: Unit tests for critical paths
- **Functions**: 15 lines max
- **Files**: 100 lines max
- **Classes**: 50 lines max

### Specialized Agent Usage
**IMPORTANT**: This project includes specialized Claude Code agents that MUST be used for their respective domains:

- **Use `weaviate-expert`** for all Weaviate schema design, hybrid search optimization, vector database operations, and query performance tuning
- **Use `ingestion-pipeline`** for GitHub webhook processing, LlamaIndex integration, Firecrawl web crawling, and content deduplication
- **Use `rag-optimizer`** for query classification, response quality improvement, Mem0 memory integration, and feedback system implementation
- **Use `perf-validator`** for performance testing, metrics validation, load testing, and SLA compliance verification

**Agent Invocation Guidelines**:
- Agents should be invoked proactively when working on their specialized domains
- Use parallel agent execution for independent tasks (e.g., `weaviate-expert` + `perf-validator`)
- Agents have access to project-specific context and enforce coding standards automatically
- Each agent maintains expertise in their domain's best practices and optimization techniques

**Available Slash Commands**:
- `/weaviate-setup [env]` - Initialize Weaviate schema with hybrid search
- `/ingest-github <repo-url> [branch]` - Trigger GitHub ingestion pipeline
- `/test-rag [test-type] [query]` - Execute RAG pipeline validation
- `/check-metrics [metric-type] [time-range]` - Validate performance against SLAs
- `/deploy-webhook <repo-url> [webhook-url]` - Set up GitHub webhook integration
- `/crawl-docs [domains] [mode]` - Initiate web documentation crawling

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
- 75% vector, 25% keyword weighting
- Fusion type: relativeScoreFusion
- Query classification for source boosting
- Reranking with cross-encoder

## Environment Configuration
```env
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

## Query Routing Strategy
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

## Deduplication Pipeline
- SHA-256 content hashing
- GitHub content takes precedence
- Source priority weighting
- Canonical URL tracking

## Success Metrics
- 95% query coverage from hybrid sources
- < 100ms p50 vector search latency
- 0% hallucination rate with source verification
- 70%+ cache hit rate for embeddings
- 40 engineering hours saved
- 50% reduction in documentation discovery time
- 85%+ user satisfaction score

## Cost Projections
| Component | Monthly Estimate | Optimization Strategy |
|-----------|-----------------|----------------------|
| OpenAI API | $200-400 | Embedding cache, dimension reduction |
| Weaviate | $99 | Hybrid search reduces dual queries |
| Upstash | $10 | TTL policies, selective caching |
| Mem0 | $49 | User-level memory only |
| Firecrawl | $29 | Weekly crawls, change detection |
| **Total** | **~$387-587** | Target 40% reduction via cache |

## Git Workflow

### Branches
- `feature/<issue-id>-<description>`
- `fix/<issue-id>-<description>`
- `chore/<description>`

### Commits
```
<type>: #<issue-id> <imperative-summary>
```
Types: feat, fix, chore, docs, refactor, test

## Launch Checklist

**Note**: For current progress status, see [progress.md](./progress.md)

- [ ] Weaviate schema configured with hybrid search (`/weaviate-setup`)
- [ ] GitHub webhook integrated and tested (`/deploy-webhook`)
- [ ] Initial repository content indexed via LlamaIndex (`/ingest-github`)
- [ ] Web crawl targets identified and tested with Firecrawl (`/crawl-docs`)
- [ ] Deduplication pipeline validated (use `ingestion-pipeline` agent)
- [ ] Query routing logic deployed (use `rag-optimizer` agent)
- [ ] Mem0 memory integration complete (use `rag-optimizer` agent)
- [ ] Rate limiting enabled
- [ ] Error tracking active with Sentry
- [ ] Load testing complete (use `perf-validator` agent, `/test-rag performance`)
- [ ] Security review passed
- [ ] Cost monitoring dashboards live (`/check-metrics cost`)
- [ ] Team training completed on agent usage and slash commands

## Agent Development Workflow

### Phase-Based Agent Usage
**Week 1 - Foundation**: Primary use of `weaviate-expert` and `ingestion-pipeline` agents
**Week 2 - Intelligence**: Primary use of `rag-optimizer` agent with `weaviate-expert` support
**Week 3 - Hybrid Data**: Primary use of `ingestion-pipeline` agent for web crawling
**Week 4 - Production**: Primary use of `perf-validator` agent with all others as needed

### Task-to-Agent Mapping
| Task Type | Primary Agent | Supporting Agents | Slash Commands |
|-----------|---------------|-------------------|----------------|
| Schema Design | `weaviate-expert` | - | `/weaviate-setup` |
| Data Ingestion | `ingestion-pipeline` | - | `/ingest-github`, `/crawl-docs` |
| Query Optimization | `rag-optimizer` | `weaviate-expert` | `/test-rag` |
| Performance Testing | `perf-validator` | All agents | `/check-metrics`, `/test-rag performance` |
| Webhook Setup | `ingestion-pipeline` | - | `/deploy-webhook` |
| System Monitoring | `perf-validator` | - | `/check-metrics` |