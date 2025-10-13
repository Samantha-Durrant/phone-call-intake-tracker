// Manual scenario driver for screenpop.testing.html
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const DEFAULT_PHONE = '+15551234567'; // maps to John Smith in mock data
  const STATUS_DEFAULT = 'Testing mode — send the test caller to load mock data';
  const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
  let BATCH_VARIANTS = [];
  const batchState = { running: false, abort: false };
  let runBtn = null;
  let resetBtn = null;
  let runAllBtn = null;
  let apptSelect = null;
  let officePicker = null;
  let statusEl = null;
  let statusObserver = null;
  let lockedStatus = '';
  let SESSION_ID = null;

  function updateStatus(text){
    if (typeof text !== 'string') return;
    const el = statusEl || qs('#statusMsg');
    if (!el) return;
    statusEl = el;
    el.textContent = text;
    if (batchState.running) {
      lockedStatus = text;
    } else {
      lockedStatus = '';
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

    statusEl = qs('#statusMsg');
    runBtn = qs('#runScenario');
    resetBtn = qs('#resetScenario');
    runAllBtn = qs('#runAllCombos');
    apptSelect = qs('#apptTypeSelect');
    officePicker = qs('#officePicker');

    runBtn?.addEventListener('click', simulateManualCaller);
    resetBtn?.addEventListener('click', resetAll);
    apptSelect?.addEventListener('change', applySelectedApptType);
    officePicker?.addEventListener('change', applySelectedOffice);
    runAllBtn?.addEventListener('click', () => {
      if (batchState.running) {
        batchState.abort = true;
        updateStatus('Stopping batch after current scenario...');
        if (runAllBtn) runAllBtn.textContent = 'Stopping...';
        return;
      }
      runAllCombos().catch((err) => {
        console.error('Run all combos failed', err);
        updateStatus('Batch run failed — check console for details');
        batchState.running = false;
        batchState.abort = false;
        if (runAllBtn) runAllBtn.textContent = 'Run All Combos';
        if (runAllBtn) delete runAllBtn.dataset.state;
        setDemoControlsDisabled(false);
        releaseStatus();
      });
    });

    ensureBatchVariants();

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

  function collectUniqueOptions(selectEl){
    if (!selectEl) return [];
    const values = Array.from(selectEl.querySelectorAll('option'))
      .map(opt => String(opt.value || '').trim())
      .filter(Boolean);
    return Array.from(new Set(values));
  }

  function collectReasonOptions(){
    return qsa('#reasonToggleList .reason-toggle')
      .map(btn => btn.getAttribute('data-reason') || btn.textContent?.trim() || '')
      .filter(Boolean);
  }

  function collectNoApptOptions(){
    return qsa('#noApptReasonList .reason-toggle')
      .map(btn => btn.getAttribute('data-reason') || btn.textContent?.trim() || '')
      .filter(Boolean);
  }

  function slugify(label){
    return String(label || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'item';
  }

  function buildBatchVariants({ reasonOptions = [], noApptOptions = [] } = {}){
    const variants = [
      { key: 'scheduled_existing', label: 'Scheduled · Existing', scheduled: true, change: 'none', patientType: 'existing', confirm: true },
      { key: 'scheduled_new', label: 'Scheduled · New', scheduled: true, change: 'none', patientType: 'new', confirm: false }
    ];

    const reasonList = reasonOptions.length ? reasonOptions : ['General Reason'];
    reasonList.forEach((reason) => {
      const slug = slugify(reason);
      const isOther = /^other$/i.test(reason);
      const otherText = isOther ? 'Additional context supplied for "Other" reason.' : '';
      variants.push({
        key: `cancel_${slug}`,
        label: `Cancellation · ${reason}`,
        scheduled: true,
        change: 'cancellation',
        reasons: [reason],
        otherText,
        patientType: 'existing'
      });
      variants.push({
        key: `resched_${slug}`,
        label: `Reschedule · ${reason}`,
        scheduled: true,
        change: 'reschedule',
        reasons: [reason],
        otherText,
        patientType: 'existing'
      });
    });

    const noApptList = noApptOptions.length ? noApptOptions : ['General Interest'];
    noApptList.forEach((reason) => {
      const slug = slugify(reason);
      variants.push({
        key: `noappt_${slug}`,
        label: `No Appointment · ${reason}`,
        scheduled: false,
        change: 'none',
        noApptReasons: [reason],
        patientType: 'new'
      });
    });

    return variants;
  }

  function ensureBatchVariants(){
    if (BATCH_VARIANTS.length) return;
    BATCH_VARIANTS = buildBatchVariants({
      reasonOptions: collectReasonOptions(),
      noApptOptions: collectNoApptOptions()
    });
  }

  function buildScenarioQueue(){
    ensureBatchVariants();
    const apptTypes = collectUniqueOptions(apptSelect);
    const offices = collectUniqueOptions(officePicker);
    if (!apptTypes.length || !offices.length) return [];
    const scenarios = [];
    apptTypes.forEach(apptType => {
      offices.forEach(office => {
        BATCH_VARIANTS.forEach(variant => {
          const reasons = Array.isArray(variant.reasons) ? [...variant.reasons] : undefined;
          const noApptReasons = Array.isArray(variant.noApptReasons) ? [...variant.noApptReasons] : undefined;
          scenarios.push({
            ...variant,
            reasons,
            noApptReasons,
            apptType,
            office,
            summary: `${variant.label} · ${apptType} @ ${office}`
          });
        });
      });
    });
    return scenarios;
  }

  function setDemoControlsDisabled(disabled){
    if (runBtn) runBtn.disabled = disabled;
    if (resetBtn) resetBtn.disabled = disabled;
  }

  function clearMiniActions(){
    qsa('.reasons .mini-btn').forEach(btn => btn.classList.remove('pressed'));
  }

  function lockStatus(){
    if (!statusEl) statusEl = qs('#statusMsg');
    if (!statusEl || statusObserver) return;
    statusObserver = new MutationObserver(() => {
      if (!batchState.running || !lockedStatus) return;
      if (statusEl.textContent === lockedStatus) return;
      statusObserver.disconnect();
      statusEl.textContent = lockedStatus;
      statusObserver.observe(statusEl, { childList: true });
    });
    statusObserver.observe(statusEl, { childList: true });
  }

  function releaseStatus(){
    if (statusObserver) {
      statusObserver.disconnect();
      statusObserver = null;
    }
    lockedStatus = '';
  }

  async function applyScenario(scenario){
    setPatientType(scenario.patientType || 'existing');

    if (apptSelect) {
      apptSelect.value = scenario.apptType || '';
      applySelectedApptType();
    }
    if (officePicker) {
      officePicker.value = scenario.office || '';
      applySelectedOffice();
    }

    const update = { scheduled: !!scenario.scheduled, change: scenario.change || 'none' };
    if (Array.isArray(scenario.reasons) && scenario.reasons.length) {
      update.reasons = scenario.reasons;
      update.reason = scenario.reasons[0];
      if (scenario.otherText) update.otherText = scenario.otherText;
    } else if (scenario.change !== 'none') {
      update.reasons = [];
      update.reason = '';
    }
    window.ScreenpopAPI?.applyAppointment(update);

    if (Array.isArray(scenario.noApptReasons) && scenario.noApptReasons.length) {
      window.ScreenpopAPI?.setNoAppointmentReasons(scenario.noApptReasons);
    } else {
      window.ScreenpopAPI?.clearNoAppointmentReasons();
    }

    const otherInput = qs('#otherReason');
    if (otherInput) {
      const hasOther = Array.isArray(scenario.reasons) && scenario.reasons.includes('Other');
      otherInput.value = hasOther ? (scenario.otherText || '') : '';
    }

    const confirmInput = qs('#confirmCheck');
    if (confirmInput) confirmInput.checked = !!scenario.confirm;

    clearMiniActions();

    return wait(40);
  }

  async function runAllCombos(){
    if (batchState.running) return;

    const doneBtn = qs('#doneBtn');
    if (!doneBtn) {
      updateStatus('Unable to find Done button — batch aborted');
      return;
    }

    const queue = buildScenarioQueue();
    if (!queue.length) {
      updateStatus('No appointment or office options available for batch run');
      return;
    }

    batchState.running = true;
    batchState.abort = false;
    setDemoControlsDisabled(true);
    if (runAllBtn) {
      runAllBtn.textContent = 'Stop Batch';
      runAllBtn.dataset.state = 'running';
    }
    lockStatus();

    updateStatus(`Starting batch of ${queue.length} scenarios...`);
    await handleIncoming(DEFAULT_PHONE);
    await wait(400);
    setManualDefaults();

    let processed = 0;
    for (const scenario of queue) {
      if (batchState.abort) break;
      setManualDefaults();
      await wait(40);
      await applyScenario(scenario);
      await wait(80);
      doneBtn.click();
      processed += 1;
      updateStatus(`Captured ${processed}/${queue.length} · ${scenario.summary}`);
      if (runAllBtn) runAllBtn.textContent = `Stop Batch (${processed}/${queue.length})`;
      await wait(120);
    }

    if (batchState.abort) {
      updateStatus(`Batch stopped after ${processed} scenarios.`);
    } else {
      updateStatus(`Batch complete — ${processed} scenarios captured.`);
    }

    batchState.running = false;
    batchState.abort = false;
    setDemoControlsDisabled(false);
    if (runAllBtn) {
      runAllBtn.textContent = 'Run All Combos';
      delete runAllBtn.dataset.state;
    }
    releaseStatus();
  }
})();
