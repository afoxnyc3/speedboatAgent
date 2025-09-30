# Custom Commands Guide

> **Building `/work`-style automation for your project**

## What Makes a Great Custom Command?

The `/work` command from SpeedboatAgent automated an entire development cycle. Here's how to build commands that deliver similar value.

## Anatomy of the /work Command

### The Power Pattern

```
/work → Auto-select → Verify → Create Branch → Implement → Document → Close Issue → Cleanup
```

**Time Saved**: ~15 minutes per issue × 20 issues = 5 hours saved
**Decisions Eliminated**: Priority selection, branch naming, doc updates, cleanup steps

### Key Innovations

1. **Auto-Prioritization**: Removes decision fatigue
2. **Issue Verification**: Prevents duplicate work
3. **Impact Analysis**: Identifies conflicts early
4. **Documentation Integration**: Updates happen automatically
5. **Complete Cycle**: From selection to cleanup

## Building Your First Command

### Step 1: Identify Repetitive Workflows

**Good candidates**:
- ✅ Workflows you do 5+ times per week
- ✅ Multi-step processes you occasionally forget
- ✅ Processes that vary by context (branch, environment)
- ✅ Tasks requiring documentation updates

**Poor candidates**:
- ❌ One-time setup tasks
- ❌ Tasks requiring human judgment
- ❌ Simple single commands (`git status`)

### Step 2: Map the Workflow

Example: "Deploy to Staging" command

```markdown
Current Manual Process:
1. Check tests pass
2. Create release branch
3. Update version in package.json
4. Build application
5. Run deployment script
6. Verify deployment health
7. Update deployment log
8. Notify team in Slack

Problems:
- Easy to forget steps 3, 7, 8
- No verification before deploying
- Manual environment validation
```

### Step 3: Design the Command Interface

```markdown
# /deploy-staging - Deploy to Staging Environment

## Usage
/deploy-staging [version-bump-type]
# version-bump-type: major | minor | patch (default: patch)

## Pre-flight Checklist
- [ ] All tests passing
- [ ] No uncommitted changes
- [ ] Main branch up to date
- [ ] Staging environment healthy
```

### Step 4: Build the Workflow

```markdown
## Workflow Steps

### 1. Validate Prerequisites
- Run test suite: `npm test`
- Check git status for uncommitted changes
- Verify main branch: `git fetch && git status`
- Check staging health: `curl https://staging-api.com/health`
- If any check fails: STOP and report issue

### 2. Create Release Branch
- Determine version bump: [version-bump-type] or 'patch'
- Create branch: `git checkout -b release/v[NEW_VERSION]`
- Update package.json: `npm version [version-bump-type] --no-git-tag-version`
- Commit: `git commit -am "chore: bump version to v[NEW_VERSION]"`

### 3. Build and Test
- Run production build: `npm run build`
- Run smoke tests: `npm run test:smoke`
- If build fails: Abort and report errors

### 4. Deploy
- Deploy to staging: `npm run deploy:staging`
- Wait for deployment completion (monitor logs)
- Capture deployment ID and timestamp

### 5. Verify Deployment
- Run health check: `curl https://staging-api.com/health`
- Run deployment verification tests: `npm run test:staging`
- Check error rates in monitoring dashboard
- If verification fails: Trigger rollback

### 6. Document and Notify
- Update deployment-log.md with:
  - Version, timestamp, deployer, commit SHA
- Create GitHub release: `gh release create v[VERSION]`
- Post to Slack: "🚀 v[VERSION] deployed to staging"
- Mark deployment issue complete

### 7. Cleanup
- Return to main branch: `git checkout main`
- Update local main: `git pull origin main`
- Display next actions: "Monitor staging for 30 minutes, then /deploy-prod"
```

### Step 5: Add Error Handling

```markdown
## Error Handling

### Tests Failing
- Display failing tests
- Suggest: "Fix tests before deploying. Run `npm test` to see failures."
- Abort deployment

### Uncommitted Changes
- Display: `git status`
- Suggest: "Commit or stash changes before deploying."
- Abort deployment

