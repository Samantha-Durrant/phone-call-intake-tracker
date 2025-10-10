// Simple analytics collector for SPA/Vite environment

const STORAGE_KEY = 'screenpop_analytics_v1'; // legacy
const MRN_INDEX_KEY = 'screenpop_mrn_index_v1';
const SEEN_KEY = 'screenpop_seen_ids_v1';
const SUBMIT_PREFIX = 'screenpop_submit_';
const LEDGER_KEY = 'screenpop_ledger_v1';
let CURRENT_VIEW = 'daily';
let SELECTED_MONTH = null; // 'YYYY-MM'
let SELECTED_OFFICE = 'all';
const OFFICE_KEYS = ['Ann Arbor','Plymouth','Wixom'];
const OFFICE_LOOKUP = OFFICE_KEYS.reduce((acc,label)=>{ acc[label.toLowerCase()] = label; return acc; }, {});
function canonicalOffice(name){
  const key = String(name || '').trim().toLowerCase();
  if (!key) return '';
  return OFFICE_LOOKUP[key] || '';
}

const PIE_PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f473b7','#f59e0b','#facc15','#10b981','#14b8a6','#0ea5e9','#3b82f6','#a855f7','#ef4444'];
const STACK_TYPE_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#a855f7','#94a3b8','#22d3ee'];
const OUTCOME_KEYS = ['scheduled','rescheduled','cancelled','no_appointment'];
const OUTCOME_LABELS = {
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  no_appointment: 'No Appointment'
};
let CURRENT_OUTCOME = 'scheduled';
let OUTCOME_DATA = null;

const SCHEDULING_SERIES = [
  { key:'existingScheduled', label:'Existing · Scheduled', color:'#2563eb' },
  { key:'existingNot', label:'Existing · Not Scheduled', color:'#93c5fd' },
  { key:'newScheduled', label:'New · Scheduled', color:'#10b981' },
  { key:'newNot', label:'New · Not Scheduled', color:'#a7f3d0' }
];

function normalizeTypeAndOffice(appt){
  let type = String(appt?.type || '').trim();
  let office = canonicalOffice(appt?.office);
  const typeAsOffice = canonicalOffice(type);
  if (typeAsOffice) {
    if (!office) office = typeAsOffice;
    if (office === typeAsOffice) type = '';
  }
  return { apptType: type, office };
}

const normalizeAppt = (name) => String(name || '').trim().toLowerCase();
const MEDICAL_APPOINTMENTS = new Set([
  'fse','new patient','follow up','spot check','cyst injection','cyst excision','biopsy','hairloss','rash','isotretinoin','video visit isotretinoin','video visit','suture removal ma','wart treatment','numbing major','filler major','botox','cosmetic procedure','prp','pdt','kybella'
].map(normalizeAppt));
const COSMETIC_APPOINTMENTS = new Set([
  'cosmetic consult','dermaplane','standard hydrafacial','acne hydrafacial','deluxe hydrafacial','emsculpt','emsella','vanquish','laser pro-frac','barehr','lase hair removal (lhr)','bbl heroic','laser bbl','acne bbl','moxi','halo','visia','visia numbing','ipad numbing','ipad','microneedling','microlaser peel','chemical peel','yag','skintyte','sclerotherapy','prp','ultherapy','cosmetic follow-up','diva'
].map(normalizeAppt));

function categorizeAppointment(name){
  const norm = normalizeAppt(name);
  if (!norm) return 'Other';
  if (MEDICAL_APPOINTMENTS.has(norm)) return 'Medical';
  if (COSMETIC_APPOINTMENTS.has(norm)) return 'Cosmetic';
  return 'Other';
}

function buildApptTypePieData(map){
  const entries = Object.entries(map || {})
    .map(([label,count])=>({ label, count:Number(count)||0 }))
    .filter(item => item.count > 0)
    .sort((a,b)=>b.count - a.count);
  if (!entries.length) return [];
  const LIMIT = 7;
  const top = entries.slice(0, LIMIT).map(item => ({ ...item }));
  const remainderEntries = entries.slice(LIMIT);
  const remainder = remainderEntries.reduce((acc,item)=>acc + (item.count||0), 0);
  if (remainder > 0){
    const existingOther = top.find(item => /^other\b/i.test(String(item.label||'')));
    const detailList = remainderEntries.map(item => ({ label: item.label, count: item.count }));
    if (existingOther) {
      existingOther.count += remainder;
      existingOther.details = [...(existingOther.details || []), ...detailList];
    } else {
      top.push({ label:'Other Types', count: remainder, details: detailList });
    }
  }
  return top;
}

function prettyReasonLabel(reason){
  const raw = String(reason || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[\/]+/g,' ').replace(/\s+/g,' ').trim();
  const map = {
    'illness family emergency':'Illness/Family Emergency',
    'work school conflict':'Work/School Conflict',
    'no longer needed':'No longer needed',
    'insurance':'Insurance',
    'referral':'Referral',
    'pooo r s':'POOO r/s'
  };
  return map[key] || raw;
}

