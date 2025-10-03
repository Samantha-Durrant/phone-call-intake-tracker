// Mock CRM adapter for proof-of-concept demos
// Loads sample patient + appointment data and drives the UI via ScreenpopAPI
(function(){
  // Base patients
  const patients = [
    { id: 'p1', name: 'John Smith', phone: '+1 (555) 123-4567', mrn: 'A123456', dob: '1985-03-15', isExisting: true },
    { id: 'p2', name: 'Sarah Johnson', phone: '+1 (555) 456-7890', mrn: 'B998877', dob: '1992-08-22', isExisting: true },
    { id: 'p3', name: 'Michael Brown', phone: '+1 (555) 777-1234', mrn: 'C445566', dob: '1978-11-05', isExisting: true },
    { id: 'p4', name: 'Sarah Smith', phone: '+1 (555) 333-4444', mrn: 'D112233', dob: '1979-01-10', isExisting: true },
  ];

  // Phones that map to one or more patients
  const byPhone = new Map([
    ['+15551234567', patients.find(p=>p.id==='p1')], // single: John
    ['+15554567890', patients.find(p=>p.id==='p2')], // single: Sarah Johnson
    ['+15557771234', patients.find(p=>p.id==='p3')], // single: Michael
    // Household phone shared by Sarah Smith and John Smith
    ['+15553334444', [ patients.find(p=>p.id==='p4'), patients.find(p=>p.id==='p1') ]],
  ]);

  function normalize(phone){
    if (!phone) return '';
    const digits = String(phone).replace(/\D+/g,'');
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    return `+${digits}`;
  }

  // Configure API with mock functions
  window.ScreenpopAPI?.configure({
    lookupPatientByPhone: async (phone) => {
      const key = normalize(phone);
      await delay(300);
      const hit = byPhone.get(key);
      if (!hit) return null;
      return hit; // could be object or array
    },
    searchPatients: async ({ name, dob, mrn }) => {
      await delay(300);
      const n = (name||'').trim().toLowerCase();
      const d = (dob||'').trim();
      const m = (mrn||'').trim().toLowerCase();
      return patients.filter(p => {
        const byName = n ? p.name.toLowerCase().includes(n) : true;
        const byDob = d ? p.dob === d : true;
        const byMrn = m ? p.mrn.toLowerCase() === m : true;
        return byName && byDob && byMrn;
      }).slice(0,5);
    },
    onReasonSubmit: ({ change, reason, otherText }) => {
      console.log('[MockCRM] Reason captured:', { change, reason, otherText });
    }
  });

  // Demo driver: decide a scenario based on ?demo or phone number
  document.addEventListener('DOMContentLoaded', async () => {
    const { phone, demo } = getQuery();
    const chosenPhone = phone || pickPhoneForDemo(demo);

    // Simulate an incoming call
    await delay(300);
    await window.ScreenpopAPI.handleIncomingCall(chosenPhone);

    // Apply appointment state per scenario
    const update = pickAppointmentUpdate(demo);
    if (update) {
      await delay(600);
      window.ScreenpopAPI.applyAppointment(update);
    }
  });

  function pickPhoneForDemo(demo){
    switch (demo) {
      case 'existing_scheduled': return '+15551234567';
      case 'existing_cancelled': return '+15554567890';
      case 'existing_rescheduled': return '+15557771234';
      case 'household': return '+15553334444';
      case 'new': return '+15559998888';
      default: return '+15551234567';
    }
  }

  function pickAppointmentUpdate(demo){
    switch (demo) {
      case 'existing_scheduled':
        return { scheduled: true, change: 'none' };
      case 'existing_cancelled':
        return { scheduled: true, change: 'cancellation', reason: 'Illness/Family Emergency' };
      case 'existing_rescheduled':
        return { scheduled: true, change: 'reschedule', reason: 'Work/School Conflict' };
      case 'new':
        return { scheduled: false, change: 'none' };
      default:
        return { scheduled: true, change: 'none' };
    }
  }

  function getQuery(){
    try {
      const u = new URL(window.location.href);
      return { phone: u.searchParams.get('phone'), demo: u.searchParams.get('demo') };
    } catch { return { phone: null, demo: null }; }
  }

  function delay(ms){ return new Promise(r => setTimeout(r, ms)); }
})();
