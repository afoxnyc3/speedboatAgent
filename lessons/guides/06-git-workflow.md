# Git Workflow Guide

> **Branch/PR/commit patterns from a 95% success project**

## Core Workflow

**Simple but Strict**: Feature branches + Pull Requests + Protected main

```
main (protected, always deployable)
  ├── feature/#11-search-api
  ├── fix/#74-infinite-loop
  └── perf/#61-response-time
```

## Branch Strategy

### Branch Naming

```bash
<type>/<issue>-<description>

Types:
- feature/  # New functionality
- fix/      # Bug fixes
- perf/     # Performance improvements
- refactor/ # Code restructuring
- chore/    # Maintenance tasks
- hotfix/   # Emergency production fixes

Examples:
feature/11-search-api-endpoint
fix/74-infinite-loop-chat
perf/61-achieve-2s-response
refactor/80-split-large-files
chore/upgrade-dependencies
hotfix/127-critical-security
```

### Branch Lifecycle

```bash
# 1. Create from main
git checkout main
git pull origin main
git checkout -b feature/11-search-api

# 2. Work with atomic commits
git add src/app/api/search/route.ts
git commit -m "feat: #11 implement hybrid search endpoint"

git add tests/api/search.test.ts
git commit -m "test: #11 add search endpoint tests"

# 3. Keep updated (for long-lived branches)
git fetch origin
git rebase origin/main  # or merge if you prefer

# 4. Push to remote
git push -u origin feature/11-search-api

# 5. Create PR
gh pr create --title "feat: #11 Search API endpoint" \
  --body "Closes #11"

# 6. After merge, cleanup
git checkout main
git pull origin main
git branch -d feature/11-search-api
git push origin --delete feature/11-search-api
```

## Commit Messages

### Format

```
<type>: #<issue> <imperative summary>

[optional body explaining what and why]

[optional footer]
```

### Types

- `feat`: New feature for users
- `fix`: Bug fix
- `perf`: Performance improvement
- `refactor`: Code restructure (no behavior change)
- `test`: Test additions/changes
- `docs`: Documentation
- `chore`: Maintenance (deps, config)
- `style`: Formatting (no logic change)
- `hotfix`: Emergency production fix

### Examples

```bash
# Simple feature
git commit -m "feat: #11 implement hybrid search endpoint"

# Bug fix with explanation
git commit -m "fix: #74 resolve infinite loop in chat

The onSendMessage callback was being called twice:
once on user submit and once after streaming completion.
Removed duplicate call in handleStreamComplete."

# Performance improvement
git commit -m "perf: #61 add parallel memory and search fetching

Reduced response time from 20s to 8-12s by using
Promise.allSettled for concurrent operations."

# Breaking change
git commit -m "feat: #15 redesign source attribution system

BREAKING CHANGE: Citation interface now includes
authorityLevel and lineReference fields. Update
any code that creates Citation objects."

# Multi-issue commit (rare, avoid if possible)
git commit -m "chore: #80 resolve TypeScript compilation errors

Fixes #80, #81, #82

- Added branded type helpers
- Fixed message role normalization
- Enhanced Redis client types"
```

### Commit Best Practices

✅ **Atomic commits** - One logical change per commit
✅ **Present tense** - "add feature" not "added feature"
✅ **Imperative mood** - "fix bug" not "fixes bug"
✅ **Reference issue** - Always include #<issue>
✅ **Explain why** - Not just what changed
✅ **Separate subject/body** - Blank line between
❌ **Avoid "WIP"** - Squash before merging
❌ **Avoid "fix typo"** - Squash with relevant commit
❌ **Avoid huge commits** - Break into logical pieces

## Pull Requests

### PR Title Format

```
<type>: #<issue> <clear description>

Examples:
feat: #11 Search API endpoint with hybrid search
fix: #74 Infinite loop in chat streaming interface
perf: #61 Achieve 2-3s chat response time
```

### PR Description Template

```markdown
## Summary
[1-2 sentences describing what this PR does]

## Issue
Closes #<issue-number>
<!-- Use Closes, Fixes, or Resolves for auto-closure -->

## Changes
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] No console errors/warnings

## Performance Impact
- [Metric]: [Impact or "No change"]
- Response time: 20s → 8-12s (60% improvement)
- Cache hit rate: 73% (target: 70%)

## Breaking Changes
[List any breaking changes, or "None"]

## Screenshots/Videos
[If UI changes, include visual evidence]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] CI passing
```

### PR Review Process

```
1. Author: Create PR with complete description
2. CI: Automated checks run (tests, lint, typecheck, build)
3. Claude Code: code-reviewer agent (optional but recommended)
4. Human: Code review for quality and correctness
5. Author: Address feedback, push updates
6. Approver: Approve when satisfied
7. Merge: Squash and merge (or merge commit per team policy)
```

### PR Best Practices

✅ **Small PRs** - Under 400 lines if possible
✅ **Single purpose** - One issue per PR
✅ **Self-review first** - Catch obvious issues
✅ **Update docs** - Keep docs in sync
✅ **Resolve conflicts** - Rebase or merge main
✅ **Wait for CI** - Don't merge on red
✅ **Descriptive title** - Clear what PR does
❌ **Huge PRs** - Hard to review, high risk
❌ **Multiple issues** - Split into separate PRs
❌ **Skip tests** - Always include tests
❌ **Ignore feedback** - Address or discuss

## Branch Protection

### Main Branch Rules

```yaml
Required:
- Pull request reviews: 1-2 reviewers
- Status checks must pass:
  - lint
  - typecheck
  - test
  - build
- Branch must be up to date before merging
- Include administrators in restrictions

Forbidden:
- Direct pushes to main
- Force pushes
- Branch deletion

Optional:
- Require linear history (no merge commits)
- Require signed commits
- Dismiss stale reviews
```

