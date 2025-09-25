# Session Plan: 2025-09-26 - Week 2 Intelligence Layer

## Session Overview
**Date**: 2025-09-26
**Duration**: Planning session (30 minutes)
**Focus**: Plan Week 2 Intelligence Layer implementation
**Week**: Week 2 - Intelligence Layer

## Session Objectives
### Primary Goals
- ✅ Create comprehensive implementation plan for Week 2
- ✅ Document session workflow in CLAUDE.md
- ✅ Set up session documentation structure

### GitHub Issues Alignment
- **Primary**: Issue #11 - Search API endpoint ([Link](https://github.com/afoxnyc3/speedboatAgent/issues/11))
- **Secondary**: Issue #12 - Chat interface streaming ([Link](https://github.com/afoxnyc3/speedboatAgent/issues/12))
- **Parallel**: Issue #14 - Frontend chat component ([Link](https://github.com/afoxnyc3/speedboatAgent/issues/14))
- **Enhancement**: Issue #13 - Query classification ([Link](https://github.com/afoxnyc3/speedboatAgent/issues/13))

## Current Context
### Project State - Week 1 Complete ✅
- **Foundation Complete**: 477 files indexed from Chelsea Piers Speedboat repository
- **Weaviate Operational**: 11-property schema, hybrid search configured
- **Data Available**: TypeScript/React components, documentation, configs
- **Stealth Mode**: Zero production impact maintained
- **Development Tools**: Scripts and agents ready for Week 2

### Dependencies Met
- ✅ Weaviate Cloud configured with hybrid search (75% vector, 25% keyword)
- ✅ OpenAI embeddings integration (text-embedding-3-large, 1024 dimensions)
- ✅ Local ingestion pipeline operational
- ✅ Environment variables configured (.env.local)
- ✅ Development tooling established (npm scripts, testing)

### Available Resources
- **Weaviate Client**: `/src/lib/weaviate/client.ts` - Connection management
- **Schema Definition**: `/src/lib/weaviate/schema.ts` - 11 properties
- **Local Processor**: `/src/lib/ingestion/local-processor.ts` - File processing
- **Indexed Data**: 477 files (450 code, 4 docs, 23 configs) ready to query

## Implementation Plan

### Week 2 Goal: Intelligence Layer
Transform indexed data into conversational AI system with:
1. **Search capabilities** - Query 477 indexed files
2. **Chat interface** - Stream responses with source citations
3. **Query intelligence** - Route queries based on type
4. **User interface** - Clean, responsive frontend

### Task 1: Search API Endpoint (Issue #11) [CRITICAL]
**Time Estimate**: 2-3 hours
**Priority**: Critical - Foundation for all other features

#### Implementation Strategy:
1. **Create API Route**: `/app/api/search/route.ts`
   - POST endpoint accepting query parameters
   - Query validation with Zod schemas
   - Error handling and logging

2. **Weaviate Integration**:
   - Use existing client (`/src/lib/weaviate/client.ts`)
   - Implement GraphQL hybrid search queries
   - 75% vector + 25% keyword search weighting

3. **Response Formatting**:
   - Return structured JSON with metadata
   - Include filepath, language, content snippets
   - Add relevance scores and source attribution

4. **Testing**:
   - Test with real Chelsea Piers queries
   - Validate response times < 2s
   - Ensure proper error handling

#### Technical Details:
- **Dependencies**: Existing Weaviate client, OpenAI API
- **Key Functions**: `searchDocuments()`, `formatResults()`, `validateQuery()`
- **Response Schema**: Include content, source, metadata, score

### Task 2: Chat API with Streaming (Issue #12) [CRITICAL]
**Time Estimate**: 3-4 hours
**Priority**: Critical - Core user experience
**Dependencies**: Search API must be complete

#### Implementation Strategy:
1. **Streaming Setup**:
   - Update existing `/app/api/chat/route.ts` (folder exists)
   - Implement Server-Sent Events (SSE)
   - GPT-4 Turbo integration for streaming

2. **Context Integration**:
   - Query search API for relevant context
   - Pass context to GPT-4 with system prompt
   - Ensure all responses include source citations

3. **Response Quality**:
   - Mandatory source attribution
   - Zero hallucination policy (if no context, say so)
   - First token latency < 100ms target

