# Lessons Learned: Coding with Claude Code

> **Proven patterns from a production RAG agent that achieved 95% completion in 4 weeks**

This folder contains distilled wisdom from the SpeedboatAgent project—a comprehensive RAG system built using Claude Code that went from zero to production with exceptional outcomes.

## 📊 Project Success Metrics

- ✅ **95% issue completion** (19 of 20 issues)
- ✅ **4-week timeline** (foundation → production)
- ✅ **Zero hallucination policy** achieved
- ✅ **73% cache hit rate** (exceeded 70% target)
- ✅ **46+ TypeScript errors** resolved in single session
- ✅ **60% performance improvement** (20s → 8-12s)
- ✅ **100% CI/CD stability**

## 🎯 What's Inside

### 📋 [Templates](/lessons/templates/)
Ready-to-use documentation templates for instant project setup:
- `CLAUDE.md.template` - Master technical reference
- `project-spec.md.template` - Product requirements
- `workflow.md.template` - Development process
- `roadmap.md.template` - Project planning
- `todo.md.template` - Task tracking
- `progress.md.template` - Milestone tracking
- `decision-log.md.template` - Architecture Decision Records
- `change-log.md.template` - Version history
- `branching.md.template` - Git strategy
- `scratchpad.md.template` - Working notes

### 📚 [Guides](/lessons/guides/)
Comprehensive guides explaining the "why" and "how":
1. **Documentation Strategy** - When and why to use each document
2. **Claude Code Setup** - Optimizing `.claude/` configuration
3. **Custom Commands** - Building `/work`-style automation
4. **Custom Agents** - Creating specialized agents
5. **Issue-Driven Development** - GitHub-centric workflow
6. **Git Workflow** - Branch/PR/commit patterns
7. **Success Patterns** - What made this project exceptional

### 💡 [Examples](/lessons/examples/)
Real working examples from the SpeedboatAgent project:
- `.claude/commands/` - Custom slash commands
- `.claude/agents/` - Specialized agent definitions
- `settings.local.json` - Permission presets
- Sample ADR (Architecture Decision Record)

### ✅ [Checklists](/lessons/checklists/)
Actionable checklists for key milestones:
- `project-start.md` - Day 1 setup
- `weekly-review.md` - Ongoing maintenance
- `pre-launch.md` - Production readiness

## 🚀 Quick Start for New Projects

### Minimal Setup (5 minutes)
```bash
# 1. Copy essential templates
cp lessons/templates/CLAUDE.md.template CLAUDE.md
cp lessons/templates/roadmap.md.template roadmap.md
cp lessons/templates/todo.md.template todo.md

# 2. Copy .claude configuration
cp -r lessons/examples/.claude .

# 3. Fill in your project details
# Edit CLAUDE.md with your tech stack, architecture, and standards
```

### Full Setup (30 minutes)
```bash
# Copy all templates
for file in lessons/templates/*.template; do
  cp "$file" "$(basename "$file" .template)"
done

# Copy Claude configuration
cp -r lessons/examples/.claude .

# Review checklists
cat lessons/checklists/project-start.md

# Customize all templates for your project
```

## 🎨 Core Philosophy

### Documentation-First Development
- **CLAUDE.md as source of truth** - One file with complete technical context
- **Issue-driven workflow** - Every task is a tracked GitHub issue
- **Real-time updates** - Docs evolve with the codebase
- **Decision transparency** - ADRs capture architectural choices

### Claude Code Optimization
- **Custom commands** - Automate repetitive workflows (/work, /tidyup)
- **Custom agents** - Specialized expertise for different tasks
- **Permission presets** - Pre-approved safe operations
- **Plan mode** - Think before executing

### Quality Standards
- **Priority system** - P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Low)
- **Code limits** - Functions <15 lines, files <100 lines (relaxed to 350 in practice)
- **TDD enforcement** - Tests first, always
- **CI/CD gates** - Automated quality checks

## 📈 When to Use What

### Daily Development
- **CLAUDE.md** - Reference for technical decisions
- **todo.md** - Track current tasks
- **scratchpad.md** - Quick notes and planning

### Weekly Reviews
- **roadmap.md** - Update progress and priorities
- **progress.md** - Record milestone completions
- **change-log.md** - Document notable changes

### Major Decisions
- **decision-log.md** - Architecture Decision Records (ADRs)
- **project-spec.md** - Requirements changes

### Code Changes
- **workflow.md** - Follow development process
- **branching.md** - Git strategy reference

## 🎓 Key Lessons

### 1. **CLAUDE.md is Your Superpower**
A comprehensive technical reference file lets Claude Code:
- Understand your full architecture instantly
- Make consistent decisions aligned with your standards
- Reference exact patterns and requirements
- Maintain quality across sessions

### 2. **Issue-Driven Development Works**
Every task as a GitHub issue provides:
- Clear scope and requirements
- Priority-based auto-selection
- Progress tracking
- Automatic closure via PRs
- Searchable history

### 3. **Custom Commands Accelerate Development**
The `/work` command with auto-prioritization:
- Eliminated decision fatigue
- Ensured optimal task selection
- Enforced consistent workflow
- Integrated documentation updates

### 4. **Real-Time Documentation Prevents Drift**
Updating docs as you code ensures:
- Always-current technical reference
- Clear project status
- Easy onboarding
- Reduced context switching

### 5. **ADRs Capture Institutional Knowledge**
Architecture Decision Records preserve:
- Why decisions were made
- What alternatives were considered
- Trade-offs accepted
- Context for future maintainers

## 🔧 Adapting for Your Project

### Small Projects (< 2 weeks)
**Minimal docs**: CLAUDE.md, roadmap.md, todo.md
**Skip**: decision-log.md, change-log.md, progress.md
**Custom commands**: /work only

### Medium Projects (2-8 weeks)
**All core docs**: Use full template set
**Selective ADRs**: Document major decisions only
**Custom commands**: /work + /tidyup + domain-specific

### Large Projects (> 8 weeks)
**Complete ecosystem**: All templates + custom additions
**Comprehensive ADRs**: Document all significant decisions
**Full automation**: Custom commands + specialized agents
**Team coordination**: Add team-specific workflows

## 📚 Further Reading

### Inside This Folder
- [Documentation Strategy Guide](guides/01-documentation-strategy.md)
- [Claude Code Setup Guide](guides/02-claude-code-setup.md)
- [Custom Commands Guide](guides/03-custom-commands.md)

### External Resources
- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Keep a Changelog](https://keepachangelog.com/)
- [Architecture Decision Records](https://adr.github.io/)
- [Semantic Versioning](https://semver.org/)

## 🤝 Contributing

Learned something new? Found a better pattern?

1. Document it in the relevant guide
2. Add a template if reusable
3. Update examples with real code
4. Share learnings in README

## 📝 Credits

These lessons were extracted from the **SpeedboatAgent RAG System** project:
- **Timeline**: September 23-30, 2025
- **Scope**: GitHub ingestion → hybrid search → production deployment
- **Tech Stack**: Next.js 14, TypeScript, Weaviate, OpenAI, Mem0, Redis
- **Outcome**: Production-ready system in 4 weeks with 95% completion rate

---

**Last Updated**: 2025-09-30
**Version**: 1.0.0
**Status**: Extracted from successful production deployment