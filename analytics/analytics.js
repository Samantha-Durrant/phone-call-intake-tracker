// Simple analytics collector that wires into the Screenpop iframe without modifying the UI

const STORAGE_KEY = 'screenpop_analytics_v1'; // legacy / fallback (not used for view)
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
const OFFICE_COLORS = ['#6366f1','#22d3ee','#10b981','#f59e0b','#94a3b8','#c084fc'];
const OUTCOME_KEYS = ['scheduled','rescheduled','cancelled','no_appointment'];
const OUTCOME_LABELS = {
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  no_appointment: 'No Appointment'
};
const PRIORITY_APPT_RULES = [
  { key: 'new_patient', label: 'New Patient', match: (s) => s === 'new patient' },
  { key: 'follow_up', label: 'Follow Up', match: (s) => s === 'follow up' },
  { key: 'spot_check', label: 'Spot Check', match: (s) => s === 'spot check' },
  { key: 'fse', label: 'FSE', match: (s) => s === 'fse' },
  { key: 'bbl_heroic', label: 'BBL HEROic', match: (s) => s === 'bbl heroic' },
  { key: 'barehr_lhr', label: 'BareHR / LHR', match: (s) => s === 'barehr' || s === 'laser hair removal (lhr)' || s === 'lase hair removal (lhr)' || s === 'barehr / lhr', collectDetails: true },
  { key: 'injectables', label: 'Injectables (Botox & Fillers)', match: (s) => ['botox','filler major','dermal filler','dermal fillers'].includes(s), collectDetails: true },
  { key: 'dermaplane', label: 'Dermaplane', match: (s) => s === 'dermaplane' },
  { key: 'hydrafacial', label: 'Hydrafacial', match: (s) => s.includes('hydrafacial'), collectDetails: true },
  { key: 'cosmetic_consult', label: 'Cosmetic Consults', match: (s) => ['cosmetic consult','cosmetic consults','cosmetic follow-up'].includes(s), collectDetails: true }
];

function normalizePriorityLabel(value){
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

const PRIORITY_LABEL_RANK = new Map(PRIORITY_APPT_RULES.map((rule,index)=> [normalizePriorityLabel(rule.label), index]));
const SPECIAL_PRIORITY_RANK = new Map([
  ['surgery', PRIORITY_LABEL_RANK.size],
  ['video visit', PRIORITY_LABEL_RANK.size + 1]
]);

function categoryPriorityOffset(category){
  switch (category) {
    case 'Medical': return 0;
    case 'Laser Dermatology': return 100;
    case 'Cosmetic Dermatology': return 200;
    default: return 300;
  }
}

function normalizeCategoryKey(category){
  const norm = String(category || 'Other').toLowerCase();
  if (norm.startsWith('medical')) return 'medical';
  if (norm.startsWith('laser')) return 'laser';
  if (norm.startsWith('cosmetic')) return 'cosmetic';
  return 'other';
}

const CATEGORY_LABELS = {
  all: 'All Appointments',
  medical: 'Medical',
  laser: 'Laser Dermatology',
  cosmetic: 'Cosmetic Dermatology',
  other: 'Other'
};
const reasonDetailOpenState = new Map();

function unpackTypeValue(label, value){
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const count = Number(value.count) || 0;
    const details = Array.isArray(value.details)
      ? value.details.map(detail => ({
          label: String(detail.label || label),
          count: Number(detail.count) || 0
        })).filter(detail => detail.count > 0)
      : [];
    return { count, details };
  }
  return { count: Number(value) || 0, details: [] };
}

function aggregateTypeCounts(typeCounts = {}){
  const map = new Map();
  Object.entries(typeCounts || {}).forEach(([label, rawValue]) => {
    const { count, details } = unpackTypeValue(label, rawValue);
    if (!count) return;
    const norm = normalizeAppt(label);
    const category = categorizeAppointment(label);
    let baseLabel = label;
    let collectDetails = false;
    if (SURGERY_APPOINTMENTS.has(norm)) {
      baseLabel = 'Surgery';
      collectDetails = true;
    } else if (VIDEO_VISIT_APPOINTMENTS.has(norm)) {
      baseLabel = 'Video Visit';
      collectDetails = true;
    } else {
      const rule = PRIORITY_APPT_RULES.find(rule => rule.match(norm));
      if (rule) {
        baseLabel = rule.label;
        collectDetails = !!rule.collectDetails;
      } else if (category === 'Cosmetic Dermatology' && norm.includes('hydrafacial')) {
        baseLabel = 'Hydrafacial';
        collectDetails = true;
      } else if (category === 'Laser Dermatology' && norm.includes('hydrafacial')) {
        baseLabel = 'Hydrafacial';
        collectDetails = true;
      }
    }
    const canonicalBase = normalizePriorityLabel(baseLabel);
    let priorityRank;
    if (PRIORITY_LABEL_RANK.has(canonicalBase)) {
      priorityRank = PRIORITY_LABEL_RANK.get(canonicalBase);
    } else if (SPECIAL_PRIORITY_RANK.has(canonicalBase)) {
      priorityRank = SPECIAL_PRIORITY_RANK.get(canonicalBase);
    } else {
      priorityRank = PRIORITY_LABEL_RANK.size + SPECIAL_PRIORITY_RANK.size + categoryPriorityOffset(category);
    }
    const categoryLabel = category && category !== 'Other' ? category : 'Other';
    const categoryKey = normalizeCategoryKey(categoryLabel);
    const finalLabel = `${categoryLabel} · ${baseLabel}`;
    const entry = map.get(finalLabel) || { label: finalLabel, count: 0, details: [], priorityRank, category: categoryLabel, categoryKey, baseLabel };
    entry.count += count;
    entry.priorityRank = Math.min(entry.priorityRank, priorityRank);
    entry.category = entry.category || categoryLabel;
    entry.categoryKey = entry.categoryKey || categoryKey;
    if (collectDetails) {
      const detailList = details.length ? details : [{ label, count }];
      entry.details.push(...detailList);
    }
    map.set(finalLabel, entry);
  });
  map.forEach(entry => {
    if (!entry.details.length) delete entry.details;
  });
  return Array.from(map.values());
}

let CURRENT_OUTCOME = 'scheduled';
let OUTCOME_DATA = null;
let CURRENT_OUTCOME_CATEGORY = 'all';
let CURRENT_TABLE_FILTER = 'all';
let LAST_SUMMARY = null;
const APPOINTMENT_LIST_STATE = new Map();
const outcomeChartVisibility = { types: true, reasons: true };

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

const SCHEDULING_SERIES = [
  { key:'existingScheduled', label:'Existing · Scheduled', color:'#2563eb' },
  { key:'existingNot', label:'Existing · Not Scheduled', color:'#93c5fd' },
  { key:'newScheduled', label:'New · Scheduled', color:'#10b981' },
  { key:'newNot', label:'New · Not Scheduled', color:'#a7f3d0' }
];

