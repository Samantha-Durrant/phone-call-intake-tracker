// Simple analytics collector that wires into the Screenpop iframe without modifying the UI

const STORAGE_KEY = 'screenpop_analytics_v1';
const MRN_INDEX_KEY = 'screenpop_mrn_index_v1';

function loadEntries(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveEntries(entries){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

function loadMrnIndex(){
  try { return JSON.parse(localStorage.getItem(MRN_INDEX_KEY) || '{}'); } catch { return {}; }
}
function saveMrnIndex(idx){
  try { localStorage.setItem(MRN_INDEX_KEY, JSON.stringify(idx)); } catch {}
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
    td.colSpan = 11;
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
    tr.appendChild(td(e.patient?.mrn || ''));
    tr.appendChild(td(e.patient?.name || ''));
    tr.appendChild(td(e.patient?.type || ''));
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
  const cols = ['time','agent','callId','ani','patient.mrn','patient.name','patient.type','appointment.scheduled','appointment.change','appointment.reason','appointment.otherText','appointment.type','appointment.confirmed','actions'];
  const header = cols.join(',');
  const lines = [header];
  for (const e of entries){
    const actions = e.actions ? Object.entries(e.actions).map(([k,v])=>{
      const parts=[]; if (v.task) parts.push('task'); if (v.transfer) parts.push('transfer');
      return parts.length ? `${k}:${parts.join('+')}` : null;
    }).filter(Boolean).join('; ') : '';
    const row = [
      fmtDate(e.time),
      e.agent||'',
      e.callId||'',
      e.ani||'',
      e.patient?.mrn||'',
      e.patient?.name||'',
      e.patient?.type||'',
      (e.appointment?.scheduled ? 'Yes' : 'No'),
      e.appointment?.change||'',
      e.appointment?.reason||'',
      e.appointment?.otherText||'',
      e.appointment?.type||'',
      e.appointment?.confirmed ? 'Yes' : 'No',
      actions
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

// --- KPIs and Charts ---
function summarize(entries){
  const sum = {
    total: entries.length,
    cancel: 0,
    resched: 0,
    new: 0,
    existing: 0,
    tasks: 0,
    transfers: 0,
    hours: {}, // hour string -> count
    cancelReasons: {},
    reschedReasons: {},
    actionsByType: {} // key -> { task, transfer }
  };
  const inRange = (h) => h>=8 && h<=17;
  entries.forEach(e => {
    const d = new Date(e.time);
    const h = d.getHours();
    if (inRange(h)) sum.hours[h] = (sum.hours[h]||0)+1;
    const ptype = (e.patient?.type||'').toLowerCase();
    if (ptype === 'new') sum.new++; else if (ptype === 'existing') sum.existing++;
    const ch = (e.appointment?.change||'').toLowerCase();
    if (ch === 'cancellation') { sum.cancel++; const r=(e.appointment?.reason||''); if (r) sum.cancelReasons[r]=(sum.cancelReasons[r]||0)+1; }
    if (ch === 'reschedule') { sum.resched++; const r=(e.appointment?.reason||''); if (r) sum.reschedReasons[r]=(sum.reschedReasons[r]||0)+1; }
    const actions = e.actions || {};
    Object.entries(actions).forEach(([k,v])=>{
      if (!sum.actionsByType[k]) sum.actionsByType[k] = { task:0, transfer:0 };
      if (v.task) { sum.actionsByType[k].task++; sum.tasks++; }
      if (v.transfer) { sum.actionsByType[k].transfer++; sum.transfers++; }
    });
  });
  return sum;
}

function drawBarChart(canvasId, dataMap, { labelMap={}, color='#4f46e5', maxBars=12 }={}){
  const el = document.getElementById(canvasId);
  if (!el) return;
  const ctx = el.getContext('2d');
  const width = el.width = el.clientWidth; const height = el.height;
  ctx.clearRect(0,0,width,height);
  const entries = Object.entries(dataMap);
  if (!entries.length) { ctx.fillStyle = '#9ca3af'; ctx.fillText('No data', 8, 20); return; }
  entries.sort((a,b)=> String(a[0]).localeCompare(String(b[0])));
  const labels = entries.map(([k]) => labelMap[k] || k);
  const values = entries.map(([,v]) => v);
  const max = Math.max(1, ...values);
  const pad = 24; const gap = 8; const barW = Math.max(8, (width - pad*2 - gap*(values.length-1)) / values.length);
  ctx.font = '12px system-ui';
  values.forEach((v,i)=>{
    const x = pad + i*(barW+gap);
    const h = Math.round((v/max) * (height-40));
    const y = height - 20 - h;
    ctx.fillStyle = color; ctx.fillRect(x,y,barW,h);
    ctx.fillStyle = '#374151'; ctx.fillText(labels[i], x, height-6);
    ctx.fillStyle = '#111827'; ctx.fillText(String(v), x, y-4);
  });
}

function drawStackedTwo(canvasId, dataMap, { labels=['Tasks','Transfers'], colors=['#10b981','#f59e0b'] }={}){
  const el = document.getElementById(canvasId);
  if (!el) return;
  const ctx = el.getContext('2d');
  const width = el.width = el.clientWidth; const height = el.height;
  ctx.clearRect(0,0,width,height);
  const keys = Object.keys(dataMap);
  if (!keys.length) { ctx.fillStyle = '#9ca3af'; ctx.fillText('No data', 8, 20); return; }
  const pad = 24; const gap = 10; const barW = Math.max(12, (width - pad*2 - gap*(keys.length-1)) / keys.length);
  ctx.font = '12px system-ui';
  keys.forEach((k,i)=>{
    const v = dataMap[k];
    const total = Math.max(1, (v.task||0)+(v.transfer||0));
    const x = pad + i*(barW+gap);
    const hTask = Math.round(((v.task||0)/total) * (height-40));
    const hTrans = Math.round(((v.transfer||0)/total) * (height-40));
    let y = height - 20;
    ctx.fillStyle = colors[0]; y -= hTask; ctx.fillRect(x, y, barW, hTask);
    ctx.fillStyle = colors[1]; y -= hTrans; ctx.fillRect(x, y, barW, hTrans);
    ctx.fillStyle = '#374151'; ctx.fillText(k.replace(/_/g,' '), x, height-6);
    ctx.fillStyle = '#111827'; ctx.fillText(`${v.task||0}/${v.transfer||0}`, x, y-4);
  });
}

function updateKpisAndCharts(){
  const entries = loadEntries();
  const sum = summarize(entries);
  document.getElementById('kpiTotal').textContent = String(sum.total);
  document.getElementById('kpiCancel').textContent = String(sum.cancel);
  document.getElementById('kpiResched').textContent = String(sum.resched);
  document.getElementById('kpiNew').textContent = String(sum.new);
  document.getElementById('kpiExisting').textContent = String(sum.existing);
  document.getElementById('kpiActions').textContent = `${sum.tasks} / ${sum.transfers}`;

  // Hours 8..17
  const hoursMap = {}; for (let h=8; h<=17; h++) hoursMap[h] = sum.hours[h]||0;
  const hourLabels = {}; for (let h=8; h<=17; h++) hourLabels[h] = `${h%12||12}`;
  drawBarChart('chartHours', hoursMap, { labelMap: hourLabels, color:'#4f46e5' });
  drawBarChart('chartNewExisting', { New: sum.new, Existing: sum.existing }, { color:'#10b981' });
  drawBarChart('chartCancelReasons', sum.cancelReasons, { color:'#ef4444' });
  drawBarChart('chartReschedReasons', sum.reschedReasons, { color:'#6366f1' });
  drawStackedTwo('chartActions', sum.actionsByType);
}

// Listen for submissions via BroadcastChannel (preferred)
try {
  const ch = new BroadcastChannel('screenpop-analytics');
  ch.addEventListener('message', (e) => {
    const msg = e.data || {};
    if (msg && msg.type === 'submit' && msg.entry) {
      const entries = loadEntries();
      entries.unshift(msg.entry);
      saveEntries(entries);
      // update MRN index
      const idx = loadMrnIndex();
      const mrn = msg.entry?.patient?.mrn; if (mrn) idx[mrn] = { time: msg.entry.time, name: msg.entry?.patient?.name||'' };
      saveMrnIndex(idx);
      renderTable();
      updateKpisAndCharts();
    }
  });
} catch {}

// Also listen via storage events for cross-tab updates
window.addEventListener('storage', (e) => {
  if (!e.key) return;
  if (e.key.startsWith('screenpop_submit')){
    try {
      const entry = JSON.parse(e.newValue || 'null');
      if (entry && typeof entry === 'object'){
        const entries = loadEntries();
        entries.unshift(entry);
        saveEntries(entries);
        const idx = loadMrnIndex();
        const mrn = entry?.patient?.mrn; if (mrn) idx[mrn] = { time: entry.time, name: entry?.patient?.name||'' };
        saveMrnIndex(idx);
        renderTable();
        updateKpisAndCharts();
      }
    } catch {}
  }
});

document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('clearBtn').addEventListener('click', () => { saveEntries([]); renderTable(); });

renderTable();
updateKpisAndCharts();
// Periodic refresh as a safety-net
setInterval(()=>{ renderTable(); updateKpisAndCharts(); }, 2000);

// MRN search
document.getElementById('mrnSearch').addEventListener('input', (e) => {
  const q = (e.target.value||'').trim().toLowerCase();
  const rows = document.querySelectorAll('#analyticsBody tr');
  rows.forEach(r => {
    if (r.classList.contains('empty')) return;
    const cells = r.querySelectorAll('td');
    const mrn = (cells[4]?.textContent||'').toLowerCase();
    r.style.display = q ? (mrn.includes(q) ? '' : 'none') : '';
  });
});
