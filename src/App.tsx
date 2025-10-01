import React, { useState, useEffect } from 'react';

// Types
interface Patient {
  id: string;
  name: string;
  phone: string;
  isExisting: boolean;
  lastVisit?: string;
}

// Removed unused interfaces - using inline types for simplicity

// Mock patient database
const MOCK_PATIENTS: Patient[] = [
  { id: '1', name: 'John Smith', phone: '+1-555-0123', isExisting: true, lastVisit: '2024-09-15' },
  { id: '2', name: 'Sarah Johnson', phone: '+1-555-0456', isExisting: true, lastVisit: '2024-08-22' },
  { id: '3', name: 'Michael Brown', phone: '+1-555-0789', isExisting: true, lastVisit: '2024-07-10' },
];

// Reusable Components
const CallerBanner = ({ patient, phoneNumber }: { patient: Patient | null; phoneNumber: string }) => {
  return (
    <div className={`p-4 rounded-lg mb-6 ${
      patient 
        ? 'bg-green-50 border-2 border-green-200' 
        : 'bg-yellow-50 border-2 border-yellow-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            patient ? 'bg-green-500' : 'bg-yellow-500'
          }`}></div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {patient ? `${patient.name}` : 'Unknown Caller'}
            </h2>
            <p className="text-sm text-gray-600">
              {phoneNumber || 'No caller ID'}
            </p>
          </div>
        </div>
        {patient && (
          <div className="text-right">
            <p className="text-sm font-medium text-green-700">Existing Patient</p>
            <p className="text-xs text-gray-500">Last visit: {patient.lastVisit}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const IntakeRow = ({ label, children, required = false }: {
  label: string;
  children: any;
  required?: boolean;
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-200">
      <div className="sm:w-1/3 mb-2 sm:mb-0">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
      <div className="sm:w-2/3">
        {children}
      </div>
    </div>
  );
};

const ToggleButton = ({ label, isActive, onClick, variant = 'default' }: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger';
}) => {
  const getVariantClasses = () => {
    if (!isActive) return 'bg-gray-100 text-gray-700 border-gray-300';
    
    switch (variant) {
      case 'success':
        return 'bg-green-500 text-white border-green-500';
      case 'danger':
        return 'bg-red-500 text-white border-red-500';
      default:
        return 'bg-blue-500 text-white border-blue-500';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md border-2 font-medium transition-all duration-200 hover:opacity-80 ${getVariantClasses()}`}
    >
      {label}
    </button>
  );
};

const NotesBox = ({ value, onChange, placeholder = 'Enter notes here...' }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
    />
  );
};

const AnalyticsPanel = ({ analytics }: { analytics: any }) => {
  const bookingRate = analytics.callsToday > 0 
    ? Math.round((analytics.bookedToday / analytics.callsToday) * 100) 
    : 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Today's Analytics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{analytics.callsToday}</div>
          <div className="text-xs text-gray-600">Total Calls</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{analytics.bookedToday}</div>
          <div className="text-xs text-gray-600">Booked</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{analytics.notBookedToday}</div>
          <div className="text-xs text-gray-600">Not Booked</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{bookingRate}%</div>
          <div className="text-xs text-gray-600">Booking Rate</div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [intakeData, setIntakeData] = useState({
    patientName: '',
    phoneNumber: '',
    isExistingPatient: false,
    appointmentBooked: false,
    reasonNotBooked: '',
    notes: '',
    callerId: null as string | null,
  });

  const [matchedPatient, setMatchedPatient] = useState(null as Patient | null);
  const [analytics, setAnalytics] = useState({
    callsToday: 24,
    bookedToday: 18,
    notBookedToday: 6,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const reasonNotBookedOptions = [
    { value: '', label: 'Select reason...' },
    { value: 'scheduling-conflict', label: 'Scheduling Conflict' },
    { value: 'insurance-issue', label: 'Insurance Issue' },
    { value: 'patient-declined', label: 'Patient Declined' },
    { value: 'other', label: 'Other' },
  ];

  // Simulate caller ID lookup
  useEffect(() => {
    if (intakeData.phoneNumber.length >= 10) {
      const foundPatient = MOCK_PATIENTS.find(
        patient => patient.phone.replace(/\D/g, '') === intakeData.phoneNumber.replace(/\D/g, '')
      );
      
      if (foundPatient) {
        setMatchedPatient(foundPatient);
        setIntakeData(prev => ({
          ...prev,
          patientName: foundPatient.name,
          isExistingPatient: true,
          callerId: foundPatient.id,
        }));
      } else {
        setMatchedPatient(null);
        setIntakeData(prev => ({
          ...prev,
          callerId: null,
        }));
      }
    } else {
      setMatchedPatient(null);
    }
  }, [intakeData.phoneNumber]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update analytics
    setAnalytics(prev => ({
      callsToday: prev.callsToday + 1,
      bookedToday: intakeData.appointmentBooked ? prev.bookedToday + 1 : prev.bookedToday,
      notBookedToday: !intakeData.appointmentBooked ? prev.notBookedToday + 1 : prev.notBookedToday,
    }));

    setIsSubmitting(false);
    setShowSuccess(true);

    // Reset form after success
    setTimeout(() => {
      setIntakeData({
        patientName: '',
        phoneNumber: '',
        isExistingPatient: false,
        appointmentBooked: false,
        reasonNotBooked: '',
        notes: '',
        callerId: null,
      });
      setMatchedPatient(null);
      setShowSuccess(false);
    }, 2000);
  };

  const isFormValid = intakeData.patientName && intakeData.phoneNumber && 
    (intakeData.appointmentBooked || intakeData.reasonNotBooked);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Phone Call Intake System
          </h1>
          <p className="text-gray-600">Patient intake and appointment booking tracker</p>
        </div>

        {/* Analytics Panel */}
        <AnalyticsPanel analytics={analytics} />

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Caller ID Banner */}
          <CallerBanner patient={matchedPatient} phoneNumber={intakeData.phoneNumber} />

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <div className="w-5 h-5 text-green-500 mr-3">✓</div>
                <p className="text-green-800 font-medium">
                  Call intake saved successfully!
                </p>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-1">
            <IntakeRow label="Patient Name" required>
              <input
                type="text"
                value={intakeData.patientName}
                onChange={(e) => setIntakeData(prev => ({ ...prev, patientName: e.target.value }))}
                placeholder="Enter patient name"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </IntakeRow>

            <IntakeRow label="Phone Number" required>
              <input
                type="tel"
                value={intakeData.phoneNumber}
                onChange={(e) => setIntakeData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+1-555-0123"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </IntakeRow>

            <IntakeRow label="Patient Type">
              <div className="flex space-x-3">
                <ToggleButton
                  label="Existing Patient"
                  isActive={intakeData.isExistingPatient}
                  onClick={() => setIntakeData(prev => ({ ...prev, isExistingPatient: true }))}
                  variant="success"
                />
                <ToggleButton
                  label="New Patient"
                  isActive={!intakeData.isExistingPatient}
                  onClick={() => setIntakeData(prev => ({ ...prev, isExistingPatient: false }))}
                />
              </div>
            </IntakeRow>

            <IntakeRow label="Appointment Booked?" required>
              <div className="flex space-x-3">
                <ToggleButton
                  label="Yes, Booked"
                  isActive={intakeData.appointmentBooked}
                  onClick={() => setIntakeData(prev => ({ 
                    ...prev, 
                    appointmentBooked: true,
                    reasonNotBooked: ''
                  }))}
                  variant="success"
                />
                <ToggleButton
                  label="Not Booked"
                  isActive={!intakeData.appointmentBooked}
                  onClick={() => setIntakeData(prev => ({ ...prev, appointmentBooked: false }))}
                  variant="danger"
                />
              </div>
            </IntakeRow>

            {!intakeData.appointmentBooked && (
              <IntakeRow label="Reason Not Booked" required>
                <select
                  value={intakeData.reasonNotBooked}
                  onChange={(e) => setIntakeData(prev => ({ ...prev, reasonNotBooked: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {reasonNotBookedOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </IntakeRow>
            )}

            <IntakeRow label="Notes">
              <NotesBox
                value={intakeData.notes}
                onChange={(value) => setIntakeData(prev => ({ ...prev, notes: value }))}
                placeholder="Add any additional notes about the call..."
              />
            </IntakeRow>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={`px-8 py-3 rounded-md font-semibold text-white transition-all duration-200 ${
                isFormValid && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save & Submit'
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Phone Call Intake System v1.0 | Medical Clinic Management</p>
        </div>
      </div>
    </div>
  );
};

export default App;
