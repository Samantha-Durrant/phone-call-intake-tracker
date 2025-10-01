#!/bin/bash

# UI Iteration Helper Script
# Usage: ./ui-iteration.sh [command] [description]

case "$1" in
  "start")
    echo "🎨 Starting new UI iteration..."
    git add .
    git commit -m "UI Iteration: Starting point - $2"
    ITERATION=$(git rev-list --count HEAD)
    TAG="ui-v1.$ITERATION-$(date +%m%d)"
    git tag "$TAG"
    echo "✅ Tagged as $TAG"
    echo "📝 Edit feedback/iteration-$ITERATION.md to document changes"
    echo "📸 IMPORTANT: Take screenshots for visual tracking:"
    echo "   - Full page: screenshots/${TAG}_full-page.png"
    echo "   - Individual panels: screenshots/${TAG}_[panel-name].png"
    echo "   - Mobile view: screenshots/${TAG}_mobile-view.png"
    echo "🌐 Open index.html in browser to capture screenshots"
    ;;
    
  "save")
    echo "💾 Saving UI iteration..."
    CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "ui-v1.0-baseline")
    git add .
    git commit -m "UI Iteration: $2"
    echo "✅ Changes committed: $2"
    echo "📸 Don't forget to take screenshots:"
    echo "   - screenshots/${CURRENT_TAG}_[description].png"
    echo "   - Document visual changes in feedback/"
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
    
  "visual")
    echo "📸 Visual Tracking Commands:"
    echo ""
    echo "Current version screenshots should be saved as:"
    CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "current")
    echo "  screenshots/${CURRENT_TAG}_full-page.png"
    echo "  screenshots/${CURRENT_TAG}_patient-panel.png"  
    echo "  screenshots/${CURRENT_TAG}_crm-panel.png"
    echo "  screenshots/${CURRENT_TAG}_appointment-panel.png"
    echo "  screenshots/${CURRENT_TAG}_mobile-view.png"
    echo ""
    echo "📋 Screenshot checklist:"
    echo "  □ Full page view"
    echo "  □ Each panel individually"
    echo "  □ Mobile responsive view"
    echo "  □ Simulation controls"
    echo "  □ Any modal/popup states"
    ;;
    
  "gallery")
    echo "🖼️  Visual History Gallery:"
    echo ""
    if [ -d "screenshots" ] && [ "$(ls -A screenshots/)" ]; then
      echo "Available screenshot versions:"
      ls screenshots/ | sed 's/^/  📸 /'
      echo ""
      echo "🔍 To compare versions visually:"
      echo "  1. Open screenshots in image viewer"
      echo "  2. Compare side-by-side"
      echo "  3. Document findings in feedback/"
    else
      echo "⚠️  No screenshots found yet."
      echo "📸 Start taking screenshots with: ./ui-iteration.sh visual"
    fi
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
    echo "  visual                - Show screenshot naming guide"
    echo "  gallery               - View available screenshots"
    echo "  visual                - Show visual tracking commands"
    echo "  gallery                - Show visual history gallery"
    echo ""
    echo "Example:"
    echo "  ./ui-iteration.sh start 'Improving button contrast'"
    echo "  ./ui-iteration.sh save 'Updated primary button colors'"
    ;;
esac
