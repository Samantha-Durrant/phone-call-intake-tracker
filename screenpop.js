// UI-only logic for compact screenpop
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  // --- Simple integration facade (non-breaking) ---
  // Consumers can provide async functions to fetch data from a CRM.
  const integration = {
    // async (phone: string) => { name, phone, mrn, dob, isExisting }
    lookupPatientByPhone: null,
    // async ({ patientId }) => { scheduled: boolean, change: 'none'|'cancellation'|'reschedule', reason?: string, otherText?: string }
    getAppointmentForPatient: null,
    // (payload) => void when user confirms a reason for change
    onReasonSubmit: null,
  };

  // Expose a small API for parent windows or hosting apps
  window.ScreenpopAPI = {
    configure({ lookupPatientByPhone, getAppointmentForPatient, onReasonSubmit } = {}){
      if (typeof lookupPatientByPhone === 'function') integration.lookupPatientByPhone = lookupPatientByPhone;
      if (typeof getAppointmentForPatient === 'function') integration.getAppointmentForPatient = getAppointmentForPatient;
      if (typeof onReasonSubmit === 'function') integration.onReasonSubmit = onReasonSubmit;
    },
    // Programmatically feed an incoming call
    async handleIncomingCall(phone){
      if (!phone) return;
      setPhone(phone);
      if (integration.lookupPatientByPhone) {
        try {
          const p = await integration.lookupPatientByPhone(phone);
          if (p) applyPatient(p);
        } catch(e){ console.warn('lookupPatientByPhone failed', e); }
      }
    },
    // Apply appointment updates from the CRM
    applyAppointment(update){
      if (!update) return;
      if (typeof update.scheduled === 'boolean') setSegment('scheduled', update.scheduled ? 'yes' : 'no');
      if (update.change) setSegment('change', update.change);
      handleVisibility();
      if (update.reason){
        reasonSelect.value = update.reason === 'Other' ? 'Other' : update.reason;
        if (update.reason === 'Other') {
          otherReasonWrap.classList.remove('hidden');
          if (update.otherText) qs('#otherReason').value = update.otherText || '';
        }
      }
    }
  };

  // Segmented controls for Scheduled and Change
  qsa('.segmented').forEach(group => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg');
      if(!btn) return;
      qsa('.seg', group).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      handleVisibility();
    });
  });

  const reasonBlock = qs('#reasonBlock');
  const reasonSelect = qs('#reasonSelect');
  const otherReasonWrap = qs('#otherReasonWrap');
  const clearBtn = qs('#clearBtn');
  const doneBtn = qs('#doneBtn');
  const statusMsg = qs('#statusMsg');

  function setPhone(phone){ const el = qs('#patientPhone'); if (el) el.value = phone; }
  function applyPatient(p){
    if (p.name) qs('#patientName').value = p.name;
    if (p.phone) setPhone(p.phone);
    if (p.mrn) qs('#patientMRN').value = p.mrn;
    if (p.dob) qs('#patientDOB').value = normDate(p.dob);
    // Toggle new/existing (checked => existing)
    const chk = qs('#patientType');
    if (chk && typeof p.isExisting === 'boolean') chk.checked = !!p.isExisting;
  }

  function normDate(d){
    // Accept Date|string, return yyyy-mm-dd for input[type=date]
    try {
      if (!d) return '';
      const dt = (d instanceof Date) ? d : new Date(d);
      const m = String(dt.getMonth()+1).padStart(2,'0');
      const day = String(dt.getDate()).padStart(2,'0');
      return `${dt.getFullYear()}-${m}-${day}`;
    } catch { return ''; }
  }

  function setSegment(group, value){
    qsa(`.seg[data-group="${group}"]`).forEach(b => b.classList.toggle('active', b.getAttribute('data-value') === value));
  }

  function currentValue(group){
    const active = qs(`.seg[data-group="${group}"].active`);
    return active ? active.getAttribute('data-value') : '';
  }

  function handleVisibility(){
    const change = currentValue('change');
    // Show reason only for cancellation or reschedule
    if(change === 'cancellation' || change === 'reschedule'){
      reasonBlock.classList.remove('hidden');
    } else {
      reasonBlock.classList.add('hidden');
      reasonSelect.value = '';
      otherReasonWrap.classList.add('hidden');
    }
  }

  reasonSelect?.addEventListener('change', () => {
    if(reasonSelect.value === 'Other'){
      otherReasonWrap.classList.remove('hidden');
    } else {
      otherReasonWrap.classList.add('hidden');
    }
  });

  // Mini action buttons (Task/Transfer) toggle pressed state
  qsa('.reasons .mini-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.reason-row');
      qsa('.mini-btn', row).forEach(b => b.classList.remove('pressed'));
      btn.classList.add('pressed');
    });
  });

  // Clear
  clearBtn?.addEventListener('click', () => {
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    qs('#patientType').checked = false;
    // reset segments
    qsa('.segmented').forEach(group => {
      const first = qs('.seg', group);
      qsa('.seg', group).forEach(b => b.classList.remove('active'));
      first?.classList.add('active');
    });
    // reset reason area
    reasonSelect.value = '';
    otherReasonWrap.classList.add('hidden');
    reasonBlock.classList.add('hidden');
    // reset mini buttons and checkbox
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck');
    if(confirm) confirm.checked = false;
    pulse('Cleared');
  });

  // Done
  doneBtn?.addEventListener('click', () => {
    // If a change requires a reason, pass it to host if configured
    const change = currentValue('change');
    if ((change === 'cancellation' || change === 'reschedule') && integration.onReasonSubmit) {
      const reason = reasonSelect.value || '';
      const otherText = (reason === 'Other') ? (qs('#otherReason').value || '') : '';
      try { integration.onReasonSubmit({ change, reason, otherText }); } catch(e) { console.warn('onReasonSubmit failed', e); }
    }
    pulse('Captured (UI only)');
  });

  function pulse(text){
    if(!statusMsg) return;
    statusMsg.textContent = text;
    statusMsg.style.transition = 'none';
    statusMsg.style.opacity = '0.2';
    requestAnimationFrame(() => {
      statusMsg.style.transition = 'opacity .25s ease';
      statusMsg.style.opacity = '1';
      setTimeout(() => statusMsg.textContent = 'UI only — no data saved', 1200);
    });
  }

  handleVisibility();

  // Support ?phone= query for quick demos and integrations
  try {
    const url = new URL(window.location.href);
    const paramPhone = url.searchParams.get('phone');
    if (paramPhone) window.ScreenpopAPI.handleIncomingCall(paramPhone);
  } catch {}

  // Allow parent window to drive this UI via postMessage
  window.addEventListener('message', async (e) => {
    const msg = e.data || {};
    try {
      switch (msg.type) {
        case 'incoming_call':
          if (msg.phone) await window.ScreenpopAPI.handleIncomingCall(msg.phone);
          break;
        case 'appointment_update':
          window.ScreenpopAPI.applyAppointment(msg.update || {});
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('message handling error', err);
    }
  });
})();
