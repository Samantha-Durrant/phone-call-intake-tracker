# 📱 Phone Call Intake Tracker - UI Version Control System

A robust, browser-based UI version control system for tracking medical phone call intake app changes with code preservation, screenshot management, and web-based hosting capabilities.

## 🎯 Features

- **Dual Version Control Systems**: Choose between simple or advanced workflows
- **Code + Screenshot Preservation**: Save HTML/CSS/JS files with visual snapshots
- **Web-Based Version Browser**: Professional interface for browsing all versions
- **One-Click Restore**: Easy rollback to any previous version
- **Hosting Ready**: All files are web-ready for deployment
- **Zero Dependencies**: Pure Bash scripts with HTML/CSS/JS interfaces

## 📋 System Overview

### Available Scripts

1. **`simple-version.sh`** - Clean, minimal version control
2. **`ui-version-control.sh`** - Advanced version control with enhanced features

Both scripts provide the same core functionality with different feature sets.

## 🚀 Quick Start

### Basic Workflow

1. **Save a Version**
   ```bash
   ./simple-version.sh save "Added patient search feature"
   ```

2. **List All Versions**
   ```bash
   ./simple-version.sh list
   ```

3. **Restore a Previous Version**
   ```bash
   ./simple-version.sh restore v-20241001_123456
   ```

### Advanced Workflow (ui-version-control.sh)

```bash
# Save with advanced features
./ui-version-control.sh save "Major UI redesign"

# Browse versions in web interface
./ui-version-control.sh browse

# Create full backup
./ui-version-control.sh backup
```

## 📁 Directory Structure

```
/Phones tracking/
├── index.html              # Main UI file
├── styles.css              # Styling
├── script.js               # JavaScript functionality
├── simple-version.sh       # Simple version control
├── ui-version-control.sh   # Advanced version control
└── versions/               # All saved versions
    ├── index.html          # Version browser
    ├── v-20241001_123007/  # Individual version folders
    │   ├── index.html      # UI snapshot
    │   ├── styles.css      # CSS snapshot
    │   ├── script.js       # JS snapshot
    │   └── version-summary.html  # Version details + screenshot upload
    └── v-20241001_135057/
        └── ...
```

## 📖 Detailed Commands

### Simple Version Script (`simple-version.sh`)

| Command | Description | Example |
|---------|-------------|---------|
| `save [description]` | Save current UI version | `./simple-version.sh save "Fixed form validation"` |
| `list` | Show all saved versions | `./simple-version.sh list` |
| `restore [version-id]` | Restore specific version | `./simple-version.sh restore v-20241001_123456` |
| `help` | Show command help | `./simple-version.sh help` |

### Advanced Version Script (`ui-version-control.sh`)

| Command | Description | Example |
|---------|-------------|---------|
| `save [description]` | Save version with enhanced features | `./ui-version-control.sh save "Added patient search"` |
| `list` | List versions with details | `./ui-version-control.sh list` |
| `restore [version-id]` | Restore with auto-backup | `./ui-version-control.sh restore v-20241001_123456` |
| `browse` | Open web version browser | `./ui-version-control.sh browse` |
| `backup` | Create complete backup archive | `./ui-version-control.sh backup` |
| `web` | Launch current UI + browser | `./ui-version-control.sh web` |

## 🖼️ Screenshot Management

Each version includes a sophisticated screenshot management system:

1. **Drag & Drop Upload**: Simply drag screenshot files into the version page
2. **Click to Upload**: Click the upload area to select files
3. **Preview & Save**: Preview screenshots before saving
4. **Automatic Storage**: Screenshots are embedded directly in version files
5. **Download Capability**: Download complete version packages with screenshots

### Screenshot Workflow

1. Save a version: `./simple-version.sh save "Description"`
2. Open the version summary page (displayed after save)
3. Upload screenshot via drag-and-drop or click
4. Click "Save Screenshot" to permanently store
5. Screenshot is now part of the version record

## 🌐 Web-Based Version Browser

Access the version browser at: `versions/index.html`

**Features:**
- **Grid View**: Visual overview of all versions
- **Version Stats**: Total versions, latest version, last update
- **Quick Actions**: View details, preview UI, restore version
- **Professional UI**: Modern, responsive design
- **Direct Navigation**: Links to individual version pages

## 🔄 Version Restore Process

