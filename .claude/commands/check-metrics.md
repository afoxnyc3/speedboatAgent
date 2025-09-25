---
description: Validate RAG system performance against success metrics and SLA requirements
argument-hint: [metric-type] [time-range]
model: inherit
---

Comprehensive validation of RAG system performance against defined success metrics and SLA requirements.

This command will:
1. Analyze response time metrics (target: <2s p95, <100ms p50 vector search)
2. Validate relevance scores (target: >85% accuracy)
3. Check cache hit rates (target: >70% for embeddings)
4. Verify zero hallucination policy compliance
5. Monitor cost against $387-587 monthly budget
6. Generate detailed performance reports with recommendations

**Metric Type**: $1 (optional - 'all', 'latency', 'accuracy', 'cache', 'cost', 'availability')
**Time Range**: $2 (optional - '1h', '6h', '24h', '7d', '30d', defaults to '24h')

Metric Categories:
- **Latency**: Response times, vector search performance, API call duration
- **Accuracy**: Relevance scoring, hallucination detection, source attribution
- **Cache**: Embedding cache hit rates, Redis performance, memory usage
- **Cost**: API usage costs, infrastructure spend, optimization opportunities
- **Availability**: System uptime, error rates, SLA compliance

Example usage:
- `/check-metrics all 24h` - Complete 24-hour performance analysis
- `/check-metrics latency 1h` - Recent response time analysis
- `/check-metrics cost 7d` - Weekly cost analysis

Success Criteria Validation:
- ✅ Response time <2s (p95)
- ✅ Relevance score >85%
- ✅ Cache hit rate >70%
- ✅ Zero hallucination policy
- ✅ 95% query coverage
- ✅ Push event processing <30s
- ✅ 40 engineering hours saved
- ✅ Cost within budget ($387-587/month)

The report includes:
- Current vs. target performance comparison
- Trend analysis and performance regression detection
- Cost optimization recommendations
- Alert summaries from Sentry and monitoring systems
- Actionable improvement suggestions

Requires access to monitoring dashboards, Sentry, Vercel Analytics, and cost tracking systems.