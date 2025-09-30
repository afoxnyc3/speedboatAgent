# Weekly Review Checklist

> **Weekly maintenance to keep project healthy and on track**

Use this checklist every week (typically Friday afternoon or Monday morning) to maintain documentation, track progress, and plan ahead.

**Time Required**: 30-45 minutes
**Frequency**: Weekly
**Best Day**: Friday (reflect on week) or Monday (plan ahead)

## Part 1: Progress Review (10 minutes)

### 1.1 Issue Completion
- [ ] Review completed issues from past week
- [ ] Verify all issues properly closed in GitHub
- [ ] Check if any "In Progress" issues are stalled
- [ ] Identify blockers for incomplete issues

### 1.2 Metrics Update
- [ ] Update progress.md with current metrics:
  ```markdown
  Issues Completed: [N] of [M] ([PERCENT]%)
  Velocity: [N] issues per week
  By Priority:
  - P0: [N]/[M] complete
  - P1: [N]/[M] complete
  ```
- [ ] Track against targets (response time, coverage, etc.)
- [ ] Note any degradation in metrics
- [ ] Celebrate wins (metrics exceeded!)

### 1.3 Completion Statistics
```bash
# Count completed issues
gh issue list --state closed --search "closed:>=$(date -v-7d +%Y-%m-%d)"

# Or manually update from roadmap.md
```

## Part 2: Documentation Maintenance (10 minutes)

### 2.1 Core Docs Review
- [ ] **CLAUDE.md**: Any architecture changes to document?
- [ ] **roadmap.md**: Update issue statuses (✅ completed)
- [ ] **todo.md**: Archive completed items from last week
- [ ] **progress.md**: Add milestones reached
- [ ] **change-log.md**: Ensure recent changes documented

### 2.2 Documentation Currency Check
- [ ] No stale information in CLAUDE.md (check dates)
- [ ] Roadmap reflects current priorities
- [ ] Todo list has < 10 active items
- [ ] Scratchpad cleared (or at least reviewed)

### 2.3 Decision Documentation
- [ ] Any significant decisions made this week?
- [ ] If yes: Create ADR in decision-log.md
- [ ] Format: ADR-[N]: [Decision Title]
- [ ] Include: Context, Decision, Consequences, Alternatives

## Part 3: Git & Code Health (5 minutes)

### 3.1 Repository Hygiene
```bash
# Check for stale branches
git branch -a | grep -E "feature|fix" | head -20

# Check for unpushed commits
git status

# Check PR status
gh pr list --state open
```

- [ ] Delete merged feature branches (local and remote)
- [ ] Review open PRs (any stale ones?)
- [ ] Ensure no unpushed commits on main
- [ ] Check branch protection rules still active

### 3.2 CI/CD Health
- [ ] Review CI failures from past week
- [ ] Check build times (trending up?)
- [ ] Review test failures (flaky tests?)
- [ ] Verify deployments succeeded

## Part 4: Planning Ahead (10 minutes)

### 4.1 Next Week Planning
- [ ] Review upcoming issues in roadmap.md
- [ ] Ensure top 3-5 issues have:
  - Clear acceptance criteria
  - Priority assigned (P0-P3)
  - Time estimates
  - No blocking dependencies

- [ ] Adjust priorities if needed (what changed?)
- [ ] Break large issues into smaller ones (if > 8 hours)

### 4.2 Capacity Planning
```markdown
Last week velocity: [N] issues completed
Available capacity: [N] hours
Next week target: [N] issues
```

- [ ] Calculate realistic targets for next week
- [ ] Account for meetings, reviews, etc.
- [ ] Don't over-commit (80% capacity planning)

### 4.3 Dependency Check
- [ ] Identify issues blocked by external dependencies
- [ ] Follow up on waiting-for items
- [ ] Update issue statuses if unblocked

## Part 5: Process Improvement (5 minutes)

### 5.1 Workflow Review
**What worked well?**
- [ ] Document wins (process-wise)
- [ ] Share with team (if applicable)

**What could improve?**
- [ ] Identify pain points from past week
- [ ] Propose solutions (workflow changes, tools, etc.)
- [ ] Update workflow.md if changes approved

