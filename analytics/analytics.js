// Simple analytics collector that wires into the Screenpop iframe without modifying the UI

const STORAGE_KEY = 'screenpop_analytics_v1'; // legacy / fallback (not used for view)
const MRN_INDEX_KEY = 'screenpop_mrn_index_v1';
const SEEN_KEY = 'screenpop_seen_ids_v1';
const SUBMIT_PREFIX = 'screenpop_submit_';
const LEDGER_KEY = 'screenpop_ledger_v1';
let CURRENT_VIEW = 'daily';
let SELECTED_MONTH = null; // 'YYYY-MM'

function loadEntries(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveEntries(entries){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}
function loadSeen(){ try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } }
function saveSeen(seen){ try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen))); } catch {} }

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

function loadLedger(){ try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]'); } catch { return []; } }
function saveLedger(list){ try { localStorage.setItem(LEDGER_KEY, JSON.stringify(list)); } catch {} }
function isSameDay(a,b){ const da=new Date(a), db=new Date(b); return da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth() && da.getDate()===db.getDate(); }
function monthKey(ts){ const d=new Date(ts); const m=String(d.getMonth()+1).padStart(2,'0'); return `${d.getFullYear()}-${m}`; }
function parseYearMonth(ym){ try { const [y,m]=String(ym||'').split('-').map(n=>parseInt(n,10)); return { y: isFinite(y)?y:new Date().getFullYear(), m: isFinite(m)?m: (new Date().getMonth()+1) }; } catch { const d=new Date(); return { y:d.getFullYear(), m:d.getMonth()+1}; } }
function daysInMonth(y,m){ return new Date(y, m, 0).getDate(); }
function weekdayOccurrencesInMonth(y,m){ const map={0:0,1:0,2:0,3:0,4:0,5:0,6:0}; const total=daysInMonth(y,m); for(let d=1; d<=total; d++){ const wd=new Date(y, m-1, d).getDay(); map[wd]++; } return map; }
function getActiveEntries(){
  const all = loadLedger();
  if (CURRENT_VIEW === 'daily') return all.filter(e => isSameDay(e.time, Date.now()));
  const mk = SELECTED_MONTH || monthKey(Date.now());
  return all.filter(e => monthKey(e.time) === mk);
}

function updateCountBadge(){
  const badge = document.getElementById('countBadge');
  const entries = getActiveEntries();
  badge.textContent = `${entries.length} submission${entries.length===1?'':'s'}`;
}

