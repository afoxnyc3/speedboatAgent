# Git Branching Strategy

## Branch Types

### Main Branches
- `main` - Production-ready code
- `develop` - Integration branch for features

### Supporting Branches
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Emergency production fixes
- `release/*` - Release preparation
- `chore/*` - Maintenance tasks

## Naming Convention
```
<type>/<issue-id>-<short-description>
```

### Examples
- `feature/123-user-authentication`
- `fix/124-login-error`
- `hotfix/125-critical-security-patch`
- `release/1.2.0`
- `chore/126-update-dependencies`

## Workflow

### Feature Development
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/123-new-feature

# Work on feature
# Commit changes

# Push to remote
git push -u origin feature/123-new-feature

# Create pull request to develop
```

### Bug Fix
```bash
# Create fix branch from develop
git checkout develop
git pull origin develop
git checkout -b fix/124-bug-description

# Fix bug
# Commit changes

# Push and create PR
git push -u origin fix/124-bug-description
```

### Hotfix
```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/125-critical-fix

# Apply fix
# Test thoroughly

# Merge to main and develop
git checkout main
git merge hotfix/125-critical-fix
git checkout develop
git merge hotfix/125-critical-fix
```

## Commit Message Format
```
<type>: <issue-id> <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code restructuring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

### Examples
```
feat: #123 Add user authentication

Implement JWT-based authentication with refresh tokens.
Includes login, logout, and token refresh endpoints.

Breaking Change: API endpoints now require authentication
```

## Pull Request Process

### Before Creating PR
1. Update from target branch
2. Run all tests
3. Update documentation
4. Self-review code

### PR Template
```markdown
## Issue
Fixes #[issue-number]

## Changes
- Summary of changes
- Implementation approach

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] Change log updated

## Screenshots
(if applicable)
```

## Merge Strategy

### Feature ’ Develop
- Squash and merge
- Clean commit message

### Develop ’ Main
- Create release branch
- Merge commit
- Tag release

### Hotfix ’ Main
- Direct merge
- Immediate deploy
- Backport to develop

## Protection Rules

### Main Branch
- Require PR reviews: 2
- Require status checks
- Require up-to-date branch
- Include administrators

### Develop Branch
- Require PR reviews: 1
- Require status checks
- Allow force pushes: No

## Release Process

1. Create release branch from develop
2. Version bump and changelog
3. Testing and bug fixes
4. Merge to main
5. Tag release
6. Deploy to production
7. Merge back to develop