# 📱 Phone Call Intake System

A simple browser-based application for tracking phone call intake at medical clinics with **visual version control**.

## ✨ Features

- **Digital Intake Form**: Replace paper forms with clean digital interface
- **Patient Recognition**: Auto-identifies existing patients by phone number
- **Appointment Tracking**: Track bookings and reasons for non-bookings
- **Simulation Mode**: Test with sample patients for training
- **Visual Version Control**: Save UI screenshots + code for each version

## 🎯 Simplified Workflow

This project uses a **screenshot + code** version control system:

### Option 1: UI Save Button (Easiest)
1. **Click "Save Version"** button in the UI header
2. **Enter description** in the dialog
3. **Copy & run command** from the modal
4. **Add screenshot** to the version page that opens

### Option 2: Terminal Command
1. **Save Version**: `./simple-version.sh save "Description"`
2. **Add Screenshot**: Drag/drop full-page screenshot to version page
3. **Browse Versions**: `./simple-version.sh list` or `./simple-version.sh web`
4. **Restore Anytime**: `./simple-version.sh restore v-YYYYMMDD_HHMMSS`

📋 **[See detailed workflow →](SIMPLE-WORKFLOW.md)**

## 🚀 Quick Start

### Option 1: Direct Browser Use
```bash
open index.html    # Opens the current UI in your browser
```

### Option 2: Live Development
```bash
# If you want to modify and track versions
./simple-version.sh web    # Opens current UI + version browser
```

## 📸 Version Control Commands

| Command | What it does |
|---------|-------------|
| `./simple-version.sh save "desc"` | Save current UI + code |
| `./simple-version.sh list` | Show all versions with links |
| `./simple-version.sh web` | Open current UI + version browser |
| `./simple-version.sh restore v-XXX` | Restore to specific version |

## 📋 Using the Intake System

1. **Phone Number**: Enter caller's number - auto-matches existing patients
2. **Patient Info**: Fill in name and select patient type
3. **Appointment Status**: Toggle whether appointment was booked
4. **Reason Tracking**: If not booked, select reason from dropdown
5. **Notes**: Add any additional call notes
6. **Submit**: Save the intake record

## 🎮 Simulation Features

- **Test Patients**: Pre-loaded sample patients for training
- **Simulation Controls**: Practice without affecting real data
- **Auto-populate**: Click patients to auto-fill forms

## Mock Data

The application includes sample patient data for testing:
- John Smith: +1-555-0123
- Sarah Johnson: +1-555-0456  
- Michael Brown: +1-555-0789

Try entering these numbers to see the caller ID matching in action!

## Customization

- **Add more reasons**: Edit the `reasonNotBookedOptions` array
- **Modify patient data**: Update the `MOCK_PATIENTS` array
- **Styling**: Adjust TailwindCSS classes for different themes
- **Analytics**: Modify the analytics calculations in the submit handler

## File Structure

```
src/
├── App.tsx          # Main application component
├── index.tsx        # React DOM entry point
└── ...

public/
├── index.html       # HTML template
└── ...

package.json         # Dependencies and scripts
README.md           # This file
```

## Next Steps for Production

1. **API Integration**: Replace mock data with real API calls
2. **Database**: Connect to patient management system
3. **Authentication**: Add user login/permissions
4. **Reporting**: Export analytics to external systems
5. **Phone Integration**: Connect with VoIP systems for automatic caller ID
6. **Validation**: Add comprehensive form validation
7. **Accessibility**: Ensure WCAG compliance

## Technologies Used

- React 18
- TypeScript
- TailwindCSS
- HTML5
- Modern JavaScript (ES6+)
