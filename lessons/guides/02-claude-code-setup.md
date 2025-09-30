# Claude Code Setup Guide

> **Optimizing `.claude/` configuration for maximum productivity**

## Overview

Claude Code supports custom configuration through the `.claude/` directory, enabling:
- **Custom slash commands** (e.g., `/work`, `/tidyup`)
- **Custom agents** (specialized AI experts)
- **Permission presets** (pre-approved safe operations)

The SpeedboatAgent project leveraged these features to achieve 50% faster development cycles.

## Directory Structure

```
.claude/
├── commands/
│   ├── work.md
│   ├── tidyup.md
│   ├── test-rag.md
│   ├── weaviate-setup.md
│   └── ...
├── agents/
│   ├── ai-engineer.md
│   ├── tdd-orchestrator.md
│   ├── performance-optimizer.md
│   └── ...
└── settings.local.json
```

## Custom Commands

### What Are Custom Commands?

Slash commands that expand into detailed prompts for Claude Code, automating repetitive workflows.

### Command File Format

```markdown
# /command-name - Brief Description

## Description
[Detailed description of what this command does]

## Usage
```
/command-name [optional-args]
```

## Workflow Steps

### 1. [Step Name]
[Detailed instructions for this step]

### 2. [Step Name]
[Detailed instructions for this step]

## Example
[Show example usage and expected outcome]
```

### Essential Commands from SpeedboatAgent

#### 1. /work - The Development Workhorse

**Purpose**: Auto-select highest priority issue and guide through complete implementation cycle.

**Key Features**:
- Priority-based auto-selection (P0 → P1 → P2 → P3)
- Issue verification (check if already solved)
- Impact analysis (identify affected files)
- Branch creation
- TDD cycle enforcement
- Automatic documentation updates
- GitHub issue closure
- Branch cleanup

**When to Use**: Starting any new development task

**Benefits**:
- Eliminates decision fatigue
- Ensures optimal task ordering
- Prevents duplicate work
- Automates documentation
- Maintains consistent workflow

See: `examples/.claude/commands/work.md.example`

---

#### 2. /tidyup - The Finalization Command

**Purpose**: Finalize work, update documentation, prepare for integration.

**Key Features**:
- Documentation updates (roadmap, change-log, decision-log)
- Clear scratchpad
- Archive completed tasks
- Create proper commit
- Push changes
- Verify sync status

**When to Use**: After completing an issue, before creating PR

**Benefits**:
- Ensures docs stay current
- Prevents unpushed commits
- Consistent commit messages
- Clean transitions between tasks

See: `examples/.claude/commands/tidyup.md.example`

---

### Domain-Specific Commands

For specialized projects, create domain-specific commands:

**Examples from SpeedboatAgent**:
- `/test-rag` - Execute RAG pipeline tests
- `/weaviate-setup` - Initialize vector database
- `/ingest-github` - Trigger repository ingestion
- `/crawl-docs` - Initiate web documentation crawl
- `/check-metrics` - Validate performance against SLAs

**Pattern**: Name commands after key project operations

---

### Creating Your Own Commands

#### Command Design Checklist

✅ **Single Purpose**: One command, one clear workflow
✅ **Step-by-Step**: Break complex workflows into numbered steps
✅ **Pre-flight Checks**: Verify prerequisites before starting
✅ **Documentation Updates**: Include what docs to update
✅ **Examples**: Show expected usage and outcomes
✅ **Error Handling**: What to do when things go wrong

#### Command Template

```markdown
# /your-command - One-line Description

## Description
[What this command does and when to use it]

## Usage
```
/your-command [args]
```

## Pre-flight Checklist
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

## Workflow Steps

### 1. [Step Name]
[Detailed instructions]

### 2. [Step Name]
[Detailed instructions]

### 3. Complete
[What success looks like]

## Example
```bash
User: /your-command
Assistant: [Expected behavior]
```

## Validation
- [ ] [Success criterion 1]
- [ ] [Success criterion 2]
```

---

## Custom Agents

### What Are Custom Agents?

Specialized AI agents with domain expertise and specific tool access.

### Agent File Format

