// Scenario driver for screenpop.testing.html
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const DEFAULT_PHONE = '+15551234567'; // maps to John Smith in mock
  const NEW_PHONE = '+15559998888'; // not in mock => treated as new patient
  let SESSION_ID = null;

  const scenarios = {
    existing_cancel: async () => {
      await handleIncoming(DEFAULT_PHONE);
      ScreenpopLogic.processCrmEvent({
        type: 'cancel',
        appointments: [{ status: 'cancelled' }],
        occurredAt: Date.now(),
        sessionId: SESSION_ID
      });
    },
    existing_reschedule: async () => {
      await handleIncoming(DEFAULT_PHONE);
      ScreenpopLogic.processCrmEvent({
        type: 'reschedule',
        appointments: [{ status: 'rescheduled' }],
        occurredAt: Date.now(),
        sessionId: SESSION_ID
      });
    },
    existing_schedule: async () => {
      await handleIncoming(DEFAULT_PHONE);
      ScreenpopLogic.processCrmEvent({
        type: 'confirm',
        appointments: [{ status: 'scheduled' }],
        occurredAt: Date.now(),
        sessionId: SESSION_ID
      });
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'none' });
    },
    confirm: async () => {
      await handleIncoming(DEFAULT_PHONE);
      ScreenpopLogic.processCrmEvent({
        type: 'confirm',
        appointments: [{ status: 'confirmed' }],
        occurredAt: Date.now(),
        sessionId: SESSION_ID
      });
    },
    // Non-appointment reasons should default to NO scheduled and NO change
    ma_call: async () => { await handleIncoming(DEFAULT_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    results_call: async () => { await handleIncoming(DEFAULT_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    provider_question: async () => { await handleIncoming(DEFAULT_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    refill_request: async () => { await handleIncoming(DEFAULT_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    billing_question: async () => { await handleIncoming(DEFAULT_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },

    // New patient scenarios (use a phone not present in mock)
    new_cancel: async () => {
      await handleIncoming(NEW_PHONE);
      ScreenpopLogic.processCrmEvent({ type:'cancel', appointments:[{status:'cancelled'}], occurredAt: Date.now(), sessionId: SESSION_ID });
    },
    new_reschedule: async () => {
      await handleIncoming(NEW_PHONE);
      ScreenpopLogic.processCrmEvent({ type:'reschedule', appointments:[{status:'rescheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID });
    },
    new_confirm: async () => {
      await handleIncoming(NEW_PHONE);
      ScreenpopLogic.processCrmEvent({ type:'confirm', appointments:[{status:'confirmed'}], occurredAt: Date.now(), sessionId: SESSION_ID });
    },
    new_schedule: async () => {
      await handleIncoming(NEW_PHONE);
      ScreenpopLogic.processCrmEvent({ type:'confirm', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID });
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'none' });
    },
    new_ma_call: async () => { await handleIncoming(NEW_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    new_results_call: async () => { await handleIncoming(NEW_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    new_provider_question: async () => { await handleIncoming(NEW_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    new_refill_request: async () => { await handleIncoming(NEW_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    new_billing_question: async () => { await handleIncoming(NEW_PHONE); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },

    // True new patient: do not auto-populate any patient fields
    true_new_blank: async () => { await trueNew('none'); },
    true_new_cancel: async () => { await trueNew('cancellation'); },
    true_new_reschedule: async () => { await trueNew('reschedule'); },
    true_new_confirm: async () => { await trueNew('none'); },
    true_new_ma_call: async () => { await trueNew('none'); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    true_new_results_call: async () => { await trueNew('none'); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    true_new_provider_question: async () => { await trueNew('none'); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    true_new_refill_request: async () => { await trueNew('none'); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },
    true_new_billing_question: async () => { await trueNew('none'); window.ScreenpopAPI.applyAppointment({ scheduled: false, change: 'none' }); markQuestionOnly(); },

    // Household: phone maps to multiple patients -> show chooser
    household_match: async () => {
      await handleIncoming('+15553334444'); // Sarah Smith + John Smith per mock
      // Leave selection to user via chooser UI
    },
    // No match: unknown phone -> show no-match banner and prompt to search
    no_match_phone: async () => {
      await handleIncoming('+15550000000'); // not in mock
      // Auto-toggle to Someone Else to expose subject fields for convenience
      document.querySelectorAll('.seg[data-group="callfor"]').forEach(b => b.classList.toggle('active', b.getAttribute('data-value')==='proxy'));
      // Scroll to subject search
      document.getElementById('subjectSearchWrap')?.scrollIntoView({behavior:'smooth', block:'nearest'});
    },
    // Proxy flow: force Someone Else and let user apply a subject
    proxy_flow: async () => {
      await handleIncoming(DEFAULT_PHONE);
      // Switch to Someone Else
      document.querySelectorAll('.seg[data-group="callfor"]').forEach(b => b.classList.toggle('active', b.getAttribute('data-value')==='proxy'));
      // Clear patient fields to avoid confusion
      ['patientName','patientMRN','patientDOB','patientPhone'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
      ScreenpopAPI.applyAppointment({ scheduled:false, change:'none' });
      // Expose subject search
      document.getElementById('subjectSearchWrap')?.classList.remove('hidden');
      document.getElementById('subjectSearchWrap')?.setAttribute('aria-hidden','false');
    },
  };

  async function handleIncoming(phone){
    await window.ScreenpopAPI.handleIncomingCall(phone || DEFAULT_PHONE);
    applySelectedApptType();
  }

  function markQuestionOnly(){
    window.ScreenpopAPI?.setNoAppointmentReasons(['Question Only']);
  }

  function setManualScenarioState(){
    document.querySelectorAll('.seg[data-group="callfor"]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-value') === 'self');
    });
    const subjectWrap = document.getElementById('subjectSearchWrap');
    if (subjectWrap) {
      subjectWrap.classList.add('hidden');
      subjectWrap.setAttribute('aria-hidden','true');
    }
    window.ScreenpopAPI?.applyAppointment({ scheduled: true, change: 'none' });
    window.ScreenpopAPI?.clearNoAppointmentReasons();
  }

  async function trueNew(change){
    // Blank out all patient fields and mark as New
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    setPatientType('new');
    // Clear Task/Transfer and Confirmation; clear reason UI
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck'); if (confirm) confirm.checked = false;
    clearReasonToggles();
    // Ensure Scheduled is derived by logic
    if (change === 'cancellation') {
      ScreenpopLogic.processCrmEvent({ type:'cancel', appointments:[{status:'cancelled'}], occurredAt: Date.now(), sessionId: SESSION_ID });
    } else if (change === 'reschedule') {
      ScreenpopLogic.processCrmEvent({ type:'reschedule', appointments:[{status:'rescheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID });
    } else {
      // no change; keep scheduled unset (none)
      ScreenpopLogic.processCrmEvent({ type:'none', appointments: [], occurredAt: Date.now(), sessionId: SESSION_ID });
    }
  }

  // Intentionally do not automate Task/Transfer or Confirmation selections

  function clearOtherReasons(){
    // Keep user selections intact unless Reset is clicked.
  }

  function resetAll(){
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    setPatientType('new');
    window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'none' });
    // Now clear buttons/checkbox for a full reset
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck'); if (confirm) confirm.checked = false;
    clearReasonToggles();
    const select = qs('#apptTypeSelect');
    if (select) select.value = '';
    window.ScreenpopAPI?.setAppointmentType('');
    const office = qs('#officePicker');
    if (office) office.value = '';
    window.ScreenpopAPI?.setAppointmentOffice('');
    window.ScreenpopAPI?.clearNoAppointmentReasons();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Start a session for in-call testing; ignore background
    SESSION_ID = 'sess_' + Math.random().toString(36).slice(2,8);
    window.ScreenpopLogic?.configure({ sessionId: SESSION_ID, acceptBackground: false });
    const select = qs('#scenario');
    const runBtn = qs('#runScenario');
    const resetBtn = qs('#resetScenario');
    const apptSelect = qs('#apptTypeSelect');
    const officePicker = qs('#officePicker');
    const run = async () => {
      const key = select?.value || '';
      if (!key) {
        setManualScenarioState();
      } else if (scenarios[key]) {
        await scenarios[key]();
      }
      applySelectedApptType();
      applySelectedOffice();
    };
    runBtn?.addEventListener('click', run);
    select?.addEventListener('change', run);
    resetBtn?.addEventListener('click', resetAll);
    apptSelect?.addEventListener('change', applySelectedApptType);
    officePicker?.addEventListener('change', applySelectedOffice);
    setManualScenarioState();
    applySelectedApptType();
    applySelectedOffice();
  });

  function setPatientType(type){
    const group = qs('.pt-type');
    if (!group) return;
    qsa('.seg', group).forEach(b => b.classList.toggle('active', b.getAttribute('data-ptype') === type));
  }

  function clearReasonToggles(){
    qsa('.reason-toggle[aria-pressed="true"]').forEach(btn => btn.click());
    window.ScreenpopAPI?.clearNoAppointmentReasons();
  }

  function applySelectedApptType(){
    const select = qs('#apptTypeSelect');
    if (!select) return;
    const value = select.value || '';
    window.ScreenpopAPI?.setAppointmentType(value);
  }

  function applySelectedOffice(){
    const select = qs('#officePicker');
    const value = select?.value || '';
    window.ScreenpopAPI?.setAppointmentOffice(value);
  }
})();
