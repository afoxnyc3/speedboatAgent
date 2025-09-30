# Issue-Driven Development Guide

> **GitHub-centric workflow that powered 95% completion**

## Core Principle

**Every task is a GitHub issue with priority, scope, and acceptance criteria.**

This simple rule enabled the SpeedboatAgent project to:
- Track 20 issues to completion
- Maintain clear priorities (P0→P3)
- Enable `/work` auto-prioritization
- Create searchable development history
- Integrate with PR auto-closure

## The Issue Structure

### Essential Components

```markdown
## Title Format
[Type] #[N]: [Clear, action-oriented title]

Examples:
- Feature #11: Search API endpoint with hybrid search
- Fix #74: Infinite loop in chat streaming interface
- Perf #61: Achieve 2-3s chat response time

## Issue Body Template
### Problem/Requirement
[What needs to be done and why]

### Acceptance Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

### Technical Approach (Optional)
[High-level implementation strategy]

### Dependencies
- Depends on #[issue-number]
- Blocks #[issue-number]

### Priority: P[0-3]
[Justification for priority level]

### Estimated Time: [N] hours
[Rough estimate for planning]
```

## Priority System

### P0 (Critical) - Do First
- **Criteria**: Production blockers, security issues, data corruption
- **Timeline**: ASAP (same day)
- **Examples**:
  - Issue #74: Infinite loop crashes production
  - Issue #45: Redis performance causing outages
  - Issue #62: Data miscategorization (280+ files)

### P1 (High) - Do Next
- **Criteria**: Core features, major bugs, user-facing functionality
- **Timeline**: Current sprint
- **Examples**:
  - Issue #11: Search API endpoint (core feature)
  - Issue #13: Query classification (core feature)
  - Issue #61: Performance optimization (user experience)

### P2 (Medium) - Schedule Soon
- **Criteria**: Enhancements, optimizations, monitoring
- **Timeline**: Next 1-2 sprints
- **Examples**:
  - Issue #25: Caching layer (optimization)
  - Issue #26: Monitoring setup (operations)
  - Issue #54: Documentation consolidation

### P3 (Low) - Nice to Have
- **Criteria**: Documentation, minor improvements, future ideas
- **Timeline**: Backlog
- **Examples**:
  - Issue #7: GitHub webhooks (future enhancement)
  - Documentation updates
  - Code cleanup tasks

## Issue Lifecycle

### 1. Creation

```bash
# Create issue via GitHub CLI
gh issue create \
  --title "feat #25: Performance optimization and caching" \
  --body "$(cat <<'EOF'
### Problem
Response times averaging 15-20s, need to achieve <2s target

### Acceptance Criteria
- [ ] Cache hit rate >70%
- [ ] Response time <2s (p95)
- [ ] Redis integration complete
- [ ] Monitoring dashboard shows metrics

### Technical Approach
- Implement Redis caching layer
- Multi-tier caching (embeddings, search results, classifications)
- Cache warming for common queries

### Priority: P0
Critical for production readiness

### Estimated Time: 6 hours
EOF
)" \
  --label "priority:P0,type:performance"
```

### 2. Selection (via /work)

```bash
# Auto-select highest priority
/work

# Output:
# Selected Issue #61 (P0): Achieve 2-3s chat response time
# Reason: Only remaining P0 issue, critical for user experience
```

### 3. Implementation

```markdown
Branch created: feature/61-performance-optimization

Work tracked in:
- todo.md: Active task tracking
- scratchpad.md: Implementation notes
- decision-log.md: Technical decisions (if significant)
```

### 4. Completion & Closure

```bash
# Option 1: Automatic closure via PR
gh pr create \
  --title "perf: #61 achieve 2-3s chat response time" \
  --body "Closes #61

Implemented:
- Parallel memory fetch and search (Promise.allSettled)
- Streaming endpoint for better UX
- Circuit breaker for Mem0 failures
- Performance metrics logging

Performance:
- Before: 20s response time
- After: 8-12s response time
- Improvement: 60%

All acceptance criteria met."

# Option 2: Manual closure with detailed summary
gh issue close 61 --comment "✅ Performance optimization complete

Implemented:
- Parallel processing with Promise.allSettled
- Response streaming (8-12s streaming experience)
- Circuit breaker pattern for resilience
- Performance monitoring headers

Results:
- 60% improvement (20s → 8-12s)
- All acceptance criteria met
- Production ready

Tests passing, deployed to production."
```

### 5. Documentation

```markdown
After closure, update:
- roadmap.md: Mark issue complete
- progress.md: Update metrics and completion percentage
- change-log.md: Add entry for user-facing changes
- todo.md: Archive from active to completed
```

## Integration with /work Command

### Auto-Prioritization Logic

```markdown
/work command checks roadmap.md:

Priority order:
1. P0 issues (critical blockers)
2. P1 issues (high priority features)
3. P2 issues (medium enhancements)
4. P3 issues (low priority)

Within same priority: Follow roadmap sequence

Example:
roadmap.md shows:
- Issue #61 (P0): Performance optimization
- Issue #25 (P1): Caching layer
- Issue #9 (P1): Redis setup

/work → Selects #61 (only P0)
After #61 complete:
/work → Selects #25 (first P1 in roadmap order)
```

### Issue Verification (Phase 0.5)