```markdown
# Agent Name

## Description
[What this agent specializes in]

## Capabilities
- [Capability 1]
- [Capability 2]

## When to Use
[Specific scenarios where this agent excels]

## Tools Available
- [Tool 1]
- [Tool 2]

## Workflow
[How this agent approaches tasks]

## Examples
[Example use cases]
```

### Essential Agents from SpeedboatAgent

#### 1. ai-engineer

**Specialization**: RAG systems, LLM integration, vector databases

**When to Use**:
- Building AI-powered features
- Vector search implementation
- LLM prompt engineering
- AI system architecture

**Tools**: Full toolkit (Read, Write, Edit, Bash, etc.)

---

#### 2. tdd-orchestrator

**Specialization**: Test-driven development, quality enforcement

**When to Use**:
- Implementing features with TDD
- Refactoring with test coverage
- Setting up test infrastructure

**Workflow**: Red → Green → Refactor cycle

---

#### 3. performance-optimizer

**Specialization**: Performance analysis and optimization

**When to Use**:
- Investigating slow operations
- Reducing API costs
- Improving response times
- Bundle size optimization

**Tools**: Read, Write, Edit, Bash, Grep, Glob

---

#### 4. frontend-developer

**Specialization**: React, Next.js, UI/UX

**When to Use**:
- Building UI components
- Responsive layouts
- Client-side state management
- Accessibility improvements

**Tools**: Full toolkit with focus on frontend

---

### Creating Custom Agents

#### Agent Design Principles

1. **Specialized Expertise**: Each agent has a clear domain
2. **Appropriate Tools**: Limit tools to what agent needs
3. **Proactive Usage**: When to use without being asked
4. **Clear Scope**: What agent should and shouldn't do

#### Agent Template

```markdown
# [Agent Name]

## Description
[Domain expertise and specialization]

## Capabilities
- [Capability 1 with specific technique]
- [Capability 2 with specific technique]
- [Capability 3 with specific technique]

## When to Use
Use this agent when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## When NOT to Use
Avoid this agent for:
- [Scenario 1]
- [Scenario 2]

## Tools Available
- [Tool 1]: [Why needed]
- [Tool 2]: [Why needed]

## Approach
[How this agent thinks about problems]

## Examples
### Example 1: [Scenario]
[Input] → [Agent Approach] → [Output]

### Example 2: [Scenario]
[Input] → [Agent Approach] → [Output]
```

---

## Permission Configuration

### settings.local.json Structure

```json
{
  "permissions": {
    "allow": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(npm test:*)",
      "Read(//path/to/safe/directory/**)"
    ],
    "deny": [],
    "ask": []
  }
}
```

### Permission Categories from SpeedboatAgent

#### Git Operations (Safe to Auto-Allow)
```json
"Bash(git add:*)",
"Bash(git commit:*)",
"Bash(git push:*)",
"Bash(git checkout:*)",
"Bash(gh issue:*)",
"Bash(gh pr list:*)",
"Bash(gh pr view:*)"
```

#### Testing & CI
```json
"Bash(npm run test:*)",
"Bash(npm run lint:*)",
"Bash(npm run typecheck:*)"
```

#### Safe Utilities
```json
"Bash(env)",
"Bash(curl:*)",
"Bash(find:*)"
```

#### Controlled File Access
```json
"Read(//Users/username/safe-data/**)",
"WebFetch(domain:trusted-domain.com)"
```

### Permission Best Practices

✅ **Allow**: Idempotent operations, read-only commands
✅ **Allow**: Git operations (with branch protection)
✅ **Allow**: Test/lint/build commands
❌ **Deny**: `rm -rf`, destructive operations
❌ **Deny**: Production database access
⚠️ **Ask**: Deployment commands, external API calls

---

## Setup Workflow

### Initial Setup (New Project)

```bash
# 1. Create directory structure
mkdir -p .claude/commands .claude/agents

# 2. Copy essential commands
cp lessons/examples/.claude/commands/work.md.example \
   .claude/commands/work.md

cp lessons/examples/.claude/commands/tidyup.md.example \
   .claude/commands/tidyup.md

# 3. Copy relevant agents
cp lessons/examples/.claude/agents/*.example \
   .claude/agents/

# 4. Configure permissions
cp lessons/examples/.claude/settings.local.json.example \
   .claude/settings.local.json

# 5. Customize for your project
# Edit .claude/commands/work.md to match your workflow
# Edit .claude/agents/*.md to match your tech stack
# Edit settings.local.json to match your safe operations
```

