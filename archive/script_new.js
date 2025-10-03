// Phone Tracking Screenpop - JavaScript
// Main application logic for call simulation and patient data management

// Global state management
let simulationState = {
    isCallActive: false,
    currentCaller: null,
    callStartTime: null,
    screenpopVisible: false
};

// Simple patient database focused on core workflows: Existing vs New, Booked vs Not Booked
const SIMULATION_PATIENTS = [
    // Test Case 1: Existing Patient WITH Appointment
    {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        phone: '+1 (555) 123-4567',
        dateOfBirth: '1985-03-15',
        crmFlags: ['Insurance Verified', 'Recurring Patient'],
        isExistingPatient: true,
        hasAppointment: true,
        appointmentType: 'scheduled',
        scenario: 'existing-with-appointment'
    },
    
    // Test Case 2: Existing Patient WITHOUT Appointment
    {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+1 (555) 456-7890',
        dateOfBirth: '1992-08-22',
        crmFlags: ['High Priority'],
        isExistingPatient: true,
        hasAppointment: false,
        appointmentType: 'none',
        scenario: 'existing-no-appointment'
    },
    
    // Test Case 3: Existing Patient (Clean Record) WITH Appointment
    {
        id: '3',
        firstName: 'Michael',
        lastName: 'Brown',
        phone: '+1 (555) 777-1234',
        dateOfBirth: '1978-11-05',
        crmFlags: [], // No flags - clean record
        isExistingPatient: true,
        hasAppointment: true,
        appointmentType: 'scheduled',
        scenario: 'existing-clean-with-appointment'
    },
    
    // Test Case 4: New Patient (Unknown Number #1)
    {
        id: 'new1',
        firstName: null,
        lastName: null,
        phone: '+1 (555) 999-8888',
        dateOfBirth: null,
        crmFlags: [],
        isExistingPatient: false,
        hasAppointment: false,
        appointmentType: 'none',
        scenario: 'new-patient-1'
    },
    
    // Test Case 5: New Patient (Unknown Number #2)
    {
        id: 'new2',
        firstName: null,
        lastName: null,
        phone: '+1 (555) 111-2222',
        dateOfBirth: null,
        crmFlags: [],
        isExistingPatient: false,
        hasAppointment: false,
        appointmentType: 'none',
        scenario: 'new-patient-2'
    }
];

// Appointment Status Functions (API-Ready)
let appointmentStatus = {
    isBooked: false,
    appointmentType: 'none',
    lastChecked: null,
    source: 'crm', // 'crm' or 'manual'
    manualReason: null,
    notes: null
};

// Scenario Selection Functions
function updateScenarioInfo() {
    const selectedScenario = document.getElementById('scenarioSelect').value;
    const descriptionElement = document.getElementById('scenarioDescription');
    
    const scenarioDescriptions = {
        'random': 'Random selection from test cases',
        'existing-with-appointment': 'John Smith - Known patient with scheduled appointment',
        'existing-no-appointment': 'Sarah Johnson - Known patient, no appointment found',
        'existing-clean-with-appointment': 'Michael Brown - Known patient (no flags), has appointment',
        'new-patient-1': 'Unknown caller - Will trigger "Match Not Found" popup',
        'new-patient-2': 'Unknown caller - Will trigger "Match Not Found" popup'
    };
    
    descriptionElement.textContent = scenarioDescriptions[selectedScenario] || 'Unknown scenario';
}

function getSelectedScenarioPatient() {
    const selectedScenario = document.getElementById('scenarioSelect').value;
    
    if (selectedScenario === 'random') {
        // Return random patient
        return SIMULATION_PATIENTS[Math.floor(Math.random() * SIMULATION_PATIENTS.length)];
    }
    
    // Find patient with matching scenario
    const matchingPatient = SIMULATION_PATIENTS.find(patient => patient.scenario === selectedScenario);
    return matchingPatient || SIMULATION_PATIENTS[0]; // Fallback to first patient
}

