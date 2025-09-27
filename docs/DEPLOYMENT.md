# Production Deployment Guide

## Prerequisites

1. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```

2. **Vercel Account**: Sign up at https://vercel.com

3. **Environment Variables**: All required services must be configured

## Required Environment Variables

### Core Services
```env
# OpenAI API (Required)
OPENAI_API_KEY=sk-...

# Weaviate Vector Database (Required)
WEAVIATE_HOST=https://your-cluster.weaviate.network
WEAVIATE_API_KEY=your-api-key

# GitHub Integration (Required)
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Memory Service - Mem0 (Required)
MEM0_API_KEY=mem0_...

# Web Crawling - Firecrawl (Required)
FIRECRAWL_API_KEY=fc_...

# Cache & Queue - Upstash Redis (Required)
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...

# Monitoring - Sentry (Recommended)
SENTRY_DSN=https://...@sentry.io/...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
VERCEL_ENV=production
```

## Deployment Process

### 1. First-Time Setup

```bash
# Login to Vercel
vercel login

# Link project (run in project root)
vercel link

# When prompted:
# - Set up and deploy: Yes
# - Which scope: Select your account
# - Link to existing project: No (if first time)
# - Project name: speedboat-agent
# - Directory: ./ (current directory)
```

### 2. Configure Environment Variables

#### Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable for Production, Preview, and Development

#### Via CLI
```bash
# Add environment variables
vercel env add OPENAI_API_KEY production
vercel env add WEAVIATE_HOST production
# ... repeat for all variables
```

### 3. Deploy to Staging

```bash
# Deploy to preview/staging
vercel

# Or use the deployment script
./scripts/deploy-vercel.sh
# Select option 1 for staging
```

### 4. Verify Staging Deployment

- [ ] Visit the preview URL provided
- [ ] Test `/api/health` endpoint
- [ ] Test search functionality
- [ ] Test chat interface
- [ ] Check error tracking in Sentry
- [ ] Verify Redis cache is working
- [ ] Test Weaviate connection

### 5. Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or use the deployment script
./scripts/deploy-vercel.sh
# Select option 2 for production
```

### 6. Production Verification Checklist

#### API Health Checks
- [ ] `GET /api/health` returns healthy status
- [ ] `GET /api/health?includeComponents=true` shows all components
- [ ] `GET /api/cache/metrics` returns cache statistics
- [ ] `GET /api/monitoring/costs` shows cost tracking

#### Core Functionality
- [ ] Search API returns results
- [ ] Chat API processes messages
- [ ] Memory storage is functional
- [ ] Cache hit rate > 70%

#### Performance Metrics
- [ ] Response time < 2s (P95)
- [ ] Vector search latency < 100ms
- [ ] No memory leaks detected
- [ ] Error rate < 1%

#### Security
- [ ] CORS headers configured
- [ ] Rate limiting active
- [ ] API keys not exposed
- [ ] Input sanitization working

## Rollback Procedure

If issues are detected after deployment:

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or use Vercel Dashboard
# Go to Deployments → Select previous deployment → Promote to Production
```

## Monitoring

### Real-time Monitoring
- **Vercel Dashboard**: https://vercel.com/[your-team]/speedboat-agent
- **Function Logs**: Available in Vercel dashboard
- **Analytics**: Vercel Analytics (if enabled)
- **Error Tracking**: Sentry dashboard

### Key Metrics to Monitor
- Request volume
- Error rate
- Response times
- Cache hit rate
- Memory usage
- API quota usage

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
vercel logs [deployment-url]

# Common fixes:
# - Ensure all dependencies are in package.json
# - Check TypeScript errors: npm run typecheck
# - Verify build locally: npm run build
```

#### 2. Runtime Errors
- Check function logs in Vercel dashboard
- Verify environment variables are set
- Check Sentry for detailed error reports

#### 3. Performance Issues
- Review function cold starts
- Check Redis cache connectivity
- Monitor Weaviate query times
- Analyze bundle size: `npm run build`

#### 4. Environment Variable Issues
```bash
# List all env vars
vercel env ls

# Pull env vars locally
vercel env pull .env.local
```

## GitHub Webhook Configuration

After deployment, configure GitHub webhooks:

1. Get your production URL: `https://your-app.vercel.app`
2. Go to GitHub repository → Settings → Webhooks
3. Add webhook:
   - Payload URL: `https://your-app.vercel.app/api/ingest/github`
   - Content type: `application/json`
   - Secret: Your `GITHUB_WEBHOOK_SECRET`
   - Events: Push events, Pull request events

## Domains and DNS

### Custom Domain Setup
```bash
# Add custom domain
vercel domains add your-domain.com

# Follow DNS configuration instructions provided
```

### SSL Certificates
- Automatically provisioned by Vercel
- Force HTTPS in Vercel project settings

## Cost Optimization

### Vercel Limits (Free Tier)
- 100GB bandwidth/month
- 100GB-hours function execution
- 6000 minutes build time

### Optimization Tips
1. Enable caching headers
2. Use ISR for static pages
3. Optimize images with next/image
4. Implement proper error boundaries
5. Use edge functions where appropriate

## Maintenance

### Regular Tasks
- [ ] Weekly: Review error logs
- [ ] Weekly: Check performance metrics
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review API usage and costs
- [ ] Quarterly: Security audit

### Updating the Deployment
```bash
# After making changes
git add .
git commit -m "fix: your changes"
git push origin main

# Deploy updates
vercel --prod
```

## Support and Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Status Page**: https://vercel-status.com
- **Support**: https://vercel.com/support

## Emergency Contacts

Document your team's emergency contacts and escalation procedures here:

- **Primary Contact**: [Name] - [Email/Phone]
- **Secondary Contact**: [Name] - [Email/Phone]
- **Escalation**: [Process]

---

Last Updated: December 2024
Deployment Version: 1.0.0