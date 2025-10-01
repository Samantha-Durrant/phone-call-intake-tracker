#!/bin/bash

# UI Iteration Helper Script
# Usage: ./ui-iteration.sh [command] [description]

case "$1" in
  "start")
    echo "🎨 Starting new UI iteration..."
    git add .
    git commit -m "UI Iteration: Starting point - $2"
    ITERATION=$(git rev-list --count HEAD)
    git tag "ui-v1.$ITERATION-$(date +%m%d)"
    echo "✅ Tagged as ui-v1.$ITERATION-$(date +%m%d)"
    echo "📝 Edit feedback/iteration-$ITERATION.md to document changes"
    ;;
    
  "save")
    echo "💾 Saving UI iteration..."
    git add .
    git commit -m "UI Iteration: $2"
    echo "✅ Changes committed: $2"
    ;;
    
  "compare")
    echo "🔍 Comparing with previous version..."
    git diff HEAD~1..HEAD --stat
    echo ""
    echo "📊 Detailed changes:"
    git diff HEAD~1..HEAD --name-only
    ;;
    
  "rollback")
    echo "⚠️  Rolling back last changes..."
    git reset --soft HEAD~1
    echo "✅ Rolled back (files preserved in working directory)"
    ;;
    
  "history")
    echo "📚 UI Iteration History:"
    git log --oneline --grep="UI Iteration"
    echo ""
    echo "🏷️  Tagged Versions:"
    git tag -l "ui-*"
    ;;
    
  "status")
    echo "📋 Current UI Development Status:"
    echo "Branch: $(git branch --show-current)"
    echo "Last commit: $(git log -1 --format='%h - %s (%cr)')"
    echo "Modified files:"
    git status --porcelain
    ;;
    
  *)
    echo "🎨 UI Iteration Helper"
    echo ""
    echo "Commands:"
    echo "  start [description]    - Start new iteration with baseline"
    echo "  save [description]     - Save current changes"
    echo "  compare               - Compare with previous version"
    echo "  rollback              - Undo last changes"
    echo "  history               - Show iteration history"
    echo "  status                - Show current development status"
    echo ""
    echo "Example:"
    echo "  ./ui-iteration.sh start 'Improving button contrast'"
    echo "  ./ui-iteration.sh save 'Updated primary button colors'"
    ;;
esac