const normalizeAppt = (name) => String(name || '').trim().toLowerCase();
const MEDICAL_APPOINTMENTS = new Set([
  'fse','new patient','follow up','spot check','cyst injection','cyst excision','biopsy','hairloss','rash','isotretinoin','video visit isotretinoin','video visit','video visit - isotretinoin','suture removal ma','wart treatment','cosmetic procedure','ed & c','ed&c','edc'
].map(normalizeAppt));
const LASER_DERM_APPOINTMENTS = new Set([
  'bbl heroic',
  'acne bbl',
  'laser bbl',
  'barehr',
  'laser hair removal (lhr)',
  'lase hair removal (lhr)',
  'yag',
  'halo',
  'moxi',
  'microlaser peel',
  'micro laser peel',
  'laser pro-frac',
  'pro-fractional',
  'diva'
].map(normalizeAppt));
const COSMETIC_DERM_APPOINTMENTS = new Set([
  'botox',
  'filler major',
  'dermal filler',
  'dermal fillers',
  'emsculpt',
  'emsella',
  'microneedling',
  'sclerotherapy',
  'slcerotherapy',
  'vanquish',
  'chemical peel',
  'hydrafacial',
  'standard hydrafacial',
  'acne hydrafacial',
  'deluxe hydrafacial',
  'hydrafacial deluxe',
  'hydrafacial acne',
  'hydrafacials',
  'kybella',
  'ultherapy',
  'prp',
  'prp (face)',
  'dermaplane',
  'cosmetic consult',
  'cosmetic consults',
  'cosmetic follow-up'
].map(normalizeAppt));
const SURGERY_APPOINTMENTS = new Set([
  'biopsy',
  'cyst excision',
  'cyst injection',
  'ed & c',
  'ed&c',
  'edc',
  'cosmetic procedure'
].map(normalizeAppt));
const VIDEO_VISIT_APPOINTMENTS = new Set([
  'video visit',
  'video visit isotretinoin',
  'video visit - isotretinoin'
].map(normalizeAppt));

function categorizeAppointment(name){
  const norm = normalizeAppt(name);
  if (!norm) return 'Other';
  if (MEDICAL_APPOINTMENTS.has(norm)) return 'Medical';
  if (LASER_DERM_APPOINTMENTS.has(norm)) return 'Laser Dermatology';
  if (COSMETIC_DERM_APPOINTMENTS.has(norm)) return 'Cosmetic Dermatology';
  if (norm.includes('hydrafacial')) return 'Cosmetic Dermatology';
  if (norm.includes('laser') || norm.includes('bbl')) return 'Laser Dermatology';
  return 'Other';
}

function buildApptTypePieData(map){
  const entries = Object.entries(map || {})
    .map(([label, value]) => {
      let count = 0;
      let details = null;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        count = Number(value.count) || 0;
        if (Array.isArray(value.details) && value.details.length) {
          details = value.details
            .map(detail => ({ label: String(detail.label || ''), count: Number(detail.count) || 0 }))
            .filter(detail => detail.count > 0);
        }
      } else {
        count = Number(value) || 0;
      }
      return { label, count, details };
    })
    .filter(item=>item.count > 0)
    .sort((a,b)=>b.count - a.count);
  if (!entries.length) return [];

  const priorityMap = new Map();
  const otherEntries = [];
  entries.forEach((item) => {
    const norm = normalizeAppt(item.label);
    const ruleIndex = PRIORITY_APPT_RULES.findIndex(rule => rule.match(norm));
    if (ruleIndex >= 0) {
      const rule = PRIORITY_APPT_RULES[ruleIndex];
      const existing = priorityMap.get(rule.key) || {
        label: rule.label,
        count: 0,
        priorityOrder: ruleIndex,
        details: rule.collectDetails ? [] : null
      };
      existing.count += item.count;
      const detailEntries = item.details && item.details.length
        ? item.details
        : [{ label: item.label, count: item.count }];
      if (rule.collectDetails) {
        existing.details = existing.details || [];
        existing.details.push(...detailEntries);
      } else if (item.details && item.details.length) {
        existing.details = existing.details || [];
        existing.details.push(...item.details);
      }
      priorityMap.set(rule.key, existing);
    } else {
      otherEntries.push(item);
    }
  });

  const priorityEntries = Array.from(priorityMap.values())
    .filter(item => item.count > 0)
    .sort((a,b)=> a.priorityOrder - b.priorityOrder)
    .map(({ priorityOrder, details, ...rest }) => {
      const entry = { ...rest };
      if (Array.isArray(details) && details.length) entry.details = details;
      return entry;
    });

  otherEntries.sort((a,b)=> b.count - a.count);

  const LIMIT = 7;
  const remainingSlots = Math.max(0, LIMIT - priorityEntries.length);
  const topOther = otherEntries.slice(0, remainingSlots).map(item => ({
    label: item.label,
    count: item.count,
    ...(item.details && item.details.length ? { details: item.details } : {})
  }));
  const remainderEntries = otherEntries.slice(remainingSlots);
  const remainder = remainderEntries.reduce((acc,item)=>acc + (item.count||0), 0);
  const result = [...priorityEntries, ...topOther];

  if (remainder > 0){
    const detailList = remainderEntries.flatMap(item => {
      if (item.details && item.details.length) return item.details;
      return [{ label: item.label, count: item.count }];
    });
    const existingOther = result.find(item => /^other\b/i.test(String(item.label||'')));
    if (existingOther) {
      existingOther.count += remainder;
      existingOther.details = [...(existingOther.details || []), ...detailList];
    } else {
      result.push({ label:'Other Types', count: remainder, details: detailList });
    }
  }
  return result;
}

function groupMedicalAppointments(map){
  const grouped = {};
  Object.entries(map || {}).forEach(([label, value]) => {
    let count = 0;
    let detailEntries = [];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      count = Number(value.count) || 0;
      if (Array.isArray(value.details) && value.details.length) {
        detailEntries = value.details
          .map(detail => ({ label: String(detail.label || ''), count: Number(detail.count) || 0 }))
          .filter(detail => detail.count > 0);
      }
    } else {
      count = Number(value) || 0;
    }
    if (!count) return;
    const norm = normalizeAppt(label);
    let target = label;
    if (SURGERY_APPOINTMENTS.has(norm)) target = 'Surgery';
    else if (VIDEO_VISIT_APPOINTMENTS.has(norm)) target = 'Video Visit';
    if (!grouped[target]) grouped[target] = { count: 0, details: [] };
    grouped[target].count += count;
    const detailsToPush = detailEntries.length ? detailEntries : [{ label, count }];
    if (target !== label) {
      grouped[target].details.push(...detailsToPush);
    } else if (detailEntries.length) {
      grouped[target].details.push(...detailEntries);
    }
  });
  Object.values(grouped).forEach(entry => {
    if (Array.isArray(entry.details) && !entry.details.length) delete entry.details;
  });
  return grouped;
}

function buildTopEntries(map, limit=12){
  const entries = Object.entries(map || {}).filter(([,v]) => (Number(v)||0) > 0).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
  if (!entries.length) return { data:{}, order:[] };
  let top = entries.slice(0, limit);
  const otherCount = entries.slice(limit).reduce((acc,[,v])=> acc + (Number(v)||0), 0);
  if (otherCount > 0) top = [...top, ['Other', otherCount]];
  return { data:Object.fromEntries(top), order: top.map(([k])=>k) };
}

function getTopReasonChartData(map, limit = 6){
  const top = buildTopEntries(map, limit);
  return { data: top.data, order: top.order };
}

function renderAppointmentLists(sum){
  if (LAST_SUMMARY !== sum) APPOINTMENT_LIST_STATE.clear();
  LAST_SUMMARY = sum;
  renderAppointmentGroup('listApptMedical', 'medical', normalizeAppointmentEntries(groupMedicalAppointments(sum.apptGroups?.Medical || {})));
  renderAppointmentGroup('listApptLaser', 'laser', normalizeAppointmentEntries(sum.apptGroups?.['Laser Dermatology']));
  renderAppointmentGroup('listApptCosmetic', 'cosmetic', normalizeAppointmentEntries(sum.apptGroups?.['Cosmetic Dermatology'] || sum.apptGroups?.Cosmetic));
}

