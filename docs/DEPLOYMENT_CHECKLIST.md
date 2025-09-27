# Vercel Deployment Checklist

## Pre-Deployment Checklist

### Local Preparation
- [ ] All tests passing: `npm run test:ci`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No lint errors: `npm run lint`
- [ ] Build succeeds locally: `npm run build`
- [ ] Latest changes committed and pushed

### Vercel Account Setup
- [ ] Logged into Vercel CLI: `vercel login`
- [ ] Vercel project created: `vercel`
- [ ] Project name set to: `speedboat-agent`

## Environment Variables Checklist

### Required API Keys Obtained
- [ ] OpenAI API key (`OPENAI_API_KEY`)
- [ ] Weaviate host URL (`WEAVIATE_HOST`)
- [ ] Weaviate API key (`WEAVIATE_API_KEY`)
- [ ] GitHub personal access token (`GITHUB_TOKEN`)
- [ ] GitHub webhook secret (`GITHUB_WEBHOOK_SECRET`)
- [ ] Mem0 API key (`MEM0_API_KEY`)
- [ ] Firecrawl API key (`FIRECRAWL_API_KEY`)
- [ ] Upstash Redis URL (`UPSTASH_REDIS_URL`)
- [ ] Upstash Redis token (`UPSTASH_REDIS_TOKEN`)

### Optional Services
- [ ] Sentry DSN (`SENTRY_DSN`)
- [ ] Analytics keys (if needed)

### Vercel Dashboard Configuration
- [ ] All required environment variables added
- [ ] Variables set for correct environments (Production/Preview/Development)
- [ ] Sensitive values marked as encrypted
- [ ] `NEXT_PUBLIC_APP_URL` set per environment

### GitHub Actions Setup
- [ ] `VERCEL_TOKEN` added to GitHub secrets
- [ ] `VERCEL_ORG_ID` added to GitHub secrets
- [ ] `VERCEL_PROJECT_ID` added to GitHub secrets

## Deployment Steps

### Preview Deployment
- [ ] Run `vercel` command
- [ ] Preview URL generated successfully
- [ ] Preview deployment accessible

### Preview Testing
- [ ] `/api/health` endpoint returns 200
- [ ] All health check components show "healthy"
- [ ] Search API functional: `/api/search`
- [ ] Chat API functional: `/api/chat`
- [ ] No errors in Vercel function logs

### Production Deployment
- [ ] Run `vercel --prod` command
- [ ] Production URL generated
- [ ] Production deployment successful

### Production Verification
- [ ] Production URL accessible
- [ ] Health check passing: `curl https://[your-domain]/api/health`
- [ ] All services connected:
  ```bash
  curl https://[your-domain]/api/health?includeComponents=true
  ```
- [ ] Cache metrics available: `/api/cache/metrics`
- [ ] Cost monitoring active: `/api/monitoring/costs`

## Post-Deployment Configuration

### GitHub Webhook
- [ ] Webhook added in GitHub repository settings
- [ ] Payload URL: `https://[your-domain]/api/ingest/github`
- [ ] Content type: `application/json`
- [ ] Secret: Matches `GITHUB_WEBHOOK_SECRET` env var
- [ ] Events: Push events selected
- [ ] Webhook test delivery successful

### Monitoring Setup
- [ ] Vercel Analytics enabled (optional)
- [ ] Sentry project receiving events
- [ ] Function logs accessible in Vercel dashboard
- [ ] Uptime monitoring configured (optional)

### Performance Validation
- [ ] Response time < 2s (P95)
- [ ] No cold start issues
- [ ] Cache hit rate increasing
- [ ] No memory leaks detected

## Domain Configuration (Optional)

### Custom Domain
- [ ] Domain added in Vercel settings
- [ ] DNS records configured
- [ ] SSL certificate provisioned
- [ ] Domain accessible
- [ ] Redirects configured (www → non-www or vice versa)

## Documentation Updates

### Update Project Files
- [ ] README.md updated with production URL
- [ ] DEPLOYMENT.md reviewed and accurate
- [ ] Environment variables documented
- [ ] API endpoints documented

### Team Communication
- [ ] Team notified of production URL
- [ ] Access credentials shared securely
- [ ] Support procedures documented
- [ ] Rollback procedure documented

## Continuous Deployment

### GitHub Actions Verification
- [ ] PR creates preview deployment
- [ ] Merge to main triggers production deployment
- [ ] Deployment status visible in GitHub
- [ ] Build notifications working

## Troubleshooting Checklist

If deployment fails, check:

### Build Issues
- [ ] All dependencies in package.json
- [ ] No TypeScript errors
- [ ] Environment variables available during build
- [ ] Build command correct in vercel.json

### Runtime Issues
- [ ] All required environment variables set
- [ ] API keys valid and not expired
- [ ] External services accessible
- [ ] Function timeout sufficient

### Performance Issues
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] API routes have proper caching
- [ ] Database queries optimized

## Sign-off

### Deployment Approved By:
- [ ] Technical Lead: _______________ Date: _______________
- [ ] Product Owner: _______________ Date: _______________

### Deployment Completed:
- **Date**: _______________
- **Time**: _______________
- **Deployed By**: _______________
- **Production URL**: _______________
- **Version/Commit**: _______________

## Emergency Contacts

- **On-call Engineer**: _______________
- **Escalation**: _______________
- **Rollback Authority**: _______________

## Notes

_Space for deployment-specific notes, issues encountered, or special configurations:_

---

---

---