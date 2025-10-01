#!/bin/bash

# Screenshot Capture Helper
# Usage: ./capture-screenshots.sh [tag-name]

TAG=${1:-$(git describe --tags --abbrev=0 2>/dev/null || echo "current")}
SCREENSHOT_DIR="screenshots"

echo "📸 Screenshot Capture Guide for: $TAG"
echo "=============================================="
echo ""

# Create screenshots directory if it doesn't exist
mkdir -p "$SCREENSHOT_DIR"

echo "🌐 Steps to capture UI screenshots:"
echo ""
echo "1. Open your application:"
echo "   file://$(pwd)/index.html"
echo ""
echo "2. Take screenshots and save as:"
echo "   📱 Full page view:"
echo "      → ${SCREENSHOT_DIR}/${TAG}_full-page.png"
echo ""
echo "   🔍 Individual panels (crop from full page):"
echo "      → ${SCREENSHOT_DIR}/${TAG}_patient-panel.png"
echo "      → ${SCREENSHOT_DIR}/${TAG}_crm-panel.png" 
echo "      → ${SCREENSHOT_DIR}/${TAG}_appointment-panel.png"
echo ""
echo "   📱 Mobile responsive view (resize browser to ~375px width):"
echo "      → ${SCREENSHOT_DIR}/${TAG}_mobile-view.png"
echo ""
echo "   ⚙️  Simulation controls:"
echo "      → ${SCREENSHOT_DIR}/${TAG}_simulation-controls.png"
echo ""
echo "   💬 Modal states (if any popups are shown):"
echo "      → ${SCREENSHOT_DIR}/${TAG}_modal-[state].png"
echo ""

echo "🛠️  Browser screenshot methods:"
echo "  • Chrome DevTools: F12 → Console → Run screenshot commands"
echo "  • Firefox: Right-click → 'Take Screenshot'"  
echo "  • Safari: Develop menu → 'Take Screenshot'"
echo "  • Manual: Use system screenshot tools (Cmd+Shift+4 on Mac)"
echo ""

echo "✅ After capturing screenshots:"
echo "   ./ui-iteration.sh gallery    # View captured screenshots"
echo "   git add screenshots/         # Add to version control"
echo "   git commit -m 'Add visual documentation for $TAG'"
echo ""

# Check if running on macOS and offer to open the HTML file
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🚀 Want to open the HTML file now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        open "index.html"
        echo "📱 HTML file opened in default browser"
    fi
fi