### Deployment Failure
- Capture error logs
- Trigger automatic rollback: `npm run rollback:staging`
- Notify team in Slack with error details
- Create incident issue: `gh issue create --title "Deployment failure: v[VERSION]"`
```

### Step 6: Test and Refine

```bash
# Test in different scenarios
/deploy-staging              # Default patch bump
/deploy-staging minor        # Minor version bump
/deploy-staging major        # Major version bump

# Test error conditions
/deploy-staging              # With failing tests (should abort)
/deploy-staging              # With uncommitted changes (should abort)
/deploy-staging              # While not on main (should abort or warn)
```

## Command Design Patterns

### Pattern 1: The Wizard

**Structure**: Step-by-step interactive flow
**Use When**: Multiple decisions needed
**Example**: `/setup-feature` (API + DB + Frontend)

```markdown
### 1. Determine Feature Scope
- Ask: "What type of feature? (api/frontend/fullstack)"
- If 'api': Generate API route + tests
- If 'frontend': Generate React component + tests
- If 'fullstack': Generate both + integration tests

### 2. Configure Feature
- Ask: "Feature name?" (validates format)
- Ask: "Database required?" (yes/no)
- If yes: Ask "Database table name?"
```

### Pattern 2: The Validator

**Structure**: Pre-flight checks → Action → Post-flight verification
**Use When**: High-risk operations (deploy, data migration)
**Example**: `/migrate-database`

```markdown
### 1. Pre-flight Checks
- Verify backup exists and is recent (< 1 hour old)
- Check database connection
- Validate migration files (no syntax errors)
- Confirm staging migration succeeded

### 2. Execute Migration
- Run migration: `npm run migrate:prod`
- Monitor progress with timeout (5 minutes max)
- Capture migration output

### 3. Post-flight Verification
- Check record counts match expectations
- Run data integrity tests
- Verify application still functional
- If any check fails: Trigger rollback
```

### Pattern 3: The Orchestrator

**Structure**: Coordinate multiple systems/commands
**Use When**: Complex multi-system operations
**Example**: `/release-production`

```markdown
### 1. Coordinate Deployments
- Deploy backend: `/deploy-backend prod`
- Wait for health checks
- Deploy frontend: `/deploy-frontend prod`
- Wait for CDN invalidation

### 2. Update External Systems
- Update status page: "Deployment in progress"
- Notify monitoring: "Deployment window started"
- Notify team: "Production deployment started"

### 3. Verify and Finalize
- Run end-to-end tests against production
- Check error rates < 1%
- Check response times < 2s p95
- Update status page: "Deployment complete"
```

### Pattern 4: The Context-Aware Command

**Structure**: Detect context → Adapt behavior
**Use When**: Behavior varies by state
**Example**: `/fix` (adapts based on what's broken)

```markdown
### 1. Analyze Context
- Check test results
- Check lint results
- Check typecheck results
- Check build results

### 2. Adapt Behavior
- If tests failing: Focus on test fixes
- If lint failing: Run auto-fix: `npm run lint:fix`
- If typecheck failing: Focus on type errors
- If build failing: Investigate build errors

### 3. Apply Fixes
- Fix highest-priority issues first
- Re-run checks after each fix
- Continue until all checks pass
```

## Advanced Techniques

### Technique 1: Command Composition

Commands can invoke other commands:

```markdown
### Complete Feature Implementation
1. Run `/test` to verify current state
2. Implement feature
3. Run `/test` again
4. Run `/tidyup` to finalize
5. Run `/deploy-staging` for testing
```

### Technique 2: State Machine Commands

Track command progress across sessions:

```markdown
### Feature Implementation with Checkpoints
1. Generate feature scaffold → Checkpoint saved
2. Implement business logic → Checkpoint saved
3. Add tests → Checkpoint saved
4. Integration → Checkpoint saved

Resume: `/feature --resume` picks up from last checkpoint
```

### Technique 3: Parameter Validation

```markdown
### Parse and Validate Arguments
- version-type: Must be 'major', 'minor', or 'patch'
  - If invalid: Show usage and exit