### Iterative Improvement

As you work, refine your configuration:

1. **Notice repetitive workflows** → Create custom command
2. **Identify specialized tasks** → Create custom agent
3. **Safe operations blocking you** → Add to permissions
4. **Commands feel clunky** → Refactor and simplify

---

## Testing Your Configuration

### Command Testing

```bash
# Test in Claude Code
/work          # Should auto-select priority issue
/work 25       # Should work on specific issue
/tidyup        # Should finalize and update docs
```

### Agent Testing

Use `Task` tool to invoke agents:
```
Launch ai-engineer agent to implement vector search
```

### Permission Testing

Try operations that should be allowed:
```bash
git add .
npm test
gh issue list
```

---

## Configuration Patterns by Project Type

### RAG/AI Projects
**Commands**: /test-rag, /ingest-data, /evaluate-performance
**Agents**: ai-engineer, rag-optimizer, performance-optimizer

### Web Applications
**Commands**: /deploy-staging, /run-e2e, /check-lighthouse
**Agents**: frontend-developer, performance-optimizer, test-writer

### APIs/Backend
**Commands**: /test-api, /load-test, /deploy-backend
**Agents**: tdd-orchestrator, performance-optimizer, test-writer

### Libraries/SDKs
**Commands**: /test-all, /build-docs, /publish-package
**Agents**: typescript-pro, test-writer, code-reviewer

---

## Troubleshooting

### Command Not Working
- ✅ Check file is in `.claude/commands/`
- ✅ Check filename matches command (e.g., `work.md` for `/work`)
- ✅ Verify markdown formatting is correct
- ✅ Restart Claude Code

### Agent Not Available
- ✅ Check file is in `.claude/agents/`
- ✅ Verify agent name in file matches invocation
- ✅ Check description clearly states capabilities
- ✅ Restart Claude Code

### Permission Denied
- ✅ Check operation is in `allow` list
- ✅ Verify pattern matches (use `*` for wildcards)
- ✅ Check no conflicting `deny` rule
- ✅ Add to `settings.local.json` and restart

---

## Advanced Patterns

### Contextual Commands

Commands that behave differently based on project state:

```markdown
## Workflow Steps

### 0. Detect Context
- Check if on feature branch or main
- Check if tests are passing
- Check if there are uncommitted changes

### 1. Branch-Specific Behavior
- If on main: Create feature branch first
- If on feature branch: Continue work

### 2. Conditional Steps
- If tests failing: Fix tests before proceeding
- If tests passing: Continue with feature
```

### Chained Commands

Commands that call other commands:

```markdown
## Workflow Steps

### 5. Complete
- Run /tidyup to finalize work
- Run custom validation checks
- Prepare for /deploy-staging
```

### Parameterized Commands

Commands accepting arguments:

```markdown
## Usage
```
/deploy [environment]    # prod, staging, dev
/test [suite]            # unit, integration, e2e
```

## Workflow Steps

### 1. Parse Arguments
- Validate environment is one of: prod, staging, dev
- Set deployment targets based on environment
```

---

## Maintenance

### Regular Reviews

**Monthly**: Review command usage and refine
- Which commands are most used?
- Which commands are confusing?
- What new patterns emerged?

**Quarterly**: Review agent effectiveness
- Are agents being used proactively?
- Do agents need more/fewer tools?
- Are agents overly broad or too narrow?

### Version Control

✅ **Do**: Commit `.claude/` to git (if not team-specific)
✅ **Do**: Document in README how to set up
❌ **Don't**: Commit secrets in `settings.local.json`

---

## Success Metrics

Your Claude Code setup is optimized when:

✅ 80%+ of development starts with `/work`
✅ No manual branch creation needed
✅ Documentation updates are automatic
✅ Specialized tasks use appropriate agents
✅ No permission denial interruptions
✅ New team members can copy `.claude/` and start
✅ Commands evolve with project needs

---

*Last Updated: 2025-09-30*
*Based on: SpeedboatAgent `.claude/` configuration*