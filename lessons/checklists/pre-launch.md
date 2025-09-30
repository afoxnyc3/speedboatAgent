# Pre-Launch Checklist

> **Production readiness validation before going live**

Use this comprehensive checklist before launching to production to ensure nothing critical is missed.

**Time Required**: 2-4 hours (spread over 1-2 days)
**When to Use**: Before first production deployment
**Goal**: Zero critical issues in production

## Part 1: Code Quality (30 minutes)

### 1.1 Testing
- [ ] **Unit Test Coverage**: > 80% (or your target)
  ```bash
  npm run test:coverage
  # Check coverage report
  ```
- [ ] **Integration Tests**: All passing
- [ ] **E2E Tests**: Critical user journeys validated
- [ ] **Performance Tests**: Meet targets (< 2s p95, etc.)
- [ ] **Load Tests**: Handle expected traffic (1000 users)

### 1.2 Code Quality Gates
- [ ] **Linting**: Zero errors, zero warnings
  ```bash
  npm run lint
  ```
- [ ] **TypeScript**: No compilation errors, no `any` types
  ```bash
  npm run typecheck
  ```
- [ ] **Build**: Clean production build
  ```bash
  npm run build
  ```
- [ ] **Bundle Size**: Within targets (< 500KB initial)

### 1.3 Code Review
- [ ] All open PRs merged or closed
- [ ] No "TODO" or "FIXME" in critical paths
- [ ] No console.logs or debug code
- [ ] No hardcoded credentials or API keys

## Part 2: Security (45 minutes)

### 2.1 Authentication & Authorization
- [ ] Authentication working correctly
- [ ] Authorization rules enforced
- [ ] Session management secure
- [ ] Password requirements enforced (if applicable)
- [ ] 2FA/MFA implemented (if required)

### 2.2 API Security
- [ ] Rate limiting active (100 req/min or your limit)
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized inputs)
- [ ] CSRF protection (if applicable)

### 2.3 Data Security
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit (HTTPS)
- [ ] No secrets in environment variables (use secrets manager)
- [ ] Database backups configured
- [ ] PII handling compliant (GDPR, CCPA)

### 2.4 Dependencies
- [ ] No critical vulnerabilities in dependencies
  ```bash
  npm audit
  ```
- [ ] Dependencies up to date (or have plan to update)
- [ ] License compliance checked

## Part 3: Infrastructure (30 minutes)

### 3.1 Environment Configuration
- [ ] Production environment variables set
- [ ] Staging environment mirrors production
- [ ] Local development environment documented
- [ ] `.env.example` complete and accurate
- [ ] No `.env` files in git repository

### 3.2 Deployment
- [ ] CI/CD pipeline configured and tested
- [ ] Automated deployments to staging work
- [ ] Rollback procedure tested and documented
- [ ] Database migration strategy defined
- [ ] Zero-downtime deployment tested (if required)

### 3.3 Infrastructure
- [ ] DNS configured correctly
- [ ] SSL certificates installed and valid
- [ ] CDN configured (if applicable)
- [ ] Load balancer configured (if applicable)
- [ ] Caching strategy implemented (Redis, etc.)

## Part 4: Monitoring & Observability (45 minutes)

### 4.1 Error Tracking
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Alerts set up for critical errors
- [ ] Error rate thresholds defined
- [ ] Error notifications route to right team
- [ ] Source maps uploaded for debugging

### 4.2 Performance Monitoring
- [ ] APM tool configured (if applicable)
- [ ] Response time tracking active
- [ ] Database query performance monitored
- [ ] Real User Monitoring (RUM) configured
- [ ] Core Web Vitals tracked (if web app)

### 4.3 Health Checks
- [ ] `/health` or `/api/health` endpoint exists
- [ ] Health check validates all critical services:
  - [ ] Database connection
  - [ ] External API connectivity
  - [ ] Cache availability
  - [ ] File system access
- [ ] Health checks integrated with load balancer/orchestrator

### 4.4 Logging
- [ ] Structured logging implemented
- [ ] Log levels configured appropriately
- [ ] Sensitive data not logged (PII, passwords, tokens)
- [ ] Log aggregation configured (CloudWatch, Datadog)
- [ ] Log retention policy defined

