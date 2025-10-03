// v4 testing driver: session banner + diff log + multi-appointment scenarios + preset editor
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const DEFAULT_PHONE = '+15551234567';
  const NEW_PHONE = '+15559998888';
  let SESSION_ID = null;
  let ACCEPT_BG = true;

  // --- UI helpers ---
  function setPatientType(type){ const g = qs('.pt-type'); if(!g) return; qsa('.seg',g).forEach(b=>b.classList.toggle('active', b.getAttribute('data-ptype')===type)); }
  function getUiState(){
    const sched = qsa('.seg[data-group="scheduled"]').find(b=>b.classList.contains('active'))?.getAttribute('data-value')||'yes';
    const change = qsa('.seg[data-group="change"]').find(b=>b.classList.contains('active'))?.getAttribute('data-value')||'none';
    const reason = qs('#reasonSelect')?.value || '';
    const otherText = qs('#otherReason')?.value || '';
    return { scheduled: sched==='yes', change, reason, otherText };
  }
  function setBanner(){
    const status = qs('#sessionStatus');
    const idEl = qs('#sessionId');
    const bgEl = qs('#bgMode');
    if (SESSION_ID){ status.classList.add('primary'); status.innerHTML = '<i class="fa-solid fa-phone"></i> In-call'; }
    else { status.classList.remove('primary'); status.innerHTML = '<i class="fa-solid fa-phone"></i> Inactive'; }
    idEl.textContent = 'session: ' + (SESSION_ID || '—');
    bgEl.textContent = 'background: ' + (ACCEPT_BG ? 'allowed' : 'blocked');
  }
  function log(line, data){
    const pre = qs('#log'); if(!pre) return;
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ${line}${data? ' ' + JSON.stringify(data): ''}`;
    pre.textContent = msg + '\n' + pre.textContent;
  }

  // Diff wrapper: capture UI before/after ScreenpopAPI.applyAppointment
  const origApply = window.ScreenpopAPI.applyAppointment.bind(window.ScreenpopAPI);
  window.ScreenpopAPI.applyAppointment = function(update){
    const before = getUiState();
    origApply(update);
    requestAnimationFrame(()=>{
      const after = getUiState();
      log('applyAppointment', { update, before, after });
    });
  };

  function sendEvent(evt){
    window.ScreenpopLogic.processCrmEvent(evt);
    log('event', evt);
  }

  async function incoming(phone){
    await window.ScreenpopAPI.handleIncomingCall(phone);
    log('incoming_call', { phone, sessionId: SESSION_ID });
  }

  function clearExtras(){ qsa('.reasons .mini-btn').forEach(b=>b.classList.remove('pressed')); const c=qs('#confirmCheck'); if(c) c.checked=false; }
  function clearFields(){ qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i=>i.value=''); }

  // --- Scenarios (adds multi-appointment cases) ---
  const scenarios = {
    // Existing
    existing_cancel: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'cancel', appointments:[{status:'cancelled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    existing_reschedule: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'reschedule', appointments:[{status:'rescheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    confirm: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'confirm', appointments:[{status:'confirmed'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    ma_call: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    results_call: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    provider_question: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    refill_request: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    billing_question: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    // New
    new_cancel: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'cancel', appointments:[{status:'cancelled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    new_reschedule: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'reschedule', appointments:[{status:'rescheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    new_confirm: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'confirm', appointments:[{status:'confirmed'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    new_ma_call: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    new_results_call: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    new_provider_question: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    new_refill_request: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    new_billing_question: async ()=>{ await incoming(NEW_PHONE); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    // True new
    true_new_blank: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_cancel: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'cancel', appointments:[{status:'cancelled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_reschedule: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'reschedule', appointments:[{status:'rescheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_confirm: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'confirm', appointments:[{status:'confirmed'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_ma_call: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_results_call: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_provider_question: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_refill_request: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    true_new_billing_question: async ()=>{ clearFields(); setPatientType('new'); clearExtras(); sendEvent({type:'none', appointments:[{status:'scheduled'}], occurredAt:Date.now(), sessionId:SESSION_ID}); },
    // Multi-appointment demos
    two_appts_cancel_one: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); ScreenpopLogic.processCrmSnapshot({appointments:[{status:'scheduled'},{status:'cancelled'}], lastChange:{type:'cancel'}, occurredAt:Date.now(), sessionId:SESSION_ID}); log('snapshot', {appointments:[{status:'scheduled'},{status:'cancelled'}]}); },
    two_appts_reschedule_one: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); ScreenpopLogic.processCrmSnapshot({appointments:[{status:'scheduled'},{status:'rescheduled'}], lastChange:{type:'reschedule'}, occurredAt:Date.now(), sessionId:SESSION_ID}); log('snapshot', {appointments:[{status:'scheduled'},{status:'rescheduled'}]}); },
    one_appt_book_second: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); ScreenpopLogic.processCrmSnapshot({appointments:[{status:'scheduled'},{status:'scheduled'}], lastChange:{type:'book'}, occurredAt:Date.now(), sessionId:SESSION_ID}); log('snapshot', {appointments:[{status:'scheduled'},{status:'scheduled'}]}); },
    all_cancelled: async ()=>{ await incoming(DEFAULT_PHONE); clearExtras(); ScreenpopLogic.processCrmSnapshot({appointments:[{status:'cancelled'},{status:'cancelled'}], lastChange:{type:'cancel'}, occurredAt:Date.now(), sessionId:SESSION_ID}); log('snapshot', {appointments:[{status:'cancelled'},{status:'cancelled'}]}); },
  };

  // --- Presets (JSON editor) ---
  const storeKey = 'screenpop_v4_presets';
  function loadStore(){ try { return JSON.parse(localStorage.getItem(storeKey)||'{}'); } catch { return {}; } }
  function saveStore(obj){ localStorage.setItem(storeKey, JSON.stringify(obj)); }
  function refreshPresetList(){ const sel = qs('#savedPresets'); if(!sel) return; const map = loadStore(); sel.innerHTML = ''; Object.keys(map).forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k; sel.appendChild(o); }); }
  function copyLinkFromText(){ const t = qs('#presetText').value || '{}'; const url = new URL(window.location.href); url.searchParams.set('preset', encodeURIComponent(t)); navigator.clipboard.writeText(url.toString()).then(()=>log('copied_link')); }
  function runPresetFromText(){ try{ const t = qs('#presetText').value || '{}'; const evt = JSON.parse(t); evt.occurredAt = Date.now(); if (SESSION_ID) evt.sessionId = SESSION_ID; if (evt.type||evt.appointments||typeof evt.remainingScheduled==='number'){ sendEvent(evt); } else { log('invalid preset',evt); } }catch(e){ log('preset parse error',{error:String(e)});} }

  // --- Session controls ---
  function startSession(){ SESSION_ID = 'sess_' + Math.random().toString(36).slice(2,8); ACCEPT_BG = false; window.ScreenpopLogic.configure({ sessionId: SESSION_ID, acceptBackground: false }); setBanner(); log('session_start',{sessionId:SESSION_ID}); }
  function endSession(){ log('session_end',{sessionId:SESSION_ID}); SESSION_ID=null; ACCEPT_BG=true; window.ScreenpopLogic.configure({ sessionId:null, acceptBackground:true }); setBanner(); }

  function resetAll(){ qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i=>i.value=''); setPatientType('new'); clearExtras(); const groups=qsa('.segmented'); groups.forEach(g=>{ qsa('.seg',g).forEach(b=>b.classList.remove('active')); qsa('.seg',g)[0].classList.add('active'); }); }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    // Start in-call by default (can end to allow background)
    startSession();
    setBanner();

    // Wire controls
    qs('#startSession').addEventListener('click', startSession);
    qs('#endSession').addEventListener('click', endSession);

    const select = qs('#scenario');
    const run = async ()=>{ const key = select.value; if (scenarios[key]) await scenarios[key](); };
    qs('#runScenario').addEventListener('click', run);
    select.addEventListener('change', run);
    qs('#resetScenario').addEventListener('click', resetAll);

    // Preset editor
    refreshPresetList();
    qs('#loadPreset').addEventListener('click', ()=>{ const k=qs('#savedPresets').value; const map=loadStore(); if(map[k]) qs('#presetText').value = JSON.stringify(map[k]); });
    qs('#savePreset').addEventListener('click', ()=>{ const name=prompt('Preset name:'); if(!name) return; try{ const obj=JSON.parse(qs('#presetText').value||'{}'); const map=loadStore(); map[name]=obj; saveStore(map); refreshPresetList(); log('preset_saved',{name}); }catch(e){ log('preset_save_error',{error:String(e)});} });
    qs('#deletePreset').addEventListener('click', ()=>{ const k=qs('#savedPresets').value; if(!k) return; const map=loadStore(); delete map[k]; saveStore(map); refreshPresetList(); log('preset_deleted',{name:k}); });
    qs('#copyLink').addEventListener('click', copyLinkFromText);
    qs('#runPreset').addEventListener('click', runPresetFromText);

    // Load preset from URL if present
    try{ const u=new URL(window.location.href); const p=u.searchParams.get('preset'); if(p){ const json=decodeURIComponent(p); qs('#presetText').value=json; runPresetFromText(); } }catch{}

    // Keyboard shortcuts: R run, S toggle session, digits change scenario
    document.addEventListener('keydown',(e)=>{
      if(e.target.matches('input,textarea')) return;
      if(e.key.toLowerCase()==='r'){ e.preventDefault(); run(); }
      if(e.key.toLowerCase()==='s'){ e.preventDefault(); if(SESSION_ID) endSession(); else startSession(); }
    });

    // Auto-run first scenario
    run();
  });
})();
