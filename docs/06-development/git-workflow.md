# Git Workflow

## Branch strategy

```text
main          -- Production-ready code
develop       -- Integration branch for features
feature/*     -- New features (branch from develop)
fix/*         -- Bug fixes (branch from develop)
docs/*        -- Documentation changes
```

## Workflow

```bash
# 1. Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/EP-05-stock-lots

# 2. Work on the feature (multiple commits)
git add .
git commit -m "feat: add StockLot entity and repository"

# 3. Keep up to date with develop
git fetch origin
git rebase origin/develop

# 4. Push and create PR
git push origin feature/EP-05-stock-lots
# Create pull request on GitHub → merge to develop

# 5. After all features for a sprint are done
# Create release branch or merge develop to main
```

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat:     New feature
fix:      Bug fix
refactor: Code change that neither fixes a bug nor adds a feature
test:     Adding or updating tests
docs:     Documentation changes
style:    Formatting, linting (no code change)
chore:    Build, CI, dependencies
perf:     Performance improvement
```

### Examples

```text
feat: add StockLot entity and FEFO deduction policy
fix: prevent double deduction on duplicate MP webhook
refactor: extract FEFO logic into testable policy class
test: add integration test for POS sale with FEFO deduction
docs: add architecture overview document
chore: configure Testcontainers for CI
```

## Pull request template

```markdown
## Description

Brief description of the changes.

## Related issue

Closes #NN

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] No new warnings
```

## Pre-commit checks

Before committing:

```bash
# Backend
./mvnw test

# Frontend
npm run test
npm run lint
npm run build
```
