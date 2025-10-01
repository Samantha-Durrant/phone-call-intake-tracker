#!/bin/bash

# Visual Comparison Helper
# Usage: ./compare-visuals.sh [version1] [version2]

VERSION1=${1:-"previous"}
VERSION2=${2:-"current"}

echo "🔍 Visual Comparison Tool"
echo "========================="
echo ""

if [ "$1" = "list" ]; then
    echo "📋 Available versions for comparison:"
    git tag -l "ui-*" | sed 's/^/  🏷️  /'
    echo ""
    echo "Usage examples:"
    echo "  ./compare-visuals.sh ui-v1.3-1001 ui-v1.4-1001"
    echo "  ./compare-visuals.sh list    # Show available versions"
    exit 0
fi

echo "Comparing: $VERSION1 ↔ $VERSION2"
echo ""

# Check for screenshots
SCREENSHOTS1=$(ls screenshots/ 2>/dev/null | grep "$VERSION1" | head -5)
SCREENSHOTS2=$(ls screenshots/ 2>/dev/null | grep "$VERSION2" | head -5)

if [ -z "$SCREENSHOTS1" ] && [ -z "$SCREENSHOTS2" ]; then
    echo "⚠️  No screenshots found for comparison"
    echo "📸 Take screenshots first: ./capture-screenshots.sh"
    exit 1
fi

echo "📸 Screenshots for comparison:"
echo ""

if [ -n "$SCREENSHOTS1" ]; then
    echo "📅 $VERSION1:"
    echo "$SCREENSHOTS1" | sed 's/^/  📷 screenshots\//'
else
    echo "📅 $VERSION1: No screenshots found"
fi

echo ""

if [ -n "$SCREENSHOTS2" ]; then
    echo "📅 $VERSION2:"
    echo "$SCREENSHOTS2" | sed 's/^/  📷 screenshots\//'
else
    echo "📅 $VERSION2: No screenshots found"
fi

echo ""
echo "🔍 Visual Comparison Process:"
echo "1. Open image viewer/editor with both sets of screenshots"
echo "2. Compare side-by-side:"
echo "   • Layout changes"
echo "   • Color differences"  
echo "   • Typography updates"
echo "   • Interactive element changes"
echo "3. Document findings in feedback/comparison-${VERSION1}-vs-${VERSION2}.md"
echo ""

echo "📝 Code changes between versions:"
if git rev-parse "$VERSION1" >/dev/null 2>&1 && git rev-parse "$VERSION2" >/dev/null 2>&1; then
    echo ""
    git diff "$VERSION1".."$VERSION2" --stat
    echo ""
    echo "💡 Detailed code changes: git diff $VERSION1..$VERSION2"
else
    echo "⚠️  One or both version tags not found in git history"
fi

echo ""
echo "🛠️  Next steps:"
echo "• Document visual improvements/regressions"
echo "• Note successful design patterns to keep"
echo "• Plan next iteration based on comparison"
