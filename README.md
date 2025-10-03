# Phone Call Intake Screenpop

Compact, browser‑based screenpop UI for phone call intake at medical clinics. The project focuses on a small, fast UI you can embed or open standalone, with multiple testing pages to simulate real workflows.

## Live Links

- Final Screenpop (UI only)
  - https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.html

- Testing (scenario driver)
  - https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.html

- Testing v2 (in‑call changes only)
  - https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.v2.html

## Final Snapshots as of 2025‑10‑03

These are frozen copies of the current state for sharing and reference.

- screenpop.final‑2025‑10‑03.html
- screenpop.testing.final‑2025‑10‑03.html
- screenpop.testing.v2.final‑2025‑10‑03.html

## What’s in each page

- `screenpop.html` — Compact UI only (no simulation); fields for patient and appointment context; manual reasons; New/Existing segment buttons.
- `screenpop.testing.html` — Scenario dropdown to simulate existing/new/true‑new, cancellation/reschedule, confirmation, and “other call reasons”. Now defaults non‑appointment reasons to “No scheduled” + “No change”.
- `screenpop.testing.v2.html` — In‑call rules: only appointment changes that occur during the call mark “Scheduled = Yes”. If there is no in‑call change, the call captures “Scheduled = No”.

## Local Preview

- Simple server
  - `python3 -m http.server 5500`
  - Open http://localhost:5500/screenpop.html (or any page above)

- Direct file (local only)
  - Drag any `.html` file into your browser.

## Versioning Approach

- We keep all prior versions to show design evolution (v1/v2/v3/v4 pages, testing variants).
- Going forward, new testing iterations branch from `screenpop.testing.html`.
- When ready, we snapshot into a dated “final” HTML (see 2025‑10‑03 list above).

## Non‑PII Data Direction (future)

- When analytics is added, only non‑PII call/session metadata will be sent (no name/phone/MRN/DOB). Session IDs will be used to correlate events.

## Housekeeping

- Legacy/unused files are moved under `archive/` to keep the repo focused while preserving history.