- environment: Must be 'staging' or 'prod'
  - If 'prod': Require additional confirmation
- branch-name: Must match pattern 'feature/#<issue>-*'
  - If invalid: Suggest correct format
```

### Technique 4: Dry-Run Mode

```markdown
## Usage
/deploy [environment] [--dry-run]

### Dry-Run Mode
- If --dry-run flag present:
  - Show all steps that would be executed
  - Show all commands that would run
  - Show all files that would be modified
  - DO NOT execute anything
  - Display: "Dry run complete. Run without --dry-run to execute."
```

## Real-World Command Library

### Development Commands

```markdown
/work [issue-id]           # Auto-prioritized development cycle
/fix                       # Auto-detect and fix issues
/tidyup                    # Finalize work and update docs
/review [file]             # AI code review with suggestions
```

### Testing Commands

```markdown
/test [suite]              # Run test suite (unit/integration/e2e)
/test-fix                  # Fix failing tests
/coverage-check            # Verify test coverage meets targets
```

### Deployment Commands

```markdown
/deploy-staging            # Deploy to staging with verification
/deploy-prod               # Deploy to production with safeguards
/rollback [version]        # Rollback to previous version
```

### Data Commands

```markdown
/migrate-db [direction]    # Database migration with backups
/seed-data [environment]   # Seed database with test data
/backup-db                 # Create database backup
```

### Documentation Commands

```markdown
/update-docs               # Update all documentation
/generate-api-docs         # Generate API documentation
/update-changelog [version]# Update changelog for version
```

## Testing Your Commands

### Unit Testing Strategy

Create test scenarios:

```bash
# Happy path
/deploy-staging            # Should succeed

# Error paths
/deploy-staging            # With failing tests (should abort)
/deploy-staging            # Invalid environment (should show usage)
/deploy-staging            # Network failure (should handle gracefully)

# Edge cases
/deploy-staging            # First deployment (no previous version)
/deploy-staging            # Rollback scenario (deployment fails)
```

### Integration Testing

Test command sequences:

```bash
# Full workflow
/work 25                   # Implement feature
/test                      # Verify tests pass
/tidyup                    # Finalize
/deploy-staging            # Deploy to staging
/test staging              # Run staging tests
/deploy-prod               # Deploy to production
```

## Common Pitfalls

### ❌ Over-Automation

**Problem**: Command tries to do too much
**Solution**: Break into smaller, composable commands

### ❌ Under-Documentation

**Problem**: Command behavior unclear
**Solution**: Add detailed comments and examples

### ❌ No Error Recovery

**Problem**: Command fails halfway through
**Solution**: Add rollback steps and state tracking

### ❌ Hard-Coded Values

**Problem**: Command only works in one environment
**Solution**: Parameterize environment-specific values

### ❌ No Feedback

**Problem**: Silent command execution
**Solution**: Add progress indicators and completion messages

## Measuring Command Success

✅ **Usage Frequency**: Command used 5+ times per week
✅ **Time Savings**: Saves > 5 minutes per use
✅ **Error Reduction**: Fewer "forgot to" incidents
✅ **Consistency**: Same workflow every time
✅ **Adoption**: Team members use without prompting

## Evolution Strategy

### Version 1.0: Basic Automation
- Cover happy path
- Basic error handling
- Minimal documentation

### Version 2.0: Robust
- Comprehensive error handling
- Rollback capabilities
- Detailed logging

### Version 3.0: Intelligent
- Context-aware behavior
- Auto-detection of issues
- Predictive suggestions

## Resources

- [SpeedboatAgent /work command](../examples/.claude/commands/work.md.example)
- [SpeedboatAgent /tidyup command](../examples/.claude/commands/tidyup.md.example)
- [Claude Code Documentation](https://docs.claude.com/claude-code)

---

*Last Updated: 2025-09-30*
*Command Pattern Credits: SpeedboatAgent /work command*