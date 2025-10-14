# App Design, Logic, and Architecture

## Overview

This app is a browser-based phone call intake and analytics tracker, designed to be embedded as a component within a larger platform (such as a PHP-based CRM). It consists of two main parts:

- **Screenpop Intake UI:** A form for capturing call details, patient info, appointment actions, and reasons.
- **Analytics Dashboard:** A live-updating dashboard for visualizing and exporting call data.

## Architecture

- **Frontend Only:** The app is currently 100% client-side JavaScript/HTML/CSS, with no backend dependencies.
- **Data Storage:** Uses `localStorage` for persistence and `BroadcastChannel`/`storage` events for cross-tab communication.
- **Modular:** The intake and analytics UIs are separate, but communicate via shared storage and events.
- **No Frameworks:** Pure JavaScript, no React/Vue/Angular, for maximum portability and ease of embedding.

## Data Flow

1. **User fills out the Screenpop form** and clicks "Done".
2. **Submission is serialized** as a JSON object and:
   - Appended to a local ledger in `localStorage`.
   - Broadcast to other tabs via `BroadcastChannel` and `storage` events.
   - Optionally, a `screenpop_submit_*` key is set for analytics to pick up.
3. **Analytics page listens** for new submissions:
   - Periodically scans for new `screenpop_submit_*` keys.
   - Imports new entries into its own ledger.
   - Updates the analytics table and visualizations live.

## UI Components

- **Screenpop Intake:** Form fields for patient, appointment, office, reasons, and actions. Handles both self and proxy calls.
- **Analytics Dashboard:** KPIs, charts, and a detailed submissions table. Supports filtering by date, office, and outcome.

## Extensibility

- **Integration Hooks:** The intake UI exposes a `ScreenpopAPI` for integration with external systems (e.g., CRM lookups).
- **Backend Option:** The data layer can be swapped to use AJAX/API calls for server-side storage if needed.
- **Embeddable:** The UI can be loaded as an iframe, modal, or directly injected into a page.

## Embedding Considerations

- **Namespace:** All JS is wrapped in IIFEs to avoid polluting the global scope.
- **CSS:** Uses scoped selectors, but may need further namespacing to avoid style conflicts.
- **Dependencies:** No external JS/CSS dependencies.
