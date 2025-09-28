# E2E Tests for Demo Day Success

This directory contains comprehensive E2E tests designed to prevent embarrassing demo failures by testing all critical user paths and error scenarios.

## 🎯 Purpose

These E2E tests are specifically designed to:
- **Prevent demo day failures** by testing all demonstrated functionality
- **Catch regressions** before they reach production
- **Validate performance** under realistic conditions
- **Test error handling** that could be exposed during live demos
- **Ensure source citation** display works correctly

## 📁 Test Structure

```
tests/e2e/
├── fixtures/
│   └── test-data.ts          # Test data and utilities
├── search.spec.ts            # Search API functionality
├── chat.spec.ts              # Chat streaming responses
├── performance.spec.ts       # Performance monitoring APIs
├── error-handling.spec.ts    # Error scenarios and recovery
└── README.md                 # This file
```

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:e2e
```

### Interactive Mode (Recommended for Development)
```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Full Test Runner with Demo Readiness Check
```bash
npm run test:e2e:runner
```

### Quick Demo Health Check
```bash
npm run demo:health-check
```

## 📋 Test Coverage

### Critical Demo Paths ⭐
These tests cover functionality most likely to be demonstrated:

#### Search API (`search.spec.ts`)
- ✅ Basic search functionality (`POST /api/search`)
- ✅ Health check (`GET /api/search`)
- ✅ Demo search queries with expected results
- ✅ Search with filters and parameters
- ✅ Response metadata and performance headers
- ✅ Concurrent search performance

#### Chat Streaming (`chat.spec.ts`)
- ✅ Basic streaming chat (`POST /api/chat/stream`)
- ✅ Demo chat messages with keyword validation
- ✅ Session continuity and memory context
- ✅ Performance metadata in headers
- ✅ Long query handling
- ✅ Response quality consistency

#### Performance Monitoring (`performance.spec.ts`)
- ✅ System health check (`GET /api/health`)
- ✅ Cost tracking (`GET /api/monitoring/costs`)
- ✅ Cache metrics (`GET /api/cache/metrics`)
- ✅ Concurrent monitoring requests
- ✅ Data consistency across endpoints
- ✅ Response time thresholds

#### Error Handling (`error-handling.spec.ts`)
- ✅ Rate limiting behavior
- ✅ Input validation errors
- ✅ Malformed JSON handling
- ✅ Service dependency failures
- ✅ Timeout scenarios
- ✅ Recovery after errors
- ✅ Performance under stress

## 🎭 Demo-Specific Features

### Test Data (`fixtures/test-data.ts`)
- **Demo search queries** with expected results
- **Demo chat messages** with keyword validation
- **Performance thresholds** for live demo
- **Error scenarios** that could embarrass
- **Rate limiting** configuration for burst tests

### Demo Readiness Indicators
- ✅ **Green**: All critical tests pass - safe to demo
- ⚠️ **Yellow**: Non-critical failures - proceed with caution
- ❌ **Red**: Critical failures - fix before demo

## 📊 Performance Thresholds

The tests enforce realistic performance thresholds for demo scenarios:

```typescript
const PERFORMANCE_THRESHOLDS = {
  searchResponseTime: 3000,     // 3 seconds max
  chatStreamInitiation: 2000,   // 2 seconds to start streaming
  monitoringEndpointTime: 1000, // 1 second for monitoring
  healthCheckTime: 500,         // 500ms for health checks
  costCalculationTime: 1000,    // 1 second for cost calculations
};
```

## 🛠 Configuration

### Environment Variables
```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000  # Default test target
```

### Browser Support
Tests run on multiple browsers for maximum demo reliability:
- ✅ Chromium (primary)
- ✅ Firefox (secondary)
- ✅ WebKit/Safari (if needed)
- ✅ Mobile Chrome (responsive demos)
- ✅ Mobile Safari (responsive demos)

## 🔧 Development Workflow

### 1. Pre-Demo Testing
```bash
# Full test suite with demo readiness check
npm run test:e2e:runner

# Quick health check of critical paths
npm run demo:health-check
```

### 2. During Development
```bash
# Interactive testing
npm run test:e2e:ui

# Specific test suites
npm run test:e2e:runner search chat
```

### 3. CI/CD Integration
Tests automatically run on:
- Every PR to `main`/`develop`
- Every push to `main`/`develop`
- Daily at 6 AM UTC (before demo times)
- Manual workflow dispatch

## 🚨 Common Issues and Solutions

### Application Not Starting
```bash
# Check if port 3000 is free
lsof -ti:3000

# Build first if needed
npm run build
```

### Test Timeouts
```bash
# Increase timeout in playwright.config.ts
timeout: 60 * 1000  // 60 seconds
```

### Service Dependencies
```bash
# Verify external services
npm run test-weaviate
npm run test-web-crawler
```

### Rate Limiting
```bash
# Wait between test runs
sleep 60  # 1 minute cooldown
```

## 📈 Test Results

### GitHub Actions
- Results available in Actions tab
- Artifacts include test reports and videos
- Demo readiness summary in job output

### Local Reports
```bash
# View last test report
npm run test:e2e:report

# Test results location
test-results/
playwright-report/
```

## 🎯 Demo Day Checklist

Before any demo, run this checklist:

### 1. Pre-Demo (30 minutes before)
- [ ] Run `npm run test:e2e:runner`
- [ ] Verify all critical tests pass
- [ ] Check `npm run demo:health-check`
- [ ] Test on demo environment

### 2. Critical Paths to Verify
- [ ] Search API returns results
- [ ] Chat streaming works smoothly
- [ ] Performance monitoring displays correctly
- [ ] Error handling is graceful
- [ ] Source citations appear properly

### 3. Backup Plans
- [ ] Have example queries ready
- [ ] Know common error recovery steps
- [ ] Test fallback scenarios
- [ ] Prepare explanation for any known issues

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Test Writing Guide](https://playwright.dev/docs/writing-tests)
- [CI/CD Best Practices](https://playwright.dev/docs/ci)
- [Demo Preparation Guide](../../docs/demo-preparation.md)

## 🤝 Contributing

When adding new tests:

1. **Follow the AAA pattern**: Arrange, Act, Assert
2. **Include demo scenarios**: Test what will be shown
3. **Add performance assertions**: Enforce response times
4. **Handle errors gracefully**: Test failure scenarios
5. **Document test purpose**: Explain what could go wrong

### Example Test Structure
```typescript
test('Feature works in demo scenario', async ({ request }) => {
  // Arrange - Set up test data
  const testData = MockDataGenerator.generateRequest();

  // Act - Perform the action
  const response = await request.post('/api/endpoint', { data: testData });

  // Assert - Verify results
  expect(response.status()).toBe(200);
  expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.endpoint);
});
```

---

**Remember**: These tests are your safety net for demo day. Keep them comprehensive, realistic, and always passing! 🛡️