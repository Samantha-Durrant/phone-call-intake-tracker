# Phone Call Intake Screenpop

Compact, browser‑based screenpop UI for phone call intake at medical clinics. The project focuses on a small, fast UI you can embed or open standalone, with multiple testing pages to simulate real workflows.

## Live Links

<table>
  <thead>
    <tr>
      <th align="left">Page</th>
      <th align="left">Purpose</th>
      <th align="left">Live</th>
      <th align="left">Final Snapshot (2025‑10‑03)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Final Screenpop</strong></td>
      <td>Compact UI‑only screenpop</td>
      <td><a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.html" target="_blank" rel="noopener">Open ▶</a></td>
      <td><a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.final-2025-10-03.html" target="_blank" rel="noopener">Snapshot ▶</a></td>
    </tr>
    <tr>
      <td><strong>Testing</strong></td>
      <td>Scenario dropdown, mock CRM, logic hooks</td>
      <td><a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.html" target="_blank" rel="noopener">Open ▶</a></td>
      <td><a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.final-2025-10-03.html" target="_blank" rel="noopener">Snapshot ▶</a></td>
    </tr>
    <tr>
      <td><strong>Testing v2</strong></td>
      <td>In‑call rules: only changes during call count</td>
      <td><a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.v2.html" target="_blank" rel="noopener">Open ▶</a></td>
      <td><a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.v2.final-2025-10-03.html" target="_blank" rel="noopener">Snapshot ▶</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="4"><em>Tip:</em> If a page looks cached, append <code>?v=1</code> and hard‑refresh.</td>
    </tr>
  </tfoot>
  </table>

## Project Scope

Develop a 3CX screen‑pop integration tool that automatically displays patient information during incoming calls and tracks key call data in real time. The system minimizes manual input by pulling from EMA (Electronic Medical Assistant) and logging appointment types, call outcomes, and follow‑up needs into a centralized dashboard. By automating this process, the tool creates a reliable dataset to improve patient scheduling, hiring decisions, and resource allocation across all offices.

## Final Snapshots as of 2025‑10‑03

Frozen HTMLs for sharing/testing outside the active iteration:

- <a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.final-2025-10-03.html" target="_blank" rel="noopener">screenpop.final‑2025‑10‑03.html</a>
- <a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.final-2025-10-03.html" target="_blank" rel="noopener">screenpop.testing.final‑2025‑10‑03.html</a>
- <a href="https://samantha-durrant.github.io/phone-call-intake-tracker/screenpop.testing.v2.final-2025-10-03.html" target="_blank" rel="noopener">screenpop.testing.v2.final‑2025‑10‑03.html</a>

## What’s in each page

- `screenpop.html` — Compact UI only (no simulation); fields for patient and appointment context; manual reasons; New/Existing segment buttons.
- `screenpop.testing.html` — Scenario dropdown to simulate existing/new/true‑new, cancellation/reschedule, confirmation, and “other call reasons”. Now defaults non‑appointment reasons to “No scheduled” + “No change”.
- `screenpop.testing.v2.html` — In‑call rules: only appointment changes that occur during the call mark “Scheduled = Yes”. If there is no in‑call change, the call captures “Scheduled = No”.

## Used Files (as of 2025‑10‑03)

- Final screenpop
  - `screenpop.html`
  - `screenpop.css`
  - `screenpop.js`

- Testing (scenario driver)
  - `screenpop.testing.html`
  - `screenpop.css`
  - `screenpop.js`
  - `screenpop.mock.js`
  - `screenpop.logic.js`
  - `screenpop.testing.js`

- Testing v2 (in‑call rules)
  - `screenpop.testing.v2.html`
  - `screenpop.css`
  - `screenpop.js`
  - `screenpop.mock.js`
  - `screenpop.testing.v2.js`

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
