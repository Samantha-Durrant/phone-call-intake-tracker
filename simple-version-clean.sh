#!/bin/bash

# Simple Version Manager for Phone Call Intake Tracker
# Clean, working version with timestamp-based versioning

PROJECT_NAME="Phone Call Intake Tracker"
TIMESTAMP=$(date "+%Y%m%d_%H%M%S")

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}📱 Simple UI Version Manager${NC}"
    echo -e "${BLUE}=================================${NC}"
}

save_version() {
    local DESCRIPTION="$1"
    
    if [ -z "$DESCRIPTION" ]; then
        echo -e "${YELLOW}📝 Enter description for this UI version:${NC}"
        read DESCRIPTION
    fi
    
    local VERSION_DIR="versions/v-${TIMESTAMP}"
    
    echo -e "${GREEN}📦 Saving version: v-${TIMESTAMP}${NC}"
    echo -e "${BLUE}Description: ${DESCRIPTION}${NC}"
    
    # Create version directory
    mkdir -p "$VERSION_DIR"
    
    # Copy UI files
    cp index.html "$VERSION_DIR/" 2>/dev/null
    cp styles.css "$VERSION_DIR/" 2>/dev/null  
    cp script.js "$VERSION_DIR/" 2>/dev/null
    
    # Create simple version summary
    cat > "$VERSION_DIR/version-summary.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Version v-${TIMESTAMP}</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .files { background: white; border: 1px solid #dee2e6; border-radius: 8px; margin: 20px 0; }
        .file-item { padding: 15px; border-bottom: 1px solid #dee2e6; }
        .file-item:last-child { border-bottom: none; }
        .btn { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
        .btn:hover { background: #5a6fd8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 ${PROJECT_NAME}</h1>
        <h2>Version: v-${TIMESTAMP}</h2>
        <p>${DESCRIPTION}</p>
    </div>
    
    <div class="info">
        <h3>📋 Version Information</h3>
        <p><strong>Version:</strong> v-${TIMESTAMP}</p>
        <p><strong>Created:</strong> $(date)</p>
        <p><strong>Description:</strong> ${DESCRIPTION}</p>
    </div>
    
    <div class="files">
        <h3>📁 Files in this version:</h3>
        <div class="file-item">📄 index.html</div>
        <div class="file-item">🎨 styles.css</div>
        <div class="file-item">⚡ script.js</div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="./index.html" class="btn">🌐 Preview UI</a>
        <a href="../index.html" class="btn">📂 Back to Versions</a>
    </div>
</body>
</html>
EOF
    
    # Update main version index
    update_version_index
    
    echo -e "${GREEN}✅ Version saved successfully!${NC}"
    echo -e "${BLUE}📁 Location: ${VERSION_DIR}${NC}"
    echo -e "${YELLOW}🌐 View: ${VERSION_DIR}/version-summary.html${NC}"
}

update_version_index() {
    # Create versions directory if it doesn't exist
    mkdir -p versions
    
    # Create main version index
    cat > "versions/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Version History</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
        .version-grid { display: grid; gap: 20px; }
        .version-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .version-id { font-size: 18px; font-weight: bold; color: #2d3748; margin-bottom: 10px; }
        .version-date { color: #718096; margin-bottom: 15px; }
        .btn { background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 4px; text-decoration: none; margin-right: 10px; }
        .btn:hover { background: #5a6fd8; }
        .btn-secondary { background: #e2e8f0; color: #4a5568; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 Phone Call Intake Tracker</h1>
        <h2>Version History</h2>
        <p>Browse and restore previous UI versions</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number" id="versionCount">0</div>
            <div>Total Versions</div>
        </div>
    </div>

    <div class="version-grid" id="versionGrid">
        <p style="text-align: center; color: #718096;">Loading versions...</p>
    </div>

    <script>
        // Load versions from directory structure
        function loadVersions() {
            const versionGrid = document.getElementById('versionGrid');
            const versionCount = document.getElementById('versionCount');
            
            // This would be dynamically populated by the bash script
            // For now, we'll show a placeholder
            versionGrid.innerHTML = '<p style="text-align: center; color: #718096;">Run <code>./simple-version.sh list</code> to see versions</p>';
        }
        
        loadVersions();
    </script>
</body>
</html>
EOF
}

list_versions() {
    echo -e "${GREEN}📚 Available Versions:${NC}"
    echo -e "${BLUE}===================${NC}"
    
    if [ ! -d "versions" ] || [ -z "$(ls -A versions 2>/dev/null)" ]; then
        echo -e "${YELLOW}No versions found.${NC}"
        return
    fi
    
    local COUNT=0
    for version_dir in versions/v-*; do
        if [ -d "$version_dir" ]; then
            local VERSION_NAME=$(basename "$version_dir")
            echo -e "${GREEN}📦 $VERSION_NAME${NC}"
            echo -e "${BLUE}   📁 $version_dir${NC}"
            COUNT=$((COUNT + 1))
        fi
    done
    
    echo -e "${GREEN}Total: $COUNT versions${NC}"
}

restore_version() {
    local VERSION_ID="$1"
    
    if [ -z "$VERSION_ID" ]; then
        echo -e "${YELLOW}Available versions:${NC}"
        list_versions
        echo -e "${YELLOW}Enter version ID to restore:${NC}"
        read VERSION_ID
    fi
    
    local VERSION_PATH="versions/$VERSION_ID"
    
    if [ ! -d "$VERSION_PATH" ]; then
        echo -e "${RED}❌ Version not found: $VERSION_ID${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}⚠️  Restore version $VERSION_ID? (y/N):${NC}"
    read -r CONFIRM
    
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Cancelled.${NC}"
        return 0
    fi
    
    # Copy files back
    cp "$VERSION_PATH/index.html" ./ 2>/dev/null
    cp "$VERSION_PATH/styles.css" ./ 2>/dev/null
    cp "$VERSION_PATH/script.js" ./ 2>/dev/null
    
    echo -e "${GREEN}✅ Restored: $VERSION_ID${NC}"
}

show_help() {
    print_header
    echo -e "${GREEN}Commands:${NC}"
    echo -e "${BLUE}==========${NC}"
    echo ""
    echo -e "${YELLOW}./simple-version.sh save [description]${NC}"
    echo -e "  💾 Save current UI version"
    echo ""
    echo -e "${YELLOW}./simple-version.sh list${NC}"
    echo -e "  📚 List all versions"
    echo ""
    echo -e "${YELLOW}./simple-version.sh restore [version-id]${NC}"
    echo -e "  ↩️  Restore a version"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo -e "${BLUE}  ./simple-version.sh save \"Added search feature\"${NC}"
    echo -e "${BLUE}  ./simple-version.sh restore v-20241001_123456${NC}"
}

# Main command handling
case "$1" in
    "save")
        print_header
        save_version "$2"
        ;;
    "list")
        print_header
        list_versions
        ;;
    "restore")
        print_header
        restore_version "$2"
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        show_help
        ;;
esac
