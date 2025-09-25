---
description: Initialize Weaviate schema with hybrid search configuration for RAG system
argument-hint: [optional-environment]
model: inherit
---

Initialize Weaviate vector database schema with hybrid search configuration optimized for the RAG agent system.

This command will:
1. Create Document class schema with required properties (content, source, filepath, url, lastModified, priority, language, metadata)
2. Configure text2vec-openai vectorizer with text-embedding-3-large model (1024 dimensions)
3. Set up hybrid search with 75% vector, 25% keyword weighting using relativeScoreFusion
4. Enable cross-encoder reranking with cross-encoder-ms-marco-MiniLM-L-6-v2
5. Validate schema creation and test basic connectivity

**Environment**: $1 (defaults to 'development')

The setup will use environment-specific configuration:
- Development: Local Weaviate instance or cloud sandbox
- Staging: Weaviate Cloud staging cluster
- Production: Production Weaviate Cloud cluster

Requires environment variables:
- WEAVIATE_HOST
- WEAVIATE_API_KEY
- OPENAI_API_KEY

After successful setup, the system will be ready for document ingestion and hybrid search queries.