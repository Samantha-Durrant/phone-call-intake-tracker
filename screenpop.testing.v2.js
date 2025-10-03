// v2 tester: Only track in-call appointment changes per rules
// Rules:
// - IF no change in CRM appointment -> NO scheduled
// - IF yes change in CRM appointment -> YES scheduled
// - IF yes change, but NO scheduled -> NO scheduled, cancelled
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const DEFAULT_PHONE = '+15551234567';
  const NEW_PHONE = '+15559998888';

  let inCall = false;
  let changeHappened = false;
  let derivedScheduled = false; // what we will reflect per rules during call
  let lastChange = 'none'; // 'none' | 'cancellation' | 'reschedule'

  function setPatientType(type){ const g = qs('.pt-type'); if(!g) return; qsa('.seg',g).forEach(b=>b.classList.toggle('active', b.getAttribute('data-ptype')===type)); }
  function setBadge(){ const b = qs('#callBadge'); if(!b) return; b.classList.toggle('active', inCall); b.innerHTML = `<i class="fa-solid fa-phone"></i> In‑Call: ${inCall?'Yes':'No'}`; }
  function resetReason(){ const sel=qs('#reasonSelect'); if(sel) sel.value=''; const wrap=qs('#otherReasonWrap'); if(wrap) wrap.classList.add('hidden'); }
  function clearExtras(){ qsa('.reasons .mini-btn').forEach(b=>b.classList.remove('pressed')); const c=qs('#confirmCheck'); if(c) c.checked=false; resetReason(); }

  function applyUI(){
    // Apply current derived state to the screenpop UI, never auto-filling reasons
    const change = lastChange;
    const scheduled = derivedScheduled;
    window.ScreenpopAPI.applyAppointment({ scheduled, change });
    // Force reason to remain blank if change requires one
    resetReason();
  }

  async function incoming(phone){ await window.ScreenpopAPI.handleIncomingCall(phone); }

  // Map scenario name to an in-call CRM change (if any)
  async function runScenario(key){
    if (!inCall) { pulse('Start Call to track changes'); return; }
    switch(key){
      case 'existing_cancel':
      case 'new_cancel':
      case 'true_new_cancel':
        changeHappened = true; derivedScheduled = false; lastChange = 'cancellation'; break;
      case 'existing_reschedule':
      case 'new_reschedule':
      case 'true_new_reschedule':
        changeHappened = true; derivedScheduled = true; lastChange = 'reschedule'; break;
      case 'confirm':
      case 'new_confirm':
      case 'true_new_confirm':
        changeHappened = true; derivedScheduled = true; lastChange = 'none'; break;
      case 'ma_call':
      case 'results_call':
      case 'provider_question':
      case 'refill_request':
      case 'billing_question':
      case 'new_ma_call':
      case 'new_results_call':
      case 'new_provider_question':
      case 'new_refill_request':
      case 'new_billing_question':
      case 'true_new_blank':
        // Not an appointment change; force defaults: NO scheduled, NO change
        changeHappened = false;
        derivedScheduled = false;
        lastChange = 'none';
        break;
    }
    // Apply to UI per rules
    applyUI();
  }

  function pulse(text){ const s=qs('#statusMsg'); if(!s) return; s.textContent=text; s.style.transition='none'; s.style.opacity='0.3'; requestAnimationFrame(()=>{ s.style.transition='opacity .25s ease'; s.style.opacity='1'; setTimeout(()=>s.textContent='v2 — only in‑call changes affect Scheduled', 1200); }); }

  function startCall(){ inCall = true; changeHappened = false; derivedScheduled = false; lastChange='none'; setBadge(); // reflect baseline: not scheduled until a change occurs
    // Also clear reason and extras
    clearExtras(); window.ScreenpopAPI.applyAppointment({ scheduled:false, change:'none' }); }
  function endCall(){ inCall = false; setBadge(); // Final reflection per rules
    if (!changeHappened){ derivedScheduled = false; lastChange = 'none'; }
    // If a change happened and derivedScheduled=false, keep lastChange='cancellation'
    applyUI(); }

  function resetAll(){ qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i=>i.value=''); setPatientType('new'); clearExtras(); window.ScreenpopAPI.applyAppointment({ scheduled:true, change:'none' }); }

  document.addEventListener('DOMContentLoaded', () => {
    setBadge();
    qs('#startCall').addEventListener('click', startCall);
    qs('#endCall').addEventListener('click', endCall);
    const select = qs('#scenario');
    const runBtn = qs('#runScenario');
    const resetBtn = qs('#resetScenario');
    runBtn.addEventListener('click', async ()=>{
      // Auto-populate for existing vs new basic flows
      const key = select.value;
      if (key.startsWith('new_')) { await incoming(NEW_PHONE); setPatientType('new'); }
      else if (key.startsWith('true_new')) { setPatientType('new'); }
      else { await incoming(DEFAULT_PHONE); setPatientType('existing'); }
      await runScenario(key);
    });
    select.addEventListener('change', ()=>runBtn.click());
    resetBtn.addEventListener('click', resetAll);
  });
})();
