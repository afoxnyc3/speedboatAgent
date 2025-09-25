# /tidyup Command - Documentation & Integration

## Description
Finalize development work, update documentation, and prepare for integration.

## Usage
```
/tidyup [issue-id]
```

## Workflow Steps

### 1. Document
Update all relevant documentation:
- **roadmap.md**: Mark issue as complete, update sprint status
- **change-log.md**: Add entry with changes made
- **decision-log.md**: Document architectural decisions
- **README.md**: Update if API or usage changed

### 2. Clean Up
- Clear `scratchpad.md` planning notes
- Archive completed tasks from `todo.md`
- Remove debug code and console logs
- Ensure code meets standards

### 3. Commit
Create atomic commit with format:
```
<type>: <issue-id> <description>

- Details of changes
- Related decisions
- Test coverage added
```

Types: feat, fix, docs, style, refactor, test, chore

### 4. Integrate
- Push branch to remote
- Create pull request with:
  - Link to issue
  - Summary of changes
  - Test results
  - Documentation updates

## Validation Checklist
Before finalizing:
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No lint errors
- [ ] Code reviewed for standards
- [ ] Scratchpad cleared
- [ ] Todo list updated

## Post-Integration
- Update `roadmap.md` with next priorities
- Review backlog for upcoming work
- Ensure branch strategy maintained