// Call Simulation Functions
function simulateIncomingCall() {
    if (simulationState.isCallActive) {
        showNotification('Call already in progress', 'warning');
        return;
    }
    
    // Clear previous data first
    clearPatientData();
    
    // Get caller based on selected scenario
    const selectedCaller = getSelectedScenarioPatient();
    simulationState.currentCaller = selectedCaller;
    
    console.log('Selected caller:', selectedCaller); // Debug log
    
    // Update simulation controls
    document.querySelector('.sim-btn.incoming').disabled = true;
    document.querySelector('.sim-btn.answered').disabled = false;
    document.getElementById('callStatus').textContent = 'Incoming call...';
    
    // Show call notification
    const callerDisplayName = selectedCaller.isExistingPatient 
        ? `${selectedCaller.firstName} ${selectedCaller.lastName}` 
        : 'Unknown Caller';
    document.getElementById('incomingCallerName').textContent = callerDisplayName;
    document.getElementById('incomingCallerNumber').textContent = selectedCaller.phone;
    document.getElementById('callNotification').classList.remove('hidden');
    
    // Play call sound simulation
    simulateCallRinging();
    
    addNewActivity('Incoming call detected', 'fas fa-phone', 'text-blue');
    showNotification('Incoming call from ' + selectedCaller.phone, 'info');
}

function simulateCallAnswered() {
    answerCall();
}

function answerCall() {
    if (!simulationState.currentCaller) return;
    
    // Hide call notification
    document.getElementById('callNotification').classList.add('hidden');
    
    // Add call-active animation to screenpop
    const screenpop = document.querySelector('.screenpop-container');
    screenpop.classList.add('call-active');
    
    // Update call state
    simulationState.isCallActive = true;
    simulationState.callStartTime = new Date();
    simulationState.screenpopVisible = true;
    
    // Update UI
    document.getElementById('callIndicator').classList.remove('hidden');
    document.querySelector('.sim-btn.answered').disabled = true;
    document.querySelector('.sim-btn.ended').disabled = false;
    document.getElementById('callStatus').textContent = 'Call active - Screenpop displayed';
    
    // Populate patient data with delay to simulate lookup
    setTimeout(() => {
        populatePatientDataEnhanced(simulationState.currentCaller);
        addNewActivity('Patient data loaded', 'fas fa-user-check', 'text-green');
        
        // Also check appointment status for existing patients
        if (simulationState.currentCaller && simulationState.currentCaller.isExistingPatient) {
            setTimeout(() => {
                checkAppointmentStatus();
            }, 2500); // After the CRM data loads
        }
    }, 1500);
    
    addNewActivity('Call answered - Screenpop activated', 'fas fa-phone', 'text-green');
}

function simulateCallEnded() {
    if (!simulationState.isCallActive) return;
    
    const duration = Math.floor((new Date() - simulationState.callStartTime) / 1000);
    
    // Update UI
    document.getElementById('callIndicator').classList.add('hidden');
    document.querySelector('.sim-btn.ended').disabled = true;
    document.getElementById('callStatus').textContent = `Call ended (${duration}s)`;
    
    // Remove call-active class but keep screenpop visible
    const screenpop = document.querySelector('.screenpop-container');
    screenpop.classList.remove('call-active');
    
    // Reset state
    simulationState.isCallActive = false;
    simulationState.screenpopVisible = false;
    
    addNewActivity(`Call ended (Duration: ${duration}s)`, 'fas fa-phone-slash', 'text-red');
    showNotification(`Call ended after ${duration} seconds`, 'info');
    
    // Auto-reset after delay
    setTimeout(() => {
        resetSimulation();
    }, 3000);
}

