# Development Workflow

## Overview
This document outlines the standardized development workflow for the RAG Agent project, ensuring consistent practices across all development phases.

## Project Structure

### Branch Strategy
```
main (protected)
├── feature/#<issue>-<description>
├── fix/#<issue>-<description>
└── chore/<description>
```

### Issue-Driven Development
All development work is tracked via GitHub issues with the following structure:
- **Week 2**: Issues #11-17 (Intelligence Layer)
- **Week 3**: Issues #18-22 (Hybrid Data)
- **Week 4**: Issues #23-28 (Production)

## Development Process

### 1. Issue Selection
- Pick issues from current week's active sprint
- Start with P0 (Critical) before P1 (High)
- Check dependencies before starting work

### 2. Branch Creation
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/#11-search-api-endpoint

# For bug fixes
git checkout -b fix/#25-performance-optimization

# For maintenance
git checkout -b chore/update-documentation
```

### 3. Implementation Standards

#### Code Quality Requirements
- **Functions**: Maximum 15 lines
- **Files**: Maximum 100 lines
- **Classes**: Maximum 50 lines
- **TypeScript**: No 'any' types, strict mode enabled
- **Validation**: Zod schemas for all API inputs
- **Error Handling**: Try-catch with proper logging

#### Testing Requirements
- Unit tests for all critical functions
- Integration tests for API endpoints
- Performance tests for search functionality
- Test coverage >80%

#### Documentation Standards
- JSDoc comments for all public functions
- README updates for new features
- CLAUDE.md updates for technical changes
- progress.md updates for milestone completion

### 4. Development Flow

#### Daily Workflow
```bash
# 1. Update local main
git checkout main && git pull origin main

# 2. Create feature branch
git checkout -b feature/#<issue>-<description>

# 3. Implement feature with TDD
# - Write tests first
# - Implement minimum viable solution
# - Refactor for quality

# 4. Run quality checks
npm run lint
npm run typecheck
npm test

# 5. Commit with issue reference
git commit -m "feat: #11 implement search API endpoint"
```

#### Commit Message Format
```
<type>: #<issue> <imperative-summary>

<optional-body>

<optional-footer>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

### 5. Pull Request Process

#### PR Creation
```bash
# Push feature branch
git push origin feature/#11-search-api-endpoint

# Create PR with GitHub CLI
gh pr create --title "feat: #11 Search API endpoint implementation" \
  --body "Implements hybrid search API endpoint with Weaviate integration"
```

#### PR Requirements
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review (if applicable)

#### PR Template
```markdown
## Summary
Brief description of changes

## Issue
Closes #<issue-number>

<!-- Use one of these keywords for automatic issue closure:
- Closes #21 (most common)
- Fixes #21 (for bug fixes)
- Resolves #21 (for feature requests)
-->

## Changes
- [ ] Feature implementation
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Performance validated

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Performance Impact
- Response time: <time>
- Memory usage: <usage>
- Cache hit rate: <rate>
```

### 6. Code Review Guidelines

#### Review Checklist
- [ ] Code follows style guide
- [ ] Functions under 15 lines
- [ ] Proper error handling
- [ ] Security considerations
- [ ] Performance implications
- [ ] Test coverage adequate

#### Review Process
1. **Author**: Create PR with complete description
2. **Reviewer**: Check code quality and functionality
3. **Testing**: Verify all tests pass
4. **Approval**: Merge to main after approval

### 7. Deployment Process

#### Pre-deployment Checklist
- [ ] All tests passing in CI
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Rollback plan prepared

#### Deployment Steps
```bash
# 1. Merge to main
git checkout main
git pull origin main

# 2. Run production build
npm run build

# 3. Run production tests
npm run test:prod

# 4. Deploy to staging
vercel --env staging

# 5. Validate staging deployment
npm run test:e2e

# 6. Deploy to production
vercel --prod
```

## Quality Gates

### Code Quality
- ESLint: No warnings/errors
- TypeScript: Strict mode, no 'any' types
- Prettier: Consistent formatting
- Test coverage: >80%

### Performance Targets
- Search API: <2s response time (p95)
- Chat API: <100ms first token
- Cache hit rate: >70%
- Memory usage: Stable over time

### Security Requirements
- Input validation with Zod
- API rate limiting active
- Error messages don't leak sensitive data
- Dependencies regularly updated

## Monitoring & Metrics

### Development Metrics
- Issue completion rate
- PR review time
- Code review feedback
- Test coverage trends

### Production Metrics
- Response times
- Error rates
- User satisfaction
- Cost optimization

## Issue Lifecycle

### Status Tracking
1. **Ready to Implement** - Dependencies met, can start work
2. **In Progress** - Actively being developed
3. **In Review** - PR created, awaiting review
4. **Testing** - Deployed to staging for validation
5. **Complete** - Merged and deployed to production

### Progress Updates
- Update progress.md after major milestones
- Update issue status in GitHub
- Communicate blockers immediately
- Document lessons learned

### GitHub Issue Closure

#### Automatic Closure (Preferred)
Issues are automatically closed when PRs are merged if the PR description or commit message contains:
```bash
# In PR description or commit message:
Closes #<issue-number>
Fixes #<issue-number>     # For bug fixes
Resolves #<issue-number>  # For feature requests
```

#### Manual Closure with Summary
For complex issues requiring detailed implementation summaries:
```bash
gh issue close <issue-number> --comment "✅ [Issue Title] complete

Implemented:
- [Core feature/functionality]
- [Additional features/improvements]
- [Integration points/dependencies]

Technical Details:
- [Architecture decisions]
- [Performance improvements]
- [Security considerations]

Testing & Validation:
- [Test coverage details]
- [Integration test results]
- [Performance benchmarks met]

Documentation:
- [API documentation updated]
- [README/guides updated]
- [Examples/tutorials added]

All requirements met and tests passing."
```

#### Issue Closure Verification
```bash
# Verify issue closure
gh issue view <issue-number>

# List all open issues for the milestone
gh issue list --milestone "Week 4"

# Update project documentation
# - Mark complete in roadmap.md
# - Update percentages in progress.md
# - Archive tasks in todo.md
```

## Tools & Resources

### Required Tools
- Git/GitHub CLI
- Node.js 20+
- VS Code with extensions
- Docker (for local development)

### Helpful Resources
- [Project Specification](./project-spec.md)
- [Technical Reference](./CLAUDE.md)
- [Progress Tracking](./progress.md)
- [Development Roadmap](./roadmap.md)

## Emergency Procedures

### Hotfix Process
1. Create hotfix branch from main
2. Implement minimal fix
3. Test thoroughly
4. Fast-track review process
5. Deploy immediately after approval

### Rollback Process
1. Identify problematic deployment
2. Revert to previous stable version
3. Investigate root cause
4. Create fix in separate branch
5. Re-deploy when ready

---

*Last Updated: 2025-09-25*
*Review Schedule: Weekly during sprint planning*