# 🚀 Quick Troubleshooting Commands - Demo Day Reference

## ⚡ Emergency Commands (Keep This Open During Demo)

### 1. System Health Check (30 seconds)
```bash
# All-in-one health check
curl -f https://your-domain.vercel.app/api/health && echo "✅ App OK" || echo "❌ App Down"
curl -f https://your-weaviate-cluster.weaviate.network/v1/.well-known/ready && echo "✅ Weaviate OK" || echo "❌ Weaviate Down"
redis-cli -u $UPSTASH_REDIS_URL ping && echo "✅ Redis OK" || echo "❌ Redis Down"
```

### 2. Performance Quick Fix
```bash
# Clear all caches (use if responses are slow)
redis-cli -u $UPSTASH_REDIS_URL flushall
curl -X DELETE https://your-domain.vercel.app/api/cache/clear
```

### 3. Emergency Rollback (2 minutes)
```bash
# Rollback to previous deployment
vercel deployments list --limit 3
vercel rollback [PREVIOUS_DEPLOYMENT_URL]
```

### 4. Force Restart
```bash
# Trigger redeployment
vercel --prod --force
```

## 🔍 Diagnostic Commands

### Check Response Times
```bash
# Time a search request
time curl -s "https://your-domain.vercel.app/api/search?q=architecture" | jq '.responseTime'
```

### Verify Data Exists
```bash
# Check if Weaviate has documents
curl "https://your-weaviate-cluster.weaviate.network/v1/objects?limit=1" | jq '.objects | length'
```

### Cache Statistics
```bash
# Get cache hit rate
curl "https://your-domain.vercel.app/api/monitoring/cache-stats" | jq '.hitRate'
```

### Memory Usage
```bash
# Check memory consumption
curl "https://your-domain.vercel.app/api/monitoring/performance" | jq '.memory'
```

## 🎯 Demo-Specific Commands

### Warm Up Cache (Before Demo)
```bash
# Pre-load common demo queries
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the project architecture?", "sessionId": "demo-warmup"}'

curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How does hybrid search work?", "sessionId": "demo-warmup"}'
```

### Clear Demo Sessions (After Demo)
```bash
# Remove demo session data
redis-cli -u $UPSTASH_REDIS_URL eval "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "demo:*"
```

## ⚠️ When Things Go Wrong

### If App Won't Load
1. `vercel deployments list` (check recent deployments)
2. `vercel rollback [URL]` (rollback if recent deploy broke it)
3. Show video backup or local version

### If Search Returns Nothing
1. `curl https://your-weaviate-cluster.weaviate.network/v1/objects?limit=1` (check data exists)
2. Try broader search terms
3. Use pre-cached responses

### If Responses Are Slow
1. `redis-cli -u $UPSTASH_REDIS_URL flushall` (clear cache)
2. `curl -X DELETE https://your-domain.vercel.app/api/cache/clear` (clear app cache)
3. Switch to cached demo responses

### If API Errors Occur
1. Check `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
2. Verify environment variables: `vercel env ls`
3. Use fallback demo mode

## 📱 One-Liner Emergency Commands

```bash
# Complete system reset (use if everything seems broken)
redis-cli -u $UPSTASH_REDIS_URL flushall && curl -X DELETE https://your-domain.vercel.app/api/cache/clear && vercel --prod --force

# Quick performance check
curl -s https://your-domain.vercel.app/api/monitoring/performance | jq '{responseTime: .responseTime, memory: .memory.usage, cache: .cache.hitRate}'

# Verify all APIs are working
curl -f https://your-domain.vercel.app/api/health && curl -f https://your-weaviate-cluster.weaviate.network/v1/.well-known/ready && redis-cli -u $UPSTASH_REDIS_URL ping

# Emergency contact info
echo "System Admin: [Your Phone] | Vercel Support: support.vercel.com | Backup Presenter: [Name/Phone]"
```

## 🎪 Fallback Commands

### Serve Static Demo
```bash
# If all else fails, serve static content
cd public/demo && python -m http.server 8080
```

### Local Development Backup
```bash
# Run local version as backup
npm run dev
```

### Show Cached Results
```bash
# Display pre-generated demo responses
cat data/demo-responses.json | jq '.'
```

---

**💡 Pro Tip**: Keep this file open in a terminal during the demo for quick copy-paste access to commands.

**📞 Emergency Contacts**:
- System Admin: [Your Phone Number]
- Backup Presenter: [Name/Phone]
- Technical Support: [Company Internal]