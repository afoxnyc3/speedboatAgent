# Documentation Strategy Guide

> **When and why to use each documentation file**

## Overview

The SpeedboatAgent project achieved 95% completion in 4 weeks using a **10-document ecosystem**. Each document serves a specific purpose and is updated at different frequencies.

This guide explains when to create, update, and reference each document.

## The Documentation Ecosystem

### Core Principle: Separation of Concerns

Each document has a single, clear purpose. This prevents:
- **Information duplication** across multiple files
- **Conflicting information** when updates happen in one place
- **Decision paralysis** about where to document something
- **Context switching** when searching for information

##

 Document-by-Document Guide

### 1. CLAUDE.md - The Technical North Star

**Purpose**: Single source of truth for all technical decisions, architecture, and development standards.

**When to Create**: Day 1 of your project

**When to Update**:
- Architecture changes
- New technology additions
- Standard/policy changes
- Success metrics evolution

**When to Reference**:
- Starting new features
- Making technical decisions
- Onboarding team members
- Claude Code sessions (read first!)

**Key Sections**:
```markdown
- Project Overview
- Technical Architecture (stack, data flow, APIs)
- Performance Requirements
- Development Standards
- Git Workflow
- Environment Configuration
- Success Metrics
```

**Pro Tips**:
- Keep under 15KB for Claude Code performance
- Use it as single context source for AI
- Update immediately when making architecture decisions
- Include both current state and aspirational goals

---

### 2. project-spec.md - The Product Vision

**Purpose**: Product requirements and business context for the project.

**When to Create**: During planning phase, before implementation

**When to Update**:
- Requirements changes
- Feature scope adjustments
- User feedback integration
- Business metric evolution

**When to Reference**:
- Planning sprints
- Prioritizing features
- Validating completeness
- Stakeholder communication

**Key Sections**:
```markdown
- Product Requirements
- Core Features
- Success Metrics (business-focused)
- UX Design
- Cost Projections
- Risk Mitigation
```

**Difference from CLAUDE.md**:
- project-spec.md: **WHAT** to build and **WHY**
- CLAUDE.md: **HOW** to build it and **WITH WHAT**

---

### 3. workflow.md - The Process Manual

**Purpose**: Standardized development process from issue to deployment.

**When to Create**: Early in project, before team scales

**When to Update**:
- Process improvements discovered
- New tools adopted
- Team structure changes
- Quality gate additions

**When to Reference**:
- Starting new issues
- Creating PRs
- Code reviews
- Deployment procedures

**Key Sections**:
```markdown
- Branch Strategy
- Issue-Driven Development
- Implementation Standards
- PR Process
- Code Review Guidelines
- Deployment Process
```

**Pro Tips**:
- Include examples for common scenarios
- Link to project-spec.md and CLAUDE.md
- Update based on retrospectives
- Make it the onboarding document

---

### 4. roadmap.md - The Strategic Plan

**Purpose**: Project timeline, issue prioritization, and phase organization.

**When to Create**: After project-spec.md, during planning

**When to Update**:
- Daily (issue status changes)
- Sprint planning sessions
- Priority adjustments
- Milestone completions

**When to Reference**:
- Selecting next issue to work on
- Sprint planning
- Progress reporting
- Stakeholder updates

**Key Sections**:
```markdown
- Current Focus
- Success Metrics (tracking)
- Phased Implementation (by week/sprint)
- Completed Issues
- Timeline
- Testing Strategy
```

**Organization Pattern**:
```
Phase 0: Critical Blockers (P0)
Phase 1: Foundation (P0-P1)
Phase 2: Core Features (P0-P2)
Phase 3: Enhancements (P1-P2)
Phase 4: Polish (P2-P3)
```

---

### 5. todo.md - The Daily Driver

**Purpose**: Active task tracking and immediate focus management.

**When to Create**: Day 1 of implementation

**When to Update**:
- Multiple times per day
- After completing tasks
- When discovering new tasks
- During /tidyup

**When to Reference**:
- Starting each work session
- During development
- When context switching
- Before ending work day

**Key Sections**:
```markdown
- Current Phase
- Active Issues (by priority)
- Completed (recent)
- Archived (older completions)
- Development Notes
- Blockers & Dependencies
```

