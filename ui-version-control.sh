#!/bin/bash

# UI Version Control System
# Tracks code changes + screenshots with automatic versioning

PROJECT_NAME="Phone Call Intake Tracker"
TIMESTAMP=$(date "+%Y%m%d_%H%M%S")

case "$1" in
    "save")
        echo "📸 Saving UI Version..."
        DESCRIPTION="$2"
        if [ -z "$DESCRIPTION" ]; then
            echo "📝 Enter description for this UI version:"
            read DESCRIPTION
        fi
        
        # Create version directory
        VERSION_DIR="versions/v$TIMESTAMP"
        mkdir -p "$VERSION_DIR"
        
        # Copy the UI files
        echo "💾 Copying UI files..."
        cp index.html "$VERSION_DIR/"
        cp styles.css "$VERSION_DIR/"
        cp script.js "$VERSION_DIR/"
        
        # Create version page with screenshot upload
        cat > "$VERSION_DIR/version.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Version VERSION_PLACEHOLDER</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            margin: 0; background: #f5f7fa; 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 30px 20px; text-align: center; 
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .version-info { 
            background: white; border-radius: 12px; padding: 25px; margin: 20px 0; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
        }
        .screenshot-zone { 
            background: white; border-radius: 12px; padding: 30px; margin: 20px 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 3px dashed #dee2e6; min-height: 300px;
            display: flex; align-items: center; justify-content: center; flex-direction: column;
            cursor: pointer; transition: all 0.3s ease;
        }
        .screenshot-zone:hover { border-color: #667eea; background: #f8f9ff; }
        .screenshot-zone.has-image { border: none; padding: 0; }
        .screenshot { max-width: 100%; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); }
        .upload-text { color: #6c757d; font-size: 18px; text-align: center; }
        .upload-icon { font-size: 48px; color: #dee2e6; margin-bottom: 15px; }
        .save-btn { 
            background: linear-gradient(135deg, #28a745, #20c997); color: white; 
            border: none; padding: 15px 30px; border-radius: 25px; font-size: 16px; 
            font-weight: 600; cursor: pointer; margin: 10px; 
            transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }
        .save-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); }
        .save-btn:disabled { background: #6c757d; cursor: not-allowed; transform: none; }
        .code-section { 
            background: white; border-radius: 12px; margin: 20px 0; overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .code-header { 
            background: #2c3e50; color: white; padding: 15px 20px; 
            font-weight: 600; display: flex; align-items: center; gap: 10px;
        }
        .code-content { 
            background: #f8f9fa; max-height: 400px; overflow-y: auto; 
            font-family: 'Monaco', 'Consolas', monospace; font-size: 13px;
        }
        pre { margin: 0; padding: 20px; white-space: pre-wrap; }
        .status { 
            padding: 15px; border-radius: 8px; margin: 15px 0; font-weight: 500; 
            display: none;
        }
        .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .actions { text-align: center; margin: 30px 0; }
        .btn-secondary { 
            background: #6c757d; color: white; padding: 12px 25px; 
            border: none; border-radius: 20px; margin: 0 10px; cursor: pointer;
        }
        .btn-secondary:hover { background: #5a6268; }
    </style>
</head>
<body>
    <div class="header">
        <h1><i class="fas fa-mobile-alt"></i> UI Version VERSION_PLACEHOLDER</h1>
        <p>DESCRIPTION_PLACEHOLDER</p>
        <small>Created: DATE_PLACEHOLDER</small>
    </div>
    
    <div class="container">
        <div class="version-info">
            <h3><i class="fas fa-info-circle"></i> Version Details</h3>
            <p><strong>Version:</strong> VERSION_PLACEHOLDER</p>
            <p><strong>Description:</strong> DESCRIPTION_PLACEHOLDER</p>
            <p><strong>Files:</strong> index.html, styles.css, script.js</p>
        </div>
        
        <div class="screenshot-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()">
            <i class="fas fa-camera upload-icon"></i>
            <div class="upload-text">
                <strong>Click to add UI screenshot</strong><br>
                <small>Drag & drop or click to upload</small>
            </div>
            <input type="file" id="fileInput" accept="image/*" style="display: none;">
        </div>
        
        <div class="actions">
            <button class="save-btn" id="saveBtn" onclick="saveVersion()" disabled>
                <i class="fas fa-save"></i> Save Version with Screenshot
            </button>
            <button class="btn-secondary" onclick="openLiveUI()">
                <i class="fas fa-external-link-alt"></i> View Live UI
            </button>
        </div>
        
        <div class="status" id="status"></div>
        
        <div class="code-section">
            <div class="code-header">
                <i class="fas fa-file-code"></i> index.html
            </div>
            <div class="code-content">
                <pre>HTML_CONTENT_PLACEHOLDER</pre>
            </div>
        </div>
        
        <div class="code-section">
            <div class="code-header">
                <i class="fas fa-palette"></i> styles.css
            </div>
            <div class="code-content">
                <pre>CSS_CONTENT_PLACEHOLDER</pre>
            </div>
        </div>
        
        <div class="code-section">
            <div class="code-header">
                <i class="fas fa-cogs"></i> script.js
            </div>
            <div class="code-content">
                <pre>JS_CONTENT_PLACEHOLDER</pre>
            </div>
        </div>
    </div>
    
    <script>
        const versionId = 'VERSION_PLACEHOLDER';
        let uploadedImage = null;
        
        // File upload handling
        const fileInput = document.getElementById('fileInput');
        const uploadZone = document.getElementById('uploadZone');
        const saveBtn = document.getElementById('saveBtn');
        const status = document.getElementById('status');
        
        fileInput.addEventListener('change', handleFile);
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '#667eea';
            uploadZone.style.background = '#f8f9ff';
        });
        
        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '#dee2e6';
            uploadZone.style.background = 'white';
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files[0] && files[0].type.startsWith('image/')) {
                handleFile({target: {files: [files[0]]}});
            }
        });
        
        function handleFile(e) {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImage = e.target.result;
                
                // Replace upload zone with image
                uploadZone.innerHTML = `<img src="${e.target.result}" class="screenshot" onclick="enlargeImage('${e.target.result}')">`;
                uploadZone.classList.add('has-image');
                
                // Enable save button
                saveBtn.disabled = false;
                
                // Store in localStorage
                localStorage.setItem(`screenshot-${versionId}`, e.target.result);
                
                showStatus('Image uploaded! Click "Save Version" to make it permanent.', 'success');
            };
            reader.readAsDataURL(file);
        }
        
        function enlargeImage(src) {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.9); display: flex; align-items: center;
                justify-content: center; z-index: 10000; cursor: pointer;
            `;
            modal.innerHTML = `<img src="${src}" style="max-width: 95%; max-height: 95%; border-radius: 8px;">`;
            modal.onclick = () => document.body.removeChild(modal);
            document.body.appendChild(modal);
        }
        
        function saveVersion() {
            if (!uploadedImage) {
                showStatus('Please upload a screenshot first!', 'error');
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Simulate save process
            setTimeout(() => {
                // Create downloadable version
                const htmlContent = document.documentElement.outerHTML;
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `version-${versionId}.html`;
                
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                showStatus(`Version saved! <a href="${url}" download="version-${versionId}.html" style="color: #155724; text-decoration: underline;">Download complete version</a>`, 'success');
                
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }, 1500);
        }
        
        function showStatus(message, type) {
            status.className = `status ${type}`;
            status.innerHTML = message;
            status.style.display = 'block';
        }
        
        function openLiveUI() {
            window.open('../index.html', '_blank');
        }
        
        // Load saved screenshot
        const saved = localStorage.getItem(`screenshot-${versionId}`);
        if (saved) {
            uploadedImage = saved;
            uploadZone.innerHTML = `<img src="${saved}" class="screenshot" onclick="enlargeImage('${saved}')">`;
            uploadZone.classList.add('has-image');
            saveBtn.disabled = false;
        }
    </script>
</body>
</html>
EOF
        
        # Replace placeholders
        sed -i '' "s/VERSION_PLACEHOLDER/$TIMESTAMP/g" "$VERSION_DIR/version.html"
        sed -i '' "s/DESCRIPTION_PLACEHOLDER/$DESCRIPTION/g" "$VERSION_DIR/version.html"
        sed -i '' "s/DATE_PLACEHOLDER/$(date)/g" "$VERSION_DIR/version.html"
        
        # Insert code content
        HTML_CONTENT=$(cat index.html | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
        CSS_CONTENT=$(cat styles.css | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
        JS_CONTENT=$(cat script.js | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
        
        # Use perl for more reliable replacement
        perl -i -pe "s/HTML_CONTENT_PLACEHOLDER/\Q$HTML_CONTENT\E/g" "$VERSION_DIR/version.html"
        perl -i -pe "s/CSS_CONTENT_PLACEHOLDER/\Q$CSS_CONTENT\E/g" "$VERSION_DIR/version.html"
        perl -i -pe "s/JS_CONTENT_PLACEHOLDER/\Q$JS_CONTENT\E/g" "$VERSION_DIR/version.html"
        
        # Git commit
        git add .
        git commit -m "UI Version $TIMESTAMP: $DESCRIPTION" 2>/dev/null || true
        git tag "v$TIMESTAMP" 2>/dev/null || true
        
        echo "✅ UI Version saved: v$TIMESTAMP"
        echo "📋 Description: $DESCRIPTION"
        echo "📂 Version folder: $VERSION_DIR"
        echo "🌐 Version page: file://$(pwd)/$VERSION_DIR/version.html"
        echo ""
        echo "📸 NEXT STEPS:"
        echo "   1. The version page will open automatically"
        echo "   2. Upload your UI screenshot (drag & drop or click)"
        echo "   3. Click 'Save Version' to make it permanent"
        echo "   4. Your version is now saved with both code + screenshot!"
        
        # Open version page
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "$VERSION_DIR/version.html"
        fi
        ;;
        
    "list")
        echo "📚 All UI Versions:"
        echo "=================="
        if [ -d "versions" ]; then
            for version_dir in versions/v*; do
                if [ -d "$version_dir" ]; then
                    version_name=$(basename "$version_dir")
                    echo "🎨 $version_name"
                    if [ -f "$version_dir/version.html" ]; then
                        echo "   📄 View: file://$(pwd)/$version_dir/version.html"
                    fi
                    echo ""
                fi
            done
        else
            echo "No versions found. Create one with: ./ui-version-control.sh save"
        fi
        ;;
        
    "restore")
        VERSION="$2"
        if [ -z "$VERSION" ]; then
            echo "🏷️ Available versions:"
            ls -1 versions/ 2>/dev/null | grep "^v" | head -10
            echo ""
            echo "📝 Enter version to restore (e.g., v20251001_143000):"
            read VERSION
        fi
        
        if [ -d "versions/$VERSION" ]; then
            echo "⚠️ This will replace current UI files with version: $VERSION"
            echo "❓ Continue? (y/n):"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                cp "versions/$VERSION/index.html" ./
                cp "versions/$VERSION/styles.css" ./
                cp "versions/$VERSION/script.js" ./
                echo "✅ Restored UI to version: $VERSION"
                echo "🔄 To create a new version: ./ui-version-control.sh save"
            fi
        else
            echo "❌ Version $VERSION not found"
        fi
        ;;
        
    "web")
        echo "🌐 Opening UI and version browser..."
        
        # Open current UI
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "index.html"
        fi
        
        # Show all versions
        if [ -d "versions" ]; then
            echo "📚 Available versions:"
            for version_dir in versions/v*; do
                if [ -d "$version_dir" ] && [ -f "$version_dir/version.html" ]; then
                    version_name=$(basename "$version_dir")
                    echo "   🎨 $version_name: file://$(pwd)/$version_dir/version.html"
                fi
            done
            
            # Open most recent version
            if [[ "$OSTYPE" == "darwin"* ]]; then
                latest_version=$(ls -t versions/v*/version.html 2>/dev/null | head -1)
                if [ -n "$latest_version" ]; then
                    open "$latest_version"
                fi
            fi
        fi
        ;;
        
    *)
        echo "📸 UI Version Control System"
        echo "==========================="
        echo ""
        echo "🎯 Track UI changes with code + screenshots"
        echo ""
        echo "Commands:"
        echo "  save [description]    - Create new version with code snapshot"
        echo "  list                  - Show all saved versions"  
        echo "  restore [version]     - Restore UI to specific version"
        echo "  web                   - Open current UI + version browser"
        echo ""
        echo "Workflow:"
        echo "  1. Make changes to your UI (index.html, styles.css, script.js)"
        echo "  2. Run: ./ui-version-control.sh save 'Description of changes'"
        echo "  3. Upload screenshot in the version page that opens"
        echo "  4. Click 'Save Version' - done!"
        echo ""
        echo "Examples:"
        echo "  ./ui-version-control.sh save 'Added patient search feature'"
        echo "  ./ui-version-control.sh list"
        echo "  ./ui-version-control.sh restore v20251001_143000"
        echo ""
        echo "Current status:"
        echo "📁 Project: $PROJECT_NAME"
        if git rev-parse --git-dir > /dev/null 2>&1; then
            echo "🌿 Git: $(git branch --show-current 2>/dev/null || echo 'initialized')"
            echo "📝 Last commit: $(git log -1 --format='%h - %s (%cr)' 2>/dev/null || echo 'none')"
        else
            echo "🌿 Git: not initialized"
        fi
        
        # Show version count
        if [ -d "versions" ]; then
            VERSION_COUNT=$(ls -1 versions/ 2>/dev/null | grep "^v" | wc -l | tr -d ' ')
            echo "📦 Saved versions: $VERSION_COUNT"
        else
            echo "📦 Saved versions: 0"
        fi
        ;;
esac