function clearPatientData() {
    // Clear patient information
    document.getElementById('phoneNumber').textContent = '--';
    document.getElementById('firstName').textContent = '--';
    document.getElementById('lastName').textContent = '--';
    document.getElementById('dateOfBirth').textContent = '--';
    document.getElementById('patientType').textContent = '--';
    document.getElementById('patientType').className = '';
    document.getElementById('lastUpdated').textContent = '--';
    
    // Clear CRM flags
    document.getElementById('crmFlags').style.display = 'none';
    document.getElementById('noFlags').style.display = 'block';
    
    // Clear appointment status
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    const statusDetails = document.getElementById('statusDetails');
    
    if (statusIndicator && statusText && statusIcon) {
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Ready for patient lookup';
        statusIcon.className = 'fas fa-clock';
        statusDetails.style.display = 'none';
    }
    
    // Hide manual override
    const manualOverride = document.getElementById('manualOverride');
    if (manualOverride) {
        manualOverride.style.display = 'none';
    }
}

function resetSimulation() {
    // Reset all states
    simulationState = {
        isCallActive: false,
        currentCaller: null,
        callStartTime: null,
        screenpopVisible: false
    };
    
    // Clear patient data
    clearPatientData();
    
    // Reset UI
    document.getElementById('callNotification').classList.add('hidden');
    document.getElementById('callIndicator').classList.add('hidden');
    document.getElementById('matchNotFoundPopup').classList.add('hidden');
    document.querySelector('.screenpop-container').classList.remove('call-active');
    
    // Reset buttons
    document.querySelector('.sim-btn.incoming').disabled = false;
    document.querySelector('.sim-btn.answered').disabled = true;
    document.querySelector('.sim-btn.ended').disabled = true;
    document.getElementById('callStatus').textContent = 'Ready for simulation';
    
    showNotification('Simulation reset', 'info');
    addNewActivity('Simulation reset - Ready for next call', 'fas fa-redo', 'text-blue');
}

// Enhanced patient data population
function populatePatientDataEnhanced(caller) {
    console.log('Populating data for caller:', caller); // Debug log
    
    // Simulate CRM lookup with realistic delays
    showLoading();
    
    setTimeout(() => {
        if (!caller.isExistingPatient) {
            // Show "Match Not Found" popup for new patients
            hideLoading();
            showMatchNotFoundPopup(caller.phone);
            return;
        }
        
        // Update patient information
        document.getElementById('phoneNumber').textContent = caller.phone;
        document.getElementById('firstName').textContent = caller.firstName;
        document.getElementById('lastName').textContent = caller.lastName;
        document.getElementById('dateOfBirth').textContent = formatDateOfBirth(caller.dateOfBirth);
        document.getElementById('patientType').textContent = 'Existing Patient';
        document.getElementById('patientType').className = 'status-existing';
        document.getElementById('lastUpdated').textContent = 'Just now';
        
        // Populate CRM flags
        populateCrmFlags(caller.crmFlags);
        
        hideLoading();
        
        // Initialize appointment status check for this patient
        setTimeout(() => {
            checkAppointmentStatus();
        }, 500);
        
        // Add realistic CRM activity
        const activities = [
            'CRM record found',
            'Patient information loaded',
            'Insurance status verified',
            'Medical history accessed'
        ];
        
        activities.forEach((activity, index) => {
            setTimeout(() => {
                addNewActivity(activity, 'fas fa-check-circle', 'text-green');
            }, (index + 1) * 600);
        });
        
    }, 2000);
}

