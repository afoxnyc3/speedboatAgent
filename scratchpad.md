# Development Scratchpad

## Issue #28: Load Testing and Performance Benchmarks
*Date: 2025-09-26*

### Requirements
- Support 1000 concurrent users
- Stress test all API endpoints
- Generate performance benchmarks
- Identify bottlenecks and optimization opportunities

### Approach
Using k6 for load testing as it provides:
- JavaScript/TypeScript scripting
- Excellent concurrent user simulation
- Built-in performance metrics
- HTML/JSON report generation
- CI/CD integration capabilities

### Test Scenarios

#### 1. Search API Load Test
- Endpoint: `/api/search`
- Concurrent users: 100, 500, 1000
- Duration: 5 minutes per level
- Metrics: Response time, throughput, error rate

#### 2. Chat API Streaming Test
- Endpoint: `/api/chat`
- Concurrent users: 50, 100, 200 (streaming is resource intensive)
- Duration: 5 minutes
- Metrics: Time to first byte, streaming stability, connection drops

#### 3. Cache Performance Test
- Endpoints: `/api/cache/warm`, `/api/cache/metrics`
- Concurrent users: 100
- Duration: 2 minutes
- Metrics: Cache hit rate under load, warming efficiency

#### 4. Ingestion Stress Test
- Endpoint: `/api/ingest/web`
- Concurrent submissions: 10, 20, 50
- Duration: 5 minutes
- Metrics: Queue processing time, error rate

#### 5. Health Check Reliability
- Endpoint: `/api/health`
- Concurrent users: 1000
- Duration: 1 minute
- Metrics: Consistent response times, no degradation

### Performance Targets
- P95 response time < 2s for search
- P99 response time < 5s for chat
- Error rate < 1% under normal load
- System stable at 1000 concurrent users
- Cache hit rate maintained > 70%

### Implementation Plan
1. Install k6 and create test directory structure
2. Write base configuration with environment setup
3. Implement individual endpoint test scenarios
4. Create aggregated load test suite
5. Add performance thresholds and SLOs
6. Generate HTML reports
7. Document findings and recommendations

### Files to Create
- `/tests/load/config/base.js` - Base configuration
- `/tests/load/scenarios/search.js` - Search API tests
- `/tests/load/scenarios/chat.js` - Chat API tests
- `/tests/load/scenarios/cache.js` - Cache tests
- `/tests/load/scenarios/ingestion.js` - Ingestion tests
- `/tests/load/scenarios/health.js` - Health check tests
- `/tests/load/run-all.js` - Aggregate test runner
- `/tests/load/README.md` - Documentation
- `/package.json` - Add k6 test scripts

### Notes
- Use environment variables for test configuration
- Ensure tests can run both locally and in CI
- Consider rate limiting impact on tests
- May need to temporarily adjust rate limits for testing