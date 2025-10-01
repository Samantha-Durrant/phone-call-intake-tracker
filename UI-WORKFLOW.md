# UI Iteration Workflow - Phone Call Intake System

## Feedback-Driven Development Process

### Current Status
- **Base Version**: Committed to `main` branch
- **Working Branch**: `ui-iterations`
- **Iteration**: Starting iteration cycle

## Workflow Steps

### 1. Before Making Changes
```bash
# Create iteration snapshot
git add . && git commit -m "UI Iteration [X]: Starting point - [brief description]"
git tag ui-v1.0-baseline  # Tag for easy reference
```

### 2. Make UI Changes
- Edit `index.html`, `styles.css`, `script.js`
- Test in browser
- Take screenshots for comparison

### 3. After Each Change Session
```bash
# Commit with descriptive message
git add .
git commit -m "UI Iteration [X]: [specific changes made] - [feedback addressed]"

# Optional: Tag significant versions
git tag ui-v1.1-[description]
```

### 4. Feedback Collection
- Save feedback in `feedback/iteration-[X].md`
- Include screenshots in `screenshots/`
- Note what worked/didn't work

### 5. Version Comparison
```bash
# Compare current with previous iteration
git diff ui-v1.0-baseline..HEAD

# Compare specific files
git diff HEAD~1 index.html
git diff HEAD~1 styles.css
```

### 6. Rollback if Needed
```bash
# Soft rollback (keep changes in working directory)
git reset --soft HEAD~1

# Hard rollback (discard changes)
git reset --hard ui-v1.0-baseline
```

## Quick Commands
- `git log --oneline` - See iteration history
- `git show --name-only` - See what files changed in last commit
- `git diff HEAD~1..HEAD --stat` - Summary of recent changes
- `git tag -l ui-*` - List all UI version tags