function checkAppointmentStatus() {
    // Simulate CRM API call to check appointment status
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    const statusDetails = document.getElementById('statusDetails');
    const appointmentDetails = document.getElementById('appointmentDetails');
    
    // Show checking state
    statusIndicator.className = 'status-indicator checking';
    statusText.textContent = 'Checking CRM...';
    statusIcon.className = 'fas fa-sync fa-spin';
    statusDetails.style.display = 'none';
    
    // Simulate API call delay
    setTimeout(() => {
        // Use current caller's appointment data if available, otherwise use mock data
        let hasAppointment = false;
        let appointmentType = 'none';
        
        if (simulationState.currentCaller) {
            hasAppointment = simulationState.currentCaller.hasAppointment;
            appointmentType = simulationState.currentCaller.appointmentType;
            console.log('Using caller appointment data:', hasAppointment, appointmentType); // Debug log
        } else {
            // Fallback to random for manual refresh
            hasAppointment = Math.random() > 0.4; // 60% chance of having appointment
            appointmentType = hasAppointment ? 'scheduled' : 'none';
        }
        
        appointmentStatus.isBooked = hasAppointment;
        appointmentStatus.appointmentType = appointmentType;
        appointmentStatus.lastChecked = new Date();
        appointmentStatus.source = 'crm';
        
        updateAppointmentDisplay();
        
        // Add activity based on appointment type
        if (hasAppointment) {
            const typeText = appointmentType === 'urgent' ? 'Urgent appointment found' : 
                           appointmentType === 'tentative' ? 'Tentative appointment found' : 
                           'Scheduled appointment found';
            addNewActivity(typeText, 'fas fa-calendar-check', 'text-green');
        } else {
            addNewActivity('No appointment found in CRM', 'fas fa-calendar-times', 'text-orange');
        }
        
    }, 1500);
}

function updateAppointmentDisplay() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    const statusDetails = document.getElementById('statusDetails');
    const appointmentDetails = document.getElementById('appointmentDetails');
    
    if (appointmentStatus.isBooked) {
        // Different display based on appointment type
        switch(appointmentStatus.appointmentType) {
            case 'urgent':
                statusIndicator.className = 'status-indicator booked urgent';
                statusText.textContent = 'Urgent Appointment Scheduled';
                statusIcon.className = 'fas fa-exclamation-circle';
                break;
            case 'tentative':
                statusIndicator.className = 'status-indicator error';
                statusText.textContent = 'Tentative Appointment (Confirm)';
                statusIcon.className = 'fas fa-calendar-alt';
                break;
            case 'blocked':
                statusIndicator.className = 'status-indicator error';
                statusText.textContent = 'Appointment Blocked';
                statusIcon.className = 'fas fa-ban';
                break;
            default:
                statusIndicator.className = 'status-indicator booked';
                statusText.textContent = 'Appointment Scheduled';
                statusIcon.className = 'fas fa-calendar-check';
        }
        appointmentDetails.textContent = `Type: ${appointmentStatus.appointmentType} • Last checked: ${formatLastChecked(appointmentStatus.lastChecked)}`;
    } else {
        statusIndicator.className = 'status-indicator not-booked';
        statusText.textContent = 'No Appointment Found';
        statusIcon.className = 'fas fa-calendar-times';
        appointmentDetails.textContent = `Last checked: ${formatLastChecked(appointmentStatus.lastChecked)}`;
    }
    
    statusDetails.style.display = 'block';
    
    // Hide manual override if showing
    const manualOverride = document.getElementById('manualOverride');
    if (manualOverride) {
        manualOverride.style.display = 'none';
    }
}

function refreshAppointmentStatus() {
    checkAppointmentStatus();
    addNewActivity('Appointment status refreshed from CRM', 'fas fa-sync-alt', 'text-blue');
}

function enableManualOverride() {
    const manualOverride = document.getElementById('manualOverride');
    if (manualOverride) {
        manualOverride.style.display = 'block';
        document.getElementById('overrideReason').value = '';
        document.getElementById('overrideNotes').style.display = 'none';
        document.getElementById('cancellationNotes').value = '';
        document.getElementById('saveBtn').disabled = true;
    }
}

function handleReasonChange() {
    const reason = document.getElementById('overrideReason').value;
    const notesSection = document.getElementById('overrideNotes');
    const saveBtn = document.getElementById('saveBtn');
    
    if (reason) {
        notesSection.style.display = 'block';
        saveBtn.disabled = false;
    } else {
        notesSection.style.display = 'none';
        saveBtn.disabled = true;
    }
}

