# /work Command - Development Workflow

## Description
Start development on a specific issue from the roadmap.

## Usage
```
/work              # Auto-select next priority issue
/work <issue-id>   # Work on specific issue
```

## Auto-Selection Logic (When No Issue ID Provided)

### Priority-Based Selection
1. **P0 (Critical)**: Always take P0 issues first
2. **P1 (High)**: If no P0, take next P1 in roadmap order
3. **P2 (Medium)**: If no P1, take next P2
4. **P3 (Low)**: If no P2, take next P3

### Selection Process
- Check `roadmap.md` for pending issues by priority
- Within same priority, follow roadmap sequence
- Display selection with justification:
  ```
  Selected Issue #25 (P0): Performance optimization and caching
  Reason: Only remaining P0 issue, critical for 70% cache hit rate target
  ```
- If issue-id provided, use specified issue (manual override)

## Workflow Steps

### 0. Issue Selection (Auto or Manual)
- If no issue-id: Run auto-selection logic above
- If issue-id provided: Validate issue exists and proceed
- Display selected issue and rationale

### 1. Initialize
- Check `roadmap.md` for issue details
- Create feature branch per `branching.md` strategy
- Switch to new branch

### 2. Plan
- Analyze issue requirements from project-spec.md
- Decompose into technical tasks in `scratchpad.md`
- Create atomic task list in `todo.md`

### 3. Execute (TDD Cycle)
- Write test first
- See test fail
- Write minimal code to pass
- Refactor if needed
- Update `todo.md` after each task
- Save changes frequently
- Run full test suite

### 4. Validate
- Ensure all tests pass
- Verify server runs without errors
- Confirm requirements are met
- Document decisions in `decision-log.md`

### 5. Complete & Cleanup
- **Create Pull Request**: Create PR with descriptive title
- **Merge to Main**: After CI passes, merge PR
- **Update Documentation**:
  - Mark issue complete in `roadmap.md`
  - Update completion percentage in `progress.md`
  - Archive completed tasks in `todo.md`
- **Close GitHub Issue**: Add implementation summary
- **Branch Cleanup**:
  - Switch to main branch
  - Pull latest changes
  - Delete feature branch
- **Push to Remote**: `git push origin main` (ensure all changes synced)
- **Run /tidyup**: Final documentation alignment
- **Verify Sync**: `git status` should show "up to date with origin/main"
- **Ready Message**: "Ready for next issue. Run /work to continue."

## Pre-Flight Checklist
Before starting:
- [ ] **Check for unpushed commits**: `git status`
- [ ] **If commits pending**: `git push origin main` (required before starting new work)
- [ ] Read last entry in `scratchpad.md`
- [ ] Check current tasks in `todo.md`
- [ ] Review recent `change-log.md`
- [ ] Verify priorities in `roadmap.md`

## Code Standards
- Functions: 15 lines max
- Files: 100 lines max
- Classes: 50 lines max
- Single responsibility principle
- No nested ternaries

## Priority System
- **P0 (Critical)**: Production blockers, performance issues, security fixes
- **P1 (High)**: Core features, user experience improvements
- **P2 (Medium)**: Enhancements, optimization, monitoring
- **P3 (Low)**: Nice-to-have features, documentation updates

## Example Workflow

### Auto-Selection Example
```bash
User: /work
Assistant:
Selected Issue #25 (P0): Performance optimization and caching
Reason: Only remaining P0 issue, critical for 70% cache hit rate target

Creating branch: feature/25-performance-optimization
[Proceeds with implementation...]

✅ Issue #25 complete (11→12 issues, 61%→67% progress)
✅ PR #37 merged to main
✅ Documentation updated

Ready for next issue. Run /work to continue.

User: /work
Assistant:
Selected Issue #9 (P1): Redis cache setup
Reason: Next P1 priority, builds on #25 performance work
[Continues...]
```

### Manual Override Example
```bash
User: /work 15
Assistant:
Working on Issue #15 (P1): Source attribution system
Note: Overriding priority order (P0 issue #25 available)
[Proceeds with specified issue...]
```

## Integration with Agents
This command may invoke:
- `issue-analyzer` agent for requirement analysis
- `tdd-executor` agent for test-driven development
- Automatic documentation updates via enhanced workflow