function loadEntries(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveEntries(entries){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {} }
function loadLedger(){ try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]'); } catch { return []; } }
function saveLedger(list){ try { localStorage.setItem(LEDGER_KEY, JSON.stringify(list)); } catch {} }
function isSameDay(a,b){ const da=new Date(a), db=new Date(b); return da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth() && da.getDate()===db.getDate(); }
function todayStr(){ const d = new Date(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${d.getFullYear()}-${m}-${day}`; }
function monthKey(ts){ const d=new Date(ts); const m=String(d.getMonth()+1).padStart(2,'0'); return `${d.getFullYear()}-${m}`; }
function rolloverIfNeeded(){}
function getActiveEntries(){
  const all = loadLedger();
  if (CURRENT_VIEW === 'daily') return all.filter(e => isSameDay(e.time, Date.now()));
  const mk = SELECTED_MONTH || monthKey(Date.now());
  return all.filter(e => monthKey(e.time) === mk);
}
function matchesSelectedOffice(entry){
  if (SELECTED_OFFICE === 'all') return true;
  const { office } = normalizeTypeAndOffice(entry.appointment);
  if (entry?.appointment && office) entry.appointment.office = office;
  return office === SELECTED_OFFICE;
}
function filterEntriesBySelectedOffice(entries){
  if (SELECTED_OFFICE === 'all') return entries;
  return entries.filter(matchesSelectedOffice);
}
function getScopedEntries(){
  return filterEntriesBySelectedOffice(getActiveEntries());
}
function loadSeen(){ try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } }
function saveSeen(seen){ try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen))); } catch {} }
function loadMrnIndex(){ try { return JSON.parse(localStorage.getItem(MRN_INDEX_KEY) || '{}'); } catch { return {}; } }
function saveMrnIndex(idx){ try { localStorage.setItem(MRN_INDEX_KEY, JSON.stringify(idx)); } catch {} }

function fmtDate(ts){ const d = new Date(ts); return d.toLocaleString(); }
function updateCountBadge(){ const badge = document.getElementById('countBadge'); const entries = getScopedEntries(); badge.textContent = `${entries.length} submission${entries.length===1?'':'s'}`; }

function renderTable(){
  const tbody = document.getElementById('analyticsBody');
  const entries = getScopedEntries();
  tbody.innerHTML = '';
  if (!entries.length){ const tr = document.createElement('tr'); tr.className='empty'; const td=document.createElement('td'); td.colSpan=12; td.textContent='No submissions yet'; tr.appendChild(td); tbody.appendChild(tr); updateCountBadge(); return; }
  const prettify=(key)=>{ const map={ ma_call:'MA Call', provider_question:'Provider Question', refill_request:'Refill Request', billing_question:'Billing Question', confirmation:'Confirmation', results:'Results' }; return map[key] || String(key||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };
  const summarizeActions=(actions,kind)=>{ if(!actions) return ''; return Object.entries(actions).filter(([_,v])=>!!(v&&v[kind])).map(([k])=>prettify(k)).join('; '); };
  for (const e of entries){
    const tr = document.createElement('tr');
    const td = (t) => { const el = document.createElement('td'); el.textContent = t ?? ''; return el; };
    tr.appendChild(td(fmtDate(e.time)));
    tr.appendChild(td(e.patient?.mrn||''));
    tr.appendChild(td(e.patient?.type||''));
    tr.appendChild(td(e.appointment?.scheduled ? 'Yes' : 'No'));
    tr.appendChild(td(e.appointment?.change||''));
    const { apptType, office } = normalizeTypeAndOffice(e.appointment);
    const reasonText = prettyReasonLabel(e.appointment?.reason);
    const noApptList = Array.isArray(e.appointment?.noAppointmentReasons) ? e.appointment.noAppointmentReasons.map(prettyReasonLabel).filter(Boolean) : [];
    const reasonParts = [];
    if (reasonText) reasonParts.push(reasonText);
    if (noApptList.length) reasonParts.push(`No Appt: ${noApptList.join(', ')}`);
    tr.appendChild(td(apptType || 'Unspecified'));
    tr.appendChild(td(office || 'Unspecified'));
    tr.appendChild(td(reasonParts.join(' · ')));
    const confirmed = e.appointment?.confirmed ? 'Yes' : 'No';
    tr.appendChild(td(confirmed));
    tr.appendChild(td(e.appointment?.otherText||''));
    tr.appendChild(td(summarizeActions(e.actions,'task'))); tr.appendChild(td(summarizeActions(e.actions,'transfer')));
    tbody.appendChild(tr);
  }
  updateCountBadge();
  applyMrnFilter();
}

function applyMrnFilter(){
  const input=document.getElementById('mrnSearch'); if(!input) return;
  const q=(input.value||'').trim().toLowerCase();
  const rows=document.querySelectorAll('#analyticsBody tr');
  rows.forEach(r=>{
    if(r.classList.contains('empty')) return;
    const cells=r.querySelectorAll('td');
    const mrn=(cells[1]?.textContent||'').toLowerCase();
    r.style.display = q ? (mrn.includes(q) ? '' : 'none') : '';
  });
}

function exportCsv(){
  const entries = getScopedEntries();
  const cols = ['time','agent','callId','ani','patient.mrn','patient.name','patient.type','appointment.scheduled','appointment.change','appointment.type','appointment.office','appointment.reason','appointment.noAppointmentReasons','appointment.questionOnly','appointment.otherText','appointment.confirmed','actions'];
  const header = cols.join(',');
  const lines = [header];
  for (const e of entries){
    const actions = e.actions ? Object.entries(e.actions)
      .map(([k,v])=>{ const parts=[]; if (v.task) parts.push('task'); if (v.transfer) parts.push('transfer'); return parts.length ? `${k}:${parts.join('+')}` : null; })
      .filter(Boolean).join('; ') : '';
    const norm = normalizeTypeAndOffice(e.appointment);
    const noApptCsv = Array.isArray(e.appointment?.noAppointmentReasons) ? e.appointment.noAppointmentReasons.map(prettyReasonLabel).join('|') : '';
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
      norm.apptType || '',
      norm.office || 'Unspecified',
      prettyReasonLabel(e.appointment?.reason)||'',
      noApptCsv,
      e.appointment?.questionOnly ? 'Yes' : 'No',
      e.appointment?.otherText||'',
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

function summarize(entries){
  const baseOffices = OFFICE_KEYS.reduce((acc,key)=>{ acc[key]=0; return acc; }, {});
  const sum = {
    total: entries.length,
    cancel:0,
    resched:0,
    new:0,
    existing:0,
    newScheduled:0,
    existingScheduled:0,
    tasks:0,
    transfers:0,
    hours:{},
    cancelReasons:{},
    cancelReasonDetails:{},
    reschedReasons:{},
    reschedReasonDetails:{},
    noApptReasons:{},
    noApptReasonDetails:{},
    actionsByType:{},
    apptTypes:{},
    apptGroups:{ Medical:{}, Cosmetic:{}, Other:{} },
    offices:{ ...baseOffices },
    officeBreakdown:{},
    confirmations:{ Confirmed:0, 'Not Confirmed':0 },
    questionOnly:0,
    questionOnlyByType:{ new:0, existing:0 },
    appointmentTypesByOutcome:{
      scheduled:{},
      reschedule:{},
      cancellation:{},
      noAppointment:{}
    }
  };
  const inRange = (h)=>h>=8&&h<=17;
  const normReason=(r)=>String(r||'').trim().replace(/[\/]+/g,' ').replace(/\s+/g,' ').trim();
  entries.forEach(e=>{
    const d=new Date(e.time); const h=d.getHours(); if(inRange(h)) sum.hours[h]=(sum.hours[h]||0)+1;
    const ptype=(e.patient?.type||'').toLowerCase();
    const questionOnly=!!e.appointment?.questionOnly;
    if(ptype==='new') {
      sum.new++;
      if (questionOnly){ sum.questionOnly++; sum.questionOnlyByType.new=(sum.questionOnlyByType.new||0)+1; }
      if (e.appointment?.scheduled) sum.newScheduled++;
    } else if(ptype==='existing') {
      sum.existing++;
      if (questionOnly){ sum.questionOnly++; sum.questionOnlyByType.existing=(sum.questionOnlyByType.existing||0)+1; }
      if (e.appointment?.scheduled) sum.existingScheduled++;
    }
    const { apptType, office } = normalizeTypeAndOffice(e.appointment);
    const apptLabel = apptType || 'Unspecified';
    if (office) {
      sum.offices[office] = (sum.offices[office]||0)+1;
      if (e.appointment) e.appointment.office = office;
    }
    if(apptType) {
      sum.apptTypes[apptType]=(sum.apptTypes[apptType]||0)+1;
      const group = categorizeAppointment(apptType);
      const bucket = sum.apptGroups[group] || (sum.apptGroups[group] = {});
      bucket[apptType] = (bucket[apptType] || 0) + 1;
    }
    const officeKey = office || 'Unspecified';
    const officeBucket = sum.officeBreakdown[officeKey] || { existingScheduled:0, existingNot:0, newScheduled:0, newNot:0, questionOnlyExisting:0, questionOnlyNew:0 };
    if (ptype === 'new') {
      if (e.appointment?.scheduled) officeBucket.newScheduled++;
      else if (questionOnly) officeBucket.questionOnlyNew++;
      else officeBucket.newNot++;
    } else if (ptype === 'existing') {
      if (e.appointment?.scheduled) officeBucket.existingScheduled++;
      else if (questionOnly) officeBucket.questionOnlyExisting++;
      else officeBucket.existingNot++;
    }
    sum.officeBreakdown[officeKey] = officeBucket;
    const ch=(e.appointment?.change||'none').toLowerCase();
    if (e.appointment?.scheduled && ch === 'none'){
      const scheduledBucket = sum.appointmentTypesByOutcome.scheduled;
      scheduledBucket[apptLabel] = (scheduledBucket[apptLabel]||0)+1;
    }
    if(!e.appointment?.scheduled){
      const rawReasons = Array.isArray(e.appointment?.noAppointmentReasons)
        ? e.appointment.noAppointmentReasons
        : (e.appointment?.noAppointmentReason ? [e.appointment.noAppointmentReason] : []);
      const reasons = rawReasons.length ? rawReasons : ['Unspecified'];
      reasons.map(reason => String(reason || '').trim() || 'Unspecified').forEach(reasonLabel=>{
        sum.noApptReasons[reasonLabel] = (sum.noApptReasons[reasonLabel]||0)+1;
        const detail = sum.noApptReasonDetails[reasonLabel] || (sum.noApptReasonDetails[reasonLabel] = { total:0, types:{} });
        detail.total += 1;
        detail.types[apptLabel] = (detail.types[apptLabel]||0)+1;
      });
      const noApptBucket = sum.appointmentTypesByOutcome.noAppointment;
      noApptBucket[apptLabel] = (noApptBucket[apptLabel]||0)+1;
    }
    if(ch==='cancellation'){
      sum.cancel++;
      const reasonKey = normReason(e.appointment?.reason) || 'unspecified';
      sum.cancelReasons[reasonKey] = (sum.cancelReasons[reasonKey]||0)+1;
      const detail = sum.cancelReasonDetails[reasonKey] || (sum.cancelReasonDetails[reasonKey] = { total:0, types:{} });
      detail.total += 1;
      detail.types[apptLabel] = (detail.types[apptLabel]||0)+1;
      const cancelBucket = sum.appointmentTypesByOutcome.cancellation;
      cancelBucket[apptLabel] = (cancelBucket[apptLabel]||0)+1;
    } else if(ch==='reschedule'){
      sum.resched++;
      const reasonKey = normReason(e.appointment?.reason) || 'unspecified';
      sum.reschedReasons[reasonKey] = (sum.reschedReasons[reasonKey]||0)+1;
      const detail = sum.reschedReasonDetails[reasonKey] || (sum.reschedReasonDetails[reasonKey] = { total:0, types:{} });
      detail.total += 1;
      detail.types[apptLabel] = (detail.types[apptLabel]||0)+1;
      const reschedBucket = sum.appointmentTypesByOutcome.reschedule;
      reschedBucket[apptLabel] = (reschedBucket[apptLabel]||0)+1;
    }
    const confirmed = !!e.appointment?.confirmed;
    const confirmLabel = confirmed ? 'Confirmed' : 'Not Confirmed';
    sum.confirmations[confirmLabel] = (sum.confirmations[confirmLabel]||0)+1;
    if (e.appointment) e.appointment.confirmed = confirmed;
    const actions=e.actions||{}; Object.entries(actions).forEach(([k,v])=>{ if(!sum.actionsByType[k]) sum.actionsByType[k]={task:0,transfer:0}; if(v.task){sum.actionsByType[k].task++; sum.tasks++;} if(v.transfer){sum.actionsByType[k].transfer++; sum.transfers++;} });
  });
  return sum;
}

function drawPieChart(canvasId, items, { legendId=null, palette=PIE_PALETTE } = {}){
  const canvas = document.getElementById(canvasId);
  const legend = legendId ? document.getElementById(legendId) : null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(200, canvas.clientWidth || rect.width || 200);
  const cssH = Math.max(200, canvas.clientHeight || rect.height || cssW);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const data = Array.isArray(items) ? items.filter(item => (item?.count || 0) > 0) : [];
  if (legend) legend.innerHTML = '';
  if (!data.length){
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No appointment types yet', cssW / 2, cssH / 2);
    if (legend){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No appointment types yet';
      legend.appendChild(empty);
    }
    return;
  }
  const total = data.reduce((acc,item)=>acc + (item.count || 0), 0) || 1;
  const radius = Math.max(10, Math.min(cssW, cssH) / 2 - 18);
  const cx = cssW / 2;
  const cy = cssH / 2;
  let start = -Math.PI / 2;
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  data.forEach((item, idx)=>{
    const value = Number(item.count) || 0;
    const fraction = value / total;
    const slice = fraction * Math.PI * 2;
    const color = palette[idx % palette.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (fraction > 0.06){
      const mid = start + slice / 2;
      const lx = cx + Math.cos(mid) * radius * 0.6;
      const ly = cy + Math.sin(mid) * radius * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${Math.round(fraction * 100)}%`, lx, ly);
    }
    start += slice;
  });
  if (legend){
    data.forEach((item, idx)=>{
      const row = document.createElement('div');
      row.className = 'legend-item';
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = palette[idx % palette.length];
      const label = document.createElement('span');
      const pct = Math.round((item.count / total) * 100);
      label.textContent = `${item.label} — ${item.count} (${pct}%)`;
      row.append(sw, label);
      if (Array.isArray(item.details) && item.details.length){
        row.classList.add('has-details');
        row.setAttribute('tabindex','0');
        const hint = document.createElement('span');
        hint.className = 'legend-detail-hint';
        hint.textContent = 'view details';
        label.appendChild(document.createTextNode(' · '));
        label.appendChild(hint);
        const detailBox = document.createElement('div');
        detailBox.className = 'legend-details';
        const title = document.createElement('div');
        title.className = 'legend-details-title';
        title.textContent = 'Includes:';
        detailBox.appendChild(title);
        const list = document.createElement('ul');
        list.className = 'legend-details-list';
        item.details.forEach(detail=>{
          const li = document.createElement('li');
          const detailPct = Math.round(((Number(detail.count)||0) / Math.max(1, Number(item.count)||0)) * 100);
          li.textContent = `${detail.label} — ${detail.count} (${detailPct}% of Other)`;
          list.appendChild(li);
        });
        detailBox.appendChild(list);
        row.appendChild(detailBox);
        const setOpen = (open)=>{
          if (open) row.setAttribute('data-open','true');
          else row.removeAttribute('data-open');
        };
        row.addEventListener('mouseenter', ()=>setOpen(true));
        row.addEventListener('mouseleave', ()=>setOpen(false));
        row.addEventListener('focus', ()=>setOpen(true));
        row.addEventListener('blur', ()=>setOpen(false));
        row.addEventListener('keydown',(evt)=>{
          if (evt.key === 'Escape'){
            setOpen(false);
            row.blur();
          }
        });
      }
      legend.appendChild(row);
    });
  }
}

