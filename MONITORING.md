# Production Monitoring System

## Overview
Comprehensive monitoring solution for demo day confidence with real-time visibility into system performance, errors, and user experience.

## Components

### 1. Real-time Dashboard (`/monitoring`)
- **System Status**: Overall health indicator (healthy/degraded/unhealthy)
- **Performance Metrics**: Response times (P95, P99), throughput, error rates
- **Cache Performance**: Hit rates by type (embedding, classification, search)
- **Resource Monitoring**: Memory usage, service connections
- **Active Users**: Real-time user activity tracking
- **Alert Status**: Active alerts and recent incidents

### 2. API Endpoints

#### `/api/monitoring/dashboard`
Real-time metrics collection including:
- Response time percentiles
- Cache hit rates
- Error rates
- Memory usage
- Active user count
- Service health status

#### `/api/monitoring/alerts`
Alert management system with:
- Predefined alert rules
- Alert status tracking
- Recent alert history
- Alert system health

#### `/api/health`
Comprehensive health check covering:
- Redis connectivity
- Weaviate status
- OpenAI API availability
- Mem0 integration
- System resources

#### `/api/monitoring/costs`
Cost tracking and optimization:
- Service cost breakdown
- Usage analytics
- Optimization recommendations
- Budget alerts

### 3. Alert Configuration

#### Critical Alerts (Sent to Sentry)
- **Response Time Critical**: P95 > 10 seconds
- **Error Rate Critical**: > 5% error rate over 5 minutes
- **Cache Hit Rate Critical**: < 60% hit rate
- **Memory Usage Critical**: > 90% memory usage
- **Service Down**: Uptime < 5 minutes

#### Warning Alerts (Console only)
- **Response Time Warning**: P95 > 5 seconds
- **Error Rate Warning**: > 2% error rate over 5 minutes
- **Cache Hit Rate Warning**: < 70% hit rate
- **Memory Usage Warning**: > 80% memory usage

### 4. Sentry Integration

#### Enhanced Error Tracking
- Categorized errors (cache, vector_db, ai_service, timeout, application)
- Performance context (response times, memory usage)
- Request context (endpoint, method, user agent)
- System context (runtime, uptime, environment)

#### Performance Monitoring
- Transaction tracking with duration tagging
- Slow transaction alerts (> 5 seconds)
- Filtered monitoring (excludes health checks, static assets)
- Release tracking with git commit SHA

### 5. Vercel Analytics Integration

#### Custom Events
- **Performance Metrics**: Response times, Core Web Vitals
- **User Actions**: Page loads, interactions, searches
- **API Usage**: Endpoint usage, response times, status codes
- **Cache Metrics**: Hit rates, operation counts
- **Search Analytics**: Query patterns, result counts
- **Error Tracking**: Error types and contexts
- **System Health**: Component status, uptime

#### Core Web Vitals Tracking
- **LCP** (Largest Contentful Paint): Target < 2.5s
- **FID** (First Input Delay): Target < 100ms
- **CLS** (Cumulative Layout Shift): Target < 0.1
- **TTFB** (Time to First Byte): Target < 200ms

### 6. Performance Middleware

#### Request Tracking
- Response time measurement
- Error rate calculation
- User session tracking
- Request/response metrics

#### Decorators Available
- `withPerformanceTracking`: Track function execution
- `trackCacheOperation`: Monitor cache performance
- `trackDatabaseOperation`: Database query monitoring
- `trackAIOperation`: AI service performance
- `completeRequestTracking`: Full request lifecycle

## Usage Examples

### Monitoring Dashboard Access
```bash
# Navigate to monitoring dashboard
open https://your-domain.com/monitoring

# API endpoint for real-time metrics
curl https://your-domain.com/api/monitoring/dashboard

# Check alert status
curl https://your-domain.com/api/monitoring/alerts
```

### Performance Tracking in Code
```typescript
import { withPerformanceTracking, trackCacheOperation } from './src/lib/monitoring/performance-middleware';

// Track function performance
const searchDocuments = withPerformanceTracking('document_search', async (query: string) => {
  // Your search logic here
});

// Track cache operations
trackCacheOperation('get', 'embedding', 'hit', 45);
```

