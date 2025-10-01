# Git Workflow Guide - Phone Call Intake Tracking System

## Branch Structure
- `main` - Stable, production-ready version
- `development` - Integration branch for new features
- `feature/*` - Feature-specific branches
- `hotfix/*` - Quick bug fixes
- `experimental/*` - Experimental versions
- `client/*` - Client-specific customizations

## Common Commands

### Starting a New Feature
```bash
git checkout development
git checkout -b feature/your-feature-name
# Work on your feature...
git add .
git commit -m "Descriptive commit message"
```

### Merging Feature Back
```bash
git checkout development
git merge feature/your-feature-name
git branch -d feature/your-feature-name
```

### Creating Experimental Version
```bash
git checkout -b experimental/v2.0
# Make experimental changes...
```

### Switching Between Versions
```bash
git checkout main           # Stable version
git checkout development    # Latest development
git checkout feature/crm    # CRM integration work
```

### Backing Up Work
```bash
# Create a backup branch
git checkout -b backup/current-work

# Or create a patch file
git diff > my-changes.patch
```

### Merging Development to Main (Release)
```bash
git checkout main
git merge development
git tag -a v1.1 -m "Release version 1.1"
```

## Best Practices
1. Always work in feature branches, never directly in main
2. Use descriptive commit messages
3. Merge frequently to avoid conflicts
4. Tag releases for easy rollback
5. Keep main branch stable and deployable