function drawBarChart(canvasId, dataMap, { labelMap={}, color='#4f46e5', palette=null, order=null, maxValue=null, formatValue=null }={}){
  const el=document.getElementById(canvasId); if(!el) return; const ctx=el.getContext('2d'); const dpr=window.devicePixelRatio||1; const rect=el.getBoundingClientRect(); const cssW=Math.max(10, el.clientWidth||rect.width||(el.parentElement?.clientWidth||0)); const cssH=Math.max(10, el.clientHeight||rect.height); el.width=Math.round(cssW*dpr); el.height=Math.round(cssH*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); const width=cssW; const height=cssH; ctx.clearRect(0,0,width,height);
  let entries=Object.entries(dataMap); if(!entries.length){ ctx.fillStyle='#9ca3af'; ctx.fillText('No data',8,20); return; }
  if(Array.isArray(order)&&order.length){ entries = order.map(k=>[k, dataMap[k]||0]); } else { entries.sort((a,b)=> String(a[0]).localeCompare(String(b[0]))); }
  const labels=entries.map(([k])=>labelMap[k]||k); const values=entries.map(([,v])=>Number(v)||0); const max=(typeof maxValue==='number') ? (maxValue||1) : Math.max(1,...values);
  const pad=24, gap=8, barW=Math.max(8,(width-pad*2-gap*(values.length-1))/values.length); ctx.font='12px system-ui'; ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  const wrap=(text,maxW)=>{ const tokens=String(text).replace(/_/g,' ').split(/[\s/]+/); const lines=[]; let line=''; tokens.forEach(tok=>{ const t=line?line+' '+tok:tok; if(ctx.measureText(t).width<=maxW){ line=t; } else { if(line) lines.push(line); line=tok; }}); if(line) lines.push(line); return lines.length?lines:[String(text)]; };
  const wrapped=labels.map(l=>wrap(l,barW));
  const maxLines=Math.max(1,...wrapped.map(w=>w.length));
  const labelArea=(maxLines*14+12);
  values.forEach((v,i)=>{ const x=pad+i*(barW+gap); const cx = x + Math.max(1, barW/2); const chartTop=6; const chartBottom=height-labelArea-4; const avail=Math.max(12, chartBottom-chartTop); const h=Math.round((v/max)*(avail-20)); const y=chartBottom-h; const c=Array.isArray(palette)&&palette.length?palette[i%palette.length]:color; ctx.fillStyle=c; ctx.fillRect(x,y,barW,h); ctx.textAlign='center'; ctx.fillStyle='#111827'; const lbl = formatValue ? formatValue(v) : String(v); ctx.fillText(lbl, cx, Math.max(chartTop+10, y-4)); ctx.fillStyle='#374151'; wrapped[i].forEach((ln,li)=>{ const ly=chartBottom+14*(li+1); ctx.fillText(ln, cx, ly); }); ctx.textAlign='left'; });
}
function drawStackedTwo(canvasId, dataMap, { colors=['#10b981','#f59e0b'] }={}){
  const el=document.getElementById(canvasId); if(!el) return; const ctx=el.getContext('2d'); const width=el.width=el.clientWidth; const height=el.height; ctx.clearRect(0,0,width,height);
  const keys=Object.keys(dataMap); if(!keys.length){ ctx.fillStyle='#9ca3af'; ctx.fillText('No data',8,20); return; }
  const pad=24, gap=10, barW=Math.max(12,(width-pad*2-gap*(keys.length-1))/keys.length); ctx.font='12px system-ui';
  const wrap=(text)=>{ const words=String(text).replace(/_/g,' ').split(/\s+/); const lines=[]; let line=''; words.forEach(w=>{ const t=line?line+' '+w:w; if(ctx.measureText(t).width<=barW){ line=t; } else { if(line) lines.push(line); line=w; }}); if(line) lines.push(line); return lines; };
  const wrapped=keys.map(k=>wrap(k)); const maxLines=Math.max(1, ...wrapped.map(w=>w.length)); const labelArea=maxLines*14+8;
  keys.forEach((k,i)=>{ const v=dataMap[k]; const total=Math.max(1,(v.task||0)+(v.transfer||0)); const x=pad+i*(barW+gap); const chartTop=6; const chartBottom=height-labelArea-4; const avail=Math.max(12, chartBottom-chartTop); const hTask=Math.round(((v.task||0)/total)*(avail-20)); const hTrans=Math.round(((v.transfer||0)/total)*(avail-20)); let y=chartBottom; ctx.fillStyle=colors[0]; y-=hTask; ctx.fillRect(x,y,barW,hTask); ctx.fillStyle=colors[1]; y-=hTrans; ctx.fillRect(x,y,barW,hTrans); ctx.fillStyle='#111827'; ctx.fillText(`${v.task||0}/${v.transfer||0}`, x, Math.max(chartTop+10, y-4)); ctx.fillStyle='#374151'; wrapped[i].forEach((ln,li)=>{ const ly=chartBottom+14*(li+1); ctx.fillText(ln, x, ly); }); });
}

