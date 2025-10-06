// Minimal client for GangerAPI gateway
// Notes:
// - Prefer same-origin cookie-based auth (credentials: 'include').
// - If you must use a bearer token, expose it via a short-lived page context
//   (e.g., set window.GANGER_TOKEN before loading this module). Do NOT hardcode.

function joinUrl(base, path) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export class GangerAPIClient {
  constructor({ baseUrl = '/api', getToken } = {}) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  authHeaders() {
    const headers = {};
    const token = typeof this.getToken === 'function' ? this.getToken() : (globalThis.GANGER_TOKEN || null);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async get(path, params) {
    const url = new URL(joinUrl(this.baseUrl, path), window.location.origin);
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), { credentials: 'include', headers: this.authHeaders() });
    if (!res.ok) throw new Error(`GET ${url.pathname} failed: ${res.status}`);
    return res.json();
  }

  async post(path, body) {
    const url = joinUrl(this.baseUrl, path);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json();
  }

  // --- Services used by the screenpop UI ---
  // ModMed: patient lookup by phone
  lookupPatientByPhone(phone) {
    return this.get('/modmed/patients/by-phone', { phone });
  }

  // ModMed: search patients by name/dob/mrn
  searchPatients({ name, dob, mrn }) {
    return this.get('/modmed/patients/search', { name, dob, mrn });
  }

  // ModMed: appointment details for a patient
  getAppointmentForPatient({ patientId }) {
    return this.get('/modmed/appointments/by-patient', { patientId });
  }

  // Example: log/disposition the call outcome
  submitReason(payload) {
    return this.post('/screenpop/reason', payload);
  }
}

