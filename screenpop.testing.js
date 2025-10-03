// Scenario driver for screenpop.testing.html
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const DEFAULT_PHONE = '+15551234567'; // maps to John Smith in mock

  const scenarios = {
    existing_cancel: async () => {
      await handleIncoming();
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'cancellation', reason: 'Illness/Family Emergency' });
      clearOtherReasons();
    },
    existing_reschedule: async () => {
      await handleIncoming();
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'reschedule', reason: 'Work/School Conflict' });
      clearOtherReasons();
    },
    confirm: async () => {
      await handleIncoming();
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'none' });
      clearOtherReasons();
      const c = qs('#confirmCheck'); if (c) c.checked = true;
    },
    ma_call: async () => { await handleIncoming(); selectReasonRow('MA Call'); },
    results_call: async () => { await handleIncoming(); selectReasonRow('Results'); },
    provider_question: async () => { await handleIncoming(); selectReasonRow('Provider Question'); },
    refill_request: async () => { await handleIncoming(); selectReasonRow('Refill Request'); },
    billing_question: async () => { await handleIncoming(); selectReasonRow('Billing Question'); },
  };

  async function handleIncoming(){
    await window.ScreenpopAPI.handleIncomingCall(DEFAULT_PHONE);
  }

  function selectReasonRow(label){
    clearOtherReasons();
    const rows = qsa('.reason-row');
    const row = rows.find(r => (qs('.reason-label', r)?.textContent || '').trim() === label);
    if (!row) return;
    const taskBtn = qs('.mini-btn', row); // default to Task
    if (taskBtn) taskBtn.classList.add('pressed');
    const confirm = qs('#confirmCheck'); if (confirm) confirm.checked = false;
    // Make sure appointment change is none to emphasize "other reasons"
    window.ScreenpopAPI.applyAppointment({ change: 'none' });
  }

  function clearOtherReasons(){
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck'); if (confirm) confirm.checked = false;
    // Reset reason dropdown if visible
    const sel = qs('#reasonSelect'); if (sel) sel.value = '';
    const wrap = qs('#otherReasonWrap'); if (wrap) wrap.classList.add('hidden');
  }

  function resetAll(){
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    const chk = qs('#patientType'); if (chk) chk.checked = false;
    window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'none' });
    clearOtherReasons();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const select = qs('#scenario');
    const runBtn = qs('#runScenario');
    const resetBtn = qs('#resetScenario');
    const run = async () => {
      const key = select.value;
      if (scenarios[key]) await scenarios[key]();
    };
    runBtn?.addEventListener('click', run);
    select?.addEventListener('change', run);
    resetBtn?.addEventListener('click', resetAll);
    // Auto-run the first scenario on load for convenience
    run();
  });
})();

