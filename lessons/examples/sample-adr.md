# Sample Architecture Decision Record

> **Based on real ADRs from SpeedboatAgent project**

This file demonstrates how to write effective ADRs by showing real examples from the project.

## ADR Template Usage

Use this structure for all ADRs:

```markdown
## ADR-[NUMBER]: [TITLE]
Date: YYYY-MM-DD
Status: [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

### Context
[What is the issue we're addressing?]

### Decision
[What is the change we're making?]

### Consequences
#### Positive
- [Benefit 1]
- [Benefit 2]

#### Negative
- [Trade-off 1]
- [Trade-off 2]

### Alternatives Considered
1. **[Alternative 1]**
   - Pros: [List]
   - Cons: [List]
   - Why not chosen: [Reason]
```

---

## Example 1: Technology Choice

## ADR-014: Redis Multi-Layer Caching Architecture
Date: 2025-09-26
Status: Accepted

### Context
The RAG agent needed performance optimization to meet the 70% cache hit rate target and reduce response times. Multiple cache types (embeddings, search results, classifications, contextual queries) required different TTL policies and usage patterns.

### Decision
Implement a unified RedisCacheManager with multi-layer caching strategy:
- **Embeddings**: 24h TTL (expensive to generate, relatively stable)
- **Search Results**: 1h TTL (dynamic content, frequent updates)
- **Classifications**: 24h TTL (stable query types)
- **Contextual Queries**: 6h TTL (session-dependent, moderate frequency)

Key architectural choices:
- SHA-256 hash-based cache keys for consistency and collision avoidance
- Context isolation using session/user identifiers
- Performance monitoring with A-F grading system
- Proactive cache warming with domain-specific query sets

### Consequences
#### Positive
- 73% cache hit rate achieved (exceeds 70% target)
- Significant response time reduction (cache hits <100ms)
- API cost optimization through intelligent caching
- Real-time performance monitoring and health checks
- Scalable architecture supporting multiple cache types
- Production-ready with Upstash Redis integration

#### Negative
- Additional infrastructure dependency (Redis)
- Increased complexity in cache invalidation strategies
- Memory usage considerations for large cache datasets
- TTL management requires periodic optimization

### Alternatives Considered
1. **Single-layer caching with uniform TTL**
   - Pros: Simpler implementation, easier to reason about
   - Cons: Inefficient for different data access patterns, suboptimal hit rates
   - Why not chosen: Would not achieve 70% target

2. **In-memory caching only**
   - Pros: No external dependencies, faster access
   - Cons: Limited scalability, data loss on restart, no cross-instance sharing
   - Why not chosen: Not suitable for production deployment

3. **Database-based caching**
   - Pros: Persistent, transactional consistency
   - Cons: Slower than Redis, more complex queries, higher overhead
   - Why not chosen: Performance requirements demanded faster solution

---

## Example 2: Development Process

## ADR-016: E2E Testing Strategy Optimization
Date: 2025-09-29
Status: Accepted

### Context
E2E tests were blocking development velocity during active core development phase. Tests failing frequently due to unstable APIs, requiring constant maintenance while core functionality was still being built. CI/CD pipelines taking 20+ minutes vs 3-5 minutes, with team spending more time fixing flaky tests than building features.

### Decision
Implement strategic E2E testing pause with focus on testing pyramid:
- **Temporarily disable E2E tests in CI/CD** (manual trigger only via workflow_dispatch)
- **Preserve all Playwright infrastructure** for future re-enablement
- **Shift focus to unit/integration testing** (target: 70% unit, 25% integration, 5% E2E)
- **Timeline**: 2-3 week pause while core APIs stabilize
- **Clear re-enablement criteria**: API stability (1 week), unit coverage >70%, integration tests passing, P0 issues resolved

### Consequences
#### Positive
- **Development velocity increased by ~50%** (no E2E CI blocks)
- **Faster PR merge cycles** (3-5 min vs 20+ min CI runs)
- **Team focus on core stability** instead of test maintenance
- **Better ROI through targeted unit/integration testing**
- **All E2E infrastructure preserved** for seamless re-activation

#### Negative
- **Potential for E2E-specific regressions** during pause period
- **Risk of forgetting to re-enable** if criteria not tracked properly
- **Less confidence in full user journeys** during development phase

### Alternatives Considered
1. **Fix all E2E tests immediately**
   - Pros: Full coverage maintained, no gaps in testing
   - Cons: Would consume 2-3 days while APIs still changing, low ROI during development
   - Why not chosen: Poor time investment during active development

