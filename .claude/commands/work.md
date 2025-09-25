# /work Command - Development Workflow

## Description
Start development on a specific issue from the roadmap.

## Usage
```
/work <issue-id>
```

## Workflow Steps

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

## Pre-Flight Checklist
Before starting:
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

## Integration with Agents
This command may invoke:
- `issue-analyzer` agent for requirement analysis
- `tdd-executor` agent for test-driven development
