// Driver for v3 testing: combines session-aware logic with mock CRM and scenarios
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const logEl = () => qs('#log');

  const DEFAULT_PHONE = '+15551234567'; // known mock patient
  const NEW_PHONE = '+15559998888';     // not in mock => treated as new
  let SESSION_ID = null;

  function appendLog(msg, data){
    const line = `[${new Date().toLocaleTimeString()}] ${msg}${data? ' ' + JSON.stringify(data): ''}`;
    if (logEl()) logEl().textContent = line + '\n' + logEl().textContent;
  }

  function setPatientType(type){
    const group = qs('.pt-type');
    if (!group) return;
    qsa('.seg', group).forEach(b => b.classList.toggle('active', b.getAttribute('data-ptype') === type));
  }

  async function handleIncoming(phone){
    await window.ScreenpopAPI.handleIncomingCall(phone);
    appendLog('incoming_call', { phone, sessionId: SESSION_ID });
  }

  function clearExtras(){
    // Do not auto-select Task/Transfer or Confirmation; leave manual
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck'); if (confirm) confirm.checked = false;
  }

  function clearPatient(){
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
  }

  function sendEvent(evt){
    window.ScreenpopLogic.processCrmEvent(evt);
    appendLog('event', evt);
  }

  const scenarios = {
    // Existing patient flows
    existing_cancel: async () => {
      await handleIncoming(DEFAULT_PHONE);
      clearExtras();
      sendEvent({ type:'cancel', appointments:[{status:'cancelled'}], reason:'Illness/Family Emergency', occurredAt: Date.now(), sessionId: SESSION_ID });
    },
    existing_reschedule: async () => {
      await handleIncoming(DEFAULT_PHONE);
      clearExtras();
      sendEvent({ type:'reschedule', appointments:[{status:'rescheduled'}], reason:'Work/School Conflict', occurredAt: Date.now(), sessionId: SESSION_ID });
    },
    confirm: async () => {
      await handleIncoming(DEFAULT_PHONE);
      clearExtras();
      sendEvent({ type:'confirm', appointments:[{status:'confirmed'}], occurredAt: Date.now(), sessionId: SESSION_ID });
    },
    ma_call: async () => { await handleIncoming(DEFAULT_PHONE); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    results_call: async () => { await handleIncoming(DEFAULT_PHONE); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    provider_question: async () => { await handleIncoming(DEFAULT_PHONE); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    refill_request: async () => { await handleIncoming(DEFAULT_PHONE); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    billing_question: async () => { await handleIncoming(DEFAULT_PHONE); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },

    // New patient flows (known phone but treated as new via patientType buttons if needed)
    new_cancel: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'cancel', appointments:[{status:'cancelled'}], reason:'Illness/Family Emergency', occurredAt: Date.now(), sessionId: SESSION_ID }); },
    new_reschedule: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'reschedule', appointments:[{status:'rescheduled'}], reason:'Work/School Conflict', occurredAt: Date.now(), sessionId: SESSION_ID }); },
    new_confirm: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'confirm', appointments:[{status:'confirmed'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    new_ma_call: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    new_results_call: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    new_provider_question: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    new_refill_request: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    new_billing_question: async () => { await handleIncoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },

    // True new (blank fields, no mock data)
    true_new_blank: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_cancel: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'cancel', appointments:[{status:'cancelled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_reschedule: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'reschedule', appointments:[{status:'rescheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_confirm: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'confirm', appointments:[{status:'confirmed'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_ma_call: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_results_call: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_provider_question: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_refill_request: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
    true_new_billing_question: async () => { SESSION_ID ||= startSessionIfNeeded(); clearPatient(); setPatientType('new'); clearExtras(); sendEvent({ type:'none', appointments:[{status:'scheduled'}], occurredAt: Date.now(), sessionId: SESSION_ID }); },
  };

  function startSessionIfNeeded(){
    const id = 'sess_' + Math.random().toString(36).slice(2,8);
    window.ScreenpopLogic.configure({ sessionId: id, acceptBackground: false });
    appendLog('session_start', { sessionId: id, acceptBackground: false });
    return id;
  }

  function endSession(){
    appendLog('session_end', { sessionId: SESSION_ID });
    SESSION_ID = null;
    window.ScreenpopLogic.configure({ sessionId: null, acceptBackground: true });
  }

  function reset(){
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    setPatientType('new');
    clearExtras();
    // Clear change/scheduled segments via UI defaults
    const schedGroup = qsa('.segmented')[0];
    if (schedGroup){ qsa('.seg', schedGroup).forEach(b => b.classList.remove('active')); qsa('.seg', schedGroup)[0].classList.add('active'); }
    const changeGroup = qsa('.segmented')[1];
    if (changeGroup){ qsa('.seg', changeGroup).forEach(b => b.classList.remove('active')); qsa('.seg', changeGroup)[0].classList.add('active'); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Start a session by default to mirror in-call behavior
    SESSION_ID = startSessionIfNeeded();
    const select = qs('#scenario');
    const runBtn = qs('#runScenario');
    const resetBtn = qs('#resetScenario');
    qs('#startSession').addEventListener('click', () => { SESSION_ID = startSessionIfNeeded(); });
    qs('#endSession').addEventListener('click', () => { endSession(); });
    const run = async () => { const key = select.value; if (scenarios[key]) await scenarios[key](); };
    runBtn.addEventListener('click', run);
    select.addEventListener('change', run);
    resetBtn.addEventListener('click', reset);
    // auto-run first scenario for quick feedback
    run();
  });
})();