```markdown
Before starting work, /work performs verification:

1. GitHub Issue State
   - Check if issue is still open
   - Review recent comments
   - Look for linked PRs

2. Codebase Analysis
   - Search commit history: git log --grep="#61"
   - Check for hotfix branches
   - Review recent changes in related files

3. Requirement Validation
   - Verify issue requirements still current
   - Check dependencies haven't changed
   - Confirm priority is still valid

4. Impact Analysis
   - Identify files to modify
   - Check for potential conflicts
   - Assess backward compatibility

5. Decision
   - PROCEED: No conflicts, safe to implement
   - INVESTIGATE: Conflicts found, need review
   - SKIP: Already resolved
   - ESCALATE: Complex conflicts
```

## Issue Templates

### Feature Issue Template

```markdown
---
name: Feature
about: New functionality or capability
labels: type:feature
---

### Feature Description
[What is being added and why users need it]

### User Story
As a [user type]
I want to [action]
So that [benefit]

### Acceptance Criteria
- [ ] [Criterion 1 - specific and testable]
- [ ] [Criterion 2 - specific and testable]
- [ ] [Tests added with >80% coverage]
- [ ] [Documentation updated]

### Technical Considerations
[High-level approach, tech stack, architecture]

### Dependencies
- [List blocking issues or prerequisites]

### Priority: P[0-3]
[Justification]

### Time Estimate: [N] hours
```

### Bug Fix Template

```markdown
---
name: Bug Fix
about: Something isn't working correctly
labels: type:bug
---

### Bug Description
[What's broken and the impact]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Root Cause (if known)
[Technical explanation]

### Acceptance Criteria
- [ ] [Bug no longer reproducible]
- [ ] [Root cause addressed]
- [ ] [Tests added to prevent regression]
- [ ] [Documentation updated if behavior changed]

### Priority: P[0-3]
[Justification - P0 if production blocker]

### Time Estimate: [N] hours
```

### Performance Issue Template

```markdown
---
name: Performance Optimization
about: Improve speed, efficiency, or resource usage
labels: type:performance
---

### Performance Issue
[What's slow and the impact]

### Current Metrics
- Metric 1: [Current value]
- Metric 2: [Current value]

### Target Metrics
- Metric 1: [Target value]
- Metric 2: [Target value]

### Bottleneck Analysis
[What's causing slowness]

### Proposed Solution
[High-level optimization approach]

### Acceptance Criteria
- [ ] [Target metrics achieved]
- [ ] [No regression in other areas]
- [ ] [Performance tests added]
- [ ] [Monitoring in place]

### Priority: P[0-3]
[Justification]

### Time Estimate: [N] hours
```

## Roadmap Integration

### roadmap.md Structure

```markdown
## Phase 1: Foundation

### P0 - Critical
- [ ] **Issue #45**: Fix Redis performance bottleneck
  - Replace client.keys() with SCAN
  - **Impact**: Prevents production crash
  - **Time**: 2 hours

### P1 - High Priority
- [ ] **Issue #11**: Search API endpoint
  - Weaviate integration
  - **Time**: 4 hours
```

### Workflow

```
1. Plan Phase → Create issues in roadmap.md
2. Start Work → /work reads roadmap.md, selects issue
3. Complete Work → Update roadmap.md (mark [x])
4. Review Progress → Check completion percentage
```

## Metrics & Tracking

### Velocity Tracking

```markdown
Sprint 1 (Week 1):
- Planned: 5 issues (20 hours)
- Completed: 5 issues (18 hours actual)
- Velocity: 100% (5/5), 90% time accuracy

Sprint 2 (Week 2):
- Planned: 7 issues (28 hours)
- Completed: 6 issues (25 hours actual)
- Velocity: 86% (6/7), 89% time accuracy
```

### Completion Tracking

```markdown
Total Issues: 20
Completed: 19 (95%)
In Progress: 0
Pending: 1

By Priority:
- P0: 8/8 complete (100%)
- P1: 7/8 complete (88%)
- P2: 4/4 complete (100%)
- P3: 0/0 N/A
```

## Best Practices

### ✅ Do

1. **Create issues before coding** - Plan, then execute
2. **Write testable acceptance criteria** - Know when done
3. **Assign priorities consistently** - P0 for real blockers only
4. **Keep issues focused** - One feature/fix per issue
5. **Link related issues** - Dependencies, blocks, relates to
6. **Update issue status** - Comment on progress/blockers
7. **Close with summary** - Document what was actually done

### ❌ Don't

1. **Skip issue creation** - No undocumented work
2. **Create vague issues** - "Fix stuff" isn't actionable
3. **Mix priorities** - P0 means drop everything, use sparingly
4. **Let issues get stale** - Review and update regularly
5. **Forget to close** - Close when done, not "sometime later"
6. **Lose context** - Document decisions in issue comments

## Tools & Automation

### GitHub CLI Integration

```bash
# List issues by priority
gh issue list --label "priority:P0"

# View specific issue
gh issue view 61

# Create issue with template
gh issue create --template feature.md

# Close with comment
gh issue close 61 --comment "✅ Complete..."

# Search issues
gh issue list --search "label:P0 is:open"
```

### Automation Opportunities

```bash
# Auto-label based on title
[Type] #N: Title → adds label:type:[Type]

# Auto-assign based on file
Changes to *.test.ts → assigns:test-specialist

# Auto-close on PR merge
PR body contains "Closes #61" → closes issue #61

# Auto-update roadmap
Issue closed → roadmap.md updated → commit pushed
```

## Success Indicators

✅ All work tracked as issues
✅ Clear priorities at all times
✅ `/work` can always select next task
✅ No "what should I work on?" questions
✅ Searchable development history
✅ Automatic PR → Issue closure
✅ Progress visible to stakeholders

---

*Last Updated: 2025-09-30*
*Based on: SpeedboatAgent issue-driven workflow*