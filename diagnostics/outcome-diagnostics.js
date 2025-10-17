#!/usr/bin/env node

/**
 * Lightweight diagnostic script to verify appointment outcome transformations.
 * Mirrors the analytics data shaping logic so we can assert that each call
 * scenario produces the expected normalized payload for dashboards/exports.
 *
 * Run with `node diagnostics/outcome-diagnostics.js`.
 */

function normalizeReasonKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const CRM_CANCEL_REASON_LABELS = [
  'Patient Scheduling Error',
  'Patient Transportation Issue',
  'Provider Requested Change',
  'Traffic',
  'Unknown',
  'Weather',
  'Office Scheduling Error',
  'Patient Arrived Late',
  'Patient Cancelled',
  'Patient Deceased',
  'Patient Forgot',
  'Patient is Sick',
  'Patient Left',
  'Childcare Issue',
  'Conflicting Appointment',
  'COVID-19',
  'Family Emergency',
  'No Longer Needs Appointment',
  'No Referral/Authorization',
  'Office Rescheduled',
  'Work or School Conflict'
];

const CRM_CANCEL_REASON_LOOKUP = CRM_CANCEL_REASON_LABELS.reduce((acc, label) => {
  acc[normalizeReasonKey(label)] = label;
  return acc;
}, {});

const CRM_CANCEL_REASON_SYNONYMS = {
  no_longer_needed: 'No Longer Needs Appointment',
  no_longer_need: 'No Longer Needs Appointment',
  illness_family_emergency: 'Family Emergency',
  family_emergency: 'Family Emergency',
  illness: 'Patient is Sick',
  patient_sick: 'Patient is Sick',
  sick: 'Patient is Sick',
  work_school_conflict: 'Work or School Conflict',
  work_or_school_conflict: 'Work or School Conflict',
  work_school: 'Work or School Conflict',
  insurance: 'No Referral/Authorization',
  referral: 'No Referral/Authorization',
  authorization: 'No Referral/Authorization',
  no_referral: 'No Referral/Authorization',
  no_authorization: 'No Referral/Authorization',
  no_referral_authorization: 'No Referral/Authorization',
  patient_cancelled: 'Patient Cancelled',
  patient_canceled: 'Patient Cancelled',
  patient_cancel: 'Patient Cancelled',
  provider_change: 'Provider Requested Change',
  provider_requested: 'Provider Requested Change',
  provider_requested_change: 'Provider Requested Change',
  transportation: 'Patient Transportation Issue',
  patient_transportation: 'Patient Transportation Issue',
  scheduling_error: 'Patient Scheduling Error',
  patient_error: 'Patient Scheduling Error',
  office_error: 'Office Scheduling Error',
  covid: 'COVID-19',
  covid19: 'COVID-19',
  covid_19: 'COVID-19'
};

