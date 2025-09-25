---
description: Execute RAG pipeline tests with sample queries and validation
argument-hint: [test-type] [query]
model: inherit
---

Run comprehensive RAG pipeline testing with sample queries to validate system performance, accuracy, and response quality.

This command will:
1. Execute predefined test queries across different categories (technical, business, operational)
2. Validate hybrid search performance and relevance scoring
3. Test query classification and source routing logic
4. Verify response streaming and citation formatting
5. Measure response latencies and success metrics
6. Generate detailed test reports with performance analysis

**Test Type**: $1 (optional - 'all', 'technical', 'business', 'operational', 'performance', or 'custom')
**Custom Query**: $2 (required if test-type is 'custom')

Test Categories:
- **Technical**: Code implementation, architecture, API usage questions
- **Business**: Product features, roadmap, business logic queries
- **Operational**: Deployment, monitoring, configuration questions
- **Performance**: Load testing, latency measurement, throughput analysis
- **Custom**: User-provided query for ad-hoc testing

Example usage:
- `/test-rag all` - Run complete test suite
- `/test-rag technical` - Test technical query routing
- `/test-rag custom "How do I configure the webhook integration?"`

The testing will validate:
- Response time <2s (p95 requirement)
- Relevance score >85% threshold
- Zero hallucination through source verification
- Proper citation formatting and authority weighting
- Memory integration and context awareness
- Query classification accuracy

Requires:
- Active Weaviate instance with indexed data
- All environment variables configured
- Test data set for ground truth validation

Results include performance metrics, accuracy scores, and recommendations for optimization.