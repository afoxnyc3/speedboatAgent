# Project Start Checklist

> **Day 1 setup for maximum productivity with Claude Code**

Use this checklist when starting a new project to set up the proven documentation and workflow system.

## Phase 1: Initial Setup (30 minutes)

### 1.1 Repository Setup
- [ ] Create Git repository
- [ ] Initialize with README.md
- [ ] Add .gitignore (use appropriate template)
- [ ] Create main branch protection rules
- [ ] Set up CI/CD placeholder (GitHub Actions workflow file)

### 1.2 Documentation Foundation
- [ ] Copy `CLAUDE.md.template` → `CLAUDE.md`
- [ ] Fill in Project Overview section
- [ ] Document Technical Architecture (stack, APIs)
- [ ] Define Performance Requirements
- [ ] Specify Development Standards
- [ ] Configure Environment Variables section

### 1.3 Project Planning
- [ ] Copy `project-spec.md.template` → `project-spec.md`
- [ ] Define Product Requirements
- [ ] List Core Features with acceptance criteria
- [ ] Document Success Metrics
- [ ] Create Cost Projections (if applicable)
- [ ] Identify Risk Mitigation strategies

### 1.4 Workflow Documentation
- [ ] Copy `workflow.md.template` → `workflow.md`
- [ ] Customize branch strategy for team
- [ ] Define commit message format
- [ ] Create PR template
- [ ] Document deployment process

### 1.5 Planning Documents
- [ ] Copy `roadmap.md.template` → `roadmap.md`
- [ ] Break project into phases (Week 1, 2, 3, 4)
- [ ] Create GitHub issues for Phase 1 (at minimum)
- [ ] Assign priorities (P0-P3)
- [ ] Estimate time for each issue

- [ ] Copy `todo.md.template` → `todo.md`
- [ ] Add first 3-5 tasks from Phase 1
- [ ] Mark current task as in_progress

- [ ] Copy `scratchpad.md.template` → `scratchpad.md`
- [ ] Add initial planning notes

## Phase 2: Claude Code Configuration (15 minutes)

### 2.1 Directory Setup
```bash
mkdir -p .claude/commands .claude/agents
```

### 2.2 Essential Commands
- [ ] Copy `work.md.example` → `.claude/commands/work.md`
- [ ] Customize for your project structure
- [ ] Update roadmap.md reference
- [ ] Adjust code quality standards if needed

- [ ] Copy `tidyup.md.example` → `.claude/commands/tidyup.md`
- [ ] Verify documentation files match your setup
- [ ] Customize commit message format if different

### 2.3 Core Agents (Select What's Relevant)
- [ ] Copy relevant agent examples to `.claude/agents/`
  - [ ] `tdd-orchestrator.md.example` (if using TDD)
  - [ ] `ai-engineer.md.example` (if AI project)
  - [ ] `frontend-developer.md.example` (if has UI)
  - [ ] Create custom agents for your domain

### 2.4 Permissions Configuration
- [ ] Copy `settings.local.json.example` → `.claude/settings.local.json`
- [ ] Add safe git operations to `allow`
- [ ] Add test/lint commands to `allow`
- [ ] Add domain-specific safe operations
- [ ] Review and adjust permissions

## Phase 3: Development Environment (20 minutes)

### 3.1 Environment Configuration
- [ ] Create `.env.example` with all required variables
- [ ] Document each variable's purpose
- [ ] Create `.env.local` (add to .gitignore)
- [ ] Set up required services (database, APIs, etc.)
- [ ] Verify environment variables load correctly

### 3.2 Development Tools
- [ ] Install dependencies (`npm install`, etc.)
- [ ] Configure linter (ESLint, etc.)
- [ ] Configure formatter (Prettier, etc.)
- [ ] Set up TypeScript config (if applicable)
- [ ] Configure test framework

### 3.3 Git Hooks (Optional but Recommended)
```bash
npm install -D husky lint-staged
npx husky init
```

- [ ] Create pre-commit hook (lint + typecheck)
- [ ] Create pre-push hook (tests)
- [ ] Create commit-msg hook (format validation)
- [ ] Test hooks work correctly

## Phase 4: First Issue Setup (10 minutes)