**Pro Tips**:
- Keep "Active" section under 10 items
- Archive completed work weekly
- Clear scratchpad references when done
- Use for quick status checks

**Update Frequency**: Most frequent of all docs (hourly during active development)

---

### 6. progress.md - The Milestone Tracker

**Purpose**: Historical record of completed milestones and metrics achievement.

**When to Create**: After first major milestone

**When to Update**:
- After completing phases/sprints
- Weekly for metric tracking
- After significant achievements
- Before status meetings

**When to Reference**:
- Retrospectives
- Performance reviews
- Velocity calculation
- Stakeholder reporting

**Key Sections**:
```markdown
- Current Status Summary
- Completed Milestones (by phase)
- GitHub Issues Status
- Performance Metrics
- Development Environment Status
- Architecture Achievements
```

**Pro Tips**:
- Include actual vs. target metrics
- Document lessons learned per phase
- Track velocity trends
- Celebrate wins!

---

### 7. decision-log.md - The Wisdom Repository

**Purpose**: Architecture Decision Records (ADRs) documenting significant technical choices.

**When to Create**: Early, before first major decision

**When to Update**:
- After making significant technical decisions
- When revisiting old decisions
- When deprecating approaches

**When to Reference**:
- Before making similar decisions
- When questioning past choices
- During architecture reviews
- Onboarding team members

**Key Sections per ADR**:
```markdown
- Context (what was the situation?)
- Decision (what did we choose?)
- Consequences (positive & negative)
- Alternatives Considered
- Implementation Notes
```

**What Qualifies as "Significant"?**
- ✅ Choosing between frameworks/libraries
- ✅ Architectural patterns (microservices vs monolith)
- ✅ Data storage strategies
- ✅ Security approaches
- ✅ Deployment strategies
- ❌ Variable naming
- ❌ Minor refactorings
- ❌ Temporary workarounds

---

### 8. change-log.md - The Version History

