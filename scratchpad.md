# Development Scratchpad

*Updated on 2025-09-26 for Issue #22: Content normalization pipeline*

## Planning for Issue #22: Content Normalization Pipeline
Date: 2025-09-26

### Understanding
- **Problem**: Raw HTML content from web crawling needs normalization for consistent processing
- **Users**: RAG system consuming normalized content for vector embedding and search
- **Constraints**: Must preserve semantic meaning while cleaning formatting, <100 line files

### Approach
- **HTML to Markdown**: Use turndown.js for robust HTML conversion
- **Metadata Extraction**: Extract title, description, author, date from HTML structure and meta tags
- **Language Detection**: Implement language detection for content routing
- **Quality Scoring**: Create scoring system for content filtering

### Implementation Steps
1. **Core Normalizer Module** - Main content normalization pipeline
2. **HTML Converter** - Turndown integration with custom rules
3. **Metadata Extractor** - Extract structured metadata from HTML
4. **Language Detector** - Detect content language with confidence scores
5. **Quality Scorer** - Score content quality for filtering
6. **Integration** - Connect with existing web-crawler.ts
7. **Testing** - Comprehensive test coverage for all normalizers

### Technical Decisions
- **Library Choice**: Turndown.js for HTML→Markdown (mature, configurable)
- **Metadata Strategy**: Combine meta tags + heuristic content analysis
- **Language Detection**: franc library (fast, accurate for web content)
- **Architecture**: Modular pipeline with pluggable normalizers

### Dependencies
- turndown: HTML to markdown conversion
- franc: Language detection
- jsdom: HTML parsing for metadata extraction

### Risks & Mitigations
- **Risk**: Complex HTML structures breaking conversion
- **Mitigation**: Extensive test cases with real-world HTML samples
- **Risk**: Language detection accuracy on short content
- **Mitigation**: Confidence thresholds and fallback to 'unknown'

### Files to Create
- `/src/lib/ingestion/content-normalizer.ts` (main pipeline)
- `/src/lib/ingestion/__tests__/content-normalizer.test.ts`
- Package.json updates for new dependencies

### Integration Points
- Integrate with `web-crawler.ts` before Weaviate indexing
- Use normalized content in document creation pipeline
- Add normalization metrics to monitoring