#### Technical Details:
- **Dependencies**: Search API (#11), OpenAI GPT-4 API
- **Key Functions**: `streamChatResponse()`, `getRelevantContext()`, `formatCitations()`

### Task 3: Frontend Chat Component (Issue #14) [HIGH - Parallel]
**Time Estimate**: 2-3 hours
**Priority**: High - Can work parallel with backend

#### Implementation Strategy:
1. **React Component**: `/components/chat/ChatInterface.tsx`
   - Streaming message display
   - Source citation viewer
   - Copy-to-clipboard functionality

2. **Responsive Design**:
   - Mobile + desktop layouts
   - Loading states and error handling
   - Clean, professional UI

3. **API Integration**:
   - Connect to chat API endpoint
   - Handle streaming responses
   - Display source attributions

#### Technical Details:
- **Dependencies**: Chat API for full functionality (can use mocks initially)
- **Key Components**: `ChatInterface`, `MessageBubble`, `SourceViewer`

### Task 4: Query Classification (Issue #13) [ENHANCEMENT]
**Time Estimate**: 1-2 hours
**Priority**: Medium - Intelligence enhancement
**Dependencies**: Search API functional

#### Implementation Strategy:
1. **Classification Logic**: `/src/lib/search/query-classifier.ts`
   - Detect technical/business/operational queries
   - Apply source boosting weights
   - Cache classification results

2. **Source Authority Weighting**:
   - Technical: GitHub 1.5x, Web 0.5x
   - Business: GitHub 0.5x, Web 1.5x
   - Operational: Balanced 1.0x

#### Technical Details:
- **Dependencies**: OpenAI API for classification
- **Key Functions**: `classifyQuery()`, `applySourceWeights()`

## Success Criteria

### Functional Requirements
- ✅ Search API returns relevant results from 477 indexed files
- ✅ Chat interface streams responses with source citations
- ✅ Frontend displays conversations cleanly and responsively
- ✅ Query classification improves search relevance

### Technical Requirements
- ✅ Code quality: Functions <15 lines, files <100 lines, strict TypeScript
- ✅ Tests: Unit tests for critical functions, >80% coverage
- ✅ Performance: Search <2s, Chat first token <100ms
- ✅ Security: Input validation, error handling, no sensitive data exposure

### Performance Targets
- **Search Response Time**: < 2s (p95)
- **Chat First Token**: < 100ms
- **Query Classification**: < 50ms
- **Zero Hallucination**: All responses cite sources
- **Error Rate**: < 1% for valid requests

## Implementation Order & Dependencies

```
Day 1: Issue #11 - Search API Endpoint [CRITICAL FOUNDATION]
       Issue #14 - Frontend Component [PARALLEL]
  ↓
Day 2: Issue #12 - Chat API Streaming [DEPENDS ON #11]
       Continue Issue #14 - Frontend Polish
  ↓
Day 3: Issue #13 - Query Classification [ENHANCEMENT]
       Integration Testing & Polish
```

### Parallel Development Strategy
- **Backend Track**: #11 → #12 → #13
- **Frontend Track**: #14 (can start immediately with mocks)
- **Integration Point**: After #11 and #12 complete

## Risk Mitigation

### High-Risk Areas
1. **Streaming Implementation**: Complex SSE setup
   - **Mitigation**: Start with simple chat, add streaming incrementally

2. **Performance Targets**: <2s search, <100ms chat
   - **Mitigation**: Benchmark early, optimize incrementally

3. **Source Attribution**: Ensuring all responses have citations
   - **Mitigation**: System prompts with mandatory citation requirements

### Contingency Plans
- If streaming is complex: Start with non-streaming chat
- If search is slow: Implement basic search first, optimize later
- If frontend is delayed: Focus on API functionality, add UI later

## Development Environment Ready

### Verified Services
- ✅ Weaviate Cloud: Connected and operational
- ✅ OpenAI API: GPT-4 and embeddings working
- ✅ Local Development: Next.js, TypeScript, all dependencies
- ✅ GitHub Repository: Issues created and aligned

### Directory Structure
```
/app/api/
├── chat/              # Exists, needs streaming implementation
└── search/            # New - create route.ts

/components/chat/       # New directory needed
└── ChatInterface.tsx   # New component

/src/lib/search/       # New directory
├── hybrid-search.ts   # Search implementation
└── query-classifier.ts # Classification logic
```

## Expected Artifacts

### Files to Create
- `/app/api/search/route.ts` - Search API endpoint
- `/app/api/chat/route.ts` - Update with streaming (folder exists)
- `/components/chat/ChatInterface.tsx` - Main UI component
- `/src/lib/search/hybrid-search.ts` - Search implementation
- `/src/lib/search/query-classifier.ts` - Query classification
- `/src/types/search.ts` - TypeScript interfaces

### Tests to Create
- `/test/api/search.test.ts` - Search API tests
- `/test/api/chat.test.ts` - Chat API tests
- `/test/lib/search.test.ts` - Search logic tests

### Documentation Updates
- Update README.md with API documentation
- Add JSDoc comments to all functions
- Update progress.md with Week 2 completion

## Time Allocation (Total: 8-12 hours)
- **Search API**: 2-3 hours
- **Chat Streaming**: 3-4 hours
- **Frontend Component**: 2-3 hours
- **Query Classification**: 1-2 hours
- **Testing & Integration**: 1-2 hours
- **Documentation**: 30 minutes

## Next Session Setup

### On Success (All objectives met)
- **Week 2 Complete**: Move to Week 3 hybrid data ingestion
- **Demo Ready**: End-to-end chat with Chelsea Piers data
- **Foundation Solid**: Ready for web crawling and deduplication

### On Partial Completion
- **Minimum Viable**: Search API + basic chat (defer streaming)
- **Priority Order**: #11 → #12 → #14 → #13
- **Recovery Strategy**: Focus on core functionality, polish later

### Critical Handoff Notes
- **Week 1 Foundation**: 477 files indexed and ready to query
- **Stealth Mode**: Continue zero production impact
- **Performance**: Monitor response times and optimize as needed
- **Quality**: Maintain strict TypeScript and testing standards

---
*Plan created: 2025-09-26*
*Status: Planning complete, ready for implementation*
*Next: Begin Issue #11 - Search API endpoint*