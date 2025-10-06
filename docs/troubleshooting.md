# Screenpop & Analytics Troubleshooting Guide

This quick-reference lists the most common questions, fixes, and diagnostics for the embedded **Screenpop** widget and the **Screenpop Analytics** dashboard (both the standalone `/analytics` build and the SPA copy under `spa/public`). Work through the relevant section when something looks off.

---

## Screenpop (Mini Intake UI)

- **No submission record reaches analytics**  
  - Confirm the browser allows `localStorage`; private/incognito modes or storage quotas will block writes.  
  - Inspect localStorage keys: `screenpop_ledger_v1`, `screenpop_daily_entries_v1`, and `screenpop_submit_*` should update after pressing **Done**.  
  - Ensure the iframe/host is served from the same origin; BroadcastChannel and storage events are origin-scoped.  
  - For older builds, make sure the bundled `spa/public/screenpop.js` matches `screenpop.js` (both emit the same payload now).

- **Call metadata missing (agent, call ID, ANI)**  
  - Verify the embedding page adds `?agent=...&callId=...&ani=...` (or `phone=`) to the frame URL.  
  - Double-check `getCallMeta()` in the host; custom integrations should extend that function rather than overriding keys after submission.

- **Task/Transfer toggles flicker or double-select**  
  - Confirm `screenpop.css` is present; the `.mini-btn.pressed` class drives the state.  
  - If custom styles are injected, keep button markup intact (`data-action="task"` / `transfer`).

- **Reason selector stays hidden when change type is reschedule/cancel**  
  - `handleVisibility()` depends on the segmented control values; global CSS overrides that remove `.seg.active` will break it.  
  - Programmatic CRM updates should call `ScreenpopAPI.applyAppointment()` which is already wired to show/hide reasons safely.

- **Multiple household results do nothing**  
  - Patch integrations to resolve `integration.searchPatients`; the chooser renders only when an array is returned.  
  - Confirm `.chooser` markup remains in the HTML; removing it will silently hide the overlay.

---

## Analytics Dashboard (Standalone & SPA)

- **Monthly tab sticks / cannot return to Daily**  
  - Check that `.tab-toggle button` elements retain the `data-view` attribute after customization; the toggle script relies on it.  
  - Make sure no other script calls `setView()` with an invalid value (anything other than `daily` or `monthly`).

- **Table empty even though KPIs show data**  
  - Duplicate MRN filter text hides rows; clear the **Search MRN** input or confirm `applyMrnFilter()` has not been removed.  
  - Inspect localStorage for `screenpop_ledger_v1`. If entries exist but the table is blank, verify `analytics.js` still appends rows (`renderTable()` may have been edited).

- **Charts render “No data”**  
  - Check the active view: monthly charts show percentages; with zero data they will appear empty.  
  - Confirm `canvas.chart` elements keep the `id` attributes (`chartHours`, `chartCancelReasons`, etc.). Renaming breaks the drawing code.

- **Counts never increase**  
  - Browser may have cleared storage between tabs. Reload screenpop and analytics in the same origin to share storage events.  
  - Ensure any service worker or privacy extension is not sandboxing storage writes.

- **Monthly summary looks wrong**  
  - Local clock drives month rollups; set the device time correctly.  
  - Use the hidden `?test=1` query string to expose the **Recompute Now** button and rebuild the monthly dataset.

- **Export CSV missing fields**  
  - The header is declared in `exportCsv()`; confirm downstream consumers expect the same columns.  
  - If additional properties are needed, extend the array there and regenerate the file.

- **Weekday panel never appears**  
  - Visible only in Monthly mode. Check that `#panelWeekdays` remains in the DOM and was not removed for layout tweaks.

---

### Diagnostics & Local Testing Tips

- Run two tabs side-by-side (Screenpop + Analytics) and open DevTools **Application → Storage** to watch ledger updates live.  
- When testing BroadcastChannel reception, open the DevTools **Console** and run `new BroadcastChannel('screenpop-analytics')` listeners manually to observe events.  
- To reset everything, clear browser storage for the origin, then reload both pages; the code rehydrates automatically.

Keep this document alongside future releases and add any integration-specific learnings as they surface.