**Purpose**: User-facing record of changes following [Keep a Changelog](https://keepachangelog.com/) format.

**When to Create**: Before first release/deployment

**When to Update**:
- After merging significant PRs
- Before releases
- When documenting breaking changes

**When to Reference**:
- Creating release notes
- Understanding version history
- Debugging "when did X change?"
- Communicating with users/stakeholders

**Key Sections per Version**:
```markdown
- Added (new features)
- Changed (changes in existing)
- Fixed (bug fixes)
- Removed (removed features)
- Security (security fixes)
- Performance (improvements)
```

**Semantic Versioning**:
- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features (backward compatible)
- **Patch (0.0.X)**: Bug fixes

---

### 9. branching.md - The Git Reference

**Purpose**: Git workflow, branching strategy, and commit conventions.

**When to Create**: Before first branch creation

**When to Update**:
- Rarely (only when git strategy evolves)
- When adopting new tools (e.g., GitHub CLI)
- When changing merge strategies

**When to Reference**:
- Creating branches
- Writing commit messages
- Creating PRs
- Resolving conflicts

**Key Sections**:
```markdown
- Branch Types & Naming
- Workflow Examples
- Commit Message Format
- PR Template
- Merge Strategy
- Protection Rules
```

---

### 10. scratchpad.md - The Working Memory

**Purpose**: Temporary workspace for current issue planning and debugging notes.

**When to Create**: Day 1

**When to Update**:
- Constantly during active development
- **Clear when starting new issue**

**When to Reference**:
- During active development
- When resuming interrupted work
- For quick notes that don't belong elsewhere

**Key Sections**:
```markdown
- Current Work
- Quick Context
- Today's Goals
- Planning Notes
- Debugging Notes
- Random Thoughts
```

**Pro Tips**:
- This file should be **ephemeral**
- Clear it with `/work` or `/tidyup`
- Don't let it become permanent storage
- Use it for thinking out loud

---

## Documentation Workflow by Activity

### Starting a New Project
1. ✅ Create CLAUDE.md (technical foundation)
2. ✅ Create project-spec.md (product requirements)
3. ✅ Create roadmap.md (plan phases and issues)
4. ✅ Create workflow.md (process standards)
5. ✅ Create branching.md (git strategy)
6. ✅ Create todo.md (for first tasks)
7. ✅ Create scratchpad.md (working notes)
8. 📋 Create decision-log.md (before first ADR)
9. 📋 Create progress.md (after first milestone)
10. 📋 Create change-log.md (before first release)

### Starting a New Issue
1. **Read**: roadmap.md (confirm priority)
2. **Update**: todo.md (add to active tasks)
3. **Clear**: scratchpad.md (fresh workspace)
4. **Reference**: CLAUDE.md (technical standards)
5. **Reference**: project-spec.md (feature requirements)

### Completing an Issue
1. **Update**: todo.md (mark complete, archive)
2. **Update**: roadmap.md (mark issue done)
3. **Update**: progress.md (if milestone reached)
4. **Update**: change-log.md (if user-facing change)
5. **Update**: decision-log.md (if significant decision made)
6. **Clear**: scratchpad.md (prepare for next issue)

### Weekly Review
1. **Update**: roadmap.md (adjust priorities)
2. **Update**: progress.md (track metrics)
3. **Review**: change-log.md (ensure completeness)
4. **Review**: decision-log.md (document missing ADRs)
5. **Archive**: todo.md completed items

### Sprint Planning
1. **Reference**: project-spec.md (feature requirements)
2. **Update**: roadmap.md (plan next sprint issues)
3. **Review**: progress.md (velocity from last sprint)
4. **Update**: todo.md (prep for sprint start)

---

## Document Update Frequency

| Document | Update Frequency | Owner |
|----------|-----------------|-------|
| scratchpad.md | Hourly (during work) | Individual developer |
| todo.md | Multiple daily | Individual developer |
| roadmap.md | Daily | Team/PM |
| progress.md | Weekly | Team lead |
| change-log.md | Per PR merge | Developer |
| CLAUDE.md | Per architecture change | Tech lead |
| workflow.md | Monthly | Team |
| branching.md | Rarely | Tech lead |
| project-spec.md | Per requirements change | PM/Product |
| decision-log.md | Per significant decision | Tech lead/Team |

---

## Adapting for Project Size

### Small Projects (< 2 weeks)
**Minimal Set** (3 files):
- CLAUDE.md
- roadmap.md
- todo.md

**Skip**: decision-log.md, change-log.md, progress.md, workflow.md

### Medium Projects (2-8 weeks)
**Full Set** (10 files)

Use all templates, update as needed

### Large Projects (> 8 weeks, multiple teams)
**Full Set + Custom Additions**:
- Add team-specific workflow docs
- Add API documentation
- Add architecture diagrams folder
- Add meeting notes
- Add incident response docs

---

## Common Mistakes to Avoid

### 1. Information Duplication
❌ **Don't**: Copy technical details from CLAUDE.md to project-spec.md
✅ **Do**: Cross-reference with links

### 2. Stale Documentation
❌ **Don't**: Update code without updating CLAUDE.md
✅ **Do**: Make doc updates part of PR requirements

### 3. Over-Documentation
❌ **Don't**: Document every tiny decision in decision-log.md
✅ **Do**: Only document significant, non-obvious choices

### 4. Under-Documentation
❌ **Don't**: Skip ADRs because "everyone knows why"
✅ **Do**: Future you won't remember, future teammates won't know

### 5. Wrong Document Choice
❌ **Don't**: Put active tasks in progress.md
✅ **Do**: Active tasks go in todo.md, completed go in progress.md

---

## Integration with Claude Code

### Reading Order for AI Context
1. **CLAUDE.md** - Technical foundation
2. **project-spec.md** - Product requirements
3. **todo.md** - Current focus
4. **scratchpad.md** - Active thinking

### Update Triggers for AI Workflows
- **/work command**: Read roadmap.md, update todo.md, clear scratchpad.md
- **/tidyup command**: Update all relevant docs, prepare for PR
- **Post-merge**: Update progress.md, change-log.md, archive todo.md items

---

## Success Indicators

Your documentation strategy is working when:

✅ New team members can onboard from docs alone
✅ Context switches take < 5 minutes
✅ Decisions are documented before implementation
✅ No one asks "where is X documented?"
✅ Docs stay current without forcing
✅ Claude Code can reference full context from CLAUDE.md
✅ Stakeholders can get status from progress.md

---

## Further Reading

- [Architecture Decision Records](https://adr.github.io/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Documentation-Driven Development](https://gist.github.com/zsup/9434452)

---

*Last Updated: 2025-09-30*
*Based on: SpeedboatAgent project success patterns*