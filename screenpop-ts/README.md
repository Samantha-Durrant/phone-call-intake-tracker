# Screenpop TypeScript Prototype

This directory contains the work-in-progress TypeScript/Vite build that will eventually replace the legacy `screenpop.html` + `screenpop.js` bundle.

## Getting started

```bash
cd screenpop-ts
npm install
npm run dev
```

The dev server will launch on http://localhost:5175 and emit the existing screenpop UI from TypeScript modules. All backend integrations are stubbed; the runtime simply mocks a `GangerAPI` call after load so you can verify the wiring.

## Next steps

- Port the remaining interaction logic from `screenpop.js` into typed modules under `src/runtime`.
- Swap the stub client in `src/runtime/stubs/ganger-client.ts` with the real GangerAPI bridge.
- Connect the shared analytics helpers so this popup publishes the same events consumed by the dashboard.
