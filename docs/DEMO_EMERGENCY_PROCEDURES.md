# Demo Day Emergency Procedures

## 🚨 Critical Emergency Contact Information
- **System Admin**: [Your Name] - [Phone Number]
- **Backup Demo Person**: [Name] - [Phone Number]
- **Vercel Support**: Enterprise support ticket system
- **Emergency Rollback Authority**: [Technical Lead Name]

## ⏰ 30-Minute Pre-Demo Checklist

### Environment Health Check
```bash
# 1. Verify all services are running
curl -f https://your-domain.vercel.app/api/health
curl -f https://your-domain.vercel.app/api/monitoring/system-status

# 2. Check Weaviate connection
curl -f https://your-weaviate-cluster.weaviate.network/v1/.well-known/ready

# 3. Verify Redis cache
redis-cli -u $UPSTASH_REDIS_URL ping

# 4. Test OpenAI API
curl -f https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Pre-load Demo Queries
```bash
# Run these queries to warm up the cache
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the project architecture?", "sessionId": "demo-warmup"}'

curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I set up the development environment?", "sessionId": "demo-warmup"}'

curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain the hybrid search implementation", "sessionId": "demo-warmup"}'
```

### Performance Baseline
```bash
# Check response times are under 2s
time curl -s https://your-domain.vercel.app/api/search?q="architecture"

# Verify memory usage is normal
curl https://your-domain.vercel.app/api/monitoring/performance | jq '.memory.usage'

# Check cache hit rate
curl https://your-domain.vercel.app/api/monitoring/cache-stats | jq '.hitRate'
```

### Demo Data Verification
- [ ] GitHub repository content is indexed (last sync within 24 hours)
- [ ] Web documentation is current (Firecrawl ran successfully)
- [ ] Sample questions have been tested and return good results
- [ ] All demo user sessions are cleared
- [ ] Source attribution links are working
- [ ] No rate limiting is in effect

## 🎯 Live Demo Troubleshooting Guide

### Scenario 1: Slow Response Times (>5 seconds)

**Immediate Actions:**
1. Check system status dashboard
2. Clear cache if hit rate is low
3. Switch to cached demo responses

**Commands:**
```bash
# Clear Redis cache
redis-cli -u $UPSTASH_REDIS_URL flushall

# Restart the application (if on own server)
pm2 restart speedboat-agent

# Force cache refresh for demo queries
curl -X DELETE https://your-domain.vercel.app/api/cache/clear
```

**Fallback:** Use pre-recorded demo video or cached responses

### Scenario 2: API Connection Failures

**OpenAI API Down:**
```bash
# Switch to fallback model
export OPENAI_MODEL="gpt-3.5-turbo"
# Or use cached responses from previous queries
```

**Weaviate Connection Issues:**
```bash
# Test connection
curl https://your-weaviate-cluster.weaviate.network/v1/.well-known/ready

# Use backup search endpoint
curl https://your-domain.vercel.app/api/search/fallback?q="your query"
```

**Redis Cache Down:**
```bash
# Disable caching temporarily
export REDIS_ENABLED=false
vercel env add REDIS_ENABLED false
```

### Scenario 3: Application Won't Load

**Quick Fixes:**
1. Check Vercel deployment status
2. Verify environment variables are set
3. Check for recent deployments that may have broken things

**Emergency Commands:**
```bash
# Check deployment status
vercel deployments list

# Rollback to previous deployment
vercel rollback [deployment-url]

# Check environment variables
vercel env ls
```

### Scenario 4: Search Returns No Results

**Immediate Diagnostics:**
```bash
# Check Weaviate has data
curl https://your-weaviate-cluster.weaviate.network/v1/objects?limit=1

# Test direct search
curl -X POST https://your-domain.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 5}'
```

**Quick Fixes:**
1. Use broader search terms
2. Switch to demo dataset
3. Show pre-indexed content

### Scenario 5: UI/Frontend Issues

**Browser-Specific Problems:**
- Refresh the page (Ctrl+F5)
- Clear browser cache
- Switch to incognito/private mode
- Use backup browser

**Component Failures:**
- Have screenshots ready as backup
- Use mobile-responsive view if desktop fails
- Switch to API-only demo

## 🎪 Fallback Demonstration Options

### Option 1: Cached Response Demo
Pre-recorded API responses for key demo queries stored in `/data/demo-responses.json`

```bash
# Serve cached responses
node scripts/demo-fallback-server.js
```

### Option 2: Video Walkthrough
Have a 3-5 minute screen recording showing:
- Normal application flow
- Key features working correctly
- Performance metrics
- Real-time query processing

### Option 3: Static Documentation Tour
Navigate through:
- README.md with architecture diagrams
- API documentation
- Performance metrics screenshots
- Code examples

### Option 4: Local Development Demo
Run the application locally as backup:
```bash
# Quick local setup
npm run dev
# or
npm run demo-mode
```

## 🔄 Rollback Procedures

### Emergency Rollback to Previous Version

**Via Vercel:**
```bash
# List recent deployments
vercel deployments list

