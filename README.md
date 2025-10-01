# Phone Call Intake System

A React + TypeScript application for tracking phone call intake at medical clinics.

## Features

- **Interactive Form**: Replace traditional paper forms with digital intake
- **Caller ID Integration**: Automatically identifies existing patients
- **Real-time Analytics**: Track daily call statistics and booking rates
- **Responsive Design**: Works on desktop and tablet devices
- **Clean Medical UI**: Professional design using TailwindCSS

## Components

- **CallerBanner**: Shows patient info if matched, or "Unknown Caller"
- **IntakeRow**: Reusable form row component
- **ToggleButton**: Clickable buttons that highlight when selected
- **NotesBox**: Text area for patient notes
- **AnalyticsPanel**: Displays daily call statistics

## Quick Start

### Option 1: Simple HTML Preview
1. Open `public/index.html` in your browser
2. The app uses CDN-loaded React and TailwindCSS for quick testing

### Option 2: Full React Development Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser

## Usage

1. **Phone Number Entry**: Enter caller's phone number - system will auto-match existing patients
2. **Patient Information**: Fill in name and select patient type
3. **Appointment Status**: Toggle whether appointment was booked
4. **Reason Tracking**: If not booked, select reason from dropdown
5. **Notes**: Add any additional call notes
6. **Submit**: Save the intake record

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
