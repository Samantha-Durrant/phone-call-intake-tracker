export function screenpopMarkup(): string {
  return `
  <div class="demo-bar">
    <i class="fa-solid fa-vials" aria-hidden="true"></i>
    <span class="demo-label">Simulate caller:</span>
    <button id="runScenario" class="primary" type="button">Send Test Caller</button>
    <button id="resetScenario" type="button">Reset</button>
    <label for="apptTypeSelect" class="demo-label">Appt Type:</label>
    <select id="apptTypeSelect" aria-label="Appointment Type" class="demo-select">
      <option value="">(none)</option>
      <option value="FSE" title="Any NP FSE would fall under this category">FSE</option>
      <option value="New Patient">New Patient</option>
      <option value="Follow Up">Follow Up</option>
      <option value="Spot Check">Spot Check</option>
      <option value="Cyst Injection">Cyst Injection</option>
      <option value="Cyst Excision">Cyst Excision</option>
      <option value="Biopsy">Biopsy</option>
      <option value="Hairloss">Hairloss</option>
      <option value="Rash">Rash</option>
      <option value="Isotretinoin">Isotretinoin</option>
      <option value="Video Visit Isotretinoin">Video Visit Isotretinoin</option>
      <option value="Video Visit">Video Visit</option>
      <option value="Suture Removal MA">Suture Removal MA</option>
      <option value="Wart Treatment">Wart Treatment</option>
      <option value="Numbing Major">Numbing Major</option>
      <option value="Filler Major">Filler Major</option>
      <option value="Botox">Botox</option>
      <option value="Cosmetic Procedure">Cosmetic Procedure</option>
      <option value="Cosmetic Consult">Cosmetic Consult</option>
      <option value="Dermaplane">Dermaplane</option>
      <option value="Standard Hydrafacial">Standard Hydrafacial</option>
      <option value="Acne Hydrafacial">Acne Hydrafacial</option>
      <option value="Deluxe Hydrafacial">Deluxe Hydrafacial</option>
      <option value="Emsculpt">Emsculpt</option>
      <option value="Emsella">Emsella</option>
      <option value="Vanquish">Vanquish</option>
      <option value="Laser Pro-frac">Laser Pro-frac</option>
      <option value="BareHR">BareHR</option>
      <option value="Lase Hair Removal (LHR)">Lase Hair Removal (LHR)</option>
      <option value="BBL HEROic">BBL HEROic</option>
      <option value="Laser BBL">Laser BBL</option>
      <option value="Acne BBL">Acne BBL</option>
      <option value="MOXI">MOXI</option>
      <option value="HALO">HALO</option>
      <option value="Visia">Visia</option>
      <option value="Visia Numbing">Visia Numbing</option>
      <option value="Ipad numbing">Ipad numbing</option>
      <option value="Ipad">Ipad</option>
      <option value="Microneedling">Microneedling</option>
      <option value="MicroLaser Peel">MicroLaser Peel</option>
      <option value="Chemical Peel">Chemical Peel</option>
      <option value="YAG">YAG</option>
      <option value="SkinTyte">SkinTyte</option>
      <option value="Sclerotherapy">Sclerotherapy</option>
      <option value="PRP">PRP</option>
      <option value="Ultherapy">Ultherapy</option>
      <option value="PDT">PDT</option>
      <option value="Kybella">Kybella</option>
      <option value="Cosmetic follow-up">Cosmetic follow-up</option>
      <option value="diVA">diVA</option>
    </select>
    <label for="officePicker" class="demo-label">Office:</label>
    <select id="officePicker" aria-label="Office location" class="demo-select">
      <option value="">(none)</option>
      <option>Ann Arbor</option>
      <option>Plymouth</option>
      <option>Wixom</option>
    </select>
  </div>

  <div class="mini-screenpop" role="dialog" aria-label="Call Screenpop">
    <header class="mini-header">
      <div class="title">
        <i class="fa-solid fa-phone"></i>
        <span>Call Screenpop (Testing)</span>
        <span id="callerBadge" class="chip alt hidden" aria-hidden="true"></span>
      </div>
      <button class="icon-btn" aria-label="Close" title="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </header>

    <div class="mini-body">
      <section class="section">
        <h3 class="section-title"><i class="fa-regular fa-user"></i> Patient</h3>
        <div class="row" style="margin-bottom:.5rem">
          <span class="label">Call For</span>
          <div class="segmented" role="group" aria-label="Call For">
            <button type="button" class="seg active" data-group="callfor" data-value="self">Self</button>
            <button type="button" class="seg" data-group="callfor" data-value="proxy">Someone Else</button>
          </div>
        </div>
        <div id="noMatchBanner" class="banner hidden" aria-hidden="true">
          <span>No match for caller phone. Search patient by name/DOB.</span>
          <div style="margin-left:auto; display:flex; gap:6px; align-items:center;">
            <button class="btn ghost" type="button" id="showSearchBtn">Search Patient</button>
            <button class="btn ghost" type="button" id="copyCallerToSubjectBtn">Copy caller phone</button>
            <label class="checkbox" style="gap:6px">
              <input id="markCrmUpdate" type="checkbox" />
              <span class="checkmark" title="Mark for CRM update"></span>
              <small class="muted">Mark for CRM update</small>
            </label>
          </div>
        </div>
        <div class="grid">
          <label class="field">
            <span class="label">Name</span>
            <input id="patientName" type="text" placeholder="—" inputmode="text" autocomplete="off" />
          </label>
          <label class="field">
            <span class="label">Phone</span>
            <input id="patientPhone" type="tel" placeholder="—" inputmode="tel" autocomplete="off" />
          </label>
          <label class="field">
            <span class="label">MRN</span>
            <input id="patientMRN" type="text" placeholder="—" inputmode="numeric" autocomplete="off" />
          </label>
          <label class="field">
            <span class="label">DOB</span>
            <input id="patientDOB" type="date" />
          </label>
        </div>
        <div class="pt-type segmented" role="group" aria-label="Patient Type">
          <button type="button" class="seg" data-ptype="new">New</button>
          <button type="button" class="seg active" data-ptype="existing">Existing</button>
        </div>

        <div id="subjectSearchWrap" class="grid hidden" aria-hidden="true" style="margin-top:.5rem">
          <label class="field">
            <span class="label">Subject Name</span>
            <input id="subjectName" type="text" placeholder="Enter full name" autocomplete="off" />
          </label>
          <label class="field">
            <span class="label">Subject DOB</span>
            <input id="subjectDOB" type="date" />
          </label>
          <label class="field">
            <span class="label">Subject MRN (optional)</span>
            <input id="subjectMRN" type="text" placeholder="—" inputmode="numeric" autocomplete="off" />
          </label>
          <label class="field">
            <span class="label">Subject Phone (optional)</span>
            <input id="subjectPhone" type="tel" placeholder="—" inputmode="tel" autocomplete="off" />
          </label>
          <div class="field" style="grid-column: 1 / -1; display:flex; gap:.5rem; align-items:center;">
            <button class="btn" type="button" id="applySubjectBtn">Apply Subject</button>
            <button class="btn" type="button" id="findSubjectBtn">Find</button>
            <button class="btn ghost" type="button" id="switchPatientBtn">Switch/Clear</button>
            <small class="muted">Applies to patient fields; caller phone remains unchanged.</small>
          </div>
        </div>

        <div id="householdChooser" class="chooser hidden" aria-hidden="true">
          <div class="chooser-header">Possible matches for this caller</div>
          <div id="householdList" class="chooser-list"></div>
          <div class="chooser-actions" style="display:flex; align-items:center; gap:8px; justify-content:space-between; margin-top:6px;">
            <button class="btn ghost" type="button" id="householdSearchBtn">None of these → Search</button>
            <button class="icon-btn" type="button" id="closeHouseholdBtn" aria-label="Close chooser" title="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title"><i class="fa-regular fa-calendar"></i> Appointment Context</h3>
        <div class="row">
          <span class="label">Scheduled?</span>
          <div class="segmented" role="group" aria-label="Scheduled">
            <button type="button" class="seg active" data-value="yes" data-group="scheduled">Yes</button>
            <button type="button" class="seg" data-value="no" data-group="scheduled">No</button>
          </div>
        </div>

        <div class="row">
          <span class="label">Change</span>
          <div class="segmented" role="group" aria-label="Change Type">
            <button type="button" class="seg active" data-value="none" data-group="change">None</button>
            <button type="button" class="seg" data-value="cancellation" data-group="change">Cancellation</button>
            <button type="button" class="seg" data-value="reschedule" data-group="change">Reschedule</button>
          </div>
        </div>
        <label class="field">
          <span class="label">Office</span>
          <select id="officeSelect" aria-label="Office location">
            <option value="">Select office...</option>
            <option>Ann Arbor</option>
            <option>Plymouth</option>
            <option>Wixom</option>
          </select>
        </label>

        <div id="reasonBlock" class="reason hidden">
          <div class="field">
            <span class="label">Reasons</span>
            <div id="reasonToggleList" class="reason-toggle-list" role="group" aria-label="Reasons for appointment change"></div>
          </div>
          <label id="otherReasonWrap" class="field hidden">
            <span class="label">Other (details)</span>
            <input id="otherReason" type="text" placeholder="Enter details" />
          </label>
        </div>

        <div id="noApptReasonSection" class="reason hidden" aria-hidden="true">
          <div class="field">
            <span class="label">Why no appointment?</span>
            <div id="noApptReasonList" class="reason-toggle-list" role="group" aria-label="Reasons no appointment scheduled"></div>
          </div>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title"><i class="fa-regular fa-message"></i> Other Call Reasons</h3>
        <div class="reasons">
          <div class="reason-row">
            <span class="reason-label">Confirmation</span>
            <label class="checkbox">
              <input id="confirmCheck" type="checkbox" />
              <span class="checkmark" title="Confirmed" aria-label="Confirmed"></span>
            </label>
          </div>

          <div class="reason-row">
            <span class="reason-label">MA Call</span>
            <div class="actions">
              <button type="button" class="mini-btn" data-action="task">Task</button>
              <button type="button" class="mini-btn alt" data-action="transfer">Transfer</button>
            </div>
          </div>

          <div class="reason-row">
            <span class="reason-label">Results</span>
            <div class="actions">
              <button type="button" class="mini-btn" data-action="task">Task</button>
              <button type="button" class="mini-btn alt" data-action="transfer">Transfer</button>
            </div>
          </div>

          <div class="reason-row">
            <span class="reason-label">Provider Question</span>
            <div class="actions">
              <button type="button" class="mini-btn" data-action="task">Task</button>
              <button type="button" class="mini-btn alt" data-action="transfer">Transfer</button>
            </div>
          </div>

          <div class="reason-row">
            <span class="reason-label">Refill Request</span>
            <div class="actions">
              <button type="button" class="mini-btn" data-action="task">Task</button>
              <button type="button" class="mini-btn alt" data-action="transfer">Transfer</button>
            </div>
          </div>

          <div class="reason-row">
            <span class="reason-label">Billing Question</span>
            <div class="actions">
              <button type="button" class="mini-btn" data-action="task">Task</button>
              <button type="button" class="mini-btn alt" data-action="transfer">Transfer</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <footer class="mini-footer">
      <div class="left">
        <small id="statusMsg" class="muted">Testing mode — send the test caller to load mock data</small>
      </div>
      <div class="right">
        <button class="btn ghost" id="clearBtn">Clear</button>
        <button class="btn primary" id="doneBtn">Done</button>
      </div>
    </footer>
  </div>
  `;
}