function renderTable(){
  const tbody = document.getElementById('analyticsBody');
  const entries = getActiveEntries();
  tbody.innerHTML = '';
  if (!entries.length){
    const tr = document.createElement('tr');
    tr.className = 'empty';
    const td = document.createElement('td');
    td.colSpan = 10;
    td.textContent = 'No submissions yet';
    tr.appendChild(td);
    tbody.appendChild(tr);
    updateCountBadge();
    return;
  }
  const prettify = (key) => {
    const map = { ma_call:'MA Call', provider_question:'Provider Question', refill_request:'Refill Request', billing_question:'Billing Question', confirmation:'Confirmation', results:'Results' };
    return map[key] || String(key||'').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  const summarizeActions = (actions, kind) => {
    if (!actions) return '';
    const parts = Object.entries(actions)
      .filter(([_,v]) => !!(v && v[kind]))
      .map(([k]) => prettify(k));
    return parts.join('; ');
  };
  for (const e of entries){
    const tr = document.createElement('tr');
    const td = (t) => { const el = document.createElement('td'); el.textContent = t ?? ''; return el; };
    tr.appendChild(td(fmtDate(e.time)));
    tr.appendChild(td(e.patient?.mrn || ''));
    tr.appendChild(td(e.patient?.type || ''));
    tr.appendChild(td(e.appointment?.scheduled ? 'Yes' : 'No'));
    tr.appendChild(td(e.appointment?.change || ''));
    tr.appendChild(td(e.appointment?.type || ''));
    tr.appendChild(td(e.appointment?.reason || ''));
    tr.appendChild(td(e.appointment?.otherText || ''));
    tr.appendChild(td(summarizeActions(e.actions, 'task')));
    tr.appendChild(td(summarizeActions(e.actions, 'transfer')));
    tbody.appendChild(tr);
  }
  updateCountBadge();
  applyMrnFilter();
}

function applyMrnFilter(){
  const input = document.getElementById('mrnSearch');
  if (!input) return;
  const q = (input.value || '').trim().toLowerCase();
  const rows = document.querySelectorAll('#analyticsBody tr');
  rows.forEach(r => {
    if (r.classList.contains('empty')) return;
    const cells = r.querySelectorAll('td');
    const mrn = (cells[1]?.textContent || '').toLowerCase();
    r.style.display = q ? (mrn.includes(q) ? '' : 'none') : '';
  });
}

function exportCsv(){
  const entries = getActiveEntries();
  const cols = ['time','agent','callId','ani','patient.mrn','patient.name','patient.type','appointment.scheduled','appointment.change','appointment.reason','appointment.otherText','appointment.type','appointment.confirmed','actions'];
  const header = cols.join(',');
  const lines = [header];
  for (const e of entries){
    const actions = e.actions ? Object.entries(e.actions)
      .map(([k,v])=>{ const parts=[]; if (v.task) parts.push('task'); if (v.transfer) parts.push('transfer'); return parts.length ? `${k}:${parts.join('+')}` : null; })
      .filter(Boolean).join('; ') : '';
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
    ]
    .map(v => String(v).replaceAll('"','""'))
    .map(v => /[",\n]/.test(v) ? `"${v}"` : v)
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
    actionsByType: {}, // key -> { task, transfer }
    apptTypes: {}
  };
  const inRange = (h) => h>=8 && h<=17;
  const normReason = (r) => String(r||'').trim().replace(/[\/]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
  entries.forEach(e => {
    const d = new Date(e.time);
    const h = d.getHours();
    if (inRange(h)) sum.hours[h] = (sum.hours[h]||0)+1;
    const ptype = (e.patient?.type||'').toLowerCase();
    if (ptype === 'new') sum.new++; else if (ptype === 'existing') sum.existing++;
    const apptType = String(e.appointment?.type||'').trim();
    if (apptType) sum.apptTypes[apptType] = (sum.apptTypes[apptType] || 0) + 1;
    const ch = (e.appointment?.change||'').toLowerCase();
    if (ch === 'cancellation') { sum.cancel++; const r=normReason(e.appointment?.reason); if (r) sum.cancelReasons[r]=(sum.cancelReasons[r]||0)+1; }
    if (ch === 'reschedule') { sum.resched++; const r=normReason(e.appointment?.reason); if (r) sum.reschedReasons[r]=(sum.reschedReasons[r]||0)+1; }
    const actions = e.actions || {};
    Object.entries(actions).forEach(([k,v])=>{
      if (!sum.actionsByType[k]) sum.actionsByType[k] = { task:0, transfer:0 };
      if (v.task) { sum.actionsByType[k].task++; sum.tasks++; }
      if (v.transfer) { sum.actionsByType[k].transfer++; sum.transfers++; }
    });
  });
  return sum;
}

function drawBarChart(canvasId, dataMap, { labelMap={}, color='#4f46e5', palette=null, order=null, maxValue=null, formatValue=null }={}){
  const el = document.getElementById(canvasId);
  if (!el) return;
  const ctx = el.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = el.getBoundingClientRect();
  const cssW = Math.max(10, el.clientWidth || rect.width || (el.parentElement?.clientWidth||0));
  const cssH = Math.max(10, el.clientHeight || rect.height);
  el.width = Math.round(cssW * dpr);
  el.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = cssW; const height = cssH;
  ctx.clearRect(0,0,width,height);
  let entries = Object.entries(dataMap);
  if (!entries.length) { ctx.fillStyle = '#9ca3af'; ctx.fillText('No data', 8, 20); return; }
  if (Array.isArray(order) && order.length){
    entries = order.map(k => [k, dataMap[k] || 0]);
  } else {
    entries.sort((a,b)=> String(a[0]).localeCompare(String(b[0])));
  }
  const labels = entries.map(([k]) => labelMap[k] || k);
  const values = entries.map(([,v]) => Number(v)||0);
  const max = (typeof maxValue === 'number') ? (maxValue||1) : Math.max(1, ...values);
  const pad = 24; const gap = 8; const barW = Math.max(8, (width - pad*2 - gap*(values.length-1)) / values.length);
  ctx.font = '12px system-ui';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Wrap labels to avoid overlap
  const wrapLabel = (text, maxWidth) => {
    const tokens = String(text).replace(/_/g,' ').split(/[\s/]+/);
    const lines = [];
    let line = '';
    tokens.forEach(tok => {
      const test = line ? line + ' ' + tok : tok;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = tok;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [String(text)];
  };
  const wrapped = labels.map(l => wrapLabel(l, barW));
  const maxLines = Math.max(1, ...wrapped.map(w => w.length));
  const labelArea = (maxLines * 14 + 12);

  values.forEach((v,i)=>{
    const x = pad + i*(barW+gap);
    const cx = x + Math.max(1, barW/2);
    const chartTop = 6; // small top padding
    const chartBottom = height - labelArea - 4; // leave space for labels under bars
    const avail = Math.max(12, chartBottom - chartTop);
    const h = Math.round((v/max) * (avail-20));
    const y = chartBottom - h;
    const c = Array.isArray(palette) && palette.length ? palette[i % palette.length] : color;
    ctx.fillStyle = c; ctx.fillRect(x,y,barW,h);
    // value above bar, centered
    ctx.textAlign = 'center';
    const label = formatValue ? formatValue(v) : String(v);
    ctx.fillStyle = '#111827'; ctx.fillText(label, cx, Math.max(chartTop+10, y-4));
    // label under bar (no rotation)
    ctx.fillStyle = '#374151';
    const lines = wrapped[i];
    lines.forEach((ln, li) => {
      const ly = chartBottom + 14*(li+1);
      ctx.fillText(ln, cx, ly);
    });
    ctx.textAlign = 'left';
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
  const wrap = (text) => {
    const words = String(text).replace(/_/g,' ').split(/\s+/);
    const lines=[]; let line='';
    words.forEach(w=>{ const t=line?line+' '+w:w; if(ctx.measureText(t).width<=barW){ line=t; } else { if(line) lines.push(line); line=w; }});
    if(line) lines.push(line); return lines;
  };
  const wrapped = keys.map(k => wrap(k));
  const maxLines = Math.max(1, ...wrapped.map(w=>w.length));
  const labelArea = maxLines*14 + 8;
  keys.forEach((k,i)=>{
    const v = dataMap[k];
    const total = Math.max(1, (v.task||0)+(v.transfer||0));
    const x = pad + i*(barW+gap);
    const chartTop = 6; const chartBottom = height - labelArea - 4; const avail = Math.max(12, chartBottom - chartTop);
    const hTask = Math.round(((v.task||0)/total) * (avail-20));
    const hTrans = Math.round(((v.transfer||0)/total) * (avail-20));
    let y = chartBottom;
    ctx.fillStyle = colors[0]; y -= hTask; ctx.fillRect(x, y, barW, hTask);
    ctx.fillStyle = colors[1]; y -= hTrans; ctx.fillRect(x, y, barW, hTrans);
    // value above stack
    ctx.fillStyle = '#111827'; ctx.fillText(`${v.task||0}/${v.transfer||0}`, x, Math.max(chartTop+10, y-4));
    // wrapped label under bar
    ctx.fillStyle = '#374151';
    const lines = wrapped[i];
    lines.forEach((ln, li) => { const ly = chartBottom + 14*(li+1); ctx.fillText(ln, x, ly); });
  });
}

function updateKpisAndCharts(){
  const entries = getActiveEntries();
  const sum = summarize(entries);
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('debug') === '1') {
      console.log('[Analytics] view:', CURRENT_VIEW, 'entries:', entries.length, { reschedReasons: sum.reschedReasons, cancelReasons: sum.cancelReasons, actionsByType: sum.actionsByType });
    }
  } catch {}
  document.getElementById('kpiTotal').textContent = String(sum.total);
  document.getElementById('kpiCancel').textContent = String(sum.cancel);
  document.getElementById('kpiResched').textContent = String(sum.resched);
  document.getElementById('kpiNew').textContent = String(sum.new);
  document.getElementById('kpiExisting').textContent = String(sum.existing);
  document.getElementById('kpiActions').textContent = `${sum.tasks} / ${sum.transfers}`;

  // Hours 8..17 (counts for Daily; averages for Monthly)
  const hoursMap = {}; for (let h=8; h<=17; h++) hoursMap[String(h)] = sum.hours[h]||0;
  const hoursOrder = Array.from({length:10}, (_,i)=> String(8+i));
  const hourLabels = {};
  for (let h=8; h<=17; h++){
    const hour12 = (h % 12) || 12;
    const ampm = h < 12 ? 'am' : 'pm';
    hourLabels[String(h)] = `${hour12}:00 ${ampm}`;
  }
  if (CURRENT_VIEW === 'monthly'){
    const {y,m} = parseYearMonth(SELECTED_MONTH || monthKey(Date.now()));
    const denom = daysInMonth(y,m) || 1;
    const avgHours = Object.fromEntries(Object.entries(hoursMap).map(([k,v]) => [k, (Number(v)||0)/denom]));
    drawBarChart('chartHours', avgHours, { order: hoursOrder, labelMap: hourLabels, color:'#4f46e5', formatValue: (v)=> (v>=10?Math.round(v):v.toFixed(1)) });
  } else {
    drawBarChart('chartHours', hoursMap, { order: hoursOrder, labelMap: hourLabels, color:'#4f46e5' });
  }
  // Weekday counts (Mon-Fri) — shown only on Monthly tab
  try {
    const weekdayPanel = document.getElementById('panelWeekdays');
    if (weekdayPanel) weekdayPanel.style.display = (CURRENT_VIEW === 'monthly') ? '' : 'none';
    if (CURRENT_VIEW === 'monthly'){
      const wdCounts = { Mon:0, Tue:0, Wed:0, Thu:0, Fri:0 };
      entries.forEach(e => { const d=new Date(e.time).getDay(); if (d>=1 && d<=5){ const key=['','Mon','Tue','Wed','Thu','Fri'][d]; wdCounts[key] = (wdCounts[key]||0)+1; } });
      const {y,m} = parseYearMonth(SELECTED_MONTH || monthKey(Date.now()));
      const occ = weekdayOccurrencesInMonth(y,m); // 0..6
      const denomMap = { Mon: occ[1]||1, Tue: occ[2]||1, Wed: occ[3]||1, Thu: occ[4]||1, Fri: occ[5]||1 };
      const wdAvg = Object.fromEntries(Object.entries(wdCounts).map(([k,v]) => [k, (Number(v)||0)/denomMap[k]]));
      const wdOrder = ['Mon','Tue','Wed','Thu','Fri'];
      const wdLabels = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday' };
      const wdPalette = ['#2563eb','#0ea5e9','#10b981','#f59e0b','#ef4444'];
      drawBarChart('chartWeekdays', wdAvg, { order: wdOrder, labelMap: wdLabels, palette: wdPalette, formatValue: (v)=> (v>=10?Math.round(v):v.toFixed(1)) });
    }
  } catch {}
  // Use distinct colors for New vs Existing
  drawBarChart('chartNewExisting', { New: sum.new, Existing: sum.existing }, { palette:['#10b981','#3b82f6'] });
  const cancelPalette = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'];
  const reschedPalette = ['#1d4ed8','#0ea5e9','#14b8a6','#10b981','#84cc16','#eab308','#f59e0b','#f97316','#ef4444','#a855f7'];
  const prettyReason = (key) => {
    const map = {
      'illness family emergency':'Illness/Family Emergency',
      'work school conflict':'Work/School Conflict',
      'no longer needed':'No longer needed',
      'insurance':'Insurance',
      'referral':'Referral',
      'pooo r s':'POOO r/s'
    };
    if (map[key]) return map[key];
    return String(key||'').replace(/\b\w/g, c => c.toUpperCase());
  };
  const buildReasonLabelMap = (obj) => Object.fromEntries(Object.keys(obj).map(k => [k, prettyReason(k)]));
  // For Monthly view, show percentages of total calls; Daily stays as counts
  const totalCalls = entries.length || 1;
  const toPercentMap = (m) => Object.fromEntries(Object.entries(m).map(([k,v]) => [k, (v/totalCalls)*100]));
  const apptEntries = Object.entries(sum.apptTypes || {}).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
  const topApptEntries = apptEntries.slice(0,12);
  const apptOrder = topApptEntries.map(([k])=>k);
  const apptMap = Object.fromEntries(topApptEntries);
  const apptPalette = ['#4f46e5','#6366f1','#8b5cf6','#a855f7','#ec4899','#f472b6','#facc15','#f97316','#ef4444','#14b8a6','#0ea5e9','#10b981'];
  if (CURRENT_VIEW === 'monthly') {
    drawBarChart('chartApptTypes', toPercentMap(apptMap), { palette: apptPalette, order: apptOrder, maxValue:100, formatValue:(v)=>`${Math.round(v)}%` });
  } else {
    drawBarChart('chartApptTypes', apptMap, { palette: apptPalette, order: apptOrder });
  }
  if (CURRENT_VIEW === 'monthly') {
    drawBarChart('chartCancelReasons', toPercentMap(sum.cancelReasons), {
      palette: cancelPalette,
      labelMap: buildReasonLabelMap(sum.cancelReasons),
      maxValue: 100,
      formatValue: (v) => `${Math.round(v)}%`
    });
    drawBarChart('chartReschedReasons', toPercentMap(sum.reschedReasons), {
      palette: reschedPalette,
      labelMap: buildReasonLabelMap(sum.reschedReasons),
      maxValue: 100,
      formatValue: (v) => `${Math.round(v)}%`
    });
  } else {
    drawBarChart('chartCancelReasons', sum.cancelReasons, { palette: cancelPalette, labelMap: buildReasonLabelMap(sum.cancelReasons) });
    drawBarChart('chartReschedReasons', sum.reschedReasons, { palette: reschedPalette, labelMap: buildReasonLabelMap(sum.reschedReasons) });
  }

  // Split tasks / transfers by type with distinct colors and proper labels
  const tasksByType = {}; const transfersByType = {};
  Object.entries(sum.actionsByType).forEach(([k,v])=>{
    if (v.task) tasksByType[k] = (tasksByType[k]||0) + v.task;
    if (v.transfer) transfersByType[k] = (transfersByType[k]||0) + v.transfer;
  });

  const prettify = (key) => {
    const map = {
      ma_call: 'MA Call',
      provider_question: 'Provider Question',
      refill_request: 'Refill Request',
      billing_question: 'Billing Question',
      confirmation: 'Confirmation',
      results: 'Results'
    };
    if (map[key]) return map[key];
    return String(key).replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  const buildLabelMap = (obj) => Object.fromEntries(Object.keys(obj).map(k => [k, prettify(k)]));

  const tasksPalette = ['#10b981','#34d399','#059669','#16a34a','#22c55e','#065f46','#5eead4','#0ea5e9','#3b82f6','#a855f7'];
  const transfersPalette = ['#f59e0b','#f97316','#ef4444','#eab308','#84cc16','#dc2626','#fb7185','#f472b6','#f43f5e','#d946ef'];
  if (CURRENT_VIEW === 'monthly') {
    drawBarChart('chartTasksByType', toPercentMap(tasksByType), {
      palette: tasksPalette,
      labelMap: buildLabelMap(tasksByType),
      maxValue: 100,
      formatValue: (v) => `${Math.round(v)}%`
    });
    drawBarChart('chartTransfersByType', toPercentMap(transfersByType), {
      palette: transfersPalette,
      labelMap: buildLabelMap(transfersByType),
      maxValue: 100,
      formatValue: (v) => `${Math.round(v)}%`
    });
  } else {
    drawBarChart('chartTasksByType', tasksByType, { palette: tasksPalette, labelMap: buildLabelMap(tasksByType) });
    drawBarChart('chartTransfersByType', transfersByType, { palette: transfersPalette, labelMap: buildLabelMap(transfersByType) });
  }
}

// De-duplication and pending import
const SEEN = loadSeen();
function processEntry(entry){
  if (!entry || !entry.id) return;
  if (SEEN.has(entry.id)) return;
  SEEN.add(entry.id); saveSeen(SEEN);
  // append to ledger once
  const ledger = loadLedger();
  if (!ledger.find(e => e && e.id === entry.id)) {
    ledger.unshift(entry);
    saveLedger(ledger);
  }
  // update MRN index
  const idx = loadMrnIndex();
  const mrn = entry?.patient?.mrn; if (mrn) idx[mrn] = { time: entry.time, name: entry?.patient?.name||'' };
  saveMrnIndex(idx);
  renderTable();
  updateKpisAndCharts();
}

function importPendingSubmissions(){
  try {
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith(SUBMIT_PREFIX)){
        try {
          const raw = localStorage.getItem(k);
          const entry = JSON.parse(raw || 'null');
          processEntry(entry);
          localStorage.removeItem(k);
          i = -1; // restart after mutation
        } catch {}
      }
    }
  } catch {}
}

// Listen for submissions via BroadcastChannel (preferred)
try {
  const ch = new BroadcastChannel('screenpop-analytics');
  ch.addEventListener('message', (e) => {
    const msg = e.data || {};
    if (msg && msg.type === 'submit' && msg.entry) processEntry(msg.entry);
  });
} catch {}

// Also listen via storage events for cross-tab updates
window.addEventListener('storage', (e) => {
  if (!e.key) return;
  if (e.key.startsWith(SUBMIT_PREFIX)){
    try {
      const entry = JSON.parse(e.newValue || 'null');
      if (entry && typeof entry === 'object') processEntry(entry);
      try { localStorage.removeItem(e.key); } catch {}
    } catch {}
  }
});

document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('clearBtn').addEventListener('click', () => {
  const all = loadLedger();
  let kept;
  if (CURRENT_VIEW === 'daily') kept = all.filter(e => !isSameDay(e.time, Date.now()));
  else { const mk = SELECTED_MONTH || monthKey(Date.now()); kept = all.filter(e => monthKey(e.time) !== mk); }
  saveLedger(kept);
  renderTable(); updateKpisAndCharts();
});

// Tabs
const tabDaily = document.getElementById('tabDaily');
const tabMonthly = document.getElementById('tabMonthly');
const monthPicker = document.getElementById('monthPicker');
const dailyDateLabel = document.getElementById('dailyDateLabel');
const tabButtons = [tabDaily, tabMonthly].filter(Boolean);
function applyTabState(view){
  tabButtons.forEach(btn => {
    const target = btn?.dataset?.view || (btn === tabMonthly ? 'monthly' : 'daily');
    const isActive = target === view;
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.classList.toggle('active', isActive);
  });
}
function setView(view){
  CURRENT_VIEW = view;
  applyTabState(view);
  if (monthPicker){
    monthPicker.style.display = view === 'monthly' ? '' : 'none';
    if (view === 'daily') monthPicker.blur();
  }
  if (dailyDateLabel) dailyDateLabel.style.display = view === 'daily' ? '' : 'none';
  renderTable();
  updateKpisAndCharts();
}
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.view || (btn === tabMonthly ? 'monthly' : 'daily');
    setView(target);
  });
});