function saveManualEntry() {
    const reason = document.getElementById('overrideReason').value;
    const notes = document.getElementById('cancellationNotes').value;
    
    appointmentStatus.source = 'manual';
    appointmentStatus.manualReason = reason;
    appointmentStatus.notes = notes;
    appointmentStatus.lastChecked = new Date();
    
    // Update display based on reason
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    const statusDetails = document.getElementById('statusDetails');
    const appointmentDetails = document.getElementById('appointmentDetails');
    
    let statusMessage = '';
    let iconClass = '';
    let indicatorClass = '';
    
    switch(reason) {
        case 'cancellation':
            statusMessage = 'Appointment Cancelled';
            iconClass = 'fas fa-calendar-times';
            indicatorClass = 'status-indicator not-booked';
            appointmentStatus.isBooked = false;
            break;
        case 'no-show':
            statusMessage = 'Patient No-Show';
            iconClass = 'fas fa-user-times';
            indicatorClass = 'status-indicator not-booked';
            appointmentStatus.isBooked = false;
            break;
        case 'reschedule':
            statusMessage = 'Needs Rescheduling';
            iconClass = 'fas fa-calendar-alt';
            indicatorClass = 'status-indicator error';
            break;
        case 'api-error':
            statusMessage = 'CRM Connection Issue';
            iconClass = 'fas fa-exclamation-triangle';
            indicatorClass = 'status-indicator error';
            break;
        default:
            statusMessage = 'Manual Override';
            iconClass = 'fas fa-edit';
            indicatorClass = 'status-indicator error';
    }
    
    statusIndicator.className = indicatorClass;
    statusText.textContent = statusMessage;
    statusIcon.className = iconClass;
    appointmentDetails.textContent = `Manual entry: ${formatLastChecked(appointmentStatus.lastChecked)}`;
    statusDetails.style.display = 'block';
    
    // Hide manual override
    document.getElementById('manualOverride').style.display = 'none';
    
    // Add activity
    addNewActivity(`Manual entry: ${statusMessage}`, iconClass, 'text-orange');
    showNotification('Manual entry saved', 'success');
}

function cancelManualEntry() {
    const manualOverride = document.getElementById('manualOverride');
    if (manualOverride) {
        manualOverride.style.display = 'none';
    }
}

function formatLastChecked(date) {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
}

// CRM Flag Functions
function populateCrmFlags(flags) {
    const flagsContainer = document.getElementById('crmFlags');
    const noFlagsContainer = document.getElementById('noFlags');
    
    if (!flags || flags.length === 0) {
        flagsContainer.style.display = 'none';
        noFlagsContainer.style.display = 'block';
        return;
    }
    
    noFlagsContainer.style.display = 'none';
    flagsContainer.style.display = 'flex';
    flagsContainer.innerHTML = '';
    
    flags.forEach(flag => {
        const flagElement = document.createElement('div');
        flagElement.className = `flag-item ${getFlagClass(flag)}`;
        flagElement.innerHTML = `
            <i class="${getFlagIcon(flag)}"></i>
            <span>${flag}</span>
        `;
        flagsContainer.appendChild(flagElement);
    });
}

function getFlagClass(flag) {
    const flagMap = {
        'High Priority': 'priority',
        'Insurance Verified': 'verified',
        'Recurring Patient': 'recurring',
        'VIP Patient': 'vip',
        'Payment Plan Active': 'payment',
        'Follow-up Required': 'followup',
        'Special Needs': 'special',
        'New Insurance': 'insurance',
        'Referral Patient': 'referral'
    };
    return flagMap[flag] || 'verified';
}

function getFlagIcon(flag) {
    const iconMap = {
        'High Priority': 'fas fa-exclamation-circle',
        'Insurance Verified': 'fas fa-check-circle',
        'Recurring Patient': 'fas fa-sync',
        'VIP Patient': 'fas fa-star',
        'Payment Plan Active': 'fas fa-credit-card',
        'Follow-up Required': 'fas fa-calendar-plus',
        'Special Needs': 'fas fa-heart',
        'New Insurance': 'fas fa-id-card',
        'Referral Patient': 'fas fa-user-plus'
    };
    return iconMap[flag] || 'fas fa-flag';
}