function drawStackedMulti(canvasId, dataMap, { series=[], order=null, maxValue=null, formatValue=null }={}){
  const el = document.getElementById(canvasId); if(!el) return;
  const ctx = el.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = el.getBoundingClientRect();
  const cssW = Math.max(10, el.clientWidth || rect.width || (el.parentElement?.clientWidth || 0));
  const cssH = Math.max(10, el.clientHeight || rect.height);
  el.width = Math.round(cssW * dpr);
  el.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = cssW;
  const height = cssH;
  ctx.clearRect(0,0,width,height);
  const keys = (Array.isArray(order) && order.length) ? order.filter(k => k && Object.prototype.hasOwnProperty.call(dataMap,k)) : Object.keys(dataMap);
  if (!keys.length || !Array.isArray(series) || !series.length){ ctx.fillStyle='#9ca3af'; ctx.fillText('No data',8,20); return; }
  const totals = keys.map(key => {
    const bucket = dataMap[key] || {};
    return series.reduce((acc, s) => acc + (Number(bucket[s.key]) || 0), 0);
  });
  const computedMax = (typeof maxValue === 'number') ? (maxValue || 1) : Math.max(1, ...totals);
  const pad = 28;
  const gap = 12;
  const barW = Math.max(20, (width - pad*2 - gap*(keys.length-1)) / Math.max(keys.length,1));
  ctx.font = '12px system-ui';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const wrapLabel = (text, maxWidth) => {
    const tokens = String(text||'').split(/\s+/);
    const lines=[]; let line='';
    tokens.forEach(tok=>{
      const tentative = line ? line + ' ' + tok : tok;
      if (ctx.measureText(tentative).width <= maxWidth) {
        line = tentative;
      } else {
        if (line) lines.push(line);
        line = tok;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [String(text||'')];
  };
  const wrappedLabels = keys.map(k => wrapLabel(k, barW));
  const maxLines = Math.max(1, ...wrappedLabels.map(lines => lines.length));
  const labelArea = maxLines * 14 + 12;
  keys.forEach((key, idx) => {
    const bucket = dataMap[key] || {};
    const total = series.reduce((acc,s) => acc + (Number(bucket[s.key]) || 0), 0);
    const x = pad + idx * (barW + gap);
    const chartTop = 6;
    const chartBottom = height - labelArea - 4;
    const avail = Math.max(16, chartBottom - chartTop);
    let y = chartBottom;
    series.forEach(seriesEntry => {
      const value = Number(bucket[seriesEntry.key]) || 0;
      const h = Math.round((value / computedMax) * (avail - 20));
      if (h > 0) {
        ctx.fillStyle = seriesEntry.color || '#4b5563';
        const segmentY = y - h;
        ctx.fillRect(x, segmentY, barW, h);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111827';
        const labelText = formatValue ? formatValue(value, seriesEntry) : String(value);
        ctx.fillText(labelText, x + barW/2, Math.max(chartTop+10, segmentY - 4));
        ctx.textAlign = 'left';
        y = segmentY;
      }
    });
    ctx.fillStyle = '#374151';
    const lines = wrappedLabels[idx];
    ctx.textAlign = 'center';
    lines.forEach((line, li) => {
      const ly = chartBottom + 14 * (li + 1);
      ctx.fillText(line, x + barW / 2, ly);
    });
    ctx.textAlign = 'left';
  });
}

function renderLegend(containerId, series){
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  series.forEach(item => {
    const row = document.createElement('div');
    row.className = 'legend-item';
    row.title = item.label;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = item.color || '#4b5563';
    row.appendChild(swatch);
    const label = document.createElement('span');
    label.textContent = item.label;
    row.appendChild(label);
    container.appendChild(row);
  });
}

function renderStackLegend(containerId, series, legendDetails = {}){
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(series) || !series.length){
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No appointment types yet';
    container.appendChild(empty);
    return;
  }
  series.forEach(item=>{
    const row=document.createElement('div');
    row.className='legend-item';
    row.title=item.label;
    const swatch=document.createElement('span');
    swatch.className='swatch';
    swatch.style.background=item.color||'#4b5563';
    row.appendChild(swatch);
    const label=document.createElement('span');
    const totalText=typeof item.total==='number'?` — ${item.total}`:'';
    label.textContent=`${item.label}${totalText}`;
    row.appendChild(label);
    const details=legendDetails[item.label] || legendDetails[item.key];
    if(Array.isArray(details) && details.length){
      row.classList.add('has-details');
      row.setAttribute('tabindex','0');
      const hint=document.createElement('span');
      hint.className='legend-detail-hint';
      hint.textContent='view details';
      label.appendChild(document.createTextNode(' · '));
      label.appendChild(hint);
      const detailBox=document.createElement('div');
      detailBox.className='legend-details';
      const title=document.createElement('div');
      title.className='legend-details-title';
      title.textContent='Includes:';
      detailBox.appendChild(title);
      const list=document.createElement('ul');
      list.className='legend-details-list';
      details.forEach(detail=>{
        const li=document.createElement('li');
        const pct=typeof detail.pct==='number'?` (${detail.pct}% of Other)`:'';
        li.textContent=`${detail.label} — ${detail.count}${pct}`;
        list.appendChild(li);
      });
      detailBox.appendChild(list);
      row.appendChild(detailBox);
      const setOpen=(open)=>{ if(open) row.setAttribute('data-open','true'); else row.removeAttribute('data-open'); };
      row.addEventListener('mouseenter',()=>setOpen(true));
      row.addEventListener('mouseleave',()=>setOpen(false));
      row.addEventListener('focus',()=>setOpen(true));
      row.addEventListener('blur',()=>setOpen(false));
      row.addEventListener('keydown',(evt)=>{ if(evt.key==='Escape'){ setOpen(false); row.blur(); } });
    }
    container.appendChild(row);
  });
}

function renderReasonDetails(containerId, detailMap, { labelForReason = (key)=>String(key||'') } = {}){
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const entries = Object.entries(detailMap || {}).filter(([,detail])=>detail && detail.total).sort((a,b)=> (b[1].total||0) - (a[1].total||0));
  if (!entries.length){
    const empty = document.createElement('div');
    empty.className = 'reason-detail-empty muted';
    empty.textContent = 'No change reasons captured yet';
    container.appendChild(empty);
    return;
  }
  entries.forEach(([reasonKey, detail])=>{
    const section = document.createElement('div');
    section.className = 'reason-detail';
    const title = document.createElement('div');
    title.className = 'reason-detail-title';
    title.textContent = `${labelForReason(reasonKey)} — ${detail.total}`;
    section.appendChild(title);
    const list = document.createElement('ul');
    list.className = 'reason-detail-list';
    const typeEntries = Object.entries(detail.types || {}).filter(([,count])=>Number(count)||0).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
    const total = detail.total || 1;
    typeEntries.slice(0,8).forEach(([label,count])=>{
      const li = document.createElement('li');
      const pct = Math.round((Number(count)||0)/total*100);
      li.textContent = `${label} — ${count} (${pct}%)`;
      list.appendChild(li);
    });
    section.appendChild(list);
    container.appendChild(section);
  });
}

function buildReasonTypeStack(detailMap, { topN = 6, formatReason = (key)=>String(key||'') } = {}){
  const totalsByType = {};
  Object.values(detailMap || {}).forEach(detail=>{
    Object.entries(detail?.types || {}).forEach(([type,count])=>{
      const label = String(type || 'Unspecified');
      const value = Number(count) || 0;
      if (!value) return;
      totalsByType[label] = (totalsByType[label]||0) + value;
    });
  });
  const sortedTypes = Object.entries(totalsByType).filter(([,count])=>count>0).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
  if (!sortedTypes.length) return { dataMap:{}, series:[], order:[], legendDetails:{} };
  const topTypeLabels = sortedTypes.slice(0, topN).map(([label])=>label);
  const includeOther = sortedTypes.length > topN;
  const otherEntries = includeOther ? sortedTypes.slice(topN) : [];
  const otherTotal = otherEntries.reduce((acc,[,count])=> acc + (Number(count)||0), 0);
  const seriesKeys = includeOther ? [...topTypeLabels, 'Other'] : [...topTypeLabels];
  const series = seriesKeys.map((label, idx)=>({
    key: label,
    label,
    color: STACK_TYPE_COLORS[idx % STACK_TYPE_COLORS.length],
    total: label === 'Other' ? otherTotal : (totalsByType[label] || 0)
  }));
  const order = Object.entries(detailMap || {}).map(([reasonKey, detail])=>({
    label: formatReason(reasonKey),
    total: Number(detail?.total) || 0
  })).sort((a,b)=> (b.total||0) - (a.total||0)).map(item=>item.label);
  const dataMap = {};
  Object.entries(detailMap || {}).forEach(([reasonKey, detail])=>{
    const label = formatReason(reasonKey);
    const bucket = {};
    seriesKeys.forEach(key => { bucket[key] = 0; });
    Object.entries(detail?.types || {}).forEach(([type,count])=>{
      const typeLabel = String(type || 'Unspecified');
      const value = Number(count) || 0;
      if (!value) return;
      let target = typeLabel;
      if (!topTypeLabels.includes(typeLabel)){
        target = includeOther ? 'Other' : typeLabel;
      }
      bucket[target] = (bucket[target] || 0) + value;
    });
    dataMap[label] = bucket;
  });
  const legendDetails = {};
  if (includeOther && otherEntries.length){
    legendDetails.Other = otherEntries.map(([label,count])=>{
      const pct = otherTotal ? Math.round((Number(count)||0)/otherTotal*100) : 0;
      return { label, count: Number(count)||0, pct };
    });
  }
  return { dataMap, series, order, legendDetails };
}

function totalFromMap(map){
  return Object.values(map || {}).reduce((acc,val)=> acc + (Number(val)||0), 0);
}

const outcomeTabsEl = document.getElementById('outcomeTabs');
const outcomeFunnelEl = document.getElementById('outcomeFunnel');
const outcomeMessageEl = document.getElementById('outcomeMessage');

function updateOutcomeFunnel(dataMap){
  if (!outcomeFunnelEl) return;
  const totals = {
    scheduled: dataMap?.scheduled?.total || 0,
    rescheduled: dataMap?.rescheduled?.total || 0,
    cancelled: dataMap?.cancelled?.total || 0,
    no_appointment: dataMap?.no_appointment?.total || 0
  };
  const ids = {
    scheduled: 'funnelScheduled',
    rescheduled: 'funnelRescheduled',
    cancelled: 'funnelCancelled',
    no_appointment: 'funnelNoAppt'
  };
  Object.entries(ids).forEach(([key,id])=>{
    const el = document.getElementById(id);
    if (el) el.textContent = String(totals[key] || 0);
  });
  if (outcomeFunnelEl){
    outcomeFunnelEl.querySelectorAll('.funnel-card').forEach(card=>{
      const key = card.dataset.outcome;
      card.classList.toggle('active', key === CURRENT_OUTCOME);
    });
  }
}

function renderOutcomeView(outcomeKey){
  if (!OUTCOME_DATA) return;
  const target = OUTCOME_DATA[outcomeKey] || OUTCOME_DATA.scheduled;
  if (!target) return;
  CURRENT_OUTCOME = outcomeKey;
  if (outcomeTabsEl){
    outcomeTabsEl.querySelectorAll('.outcome-tab').forEach(btn=>{
      const key = btn.dataset.outcome;
      const isActive = key === CURRENT_OUTCOME;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }
  updateOutcomeFunnel(OUTCOME_DATA);
  const stack = target.stack || { dataMap:{}, series:[], order:[], legendDetails:{} };
  drawStackedMulti('chartOutcomeTypes', stack.dataMap, {
    series: stack.series,
    order: stack.order,
    formatValue: (value) => String(value)
  });
  renderStackLegend('chartOutcomeTypesLegend', stack.series, stack.legendDetails);
  const reasonMap = target.reasonMap || {};
  const reasonOptions = {
    palette: target.reasonPalette || ['#4f46e5','#7c3aed','#0ea5e9','#f97316','#10b981'],
    labelMap: target.reasonLabelMap || {}
  };
  drawBarChart('chartOutcomeReasons', reasonMap, reasonOptions);
  renderReasonDetails('outcomeReasonDetails', target.detailMap || {}, { labelForReason: target.labelFormatter || ((key)=>key) });
  if (outcomeMessageEl){
    if ((target.total || 0) === 0){
      outcomeMessageEl.textContent = `No records captured for ${OUTCOME_LABELS[outcomeKey] || outcomeKey}.`;
    } else if (!Object.keys(reasonMap||{}).length){
      outcomeMessageEl.textContent = 'No specific reasons captured yet for this outcome.';
    } else {
      outcomeMessageEl.textContent = '';
    }
  }
}

function setOutcome(outcomeKey){
  renderOutcomeView(outcomeKey);
}

function initializeOutcomeTabs(){
  if (outcomeTabsEl){
    outcomeTabsEl.addEventListener('click', (evt)=>{
      const btn = evt.target.closest('.outcome-tab');
      if (!btn) return;
      setOutcome(btn.dataset.outcome);
    });
  }
  if (outcomeFunnelEl){
    outcomeFunnelEl.querySelectorAll('.funnel-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        setOutcome(card.dataset.outcome);
      });
    });
  }
}

function renderAppointmentLists(sum){
  const medList = document.getElementById('listApptMedical');
  const cosList = document.getElementById('listApptCosmetic');
  const render = (el, data) => {
    if (!el) return;
    const entries = Object.entries(data || {}).filter(([,v]) => (Number(v)||0) > 0).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
    el.innerHTML = '';
    if (!entries.length){
      const empty = document.createElement('li'); empty.className='appt-empty'; empty.textContent='No appointments captured yet'; el.appendChild(empty); return;
    }
    const total = entries.reduce((acc,[,cnt]) => acc + (Number(cnt)||0), 0) || 1;
    entries.forEach(([label,count])=>{
      const li = document.createElement('li');
      const nameSpan = document.createElement('span'); nameSpan.className='appt-label'; nameSpan.textContent = label;
      const meta = document.createElement('span'); meta.className='appt-meta';
      const cnt = document.createElement('span'); cnt.className='appt-count'; cnt.textContent = String(count);
      const pct = document.createElement('span'); pct.className='appt-percent'; pct.textContent = `${Math.round((Number(count)||0)/total*100)}%`;
      meta.append(cnt, pct);
      li.append(nameSpan, meta);
      el.appendChild(li);
    });
  };
  render(medList, sum.apptGroups?.Medical);
  render(cosList, sum.apptGroups?.Cosmetic);
}

function updateKpisAndCharts(){
  const allEntries = getActiveEntries();
  const entries = filterEntriesBySelectedOffice(allEntries);
  const sumAll = summarize(allEntries);
  const sum = (SELECTED_OFFICE === 'all') ? sumAll : summarize(entries);
  document.getElementById('kpiTotal').textContent=String(sum.total);
  document.getElementById('kpiCancel').textContent=String(sum.cancel);
  document.getElementById('kpiResched').textContent=String(sum.resched);
  document.getElementById('kpiNew').textContent=String(sum.new);
  document.getElementById('kpiExisting').textContent=String(sum.existing);
  document.getElementById('kpiActions').textContent=`${sum.tasks} / ${sum.transfers}`;
  const hoursMap={}; for(let h=8;h<=17;h++) hoursMap[String(h)]=sum.hours[h]||0;
  const hoursOrder=Array.from({length:10},(_,i)=>String(8+i));
  const hourLabels={}; for(let h=8;h<=17;h++){ const hour12=(h%12)||12; const ampm=h<12?'am':'pm'; hourLabels[String(h)]=`${hour12}:00 ${ampm}`; }
  if(CURRENT_VIEW==='monthly'){
    const {y,m} = parseYearMonth(SELECTED_MONTH || monthKey(Date.now()));
    const denom = daysInMonth(y,m) || 1;
    const avgHours = Object.fromEntries(Object.entries(hoursMap).map(([k,v])=>[k,(Number(v)||0)/denom]));
    drawBarChart('chartHours', avgHours, { order:hoursOrder, labelMap:hourLabels, color:'#4f46e5', formatValue:(v)=>(v>=10?Math.round(v):v.toFixed(1)) });
  } else {
    drawBarChart('chartHours', hoursMap, { order:hoursOrder, labelMap:hourLabels, color:'#4f46e5' });
  }
  // Weekday counts (Mon–Fri) — shown only on Monthly tab
  try{
    const weekdayPanel=document.getElementById('panelWeekdays');
    if(weekdayPanel) weekdayPanel.style.display = (CURRENT_VIEW==='monthly') ? '' : 'none';
    if(CURRENT_VIEW==='monthly'){
      const wdCounts={Mon:0, Tue:0, Wed:0, Thu:0, Fri:0};
      entries.forEach(e=>{ const d=new Date(e.time).getDay(); if(d>=1&&d<=5){ const key=['','Mon','Tue','Wed','Thu','Fri'][d]; wdCounts[key]=(wdCounts[key]||0)+1; } });
      const {y,m} = parseYearMonth(SELECTED_MONTH || monthKey(Date.now()));
      const occ = weekdayOccurrencesInMonth(y,m);
      const denomMap={Mon:occ[1]||1, Tue:occ[2]||1, Wed:occ[3]||1, Thu:occ[4]||1, Fri:occ[5]||1};
      const wdAvg=Object.fromEntries(Object.entries(wdCounts).map(([k,v])=>[k,(Number(v)||0)/denomMap[k]]));
      const wdOrder=['Mon','Tue','Wed','Thu','Fri']; const wdLabels={Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday'}; const wdPalette=['#2563eb','#0ea5e9','#10b981','#f59e0b','#ef4444'];
      drawBarChart('chartWeekdays', wdAvg, { order: wdOrder, labelMap: wdLabels, palette: wdPalette, formatValue:(v)=>(v>=10?Math.round(v):v.toFixed(1)) });
    }
  } catch{}
  const breakdownSource = (SELECTED_OFFICE === 'all') ? sumAll : sum;
  const officeOrder = (SELECTED_OFFICE === 'all')
    ? [...new Set([...OFFICE_KEYS, ...Object.keys(breakdownSource.officeBreakdown || {})])]
    : [SELECTED_OFFICE];
  const officeData = {};
  officeOrder.forEach(name => {
    const bucket = breakdownSource.officeBreakdown?.[name] || {};
    officeData[name] = {
      existingScheduled: Number(bucket.existingScheduled || 0),
      existingNot: Number(bucket.existingNot || 0),
      newScheduled: Number(bucket.newScheduled || 0),
      newNot: Number(bucket.newNot || 0)
    };
  });
  drawStackedMulti('chartNewExisting', officeData, { series: SCHEDULING_SERIES, order: officeOrder });
  renderLegend('chartNewExistingLegend', SCHEDULING_SERIES);
  renderAppointmentLists(sum);
  const medPie = buildApptTypePieData(sum.apptGroups?.Medical || {});
  const cosPie = buildApptTypePieData(sum.apptGroups?.Cosmetic || {});
  drawPieChart('chartApptMedical', medPie, { legendId: 'chartApptMedicalLegend' });
  drawPieChart('chartApptCosmetic', cosPie, { legendId: 'chartApptCosmeticLegend' });
  const otherPie = buildApptTypePieData(sum.apptGroups?.Other || {});
  drawPieChart('chartApptOther', otherPie, { legendId: 'chartApptOtherLegend' });
  const cancelPalette=['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'];
  const reschedPalette=['#1d4ed8','#0ea5e9','#14b8a6','#10b981','#84cc16','#eab308','#f59e0b','#f97316','#ef4444','#a855f7'];
  const prettyReason=(key)=>{ const map={ 'illness family emergency':'Illness/Family Emergency','work school conflict':'Work/School Conflict','no longer needed':'No longer needed','insurance':'Insurance','referral':'Referral','pooo r s':'POOO r/s','unspecified':'Unspecified' }; if(map[key]) return map[key]; return String(key||'').replace(/\b\w/g,c=>c.toUpperCase()); };
  const buildReasonLabelMap=(obj)=>Object.fromEntries(Object.keys(obj).map(k=>[k,prettyReason(k)]));
  const totalCalls = entries.length || 1;
  const toPercentMap=(m)=>Object.fromEntries(Object.entries(m).map(([k,v])=>[k,(Number(v)||0)/totalCalls*100]));
  const confirmedCount = Number(sum.confirmations?.Confirmed || 0);
  const confirmData = { Confirmed: confirmedCount };
  const confirmPalette = ['#10b981'];
  const confirmOrder = ['Confirmed'];
  if (CURRENT_VIEW==='monthly'){
    drawBarChart('chartConfirmations', toPercentMap(confirmData), { palette: confirmPalette, order: confirmOrder, maxValue:100, formatValue:(v)=>`${Math.round(v)}%` });
  } else {
    drawBarChart('chartConfirmations', confirmData, { palette: confirmPalette, order: confirmOrder });
  }
  const officeCounts = { ...OFFICE_KEYS.reduce((acc,k)=>{ acc[k]=0; return acc; }, {}), ...(sum.offices||{}) };
  const officePalette = ['#0ea5e9','#3b82f6','#6366f1','#94a3b8'];
  if (CURRENT_VIEW==='monthly'){
    drawBarChart('chartOffices', toPercentMap(officeCounts), { palette: officePalette, order: OFFICE_KEYS, maxValue:100, formatValue:(v)=>`${Math.round(v)}%` });
  } else {
    drawBarChart('chartOffices', officeCounts, { palette: officePalette, order: OFFICE_KEYS });
  }
  if (CURRENT_VIEW==='monthly'){
    drawBarChart('chartCancelReasons', toPercentMap(sum.cancelReasons), { palette: cancelPalette, labelMap: buildReasonLabelMap(sum.cancelReasons), maxValue:100, formatValue:(v)=>`${Math.round(v)}%` });
    drawBarChart('chartReschedReasons', toPercentMap(sum.reschedReasons), { palette: reschedPalette, labelMap: buildReasonLabelMap(sum.reschedReasons), maxValue:100, formatValue:(v)=>`${Math.round(v)}%` });
  } else {
    drawBarChart('chartCancelReasons', sum.cancelReasons, { palette: cancelPalette, labelMap: buildReasonLabelMap(sum.cancelReasons) });
    drawBarChart('chartReschedReasons', sum.reschedReasons, { palette: reschedPalette, labelMap: buildReasonLabelMap(sum.reschedReasons) });
  }
  renderReasonDetails('cancelReasonDetails', sum.cancelReasonDetails, { labelForReason: prettyReason });
  const totalScheduled = totalFromMap(sum.appointmentTypesByOutcome.scheduled);
  const scheduledDetailMap = totalScheduled ? { Scheduled: { total: totalScheduled, types: sum.appointmentTypesByOutcome.scheduled } } : {};
  const scheduledStack = buildReasonTypeStack(scheduledDetailMap, { topN: 6, formatReason: (key)=>key });
  const reschedTypeStack = buildReasonTypeStack(sum.reschedReasonDetails, { topN: 6, formatReason: prettyReason });
  const cancelTypeStack = buildReasonTypeStack(sum.cancelReasonDetails, { topN: 6, formatReason: prettyReason });
  const noApptStack = buildReasonTypeStack(sum.noApptReasonDetails, { topN: 6, formatReason: (key)=>key });
  const noApptPalette = ['#f97316','#f59e0b','#fbbf24','#84cc16','#22c55e'];
  OUTCOME_DATA = {
    scheduled: {
      key: 'scheduled',
      label: OUTCOME_LABELS.scheduled,
      total: totalScheduled,
      stack: scheduledStack,
      reasonMap: {},
      reasonLabelMap: {},
      reasonPalette: null,
      detailMap: scheduledDetailMap,
      labelFormatter: (key)=>key
    },
    rescheduled: {
      key: 'rescheduled',
      label: OUTCOME_LABELS.rescheduled,
      total: sum.resched,
      stack: reschedTypeStack,
      reasonMap: sum.reschedReasons,
      reasonLabelMap: buildReasonLabelMap(sum.reschedReasons),
      reasonPalette: reschedPalette,
      detailMap: sum.reschedReasonDetails,
      labelFormatter: prettyReason
    },
    cancelled: {
      key: 'cancelled',
      label: OUTCOME_LABELS.cancelled,
      total: sum.cancel,
      stack: cancelTypeStack,
      reasonMap: sum.cancelReasons,
      reasonLabelMap: buildReasonLabelMap(sum.cancelReasons),
      reasonPalette: cancelPalette,
      detailMap: sum.cancelReasonDetails,
      labelFormatter: prettyReason
    },
    no_appointment: {
      key: 'no_appointment',
      label: OUTCOME_LABELS.no_appointment,
      total: totalFromMap(sum.appointmentTypesByOutcome.noAppointment),
      stack: noApptStack,
      reasonMap: sum.noApptReasons,
      reasonLabelMap: {},
      reasonPalette: noApptPalette,
      detailMap: sum.noApptReasonDetails,
      labelFormatter: (key)=>key
    }
  };
  if (!OUTCOME_DATA[CURRENT_OUTCOME] || OUTCOME_DATA[CURRENT_OUTCOME].total === 0){
    const firstWithData = OUTCOME_KEYS.find(key => OUTCOME_DATA[key]?.total);
    if (firstWithData) CURRENT_OUTCOME = firstWithData;
  }
  updateOutcomeFunnel(OUTCOME_DATA);
  renderOutcomeView(CURRENT_OUTCOME);
  const tasksByType={}; const transfersByType={};
  Object.entries(sum.actionsByType).forEach(([k,v])=>{ if(v.task) tasksByType[k]=(tasksByType[k]||0)+v.task; if(v.transfer) transfersByType[k]=(transfersByType[k]||0)+v.transfer; });
  const prettify=(key)=>{ const map={ ma_call:'MA Call', provider_question:'Provider Question', refill_request:'Refill Request', billing_question:'Billing Question', confirmation:'Confirmation', results:'Results' }; return map[key] || String(key).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };
  const buildLabelMap=(obj)=>Object.fromEntries(Object.keys(obj).map(k=>[k,prettify(k)]));
  const tasksPalette=['#10b981','#34d399','#059669','#16a34a','#22c55e','#065f46','#5eead4','#0ea5e9','#3b82f6','#a855f7'];
  const transfersPalette=['#f59e0b','#f97316','#ef4444','#eab308','#84cc16','#dc2626','#fb7185','#f472b6','#f43f5e','#d946ef'];
  if (CURRENT_VIEW==='monthly'){
    drawBarChart('chartTasksByType', toPercentMap(tasksByType), { palette: tasksPalette, labelMap: buildLabelMap(tasksByType), maxValue:100, formatValue:(v)=>`${Math.round(v)}%` });
    drawBarChart('chartTransfersByType', toPercentMap(transfersByType), { palette: transfersPalette, labelMap: buildLabelMap(transfersByType), maxValue:100, formatValue:(v)=>`${Math.round(v)}%` });
  } else {
    drawBarChart('chartTasksByType', tasksByType, { palette: tasksPalette, labelMap: buildLabelMap(tasksByType) });
    drawBarChart('chartTransfersByType', transfersByType, { palette: transfersPalette, labelMap: buildLabelMap(transfersByType) });
  }
}

const SEEN = loadSeen();
function processEntry(entry){
  if (!entry || !entry.id) return;
  if (SEEN.has(entry.id)) return;
  SEEN.add(entry.id); saveSeen(SEEN);
  const ledger=loadLedger(); if(!ledger.find(e=>e&&e.id===entry.id)){ ledger.unshift(entry); saveLedger(ledger); }
  const idx=loadMrnIndex(); const mrn=entry?.patient?.mrn; if(mrn) idx[mrn]={ time:entry.time, name: entry?.patient?.name||'' }; saveMrnIndex(idx);
  renderTable(); updateKpisAndCharts();
}

try { const ch=new BroadcastChannel('screenpop-analytics'); ch.addEventListener('message', (e)=>{ const msg=e.data||{}; if(msg&&msg.type==='submit'&&msg.entry){ processEntry(msg.entry); } }); } catch {}

window.addEventListener('storage', (e)=>{ if(!e.key) return; if(e.key.startsWith(SUBMIT_PREFIX)){ try { const entry=JSON.parse(e.newValue||'null'); if(entry&&typeof entry==='object'){ processEntry(entry); } try{ localStorage.removeItem(e.key); }catch{} } catch {} } });

function importPendingSubmissions(){ try { for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith(SUBMIT_PREFIX)){ try { const entry=JSON.parse(localStorage.getItem(k)||'null'); processEntry(entry); localStorage.removeItem(k); i=-1; } catch {} } } } catch {} }

