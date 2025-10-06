3CX Screen Pop Setup

Overview
- Host the SPA build from `spa/dist` at a stable HTTPS URL (e.g., https://screenpop.yourco.com/).
- Configure 3CX to open this URL on Answered (Connected) calls and pass call details as query params.

Recommended URL template
- Replace the placeholders with the 3CX variable macros available in your 3CX version. The exact macro names may differ; consult 3CX docs/Admin Console.

  https://screenpop.yourco.com/?ani={CallerNumber}&agent={AgentExtension}&callId={CallID}&direction={CallDirection}

Notes
- The SPA reads params `ani`, `agent`, `callId`, and optional `callfor` and `direction`.
- If your 3CX macro names differ, map them accordingly (e.g., `{CallerNumber}` might be `%CallerNumber%` in some consoles).
- Set the trigger to On Answer so the panel appears only when a call is answered.

Building/Deploying the SPA
1) Build
   - cd spa
   - npm install
   - npm run build
   - Output is in `spa/dist`

2) Deploy
   - Serve `spa/dist` via Cloudflare Pages, Vercel, Netlify, or S3+CloudFront.

3) Test locally
   - cd spa && npm run dev
   - Open http://localhost:5173/?ani=15551234567&agent=101&callId=abc123

Behavior
- On load, the app:
  - Sets Call For = Self by default (use `&callfor=proxy` for Someone Else).
  - Calls `ScreenpopAPI.handleIncomingCall(ani)` to prefill phone and show a caller badge.
  - Shows `agent`, `callId`, and `ani` in the footer for quick verification.

