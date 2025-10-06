// Lightweight SPA glue for 3CX screen-pop usage
// - Reads query params like ?ani=, ?phone=, ?agent=, ?callId=, ?callfor=
// - Passes caller phone to the existing UI via ScreenpopAPI

function getParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

function setSegmentValue(group, value) {
  const buttons = document.querySelectorAll(`.seg[data-group="${group}"]`);
  buttons.forEach(b => b.classList.toggle('active', b.getAttribute('data-value') === value));
}

window.addEventListener('DOMContentLoaded', async () => {
  // Allow either ani= or phone=
  const ani = getParam('ani') || getParam('phone');
  const callfor = getParam('callfor');
  const agent = getParam('agent');
  const callId = getParam('callId');

  // Preselect callfor if provided
  if (callfor === 'proxy' || callfor === 'self') {
    setSegmentValue('callfor', callfor);
    try { window.ScreenpopAPI?.applyAppointment?.({}); } catch {}
  }

  if (ani) {
    try { await window.ScreenpopAPI?.handleIncomingCall(ani); } catch {}
  }

  // Optional: show a small badge in status for debugging integrations
  const statusMsg = document.querySelector('#statusMsg');
  const bits = [];
  if (agent) bits.push(`Agent: ${agent}`);
  if (callId) bits.push(`Call: ${callId}`);
  if (ani) bits.push(`ANI: ${ani}`);
  if (statusMsg && bits.length) {
    const prev = statusMsg.textContent || '';
    statusMsg.textContent = `${prev} — ${bits.join(' · ')}`;
  }
});

