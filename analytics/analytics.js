// Simple analytics collector that wires into the Screenpop iframe without modifying the UI

const STORAGE_KEY = 'screenpop_analytics_v1';

function loadEntries(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveEntries(entries){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleString();
}

function updateCountBadge(){
  const badge = document.getElementById('countBadge');
  const entries = loadEntries();
  badge.textContent = `${entries.length} submission${entries.length===1?'':'s'}`;
}

function renderTable(){
  const tbody = document.getElementById('analyticsBody');
  const entries = loadEntries();
  tbody.innerHTML = '';
  if (!entries.length){
    const tr = document.createElement('tr');
    tr.className = 'empty';
    const td = document.createElement('td');
    td.colSpan = 9;
    td.textContent = 'No submissions yet';
    tr.appendChild(td);
    tbody.appendChild(tr);
    updateCountBadge();
    return;
  }
  for (const e of entries){
    const tr = document.createElement('tr');
    const td = (t) => { const el = document.createElement('td'); el.textContent = t ?? ''; return el; };
    tr.appendChild(td(fmtDate(e.time)));
    tr.appendChild(td(e.agent || ''));
    tr.appendChild(td(e.callId || ''));
    tr.appendChild(td(e.ani || ''));
    tr.appendChild(td(e.patient?.name || ''));
    tr.appendChild(td(e.appointment?.scheduled ? 'Yes' : 'No'));
    tr.appendChild(td(e.appointment?.change || ''));
    tr.appendChild(td(e.appointment?.reason || ''));
    tr.appendChild(td(e.appointment?.otherText || ''));
    tbody.appendChild(tr);
  }
  updateCountBadge();
}

function exportCsv(){
  const entries = loadEntries();
  const cols = ['time','agent','callId','ani','patient.name','appointment.scheduled','appointment.change','appointment.reason','appointment.otherText'];
  const header = cols.join(',');
  const lines = [header];
  for (const e of entries){
    const row = [
      fmtDate(e.time),
      e.agent||'',
      e.callId||'',
      e.ani||'',
      e.patient?.name||'',
      (e.appointment?.scheduled ? 'Yes' : 'No'),
      e.appointment?.change||'',
      e.appointment?.reason||'',
      e.appointment?.otherText||''
    ].map(v => String(v).replaceAll('"','""'))
     .map(v => /[",
]/.test(v) ? `"${v}"` : v)
     .join(',');
    lines.push(row);
  }
  const blob = new Blob([lines.join('\n')], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'screenpop-analytics.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function wireIframe(){
  const frame = document.getElementById('screenpopFrame');
  await new Promise(resolve => {
    if (frame.contentWindow?.document?.readyState === 'complete') return resolve();
    frame.addEventListener('load', () => resolve(), { once:true });
  });
  const w = frame.contentWindow;
  // Poll until ScreenpopAPI is available
  const api = await new Promise(resolve => {
    const t = setInterval(() => {
      if (w && w.ScreenpopAPI && typeof w.ScreenpopAPI.configure === 'function'){
        clearInterval(t); resolve(w.ScreenpopAPI);
      }
    }, 50);
  });

  // Read initial query params from the iframe URL for call context (if any)
  let ani = ''; let agent=''; let callId='';
  try {
    const u = new URL(frame.src, window.location.origin);
    ani = u.searchParams.get('ani') || u.searchParams.get('phone') || '';
    agent = u.searchParams.get('agent') || '';
    callId = u.searchParams.get('callId') || '';
  } catch {}

  api.configure({
    onReasonSubmit: (payload) => {
      const entry = {
        time: Date.now(),
        ani,
        agent,
        callId,
        ...payload
      };
      const entries = loadEntries();
      entries.unshift(entry);
      saveEntries(entries);
      renderTable();
    }
  });
}

document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('clearBtn').addEventListener('click', () => { saveEntries([]); renderTable(); });

renderTable();
wireIframe();