### 4.5 Alerting
- [ ] Critical alerts defined:
  - [ ] Error rate > threshold
  - [ ] Response time > threshold
  - [ ] Service downtime
  - [ ] Database connection failures
- [ ] Alert routing configured (PagerDuty, Slack)
- [ ] On-call schedule defined (if 24/7 service)
- [ ] Alert escalation policy set

## Part 5: Performance (30 minutes)

### 5.1 Performance Benchmarks
- [ ] Response times meet targets:
  - [ ] API response time: < [TARGET] (p95)
  - [ ] Page load time: < [TARGET] (p95)
  - [ ] Time to Interactive: < [TARGET]
  - [ ] Database query time: < [TARGET]

### 5.2 Load Testing
- [ ] Load test with expected traffic
- [ ] Stress test with 2x expected traffic
- [ ] Database performance under load validated
- [ ] Memory leaks checked (long-running test)
- [ ] No degradation over time

### 5.3 Optimization
- [ ] Images optimized (WebP, compression)
- [ ] Code splitting implemented (if applicable)
- [ ] Caching headers configured
- [ ] Database indexes optimized
- [ ] N+1 query problems resolved

## Part 6: Documentation (30 minutes)

### 6.1 User-Facing Documentation
- [ ] README.md complete and accurate
- [ ] API documentation generated (if API)
- [ ] User guides written (if applicable)
- [ ] Example code/tutorials provided
- [ ] Troubleshooting guide available

### 6.2 Technical Documentation
- [ ] CLAUDE.md up to date with production architecture
- [ ] Architecture diagrams current
- [ ] Database schema documented
- [ ] API endpoints documented (OpenAPI/Swagger)
- [ ] Environment variables documented

### 6.3 Operational Documentation
- [ ] Deployment procedure documented
- [ ] Rollback procedure documented
- [ ] Incident response plan defined
- [ ] Monitoring dashboard links documented
- [ ] On-call playbook created (if applicable)

### 6.4 Compliance Documentation
- [ ] Privacy policy complete (if handling PII)
- [ ] Terms of service complete
- [ ] Security documentation for audits
- [ ] Data retention policy documented
- [ ] GDPR/CCPA compliance documented

## Part 7: Business Readiness (20 minutes)

### 7.1 Success Metrics Defined
- [ ] Key metrics defined in CLAUDE.md/project-spec.md
- [ ] Baseline metrics established
- [ ] Target metrics set
- [ ] Measurement strategy in place
- [ ] Reporting frequency defined

### 7.2 Stakeholder Communication
- [ ] Launch timeline communicated
- [ ] Success criteria agreed upon
- [ ] Communication plan for issues
- [ ] Status page set up (if public service)
- [ ] Customer support prepared

### 7.3 Legal & Compliance
- [ ] Terms of Service reviewed
- [ ] Privacy Policy reviewed
- [ ] Cookie consent implemented (if EU users)
- [ ] Age verification (if required)
- [ ] Data processing agreements signed

## Part 8: Final Validation (30 minutes)

### 8.1 Staging Environment
- [ ] Deploy to staging environment
- [ ] Run full test suite in staging
- [ ] Perform manual testing of critical paths:
  - [ ] User registration/login
  - [ ] Core functionality
  - [ ] Payment processing (if applicable)
  - [ ] Error handling
- [ ] Verify monitoring/logging working in staging
- [ ] Load test staging environment

### 8.2 Production Pre-Flight
- [ ] Database migrations tested in staging
- [ ] Rollback procedure tested in staging
- [ ] All production environment variables set
- [ ] SSL certificates valid (check expiration > 30 days)
- [ ] DNS propagation complete
- [ ] CDN warmed up (if applicable)

### 8.3 Team Readiness
- [ ] Team trained on new features
- [ ] On-call schedule set (if applicable)
- [ ] Incident response plan reviewed
- [ ] Communication channels established
- [ ] Launch checklist reviewed with team

## Part 9: Launch Day (20 minutes)

### 9.1 Pre-Launch (T-30 minutes)
- [ ] Run automated test suite one more time
- [ ] Verify staging environment stable
- [ ] Check monitoring dashboards
- [ ] Alert team: "Launch in 30 minutes"
- [ ] Disable any debug flags/features