// Initialize
importPendingSubmissions();
renderTable();
updateKpisAndCharts();
// Periodic refresh as a safety-net
setInterval(()=>{ renderTable(); updateKpisAndCharts(); }, 2000);
// Redraw on resize to ensure canvases use full width
let __rz;
window.addEventListener('resize', () => { clearTimeout(__rz); __rz = setTimeout(() => updateKpisAndCharts(), 150); });

// MRN search
document.getElementById('mrnSearch').addEventListener('input', applyMrnFilter);

// Setup initial UI state for tabs/labels/month picker
try {
  SELECTED_MONTH = monthKey(Date.now());
  if (monthPicker){ monthPicker.value = SELECTED_MONTH; monthPicker.addEventListener('change', () => { SELECTED_MONTH = monthPicker.value || monthKey(Date.now()); renderTable(); updateKpisAndCharts(); }); }
  if (dailyDateLabel){ const t = new Date(); dailyDateLabel.textContent = `Today: ${t.toLocaleDateString()}`; }
  // Test-only rollover button shown with ?test=1
  const url = new URL(window.location.href);
  if (url.searchParams.get('test') === '1') {
    const btn = document.getElementById('rolloverNow'); if (btn) { btn.style.display=''; btn.textContent='Recompute Now'; btn.addEventListener('click', () => { try { SELECTED_MONTH = monthKey(Date.now()); if (monthPicker) monthPicker.value = SELECTED_MONTH; renderTable(); updateKpisAndCharts(); } catch {} }); }
  }
  setView('daily');
} catch {}