### Custom Analytics Events
```typescript
import { analytics } from './src/components/monitoring/analytics-provider';

// Track search queries
analytics.trackSearch(query, resultCount, responseTime, 'api');

// Track performance metrics
analytics.trackPerformance('custom_operation', duration);

// Track business metrics
analytics.trackBusinessMetric('documents_processed', count);
```

## Alert Thresholds

### Performance Targets
- **Response Time (P95)**: < 2 seconds (warning at 5s, critical at 10s)
- **Error Rate**: < 1% (warning at 2%, critical at 5%)
- **Cache Hit Rate**: > 70% (warning at 70%, critical at 60%)
- **Memory Usage**: < 80% (warning at 80%, critical at 90%)
- **Uptime**: > 99.9% (critical alert on restart)

### Business Metrics
- **Search Success Rate**: > 95%
- **User Satisfaction**: > 85% positive feedback
- **Response Relevance**: > 90% relevant results

## Demo Day Monitoring Checklist

### Pre-Demo Setup
- [ ] Verify all monitoring endpoints are accessible
- [ ] Check Sentry integration and alert rules
- [ ] Confirm Vercel Analytics is tracking events
- [ ] Test alert notifications
- [ ] Review performance baselines

### During Demo Monitoring
- [ ] Monitor `/monitoring` dashboard in real-time
- [ ] Watch for any critical alerts
- [ ] Track user engagement metrics
- [ ] Monitor response times and error rates
- [ ] Observe cache performance

### Key Metrics to Watch
1. **System Status**: Should remain "healthy"
2. **Response Time P95**: Target < 2 seconds
3. **Error Rate**: Target < 1%
4. **Cache Hit Rate**: Target > 70%
5. **Active Users**: Track demo audience engagement
6. **Alert Count**: Should be 0 during demo

### Emergency Response
If issues are detected during demo:
1. Check `/monitoring` dashboard for specific issues
2. Review active alerts in `/api/monitoring/alerts`
3. Check Sentry for detailed error context
4. Use `/api/health` for service status
5. Monitor resource usage for capacity issues

### Post-Demo Analysis
- Review analytics data for user engagement
- Analyze performance metrics during peak usage
- Check error patterns and resolution
- Document any issues for future improvement
- Update alert thresholds based on observations

## Technical Details

### Data Flow
```
User Request → Performance Middleware → API Route → Business Logic
     ↓                    ↓                 ↓            ↓
Analytics Events    Response Tracking    Metrics     Operations
     ↓                    ↓                 ↓            ↓
Vercel Analytics    Dashboard API     Alert System  Performance
     ↓                    ↓                 ↓        Tracking
Business Insights   Real-time View    Notifications    ↓
                                                   Sentry
```

### Storage
- **Metrics**: In-memory with configurable retention
- **Alerts**: In-memory with persistent history
- **Analytics**: Vercel Analytics + custom events
- **Errors**: Sentry with full context

### Scalability
- Non-blocking metrics collection
- Efficient memory usage with LRU eviction
- Configurable sampling rates for production
- Minimal performance overhead

## Environment Configuration

### Required Environment Variables
```env
# Monitoring
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_APP_ENV=production

# Analytics (automatically configured on Vercel)
VERCEL_ANALYTICS_ID=auto
VERCEL_SPEED_INSIGHTS_ID=auto

# Cache monitoring
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token
```

### Optional Configuration
```env
# Custom analytics webhook
MONITORING_WEBHOOK_URL=your_webhook_url

# Alert notification channels
SLACK_WEBHOOK_URL=your_slack_webhook
DISCORD_WEBHOOK_URL=your_discord_webhook
```

## Troubleshooting

### Common Issues
1. **Dashboard not loading**: Check API endpoint accessibility
2. **Missing metrics**: Verify analytics provider integration
3. **Alerts not firing**: Check Sentry configuration
4. **High memory usage**: Review metrics retention settings
5. **Slow dashboard**: Check metrics collection frequency

### Debug Commands
```bash
# Check API endpoints
curl -s https://your-domain.com/api/health | jq
curl -s https://your-domain.com/api/monitoring/dashboard | jq
curl -s https://your-domain.com/api/monitoring/alerts | jq

# Monitor real-time logs
vercel logs --follow

# Check Sentry events
# Visit Sentry dashboard for error tracking
```

This monitoring system provides comprehensive visibility into system performance and health, ensuring demo day confidence through real-time monitoring, proactive alerting, and detailed analytics.