### 4.1 Create First Issue
- [ ] Create Issue #1 in GitHub (or roadmap.md)
- [ ] Assign priority (typically P0 or P1)
- [ ] Write acceptance criteria
- [ ] Estimate time
- [ ] Link to any dependencies

### 4.2 Test Workflow
```bash
/work              # Test auto-selection
/work 1            # Test specific issue selection
```

- [ ] Verify `/work` command works
- [ ] Verify branch creation
- [ ] Verify documentation updates
- [ ] Fix any issues with workflow

## Phase 5: Documentation Completion (15 minutes)

### 5.1 Additional Docs (Create Later, Templates Ready)
- [ ] Copy `progress.md.template` (use after first milestone)
- [ ] Copy `decision-log.md.template` (use before first ADR)
- [ ] Copy `change-log.md.template` (use before first release)
- [ ] Copy `branching.md.template` (if team needs detailed git guide)

### 5.2 README.md Enhancement
- [ ] Add project description
- [ ] Document setup instructions
- [ ] List available scripts/commands
- [ ] Add contribution guidelines
- [ ] Link to key documentation files

## Phase 6: Validation (10 minutes)

### 6.1 Documentation Review
- [ ] All templates filled with project-specific info
- [ ] No `[PLACEHOLDER]` markers remaining
- [ ] Cross-references between docs work
- [ ] Environment variables documented

### 6.2 Workflow Test
- [ ] Run `/work` → should select Issue #1
- [ ] Create test commit → verify format
- [ ] Run tests → verify they pass
- [ ] Run linter → verify no errors
- [ ] Build project → verify success

### 6.3 Team Onboarding Test
- [ ] Can someone else clone and set up? (if team project)
- [ ] Are setup instructions clear?
- [ ] Do they understand the workflow?
- [ ] Can they run `/work` successfully?

## Quick Start Summary

**Minimum Viable Setup** (if time-constrained):

```bash
# 1. Essential docs (15 min)
cp lessons/templates/CLAUDE.md.template CLAUDE.md
cp lessons/templates/roadmap.md.template roadmap.md
cp lessons/templates/todo.md.template todo.md
# Fill in with your project details

# 2. Essential commands (5 min)
mkdir -p .claude/commands
cp lessons/examples/.claude/commands/work.md.example .claude/commands/work.md

# 3. Create first issue (5 min)
# Add to roadmap.md or create in GitHub

# 4. Test workflow (2 min)
/work    # Should select your first issue
```

**Total: ~27 minutes for MVP setup**

## Project-Specific Customization

### Small Projects (< 2 weeks)
**Use**: CLAUDE.md, roadmap.md, todo.md, `/work` command
**Skip**: progress.md, decision-log.md, change-log.md, custom agents

### Medium Projects (2-8 weeks)
**Use**: All templates
**Customize**: All commands and 2-3 relevant agents

### Large Projects (> 8 weeks)
**Use**: All templates + additional custom docs
**Add**: Team-specific workflows, advanced agents, detailed monitoring

## Common Setup Issues

### Issue: `/work` command doesn't work
**Solution**:
- Verify file is at `.claude/commands/work.md`
- Check markdown formatting
- Restart Claude Code
- Verify roadmap.md exists and has issues

### Issue: Git hooks failing
**Solution**:
- Check hook permissions: `chmod +x .husky/*`
- Verify commands in hooks are correct
- Test commands manually first
- Consider skipping hooks initially

### Issue: Documentation feels overwhelming
**Solution**:
- Start with minimal setup (CLAUDE.md, roadmap.md, todo.md)
- Add more docs as needed
- Don't create docs you won't maintain
- Quality > quantity

## Success Indicators

✅ `/work` command selects first issue
✅ All placeholders filled in CLAUDE.md
✅ First issue created with acceptance criteria
✅ Tests run successfully
✅ Git workflow works (branch, commit, push)
✅ Team can onboard from README
✅ CI/CD pipeline configured

## Next Steps

After setup complete:
1. Run `/work` to start first issue
2. Follow TDD cycle (red → green → refactor)
3. Update todo.md as you progress
4. Use scratchpad.md for notes
5. Run `/tidyup` when issue complete
6. Review weekly-review.md checklist

---

**Estimated Total Time**: 90-120 minutes for complete setup
**Minimum Time**: 25-30 minutes for MVP

*Refer to guides/ for detailed explanations of each component*