document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('clearBtn').addEventListener('click', ()=>{ const all=loadLedger(); let kept; if(CURRENT_VIEW==='daily') kept=all.filter(e=>!isSameDay(e.time, Date.now())); else { const mk=SELECTED_MONTH||monthKey(Date.now()); kept=all.filter(e=>monthKey(e.time)!==mk); } saveLedger(kept); renderTable(); updateKpisAndCharts(); });
const tabDaily=document.getElementById('tabDaily'); const tabMonthly=document.getElementById('tabMonthly');
const monthPicker=document.getElementById('monthPicker'); const dailyDateLabel=document.getElementById('dailyDateLabel');
const tabButtons=[tabDaily,tabMonthly].filter(Boolean);
const officeToggle=document.getElementById('officeFilter');
const officeButtons=officeToggle?Array.from(officeToggle.querySelectorAll('button[data-office]')):[];
function applyOfficeState(selected){
  officeButtons.forEach(btn=>{
    const value=btn?.dataset?.office||'all';
    const isActive=value===selected;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive?'true':'false');
  });
}
function setOffice(value){
  const next=value||'all';
  if(SELECTED_OFFICE===next) return;
  SELECTED_OFFICE=next;
  applyOfficeState(SELECTED_OFFICE);
  renderTable();
  updateKpisAndCharts();
}
if(officeButtons.length){
  officeButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      const value=btn?.dataset?.office||'all';
      setOffice(value);
    });
  });
  applyOfficeState(SELECTED_OFFICE);
}
function applyTabState(view){
  tabButtons.forEach(btn=>{
    const target=btn?.dataset?.view||(btn===tabMonthly?'monthly':'daily');
    const isActive=target===view;
    btn.setAttribute('aria-selected', isActive?'true':'false');
    btn.classList.toggle('active', isActive);
  });
}
function setView(view){
  CURRENT_VIEW=view;
  applyTabState(view);
  if(monthPicker){ monthPicker.style.display=view==='monthly'?'':'none'; if(view==='daily') monthPicker.blur(); }
  if(dailyDateLabel) dailyDateLabel.style.display=view==='daily'?'':'none';
  renderTable(); updateKpisAndCharts();
}
tabButtons.forEach(btn=>{
  btn.addEventListener('click',()=>{
    const target=btn.dataset.view||(btn===tabMonthly?'monthly':'daily');
    setView(target);
  });
});
document.getElementById('mrnSearch').addEventListener('input', applyMrnFilter);

