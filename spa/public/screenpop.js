// UI-only logic for compact screenpop
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  let programmaticChange = false; // used to avoid auto-populating reasons on automated updates
  let callerPhone = null; // preserves the caller's phone even when switching subject
  let lastCallFor = 'self';
  function formatPhone(p){
    try {
      const d = String(p||'').replace(/\D+/g,'');
      const core = d.length===11 && d.startsWith('1') ? d.slice(1) : (d.length===10 ? d : null);
      if (!core) return p || '';
      return `(${core.slice(0,3)}) ${core.slice(3,6)}-${core.slice(6)}`;
    } catch { return p || ''; }
  }
  function setCallerBadge(){
    const badge = qs('#callerBadge');
    if (!badge) return;
    if (!callerPhone) { badge.textContent=''; badge.classList.add('hidden'); badge.setAttribute('aria-hidden','true'); return; }
    const callFor = currentValue('callfor') || lastCallFor || 'self';
    const suffix = callFor === 'proxy' ? ' · Someone Else' : '';
    badge.textContent = `Caller: ${formatPhone(callerPhone)}${suffix}`;
    badge.classList.remove('hidden');
    badge.setAttribute('aria-hidden','false');
  }

  // --- Simple integration facade (non-breaking) ---
  // Consumers can provide async functions to fetch data from a CRM.
  const integration = {
    // async (phone: string) => { name, phone, mrn, dob, isExisting }
    lookupPatientByPhone: null,
    // async ({ name?, dob?, mrn? }) => [{ id, name, dob, mrn, phone, isExisting }]
    searchPatients: null,
    // async ({ patientId }) => { scheduled: boolean, change: 'none'|'cancellation'|'reschedule', reason?: string, otherText?: string }
    getAppointmentForPatient: null,
    // (payload) => void when user confirms a reason for change
    onReasonSubmit: null,
  };

  // Expose a small API for parent windows or hosting apps
  window.ScreenpopAPI = {
    configure({ lookupPatientByPhone, searchPatients, getAppointmentForPatient, onReasonSubmit } = {}){
      if (typeof lookupPatientByPhone === 'function') integration.lookupPatientByPhone = lookupPatientByPhone;
      if (typeof searchPatients === 'function') integration.searchPatients = searchPatients;
      if (typeof getAppointmentForPatient === 'function') integration.getAppointmentForPatient = getAppointmentForPatient;
      if (typeof onReasonSubmit === 'function') integration.onReasonSubmit = onReasonSubmit;
    },
    // Programmatically feed an incoming call
    async handleIncomingCall(phone){
      if (!phone) return;
      callerPhone = phone;
      // Only set patient phone automatically when Call For = self
      if (currentValue('callfor') !== 'proxy') setPhone(phone);
      setCallerBadge();
      if (integration.lookupPatientByPhone) {
        try {
          const p = await integration.lookupPatientByPhone(phone);
          if (Array.isArray(p)) {
            if (p.length === 1) {
              applyPatient(p[0]);
            } else if (p.length > 1) {
              showHousehold(p);
              hideNoMatch();
            } else {
              showNoMatch();
            }
          } else if (p) {
            applyPatient(p);
            hideNoMatch();
          } else {
            showNoMatch();
          }
        } catch(e){ console.warn('lookupPatientByPhone failed', e); }
      }
    },
    // Apply appointment updates from the CRM
    applyAppointment(update){
      if (!update) return;
      if (typeof update.scheduled === 'boolean') setSegment('scheduled', update.scheduled ? 'yes' : 'no');
      if (update.change) {
        programmaticChange = true;
        setSegment('change', update.change);
      }
      handleVisibility();
      // Reason handling: support single or multiple reasons passed from integrations
      const providedReasons = incomingReasonsArray(update);
      if (providedReasons.length){
        setReasonSelection(providedReasons, { preserveOtherText: true });
        if (providedReasons.includes('Other') && otherReasonInput) {
          otherReasonInput.value = update.otherText || '';
        } else if (!providedReasons.includes('Other') && otherReasonInput) {
          otherReasonInput.value = '';
        }
        syncOtherVisibility({ preserveOtherText: true });
      } else {
        const ch = update.change || currentValue('change');
        if (ch === 'cancellation' || ch === 'reschedule') {
          // No explicit reason supplied: ensure UI does not preselect anything
          clearReasonSelection();
        }
      }
      programmaticChange = false;
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
  const reasonToggleList = qs('#reasonToggleList');
  const otherReasonWrap = qs('#otherReasonWrap');
  const otherReasonInput = qs('#otherReason');
  const clearBtn = qs('#clearBtn');
  const doneBtn = qs('#doneBtn');
  const statusMsg = qs('#statusMsg');
  const ptType = qs('.pt-type');

  const REASON_OPTIONS = [
    'No longer needed',
    'Illness/Family Emergency',
    'Work/School Conflict',
    'Insurance',
    'Referral',
    'POOO r/s',
    'Other'
  ];
  const reasonButtons = new Map();
  const selectedReasons = new Set();

  function ensureReasonOption(reason){
    const label = String(reason || '').trim();
    if (!label || !reasonToggleList) return null;
    if (reasonButtons.has(label)) return reasonButtons.get(label);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reason-toggle';
    btn.setAttribute('data-reason', label);
    btn.setAttribute('aria-pressed','false');
    btn.textContent = label;
    btn.addEventListener('click', () => toggleReason(label));
    reasonToggleList.appendChild(btn);
    reasonButtons.set(label, btn);
    return btn;
  }

  function refreshReasonButtonsState(){
    reasonButtons.forEach((btn, label) => {
      const selected = selectedReasons.has(label);
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function syncOtherVisibility({ preserveOtherText = false } = {}){
    if (!otherReasonWrap) return;
    const hasOther = selectedReasons.has('Other');
    otherReasonWrap.classList.toggle('hidden', !hasOther);
    otherReasonWrap.setAttribute('aria-hidden', hasOther ? 'false' : 'true');
    if (!hasOther && !preserveOtherText && otherReasonInput) {
      otherReasonInput.value = '';
    }
  }

  function setReasonSelection(reasons = [], { preserveOtherText = false } = {}){
    selectedReasons.clear();
    const list = Array.isArray(reasons) ? reasons : [reasons];
    list.map(reason => String(reason || '').trim()).filter(Boolean).forEach(reason => {
      const btn = ensureReasonOption(reason);
      if (btn) selectedReasons.add(reason);
    });
    refreshReasonButtonsState();
    syncOtherVisibility({ preserveOtherText });
  }

  function clearReasonSelection({ preserveOtherText = false } = {}){
    setReasonSelection([], { preserveOtherText });
  }

  function getSelectedReasons(){
    return Array.from(selectedReasons);
  }

  function toggleReason(reason){
    const btn = ensureReasonOption(reason);
    if (!btn) return;
    if (selectedReasons.has(reason)) {
      selectedReasons.delete(reason);
    } else {
      selectedReasons.add(reason);
    }
    refreshReasonButtonsState();
    syncOtherVisibility();
  }

  function incomingReasonsArray(update){
    if (!update) return [];
    if (Array.isArray(update.reasons)) return normalizeReasonList(update.reasons);
    if (typeof update.reason !== 'undefined') return normalizeReasonList(update.reason);
    return [];
  }

  function normalizeReasonList(value){
    const list = Array.isArray(value) ? value : [value];
    return list.map(reason => String(reason || '').trim()).filter(Boolean);
  }

  REASON_OPTIONS.forEach(ensureReasonOption);
  syncOtherVisibility();
  if (reasonBlock) reasonBlock.setAttribute('aria-hidden','true');

  function setPatientType(type){
    if (!ptType) return;
    qsa('.seg', ptType).forEach(b => b.classList.toggle('active', b.getAttribute('data-ptype')===type));
  }

  function setPhone(p){
    const el = qs('#patientPhone');
    if (el) el.value = formatPhone(p);
  }

  function applyPatient(p){
    try {
      if (p.name) qs('#patientName').value = p.name;
      if (p.phone) setPhone(p.phone);
      if (p.mrn) qs('#patientMRN').value = p.mrn;
      if (p.dob) qs('#patientDOB').value = normalizeDate(p.dob);
      setPatientType(p.isExisting ? 'existing' : 'new');
      pulse('Matched patient');
    } catch {}
  }

  function normalizeDate(d){
    try {
      const dt = new Date(d);
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
    const callFor = currentValue('callfor') || 'self';
    // Show reason only for cancellation or reschedule
    if((change === 'cancellation' || change === 'reschedule') && reasonBlock){
      reasonBlock.classList.remove('hidden');
      reasonBlock.setAttribute('aria-hidden','false');
      if (programmaticChange) {
        clearReasonSelection();
      }
    } else if (reasonBlock) {
      reasonBlock.classList.add('hidden');
      reasonBlock.setAttribute('aria-hidden','true');
      clearReasonSelection();
    }

    // Toggle subject search area based on Call For selection
    const subjectWrap = qs('#subjectSearchWrap');
    if (subjectWrap) {
      if (callFor === 'proxy') {
        subjectWrap.classList.remove('hidden');
        subjectWrap.setAttribute('aria-hidden','false');
      } else {
        subjectWrap.classList.add('hidden');
        subjectWrap.setAttribute('aria-hidden','true');
      }
    }
    setCallerBadge();
  }

  function showHousehold(list){
    const chooser = qs('#householdChooser');
    const ul = qs('#householdList');
    if (!chooser || !ul) return;
    chooser.classList.remove('hidden');
    chooser.setAttribute('aria-hidden','false');
    ul.innerHTML = '';
    list.forEach(p => {
      const li = document.createElement('div');
      li.className = 'chooser-item';
      li.innerHTML = `<div><strong>${p.name||'Unknown'}</strong><div class="meta">DOB: ${p.dob||'—'} · MRN: ${p.mrn||'—'} · ${formatPhone(p.phone)||'—'}</div></div><button class="mini-btn">Select</button>`;
      li.querySelector('button').addEventListener('click', () => { applyPatient(p); hideHousehold(); });
      ul.appendChild(li);
    });
  }

  function hideHousehold(){
    const chooser = qs('#householdChooser');
    if (chooser){ chooser.classList.add('hidden'); chooser.setAttribute('aria-hidden','true'); }
  }

  function showNoMatch(){
    const banner = qs('#noMatchBanner');
    if (banner){ banner.classList.remove('hidden'); banner.setAttribute('aria-hidden','false'); }
  }
  function hideNoMatch(){
    const banner = qs('#noMatchBanner');
    if (banner){ banner.classList.add('hidden'); banner.setAttribute('aria-hidden','true'); }
  }

  clearBtn?.addEventListener('click', () => {
    qsa('#patientName, #patientMRN, #patientDOB, #patientPhone, #otherReason').forEach(i => i.value = '');
    setSegment('scheduled', 'yes');
    setSegment('change', 'none');
    clearReasonSelection();
    if (reasonBlock) {
      reasonBlock.classList.add('hidden');
      reasonBlock.setAttribute('aria-hidden','true');
    }
    handleVisibility();
    pulse('Cleared');
    setCallerBadge();
  });

  doneBtn?.addEventListener('click', () => {
    const change = currentValue('change');
    if ((change === 'cancellation' || change === 'reschedule') && integration.onReasonSubmit) {
      const reasons = getSelectedReasons();
      const reason = reasons[0] || '';
      const includesOther = reasons.includes('Other');
      const otherText = includesOther ? (otherReasonInput?.value || '') : '';
      try { integration.onReasonSubmit({ change, reason, reasons, otherText }); } catch (e) { console.warn('onReasonSubmit failed', e); }
    }

    try {
      const payload = collectPayload();
      const meta = getCallMeta();
      const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const entry = { id, time: Date.now(), ...meta, ...payload };
      try {
        const LEDGER_KEY = 'screenpop_ledger_v1';
        const DAILY_KEY = 'screenpop_daily_entries_v1';
        const ledger = JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]');
        if (!Array.isArray(ledger) || !ledger.find(e => e && e.id === id)) {
          ledger.unshift(entry);
          localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
        }
        const daily = JSON.parse(localStorage.getItem(DAILY_KEY) || '[]');
        if (!Array.isArray(daily) || !daily.find(e => e && e.id === id)) {
          daily.unshift(entry);
          localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
        }
      } catch {}
      try { const ch = new BroadcastChannel('screenpop-analytics'); ch.postMessage({ type:'submit', entry }); ch.close(); } catch {}
      try { localStorage.setItem(`screenpop_submit_${id}`, JSON.stringify(entry)); } catch {}
    } catch {}

    pulse('Captured (UI only)');
  });

  function collectPayload(){
    const ptActive = qs('.pt-type .seg.active');
    const patientType = ptActive ? ptActive.getAttribute('data-ptype') : '';
    const reasons = getSelectedReasons();
    const reason = reasons[0] || '';
    const includesOther = reasons.includes('Other');
    const otherText = includesOther ? (otherReasonInput?.value || '') : '';
    const confirmed = !!qs('#confirmCheck')?.checked;
    const actions = harvestActions();
    const meta = getCallMeta();
    return {
      patient: {
        name: qs('#patientName')?.value || '',
        phone: qs('#patientPhone')?.value || '',
        mrn: qs('#patientMRN')?.value || '',
        dob: qs('#patientDOB')?.value || '',
        type: patientType || (typeof meta.isExisting === 'boolean' ? (meta.isExisting ? 'existing' : 'new') : '')
      },
      callFor: currentValue('callfor') || 'self',
      appointment: {
        scheduled: currentValue('scheduled') === 'yes',
        change: currentValue('change') || 'none',
        reason,
        reasons,
        otherText,
        confirmed,
        type: meta.apptType || ''
      },
      actions
    };
  }

  function harvestActions(){
    const out = {};
    qsa('.reasons .reason-row').forEach(row => {
      const label = row.querySelector('.reason-label')?.textContent?.trim().toLowerCase() || '';
      if (!label) return;
      const key = label.replace(/\s+/g,'_');
      const task = !!row.querySelector('.mini-btn[data-action="task"].pressed');
      const transfer = !!row.querySelector('.mini-btn[data-action="transfer"].pressed');
      out[key] = { task, transfer };
    });
    return out;
  }

  // Mini action buttons (Task/Transfer) toggle behavior
  qsa('.reasons .mini-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.reason-row');
      const wasPressed = btn.classList.contains('pressed');
      qsa('.mini-btn', row).forEach(b => b.classList.remove('pressed'));
      if (!wasPressed) btn.classList.add('pressed');
    });
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

  // Wire Call For segmented changes to clear/apply behavior
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg[data-group="callfor"]');
    if (!btn) return;
    const selected = btn.getAttribute('data-value');
    if (selected === lastCallFor) return;
    lastCallFor = selected;
    if (selected === 'proxy') {
      // Clear subject fields to avoid mixing caller and subject
      qsa('#patientName, #patientMRN, #patientDOB').forEach(i => i.value = '');
      const phoneEl = qs('#patientPhone'); if (phoneEl) phoneEl.value = '';
      setPatientType('new');
    } else {
      // Back to self: restore caller phone if known
      if (callerPhone) setPhone(callerPhone);
    }
    setCallerBadge();
  });

  // Subject apply/switch buttons
  const applySubjectBtn = qs('#applySubjectBtn');
  const switchPatientBtn = qs('#switchPatientBtn');
  const findSubjectBtn = qs('#findSubjectBtn');
  applySubjectBtn?.addEventListener('click', () => {
    // Apply subject fields from the small form
    const sName = qs('#subjectName')?.value || '';
    const sDob = qs('#subjectDOB')?.value || '';
    const sMrn = qs('#subjectMRN')?.value || '';
    const sPhone = qs('#subjectPhone')?.value || '';
    if (sName) qs('#patientName').value = sName;
    if (sDob) qs('#patientDOB').value = sDob;
    if (sMrn) qs('#patientMRN').value = sMrn;
    if (sPhone) qs('#patientPhone').value = sPhone; // optional override when known
    // Heuristic: set Existing if MRN present, else leave as-is
    if (sMrn) setPatientType('existing');
    pulse('Subject applied');
  });
  switchPatientBtn?.addEventListener('click', () => {
    qsa('#patientName, #patientMRN, #patientDOB, #patientPhone').forEach(i => i.value = '');
    setPatientType('new');
    // Keep Call For in proxy state; do not change callerPhone
    pulse('Subject cleared');
  });
  findSubjectBtn?.addEventListener('click', async () => {
    if (!integration.searchPatients) { pulse('Search not configured'); return; }
    const q = {
      name: qs('#subjectName')?.value || '',
      dob: qs('#subjectDOB')?.value || '',
      mrn: qs('#subjectMRN')?.value || ''
    };
    try {
      const results = await integration.searchPatients(q);
      if (Array.isArray(results) && results.length) {
        showHousehold(results);
        hideNoMatch();
      } else {
        pulse('No results');
      }
    } catch(e){ console.warn('searchPatients failed', e); }
  });

  // Banner / chooser controls
  qs('#showSearchBtn')?.addEventListener('click', () => {
    const subjectWrap = qs('#subjectSearchWrap');
    subjectWrap?.classList.remove('hidden');
    subjectWrap?.setAttribute('aria-hidden','false');
    subjectWrap?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });
  qs('#copyCallerToSubjectBtn')?.addEventListener('click', () => {
    if (!callerPhone) return;
    const el = qs('#subjectPhone');
    if (el) { el.value = callerPhone; pulse('Copied caller phone'); }
  });
  qs('#householdSearchBtn')?.addEventListener('click', () => {
    hideHousehold();
    const subjectWrap = qs('#subjectSearchWrap');
    subjectWrap?.classList.remove('hidden');
    subjectWrap?.setAttribute('aria-hidden','false');
    subjectWrap?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });
  qs('#closeHouseholdBtn')?.addEventListener('click', hideHousehold);

  // Support ?phone= query for quick demos and integrations
  try {
    const url = new URL(window.location.href);
    const paramPhone = url.searchParams.get('phone');
    if (paramPhone) window.ScreenpopAPI.handleIncomingCall(paramPhone);
    const cf = url.searchParams.get('callfor');
    if (cf === 'proxy') {
      // Preselect Someone Else for demos
      qsa('.seg[data-group="callfor"]').forEach(b => b.classList.toggle('active', b.getAttribute('data-value')==='proxy'));
      lastCallFor = 'proxy';
      handleVisibility();
    }
  } catch {}

  function getCallMeta(){
    try {
      const url = new URL(window.location.href);
      const ani = url.searchParams.get('ani') || url.searchParams.get('phone') || '';
      const agent = url.searchParams.get('agent') || '';
      const callId = url.searchParams.get('callId') || '';
      const apptType = url.searchParams.get('apptType') || url.searchParams.get('appt') || '';
      return { ani, agent, callId, apptType };
    } catch { return {}; }
  }
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
