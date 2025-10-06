// Optional wiring to GangerAPI so the SPA gains live data without local middleware.
// Activation:
//  - Append ?gateway=1 to the URL, or
//  - Set window.GANGER_ENABLED = true before this script loads.

import { GangerAPIClient } from './gangerapi.js';

function enabledViaParam() {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('gateway') === '1';
  } catch { return false; }
}

function getBaseUrl() {
  // Prefer explicit global if host app sets it, else default to '/api'
  return window.GANGER_BASE_URL || '/api';
}

if (window.GANGER_ENABLED || enabledViaParam()) {
  const client = new GangerAPIClient({
    baseUrl: getBaseUrl(),
    getToken: () => window.GANGER_TOKEN // optional short-lived token, else rely on cookie
  });

  // Wire the screenpop facade to use the gateway
  try {
    window.ScreenpopAPI?.configure({
      lookupPatientByPhone: async (phone) => client.lookupPatientByPhone(phone),
      searchPatients: async (q) => client.searchPatients(q),
      getAppointmentForPatient: async ({ patientId }) => client.getAppointmentForPatient({ patientId }),
      onReasonSubmit: async (payload) => {
        try { await client.submitReason(payload); } catch (e) { /* logging could be added here */ }
      },
    });
  } catch {}
}

