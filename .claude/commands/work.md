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

### 0.5. Issue Verification & Impact Analysis
**Purpose**: Prevent duplicate work and ensure changes won't break existing functionality

#### GitHub Issue State Verification
- Check current issue status: `gh issue view <issue-id>`
- Review issue comments for recent updates or resolutions
- Look for linked PRs that may have already addressed the issue
- Check if issue has been labeled as resolved or duplicate

#### Codebase Analysis for Existing Solutions
- Search commit history for issue references:
  ```bash
  git log --grep="<issue-id>" --oneline
  git log --grep="<issue-keywords>" --oneline --since="1 month ago"
  ```
- Check for hotfix branches that may have addressed the issue:
  ```bash
  git branch -a | grep -E "(hotfix|emergency|fix).*<issue-keywords>"
  ```
- Review recent changes in related files:
  ```bash
  git log --oneline --since="2 weeks ago" -- <related-file-paths>
  ```

#### Requirement Validation
- Verify issue requirements are still current and valid
- Check if dependencies or prerequisites have changed
- Confirm issue priority hasn't been superseded by newer requirements
- Review related issues for context changes

#### Impact Analysis
- Identify files and components that will be modified
- Check for potential conflicts with ongoing work:
  ```bash
  git branch -a | grep -E "(feature|fix)" | head -10
  ```
- Review recent commits in target areas for potential conflicts
- Assess backward compatibility requirements
- Identify test coverage needs

#### Verification Report
Generate a verification report with decision points:
```
🔍 Issue Verification Report for #<issue-id>

✅ GitHub Status: Open, no blocking PRs found
✅ Commit History: No existing solutions detected
✅ Hotfix Check: No emergency fixes found
✅ Requirements: Current and valid (last updated: <date>)
⚠️  Impact Analysis: Will modify <file-list>, low conflict risk

🎯 Decision: PROCEED with implementation
📋 Files to modify: <file-list>
🧪 Test coverage needed: <test-areas>
```

#### Decision Points
- **PROCEED**: No conflicts detected, safe to implement
- **INVESTIGATE**: Potential conflicts found, need manual review
- **SKIP**: Issue already resolved or superseded
- **ESCALATE**: Complex conflicts require discussion

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
- **Close GitHub Issue**:
  - **Automatic Closure**: Ensure PR description contains `Closes #<issue-number>` for automatic closure on merge
  - **Manual Closure** (if needed): `gh issue close <issue-number> --comment "✅ [Issue Title] complete\n\nImplemented:\n- [Key feature 1]\n- [Key feature 2]\n- [Key feature 3]\n\nAll requirements met and tests passing."`
  - **Verify Closure**: `gh issue view <issue-number>` to confirm issue is closed
  - **Implementation Summary**: Include detailed summary of what was built, key features, and validation results
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

## Enhanced Pre-Flight Validation (Phase 0.5)
Run these checks during Issue Verification & Impact Analysis:
- [ ] **GitHub Issue Status**: `gh issue view <issue-id>` (verify still open/valid)
- [ ] **Recent Comments**: Check for resolution updates or blocking information
- [ ] **Linked PRs**: Look for existing solutions via `gh pr list --search "<issue-id>"`
- [ ] **Commit History Search**: `git log --grep="<issue-id>" --oneline --since="1 month ago"`
- [ ] **Hotfix Branch Check**: `git branch -a | grep -E "(hotfix|emergency)" | head -5`
- [ ] **Recent Changes**: `git log --oneline --since="2 weeks ago" | head -10`
- [ ] **Active Branches**: `git branch -a | grep -E "(feature|fix)" | head -10`
- [ ] **Requirement Currency**: Confirm issue description matches current needs
- [ ] **Dependency Check**: Verify prerequisites haven't changed
- [ ] **Impact Assessment**: Identify files to modify and potential conflicts
- [ ] **Test Coverage Plan**: Determine what tests will be needed

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
✅ GitHub Issue #25 closed with implementation summary
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

### GitHub Issue Closure Example
```bash
# After successful PR merge, close the issue with detailed summary
gh issue close 21 --comment "✅ Web crawl scheduling automation complete

Implemented:
- BullMQ-based job scheduler with weekly cron automation (every Sunday at 2 AM)
- Change detection service using SHA-256 content hashing
- Incremental update system with force-recrawl override capability
- Comprehensive monitoring APIs for job status, health checks, and metrics
- Job management: schedule, cancel, list jobs with status tracking
- Error handling with retry logic and exponential backoff
- Integration with existing Firecrawl and Weaviate infrastructure

Testing:
- Schema validation tests with Zod type safety (18 tests passing)
- Integration test script: npm run test-crawl-automation
- Health check endpoints for operational monitoring

All requirements met and tests passing."

# Verify the issue was closed
gh issue view 21
```

## Integration with Agents
This command may invoke:
- `issue-analyzer` agent for requirement analysis
- `tdd-executor` agent for test-driven development
- Automatic documentation updates via enhanced workflow