When restoring a version:

1. **Auto-Backup**: Current version is automatically backed up
2. **File Replacement**: UI files are replaced with selected version
3. **Confirmation**: User confirmation required before restore
4. **Status Report**: Clear feedback on restore success

```bash
# Example restore process
$ ./simple-version.sh restore v-20241001_123456
⚠️  Restore version v-20241001_123456? (y/N): y
✅ Restored: v-20241001_123456
```

## 📦 Backup System

Create complete project backups:

```bash
./ui-version-control.sh backup
```

**Backup includes:**
- All UI files (index.html, styles.css, script.js)
- Complete versions directory with all historical versions
- Documentation files
- Compressed tar.gz format for easy storage/sharing

## 🎨 Version Summary Pages

Each version includes a comprehensive summary page:

- **Version Metadata**: ID, timestamp, description
- **File Browser**: View HTML, CSS, JavaScript code with syntax highlighting
- **Screenshot Manager**: Upload, preview, and store UI screenshots
- **Quick Actions**: Preview UI, download version, navigate back
- **Professional Design**: Clean, modern interface

## 🔧 Technical Details

### Version ID Format
- **Pattern**: `v-YYYYMMDD_HHMMSS`
- **Example**: `v-20241001_143022`
- **Benefits**: Chronological sorting, human-readable, unique

### File Preservation
- **Complete Snapshots**: All UI files copied per version
- **No Dependencies**: Each version is self-contained
- **Web Ready**: Can be hosted anywhere immediately

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Responsive Design**: Works on desktop and mobile
- **Progressive Enhancement**: Degrades gracefully

## 🚀 Hosting & Deployment

The system is designed for easy hosting:

### GitHub Pages Setup
1. Push repository to GitHub
2. Enable GitHub Pages in repository settings
3. Access at: `https://username.github.io/repository-name/versions/`

### Static Hosting
- Upload `versions/` directory to any web server
- No server-side processing required
- Pure HTML/CSS/JavaScript

### Local Development
- Open `versions/index.html` in any browser
- All features work locally
- No web server required

## 📋 Best Practices

### Version Descriptions
- Use clear, descriptive messages
- Include what changed and why
- Examples:
  - ✅ "Added patient search with autocomplete"
  - ✅ "Fixed form validation bug in contact fields"
  - ❌ "Updates"
  - ❌ "Fixes"

### Screenshot Management
- Take screenshots after significant visual changes
- Include screenshots of key UI states
- Use consistent screenshot dimensions when possible

### Regular Backups
- Create periodic full backups with `./ui-version-control.sh backup`
- Store backups in separate location/cloud storage
- Test restore procedures periodically

## 🛠️ Troubleshooting

### Common Issues

**Script Permission Denied**
```bash
chmod +x simple-version.sh ui-version-control.sh
```

**Version Not Found**
```bash
# List all versions to find correct ID
./simple-version.sh list
```

**Browser Not Opening**
```bash
# Manually open the file
open versions/index.html  # macOS
```

### File Recovery
If files are accidentally deleted:
1. Check latest version in `versions/` directory
2. Use restore command: `./simple-version.sh restore v-YYYYMMDD_HHMMSS`
3. Files will be restored from version backup

## 📈 System Status

- ✅ **Core Version Control**: Fully implemented and tested
- ✅ **Screenshot Management**: Complete with drag-and-drop
- ✅ **Web Browser Interface**: Professional, responsive design
- ✅ **Backup System**: Full project backup capability
- ✅ **Restore Functionality**: One-click version restoration
- ✅ **Multiple Script Options**: Simple and advanced workflows
- ✅ **Hosting Ready**: Web-deployable without modifications

## 🔮 Future Enhancements

Potential improvements (not currently implemented):
- Semantic versioning (v1.0.0 format)
- Version branching and merging
- Automated screenshot capture
- Version comparison tools
- Export to other version control systems

---

## 💡 Quick Reference

**Save Version**: `./simple-version.sh save "Description"`  
**List Versions**: `./simple-version.sh list`  
**Restore Version**: `./simple-version.sh restore v-20241001_123456`  
**Browse Versions**: Open `versions/index.html` in browser  
**Full Backup**: `./ui-version-control.sh backup`

**The system is production-ready and provides robust version control for UI development with hosting capabilities.**