function mapCancellationReason(value) {
  const key = normalizeReasonKey(value);
  if (!key) return '';
  if (CRM_CANCEL_REASON_LOOKUP[key]) return CRM_CANCEL_REASON_LOOKUP[key];
  if (CRM_CANCEL_REASON_SYNONYMS[key]) return CRM_CANCEL_REASON_SYNONYMS[key];
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeTypeAndOffice(appt) {
  const type = String(appt?.type || '').trim();
  const office = String(appt?.office || '').trim();
  return { apptType: type, office };
}

function normalizeOutcomeEvent(outcome = {}, entry = {}) {
  const appointment = entry.appointment || {};
  const typeRaw = String(outcome.type || outcome.change || outcome.outcome || '').toLowerCase();
  let type;
  switch (typeRaw) {
    case 'cancel':
    case 'cancellation':
      type = 'cancellation';
      break;
    case 'reschedule':
      type = 'reschedule';
      break;
    case 'question_only':
    case 'question':
      type = 'question_only';
      break;
    case 'no_change':
    case 'no_appointment':
    case 'no appointment':
    case 'no_show':
      type = 'no_appointment';
      break;
    default:
      type = null;
  }
  const reasons = Array.isArray(outcome.reasons)
    ? outcome.reasons.map(r => String(r || '').trim()).filter(Boolean)
    : [];
  const reasonRaw = String(outcome.reason ?? outcome.reasonRaw ?? outcome.reason_raw ?? (reasons[0] || appointment.reason || '')).trim();
  if (!reasons.length && reasonRaw) reasons.push(reasonRaw);
  const noApptReasonsList = Array.isArray(outcome.noAppointmentReasons || outcome.no_appointment_reasons)
    ? (outcome.noAppointmentReasons || outcome.no_appointment_reasons).map(r => String(r || '').trim()).filter(Boolean)
    : [];
  if (!type) {
    if (outcome.questionOnly || outcome.question_only || appointment.questionOnly) {
      type = 'question_only';
    } else if (noApptReasonsList.length || (Array.isArray(appointment.noAppointmentReasons) && appointment.noAppointmentReasons.length)) {
      type = 'no_appointment';
    } else if ((appointment.change || '').toLowerCase() === 'cancellation') {
      type = 'cancellation';
    } else if ((appointment.change || '').toLowerCase() === 'reschedule') {
      type = 'reschedule';
    } else {
      type = 'other';
    }
  }
  const questionOnly = type === 'question_only' || !!(outcome.questionOnly || outcome.question_only || appointment.questionOnly);
  const noApptReasons = [...noApptReasonsList];
  if (questionOnly && !noApptReasons.includes('Question Only')) {
    noApptReasons.unshift('Question Only');
  }
  const reasonMapped = (type === 'cancellation' || type === 'reschedule')
    ? mapCancellationReason(reasonRaw || reasons[0] || appointment.reason || '')
    : (questionOnly ? 'Question Only' : (reasonRaw || ''));
  const metadata = outcome.metadata && typeof outcome.metadata === 'object'
    ? { ...outcome.metadata }
    : (outcome.meta && typeof outcome.meta === 'object'
      ? { ...outcome.meta }
      : (appointment.metadata && typeof appointment.metadata === 'object' ? { ...appointment.metadata } : {}));
  return {
    type,
    scheduled: type === 'reschedule'
      ? true
      : (typeof outcome.scheduled === 'boolean'
        ? outcome.scheduled
        : (typeof appointment.scheduled === 'boolean' ? appointment.scheduled : false)),
    reasons,
    reasonRaw,
    reasonMapped,
    otherText: outcome.otherText || outcome.other_text || appointment.otherText || '',
    noAppointmentReasons: noApptReasons,
    questionOnly,
    appointmentId: outcome.appointmentId || outcome.appointment_id || appointment.appointmentId || '',
    previousAppointmentId: outcome.previousAppointmentId || outcome.previous_appointment_id || outcome.originalAppointmentId || outcome.oldAppointmentId || appointment.previousAppointmentId || '',
    newAppointmentId: outcome.newAppointmentId || outcome.new_appointment_id || appointment.newAppointmentId || '',
    reschedulePairId: outcome.reschedulePairId || outcome.reschedule_pair_id || appointment.reschedulePairId || '',
    reasonCode: outcome.reasonCode || outcome.reason_code || outcome.crmReasonCode || appointment.reasonCode || '',
    metadata
  };
}

function legacyOutcomeFromEntry(entry) {
  const appt = entry?.appointment || {};
  return normalizeOutcomeEvent({
    type: appt.change,
    scheduled: appt.scheduled,
    reasons: Array.isArray(appt.reasons) ? appt.reasons : (appt.reason ? [appt.reason] : []),
    reason: appt.reason,
    noAppointmentReasons: appt.noAppointmentReasons,
    questionOnly: appt.questionOnly,
    otherText: appt.otherText,
    appointmentId: appt.appointmentId,
    previousAppointmentId: appt.previousAppointmentId,
    newAppointmentId: appt.newAppointmentId,
    reschedulePairId: appt.reschedulePairId,
    reasonCode: appt.reasonCode,
    metadata: appt.metadata
  }, entry);
}

function buildOutcomeEntry(entry, outcome, index) {
  const normalized = normalizeOutcomeEvent(outcome, entry);
  const appointment = { ...(entry.appointment || {}) };
  const change = (() => {
    switch (normalized.type) {
      case 'cancellation': return 'cancellation';
      case 'reschedule': return 'reschedule';
      case 'question_only':
      case 'no_appointment':
        return 'none';
      default:
        return String(appointment.change || 'none').toLowerCase();
    }
  })();
  appointment.change = change;
  appointment.scheduled = normalized.type === 'reschedule'
    ? true
    : (typeof normalized.scheduled === 'boolean' ? normalized.scheduled : !!appointment.scheduled);
  appointment.reason = normalized.reasonRaw || appointment.reason || '';
  appointment.reasons = normalized.reasons.length ? normalized.reasons : (Array.isArray(appointment.reasons) ? appointment.reasons : (appointment.reason ? [appointment.reason] : []));
  appointment.reasonMapped = normalized.reasonMapped || mapCancellationReason(appointment.reason || normalized.reasonRaw);
  appointment.reasonCode = normalized.reasonCode || appointment.reasonCode || '';
  const noAppt = normalized.noAppointmentReasons.length
    ? normalized.noAppointmentReasons
    : (Array.isArray(appointment.noAppointmentReasons) ? appointment.noAppointmentReasons : []);
  appointment.noAppointmentReasons = Array.from(new Set(noAppt)).filter(Boolean);
  appointment.questionOnly = normalized.questionOnly || appointment.questionOnly || appointment.noAppointmentReasons.includes?.('Question Only') || false;
  if (appointment.questionOnly && !appointment.noAppointmentReasons.includes('Question Only')) {
    appointment.noAppointmentReasons.unshift('Question Only');
  }
  appointment.otherText = normalized.otherText || appointment.otherText || '';
  appointment.appointmentId = normalized.appointmentId || appointment.appointmentId || '';
  appointment.previousAppointmentId = normalized.previousAppointmentId || appointment.previousAppointmentId || '';
  appointment.newAppointmentId = normalized.newAppointmentId || appointment.newAppointmentId || '';
  appointment.reschedulePairId = normalized.reschedulePairId || appointment.reschedulePairId || '';
  appointment.metadata = { ...(appointment.metadata || {}), ...(normalized.metadata || {}) };
  appointment.outcomeType = normalized.type;
  appointment.outcomeScheduled = normalized.scheduled;
  const norm = normalizeTypeAndOffice(appointment);
  if (norm.apptType) appointment.type = norm.apptType;
  if (norm.office) appointment.office = norm.office;
  return {
    ...entry,
    id: entry.id ? `${entry.id}::${index}` : `evt_${(entry.time || Date.now()).toString(36)}_${Math.random().toString(36).slice(2,6)}`,
    eventIndex: index,
    appointment,
    outcome: normalized
  };
}

function expandEntryToOutcomes(entry) {
  const outcomes = Array.isArray(entry?.appointment?.outcomes) && entry.appointment.outcomes.length
    ? entry.appointment.outcomes
    : [legacyOutcomeFromEntry(entry)];
  return outcomes.map((outcome, index) => buildOutcomeEntry(entry, outcome, index));
}

function summarizeExpanded(entries) {
  const summary = entries.reduce((acc, entry) => {
    const type = entry.outcome?.type || entry.appointment?.outcomeType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    if (entry.appointment?.reschedulePairId) {
      acc.reschedulePairs.add(entry.appointment.reschedulePairId);
    }
    if (type === 'cancellation' || type === 'reschedule') {
      const reason = entry.appointment?.reasonMapped || entry.appointment?.reason || '';
      acc.reasons[reason] = (acc.reasons[reason] || 0) + 1;
    }
    if (type === 'question_only') acc.questionOnly++;
    if (type === 'no_appointment') acc.noAppointment++;
    return acc;
  }, { reschedulePairs: new Set(), reasons: {}, questionOnly: 0, noAppointment: 0 });

  summary.reschedulePairs = Array.from(summary.reschedulePairs).filter(Boolean);
  return summary;
}

function scenarioEntries() {
  const base = {
    time: Date.now(),
    patient: { mrn: 'MRN1', type: 'existing' },
    actions: {}
  };
  return [
    {
      label: 'Cancellation only',
      entry: {
        ...base,
        id: 'cancel_only',
        appointment: {
          scheduled: true,
          change: 'cancellation',
          reason: 'patient cancelled',
          appointmentId: 'A1'
        }
      }
    },
    {
      label: 'Reschedule only',
      entry: {
        ...base,
        id: 'resched_only',
        appointment: {
          scheduled: true,
          change: 'reschedule',
          reason: 'Work or School Conflict',
          newAppointmentId: 'A2'
        }
      }
    },
    {
      label: 'Cancellation + Reschedule pair',
      entry: {
        ...base,
        id: 'cancel_resched_pair',
        appointment: {
          scheduled: true,
          change: 'cancellation',
          outcomes: [
            {
              type: 'cancellation',
              scheduled: false,
              reasons: ['Patient Cancelled'],
              appointmentId: 'A3-old',
              reschedulePairId: 'PAIR-777'
            },
            {
              type: 'reschedule',
              scheduled: true,
              reasons: ['Work or School Conflict'],
              newAppointmentId: 'A3-new',
              reschedulePairId: 'PAIR-777'
            }
          ]
        }
      }
    },
    {
      label: 'Question only',
      entry: {
        ...base,
        id: 'question_only',
        appointment: {
          scheduled: false,
          change: 'none',
          noAppointmentReasons: ['Question Only'],
          questionOnly: true
        }
      }
    },
    {
      label: 'No appointment reason (Availability)',
      entry: {
        ...base,
        id: 'no_appt_availability',
        appointment: {
          scheduled: false,
          change: 'none',
          noAppointmentReasons: ['Availability']
        }
      }
    }
  ];
}

function runDiagnostics() {
  const results = scenarioEntries().map(({ label, entry }) => {
    const expanded = expandEntryToOutcomes(entry);
    const summary = summarizeExpanded(expanded);
    return { label, expanded, summary };
  });

  results.forEach(({ label, expanded }) => {
    console.log(`\n=== ${label} ===`);
    expanded.forEach((event, idx) => {
      console.log(`Event ${idx + 1}:`, {
        outcomeType: event.outcome?.type,
        scheduled: event.appointment?.scheduled,
        reason: event.appointment?.reason,
        reasonMapped: event.appointment?.reasonMapped,
        reasonCode: event.appointment?.reasonCode,
        reschedulePairId: event.appointment?.reschedulePairId,
        appointmentId: event.appointment?.appointmentId,
        newAppointmentId: event.appointment?.newAppointmentId,
        noAppointmentReasons: event.appointment?.noAppointmentReasons,
        questionOnly: event.appointment?.questionOnly
      });
    });
  });

  console.log('\nSummary overview:');
  results.forEach(({ label, summary }) => {
    console.log(label, summary);
  });
}

if (require.main === module) {
  runDiagnostics();
}