### Setting Up Protection

```bash
# Via GitHub CLI
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  -f required_status_checks='{"strict":true,"contexts":["lint","test","typecheck","build"]}' \
  -f required_pull_request_reviews='{"required_approving_review_count":1}' \
  -f enforce_admins=true \
  -f restrictions=null
```

## Merge Strategies

### Strategy 1: Squash and Merge (Recommended)

**Use When**: Most feature branches

**Pros**:
- Clean main branch history
- One commit per feature/fix
- Easy to revert if needed

**Cons**:
- Loses individual commit history
- Cannot revert specific commits within PR

```bash
# Result in main
feat: #11 implement search API endpoint

[Entire PR squashed into one commit]
```

### Strategy 2: Merge Commit

**Use When**: Want to preserve branch history

**Pros**:
- Preserves all commits
- Shows feature development process
- Can cherry-pick individual commits

**Cons**:
- Cluttered main history
- Harder to follow

```bash
# Result in main
Merge pull request #123 from feature/11-search-api

feat: #11 implement hybrid search
test: #11 add search tests
docs: #11 update API documentation
```

### Strategy 3: Rebase and Merge

**Use When**: Want linear history with all commits

**Pros**:
- Linear history
- All commits preserved
- No merge commits

**Cons**:
- Rewrites history (confusing if not understood)
- Can't identify PR boundaries

```bash
# Result in main (all commits from branch)
feat: #11 implement hybrid search
test: #11 add search tests
docs: #11 update API documentation
```

**SpeedboatAgent Choice**: Squash and merge for clean history

## Conflict Resolution

### During Rebase

```bash
# Start rebase
git checkout feature/11-search-api
git fetch origin
git rebase origin/main

# If conflicts occur
# 1. Fix conflicts in files
# 2. Stage resolved files
git add [resolved-files]

# 3. Continue rebase
git rebase --continue

# If you mess up
git rebase --abort
```

### During Merge

```bash
# Start merge
git checkout feature/11-search-api
git merge origin/main

# If conflicts occur
# 1. Fix conflicts in files
# 2. Stage resolved files
git add [resolved-files]

# 3. Complete merge
git commit -m "merge: resolve conflicts with main"

# If you mess up
git merge --abort
```

### Conflict Prevention

✅ **Pull frequently** - Stay in sync with main
✅ **Small PRs** - Fewer conflicts
✅ **Communicate** - Coordinate on shared files
✅ **Rebase often** - For long-lived branches

## Hotfix Workflow

**Use When**: Critical production issue requiring immediate fix

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/127-critical-security

# 2. Implement minimal fix
git add [files]
git commit -m "hotfix: #127 patch security vulnerability"

# 3. Test thoroughly
npm test
npm run test:e2e

# 4. Create urgent PR
gh pr create \
  --title "hotfix: #127 Critical security patch" \
  --body "Fixes #127 [URGENT]" \
  --label "priority:P0,type:hotfix"

# 5. Fast-track review and merge
# (May bypass some checks if truly urgent)

# 6. Tag immediately after merge
git checkout main
git pull origin main
git tag -a v1.0.1 -m "Hotfix: Security patch"
git push origin v1.0.1

# 7. Verify deployment
# 8. Monitor for issues
```

## Push Frequency

### When to Push

✅ **After completing issue** - Before starting next
✅ **After doc updates** - Keep remote in sync
✅ **After `/tidyup`** - Ensure changes saved
✅ **Before `/work`** - Check for unpushed commits
✅ **End of session** - Never leave unpushed commits
⚠️ **Maximum delay** - Never > 2-3 commits without pushing

### Verification

```bash
# Check sync status
git status

# Good (in sync)
Your branch is up to date with 'origin/main'

# Action needed (push required)
Your branch is ahead of 'origin/main' by 2 commits
  (use "git push" to publish your local commits)
```

## Git Hooks (Optional)

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run typecheck
npm test
```

### Pre-push Hook

```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run build
npm run test:integration
```

### Commit-msg Hook

```bash
# .husky/commit-msg
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Enforce commit message format
npx commitlint --edit $1
```

## Common Scenarios

### Scenario 1: Forgot to Create Branch

```bash
# You committed to main by mistake
git checkout -b feature/fix-mistake
git push -u origin feature/fix-mistake

# Reset main to match remote
git checkout main
git reset --hard origin/main
```

### Scenario 2: Want to Split Commits

```bash
# Interactive rebase
git rebase -i HEAD~3

# Mark commits to edit:
pick abc123 feat: add feature
edit def456 fix: multiple fixes  # Want to split this
pick ghi789 docs: update docs

# Split the commit
git reset HEAD^
git add file1.ts
git commit -m "fix: #74 issue A"
git add file2.ts
git commit -m "fix: #75 issue B"
git rebase --continue
```

### Scenario 3: Update Commit Message

```bash
# Last commit
git commit --amend -m "feat: #11 updated message"

# Older commits
git rebase -i HEAD~3
# Change 'pick' to 'reword' for commits to update
```

### Scenario 4: Undo Last Commit

```bash
# Keep changes (soft reset)
git reset --soft HEAD~1

# Discard changes (DANGEROUS!)
git reset --hard HEAD~1
```

## Success Indicators

✅ Zero force pushes to main
✅ All work in feature branches
✅ Clean, linear main history
✅ PRs merged within 24 hours
✅ No "WIP" or "fix typo" commits in main
✅ Easy to revert any feature
✅ Clear what each commit does

---

*Last Updated: 2025-09-30*
*Based on: SpeedboatAgent git workflow*