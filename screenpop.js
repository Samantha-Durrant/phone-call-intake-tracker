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
      // Reason handling: only set when explicitly provided. Otherwise clear when change requires it.
      if (update.reason){
        reasonSelect.value = update.reason === 'Other' ? 'Other' : update.reason;
        if (update.reason === 'Other') {
          otherReasonWrap.classList.remove('hidden');
          if (update.otherText) qs('#otherReason').value = update.otherText || '';
        }
      } else {
        const ch = update.change || currentValue('change');
        if (ch === 'cancellation' || ch === 'reschedule') {
          // No explicit reason supplied: ensure UI does not prefill
          if (reasonSelect) reasonSelect.value = '';
          if (otherReasonWrap) otherReasonWrap.classList.add('hidden');
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
  const reasonSelect = qs('#reasonSelect');
  const otherReasonWrap = qs('#otherReasonWrap');
  const clearBtn = qs('#clearBtn');
  const doneBtn = qs('#doneBtn');
  const statusMsg = qs('#statusMsg');
  const ptTypeGroup = qs('.pt-type');

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
    // Show reason only for cancellation or reschedule
    if(change === 'cancellation' || change === 'reschedule'){
      reasonBlock.classList.remove('hidden');
      // If this was a programmatic change (from CRM/logics) do not auto-populate; reset to "Select reason"
      if (programmaticChange && reasonSelect) {
        reasonSelect.value = '';
        if (otherReasonWrap) otherReasonWrap.classList.add('hidden');
      }
    } else {
      reasonBlock.classList.add('hidden');
      reasonSelect.value = '';
      otherReasonWrap.classList.add('hidden');
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

  reasonSelect?.addEventListener('change', () => {
    if(reasonSelect.value === 'Other'){
      otherReasonWrap.classList.remove('hidden');
    } else {
      otherReasonWrap.classList.add('hidden');
    }
  });

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
    reasonSelect.value = '';
    otherReasonWrap.classList.add('hidden');
    reasonBlock.classList.add('hidden');
    // reset mini buttons and checkbox
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck');
    if(confirm) confirm.checked = false;
    pulse('Cleared');
    setCallerBadge();
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
