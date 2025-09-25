# Session Plan: 2025-09-25 - Week 3 Hybrid Data Integration

## Session Overview
**Date**: 2025-09-25
**Duration**: 4-6 hours
**Focus**: Firecrawl web ingestion and deduplication pipeline implementation
**Week**: Week 3 - Hybrid Data Phase

## Session Objectives
### Primary Goals
- [ ] Implement Firecrawl web ingestion pipeline
- [ ] Create content deduplication system with SHA-256 hashing
- [ ] Set up hybrid source routing with authority weighting

### GitHub Issues
- **Primary**: Issue #18 - Firecrawl web ingestion setup
- **Secondary**: Issue #19 - Deduplication pipeline
- **Tertiary**: Issue #20 - Source routing optimization
- **Dependencies**: Week 2 Intelligence Layer complete (✅), CI passing (✅)

## Current Context
### Project State
- ✅ Week 2 Intelligence Layer complete: Search API, Query Classification, Frontend Chat
- ✅ CI infrastructure stabilized: all GitHub Actions passing
- ✅ 477 files indexed from GitHub repository via local ingestion
- ✅ Weaviate Cloud configured with hybrid search (75% vector, 25% keyword)
- ✅ Query classification system operational with GPT-4 and Redis caching

### Dependencies Met
- ✅ Weaviate schema configured and operational
- ✅ OpenAI embeddings integration working (text-embedding-3-large, 1024 dims)
- ✅ Search API endpoint accepting queries and returning results
- ✅ TypeScript foundations with comprehensive type system
- ✅ Development environment with all required services

### Blockers/Risks
- **Risk**: Firecrawl API rate limits during web crawling
  - **Mitigation**: Implement throttling and retry logic
- **Risk**: Content duplication between GitHub and web sources
  - **Mitigation**: SHA-256 hashing with GitHub content precedence
- **Risk**: Performance degradation with larger dataset
  - **Mitigation**: Implement chunking and batch processing

## Implementation Plan

### Task 1: Firecrawl Web Ingestion Setup
**Time Estimate**: 2 hours
**Priority**: Critical (P0)
**Agent**: `ingestion-pipeline` (per CLAUDE.md guidelines)

