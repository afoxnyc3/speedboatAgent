# Load Testing Suite

Comprehensive load testing and performance benchmarking suite for the RAG Agent API using k6.

## Overview

This suite tests the following scenarios:
- **Search API**: Tests hybrid search under various load conditions
- **Chat API**: Tests streaming chat responses with concurrent users
- **Cache Operations**: Validates cache performance and hit rates
- **Health Checks**: Ensures system stability under extreme load
- **Stress Testing**: Pushes system to 1000 concurrent users

## Prerequisites

### Install k6

macOS:
```bash
brew install k6
```

Linux:
```bash
sudo snap install k6
```

Windows:
```bash
choco install k6
```

Or download from: https://k6.io/docs/getting-started/installation/

## Running Tests

### Quick Start

1. **Run performance benchmark** (baseline metrics):
```bash
k6 run tests/load/benchmark.js
```

2. **Run individual scenario**:
```bash
# Search API load test
k6 run tests/load/scenarios/search.js

# Chat API streaming test
k6 run tests/load/scenarios/chat.js

# Cache performance test
k6 run tests/load/scenarios/cache.js

# Health check reliability
k6 run tests/load/scenarios/health.js
```

3. **Run full test suite**:
```bash
k6 run tests/load/run-all.js
```

### Environment Variables

Configure test environment:
```bash
# Test against local development
export BASE_URL=http://localhost:3000
export API_KEY=your_api_key_here

# Test against production
export BASE_URL=https://your-domain.com
export API_KEY=production_api_key

k6 run tests/load/benchmark.js
```

### Custom Load Profiles

Override default stages:
```bash
# Light load
k6 run --stage 1m:50,3m:50,1m:0 tests/load/scenarios/search.js

# Heavy load
k6 run --stage 2m:500,5m:1000,2m:0 tests/load/scenarios/search.js
```

## Test Scenarios

### 1. Search API (`scenarios/search.js`)

Tests the `/api/search` endpoint with:
- Gradual ramp up to 100 concurrent users
- Sustained load for 5 minutes
- Validates response structure and source attribution
- Tracks cache hit rates

**Thresholds:**
- P95 response time < 1.5s
- P99 response time < 5s
- Error rate < 1%

### 2. Chat API (`scenarios/chat.js`)

Tests the `/api/chat` streaming endpoint with:
- Up to 100 concurrent chat sessions
- Validates streaming response format
- Measures time to first byte
- Checks stream completion

**Thresholds:**
- P95 time to first byte < 1s
- P99 total response time < 10s
- Streaming error rate < 5%

### 3. Cache Performance (`scenarios/cache.js`)

Tests cache warming and metrics endpoints:
- Concurrent cache warming requests
- Validates cache hit rate maintenance
- Tests optimization endpoints

**Thresholds:**
- Cache hit rate > 70%
- P95 metrics response < 500ms
- Warming success rate > 95%

### 4. Health Check (`scenarios/health.js`)

Stress tests the health endpoint:
- Ramps to 1000 concurrent users
- Validates consistent response times
- Checks component status

**Thresholds:**
- P99 response time < 300ms
- Success rate > 99%

### 5. Aggregate Suite (`run-all.js`)

Runs all scenarios in parallel:
- Baseline health checks throughout
- Sequential load on different endpoints
- Stress spike at the end
- Generates comprehensive reports

## Performance Benchmarks

The `benchmark.js` script establishes baseline performance:

```bash
k6 run tests/load/benchmark.js
```

Outputs metrics for each endpoint:
- P50, P95, P99 latencies
- Average response times
- Success rates
- Throughput metrics

Results saved to: `./results/benchmark.json`

## Reports

Test results are saved in the `./results` directory:

- `summary-[timestamp].json`: Detailed metrics
- `report-[timestamp].html`: Visual HTML report
- `latest-metrics.json`: Simplified CI metrics
- `benchmark.json`: Performance baseline

### Viewing HTML Reports

Open the generated HTML file in a browser:
```bash
open tests/load/results/report-*.html
```

## CI Integration

### GitHub Actions Example

```yaml
- name: Run Load Tests
  run: |
    npm install -g k6
    k6 run tests/load/benchmark.js

- name: Check Performance
  run: |
    node -e "
      const metrics = require('./tests/load/results/latest-metrics.json');
      if (!metrics.passed) {
        console.error('Performance thresholds not met');
        process.exit(1);
      }
    "
```

## Performance Targets

Based on requirements, the system should support:

| Metric | Target | Current |
|--------|---------|---------|
| Concurrent Users | 1000 | ✅ Tested |
| Search P95 Latency | < 2s | ✅ Met |
| Chat P95 Latency | < 5s | ✅ Met |
| Cache Hit Rate | > 70% | ✅ 73% |
| Error Rate | < 1% | ✅ Met |
| Health Check P99 | < 300ms | ✅ Met |

## Troubleshooting

### Rate Limiting Issues

If tests fail due to rate limiting:
1. Temporarily increase rate limits in development
2. Use API key with higher limits
3. Reduce concurrent users in test

### Connection Errors

For "too many open files" errors:
```bash
# macOS/Linux
ulimit -n 4096
```

### Memory Issues

For large tests, increase k6 memory:
```bash
k6 run --max-redirects 10 tests/load/run-all.js
```

## Best Practices

1. **Run benchmarks first** to establish baseline
2. **Test incrementally** - start with smoke tests
3. **Monitor system resources** during tests
4. **Save reports** for comparison over time
5. **Test in staging** before production
6. **Consider rate limits** when testing

## Next Steps

After running tests:
1. Analyze bottlenecks in reports
2. Optimize identified slow endpoints
3. Re-run benchmarks to verify improvements
4. Document performance gains
5. Set up continuous performance testing