function normalizeAppointmentEntries(data){
  return Object.entries(data || {})
    .map(([label, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { label, count: Number(value.count) || 0 };
      }
      return { label, count: Number(value) || 0 };
    })
    .filter(item => item.count > 0)
    .sort((a,b)=> b.count - a.count);
}

function renderAppointmentGroup(elementId, stateKey, entries){
  const el = document.getElementById(elementId);
  if (!el) return;
  const state = APPOINTMENT_LIST_STATE.get(stateKey) || { expanded:false };
  if (entries.length <= 5) state.expanded = false;
  APPOINTMENT_LIST_STATE.set(stateKey, state);
  el.innerHTML = '';
  if (!entries.length){
    const empty = document.createElement('li');
    empty.className = 'appt-empty';
    empty.textContent = 'No appointments captured yet';
    el.appendChild(empty);
    return;
  }
  const limit = state.expanded ? entries.length : 5;
  const total = entries.reduce((acc,item)=> acc + item.count, 0) || 1;
  entries.slice(0, limit).forEach(({ label, count }) => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.className='appt-label'; name.textContent = label;
    const meta = document.createElement('span'); meta.className='appt-meta';
    const cnt = document.createElement('span'); cnt.className='appt-count'; cnt.textContent = String(count);
    const pct = document.createElement('span'); pct.className='appt-percent'; pct.textContent = `${Math.round((count/total)*100)}%`;
    meta.append(cnt, pct);
    li.append(name, meta);
    el.appendChild(li);
  });
  if (entries.length > 5){
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'list-toggle';
    toggle.textContent = state.expanded ? 'Show top 5' : `Show all (${entries.length})`;
    toggle.addEventListener('click', () => {
      state.expanded = !state.expanded;
      if (LAST_SUMMARY) renderAppointmentLists(LAST_SUMMARY);
    });
    el.appendChild(toggle);
  }
}

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

function updateCountBadge(filteredCount = null, totalCount = null){
  const badge = document.getElementById('countBadge');
  if (!badge) return;
  const total = Number.isFinite(totalCount) ? totalCount : getScopedEntries().length;
  const filtered = Number.isFinite(filteredCount) ? filteredCount : total;
  const totalLabel = `${total} submission${total===1?'':'s'}`;
  badge.textContent = (filtered === total) ? totalLabel : `${filtered} of ${totalLabel}`;
}