2. **Reduce E2E test scope** (keep subset running)
   - Pros: Some E2E coverage maintained, partial velocity improvement
   - Cons: Still blocks PRs intermittently, provides only partial benefits
   - Why not chosen: Didn't solve core problem

3. **Remove E2E tests entirely**
   - Pros: Maximum velocity, no maintenance burden whatsoever
   - Cons: Complete loss of infrastructure, very difficult to restore later
   - Why not chosen: Too risky, wanted to preserve investment

### Implementation
- Updated `.github/workflows/e2e.yml` to manual-only trigger
- Created Issues #85 (browser optimization) and #86 (pause tracking)
- Updated README.md, roadmap.md, todo.md documentation
- Preserved all Playwright configuration and test files intact

---

## Example 3: Architecture Pattern

## ADR-003: Modular Search API Architecture
Date: 2025-09-26
Status: Accepted

### Context
Initial Search API implementation violated project code quality standards (functions >15 lines, files >100 lines) while delivering comprehensive functionality including hybrid search, query classification, validation, and error handling.

### Decision
Refactor Search API into modular architecture with focused, single-purpose modules:
- `/src/lib/search/hybrid-search.ts` - Core Weaviate search logic
- `/src/lib/search/search-utils.ts` - Helper functions and utilities
- `/src/lib/search/search-validation.ts` - Request validation and processing
- `/src/lib/search/error-handler.ts` - Centralized error handling
- `/src/lib/search/search-orchestrator.ts` - Workflow coordination
- `/app/api/search/route.ts` - Minimal route handlers only

### Consequences
#### Positive
- All functions under 15 lines, files under specified limits
- Improved testability with isolated functions
- Better maintainability and code review process
- Reusable utilities for future search functionality
- Cleaner separation of concerns

#### Negative
- Increased number of files to maintain
- More import statements across modules
- Slightly more complex navigation for developers

### Alternatives Considered
1. **Disable linting rules for search API**
   - Pros: Keep all logic in single file
   - Cons: Violates project standards, harder to maintain and test
   - Why not chosen: Quality standards are project-wide

2. **Simplify functionality to fit size constraints**
   - Pros: Smaller codebase
   - Cons: Loss of production-ready features like comprehensive error handling
   - Why not chosen: Features were essential for production

---

## Key Lessons from These ADRs

### What Makes a Good ADR

1. **Clear Context**: Explains the problem being solved
2. **Specific Decision**: No ambiguity about what was chosen
3. **Honest Trade-offs**: Lists both pros and cons
4. **Alternatives**: Shows other options considered
5. **Implementation**: How the decision was executed (optional)

### When to Write an ADR

✅ **Yes** - Write ADR for:
- Choosing between frameworks/technologies
- Architectural patterns (microservices vs monolith)
- Data storage strategies
- Security approaches
- Major process changes (like E2E test pause)

❌ **No** - Don't write ADR for:
- Variable naming decisions
- Minor refactorings
- Temporary workarounds
- Obvious choices

### ADR Writing Tips

1. **Write immediately** - Context is fresh
2. **Be honest** - Document real trade-offs
3. **Show alternatives** - Proves you considered options
4. **Update status** - Mark as Deprecated/Superseded when relevant
5. **Link related ADRs** - Create decision network

### Common Mistakes

❌ **Too vague**: "We chose Redis because it's fast"
✅ **Specific**: "We chose Redis for 24h embedding cache because..."

❌ **No alternatives**: Only documents chosen solution
✅ **Complete**: Shows 2-3 alternatives with pros/cons

❌ **All positive**: Only lists benefits
✅ **Balanced**: Honest about trade-offs

❌ **Too late**: Written months after decision
✅ **Timely**: Written during/immediately after decision

---

## Additional ADR Examples from SpeedboatAgent

### Quick Reference List

1. **ADR-001**: TDD Enforcement - Red-Green-Refactor methodology
2. **ADR-002**: Parallel Subagent Development - Concurrent agent execution
3. **ADR-003**: Modular Search API Architecture - File size limits
4. **ADR-004**: Temporary CI/CD Strictness Relaxation - Pragmatic standards
5. **ADR-005**: Firecrawl Integration Architecture - Web crawling strategy
6. **ADR-006**: ESLint Configuration Adjustment - Practical code limits
7. **ADR-007**: File-Based Feedback Storage - MVP storage strategy
8. **ADR-014**: Redis Multi-Layer Caching - Performance optimization
9. **ADR-015**: Sentry Monitoring Integration - Error tracking strategy
10. **ADR-016**: E2E Testing Strategy Optimization - Development velocity

See full ADRs in the SpeedboatAgent `decision-log.md` for more examples.

---

*Use this template and examples to create effective ADRs for your project*