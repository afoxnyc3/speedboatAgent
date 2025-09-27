# Demo Day Final Checklist

## 📋 Pre-Demo Setup (Day Before)

### Environment Preparation
- [ ] Run `npm run demo:check` to verify system readiness
- [ ] Ensure all environment variables are properly set
- [ ] Test all critical API endpoints
- [ ] Verify Weaviate, Redis, and OpenAI connectivity
- [ ] Commit and push all changes to main branch
- [ ] Verify Vercel deployment is current and healthy

### Demo Content Preparation
- [ ] Run `npm run demo:preload` to warm up caches
- [ ] Test all demo queries and verify good responses
- [ ] Prepare backup slides/screenshots
- [ ] Record fallback demo video (3-5 minutes)
- [ ] Print emergency command reference cards

### Emergency Systems Check
- [ ] Test fallback server: `npm run demo:fallback`
- [ ] Verify emergency rollback script works
- [ ] Confirm backup deployment is ready
- [ ] Test demo responses are loaded and accessible
- [ ] Ensure emergency contact information is current

## ⏰ Day of Demo - 30 Minutes Before

### System Health Verification
```bash
# Quick health check
npm run demo:check

# Verify deployments
vercel deployments list --limit 3

# Preload demo cache
npm run demo:preload

# Test critical endpoints
curl -f https://your-domain.vercel.app/api/health
curl -f https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "sessionId": "pre-demo-test"}'
```

### Performance Baseline
- [ ] Response times under 2 seconds
- [ ] Cache hit rate above 70%
- [ ] No rate limiting active
- [ ] All source links working
- [ ] Memory usage normal

### Demo Flow Practice
- [ ] Run through all planned queries once
- [ ] Verify source attribution displays correctly
- [ ] Test different query types (technical, business, setup)
- [ ] Confirm streaming responses work smoothly
- [ ] Check mobile/tablet responsiveness if needed

## 🎯 During Demo - Quick Recovery Actions

### If System is Slow (>5 seconds)
1. **Immediate**: Clear cache with `redis-cli -u $UPSTASH_REDIS_URL flushall`
2. **Backup**: Switch to cached demo responses
3. **Fallback**: Use pre-recorded video

### If API Errors Occur
1. **Check**: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
2. **Rollback**: `vercel rollback [previous-deployment]`
3. **Emergency**: Run `npm run demo:fallback` in separate terminal

### If App Won't Load
1. **Check**: `vercel deployments list`
2. **Rollback**: `scripts/demo/emergency-rollback.sh rollback-vercel`
3. **Local**: `npm run dev` as backup
4. **Static**: Navigate to prepared screenshots/slides

### If No Search Results
1. **Verify**: `curl https://your-weaviate-cluster.weaviate.network/v1/objects?limit=1`
2. **Broader terms**: Use more general search queries
3. **Fallback**: Switch to demo responses JSON

## 📞 Emergency Contacts

- **System Admin**: [Your Phone Number]
- **Backup Presenter**: [Name/Phone]
- **Technical Lead**: [Name/Phone]
- **Vercel Support**: support.vercel.com

## 🎪 Fallback Options (In Order of Preference)

### Option 1: Cached Responses
- Navigate to `http://localhost:8080/demo` (if fallback server running)
- Or manually show responses from `data/demo/demo-responses.json`

### Option 2: Static Demo
- Use prepared screenshots showing normal flow
- Walk through architecture diagrams
- Show code examples from repository

### Option 3: Video Walkthrough
- Play pre-recorded 3-5 minute demo video
- Pause and explain key concepts
- Answer questions during playback

### Option 4: Live Coding
- Show repository in IDE
- Walk through key implementation files
- Explain architecture while browsing code

## 🔄 Emergency Commands Reference

```bash
# System reset (if everything breaks)
redis-cli -u $UPSTASH_REDIS_URL flushall
curl -X DELETE https://your-domain.vercel.app/api/cache/clear
vercel --prod --force

# Quick health check
curl -f https://your-domain.vercel.app/api/health

# Emergency rollback
scripts/demo/emergency-rollback.sh full-rollback

# Start fallback server
npm run demo:fallback

# Check system status
scripts/demo/emergency-rollback.sh status
```

## 🧹 Post-Demo Cleanup

### Immediate (Within 5 minutes)
- [ ] Clear demo session data
- [ ] Reset any demo-specific configurations
- [ ] Archive demo analytics data
- [ ] Stop fallback server if running

### Later (Within 24 hours)
- [ ] Review demo performance metrics
- [ ] Document any issues encountered
- [ ] Update emergency procedures based on learnings
- [ ] Rotate any API keys if exposed
- [ ] Remove temporary demo data

## 💡 Confidence Tips

1. **Stay Calm**: Technical issues are normal, show problem-solving skills
2. **Engage Audience**: Explain what you're doing during troubleshooting
3. **Use Humor**: Light comments about "demo gods" can help
4. **Focus on Value**: Pivot to discussing benefits if UI fails
5. **Have Backups**: Multiple fallback options prevent panic

## ✅ Success Metrics

- [ ] Demo completed without major interruptions
- [ ] All key features demonstrated successfully
- [ ] Questions answered effectively
- [ ] Audience engagement maintained throughout
- [ ] Technical value clearly communicated

---

**Remember**: The goal is to demonstrate technical capability and value. If something goes wrong, it's an opportunity to show your problem-solving skills and deep system understanding.