importPendingSubmissions();
renderTable(); updateKpisAndCharts(); setInterval(()=>{ renderTable(); updateKpisAndCharts(); }, 2000);
// Redraw on resize to ensure canvases use full width
let __rz; window.addEventListener('resize', ()=>{ clearTimeout(__rz); __rz=setTimeout(()=>updateKpisAndCharts(),150); });

// Init UI and test-only rollover
try {
  SELECTED_MONTH = monthKey(Date.now());
  if(monthPicker){ monthPicker.value=SELECTED_MONTH; monthPicker.addEventListener('change', ()=>{ SELECTED_MONTH=monthPicker.value||monthKey(Date.now()); renderTable(); updateKpisAndCharts(); }); }
  if(dailyDateLabel){ const t=new Date(); dailyDateLabel.textContent = `Today: ${t.toLocaleDateString()}`; }
  const url = new URL(window.location.href);
  if(url.searchParams.get('test')==='1'){ const btn=document.getElementById('rolloverNow'); if(btn){ btn.style.display=''; btn.textContent='Recompute Now'; btn.addEventListener('click', ()=>{ try{ SELECTED_MONTH=monthKey(Date.now()); if(monthPicker) monthPicker.value=SELECTED_MONTH; renderTable(); updateKpisAndCharts(); } catch{} }); } }
  setView('daily');
  initializeOutcomeTabs();
} catch {}
