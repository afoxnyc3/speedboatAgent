# TODO - Week 1 Foundation Tasks

## Current Phase: Week 1 - Foundation
**Focus**: Core infrastructure, Weaviate setup, and GitHub ingestion with LlamaIndex

---

## Immediate Tasks (Today/Tomorrow)

### Issue #5: Weaviate Cloud Setup [P0 - Critical]
- [ ] Create Weaviate Cloud account
- [ ] Set up cluster with hybrid search enabled
- [ ] Design Document schema with properties:
  - [ ] content (text)
  - [ ] source (string: github|web)
  - [ ] filepath (string)
  - [ ] url (string)
  - [ ] lastModified (date)
  - [ ] priority (number)
  - [ ] language (string)
  - [ ] metadata (object)
- [ ] Configure text-embedding-3-large vectorizer (1024 dims)
- [ ] Set up reranker-transformers module
- [ ] Configure hybrid search weights (75% vector, 25% keyword)
- [ ] Write connection test in `src/lib/weaviate/client.ts`
- [ ] Create schema initialization in `src/lib/weaviate/schema.ts`
- [ ] Verify with `npm run test:weaviate`

### Issue #6: GitHub Ingestion with LlamaIndex [P0 - Critical]
- [ ] Install LlamaIndex dependencies
- [ ] Set up GitHub API authentication
- [ ] Implement repository reader with LlamaIndex
- [ ] Configure AST-aware parsing for TypeScript
- [ ] Support file types: `.ts`, `.tsx`, `.md`, `.mdx`, `.json`, `.yaml`
- [ ] Implement chunking strategy
- [ ] Set priority weighting (1.2x for GitHub)
- [ ] Create ingestion pipeline in `src/lib/ingestion/github-processor.ts`
- [ ] Test with sample repository

### Issue #7: GitHub Webhook Handler [P0 - Critical]
- [ ] Create webhook endpoint at `/api/ingest/github/route.ts`
- [ ] Implement HMAC signature validation
- [ ] Parse webhook payload with Zod
- [ ] Set up BullMQ for job queuing
- [ ] Configure job processing < 30s
- [ ] Add retry logic for failures
- [ ] Test with GitHub webhook tester

---

## This Week Tasks

### Issue #8: Basic Hybrid Search [P1 - High]
- [ ] Implement GraphQL queries to Weaviate
- [ ] Create search interface in `src/lib/search/hybrid-search.ts`
- [ ] Format search results
- [ ] Add basic ranking logic
- [ ] Create API endpoint at `/api/search/route.ts`
- [ ] Test search accuracy

### Issue #9: Redis Cache Setup [P1 - High]
- [ ] Create Upstash Redis account
- [ ] Configure Redis connection
- [ ] Implement embedding cache in `src/lib/cache/embedding-cache.ts`
- [ ] SHA-256 hash generation for cache keys
- [ ] TTL configuration (24 hours default)
- [ ] Cache hit/miss metrics tracking
- [ ] Create cache warming strategy

### Environment & Project Setup
- [ ] Create `.env.example` with all variables:
  - [ ] OPENAI_API_KEY
  - [ ] WEAVIATE_HOST & WEAVIATE_API_KEY
  - [ ] GITHUB_TOKEN & GITHUB_WEBHOOK_SECRET
  - [ ] UPSTASH_REDIS_URL & UPSTASH_REDIS_TOKEN
  - [ ] MEM0_API_KEY (Week 4)
  - [ ] FIRECRAWL_API_KEY (Week 3)
  - [ ] SENTRY_DSN
- [ ] Install dependencies:
  - [ ] weaviate-ts-client
  - [ ] llamaindex
  - [ ] @upstash/redis
  - [ ] openai
  - [ ] bullmq
  - [ ] zod
- [ ] Configure TypeScript strict mode
- [ ] Set up ESLint rules (15-line functions, 100-line files)
- [ ] Create folder structure per specification

### Testing Infrastructure
- [ ] Set up Jest/Vitest
- [ ] Write Weaviate connection tests
- [ ] Write LlamaIndex ingestion tests
- [ ] Write cache operation tests
- [ ] Create CI pipeline

---

## Week 1 Success Criteria
- ✅ Weaviate schema deployed and tested
- ✅ GitHub content indexed via LlamaIndex
- ✅ Basic search returning results
- ✅ Cache operational with metrics
- ✅ Search latency < 500ms
- ✅ Cache hit rate > 30%

---

## Upcoming (Week 2)
- Query classification system
- Source authority weighting
- OpenAI GPT-4 Turbo integration
- Streaming chat interface
- Source attribution

---

## Blockers & Dependencies

### Current Blockers
- None yet

### Required Accounts/Services
- ⚠️ Weaviate Cloud account needed
- ⚠️ OpenAI API key needed
- ⚠️ GitHub token needed
- ⚠️ Upstash Redis instance needed
- 📝 Mem0 account (Week 4)
- 📝 Firecrawl API (Week 3)

### Notes
- Start with Weaviate (critical path dependency)
- LlamaIndex setup is second priority
- Use mock data if services unavailable
- Document any issues in CLAUDE.md
- Track costs from day 1

---

## Daily Standup

### Today's Focus
**Goal**: Set up Weaviate and start LlamaIndex integration
**Tasks**:
1. Weaviate Cloud account and schema
2. LlamaIndex installation and setup
3. Basic GitHub reader implementation
**Blockers**: Need service accounts
**EOD Target**: Weaviate connected, LlamaIndex installed