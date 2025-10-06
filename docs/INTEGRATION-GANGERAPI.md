Using GangerAPI with the Screenpop SPA

Goal
- Enable live lookups and logging via the centralized GangerAPI without building app-specific middleware.

Activation (no code changes required)
- Easiest: append `?gateway=1` to the SPA URL to activate the gateway wiring.
- Optional globals if the host app wants control:
  - `window.GANGER_ENABLED = true` to force-enable
  - `window.GANGER_BASE_URL = '/api'` to change the base path
  - `window.GANGER_TOKEN = '...'` to supply a short-lived bearer (prefer cookies instead)

Security guidance
- Prefer same-origin cookie-based auth (SSO/HttpOnly) so the SPA never sees secrets.
- If you must use a token:
  - Use a short-lived, least-privileged JWT
  - Inject via page context (not bundled code)
  - Rotate and expire aggressively

What the SPA wires up when enabled
- `ScreenpopAPI.configure({...})` gets implementations backed by GangerAPI:
  - `lookupPatientByPhone(phone)` → `GET /modmed/patients/by-phone?phone=...`
  - `searchPatients({ name, dob, mrn })` → `GET /modmed/patients/search`
  - `getAppointmentForPatient({ patientId })` → `GET /modmed/appointments/by-patient?patientId=...`
  - `onReasonSubmit(payload)` → `POST /screenpop/reason`

Endpoint mapping
- The client defaults to base `/api`. If your gateway uses a different base, set `window.GANGER_BASE_URL` accordingly.
- All requests use `credentials: 'include'` and will add `Authorization: Bearer <GANGER_TOKEN>` when provided.

Examples
1) Local test with cookie-based auth
   - Host the SPA and GangerAPI on the same origin
   - Visit: `https://app.local/screenpop/?gateway=1&ani=15551234567`

2) Local test with bearer (only for dev)
   - Before loading the SPA, set globals:
     ```html
     <script>
       window.GANGER_ENABLED = true;
       window.GANGER_BASE_URL = 'https://api.local';
       window.GANGER_TOKEN = 'dev-only-short-lived-token';
     </script>
     ```

Rollout checklist
- [ ] Serve SPA at a stable HTTPS origin
- [ ] Place GangerAPI on same origin or allow CORS for SPA origin
- [ ] Configure auth (SSO cookie preferred)
- [ ] Optionally enable via URL param `gateway=1` in your 3CX screen-pop URL
- [ ] Verify lookups: set `ani` and confirm patient prefill works