# Rollback to stable deployment
vercel rollback https://speedboat-agent-xyz.vercel.app

# Verify rollback
curl https://your-domain.vercel.app/api/health
```

**Via Git:**
```bash
# Identify last stable commit
git log --oneline -10

# Create emergency rollback branch
git checkout -b emergency-rollback-$(date +%s)
git reset --hard [stable-commit-hash]
git push origin emergency-rollback-$(date +%s) --force

# Deploy emergency branch
vercel --prod
```

### Database State Restoration

**Weaviate Backup:**
```bash
# If we have a backup schema/data
curl -X POST https://your-weaviate-cluster.weaviate.network/v1/schema \
  -H "Content-Type: application/json" \
  -d @backup-schema.json
```

**Cache Reset:**
```bash
# Clear Redis and rebuild
redis-cli -u $UPSTASH_REDIS_URL flushall
curl -X POST https://your-domain.vercel.app/api/cache/rebuild
```

### Configuration Reversion

**Environment Variables:**
```bash
# Restore from backup
vercel env rm PROBLEMATIC_VAR
vercel env add PROBLEMATIC_VAR "previous-value"

# Trigger redeploy
vercel --prod
```

## 📱 Quick Command Reference Cards

### Performance Troubleshooting
```bash
# System health
curl /api/health | jq '.'

# Performance metrics
curl /api/monitoring/performance | jq '.responseTime'

# Cache statistics
curl /api/monitoring/cache-stats

# Memory usage
curl /api/monitoring/memory
```

### Cache Management
```bash
# Clear all cache
redis-cli -u $UPSTASH_REDIS_URL flushall

# Clear specific pattern
redis-cli -u $UPSTASH_REDIS_URL eval "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "chat:*"

# Check cache size
redis-cli -u $UPSTASH_REDIS_URL info memory
```

### Environment Checks
```bash
# Verify all required env vars
env | grep -E "(OPENAI|WEAVIATE|REDIS|GITHUB)" | wc -l

# Test API connections
curl -f $WEAVIATE_HOST/v1/.well-known/ready
curl -f https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Service Restart (if applicable)
```bash
# Restart application
pm2 restart all

# Restart specific service
pm2 restart speedboat-agent

# Check process status
pm2 status
```

## 🧪 Demo-Safe Environment Setup

### Cached Response Fallbacks
Create `/data/demo-responses.json` with pre-generated responses:

```json
{
  "architecture": {
    "query": "What is the project architecture?",
    "response": "The RAG agent uses Next.js 14 with TypeScript...",
    "sources": [...],
    "responseTime": "1.2s"
  },
  "setup": {
    "query": "How do I set up the development environment?",
    "response": "To set up the development environment...",
    "sources": [...],
    "responseTime": "0.8s"
  }
}
```

### Demo Data Preloading
```bash
# Preload demo queries into cache
node scripts/preload-demo-cache.js

# Verify cache entries
redis-cli -u $UPSTASH_REDIS_URL keys "demo:*"
```

### Network Failure Contingencies
- **Offline Mode**: Static content served from `/public/demo`
- **API Fallback**: Serve from local JSON files
- **CDN Backup**: Mirror on secondary domain

## 📊 Post-Demo Cleanup

### Clear Demo Data
```bash
# Remove demo session data
redis-cli -u $UPSTASH_REDIS_URL eval "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "demo:*"

# Clear demo user sessions
curl -X DELETE https://your-domain.vercel.app/api/sessions/demo-*
```

### Reset Analytics
```bash
# Archive demo analytics
curl https://your-domain.vercel.app/api/monitoring/archive-demo-data

# Reset counters
curl -X POST https://your-domain.vercel.app/api/monitoring/reset-demo-metrics
```

### Security Cleanup
```bash
# Rotate any exposed API keys (if necessary)
vercel env rm DEMO_OPENAI_KEY
vercel env add OPENAI_API_KEY "production-key"

# Clear browser sessions
# (Manual: Clear cookies and local storage)
```

## 🎯 Confidence Maintenance Tips

1. **Stay Calm**: Technical issues happen, acknowledge and move forward
2. **Have Backups Ready**: Screenshots, videos, cached responses
3. **Engage Audience**: Explain what you're doing during troubleshooting
4. **Use Humor**: Light comments about "demo gods" can defuse tension
5. **Focus on Value**: Pivot to discussing architecture/benefits if UI fails

## 📋 Emergency Contact Checklist

- [ ] System administrator phone number readily available
- [ ] Backup demonstrator identified and briefed
- [ ] Vercel support contact information saved
- [ ] All emergency commands tested in staging environment
- [ ] Rollback procedures validated within last 48 hours
- [ ] Demo video backup ready and accessible
- [ ] Static demo content prepared and hosted

---

**Remember**: The goal is to demonstrate value and technical capability. If something goes wrong, show your problem-solving skills and system understanding instead of panicking.