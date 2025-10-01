# 📸 Simple UI Version Control

**Goal**: Save a full-page screenshot and the code that creates that UI for each version.

## Quick Start

### Method 1: UI Button (Easiest)
1. **Click "Save Version"** in the UI header (purple button with camera icon)
2. **Enter description** in the popup dialog
3. **Copy and run** the terminal command shown
4. **Add screenshot** to the version page that opens

### Method 2: Terminal Command
1. **Save a version**: `./simple-version.sh save "Description of changes"`
2. **Add screenshot**: The version page opens automatically - drag/drop your screenshot
3. **Done!** Your UI version is saved with visual + code

## The Workflow

### When you want to save a UI version:

```bash
./simple-version.sh save "Added new patient panel layout"
```

This creates:
- `versions/v-YYYYMMDD_HHMMSS/` folder
- Copies: `index.html`, `styles.css`, `script.js`
- Creates: `version-summary.html` (with drag-drop for screenshot)
- Git commit + tag for backup

### To browse all versions:

```bash
./simple-version.sh list    # Shows all versions with clickable links
./simple-version.sh web     # Opens current UI + latest version
```

### To restore a previous version:

```bash
./simple-version.sh restore v-20251215_143000
```

## What Gets Saved

**For each version, you get:**
- 📸 **Screenshot**: Full-page visual of your UI
- 📄 **Code**: The 3 core files (HTML, CSS, JS)
- 📝 **Metadata**: Timestamp, description, creation date
- 🔗 **Easy access**: Click to view, click to enlarge screenshot

## File Structure

```
/versions/
  /v-20251215_143000/
    index.html           ← Your UI code at that time
    styles.css           ← Your styles at that time  
    script.js            ← Your JavaScript at that time
    version-summary.html ← View page with screenshot + code
  /v-20251215_150000/
    ...
```

## Why This Works

✅ **Simple**: Just save + add screenshot  
✅ **Visual**: See exactly how your UI looked  
✅ **Complete**: All code needed to recreate that UI  
✅ **Browsable**: Click through versions easily  
✅ **Restorable**: Go back to any version  
✅ **Backed up**: Git keeps everything safe  

## Commands Reference

| Command | What it does |
|---------|-------------|
| `save "desc"` | Save current UI + code |
| `list` | Show all versions |
| `web` | Open UI + version browser |
| `restore v-XXX` | Go back to version |
| `latest` | Return to newest version |
| `backup` | Create archive file |

## Pro Tips

1. **Take good screenshots**: Full page, actual browser size
2. **Descriptive names**: "Added