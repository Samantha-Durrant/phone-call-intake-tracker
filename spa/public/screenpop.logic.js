// Session-aware CRM logic for deriving screenpop state from EMA-like events/snapshots
// Non-breaking: wraps around ScreenpopAPI and centralizes rules
(function(){
  const DEFAULT_STALENESS_MS = 5 * 60 * 1000; // 5 minutes
  const STATE = {
    sessionId: null,
    acceptBackground: true,
    stalenessMs: DEFAULT_STALENESS_MS,
    lastAppliedAt: 0,
  };

  function now(){ return Date.now(); }
  function isStale(ts){ return typeof ts === 'number' && (now() - ts) > STATE.stalenessMs; }

  function deriveScheduled(appointments){
    if (!Array.isArray(appointments)) return undefined;
    // Consider scheduled if any active appointment remains
    const activeStatuses = new Set(['scheduled','booked','confirmed','rescheduled','tentative']);
    return appointments.some(a => activeStatuses.has(String(a.status || '').toLowerCase()));
  }

  function mapChangeType(type){
    switch(String(type||'').toLowerCase()){
      case 'cancel':
      case 'cancellation': return 'cancellation';
      case 'reschedule': return 'reschedule';
      case 'book':
      case 'confirm':
      default: return 'none';
    }
  }

  function applyDerived({ scheduled, change, reason, reasons, otherText, apptType, office }){
    const update = {};
    if (typeof scheduled === 'boolean') update.scheduled = scheduled;
    if (change) update.change = change;
    if (Array.isArray(reasons) && reasons.length) {
      update.reasons = reasons;
      if (!reason && reasons.length) update.reason = reasons[0];
    } else if (reason) {
      update.reason = reason;
    }
    if (otherText) update.otherText = otherText;
    if (typeof apptType === 'string') update.apptType = apptType;
    if (typeof office === 'string') update.office = office;
    if (Object.keys(update).length) {
      window.ScreenpopAPI?.applyAppointment(update);
      STATE.lastAppliedAt = now();
    }
  }

  function shouldApply({ sessionId, occurredAt }){
    if (sessionId && STATE.sessionId && sessionId !== STATE.sessionId) {
      return !!STATE.acceptBackground; // only accept if background updates are allowed
    }
    if (occurredAt && isStale(occurredAt)) return false; // too old
    return true;
  }

  window.ScreenpopLogic = {
    configure({ sessionId, acceptBackground, stalenessMs } = {}){
      if (sessionId) STATE.sessionId = sessionId;
      if (typeof acceptBackground === 'boolean') STATE.acceptBackground = acceptBackground;
      if (typeof stalenessMs === 'number') STATE.stalenessMs = stalenessMs;
    },
    // Full CRM snapshot: { appointments: [{status}], lastChange?: {type, reason, reasons?, otherText}, occurredAt?, sessionId? }
    processCrmSnapshot(snapshot = {}){
      if (!shouldApply(snapshot)) return;
      const scheduled = deriveScheduled(snapshot.appointments);
      const change = mapChangeType(snapshot.lastChange?.type);
      applyDerived({
        scheduled,
        change,
        reason: snapshot.lastChange?.reason,
        reasons: snapshot.lastChange?.reasons,
        otherText: snapshot.lastChange?.otherText,
        apptType: snapshot.lastChange?.apptType ?? snapshot.lastChange?.appointmentType ?? snapshot.lastChange?.typeName,
        office: snapshot.lastChange?.office ?? snapshot.office ?? snapshot.location
      });
    },
    // Event-only updates: { type, appointments?, remainingScheduled?, reason?, reasons?, otherText?, occurredAt?, sessionId? }
    processCrmEvent(evt = {}){
      if (!shouldApply(evt)) return;
      let scheduled;
      if (Array.isArray(evt.appointments)) {
        scheduled = deriveScheduled(evt.appointments);
      } else if (typeof evt.remainingScheduled === 'number') {
        scheduled = evt.remainingScheduled > 0;
      } else if (String(evt.type).toLowerCase() === 'cancel') {
        // If only one appointment before and it was cancelled => presume none scheduled
        // Caller should prefer passing appointments/remainingScheduled when possible
        scheduled = false;
      }
      const change = mapChangeType(evt.type);
      applyDerived({
        scheduled,
        change,
        reason: evt.reason,
        reasons: evt.reasons,
        otherText: evt.otherText,
        apptType: evt.apptType ?? evt.appointmentType ?? evt.typeName,
        office: evt.office ?? evt.location
      });
    }
  };
})();
