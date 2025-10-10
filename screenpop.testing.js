// Manual scenario driver for screenpop.testing.html
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const DEFAULT_PHONE = '+15551234567'; // maps to John Smith in mock data
  const STATUS_DEFAULT = 'Testing mode — send the test caller to load mock data';
  let SESSION_ID = null;

  function updateStatus(text){
    const el = qs('#statusMsg');
    if (el && typeof text === 'string') {
      el.textContent = text;
    }
  }

  async function simulateManualCaller(){
    await handleIncoming(DEFAULT_PHONE);
    updateStatus(`Loaded mock caller ${DEFAULT_PHONE}`);
  }

  async function handleIncoming(phone){
    await window.ScreenpopAPI.handleIncomingCall(phone || DEFAULT_PHONE);
    applySelectedApptType();
    applySelectedOffice();
  }

  function setManualDefaults(){
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

  function resetAll(){
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => { i.value = ''; });
    setPatientType('new');
    setManualDefaults();
    qsa('.reasons .mini-btn').forEach(b => b.classList.remove('pressed'));
    const confirm = qs('#confirmCheck');
    if (confirm) confirm.checked = false;
    clearReasonToggles();
    const apptSelect = qs('#apptTypeSelect');
    if (apptSelect) apptSelect.value = '';
    const office = qs('#officePicker');
    if (office) office.value = '';
    applySelectedApptType();
    applySelectedOffice();
    updateStatus(STATUS_DEFAULT);
  }

  document.addEventListener('DOMContentLoaded', () => {
    SESSION_ID = 'sess_' + Math.random().toString(36).slice(2,8);
    window.ScreenpopLogic?.configure({ sessionId: SESSION_ID, acceptBackground: false });

    const runBtn = qs('#runScenario');
    const resetBtn = qs('#resetScenario');
    const apptSelect = qs('#apptTypeSelect');
    const officePicker = qs('#officePicker');

    runBtn?.addEventListener('click', simulateManualCaller);
    resetBtn?.addEventListener('click', resetAll);
    apptSelect?.addEventListener('change', applySelectedApptType);
    officePicker?.addEventListener('change', applySelectedOffice);

    setManualDefaults();
    applySelectedApptType();
    applySelectedOffice();
    updateStatus(STATUS_DEFAULT);
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
