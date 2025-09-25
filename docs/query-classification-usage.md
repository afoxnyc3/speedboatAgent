# Query Classification System - Usage Guide

## Overview

The Query Classification System intelligently categorizes user queries for optimal RAG system routing. It uses GPT-4 to classify queries into three types with confidence scoring and source authority weighting.

## Quick Start

```typescript
import { classifyQuery, classifyQueryWithMetrics } from '../src/lib/search/query-classifier';

// Basic classification
const result = await classifyQuery('How do I implement React hooks?');
console.log(result.type); // 'technical'
console.log(result.weights); // { github: 1.5, web: 0.5 }

// Classification with metrics
const { classification, metrics } = await classifyQueryWithMetrics('What are the product features?');
console.log(metrics.responseTime); // Response time in ms
console.log(metrics.cacheHit); // Boolean indicating cache hit
```

## Query Types and Weighting

### Technical Queries
- **Examples**: Code implementation, API usage, debugging, architecture
- **Weights**: GitHub 1.5x, Web 0.5x (prefer code repositories)
- **Use Cases**: Developer documentation, code examples, implementation guides

### Business Queries
- **Examples**: Product features, user stories, business processes, pricing
- **Weights**: GitHub 0.5x, Web 1.5x (prefer business documentation)
- **Use Cases**: Product documentation, user guides, business requirements

### Operational Queries
- **Examples**: Deployment, configuration, DevOps, monitoring
- **Weights**: GitHub 1.0x, Web 1.0x (balanced approach)
- **Use Cases**: Setup guides, deployment docs, operational procedures

## API Reference

### `classifyQuery(query, options?)`

Classifies a single query and returns classification result.

**Parameters:**
- `query: string` - The query to classify
- `options?: ClassificationOptions` - Optional configuration

**Returns:** `Promise<QueryClassification>`

**Options:**
```typescript
interface ClassificationOptions {
  useCache?: boolean;     // Enable caching (default: true)
  timeout?: number;       // Timeout in ms (default: 5000)
  fallbackWeights?: boolean; // Use fallback on error (default: true)
}
```

### `classifyQueryWithMetrics(query, options?)`

Classifies a query and returns both classification and performance metrics.

**Returns:** `Promise<{ classification: QueryClassification; metrics: ClassificationMetrics }>`

### `classifyQueries(queries, options?)`

Batch classify multiple queries efficiently.

**Parameters:**
- `queries: string[]` - Array of queries to classify

**Returns:** `Promise<QueryClassification[]>`

### `validateClassification(classification)`

Validates a classification result structure.

**Returns:** `boolean` - True if valid classification

## Configuration

### Environment Variables

```bash
# Required for GPT-4 classification
OPENAI_API_KEY=your_openai_api_key

# Optional for Redis caching
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token
```

### Caching

The system uses a hybrid caching approach:
- **Memory Cache**: Fast in-process cache for immediate lookups
- **Redis Cache**: Distributed cache for persistent storage across instances

Cache TTL: 24 hours for classification results.

## Performance

### Response Time Targets
- **With Cache**: < 50ms (p95)
- **Without Cache**: < 2s (p95)
- **Cache Hit Rate**: > 70% in production

### Optimization Features
- Automatic query normalization for better cache hits
- Concurrent request handling
- Graceful degradation on API failures
- Configurable timeouts and fallbacks

## Usage Patterns

### 1. Basic RAG Query Routing

```typescript
async function routeQuery(userQuery: string) {
  const classification = await classifyQuery(userQuery);

  const searchParams = {
    query: userQuery,
    sourceWeights: classification.weights,
    confidence: classification.confidence
  };

  return await hybridSearch(searchParams);
}
```

### 2. Batch Processing

```typescript
async function processBatchQueries(queries: string[]) {
  const classifications = await classifyQueries(queries);

  return classifications.map(classification => ({
    query: classification.query,
    searchStrategy: getSearchStrategy(classification.type),
    sourceWeights: classification.weights
  }));
}
```

### 3. Performance Monitoring

```typescript
async function monitoredClassification(query: string) {
  const { classification, metrics } = await classifyQueryWithMetrics(query);

  // Log performance metrics
  console.log({
    responseTime: metrics.responseTime,
    cacheHit: metrics.cacheHit,
    confidence: metrics.confidence,
    source: metrics.source
  });

  return classification;
}
```

### 4. Error Handling

```typescript
async function robustClassification(query: string) {
  try {
    return await classifyQuery(query, {
      timeout: 3000,
      fallbackWeights: true
    });
  } catch (error) {
    console.error('Classification failed:', error);

    // Manual fallback
    return {
      query,
      type: 'operational',
      confidence: 0.0,
      weights: { github: 1.0, web: 1.0 },
      reasoning: 'Manual fallback due to system error',
      cached: false
    };
  }
}
```

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern="query-classifier.test.ts"
```

### Performance Tests
```bash
npm test -- --testPathPattern="query-classifier.performance.test.ts"
```

### Integration Tests (requires API key)
```bash
OPENAI_API_KEY=your_key npm test -- --testPathPattern="query-classifier.integration.test.ts"
```

### Manual Demo
```bash
npm run demo-classifier
```

## Troubleshooting

### Common Issues

**1. High Response Times**
- Check OpenAI API status
- Verify Redis connectivity
- Monitor cache hit rates

**2. Low Confidence Scores**
- Review query phrasing
- Check for ambiguous queries
- Consider manual classification rules

**3. Cache Misses**
- Verify query normalization
- Check cache TTL settings
- Monitor memory usage

**4. API Errors**
- Validate OpenAI API key
- Check rate limits
- Review timeout settings

### Debug Logging

```typescript
// Enable debug logging
process.env.DEBUG = 'query-classifier:*';

const result = await classifyQuery(query, {
  useCache: false, // Disable cache for debugging
  timeout: 10000   // Longer timeout for debugging
});
```

## Best Practices

1. **Cache Warming**: Pre-classify common queries
2. **Batch Processing**: Use `classifyQueries` for multiple queries
3. **Error Handling**: Always enable fallback weights in production
4. **Monitoring**: Track performance metrics and cache hit rates
5. **Testing**: Validate classifications with domain-specific test cases

## Integration Examples

### Next.js API Route

```typescript
// pages/api/classify.ts
import { classifyQueryWithMetrics } from '../../src/lib/search/query-classifier';

export default async function handler(req, res) {
  const { query } = req.body;

  try {
    const { classification, metrics } = await classifyQueryWithMetrics(query);

    res.status(200).json({
      success: true,
      classification,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### React Hook

```typescript
// hooks/useQueryClassification.ts
import { useState, useCallback } from 'react';
import { QueryClassification } from '../types/query-classification';

export function useQueryClassification() {
  const [classification, setClassification] = useState<QueryClassification | null>(null);
  const [loading, setLoading] = useState(false);

  const classify = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      setClassification(data.classification);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { classification, loading, classify };
}
```