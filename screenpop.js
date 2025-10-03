// UI-only logic for compact screenpop
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

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

  function currentValue(group){
    const active = qs(`.seg[data-group="${group}"].active`);
    return active ? active.getAttribute('data-value') : '';
  }

  function handleVisibility(){
    const change = currentValue('change');
    // Show reason only for cancellation or reschedule
    if(change === 'cancellation' || change === 'reschedule'){
      reasonBlock.classList.remove('hidden');
    } else {
      reasonBlock.classList.add('hidden');
      reasonSelect.value = '';
      otherReasonWrap.classList.add('hidden');
    }
  }

  reasonSelect?.addEventListener('change', () => {
    if(reasonSelect.value === 'Other'){
      otherReasonWrap.classList.remove('hidden');
    } else {
      otherReasonWrap.classList.add('hidden');
    }
  });

  // Mini action buttons (Task/Transfer) toggle pressed state
  qsa('.reasons .mini-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.reason-row');
      qsa('.mini-btn', row).forEach(b => b.classList.remove('pressed'));
      btn.classList.add('pressed');
    });
  });

  // Clear
  clearBtn?.addEventListener('click', () => {
    qsa('input[type="text"], input[type="tel"], input[type="date"]').forEach(i => i.value='');
    qs('#patientType').checked = false;
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
  });

  // Done
  doneBtn?.addEventListener('click', () => {
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
})();