#### Subtasks:
- [ ] Install and configure Firecrawl SDK integration
- [ ] Create web crawling service in `/src/lib/ingestion/web-crawler.ts`
- [ ] Implement selective domain crawling (docs.*, api.*, help.*)
- [ ] Add exclusion patterns (/blog/*, /careers/*, /legal/*)
- [ ] Test with sample target domains

#### Technical Details:
- **Location**: `/src/lib/ingestion/web-crawler.ts`
- **Dependencies**: Firecrawl API key, target domain list
- **Key Functions**: `crawlWebDomains()`, `filterCrawlResults()`, `processWebContent()`

### Task 2: Content Deduplication Pipeline
**Time Estimate**: 1.5 hours
**Priority**: Critical (P0)
**Agent**: `ingestion-pipeline`

#### Subtasks:
- [ ] Implement SHA-256 content hashing in `/src/lib/ingestion/deduplication.ts`
- [ ] Create content comparison and conflict resolution logic
- [ ] Establish GitHub content precedence rules
- [ ] Add canonical URL tracking
- [ ] Test with duplicate content scenarios

### Task 3: Hybrid Source Routing Integration
**Time Estimate**: 1 hour
**Priority**: High (P1)
**Agent**: `weaviate-expert` + `rag-optimizer`

#### Subtasks:
- [ ] Update search orchestrator to handle web + GitHub sources
- [ ] Implement authority weighting (GitHub 1.2x, Web 0.8x)
- [ ] Update query classification to route between sources
- [ ] Test hybrid search results with both source types

### Task 4: Web Ingestion API Endpoint
**Time Estimate**: 1 hour
**Priority**: Medium (P2)

#### Subtasks:
- [ ] Create `/app/api/ingest/web/route.ts` endpoint
- [ ] Add web crawl trigger functionality
- [ ] Implement job queuing for large crawl operations
- [ ] Add progress tracking and status reporting

## Success Criteria

### Functional Requirements
- [ ] Firecrawl successfully crawls target domains and extracts content
- [ ] Deduplication prevents redundant content with GitHub precedence
- [ ] Hybrid search returns results from both GitHub and web sources
- [ ] Web crawling respects exclusion patterns and rate limits

### Technical Requirements
- [ ] Code quality: Functions <15 lines, files <100 lines (per CLAUDE.md)
- [ ] Tests: Unit tests for all new ingestion functions
- [ ] Performance: Web crawling <5min for typical domain set
- [ ] Security: Firecrawl API keys properly secured in environment

### Performance Targets
- **Web Crawl Time**: < 5 minutes for typical domain
- **Deduplication Rate**: > 40% duplicate content detected
- **Search Response Time**: Still < 2s with hybrid sources
- **Content Coverage**: 95% query coverage from hybrid sources

## Agent and Tool Strategy (CLAUDE.md Compliance)

### Specialized Agents to Use
- `ingestion-pipeline`: Primary agent for Firecrawl integration and deduplication pipeline
- `weaviate-expert`: For schema updates and hybrid search optimization
- `rag-optimizer`: For source routing and query classification updates
- `perf-validator`: For performance testing of ingestion pipeline

### Slash Commands to Utilize
- `/crawl-docs [domains] [mode]`: Initiate web documentation crawling
- `/weaviate-setup prod`: Update schema for web content support
- `/test-rag hybrid`: Validate hybrid search functionality
- `/check-metrics ingestion`: Monitor ingestion pipeline performance

### Parallel Execution Opportunities
- Firecrawl integration can run parallel with deduplication logic development
- Schema updates can happen while web content processing is built
- Testing can run in parallel once core components are complete

## Testing Strategy
- [ ] Unit tests for web crawler, deduplication, and routing functions
- [ ] Integration tests for full web ingestion → Weaviate flow
- [ ] Manual testing with real target domains
- [ ] Performance benchmarking for crawl time and deduplication efficiency
- [ ] Hybrid search accuracy testing with mixed source results

## Risk Mitigation
- **Risk**: Firecrawl API rate limiting
  - **Probability**: Medium
  - **Impact**: High
  - **Mitigation**: Implement exponential backoff, batch processing, and fallback strategies

- **Risk**: Content quality from web scraping
  - **Probability**: Medium
  - **Impact**: Medium
  - **Mitigation**: Content filtering, quality scoring, and manual review process

## Development Environment
### Required Services
- [ ] Firecrawl API access with valid API key
- [ ] Weaviate Cloud instance accessible and operational
- [ ] OpenAI API for embeddings during web content processing
- [ ] Redis cache for deduplication hash storage

### Tools Needed
- [ ] Firecrawl SDK for Node.js
- [ ] SHA-256 hashing library (Node.js crypto)
- [ ] Content processing utilities (LlamaIndex)

## Expected Artifacts
### Files to Create/Modify
- [ ] `/src/lib/ingestion/web-crawler.ts` - Firecrawl integration service
- [ ] `/src/lib/ingestion/deduplication.ts` - Content deduplication pipeline
- [ ] `/app/api/ingest/web/route.ts` - Web ingestion API endpoint
- [ ] `/src/lib/search/hybrid-search.ts` - Updated for web content support
- [ ] `/tests/ingestion/web-crawler.test.ts` - Test coverage for web ingestion

### Documentation Updates
- [ ] Update CLAUDE.md with Firecrawl configuration details
- [ ] Update README.md with hybrid data setup instructions
- [ ] Add JSDoc comments to all ingestion functions

## Time Allocation
- **Setup/Planning**: 30 minutes
- **Firecrawl Integration**: 2 hours
- **Deduplication Pipeline**: 1.5 hours
- **Hybrid Routing**: 1 hour
- **API Endpoint**: 1 hour
- **Testing/Validation**: 1 hour
- **Documentation**: 30 minutes
- **Total**: 6.5 hours (with buffer)

## Next Session Setup
### On Success
- Week 4 Production phase: Mem0 memory integration, feedback system
- Performance optimization and caching layer implementation
- Load testing with full hybrid dataset

### On Partial Completion
- Prioritize core Firecrawl integration over advanced features
- Defer API endpoint to Week 4 if needed
- Focus on getting hybrid search working end-to-end

### Notes for Future
- Web crawling frequency and automation (scheduled crawls)
- Cost optimization for Firecrawl usage
- Content quality scoring and filtering improvements

---
*Plan created: 2025-09-25*
*Following CLAUDE.md session documentation workflow*
*Ready to commit before work session begins*