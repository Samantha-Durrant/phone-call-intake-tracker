#!/bin/bash

# Simple Version Manager for Phone Tracking Project
# Usage: ./simple-version.sh [command]

PROJECT_NAME="Phone Call Intake Tracker"
TIMESTAMP=$(date "+%Y%m%d_%H%M%S")

case "$1" in
    "save")
        echo "� Saving UI Version..."
        DESCRIPTION="$2"
        if [ -z "$DESCRIPTION" ]; then
            echo "📝 Enter description for this UI version:"
            read DESCRIPTION
        fi
        
        # Create version directory
        VERSION_DIR="versions/v-$TIMESTAMP"
        mkdir -p "$VERSION_DIR"
        
        # Save the core UI files
        echo "💾 Saving code files..."
        cp index.html "$VERSION_DIR/"
        cp styles.css "$VERSION_DIR/"
        cp script.js "$VERSION_DIR/"
        
        # Create a simple HTML page for this version
        cat > "$VERSION_DIR/version-summary.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Version: $TIMESTAMP</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
        .screenshot-area { background: #f8f9fa; border: 3px dashed #dee2e6; border-radius: 12px; padding: 40px; text-align: center; margin: 20px 0; min-height: 400px; display: flex; align-items: center; justify-content: center; flex-direction: column; }
        .upload-hint { color: #6c757d; font-size: 18px; margin: 10px 0; }
        .code-section { margin: 30px 0; }
        .code-header { background: #343a40; color: white; padding: 15px; border-radius: 8px 8px 0 0; font-weight: bold; }
        .code-content { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px; max-height: 400px; overflow-y: auto; }
        pre { margin: 0; padding: 20px; white-space: pre-wrap; font-size: 14px; }
        .drag-drop { border: 3px dashed #007bff; background: #e3f2fd; color: #1976d2; cursor: pointer; transition: all 0.3s ease; }
        .drag-drop:hover { border-color: #0056b3; background: #bbdefb; }
        #screenshot-display { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; }
        .meta-info { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .save-section { text-align: center; margin: 20px 0; }
        .save-btn { background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3); }
        .save-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4); background: linear-gradient(135deg, #218838, #1ea07a); }
        .save-btn:disabled { background: #6c757d; cursor: not-allowed; transform: none; box-shadow: none; }
        .save-status { margin-top: 15px; padding: 10px; border-radius: 6px; font-weight: 500; }
        .save-status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .save-status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .save-status.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Phone Call Intake UI</h1>
            <h2>Version: $TIMESTAMP</h2>
            <div class="meta-info">
                <strong>Description:</strong> $DESCRIPTION<br>
                <strong>Created:</strong> $(date)<br>
                <strong>Files:</strong> index.html, styles.css, script.js
            </div>
        </div>
        
        <div class="screenshot-area drag-drop" onclick="document.getElementById('screenshot-input').click()">
            <div class="upload-hint">📸 Click here or drag & drop your full-page UI screenshot</div>
            <div style="font-size: 14px; color: #999; margin-top: 10px;">
                Take a screenshot of index.html and add it here for visual reference
            </div>
            <input type="file" id="screenshot-input" accept="image/*" style="display: none;">
            <img id="screenshot-display" style="display: none;">
        </div>
        
        <div class="save-section">
            <button id="save-btn" class="save-btn" onclick="saveScreenshot()">
                <i class="fas fa-save"></i> Save Screenshot to Version
            </button>
            <div id="save-status" class="save-status"></div>
        </div>
        
        <div class="code-section">
            <div class="code-header">📄 index.html</div>
            <div class="code-content">
                <pre>$(cat index.html | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</pre>
            </div>
        </div>
        
        <div class="code-section">
            <div class="code-header">🎨 styles.css</div>
            <div class="code-content">
                <pre>$(cat styles.css | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</pre>
            </div>
        </div>
        
        <div class="code-section">
            <div class="code-header">⚙️ script.js</div>
            <div class="code-content">
                <pre>$(cat script.js | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</pre>
            </div>
        </div>
    </div>
    
    <script>
        const input = document.getElementById('screenshot-input');
        const display = document.getElementById('screenshot-display');
        const dropArea = document.querySelector('.screenshot-area');
        
        // Handle file input
        input.addEventListener('change', function(e) {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    display.src = e.target.result;
                    display.style.display = 'block';
                    dropArea.innerHTML = '';
                    dropArea.appendChild(display);
                    dropArea.classList.remove('drag-drop');
                    
                    // Save to localStorage
                    localStorage.setItem('screenshot-v-$TIMESTAMP', e.target.result);
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
        
        // Drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight(e) {
            dropArea.style.borderColor = '#0056b3';
            dropArea.style.background = '#bbdefb';
        }
        
        function unhighlight(e) {
            dropArea.style.borderColor = '#007bff';
            dropArea.style.background = '#e3f2fd';
        }
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files[0] && files[0].type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    display.src = e.target.result;
                    display.style.display = 'block';
                    dropArea.innerHTML = '';
                    dropArea.appendChild(display);
                    dropArea.classList.remove('drag-drop');
                    
                    // Save to localStorage
                    localStorage.setItem('screenshot-v-$TIMESTAMP', e.target.result);
                };
                reader.readAsDataURL(files[0]);
            }
        }
        
        // Load saved screenshot
        const saved = localStorage.getItem('screenshot-v-$TIMESTAMP');
        if (saved) {
            display.src = saved;
            display.style.display = 'block';
            dropArea.innerHTML = '';
            dropArea.appendChild(display);
            dropArea.classList.remove('drag-drop');
        }
        
        // Click to enlarge screenshot
        display.addEventListener('click', function() {
            window.open(this.src, '_blank');
        });
        
        // Save screenshot functionality
        function saveScreenshot() {
            const savedImage = localStorage.getItem('screenshot-v-$TIMESTAMP');
            const saveBtn = document.getElementById('save-btn');
            const saveStatus = document.getElementById('save-status');
            
            if (!savedImage) {
                saveStatus.className = 'save-status error';
                saveStatus.textContent = '❌ No screenshot to save. Please upload a screenshot first.';
                return;
            }
            
            // Disable button and show saving state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveStatus.className = 'save-status info';
            saveStatus.textContent = '💾 Saving screenshot to version...';
            
            // Simulate save process (since this is a static HTML file, we use localStorage persistence)
            setTimeout(() => {
                // Re-save to ensure persistence
                localStorage.setItem('screenshot-v-$TIMESTAMP', savedImage);
                
                // Update the HTML file itself with the screenshot data
                const htmlContent = document.documentElement.outerHTML;
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                // Create download link for user to save the updated file
                const link = document.createElement('a');
                link.href = url;
                link.download = 'version-summary.html';
                
                // Reset button
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Screenshot to Version';
                
                // Show success message
                saveStatus.className = 'save-status success';
                saveStatus.innerHTML = '✅ Screenshot saved! <br><small>📁 Download updated file: <a href="' + url + '" download="version-summary.html" style="color: #155724; text-decoration: underline;">version-summary.html</a></small>';
                
                // Auto-cleanup URL after 5 seconds
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                
            }, 1500);
        }
    </script>
</body>
</html>
EOF
        
        # Git commit
        git add .
        git commit -m "UI Version $TIMESTAMP: $DESCRIPTION"
        git tag "v-$TIMESTAMP"
        
        echo "✅ UI Version saved as: v-$TIMESTAMP"
        echo "📋 Description: $DESCRIPTION"
        echo "📂 Files saved to: $VERSION_DIR/"
        echo "🌐 Version page: file://$(pwd)/$VERSION_DIR/version-summary.html"
        echo ""
        echo "📸 NEXT STEPS:"
        echo "   1. Take a full-page screenshot of your UI"
        echo "   2. Add it to the version page that just opened"
        echo "   3. Your UI version is now fully documented!"
        
        # Open the version summary
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "$VERSION_DIR/version-summary.html"
        fi
        ;;
        
    "list")
        echo "� UI Versions:"
        echo "==============="
        if [ -d "versions" ]; then
            for version_dir in versions/v-*; do
                if [ -d "$version_dir" ]; then
                    version_name=$(basename "$version_dir")
                    echo "🎨 $version_name"
                    if [ -f "$version_dir/version-summary.html" ]; then
                        echo "   📄 View: file://$(pwd)/$version_dir/version-summary.html"
                    fi
                    echo ""
                fi
            done
        else
            echo "No UI versions found. Create one with: ./simple-version.sh save"
        fi
        
        echo "🏷️ Git Tags:"
        git tag -l "v-*" | tail -10
        ;;
        
    "restore")
        VERSION="$2"
        if [ -z "$VERSION" ]; then
            echo "🏷️ Available versions:"
            git tag -l "v-*" | tail -10
            echo ""
            echo "📝 Enter version to restore (e.g., v-20251001_143000):"
            read VERSION
        fi
        
        if git rev-parse "$VERSION" >/dev/null 2>&1; then
            echo "⚠️ This will replace current files with version: $VERSION"
            echo "❓ Continue? (y/n):"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                git checkout "$VERSION" .
                echo "✅ Restored to version: $VERSION"
                echo "🔄 To return to latest: ./simple-version.sh latest"
            fi
        else
            echo "❌ Version $VERSION not found"
        fi
        ;;
        
    "latest")
        echo "🔄 Returning to latest version..."
        git checkout main .
        echo "✅ Back to latest version"
        ;;
        
    "backup")
        echo "💿 Creating backup archive..."
        tar -czf "phone-tracker-backup-$TIMESTAMP.tar.gz" \
            --exclude=".git" \
            --exclude="*.tar.gz" \
            --exclude="node_modules" \
            .
        echo "✅ Backup created: phone-tracker-backup-$TIMESTAMP.tar.gz"
        ;;
        
    "web")
        echo "🌐 Opening project files..."
        echo "📱 Current UI: file://$(pwd)/index.html"
        echo "� All UI versions:"
        
        if [ -d "versions" ]; then
            for version_dir in versions/v-*; do
                if [ -d "$version_dir" ] && [ -f "$version_dir/version-summary.html" ]; then
                    version_name=$(basename "$version_dir")
                    echo "   🎨 $version_name: file://$(pwd)/$version_dir/version-summary.html"
                fi
            done
        fi
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "index.html"
            
            # Open most recent version if exists
            if [ -d "versions" ]; then
                latest_version=$(ls -t versions/v-*/version-summary.html 2>/dev/null | head -1)
                if [ -n "$latest_version" ]; then
                    open "$latest_version"
                fi
            fi
        fi
        ;;
        
    *)
        echo "📸 UI Version Manager"
        echo "===================="
        echo ""
        echo "🎯 Simple workflow: UI screenshot + code snapshot"
        echo ""
        echo "Commands:"
        echo "  save [description]    - Save UI version (screenshot + code)"
        echo "  list                  - Show all UI versions with links"
        echo "  restore [version]     - Restore to specific version"  
        echo "  latest                - Return to latest version"
        echo "  backup                - Create backup archive"
        echo "  web                   - Open current UI and version browser"
        echo ""
        echo "Examples:"
        echo "  ./simple-version.sh save 'Added patient search feature'"
        echo "  ./simple-version.sh list"
        echo "  ./simple-version.sh web"
        echo ""
        echo "Current status:"
        echo "📁 Project: $PROJECT_NAME"
        echo "🌿 Branch: $(git branch --show-current)"
        echo "📝 Last commit: $(git log -1 --format='%h - %s (%cr)')"
        ;;
esac