### 5.2 Tool Effectiveness
- [ ] Is `/work` command still helpful?
- [ ] Are custom agents being used?
- [ ] Any repetitive tasks to automate?
- [ ] Documentation still useful or needs updates?

### 5.3 Metrics Review
- [ ] Are we tracking the right metrics?
- [ ] Any metrics to add/remove?
- [ ] Update CLAUDE.md success criteria if needed

## Part 6: Team Sync (5 minutes, if team project)

### 6.1 Communication
- [ ] Update stakeholders on progress
- [ ] Share completed milestones
- [ ] Communicate blockers or delays
- [ ] Request help if needed

### 6.2 Documentation Sharing
- [ ] Ensure team has access to updated docs
- [ ] Share ADRs from this week (if any)
- [ ] Get feedback on process improvements

## Quick Weekly Review (15 min express version)

If time-constrained, focus on essentials:

### Must Do (15 minutes)
1. **Update progress.md** (3 min)
   - Completion percentage
   - Key metrics

2. **Update roadmap.md** (3 min)
   - Mark completed issues ✅
   - Adjust priorities if needed

3. **Archive todo.md** (2 min)
   - Move completed to "COMPLETED" section
   - Keep active list < 10 items

4. **Plan next week** (5 min)
   - Top 3 issues for next week
   - Any blockers to address

5. **Commit & push** (2 min)
   - Push all doc updates
   - Verify sync status

## Review Templates

### Progress Update Template
```markdown
## Week [N] Review ([DATE])

### Completed
- ✅ Issue #[N]: [Title] - [Key outcome]
- ✅ Issue #[N]: [Title] - [Key outcome]
- ✅ Issue #[N]: [Title] - [Key outcome]

### Metrics
- Issues completed: [N] (Target: [M])
- Velocity: [N] issues/week
- Key metric 1: [Value] (Target: [Target])
- Key metric 2: [Value] (Target: [Target])

### Lessons Learned
- [What went well]
- [What could improve]
- [Action items]

### Next Week Focus
- Priority 1: Issue #[N] - [Title]
- Priority 2: Issue #[N] - [Title]
- Priority 3: Issue #[N] - [Title]
```

## Automation Opportunities

### Scripted Updates
```bash
# Create weekly review script
./scripts/weekly-review.sh

# Automatically:
# - Count completed issues
# - Update progress.md
# - List open PRs
# - Check for stale branches
# - Generate review template
```

### GitHub Actions
```yaml
# .github/workflows/weekly-metrics.yml
# Runs every Friday at 5pm
# Posts metrics summary to Slack/Discord
# Creates draft weekly review issue
```

## Red Flags to Watch For

⚠️ **Documentation Drift**
- CLAUDE.md last updated > 2 weeks ago
- Multiple placeholders still in docs
→ Action: Schedule doc update session

⚠️ **Stalled Issues**
- Issues "In Progress" > 1 week
- Multiple blocked issues
→ Action: Investigate blockers, break into smaller issues

⚠️ **Velocity Drop**
- < 50% of planned issues completed
- Consistent under-delivery
→ Action: Review estimates, capacity planning

⚠️ **Priority Inflation**
- Everything marked P0 or P1
- No P2/P3 issues
→ Action: Re-prioritize with strict criteria

⚠️ **Metric Degradation**
- Performance regressing
- Test coverage dropping
→ Action: Create P0 issue to address

## Success Indicators

✅ Weekly review completed in < 45 min
✅ All docs updated and pushed
✅ Next week's top 3 issues clear
✅ No stale branches or PRs
✅ Metrics tracking on target
✅ Team aligned on priorities
✅ Process improvements identified

## Integration with Other Checklists

**Before Weekly Review**: Ensure all issues from week completed via `/tidyup`

**After Weekly Review**: Use project-start.md patterns for next phase

**Pre-Launch**: Weekly reviews feed into pre-launch.md checklist

---

**Recommended Schedule**:
- **Fridays 4-5pm**: Reflect on week, document learnings
- **Mondays 9-10am**: Plan week, adjust priorities
- **Choose one**: Don't do both, pick what works for team

*Consistency matters more than perfection*