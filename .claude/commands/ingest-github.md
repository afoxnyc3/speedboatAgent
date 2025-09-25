---
description: Trigger GitHub repository ingestion pipeline with LlamaIndex processing
argument-hint: [repository-url] [branch]
model: inherit
---

Initiate GitHub repository ingestion pipeline to process and index repository contents into the RAG vector database.

This command will:
1. Clone or fetch the specified GitHub repository
2. Process files using LlamaIndex with AST-aware parsing for supported file types (.ts, .tsx, .md, .mdx, .json, .yaml)
3. Generate embeddings using OpenAI text-embedding-3-large (1024 dimensions)
4. Apply GitHub source priority boosting (1.2x weight)
5. Index processed documents into Weaviate with proper metadata
6. Update ingestion logs and processing status

**Repository URL**: $1 (required - GitHub repository URL)
**Branch**: $2 (optional - defaults to 'main')

Example usage:
- `/ingest-github https://github.com/company/docs main`
- `/ingest-github https://github.com/company/api-service`

The ingestion process will:
- Skip binary files and focus on supported text formats
- Extract code structure and documentation
- Maintain file relationships and repository context
- Handle rate limiting and API quotas
- Process changes incrementally for webhook updates

Requires environment variables:
- GITHUB_TOKEN (for private repository access)
- OPENAI_API_KEY (for embeddings)
- WEAVIATE_HOST and WEAVIATE_API_KEY (for storage)

Processing time varies by repository size but targets <30s for typical documentation updates.