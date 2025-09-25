# TODO - Week 2 Intelligence Layer

## Current Phase: Week 2 - Intelligence Layer
**Focus**: Building search capabilities and chat interface with query routing

**Week 1 Complete**: Foundation infrastructure established with 477 files indexed from Chelsea Piers Speedboat repository. See [progress.md](./progress.md) for complete milestone details.

---

## Active Issues (This Week)

### Issue #11: Search API Endpoint [P0 - Critical]
**Status**: Ready to implement
**GitHub**: https://github.com/afoxnyc3/speedboatAgent/issues/11

- [ ] Create `/api/search/route.ts` with Weaviate integration
- [ ] Implement GraphQL hybrid search queries
- [ ] Add query validation with Zod schemas
- [ ] Format search results with metadata
- [ ] Add error handling and logging
- [ ] Test with indexed Chelsea Piers content (477 files)
- [ ] Optimize search performance < 2s response time

### Issue #12: Chat Interface with Streaming [P0 - Critical]
**Status**: Ready to implement (depends on #11)
**GitHub**: https://github.com/afoxnyc3/speedboatAgent/issues/12

- [ ] Create `/api/chat/route.ts` with OpenAI integration
- [ ] Implement GPT-4 Turbo streaming responses
- [ ] Add Server-Sent Events for token-by-token display
- [ ] Integrate with search API for context retrieval
- [ ] Add source attribution to responses
- [ ] Handle conversation context
- [ ] Test streaming performance < 100ms first token

### Issue #13: Query Classification System [P1 - High]
**Status**: Ready to implement (depends on #11)
**GitHub**: https://github.com/afoxnyc3/speedboatAgent/issues/13

- [ ] Implement query classifier in `src/lib/search/query-classifier.ts`
- [ ] Define query types: technical/business/operational
- [ ] Add source authority weighting logic:
  - Technical: GitHub 1.5x, Web 0.5x
  - Business: GitHub 0.5x, Web 1.5x
  - Operational: Balanced 1.0x
- [ ] Train/configure classification model
- [ ] Test classification accuracy > 80%

### Issue #14: Frontend Chat Component [P1 - High]
**Status**: Ready to implement (parallel with backend)
**GitHub**: https://github.com/afoxnyc3/speedboatAgent/issues/14

- [ ] Create `src/components/chat/ChatInterface.tsx`
- [ ] Implement streaming message display
- [ ] Add source citation components
- [ ] Create responsive mobile + desktop layout
- [ ] Add loading states and error handling
- [ ] Integrate with chat API endpoint
- [ ] Add copy-to-clipboard functionality

### Issue #9: Redis Cache Setup [P1 - Optimization]
**Status**: Week 2 optimization (after core features)
**GitHub**: https://github.com/afoxnyc3/speedboatAgent/issues/9

- [ ] Create Upstash Redis instance
- [ ] Implement embedding cache in `src/lib/cache/embedding-cache.ts`
- [ ] SHA-256 hash generation for cache keys
- [ ] TTL configuration (24 hours default)
- [ ] Cache hit rate >70% targeting
- [ ] Cache warming strategies

---

## Week 2 Success Criteria

**Technical Targets:**
- [ ] Search API returning relevant results from 477 indexed files
- [ ] Chat interface streaming responses with source citations
- [ ] Query classification routing working with 80%+ accuracy
- [ ] Frontend responsive and user-friendly across devices
- [ ] End-to-end demo ready for team reveal

**Performance Targets:**
- [ ] Search response time < 2s (p95)
- [ ] Chat first token < 100ms
- [ ] Query classification < 50ms
- [ ] Zero hallucination incidents
- [ ] All responses include source citations

---

## Development Notes

### Architecture Decisions
- **Stealth Mode**: Local ingestion complete, no production webhooks yet
- **Data Source**: 477 files from Chelsea Piers Speedboat monorepo successfully indexed
- **Search Foundation**: Weaviate hybrid search (75% vector, 25% keyword) operational
- **Next Steps**: Connect search foundation to user interface

### Implementation Priority
1. **Search API** (blocks chat functionality)
2. **Chat Interface** (user-facing demo requirement)
3. **Frontend Components** (parallel development)
4. **Query Classification** (optimization layer)

### Week 1 Foundation Status
- ✅ Weaviate Cloud configured with 11-property schema
- ✅ Local ingestion pipeline processing 477 files
- ✅ OpenAI embeddings integration (text-embedding-3-large)
- ✅ Development tooling and scripts operational
- ✅ Zero production impact maintained (stealth mode)

---

## Upcoming (Week 3)
- Firecrawl web content ingestion
- Content deduplication pipeline
- Hybrid source routing optimization
- Weekly web crawl scheduling