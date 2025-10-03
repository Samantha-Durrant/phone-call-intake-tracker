// Scenario driver for screenpop.testing.html
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const DEFAULT_PHONE = '+15551234567'; // maps to John Smith in mock

  const scenarios = {
    existing_cancel: async () => {
      await handleIncoming();
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'cancellation', reason: 'Illness/Family Emergency' });
    },
    existing_reschedule: async () => {
      await handleIncoming();
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'reschedule', reason: 'Work/School Conflict' });
    },
    confirm: async () => {
      await handleIncoming();
      window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'none' });
    },
    ma_call: async () => { await handleIncoming(); window.ScreenpopAPI.applyAppointment({ change: 'none' }); },
    results_call: async () => { await handleIncoming(); window.ScreenpopAPI.applyAppointment({ change: 'none' }); },
    provider_question: async () => { await handleIncoming(); window.ScreenpopAPI.applyAppointment({ change: 'none' }); },
    refill_request: async () => { await handleIncoming(); window.ScreenpopAPI.applyAppointment({ change: 'none' }); },
    billing_question: async () => { await handleIncoming(); window.ScreenpopAPI.applyAppointment({ change: 'none' }); },
  };

  async function handleIncoming(){
    await window.ScreenpopAPI.handleIncomingCall(DEFAULT_PHONE);
  }

  // Intentionally do not automate Task/Transfer or Confirmation selections

  function clearOtherReasons(){
    // Keep user selections intact unless Reset is clicked.
  }

  function resetAll(){
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    const chk = qs('#patientType'); if (chk) chk.checked = false;
    window.ScreenpopAPI.applyAppointment({ scheduled: true, change: 'none' });
    // Now clear buttons/checkbox for a full reset
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck'); if (confirm) confirm.checked = false;
    const sel = qs('#reasonSelect'); if (sel) sel.value = '';
    const wrap = qs('#otherReasonWrap'); if (wrap) wrap.classList.add('hidden');
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