function renderTable(){
  const tbody = document.getElementById('analyticsBody');
  const entries = getScopedEntries();
  const totalEntries = entries.length;
  tbody.innerHTML = '';
  if (!totalEntries){
    const tr = document.createElement('tr');
    tr.className = 'empty';
    const td = document.createElement('td');
    td.colSpan = 12;
    td.textContent = 'No submissions yet';
    tr.appendChild(td);
    tbody.appendChild(tr);
    updateCountBadge(0, 0);
    return;
  }
  let filteredEntries = entries;
  switch (CURRENT_TABLE_FILTER){
    case 'scheduled':
      filteredEntries = entries.filter(e => (e.appointment?.scheduled) && ((e.appointment?.change || 'none').toLowerCase() === 'none'));
      break;
    case 'rescheduled':
      filteredEntries = entries.filter(e => (e.appointment?.change || '').toLowerCase() === 'reschedule');
      break;
    case 'cancelled':
      filteredEntries = entries.filter(e => (e.appointment?.change || '').toLowerCase() === 'cancellation');
      break;
    case 'no_appointment':
      filteredEntries = entries.filter(e => e.appointment && e.appointment.scheduled === false);
      break;
    default:
      break;
  }
  if (!filteredEntries.length){
    const tr = document.createElement('tr');
    tr.className = 'empty';
    const td = document.createElement('td');
    td.colSpan = 12;
    td.textContent = 'No submissions match this filter';
    tr.appendChild(td);
    tbody.appendChild(tr);
    updateCountBadge(0, totalEntries);
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
  for (const e of filteredEntries){
    const tr = document.createElement('tr');
    const td = (t) => { const el = document.createElement('td'); el.textContent = t ?? ''; return el; };
    tr.appendChild(td(fmtDate(e.time)));
    tr.appendChild(td(e.patient?.mrn || ''));
    tr.appendChild(td(e.patient?.type || ''));
    tr.appendChild(td(e.appointment?.scheduled ? 'Yes' : 'No'));
    tr.appendChild(td(e.appointment?.change || ''));
    const { apptType, office } = normalizeTypeAndOffice(e.appointment);
    const apptLabel = apptType || 'Unspecified';
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
    tr.appendChild(td(e.appointment?.otherText || ''));
    tr.appendChild(td(summarizeActions(e.actions, 'task')));
    tr.appendChild(td(summarizeActions(e.actions, 'transfer')));
    tbody.appendChild(tr);
  }
  updateCountBadge(filteredEntries.length, totalEntries);
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
  const entries = getScopedEntries();
  const cols = ['time','callId','patient.mrn','patient.name','patient.type','appointment.scheduled','appointment.change','appointment.type','appointment.office','appointment.reason','appointment.noAppointmentReasons','appointment.questionOnly','appointment.otherText','appointment.confirmed','actions'];
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

// --- KPIs and Charts ---
function summarize(entries){
  const sum = {
    total: entries.length,
    cancel: 0,
    resched: 0,
    new: 0,
    existing: 0,
    newScheduled: 0,
    existingScheduled: 0,
    tasks: 0,
    transfers: 0,
    hours: {},
    cancelReasons: {},
    cancelReasonDetails: {},
    reschedReasons: {},
    reschedReasonDetails: {},
    noApptReasons: {},
    noApptReasonDetails: {},
    actionsByType: {},
    apptTypes: {},
    apptGroups: { Medical:{}, 'Laser Dermatology':{}, 'Cosmetic Dermatology':{}, Cosmetic:{}, Other:{} },
    offices: OFFICE_KEYS.reduce((acc,k)=>{ acc[k]=0; return acc; }, {}),
    officeBreakdown: {},
    confirmations: { Confirmed:0, 'Not Confirmed':0 },
    questionOnly: 0,
    questionOnlyByType: { new:0, existing:0 },
    appointmentTypesByOutcome: {
      scheduled: {},
      reschedule: {},
      cancellation: {},
      noAppointment: {}
    },
    byOffice: {}
  };
  OFFICE_KEYS.forEach(name => { sum.byOffice[name] = createOfficeBucket(); });
  const inRange = (h) => h>=8 && h<=17;
  const normReason = (r) => String(r||'').trim().replace(/[\/]+/g,' ').replace(/\s+/g,' ').trim();
  entries.forEach(e => {
    const d = new Date(e.time);
    const h = d.getHours();
    const { apptType, office } = normalizeTypeAndOffice(e.appointment);
    const apptLabel = apptType || 'Unspecified';
    const officeKey = office || 'Unspecified';
    const officeMetrics = sum.byOffice[officeKey] || (sum.byOffice[officeKey] = createOfficeBucket());
    if (inRange(h)) {
      sum.hours[h] = (sum.hours[h]||0)+1;
      officeMetrics.hours[h] = (officeMetrics.hours[h] || 0) + 1;
    }
    const ptype = (e.patient?.type||'').toLowerCase();
    const questionOnly = !!e.appointment?.questionOnly;
    if (ptype === 'new') {
      sum.new++;
      if (questionOnly) {
        sum.questionOnly++;
        sum.questionOnlyByType.new = (sum.questionOnlyByType.new || 0) + 1;
      }
      if (e.appointment?.scheduled) sum.newScheduled = (sum.newScheduled||0) + 1;
    } else if (ptype === 'existing') {
      sum.existing++;
      if (questionOnly) {
        sum.questionOnly++;
        sum.questionOnlyByType.existing = (sum.questionOnlyByType.existing || 0) + 1;
      }
      if (e.appointment?.scheduled) sum.existingScheduled = (sum.existingScheduled||0) + 1;
    }
    if (office) {
      sum.offices[office] = (sum.offices[office] || 0) + 1;
      if (e.appointment) e.appointment.office = office;
    }
    if (apptType) {
      sum.apptTypes[apptType] = (sum.apptTypes[apptType] || 0) + 1;
      const group = categorizeAppointment(apptType);
      const bucket = sum.apptGroups[group] || (sum.apptGroups[group] = {});
      bucket[apptType] = (bucket[apptType] || 0) + 1;
    }
    const officeBucket = sum.officeBreakdown[officeKey] || { existingScheduled:0, existingNot:0, newScheduled:0, newNot:0, questionOnlyExisting:0, questionOnlyNew:0 };
    if (ptype === 'new') {
      if (e.appointment?.scheduled) {
        officeBucket.newScheduled++;
      } else if (questionOnly) {
        officeBucket.questionOnlyNew++;
      } else {
        officeBucket.newNot++;
      }
    } else if (ptype === 'existing') {
      if (e.appointment?.scheduled) {
        officeBucket.existingScheduled++;
      } else if (questionOnly) {
        officeBucket.questionOnlyExisting++;
      } else {
        officeBucket.existingNot++;
      }
    }
    sum.officeBreakdown[officeKey] = officeBucket;
    const ch = (e.appointment?.change||'none').toLowerCase();
    if (e.appointment?.scheduled && ch === 'none') {
      const scheduledBucket = sum.appointmentTypesByOutcome.scheduled;
      scheduledBucket[apptLabel] = (scheduledBucket[apptLabel] || 0) + 1;
      const officeOutcome = officeMetrics.outcomes.scheduled;
      officeOutcome.total = (officeOutcome.total || 0) + 1;
      officeOutcome.appointmentTypes[apptLabel] = (officeOutcome.appointmentTypes[apptLabel] || 0) + 1;
    }
    if (!e.appointment?.scheduled) {
      const rawReasons = Array.isArray(e.appointment?.noAppointmentReasons)
        ? e.appointment.noAppointmentReasons
        : (e.appointment?.noAppointmentReason ? [e.appointment.noAppointmentReason] : []);
      const analyticReasons = rawReasons
        .map(reason => String(reason || '').trim())
        .filter(Boolean)
        .filter(reason => reason.toLowerCase() !== 'question only');

      if (analyticReasons.length) {
        const officeNoOutcome = officeMetrics.outcomes.noAppointment;
        officeNoOutcome.total = (officeNoOutcome.total || 0) + 1;
        officeNoOutcome.appointmentTypes[apptLabel] = (officeNoOutcome.appointmentTypes[apptLabel] || 0) + 1;
        analyticReasons.forEach(reason => {
          const key = reason || 'Unspecified';
          sum.noApptReasons[key] = (sum.noApptReasons[key] || 0) + 1;
          const detail = sum.noApptReasonDetails[key] || (sum.noApptReasonDetails[key] = { total: 0, types: {} });
          detail.total += 1;
          detail.types[apptLabel] = (detail.types[apptLabel] || 0) + 1;
          officeMetrics.noApptReasons[key] = (officeMetrics.noApptReasons[key] || 0) + 1;
          officeNoOutcome.reasons[key] = (officeNoOutcome.reasons[key] || 0) + 1;
          const officeDetail = officeNoOutcome.reasonDetails[key] || (officeNoOutcome.reasonDetails[key] = { total:0, types:{} });
          officeDetail.total += 1;
          officeDetail.types[apptLabel] = (officeDetail.types[apptLabel] || 0) + 1;
        });
        const noApptBucket = sum.appointmentTypesByOutcome.noAppointment;
        noApptBucket[apptLabel] = (noApptBucket[apptLabel] || 0) + 1;
      }
    }
    if (ch === 'cancellation') {
      sum.cancel++;
      const reasonKey = normReason(e.appointment?.reason) || 'unspecified';
      sum.cancelReasons[reasonKey] = (sum.cancelReasons[reasonKey] || 0) + 1;
      const detail = sum.cancelReasonDetails[reasonKey] || (sum.cancelReasonDetails[reasonKey] = { total: 0, types: {} });
      detail.total += 1;
      detail.types[apptLabel] = (detail.types[apptLabel] || 0) + 1;
      const cancelBucket = sum.appointmentTypesByOutcome.cancellation;
      cancelBucket[apptLabel] = (cancelBucket[apptLabel] || 0) + 1;
      officeMetrics.cancelReasons[reasonKey] = (officeMetrics.cancelReasons[reasonKey] || 0) + 1;
      const officeCancelOutcome = officeMetrics.outcomes.cancelled;
      officeCancelOutcome.total = (officeCancelOutcome.total || 0) + 1;
      officeCancelOutcome.appointmentTypes[apptLabel] = (officeCancelOutcome.appointmentTypes[apptLabel] || 0) + 1;
      officeCancelOutcome.reasons[reasonKey] = (officeCancelOutcome.reasons[reasonKey] || 0) + 1;
      const officeCancelDetail = officeCancelOutcome.reasonDetails[reasonKey] || (officeCancelOutcome.reasonDetails[reasonKey] = { total:0, types:{} });
      officeCancelDetail.total += 1;
      officeCancelDetail.types[apptLabel] = (officeCancelDetail.types[apptLabel] || 0) + 1;
    } else if (ch === 'reschedule') {
      sum.resched++;
      const reasonKey = normReason(e.appointment?.reason) || 'unspecified';
      sum.reschedReasons[reasonKey] = (sum.reschedReasons[reasonKey] || 0) + 1;
      const detail = sum.reschedReasonDetails[reasonKey] || (sum.reschedReasonDetails[reasonKey] = { total: 0, types: {} });
      detail.total += 1;
      detail.types[apptLabel] = (detail.types[apptLabel] || 0) + 1;
      const reschedBucket = sum.appointmentTypesByOutcome.reschedule;
      reschedBucket[apptLabel] = (reschedBucket[apptLabel] || 0) + 1;
      officeMetrics.reschedReasons[reasonKey] = (officeMetrics.reschedReasons[reasonKey] || 0) + 1;
      const officeReschedOutcome = officeMetrics.outcomes.rescheduled;
      officeReschedOutcome.total = (officeReschedOutcome.total || 0) + 1;
      officeReschedOutcome.appointmentTypes[apptLabel] = (officeReschedOutcome.appointmentTypes[apptLabel] || 0) + 1;
      officeReschedOutcome.reasons[reasonKey] = (officeReschedOutcome.reasons[reasonKey] || 0) + 1;
      const officeReschedDetail = officeReschedOutcome.reasonDetails[reasonKey] || (officeReschedOutcome.reasonDetails[reasonKey] = { total:0, types:{} });
      officeReschedDetail.total += 1;
      officeReschedDetail.types[apptLabel] = (officeReschedDetail.types[apptLabel] || 0) + 1;
    }
    const actions = e.actions || {};
    Object.entries(actions).forEach(([k,v])=>{
      if (!sum.actionsByType[k]) sum.actionsByType[k] = { task:0, transfer:0 };
      if (v.task) { sum.actionsByType[k].task++; sum.tasks++; officeMetrics.tasksByType[k] = (officeMetrics.tasksByType[k] || 0) + 1; }
      if (v.transfer) { sum.actionsByType[k].transfer++; sum.transfers++; officeMetrics.transfersByType[k] = (officeMetrics.transfersByType[k] || 0) + 1; }
    });
    const confirmed = !!e.appointment?.confirmed;
    const confirmLabel = confirmed ? 'Confirmed' : 'Not Confirmed';
    sum.confirmations[confirmLabel] = (sum.confirmations[confirmLabel] || 0) + 1;
    officeMetrics.confirmations[confirmLabel] = (officeMetrics.confirmations[confirmLabel] || 0) + 1;
    if (e.appointment) e.appointment.confirmed = confirmed;
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
          const detailCount = Number(detail.count) || 0;
          const detailPct = Math.round((detailCount / Math.max(1, Number(item.count)||0)) * 100);
          const detailTotalPct = Math.round((detailCount / total) * 100);
          li.textContent = `${detail.label} — ${detailCount} (${detailPct}% of ${item.label}, ${detailTotalPct}% of Total)`;
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

function drawStackedMulti(canvasId, dataMap, { series=[], order=null, maxValue=null, formatValue=null }={}){
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
  const keys = (Array.isArray(order) && order.length) ? order.filter(k => k && Object.prototype.hasOwnProperty.call(dataMap, k)) : Object.keys(dataMap);
  if (!keys.length || !Array.isArray(series) || !series.length){ ctx.fillStyle='#9ca3af'; ctx.fillText('No data',8,20); return; }
  const totals = keys.map(key => {
    const bucket = dataMap[key] || {};
    return series.reduce((acc,s) => acc + (Number(bucket[s.key])||0), 0);
  });
  const computedMax = (typeof maxValue === 'number') ? (maxValue || 1) : Math.max(1, ...totals);
  const pad = 28; const gap = 12; const barW = Math.max(20, (width - pad*2 - gap*(keys.length-1)) / Math.max(keys.length,1));
  ctx.font = '12px system-ui'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
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
  const wrapped = keys.map(k => wrapLabel(k, barW));
  const maxLines = Math.max(1, ...wrapped.map(lines => lines.length));
  const labelArea = maxLines * 14 + 12;
  keys.forEach((key, idx) => {
    const bucket = dataMap[key] || {};
    const x = pad + idx * (barW + gap);
    const chartTop = 6; const chartBottom = height - labelArea - 4; const avail = Math.max(16, chartBottom - chartTop);
    let y = chartBottom;
    series.forEach(entry => {
      const value = Number(bucket[entry.key]) || 0;
      const h = Math.round((value / computedMax) * (avail - 20));
      if (h > 0) {
        ctx.fillStyle = entry.color || '#4b5563';
        const segmentY = y - h;
        ctx.fillRect(x, segmentY, barW, h);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111827';
        const labelText = formatValue ? formatValue(value, entry) : String(value);
        ctx.fillText(labelText, x + barW/2, Math.max(chartTop+10, segmentY - 4));
        ctx.textAlign = 'left';
        y = segmentY;
      }
    });
    ctx.fillStyle = '#374151';
    const lines = wrapped[idx];
    ctx.textAlign = 'center';
    lines.forEach((line, li) => {
      const ly = chartBottom + 14*(li+1);
      ctx.fillText(line, x + barW/2, ly);
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
  const totalSeriesValue = series.reduce((acc,item)=> acc + (Number(item.total)||0), 0) || 1;
  series.forEach(item => {
    const row = document.createElement('div');
    row.className = 'legend-item';
    row.title = item.label;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = item.color || '#4b5563';
    row.appendChild(swatch);
    const label = document.createElement('span');
    const totalText = typeof item.total === 'number' ? ` — ${item.total}` : '';
    label.textContent = `${item.label}${totalText}`;
    row.appendChild(label);
    const details = legendDetails[item.label] || legendDetails[item.key];
    if (Array.isArray(details) && details.length){
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
      details.forEach(detail => {
        const li = document.createElement('li');
        const pctOfBucket = typeof detail.pct === 'number' ? detail.pct : Math.round(((Number(detail.count)||0)/(Math.max(1, Number(item.total)||0)))*100);
        const pctOfTotal = typeof detail.pctTotal === 'number'
          ? detail.pctTotal
          : Math.round(((Number(detail.count)||0) / totalSeriesValue) * 100);
        li.textContent = `${detail.label} — ${detail.count} (${pctOfBucket}% of ${item.label}, ${pctOfTotal}% of Total)`;
        list.appendChild(li);
      });
      detailBox.appendChild(list);
      row.appendChild(detailBox);
      const setOpen = (open) => {
        if (open) row.setAttribute('data-open','true');
        else row.removeAttribute('data-open');
      };
      row.addEventListener('mouseenter', ()=>setOpen(true));
      row.addEventListener('mouseleave', ()=>setOpen(false));
      row.addEventListener('focus', ()=>setOpen(true));
      row.addEventListener('blur', ()=>setOpen(false));
      row.addEventListener('keydown', (evt)=>{
        if (evt.key === 'Escape'){
          setOpen(false);
          row.blur();
        }
      });
    }
    container.appendChild(row);
  });
}



function renderReasonDetails(containerId, detailMap, { labelForReason = (key) => String(key||'') } = {}){
  const container = document.getElementById(containerId);
  if (!container) return;
  const stateKey = containerId || 'default';
  const prevState = reasonDetailOpenState.get(stateKey) || new Set();
  const nextState = new Set(prevState);
  container.innerHTML = '';
  const entries = Object.entries(detailMap || {}).filter(([,detail]) => detail && detail.total).sort((a,b)=> (b[1].total||0) - (a[1].total||0));
  if (!entries.length){
    const empty = document.createElement('div');
    empty.className = 'reason-detail-empty muted';
    empty.textContent = 'No change reasons captured yet';
    container.appendChild(empty);
    return;
  }
  entries.forEach(([reasonKey, detail])=>{
    const item = document.createElement('details');
    item.className = 'reason-detail';
    if (prevState.has(reasonKey)) item.setAttribute('open','');
    const summary = document.createElement('summary');
    summary.innerHTML = `<span class="reason-detail-title">${labelForReason(reasonKey)}</span><span class="reason-count-badge">${detail.total}</span><span class="chevron">▾</span>`;
    item.appendChild(summary);
    const body = document.createElement('div');
    body.className = 'reason-detail-body';
    const list = document.createElement('ul');
    list.className = 'reason-detail-list';
    const typeEntries = Object.entries(detail.types || {}).filter(([,count]) => Number(count)||0).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
    const total = detail.total || 1;
    typeEntries.slice(0,8).forEach(([label,count])=>{
      const li = document.createElement('li');
      const pct = Math.round((Number(count)||0) / total * 100);
      li.textContent = `${label} — ${count} (${pct}%)`;
      list.appendChild(li);
    });
    body.appendChild(list);
    item.appendChild(body);
    item.addEventListener('toggle', () => {
      if (item.open) nextState.add(reasonKey);
      else nextState.delete(reasonKey);
      reasonDetailOpenState.set(stateKey, new Set(nextState));
    });
    container.appendChild(item);
  });
  reasonDetailOpenState.set(stateKey, new Set(Array.from(nextState).filter(key => detailMap && Object.prototype.hasOwnProperty.call(detailMap, key))));
}



function buildStackFromEntryMap(entryMap, topN, formatReason){
  const totalsByLabel = new Map();
  let overallTotal = 0;

  entryMap.forEach(entries => {
    entries.forEach(entry => {
      const value = Number(entry.count) || 0;
      if (!value) return;
      overallTotal += value;
      const existing = totalsByLabel.get(entry.label) || {
        count: 0,
        priorityRank: entry.priorityRank ?? 9999,
        category: entry.category,
        categoryKey: entry.categoryKey,
        baseLabel: entry.baseLabel
      };
      existing.count += value;
      existing.priorityRank = Math.min(existing.priorityRank, entry.priorityRank ?? existing.priorityRank);
      if (!existing.category && entry.category) existing.category = entry.category;
      if (!existing.categoryKey && entry.categoryKey) existing.categoryKey = entry.categoryKey;
      if (!existing.baseLabel && entry.baseLabel) existing.baseLabel = entry.baseLabel;
      totalsByLabel.set(entry.label, existing);
    });
  });

  if (!overallTotal) return { dataMap:{}, series:[], order:[], legendDetails:{}, total:0 };

  const sorted = Array.from(totalsByLabel.entries()).map(([label, info]) => ({
    label,
    count: info.count || 0,
    priorityRank: info.priorityRank ?? 9999,
    category: info.category || 'Other',
    categoryKey: info.categoryKey || 'other',
    baseLabel: info.baseLabel || label
  })).sort((a,b)=>{
    const rankDiff = (a.priorityRank||0) - (b.priorityRank||0);
    if (rankDiff !== 0) return rankDiff;
    const countDiff = (b.count||0) - (a.count||0);
    if (countDiff !== 0) return countDiff;
    return String(a.label||'').localeCompare(String(b.label||''));
  });

  const topLabels = sorted.slice(0, topN).map(item => item.label);
  const includeOther = sorted.length > topN;
  const otherEntries = includeOther ? sorted.slice(topN) : [];
  const otherTotal = otherEntries.reduce((acc,item)=> acc + (item.count||0), 0);
  const seriesKeys = includeOther ? [...topLabels, 'Other'] : [...topLabels];
  const series = seriesKeys.map((label, idx) => {
    if (label === 'Other') {
      return {
        key: 'Other',
        label: 'Other',
        color: STACK_TYPE_COLORS[idx % STACK_TYPE_COLORS.length],
        total: otherTotal,
        category: 'Other',
        categoryKey: 'other'
      };
    }
    const meta = totalsByLabel.get(label) || {};
    return {
      key: label,
      label,
      color: STACK_TYPE_COLORS[idx % STACK_TYPE_COLORS.length],
      total: meta.count || 0,
      category: meta.category || 'Other',
      categoryKey: meta.categoryKey || 'other',
      baseLabel: meta.baseLabel || label
    };
  });

  const dataMap = {};
  const reasonOrder = [];
  entryMap.forEach((entries, reasonKey) => {
    const formattedReason = formatReason(reasonKey);
    const bucket = {};
    seriesKeys.forEach(key => { bucket[key] = 0; });
    let reasonTotal = 0;
    entries.forEach(entry => {
      const value = Number(entry.count) || 0;
      if (!value) return;
      let target = entry.label;
      if (!topLabels.includes(target)) {
        target = includeOther ? 'Other' : target;
      }
      bucket[target] = (bucket[target] || 0) + value;
      reasonTotal += value;
    });
    if (reasonTotal > 0) {
      dataMap[formattedReason] = bucket;
      reasonOrder.push({ label: formattedReason, total: reasonTotal });
    }
  });
  const order = reasonOrder.sort((a,b)=> (b.total||0) - (a.total||0)).map(item => item.label);

  const legendDetails = {};
  if (includeOther && otherEntries.length){
    legendDetails.Other = otherEntries.map(item => {
      const count = Number(item.count) || 0;
      const pct = otherTotal ? Math.round((count / otherTotal) * 100) : 0;
      const pctTotal = overallTotal ? Math.round((count / overallTotal) * 100) : 0;
      return { label: item.label, count, pct, pctTotal };
    });
  }

  return { dataMap, series, order, legendDetails, total: overallTotal };
}

function buildReasonTypeStack(detailMap, { topN = 6, formatReason = (key) => String(key||'') } = {}){
  const aggregatedPerReason = new Map();
  Object.entries(detailMap || {}).forEach(([reasonKey, detail]) => {
    const aggregated = aggregateTypeCounts(detail?.types || {});
    if (aggregated.length) aggregatedPerReason.set(reasonKey, aggregated);
  });

  const overallStack = buildStackFromEntryMap(aggregatedPerReason, topN, formatReason);
  const categoryStacks = {};
  const categoryTotals = { all: overallStack.total || 0 };
  ['medical','laser','cosmetic'].forEach(catKey => {
    const filteredMap = new Map();
    aggregatedPerReason.forEach((entries, reasonKey) => {
      const filteredEntries = entries.filter(entry => entry.categoryKey === catKey);
      if (filteredEntries.length) filteredMap.set(reasonKey, filteredEntries);
    });
    const stackForCategory = buildStackFromEntryMap(filteredMap, topN, formatReason);
    categoryStacks[catKey] = stackForCategory;
    categoryTotals[catKey] = stackForCategory.total || 0;
  });

  overallStack.categoryStacks = categoryStacks;
  overallStack.categoryTotals = categoryTotals;
  return overallStack;
}

function getStackForCategory(stack, categoryKey){
  if (!stack || typeof stack !== 'object') return { dataMap:{}, series:[], order:[], legendDetails:{}, total:0 };
  if (!categoryKey || categoryKey === 'all') return stack;
  const scoped = stack.categoryStacks?.[categoryKey];
  if (scoped && Array.isArray(scoped.series)) return scoped;
  return scoped || { dataMap:{}, series:[], order:[], legendDetails:{}, total:0 };
}

function filterDetailMapByCategory(detailMap, categoryKey){
  if (!categoryKey || categoryKey === 'all') return detailMap;
  const result = {};
  Object.entries(detailMap || {}).forEach(([reasonKey, detail]) => {
    const aggregated = aggregateTypeCounts(detail?.types || {});
    const filteredEntries = aggregated.filter(entry => entry.categoryKey === categoryKey);
    if (!filteredEntries.length) return;
    const types = {};
    let total = 0;
    filteredEntries.forEach(entry => {
      types[entry.label] = (types[entry.label] || 0) + entry.count;
      total += entry.count;
    });
    result[reasonKey] = { total, types };
  });
  return result;
}

function filterReasonMapByCategory(target, categoryKey){
  if (!categoryKey || categoryKey === 'all') return target.reasonMap || {};
  const scopedDetailMap = filterDetailMapByCategory(target.detailMap || {}, categoryKey);
  const map = {};
  Object.entries(scopedDetailMap).forEach(([reasonKey, detail]) => {
    map[reasonKey] = Number(detail.total) || 0;
  });
  return map;
}

function categoryLabelForKey(key){
  return CATEGORY_LABELS[key] || CATEGORY_LABELS.other;
}

function initializeTableFilters(){
  if (!tableFiltersEl) return;
  tableFiltersEl.addEventListener('click', (evt) => {
    const btn = evt.target.closest('.table-filter-btn');
    if (!btn) return;
    const filter = btn.dataset.filter || 'all';
    if (filter === CURRENT_TABLE_FILTER) return;
    CURRENT_TABLE_FILTER = filter;
    tableFiltersEl.querySelectorAll('.table-filter-btn').forEach(el => {
      const isActive = (el.dataset.filter || 'all') === filter;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderTable();
  });
}

function getTopEntry(map, labelFormatter = (label) => String(label || '')){
  const entries = Object.entries(map || {}).filter(([,count]) => (Number(count)||0) > 0);
  if (!entries.length) return null;
  entries.sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
  const [label, count] = entries[0];
  return { label: labelFormatter(label), count: Number(count)||0 };
}

function renderInsightList(listEl, entries){
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!entries || !entries.length){
    const li = document.createElement('li');
    li.className = 'insight-empty';
    li.textContent = 'Not enough data yet.';
    listEl.appendChild(li);
    return;
  }
  entries.forEach(({ label, count, pct }) => {
    const li = document.createElement('li');
    const labelSpan = document.createElement('span');
    labelSpan.className = 'insight-label';
    labelSpan.textContent = label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'insight-value';
    valueSpan.textContent = pct !== undefined ? `${count} (${pct}%)` : String(count);
    li.append(labelSpan, valueSpan);
    listEl.appendChild(li);
  });
}

function gatherTopAppointments(typeMap, limit = 4){
  const entries = Object.entries(typeMap || {}).filter(([,val]) => (Number(val)||0) > 0).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
  const total = entries.reduce((acc,[,val]) => acc + (Number(val)||0), 0) || 1;
  return entries.slice(0, limit).map(([label,count]) => ({ label, count: Number(count)||0, pct: Math.round((Number(count)||0)/total*100) }));
}

function gatherTopReasons(reasonMap, limit = 4){
  const entries = Object.entries(reasonMap || {}).filter(([,val]) => (Number(val)||0) > 0).sort((a,b)=> (Number(b[1])||0) - (Number(a[1])||0));
  const total = entries.reduce((acc,[,val]) => acc + (Number(val)||0), 0) || 1;
  return entries.slice(0, limit).map(([label,count]) => ({ label: prettyReasonLabel(label), count: Number(count)||0, pct: Math.round((Number(count)||0)/total*100) }));
}


function gatherOfficeHighlights(summary){
  const breakdown = summary?.byOffice || {};
  const offices = [...new Set([...OFFICE_KEYS, ...Object.keys(breakdown)])];
  return offices.map(office => {
    const bucket = breakdown[office] || {};
    const scheduled = Number(bucket.outcomes?.scheduled?.total) || 0;
    const rescheduled = Number(bucket.outcomes?.rescheduled?.total) || 0;
    const cancelled = Number(bucket.outcomes?.cancelled?.total) || 0;
    const topReason = getTopEntry(bucket.outcomes?.cancelled?.reasons || {}, prettyReasonLabel);
    return { office, scheduled, rescheduled, cancelled, topReason };
  }).filter(entry => (entry.scheduled||entry.rescheduled||entry.cancelled||entry.topReason)).sort((a,b)=> (b.scheduled||0) - (a.scheduled||0));
}

function renderOfficeList(listEl, entries){
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!entries || !entries.length){
    const li = document.createElement('li');
    li.className = 'insight-empty';
    li.textContent = 'Not enough data yet.';
    listEl.appendChild(li);
    return;
  }
  entries.forEach(entry => {
    const li = document.createElement('li');
    const header = document.createElement('div');
    header.className = 'insight-label';
    header.innerHTML = `<strong>${entry.office}</strong> — ${entry.scheduled} scheduled · ${entry.rescheduled} rescheduled · ${entry.cancelled} cancelled`;
    const sub = document.createElement('div');
    sub.className = 'insight-subtext';
    sub.textContent = entry.topReason ? `Top cancel reason: ${entry.topReason.label} (${entry.topReason.count})` : 'Top cancel reason: —';
    li.append(header, sub);
    listEl.appendChild(li);
  });
}

function renderInsights(sum, sumAll){
  if (!insightShellEl) return;
  if (!sum || !sum.total){
    renderInsightList(insightScheduledListEl, []);
    renderInsightList(insightCancelListEl, []);
    renderInsightList(insightReschedListEl, []);
    renderInsightList(insightNoApptListEl, []);
    renderOfficeList(insightOfficeListEl, []);
    if (insightScheduledTotalEl) insightScheduledTotalEl.textContent = '0';
    if (insightCancelTotalEl) insightCancelTotalEl.textContent = '0';
    if (insightReschedTotalEl) insightReschedTotalEl.textContent = '0';
    if (insightNoApptTotalEl) insightNoApptTotalEl.textContent = '0';
    if (insightOfficeTotalEl) insightOfficeTotalEl.textContent = '0';
    return;
  }
  const scheduledEntries = gatherTopAppointments(sum.appointmentTypesByOutcome?.scheduled, 5);
  const cancelEntries = gatherTopAppointments(sum.appointmentTypesByOutcome?.cancellation, 5);
  const reschedEntries = gatherTopAppointments(sum.appointmentTypesByOutcome?.reschedule, 5);
  const cancelReasons = gatherTopReasons(sum.cancelReasons, 3);
  const reschedReasons = gatherTopReasons(sum.reschedReasons, 3);
  const noApptReasons = gatherTopReasons(sum.noApptReasons, 3);
  const officeHighlights = gatherOfficeHighlights(sumAll || sum);

  const scheduledTotal = scheduledEntries.reduce((acc,item)=> acc + item.count, 0);
  const cancelTotal = sum.cancel || cancelEntries.reduce((acc,item)=> acc + item.count, 0);
  const reschedTotal = sum.resched || reschedEntries.reduce((acc,item)=> acc + item.count, 0);
  const noApptTotal = totalFromMap(sum.appointmentTypesByOutcome?.noAppointment);
  const officeScheduledTotal = officeHighlights.reduce((acc,item)=> acc + (item.scheduled || 0), 0);

  if (insightScheduledTotalEl) insightScheduledTotalEl.textContent = String(scheduledTotal);
  if (insightCancelTotalEl) insightCancelTotalEl.textContent = String(cancelTotal);
  if (insightReschedTotalEl) insightReschedTotalEl.textContent = String(reschedTotal);
  if (insightNoApptTotalEl) insightNoApptTotalEl.textContent = String(noApptTotal);
  if (insightOfficeTotalEl) insightOfficeTotalEl.textContent = String(officeScheduledTotal);

  renderInsightList(insightScheduledListEl, scheduledEntries);

  const cancelCombined = [];
  cancelEntries.slice(0,3).forEach(entry => {
    cancelCombined.push({ label: entry.label, count: entry.count, pct: entry.pct });
  });
  cancelReasons.slice(0,3).forEach(entry => {
    cancelCombined.push({ label: `Reason · ${entry.label}`, count: entry.count, pct: entry.pct });
  });
  renderInsightList(insightCancelListEl, cancelCombined);

  const reschedCombined = [];
  reschedEntries.slice(0,3).forEach(entry => {
    reschedCombined.push({ label: entry.label, count: entry.count, pct: entry.pct });
  });
  reschedReasons.slice(0,3).forEach(entry => {
    reschedCombined.push({ label: `Reason · ${entry.label}`, count: entry.count, pct: entry.pct });
  });
  renderInsightList(insightReschedListEl, reschedCombined);

  renderInsightList(insightNoApptListEl, noApptReasons);
  renderOfficeList(insightOfficeListEl, officeHighlights);
}

function totalFromMap(map){
  return Object.values(map || {}).reduce((acc,val) => acc + (Number(val)||0), 0);
}

const makeOutcomeBucket = () => ({
  total: 0,
  appointmentTypes: {},
  reasons: {},
  reasonDetails: {}
});

function createOfficeBucket(){
  return {
    outcomes: {
      scheduled: { total:0, appointmentTypes:{} },
      rescheduled: makeOutcomeBucket(),
      cancelled: makeOutcomeBucket(),
      noAppointment: makeOutcomeBucket()
    },
    hours: {},
    confirmations: { Confirmed:0, 'Not Confirmed':0 },
    cancelReasons: {},
    reschedReasons: {},
    noApptReasons: {},
    tasksByType: {},
    transfersByType: {}
  };
}

function officeList(byOffice = {}){
  const extras = Object.keys(byOffice).filter(name => !OFFICE_KEYS.includes(name));
  const combined = [...OFFICE_KEYS, ...extras];
  return combined.filter((name, idx) => combined.indexOf(name) === idx && byOffice[name]);
}

function officeSeries(offices){
  return offices.map((office, idx) => ({
    key: office,
    label: office,
    color: OFFICE_COLORS[idx % OFFICE_COLORS.length]
  }));
}

function buildOfficeTypeStack(byOffice, outcomeKey){
  const offices = officeList(byOffice);
  const dataMap = {};
  const included = new Set();
  offices.forEach((office)=>{
    const bucket = byOffice[office];
    if (!bucket) return;
    const outcome = bucket.outcomes?.[outcomeKey] || {};
    Object.entries(outcome.appointmentTypes || {}).forEach(([type,count])=>{
      const value = Number(count) || 0;
      if (!value) return;
      (dataMap[type] ||= {})[office] = ((dataMap[type] || {})[office] || 0) + value;
      included.add(office);
    });
  });
  const order = Object.entries(dataMap).map(([label,map])=>({
    label,
    total: Object.values(map).reduce((acc,val)=>acc + (Number(val)||0), 0)
  })).filter(item => item.total > 0).sort((a,b)=>b.total - a.total).map(item => item.label);
  return { dataMap, series: officeSeries(offices.filter(o => included.has(o))), order };
}

function buildOfficeReasonStack(byOffice, outcomeKey){
  const offices = officeList(byOffice);
  const dataMap = {};
  const included = new Set();
  offices.forEach((office)=>{
    const bucket = byOffice[office];
    if (!bucket) return;
    const outcome = bucket.outcomes?.[outcomeKey] || {};
    Object.entries(outcome.reasons || {}).forEach(([reason,count])=>{
      const value = Number(count) || 0;
      if (!value) return;
      (dataMap[reason] ||= {})[office] = ((dataMap[reason] || {})[office] || 0) + value;
      included.add(office);
    });
  });
  const order = Object.entries(dataMap).map(([label,map])=>({
    label,
    total: Object.values(map).reduce((acc,val)=>acc + (Number(val)||0), 0)
  })).filter(item => item.total > 0).sort((a,b)=>b.total - a.total).map(item => item.label);
  return { dataMap, series: officeSeries(offices.filter(o => included.has(o))), order };
}

function buildOfficeHoursStack(byOffice, hoursOrder){
  const offices = officeList(byOffice);
  const dataMap = {};
  const included = new Set();
  offices.forEach((office)=>{
    const bucket = byOffice[office];
    if (!bucket) return;
    const hours = bucket.hours || {};
    hoursOrder.forEach(hour=>{
      const value = Number(hours[hour] || 0);
      if (!value) return;
      (dataMap[hour] ||= {})[office] = ((dataMap[hour] || {})[office] || 0) + value;
      included.add(office);
    });
  });
  hoursOrder.forEach(hour => { dataMap[hour] = dataMap[hour] || {}; });
  return { dataMap, series: officeSeries(offices.filter(o => included.has(o))), order: hoursOrder };
}

function buildOfficeConfirmationStack(byOffice){
  const offices = officeList(byOffice);
  const labels = ['Confirmed','Not Confirmed'];
  const dataMap = { Confirmed:{}, 'Not Confirmed':{} };
  const included = new Set();
  offices.forEach((office)=>{
    const bucket = byOffice[office];
    if (!bucket) return;
    const confirmations = bucket.confirmations || {};
    labels.forEach(label=>{
      const value = Number(confirmations[label] || 0);
      if (!value) return;
      dataMap[label][office] = (dataMap[label][office] || 0) + value;
      included.add(office);
    });
  });
  return { dataMap, series: officeSeries(offices.filter(o => included.has(o))), order: labels };
}

function buildOfficeCategoryStack(byOffice, accessor){
  const offices = officeList(byOffice);
  const dataMap = {};
  const included = new Set();
  offices.forEach((office)=>{
    const bucket = byOffice[office];
    if (!bucket) return;
    const dataset = accessor(bucket) || {};
    Object.entries(dataset).forEach(([label,count])=>{
      const value = Number(count) || 0;
      if (!value) return;
      (dataMap[label] ||= {})[office] = ((dataMap[label] || {})[office] || 0) + value;
      included.add(office);
    });
  });
  const order = Object.entries(dataMap).map(([label,map])=>({
    label,
    total: Object.values(map).reduce((acc,val)=>acc + (Number(val)||0), 0)
  })).filter(item => item.total > 0).sort((a,b)=>b.total - a.total).map(item => item.label);
  return { dataMap, series: officeSeries(offices.filter(o => included.has(o))), order };
}

// --- Listen for new submissions from screenpop ---
(function(){
  // Listen for BroadcastChannel events
  try {
    const ch = new BroadcastChannel('screenpop-analytics');
    ch.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'submit' && e.data.entry) {
        handleScreenpopSubmission(e.data.entry);
      }
    });
  } catch {}
  // Listen for localStorage events (storage event only fires in other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('screenpop_submit_') && e.newValue) {
      try {
        const entry = JSON.parse(e.newValue);
        handleScreenpopSubmission(entry);
        // Optionally remove the key after processing
        localStorage.removeItem(e.key);
      } catch {}
    }
  });
  // Helper to handle new submission
  function handleScreenpopSubmission(entry) {
    // Add to ledger and update UI
    try {
      const LEDGER_KEY = 'screenpop_ledger_v1';
      const ledger = JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]');
      if (!Array.isArray(ledger) || !ledger.find(e => e && e.id === entry.id)) {
        ledger.unshift(entry);
        localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
      }
    } catch {}
    // Optionally, trigger a UI refresh if needed
    if (typeof window.refreshAnalyticsView === 'function') {
      window.refreshAnalyticsView();
    } else {
      // Fallback: reload the page (not ideal, but ensures update)
      // location.reload();
    }
  }
})();

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
const officeToggle = document.getElementById('officeFilter');
const officeButtons = officeToggle ? Array.from(officeToggle.querySelectorAll('button[data-office]')) : [];

function applyOfficeState(selected){
  officeButtons.forEach(btn => {
    const value = btn?.dataset?.office || 'all';
    const isActive = value === selected;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function setOffice(value){
  const next = value || 'all';
  if (SELECTED_OFFICE === next) return;
  SELECTED_OFFICE = next;
  applyOfficeState(SELECTED_OFFICE);
  renderTable();
  updateKpisAndCharts();
}

if (officeButtons.length){
  officeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn?.dataset?.office || 'all';
      setOffice(value);
    });
  });
  applyOfficeState(SELECTED_OFFICE);
}

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
// Periodic refresh as a safety-net (also pulls any pending storage writes)
setInterval(()=>{ importPendingSubmissions(); renderTable(); updateKpisAndCharts(); }, 2000);
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
  if (url.searchParams.get('openScreenpop') === '1' || url.searchParams.get('screenpop') === '1') {
    setTimeout(() => launchScreenpop({ focus: false }), 100);
  }
  setView('daily');
  initializeOutcomeTabs();
  initializeOutcomeChartToggle();
  initializeTableFilters();
} catch {}