// Utility Functions
function formatDateOfBirth(dateString) {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
    });
}

function simulateCallRinging() {
    // Simulate call ringing sound (visual indication)
    const notification = document.getElementById('callNotification');
    notification.style.animation = 'pulse 1s infinite';
    
    setTimeout(() => {
        notification.style.animation = '';
    }, 5000);
}

// Match Not Found Popup Functions
function showMatchNotFoundPopup(phoneNumber) {
    document.getElementById('unmatchedPhone').textContent = phoneNumber;
    document.getElementById('matchNotFoundPopup').classList.remove('hidden');
    
    addNewActivity('No patient match found', 'fas fa-exclamation-triangle', 'text-orange');
}

function closeMatchNotFoundPopup() {
    document.getElementById('matchNotFoundPopup').classList.add('hidden');
}

function startNewPatientIntake() {
    closeMatchNotFoundPopup();
    showNotification('Starting new patient intake process', 'info');
    addNewActivity('New patient intake initiated', 'fas fa-user-plus', 'text-blue');
    
    // In a real system, this would redirect to patient intake form
    console.log('Would redirect to new patient intake form');
}

// Basic UI Functions (simplified versions)
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function addNewActivity(message, icon, className) {
    console.log(`Activity: ${message}`);
    // In the full system, this would add to timeline
}

function showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    // In the full system, this would show toast notification
}

// Action Bar Functions (simplified)
function refreshData() {
    showLoading();
    setTimeout(() => {
        hideLoading();
        showNotification('Data refreshed', 'success');
        if (simulationState.currentCaller && simulationState.currentCaller.isExistingPatient) {
            checkAppointmentStatus();
        }
    }, 1000);
}

function exportData() {
    showNotification('Export functionality not implemented in demo', 'info');
}

function viewHistory() {
    showNotification('History view not implemented in demo', 'info');
}

function emergencyStop() {
    if (confirm('Are you sure you want to activate emergency stop?')) {
        resetSimulation();
        showNotification('Emergency stop activated', 'warning');
    }
}

function closeScreenpop() {
    if (confirm('Are you sure you want to close the tracking screenpop?')) {
        console.log('Screenpop would close here');
    }
}

function toggleSimulationControls() {
    const controls = document.querySelector('.simulation-buttons');
    const status = document.querySelector('.simulation-status');
    const toggleBtn = document.querySelector('.toggle-sim-btn i');
    
    if (controls.style.display === 'none') {
        controls.style.display = 'flex';
        status.style.display = 'block';
        toggleBtn.className = 'fas fa-eye';
    } else {
        controls.style.display = 'none';
        status.style.display = 'none';
        toggleBtn.className = 'fas fa-eye-slash';
    }
}

// Auto-refresh simulation (simplified)
function startAutoRefresh() {
    setInterval(() => {
        if (Math.random() > 0.9) { // 10% chance every 10 seconds
            console.log('Auto-refresh triggered');
        }
    }, 10000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Phone Tracking Screenpop UI loaded successfully');
    
    // Initialize scenario selector
    updateScenarioInfo();
    
    // Initialize appointment status display
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    
    if (statusIndicator && statusText && statusIcon) {
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Ready for patient lookup';
        statusIcon.className = 'fas fa-clock';
        document.getElementById('statusDetails').style.display = 'none';
    }
    
    // Start auto-refresh simulation
    startAutoRefresh();
    
    // Add some initial dynamic behavior
    setTimeout(() => {
        addNewActivity('Screenpop interface initialized', 'fas fa-power-off', 'text-green');
    }, 1000);
    
    // Add initial simulation message
    setTimeout(() => {
        addNewActivity('Call simulation system ready', 'fas fa-play-circle', 'text-blue');
    }, 1000);
    
    console.log('Call simulation system initialized');
    console.log('Interface loaded - you can now use the simulation controls');
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + R for refresh
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        refreshData();
    }
    
    // Escape to close
    if (event.key === 'Escape') {
        closeScreenpop();
    }
});
