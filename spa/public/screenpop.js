// UI-only logic for compact screenpop
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  let programmaticChange = false; // used to avoid auto-populating reasons on automated updates
  let callerPhone = null; // preserves the caller's phone even when switching subject
  let lastCallFor = 'self';
  let appointmentOffice = '';
  let appointmentTypeOverride = '';
  let appointmentMetadata = resetAppointmentMetadata();
  let appointmentOutcomeOverrides = null;
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
      clearAppointmentContext();
      callerPhone = phone;
      // reset appointment type when a new call is received unless a host overrides immediately after
      appointmentTypeOverride = '';
      applyOffice('');
      clearNoApptReasonSelection();
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
      applyAppointmentMetadata(update);
      if (update && Object.prototype.hasOwnProperty.call(update, 'resetOutcomes') && update.resetOutcomes) {
        clearAppointmentOutcomes();
      }
      if (Array.isArray(update.outcomes) || Array.isArray(update.appointmentOutcomes)) {
        setAppointmentOutcomes(update.outcomes || update.appointmentOutcomes);
      } else if (update.outcome || update.appointmentOutcome) {
        addAppointmentOutcome(update.outcome || update.appointmentOutcome);
      }
      if (typeof update.scheduled === 'boolean') setSegment('scheduled', update.scheduled ? 'yes' : 'no');
      if (update.change) {
        programmaticChange = true;
        setSegment('change', update.change);
      }
      if (Object.prototype.hasOwnProperty.call(update, 'apptType') || Object.prototype.hasOwnProperty.call(update, 'appointmentType')) {
        const nextType = update.apptType ?? update.appointmentType ?? '';
        appointmentTypeOverride = nextType || '';
      }
      if (Object.prototype.hasOwnProperty.call(update, 'office') || Object.prototype.hasOwnProperty.call(update, 'location')) {
        const nextOffice = update.office ?? update.location ?? update.officeName ?? '';
        applyOffice(nextOffice);
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
      const noApptReasonsFromUpdate = incomingNoApptReasonsArray(update);
      const hasNoApptField = Object.prototype.hasOwnProperty.call(update, 'noAppointmentReasons') || Object.prototype.hasOwnProperty.call(update, 'noAppointmentReason');
      if (noApptReasonsFromUpdate.length) {
        setNoApptReasonSelection(noApptReasonsFromUpdate);
      } else if (hasNoApptField) {
        clearNoApptReasonSelection();
      }
      programmaticChange = false;
    },
    setAppointmentType(type){
      appointmentTypeOverride = type || '';
    },
    setAppointmentOffice(office){
      applyOffice(office);
    },
    setNoAppointmentReasons(reasons){
      const list = Array.isArray(reasons) ? reasons : (reasons ? [reasons] : []);
      if (list.length && currentValue('scheduled') !== 'no') {
        setSegment('scheduled', 'no');
      }
      setNoApptReasonSelection(list);
      handleVisibility();
    },
    clearNoAppointmentReasons(){
      clearNoApptReasonSelection();
      handleVisibility();
    },
    recordAppointmentOutcome(outcome){
      addAppointmentOutcome(outcome);
    },
    setAppointmentOutcomes(outcomes){
      setAppointmentOutcomes(outcomes);
    },
    clearAppointmentOutcomes(){
      clearAppointmentOutcomes();
    },
    setAppointmentMetadata(meta){
      setAppointmentMetadata(meta);
    },
    resetAppointmentContext(){
      clearAppointmentContext();
    },
    getAppointmentContext(){
      const snapshot = {
        appointmentId: appointmentMetadata.appointmentId || '',
        previousAppointmentId: appointmentMetadata.previousAppointmentId || '',
        newAppointmentId: appointmentMetadata.newAppointmentId || '',
        reschedulePairId: appointmentMetadata.reschedulePairId || '',
        crmReasonCode: appointmentMetadata.crmReasonCode || '',
        crmReason: appointmentMetadata.crmReason || '',
        extra: appointmentMetadata.extra && Object.keys(appointmentMetadata.extra).length ? { ...appointmentMetadata.extra } : {}
      };
      if (!Object.keys(snapshot.extra || {}).length) delete snapshot.extra;
      return {
        metadata: snapshot,
        outcomes: deriveAppointmentOutcomes()
      };
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
  const officeSelect = qs('#officeSelect');
  const otherReasonInput = qs('#otherReason');
  const noApptReasonSection = qs('#noApptReasonSection');
  const noApptReasonList = qs('#noApptReasonList');
  const clearBtn = qs('#clearBtn');
  const doneBtn = qs('#doneBtn');
  const statusMsg = qs('#statusMsg');
  const ptTypeGroup = qs('.pt-type');

  const NO_APPT_REASON_OPTIONS = [
    'Question Only',
    'Location',
    'Availability',
    'Urgency',
    'Referral',
    'Insurance',
    'Other'
  ];
  function normalizeReasonKey(value){
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  const CRM_CANCEL_REASON_LABELS = [
    'Patient Scheduling Error',
    'Patient Transportation Issue',
    'Provider Requested Change',
    'Traffic',
    'Unknown',
    'Weather',
    'Office Scheduling Error',
    'Patient Arrived Late',
    'Patient Cancelled',
    'Patient Deceased',
    'Patient Forgot',
    'Patient is Sick',
    'Patient Left',
    'Childcare Issue',
    'Conflicting Appointment',
    'COVID-19',
    'Family Emergency',
    'No Longer Needs Appointment',
    'No Referral/Authorization',
    'Office Rescheduled',
    'Work or School Conflict'
  ];
  const CRM_CANCEL_REASON_LOOKUP = CRM_CANCEL_REASON_LABELS.reduce((acc, label) => {
    acc[normalizeReasonKey(label)] = label;
    return acc;
  }, {});
  const CRM_CANCEL_REASON_SYNONYMS = {
    no_longer_needed: 'No Longer Needs Appointment',
    no_longer_need: 'No Longer Needs Appointment',
    illness_family_emergency: 'Family Emergency',
    family_emergency: 'Family Emergency',
    illness: 'Patient is Sick',
    patient_sick: 'Patient is Sick',
    sick: 'Patient is Sick',
    work_school_conflict: 'Work or School Conflict',
    work_or_school_conflict: 'Work or School Conflict',
    work_school: 'Work or School Conflict',
    insurance: 'No Referral/Authorization',
    referral: 'No Referral/Authorization',
    authorization: 'No Referral/Authorization',
    no_referral: 'No Referral/Authorization',
    no_authorization: 'No Referral/Authorization',
    no_referral_authorization: 'No Referral/Authorization',
    patient_cancelled: 'Patient Cancelled',
    patient_canceled: 'Patient Cancelled',
    patient_cancel: 'Patient Cancelled',
    provider_change: 'Provider Requested Change',
    provider_requested: 'Provider Requested Change',
    provider_requested_change: 'Provider Requested Change',
    transportation: 'Patient Transportation Issue',
    patient_transportation: 'Patient Transportation Issue',
    scheduling_error: 'Patient Scheduling Error',
    patient_error: 'Patient Scheduling Error',
    office_error: 'Office Scheduling Error',
    covid: 'COVID-19',
    covid19: 'COVID-19',
    covid_19: 'COVID-19'
  };
  function mapCancellationReason(value){
    const key = normalizeReasonKey(value);
    if (!key) return '';
    if (CRM_CANCEL_REASON_LOOKUP[key]) return CRM_CANCEL_REASON_LOOKUP[key];
    if (CRM_CANCEL_REASON_SYNONYMS[key]) return CRM_CANCEL_REASON_SYNONYMS[key];
    const raw = String(value || '').trim();
    if (!raw) return '';
    // fallback to title case
    return raw.replace(/\b\w/g, c => c.toUpperCase());
  }
  const OFFICE_OPTIONS = ['Ann Arbor','Plymouth','Wixom'];
  const REASON_OPTIONS = [...CRM_CANCEL_REASON_LABELS, 'Other'];
  function normalizeOfficeValue(value){
    const key = String(value || '').trim().toLowerCase();
    if (!key) return '';
    const match = OFFICE_OPTIONS.find(label => label.toLowerCase() === key);
    return match || '';
  }
  function applyOffice(value){
    appointmentOffice = normalizeOfficeValue(value);
    if (officeSelect) officeSelect.value = appointmentOffice || '';
  }
  const reasonButtons = new Map();
  const selectedReasons = new Set();
  const noApptReasonButtons = new Map();
  const selectedNoApptReasons = new Set();

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

  function incomingNoApptReasonsArray(update){
    if (!update) return [];
    if (Array.isArray(update.noAppointmentReasons)) return normalizeReasonList(update.noAppointmentReasons);
    if (typeof update.noAppointmentReason !== 'undefined') return normalizeReasonList(update.noAppointmentReason);
    return [];
  }

  function normalizeReasonList(value){
    const list = Array.isArray(value) ? value : [value];
    return list.map(reason => String(reason || '').trim()).filter(Boolean);
  }

  REASON_OPTIONS.forEach(ensureReasonOption);
  syncOtherVisibility();
  NO_APPT_REASON_OPTIONS.forEach(ensureNoApptReasonOption);
  refreshNoApptReasonButtonsState();
  if (noApptReasonSection) noApptReasonSection.setAttribute('aria-hidden','true');
  if (reasonBlock) reasonBlock.setAttribute('aria-hidden','true');
  if (officeSelect) {
    applyOffice(officeSelect.value || '');
    officeSelect.addEventListener('change', () => {
      applyOffice(officeSelect.value || '');
    });
  }

  // Patient type segmented control
  function setPatientType(type){
    if (!ptTypeGroup) return;
    qsa('.seg', ptTypeGroup).forEach(b => b.classList.toggle('active', b.getAttribute('data-ptype') === type));
  }
  function getPatientType(){
    const active = ptTypeGroup ? qs('.seg.active', ptTypeGroup) : null;
    return active ? active.getAttribute('data-ptype') : 'existing';
  }
  if (ptTypeGroup){
    ptTypeGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg');
      if (!btn) return;
      const isActive = btn.classList.contains('active');
      // Allow toggling off to select the other explicitly or keep one always selected
      qsa('.seg', ptTypeGroup).forEach(b => b.classList.remove('active'));
      if (!isActive) btn.classList.add('active'); else btn.classList.add('active');
    });
  }

  function setPhone(phone){ const el = qs('#patientPhone'); if (el) el.value = phone; }
  function applyPatient(p){
    if (p.name) qs('#patientName').value = p.name;
    if (p.phone) setPhone(p.phone);
    if (p.mrn) qs('#patientMRN').value = p.mrn;
    if (p.dob) qs('#patientDOB').value = normDate(p.dob);
    if (typeof p.isExisting === 'boolean') setPatientType(p.isExisting ? 'existing' : 'new');
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
    const callFor = currentValue('callfor') || 'self';
    const scheduled = currentValue('scheduled') || 'yes';
    // Show reason only for cancellation or reschedule
    if((change === 'cancellation' || change === 'reschedule') && reasonBlock){
      reasonBlock.classList.remove('hidden');
      reasonBlock.setAttribute('aria-hidden','false');
      // If this was a programmatic change (from CRM/logics) do not auto-populate; reset selections
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
    if (noApptReasonSection) {
      const showNoApptReasons = scheduled === 'no' && change === 'none';
      noApptReasonSection.classList.toggle('hidden', !showNoApptReasons);
      noApptReasonSection.setAttribute('aria-hidden', showNoApptReasons ? 'false' : 'true');
      if (!showNoApptReasons) {
        clearNoApptReasonSelection();
      }
    }
  }

  // Household chooser helpers
  function showHousehold(list){
    const chooser = qs('#householdChooser');
    const container = qs('#householdList');
    if (!chooser || !container) return;
    container.innerHTML = '';
    list.forEach(p => {
      const row = document.createElement('div');
      row.className = 'chooser-item';
      row.innerHTML = `
        <div>
          <div>${p.name || 'Unknown'}</div>
          <div class="meta">DOB: ${p.dob || '—'} · MRN: ${p.mrn || '—'}</div>
        </div>
        <button class="btn" data-action="use">Use</button>
      `;
      row.querySelector('[data-action="use"]').addEventListener('click', () => {
        applyPatient(p);
        chooser.classList.add('hidden');
        chooser.setAttribute('aria-hidden','true');
        pulse('Selected from matches');
      });
      container.appendChild(row);
    });
    chooser.classList.remove('hidden');
    chooser.setAttribute('aria-hidden','false');
  }
  function hideHousehold(){
    const chooser = qs('#householdChooser');
    if (chooser){ chooser.classList.add('hidden'); chooser.setAttribute('aria-hidden','true'); }
  }
  function showNoMatch(){
    const banner = qs('#noMatchBanner');
    if (banner){ banner.classList.remove('hidden'); banner.setAttribute('aria-hidden','false'); }
    const subjectWrap = qs('#subjectSearchWrap');
    if (subjectWrap){ subjectWrap.classList.remove('hidden'); subjectWrap.setAttribute('aria-hidden','false'); }
  }
  function hideNoMatch(){
    const banner = qs('#noMatchBanner');
    if (banner){ banner.classList.add('hidden'); banner.setAttribute('aria-hidden','true'); }
  }

  // Mini action buttons (Task/Transfer) with toggle behavior
  // - Clicking an unselected button selects it and deselects its sibling
  // - Clicking the already selected button deselects it (so none selected)
  qsa('.reasons .mini-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.reason-row');
      const wasPressed = btn.classList.contains('pressed');
      qsa('.mini-btn', row).forEach(b => b.classList.remove('pressed'));
      if (!wasPressed) {
        btn.classList.add('pressed');
      }
    });
  });

  // Make the entire Confirmation row toggle the checkbox when clicking empty space
  const confirmInput = qs('#confirmCheck');
  if (confirmInput) {
    const confirmRow = confirmInput.closest('.reason-row');
    confirmRow?.addEventListener('click', (e) => {
      // Ignore direct clicks on interactive elements to preserve native behavior
      if (e.target.closest('input,button,.mini-btn,.checkmark,label,select,textarea')) return;
      confirmInput.checked = !confirmInput.checked;
    });
  }

  // Clear
  clearBtn?.addEventListener('click', () => {
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    setPatientType('new');
    // reset segments
    qsa('.segmented').forEach(group => {
      const first = qs('.seg', group);
      qsa('.seg', group).forEach(b => b.classList.remove('active'));
      first?.classList.add('active');
    });
    // reset reason area
    clearReasonSelection();
    if (reasonBlock) {
      reasonBlock.classList.add('hidden');
      reasonBlock.setAttribute('aria-hidden','true');
    }
    clearNoApptReasonSelection();
    if (noApptReasonSection) {
      noApptReasonSection.classList.add('hidden');
      noApptReasonSection.setAttribute('aria-hidden','true');
    }
    // reset mini buttons and checkbox
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck');
    if(confirm) confirm.checked = false;
    appointmentTypeOverride = '';
    applyOffice('');
    clearAppointmentContext();
    pulse('Cleared');
    setCallerBadge();
  });

  // Done
  doneBtn?.addEventListener('click', () => {
    // Preserve existing callback contract when a reason is required
    const change = currentValue('change');
    if ((change === 'cancellation' || change === 'reschedule') && integration.onReasonSubmit) {
      const reasons = getSelectedReasons();
      const reason = reasons[0] || '';
      const includesOther = reasons.includes('Other');
      const otherText = includesOther ? (otherReasonInput?.value || '') : '';
      try { integration.onReasonSubmit({ change, reason, reasons, otherText }); } catch(e) { console.warn('onReasonSubmit failed', e); }
    }

    // Broadcast full payload to separate analytics listeners (no visual/UI changes)
    try {
      const payload = buildPayload();
      const meta = getCallMeta();
      const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const entry = { id, time: Date.now(), ...meta, ...payload };
      // 1) Direct append to ledger and daily store (guarantees visibility regardless of listeners)
      try {
        const LEDGER_KEY = 'screenpop_ledger_v1';
        const DAILY_KEY = 'screenpop_daily_entries_v1';
        // Ledger
        const ledger = JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]');
        if (!Array.isArray(ledger) || !ledger.find(e => e && e.id === id)) {
          ledger.unshift(entry);
          localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
        }
        // Daily (kept for backward-compat with any older analytics viewers)
        const daily = JSON.parse(localStorage.getItem(DAILY_KEY) || '[]');
        if (!Array.isArray(daily) || !daily.find(e => e && e.id === id)) {
          daily.unshift(entry);
          localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
        }
      } catch {}
      // 2) Live update via BroadcastChannel
      try { const ch = new BroadcastChannel('screenpop-analytics'); ch.postMessage({ type:'submit', entry }); ch.close(); } catch {}
      // 3) Storage event fallback (processed and removed by analytics)
      try { localStorage.setItem(`screenpop_submit_${id}`, JSON.stringify(entry)); } catch {}
      // 4) postMessage fallback for embedded or opener analytics windows
      try {
        const msg = { type:'screenpop-submit', entry };
        try { window.opener && window.opener.postMessage(msg, '*'); } catch {}
        try {
          const parentWin = window.parent;
          if (parentWin && parentWin !== window) parentWin.postMessage(msg, '*');
        } catch {}
      } catch {}
    } catch {}

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

  // Notify analytics windows that the screenpop UI is ready
  try {
    const msg = { type:'screenpop-ready' };
    try { window.opener && window.opener.postMessage(msg, '*'); } catch {}
    try {
      const parentWin = window.parent;
      if (parentWin && parentWin !== window) parentWin.postMessage(msg, '*');
    } catch {}
    try {
      const ch = new BroadcastChannel('screenpop-analytics');
      ch.postMessage({ type: 'ready' });
      ch.close();
    } catch {}
    try { localStorage.setItem('screenpop_ready_ping', String(Date.now())); } catch {}
  } catch {}

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

  function ensureNoApptReasonOption(reason){
    const label = String(reason || '').trim();
    if (!label || !noApptReasonList) return null;
    if (noApptReasonButtons.has(label)) return noApptReasonButtons.get(label);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reason-toggle';
    btn.setAttribute('data-reason', label);
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = label;
    btn.addEventListener('click', () => toggleNoApptReason(label));
    noApptReasonList.appendChild(btn);
    noApptReasonButtons.set(label, btn);
    return btn;
  }

  function refreshNoApptReasonButtonsState(){
    noApptReasonButtons.forEach((btn, label) => {
      const selected = selectedNoApptReasons.has(label);
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function toggleNoApptReason(reason){
    const btn = ensureNoApptReasonOption(reason);
    if (!btn) return;
    if (selectedNoApptReasons.has(reason)) {
      selectedNoApptReasons.delete(reason);
    } else {
      selectedNoApptReasons.add(reason);
    }
    refreshNoApptReasonButtonsState();
  }

  function setNoApptReasonSelection(reasons = []){
    selectedNoApptReasons.clear();
    const list = Array.isArray(reasons) ? reasons : [reasons];
    list.map(reason => String(reason || '').trim()).filter(Boolean).forEach(reason => {
      const btn = ensureNoApptReasonOption(reason);
      if (btn) selectedNoApptReasons.add(reason);
    });
    refreshNoApptReasonButtonsState();
  }

  function clearNoApptReasonSelection(){
    setNoApptReasonSelection([]);
  }

  function getNoApptReasons(){
    return Array.from(selectedNoApptReasons);
  }

  function resetAppointmentMetadata(){
    return {
      appointmentId: '',
      previousAppointmentId: '',
      newAppointmentId: '',
      reschedulePairId: '',
      crmReasonCode: '',
      crmReason: '',
      extra: {}
    };
  }

  function clearAppointmentContext(){
    appointmentMetadata = resetAppointmentMetadata();
    appointmentOutcomeOverrides = null;
  }

  function pickMetaValue(source, keys = []){
    if (!source || typeof source !== 'object') return '';
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = source[key];
        if (value === null || typeof value === 'undefined') return '';
        return String(value);
      }
    }
    return '';
  }

  function setAppointmentMetadata(meta = {}){
    if (!meta || typeof meta !== 'object') return;
    const applyValue = (field, candidates) => {
      const val = pickMetaValue(meta, candidates);
      if (val) {
        appointmentMetadata[field] = val;
      } else if (candidates.some(candidate => Object.prototype.hasOwnProperty.call(meta, candidate))) {
        appointmentMetadata[field] = '';
      }
    };
    applyValue('appointmentId', ['appointmentId','appointment_id','id']);
    applyValue('previousAppointmentId', ['previousAppointmentId','previous_appointment_id','originalAppointmentId','oldAppointmentId','appointmentIdOld']);
    applyValue('newAppointmentId', ['newAppointmentId','new_appointment_id','appointmentIdNew']);
    applyValue('reschedulePairId', ['reschedulePairId','reschedule_pair_id']);
    applyValue('crmReasonCode', ['crmReasonCode','reasonCode','reason_code']);
    applyValue('crmReason', ['crmReason','reason','reasonRaw','reason_raw']);
    if (meta.extra && typeof meta.extra === 'object') {
      appointmentMetadata.extra = { ...(appointmentMetadata.extra || {}), ...meta.extra };
    }
  }

  function applyAppointmentMetadata(update = {}){
    if (!update || typeof update !== 'object') return;
    setAppointmentMetadata(update);
    if (update.metadata && typeof update.metadata === 'object') {
      setAppointmentMetadata(update.metadata);
    }
  }

  function generateReschedulePairId(){
    return `rp_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
  }

  function cloneOutcome(outcome){
    if (!outcome || typeof outcome !== 'object') return null;
    return {
      ...outcome,
      reasons: Array.isArray(outcome.reasons) ? outcome.reasons.map(r => String(r || '').trim()).filter(Boolean) : [],
      noAppointmentReasons: Array.isArray(outcome.noAppointmentReasons) ? outcome.noAppointmentReasons.map(r => String(r || '').trim()).filter(Boolean) : [],
      metadata: outcome.metadata && typeof outcome.metadata === 'object'
        ? { ...outcome.metadata }
        : (outcome.meta && typeof outcome.meta === 'object' ? { ...outcome.meta } : {})
    };
  }

  function normalizeOutcomePayload(outcome){
    if (!outcome || typeof outcome !== 'object') return null;
    const typeRaw = String(outcome.type || outcome.change || outcome.outcome || '').toLowerCase();
    let type = null;
    switch (typeRaw) {
      case 'cancel':
      case 'cancellation':
        type = 'cancellation';
        break;
      case 'reschedule':
        type = 'reschedule';
        break;
      case 'question_only':
      case 'question':
        type = 'question_only';
        break;
      case 'no_change':
      case 'no_appointment':
      case 'no appointment':
      case 'no_show':
        type = 'no_appointment';
        break;
      default:
        type = null;
    }
    const reasons = Array.isArray(outcome.reasons)
      ? outcome.reasons.map(r => String(r || '').trim()).filter(Boolean)
      : [];
    const reasonRaw = String(outcome.reason ?? outcome.reasonRaw ?? outcome.reason_raw ?? (reasons[0] || '')).trim();
    if (!type) {
      if (outcome.questionOnly || outcome.question_only) {
        type = 'question_only';
      } else if (Array.isArray(outcome.noAppointmentReasons || outcome.no_appointment_reasons)) {
        type = 'no_appointment';
      } else if (reasonRaw && String(outcome.scheduled ?? '').toLowerCase() === 'false') {
        type = 'no_appointment';
      } else {
        type = (reasonRaw && String(outcome.scheduled ?? '').toLowerCase() === 'true')
          ? 'reschedule'
          : 'other';
      }
    }
    if (!reasons.length && reasonRaw) reasons.push(reasonRaw);
    const noApptReasons = Array.isArray(outcome.noAppointmentReasons || outcome.no_appointment_reasons)
      ? (outcome.noAppointmentReasons || outcome.no_appointment_reasons).map(r => String(r || '').trim()).filter(Boolean)
      : [];
    const questionOnly = type === 'question_only' || !!(outcome.questionOnly || outcome.question_only);
    if (questionOnly && !noApptReasons.includes('Question Only')) {
      noApptReasons.unshift('Question Only');
    }
    const normalized = {
      type,
      scheduled: type === 'reschedule' ? true : !!outcome.scheduled,
      reasons,
      reasonRaw,
      reasonMapped: (type === 'cancellation' || type === 'reschedule')
        ? mapCancellationReason(reasonRaw || reasons[0] || '')
        : (questionOnly ? 'Question Only' : (reasonRaw || '')),
      otherText: outcome.otherText || outcome.other_text || '',
      noAppointmentReasons,
      questionOnly,
      appointmentId: pickMetaValue(outcome, ['appointmentId','appointment_id','id']),
      previousAppointmentId: pickMetaValue(outcome, ['previousAppointmentId','previous_appointment_id','originalAppointmentId','oldAppointmentId','appointmentIdOld']),
      newAppointmentId: pickMetaValue(outcome, ['newAppointmentId','new_appointment_id','appointmentIdNew']),
      reschedulePairId: pickMetaValue(outcome, ['reschedulePairId','reschedule_pair_id']),
      reasonCode: pickMetaValue(outcome, ['reasonCode','reason_code','crmReasonCode']),
      occurredAt: outcome.occurredAt || outcome.occurred_at || null,
      metadata: outcome.metadata && typeof outcome.metadata === 'object'
        ? { ...outcome.metadata }
        : (outcome.meta && typeof outcome.meta === 'object' ? { ...outcome.meta } : {})
    };
    if (!normalized.reasonMapped && (normalized.type === 'cancellation' || normalized.type === 'reschedule')) {
      const fallback = normalized.reasonRaw || normalized.reasons[0] || appointmentMetadata.crmReason || '';
      normalized.reasonMapped = mapCancellationReason(fallback);
    }
    return normalized;
  }

  function setAppointmentOutcomes(outcomes){
    if (!Array.isArray(outcomes)) {
      appointmentOutcomeOverrides = null;
      return;
    }
    appointmentOutcomeOverrides = outcomes.map(normalizeOutcomePayload).filter(Boolean);
  }

  function addAppointmentOutcome(outcome){
    const normalized = normalizeOutcomePayload(outcome);
    if (!normalized) return;
    if (!Array.isArray(appointmentOutcomeOverrides)) appointmentOutcomeOverrides = [];
    appointmentOutcomeOverrides.push(normalized);
  }

  function clearAppointmentOutcomes(){
    appointmentOutcomeOverrides = null;
  }

  function finalizeOutcomeEvents(list){
    const outcomes = (list || []).map(cloneOutcome).filter(Boolean);
    if (!outcomes.length) return [];
    outcomes.forEach(outcome => {
      if (outcome.type === 'reschedule') {
        outcome.scheduled = true;
      } else if (outcome.type === 'cancellation') {
        outcome.scheduled = false;
      }
      if ((outcome.type === 'cancellation' || outcome.type === 'reschedule')) {
        const fallbackReason = outcome.reasonRaw || outcome.reasons?.[0] || appointmentMetadata.crmReason || '';
        outcome.reasonMapped = mapCancellationReason(outcome.reasonMapped || fallbackReason);
        if (!outcome.reasons?.length && fallbackReason) {
          outcome.reasons = [fallbackReason];
        }
      }
      if (!outcome.reasonRaw && outcome.reasons && outcome.reasons.length) {
        outcome.reasonRaw = outcome.reasons[0];
      }
      if (outcome.type === 'question_only') {
        outcome.questionOnly = true;
        if (!outcome.noAppointmentReasons?.length) {
          outcome.noAppointmentReasons = ['Question Only'];
        }
        outcome.reasonMapped = 'Question Only';
      }
      if (outcome.type === 'no_appointment' && (!outcome.noAppointmentReasons || !outcome.noAppointmentReasons.length) && outcome.reasons?.length) {
        outcome.noAppointmentReasons = [...outcome.reasons];
      }
      const attach = (field, metaField) => {
        if (!outcome[field] && appointmentMetadata[metaField]) {
          outcome[field] = appointmentMetadata[metaField];
        }
      };
      attach('appointmentId', 'appointmentId');
      attach('previousAppointmentId', 'previousAppointmentId');
      attach('newAppointmentId', 'newAppointmentId');
      attach('reschedulePairId', 'reschedulePairId');
      if (!outcome.reasonCode && appointmentMetadata.crmReasonCode) {
        outcome.reasonCode = appointmentMetadata.crmReasonCode;
      }
      if (!outcome.reasonMapped && appointmentMetadata.crmReason) {
        outcome.reasonMapped = mapCancellationReason(appointmentMetadata.crmReason);
      }
      if (!outcome.metadata) outcome.metadata = {};
      if (appointmentMetadata.extra && Object.keys(appointmentMetadata.extra).length) {
        outcome.metadata = { ...appointmentMetadata.extra, ...outcome.metadata };
      }
    });
    const cancel = outcomes.find(o => o.type === 'cancellation');
    const resched = outcomes.find(o => o.type === 'reschedule');
    if (cancel && resched) {
      const pairId = cancel.reschedulePairId || resched.reschedulePairId || appointmentMetadata.reschedulePairId || generateReschedulePairId();
      cancel.reschedulePairId = pairId;
      resched.reschedulePairId = pairId;
      if (!appointmentMetadata.reschedulePairId) appointmentMetadata.reschedulePairId = pairId;
    }
    return outcomes;
  }

  function deriveAppointmentOutcomesFromUi(){
    const change = currentValue('change') || 'none';
    const scheduledYes = currentValue('scheduled') === 'yes';
    const reasons = getSelectedReasons();
    const reason = reasons[0] || '';
    const otherText = reasons.includes('Other') ? (otherReasonInput?.value || '') : '';
    const noApptReasons = getNoApptReasons();
    const questionOnly = selectedNoApptReasons.has('Question Only');
    const otherNoApptReasons = noApptReasons.filter(label => label && label !== 'Question Only');

    const outcomes = [];
    if (change === 'cancellation') {
      outcomes.push(normalizeOutcomePayload({
        type: 'cancellation',
        scheduled: false,
        reasons,
        reason,
        otherText
      }));
    } else if (change === 'reschedule') {
      outcomes.push(normalizeOutcomePayload({
        type: 'reschedule',
        scheduled: true,
        reasons,
        reason,
        otherText
      }));
    }

    if (change === 'none') {
      if (questionOnly) {
        outcomes.push(normalizeOutcomePayload({
          type: 'question_only',
          scheduled: false,
          noAppointmentReasons: ['Question Only'],
          questionOnly: true
        }));
      }
      if (otherNoApptReasons.length) {
        outcomes.push(normalizeOutcomePayload({
          type: 'no_appointment',
          scheduled: false,
          noAppointmentReasons: otherNoApptReasons,
          reasons: otherNoApptReasons,
          reason: otherNoApptReasons[0] || ''
        }));
      }
    }

    if (!outcomes.length && !scheduledYes && (questionOnly || otherNoApptReasons.length)) {
      outcomes.push(normalizeOutcomePayload({
        type: questionOnly ? 'question_only' : 'no_appointment',
        scheduled: false,
        noAppointmentReasons: noApptReasons,
        reasons: otherNoApptReasons,
        reason: otherNoApptReasons[0] || '',
        questionOnly
      }));
    }

    return outcomes.filter(Boolean);
  }

  function deriveAppointmentOutcomes(){
    const base = Array.isArray(appointmentOutcomeOverrides)
      ? appointmentOutcomeOverrides.map(cloneOutcome).filter(Boolean)
      : deriveAppointmentOutcomesFromUi();
    return finalizeOutcomeEvents(base);
  }

  function buildPayload(){
    const reasons = getSelectedReasons();
    const reason = reasons[0] || '';
    const includesOther = reasons.includes('Other');
    const otherText = includesOther ? (otherReasonInput?.value || '') : '';
    const noApptReasons = getNoApptReasons();
    const questionOnly = selectedNoApptReasons.has('Question Only');
    const ptActive = qs('.pt-type .seg.active');
    const patientType = ptActive ? ptActive.getAttribute('data-ptype') : '';
    const confirmed = !!qs('#confirmCheck')?.checked;
    const actions = harvestActions();
    const meta = getCallMeta();
    const apptType = appointmentTypeOverride || meta.apptType || '';
    const office = appointmentOffice || normalizeOfficeValue(meta.office || meta.location) || '';
    const change = currentValue('change') || 'none';
    const outcomes = deriveAppointmentOutcomes();
    const outcomePayload = outcomes.map(cloneOutcome);
    const appointmentId = appointmentMetadata.appointmentId || '';
    const previousAppointmentId = appointmentMetadata.previousAppointmentId || '';
    const newAppointmentId = appointmentMetadata.newAppointmentId || '';
    const reschedulePairId = appointmentMetadata.reschedulePairId || '';
    const crmReasonCode = appointmentMetadata.crmReasonCode || '';
    const crmReason = appointmentMetadata.crmReason || '';
    const metadataExtra = appointmentMetadata.extra && Object.keys(appointmentMetadata.extra).length ? { ...appointmentMetadata.extra } : null;
    const metadataSnapshot = {};
    if (appointmentId) metadataSnapshot.appointmentId = appointmentId;
    if (previousAppointmentId) metadataSnapshot.previousAppointmentId = previousAppointmentId;
    if (newAppointmentId) metadataSnapshot.newAppointmentId = newAppointmentId;
    if (reschedulePairId) metadataSnapshot.reschedulePairId = reschedulePairId;
    if (crmReasonCode) metadataSnapshot.crmReasonCode = crmReasonCode;
    if (crmReason) metadataSnapshot.crmReason = crmReason;
    if (metadataExtra) metadataSnapshot.extra = metadataExtra;
    const prioritizedOutcome = change === 'reschedule'
      ? outcomes.find(o => o.type === 'reschedule')
      : (change === 'cancellation'
        ? outcomes.find(o => o.type === 'cancellation')
        : null);
    const fallbackOutcome = prioritizedOutcome || outcomes[0] || null;
    const effectiveReason = reason
      || prioritizedOutcome?.reasonRaw
      || fallbackOutcome?.reasonRaw
      || crmReason
      || '';
    const effectiveReasons = reasons.length
      ? reasons
      : (prioritizedOutcome?.reasons?.length
        ? prioritizedOutcome.reasons
        : (fallbackOutcome?.reasons || (effectiveReason ? [effectiveReason] : [])));
    const combinedNoApptReasons = Array.from(new Set([
      ...noApptReasons,
      ...(outcomes.flatMap(o => Array.isArray(o.noAppointmentReasons) ? o.noAppointmentReasons : []) || [])
    ].filter(Boolean)));
    const questionOnlyFlag = questionOnly || outcomes.some(o => o.type === 'question_only' || o.questionOnly);
    const reasonMapped = mapCancellationReason(effectiveReason);
    const otherTextCandidates = [
      otherText,
      prioritizedOutcome?.otherText || '',
      fallbackOutcome?.otherText || ''
    ].filter(Boolean);
    const otherTextValue = otherTextCandidates[0] || '';
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
        change,
        reason: effectiveReason,
        reasons: effectiveReasons,
        reasonMapped,
        reasonCode: crmReasonCode,
        noAppointmentReasons: combinedNoApptReasons,
        questionOnly: questionOnlyFlag,
        otherText: otherTextValue,
        confirmed,
        type: apptType,
        office,
        appointmentId,
        previousAppointmentId,
        newAppointmentId,
        reschedulePairId,
        outcomes: outcomePayload,
        ...(Object.keys(metadataSnapshot).length ? { metadata: metadataSnapshot } : {})
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

  function getCallMeta(){
    try {
      const url = new URL(window.location.href);
      const ani = url.searchParams.get('ani') || url.searchParams.get('phone') || '';
      const agent = url.searchParams.get('agent') || '';
      const callId = url.searchParams.get('callId') || '';
      const apptType = url.searchParams.get('apptType') || url.searchParams.get('appt') || '';
      const office = url.searchParams.get('office') || url.searchParams.get('location') || '';
      return { ani, agent, callId, apptType, office };
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