### 9.2 Launch (T-0)
- [ ] Deploy to production
- [ ] Monitor deployment logs
- [ ] Verify health checks pass
- [ ] Run smoke tests
- [ ] Verify critical endpoints responding

### 9.3 Post-Launch (T+30 minutes)
- [ ] Monitor error rates (should be < baseline)
- [ ] Check response times (should meet targets)
- [ ] Verify monitoring/alerting working
- [ ] Test critical user journeys
- [ ] Announce launch to team/stakeholders

## Part 10: Post-Launch Monitoring (First 24 Hours)

### Hour 1
- [ ] Monitor error rates every 15 minutes
- [ ] Check response times
- [ ] Verify user can complete critical actions
- [ ] Watch for unusual patterns

### Hour 2-6
- [ ] Monitor error rates every hour
- [ ] Check system resource usage
- [ ] Review logs for warnings
- [ ] Address any non-critical issues

### Hour 6-24
- [ ] Monitor error rates every 4 hours
- [ ] Review daily metrics
- [ ] Check for memory leaks
- [ ] Plan fixes for any issues discovered

## Emergency Procedures

### If Critical Issue Detected

1. **Assess Severity**
   - [ ] Is service down completely?
   - [ ] Is data at risk?
   - [ ] How many users affected?

2. **Immediate Actions**
   - [ ] Alert team via established channel
   - [ ] Roll back if issue is critical
   - [ ] Post status update (status page)
   - [ ] Begin root cause analysis

3. **Rollback Procedure**
   ```bash
   # Document your specific rollback procedure
   git checkout [previous-stable-commit]
   ./scripts/deploy-production.sh
   # Verify rollback successful
   # Notify team
   ```

4. **Post-Incident**
   - [ ] Document incident in ADR
   - [ ] Root cause analysis
   - [ ] Create issues for fixes
   - [ ] Update pre-launch checklist with lessons learned

## Success Criteria

✅ All checklist items completed
✅ Zero critical issues in production
✅ All tests passing
✅ Monitoring showing healthy metrics
✅ No errors in first hour
✅ Response times meeting targets
✅ Team confident in launch
✅ Rollback procedure tested

## Common Launch Issues

### Issue: High error rate immediately after launch
**Likely Cause**: Configuration difference between staging/prod
**Solution**: Check environment variables, feature flags, API keys

### Issue: Slow response times
**Likely Cause**: Cold start, cache not warmed
**Solution**: Warm up cache, check database indexes

### Issue: Monitoring not working
**Likely Cause**: Wrong environment configuration
**Solution**: Verify Sentry DSN, logging endpoints correct

### Issue: SSL certificate errors
**Likely Cause**: Certificate not installed or expired
**Solution**: Verify certificate installation, check expiration

## Project-Specific Additions

### For RAG/AI Projects
- [ ] Vector database performance validated
- [ ] LLM response times within targets
- [ ] Embedding generation working
- [ ] Context retrieval accurate
- [ ] Hallucination prevention working

### For E-commerce
- [ ] Payment processing tested
- [ ] Inventory management working
- [ ] Order fulfillment integrated
- [ ] Email notifications sending
- [ ] Shipping calculations correct

### For SaaS Applications
- [ ] Subscription management working
- [ ] Billing integration tested
- [ ] User limits enforced
- [ ] Trial periods configured
- [ ] Plan upgrades/downgrades working

## Post-Launch Success Tracking

### Week 1 Metrics
- [ ] Error rate vs. baseline
- [ ] Response times vs. targets
- [ ] User adoption/signup rate
- [ ] Customer support tickets
- [ ] Critical bug count

### Month 1 Goals
- [ ] All P0 bugs resolved
- [ ] Performance targets met consistently
- [ ] User feedback incorporated
- [ ] Monitoring refined based on real usage
- [ ] Documentation updated based on questions

---

**Remember**: Perfect is the enemy of good. Launch when "good enough" and iterate.

**Golden Rule**: If you can roll back in < 5 minutes, you can launch with confidence.

*Review and update this checklist after each launch with lessons learned*