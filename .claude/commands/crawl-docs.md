---
description: Initiate Firecrawl web documentation ingestion for hybrid data sources
argument-hint: [target-domains] [crawl-mode]
model: inherit
---

Launch Firecrawl-powered web documentation crawling to supplement GitHub sources with external documentation for hybrid search capability.

This command will:
1. Configure Firecrawl for selective web crawling of documentation sites
2. Target specified domains (docs.company.com, api.company.com, help.company.com)
3. Apply content deduplication with SHA-256 hashing
4. Process crawled content with 0.8x priority weighting
5. Generate embeddings and index into Weaviate
6. Schedule weekly crawl updates with change detection

**Target Domains**: $1 (optional - comma-separated domains, defaults to configured targets)
**Crawl Mode**: $2 (optional - 'full', 'incremental', 'changed', defaults to 'incremental')

Example usage:
- `/crawl-docs docs.company.com,api.company.com full`
- `/crawl-docs help.example.com incremental`
- `/crawl-docs` (uses default configuration)

Crawl Configuration:
- **Include Patterns**: /docs/*, /api/*, /help/*, /guide/*
- **Exclude Patterns**: /blog/*, /careers/*, /legal/*, /admin/*
- **File Types**: HTML, Markdown, PDF documentation
- **Rate Limiting**: Respectful crawling with delays
- **Change Detection**: Content hashing for incremental updates

Crawl Modes:
- **Full**: Complete crawl of all target domains
- **Incremental**: Only new/changed content since last crawl
- **Changed**: Re-crawl pages with detected changes

Processing Pipeline:
- Firecrawl → Content extraction → Deduplication → Embeddings → Weaviate
- GitHub content takes precedence in case of duplicates
- Web content receives 0.8x priority weighting vs. 1.2x for GitHub

Requires environment variables:
- FIRECRAWL_API_KEY
- OPENAI_API_KEY (for embeddings)
- WEAVIATE_HOST and WEAVIATE_API_KEY

Expected completion time: 2-4 hours for full crawl, <1 hour for incremental updates.

The system will automatically schedule weekly crawls after successful initial run.