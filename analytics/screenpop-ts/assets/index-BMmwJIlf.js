(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const u of document.querySelectorAll('link[rel="modulepreload"]'))m(u);new MutationObserver(u=>{for(const h of u)if(h.type==="childList")for(const b of h.addedNodes)b.tagName==="LINK"&&b.rel==="modulepreload"&&m(b)}).observe(document,{childList:!0,subtree:!0});function A(u){const h={};return u.integrity&&(h.integrity=u.integrity),u.referrerPolicy&&(h.referrerPolicy=u.referrerPolicy),u.crossOrigin==="use-credentials"?h.credentials="include":u.crossOrigin==="anonymous"?h.credentials="omit":h.credentials="same-origin",h}function m(u){if(u.ep)return;u.ep=!0;const h=A(u);fetch(u.href,h)}})();function Ie(){return`
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
  `}function De(o){function r(m){var u,h;try{(h=(u=o.host.ScreenpopAPI)==null?void 0:u.handleIncomingCall)==null||h.call(u,m)}catch(b){console.warn("[screenpop-ts] failed to handle call event",b)}}function A(){o.integrations.ganger.onCallAnswered(r),o.integrations.ganger.notifyScreenpopReady()}return{boot:A}}function je(){const o=new Set;function r(m){o.add(m),setTimeout(()=>m("+15551234567"),800)}function A(){console.info("[screenpop-ts] runtime ready; waiting for GangerAPI events")}return{onCallAnswered:r,notifyScreenpopReady:A}}function _e(){(function(){var de,ue,fe,he;const o=(e,t=document)=>t.querySelector(e),r=(e,t=document)=>Array.from(t.querySelectorAll(e));let A=!1,m=null,u="self",h="",b="";function E(e){try{const t=String(e||"").replace(/\D+/g,""),n=t.length===11&&t.startsWith("1")?t.slice(1):t.length===10?t:null;return n?`(${n.slice(0,3)}) ${n.slice(3,6)}-${n.slice(6)}`:e||""}catch{return e||""}}function a(){const e=o("#callerBadge");if(!e)return;if(!m){e.textContent="",e.classList.add("hidden"),e.setAttribute("aria-hidden","true");return}const n=(P("callfor")||u||"self")==="proxy"?" · Someone Else":"";e.textContent=`Caller: ${E(m)}${n}`,e.classList.remove("hidden"),e.setAttribute("aria-hidden","false")}const c={lookupPatientByPhone:null,searchPatients:null,getAppointmentForPatient:null,onReasonSubmit:null};window.ScreenpopAPI={configure({lookupPatientByPhone:e,searchPatients:t,getAppointmentForPatient:n,onReasonSubmit:s}={}){typeof e=="function"&&(c.lookupPatientByPhone=e),typeof t=="function"&&(c.searchPatients=t),typeof n=="function"&&(c.getAppointmentForPatient=n),typeof s=="function"&&(c.onReasonSubmit=s)},async handleIncomingCall(e){if(e&&(m=e,b="",B(""),_(),P("callfor")!=="proxy"&&Y(e),a(),c.lookupPatientByPhone))try{const t=await c.lookupPatientByPhone(e);Array.isArray(t)?t.length===1?G(t[0]):t.length>1?(le(t),Q()):re():t?(G(t),Q()):re()}catch(t){console.warn("lookupPatientByPhone failed",t)}},applyAppointment(e){if(!e)return;if(typeof e.scheduled=="boolean"&&K("scheduled",e.scheduled?"yes":"no"),e.change&&(A=!0,K("change",e.change)),(Object.prototype.hasOwnProperty.call(e,"apptType")||Object.prototype.hasOwnProperty.call(e,"appointmentType"))&&(b=(e.apptType??e.appointmentType??"")||""),Object.prototype.hasOwnProperty.call(e,"office")||Object.prototype.hasOwnProperty.call(e,"location")){const p=e.office??e.location??e.officeName??"";B(p)}M();const t=Ee(e);if(t.length)se(t,{preserveOtherText:!0}),t.includes("Other")&&i?i.value=e.otherText||"":!t.includes("Other")&&i&&(i.value=""),V({preserveOtherText:!0});else{const p=e.change||P("change");(p==="cancellation"||p==="reschedule")&&q()}const n=Re(e),s=Object.prototype.hasOwnProperty.call(e,"noAppointmentReasons")||Object.prototype.hasOwnProperty.call(e,"noAppointmentReason");n.length?ne(n):s&&_(),A=!1},setAppointmentType(e){b=e||""},setAppointmentOffice(e){B(e)},setNoAppointmentReasons(e){const t=Array.isArray(e)?e:e?[e]:[];t.length&&P("scheduled")!=="no"&&K("scheduled","no"),ne(t),M()},clearNoAppointmentReasons(){_(),M()}},r(".segmented").forEach(e=>{e.addEventListener("click",t=>{const n=t.target.closest(".seg");n&&(r(".seg",e).forEach(s=>s.classList.remove("active")),n.classList.add("active"),M())})});const d=o("#reasonBlock"),y=o("#reasonToggleList"),S=o("#otherReasonWrap"),g=o("#officeSelect"),i=o("#otherReason"),l=o("#noApptReasonSection"),f=o("#noApptReasonList"),v=o("#clearBtn"),R=o("#doneBtn"),x=o("#statusMsg"),D=o(".pt-type"),we=["No longer needed","Illness/Family Emergency","Work/School Conflict","Insurance","Referral","POOO r/s","Other"],Le=["Question Only","Location","Availability","Urgency","Referral","Insurance","Other"],Pe=["Ann Arbor","Plymouth","Wixom"];function oe(e){const t=String(e||"").trim().toLowerCase();return t&&Pe.find(s=>s.toLowerCase()===t)||""}function B(e){h=oe(e),g&&(g.value=h||"")}const H=new Map,k=new Set,U=new Map,O=new Set;function J(e){const t=String(e||"").trim();if(!t||!y)return null;if(H.has(t))return H.get(t);const n=document.createElement("button");return n.type="button",n.className="reason-toggle",n.setAttribute("data-reason",t),n.setAttribute("aria-pressed","false"),n.textContent=t,n.addEventListener("click",()=>Ce(t)),y.appendChild(n),H.set(t,n),n}function ae(){H.forEach((e,t)=>{const n=k.has(t);e.classList.toggle("is-selected",n),e.setAttribute("aria-pressed",n?"true":"false")})}function V({preserveOtherText:e=!1}={}){if(!S)return;const t=k.has("Other");S.classList.toggle("hidden",!t),S.setAttribute("aria-hidden",t?"false":"true"),!t&&!e&&i&&(i.value="")}function se(e=[],{preserveOtherText:t=!1}={}){k.clear(),(Array.isArray(e)?e:[e]).map(s=>String(s||"").trim()).filter(Boolean).forEach(s=>{J(s)&&k.add(s)}),ae(),V({preserveOtherText:t})}function q({preserveOtherText:e=!1}={}){se([],{preserveOtherText:e})}function ie(){return Array.from(k)}function Ce(e){J(e)&&(k.has(e)?k.delete(e):k.add(e),ae(),V())}function Ee(e){return e?Array.isArray(e.reasons)?$(e.reasons):typeof e.reason<"u"?$(e.reason):[]:[]}function Re(e){return e?Array.isArray(e.noAppointmentReasons)?$(e.noAppointmentReasons):typeof e.noAppointmentReason<"u"?$(e.noAppointmentReason):[]:[]}function $(e){return(Array.isArray(e)?e:[e]).map(n=>String(n||"").trim()).filter(Boolean)}we.forEach(J),V(),Le.forEach(ee),te(),l&&l.setAttribute("aria-hidden","true"),d&&d.setAttribute("aria-hidden","true"),g&&(B(g.value||""),g.addEventListener("change",()=>{B(g.value||"")}));function j(e){D&&r(".seg",D).forEach(t=>t.classList.toggle("active",t.getAttribute("data-ptype")===e))}D&&D.addEventListener("click",e=>{const t=e.target.closest(".seg");if(!t)return;const n=t.classList.contains("active");r(".seg",D).forEach(s=>s.classList.remove("active")),t.classList.add("active")});function Y(e){const t=o("#patientPhone");t&&(t.value=e)}function G(e){e.name&&(o("#patientName").value=e.name),e.phone&&Y(e.phone),e.mrn&&(o("#patientMRN").value=e.mrn),e.dob&&(o("#patientDOB").value=ke(e.dob)),typeof e.isExisting=="boolean"&&j(e.isExisting?"existing":"new")}function ke(e){try{if(!e)return"";const t=e instanceof Date?e:new Date(e),n=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0");return`${t.getFullYear()}-${n}-${s}`}catch{return""}}function K(e,t){r(`.seg[data-group="${e}"]`).forEach(n=>n.classList.toggle("active",n.getAttribute("data-value")===t))}function P(e){const t=o(`.seg[data-group="${e}"].active`);return t?t.getAttribute("data-value"):""}function M(){const e=P("change"),t=P("callfor")||"self",n=P("scheduled")||"yes";(e==="cancellation"||e==="reschedule")&&d?(d.classList.remove("hidden"),d.setAttribute("aria-hidden","false"),A&&q()):d&&(d.classList.add("hidden"),d.setAttribute("aria-hidden","true"),q());const s=o("#subjectSearchWrap");if(s&&(t==="proxy"?(s.classList.remove("hidden"),s.setAttribute("aria-hidden","false")):(s.classList.add("hidden"),s.setAttribute("aria-hidden","true"))),a(),l){const p=n==="no"&&e==="none";l.classList.toggle("hidden",!p),l.setAttribute("aria-hidden",p?"false":"true"),p||_()}}function le(e){const t=o("#householdChooser"),n=o("#householdList");!t||!n||(n.innerHTML="",e.forEach(s=>{const p=document.createElement("div");p.className="chooser-item",p.innerHTML=`
        <div>
          <div>${s.name||"Unknown"}</div>
          <div class="meta">DOB: ${s.dob||"—"} · MRN: ${s.mrn||"—"}</div>
        </div>
        <button class="btn" data-action="use">Use</button>
      `,p.querySelector('[data-action="use"]').addEventListener("click",()=>{G(s),t.classList.add("hidden"),t.setAttribute("aria-hidden","true"),T("Selected from matches")}),n.appendChild(p)}),t.classList.remove("hidden"),t.setAttribute("aria-hidden","false"))}function ce(){const e=o("#householdChooser");e&&(e.classList.add("hidden"),e.setAttribute("aria-hidden","true"))}function re(){const e=o("#noMatchBanner");e&&(e.classList.remove("hidden"),e.setAttribute("aria-hidden","false"));const t=o("#subjectSearchWrap");t&&(t.classList.remove("hidden"),t.setAttribute("aria-hidden","false"))}function Q(){const e=o("#noMatchBanner");e&&(e.classList.add("hidden"),e.setAttribute("aria-hidden","true"))}r(".reasons .mini-btn").forEach(e=>{e.addEventListener("click",()=>{const t=e.closest(".reason-row"),n=e.classList.contains("pressed");r(".mini-btn",t).forEach(s=>s.classList.remove("pressed")),n||e.classList.add("pressed")})});const W=o("#confirmCheck");if(W){const e=W.closest(".reason-row");e==null||e.addEventListener("click",t=>{t.target.closest("input,button,.mini-btn,.checkmark,label,select,textarea")||(W.checked=!W.checked)})}v==null||v.addEventListener("click",()=>{r('input[type="text"], input[type="tel"], input[type="date"]').forEach(t=>t.value=""),j("new"),r(".segmented").forEach(t=>{const n=o(".seg",t);r(".seg",t).forEach(s=>s.classList.remove("active")),n==null||n.classList.add("active")}),q(),d&&(d.classList.add("hidden"),d.setAttribute("aria-hidden","true")),_(),l&&(l.classList.add("hidden"),l.setAttribute("aria-hidden","true")),r(".reasons .mini-btn").forEach(t=>t.classList.remove("pressed"));const e=o("#confirmCheck");e&&(e.checked=!1),b="",B(""),T("Cleared"),a()}),R==null||R.addEventListener("click",()=>{const e=P("change");if((e==="cancellation"||e==="reschedule")&&c.onReasonSubmit){const t=ie(),n=t[0]||"",p=t.includes("Other")&&(i==null?void 0:i.value)||"";try{c.onReasonSubmit({change:e,reason:n,reasons:t,otherText:p})}catch(w){console.warn("onReasonSubmit failed",w)}}try{const t=xe(),n=pe(),s=`sp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,p={id:s,time:Date.now(),...n,...t};try{const w="screenpop_ledger_v1",C="screenpop_daily_entries_v1",L=JSON.parse(localStorage.getItem(w)||"[]");(!Array.isArray(L)||!L.find(N=>N&&N.id===s))&&(L.unshift(p),localStorage.setItem(w,JSON.stringify(L)));const I=JSON.parse(localStorage.getItem(C)||"[]");(!Array.isArray(I)||!I.find(N=>N&&N.id===s))&&(I.unshift(p),localStorage.setItem(C,JSON.stringify(I)))}catch{}try{const w=new BroadcastChannel("screenpop-analytics");w.postMessage({type:"submit",entry:p}),w.close()}catch{}try{localStorage.setItem(`screenpop_submit_${s}`,JSON.stringify(p))}catch{}}catch{}T("Captured (UI only)")});function T(e){x&&(x.textContent=e,x.style.transition="none",x.style.opacity="0.2",requestAnimationFrame(()=>{x.style.transition="opacity .25s ease",x.style.opacity="1",setTimeout(()=>x.textContent="UI only — no data saved",1200)}))}M(),document.addEventListener("click",e=>{const t=e.target.closest('.seg[data-group="callfor"]');if(!t)return;const n=t.getAttribute("data-value");if(n!==u){if(u=n,n==="proxy"){r("#patientName, #patientMRN, #patientDOB").forEach(p=>p.value="");const s=o("#patientPhone");s&&(s.value=""),j("new")}else m&&Y(m);a()}});const z=o("#applySubjectBtn"),X=o("#switchPatientBtn"),Z=o("#findSubjectBtn");z==null||z.addEventListener("click",()=>{var p,w,C,L;const e=((p=o("#subjectName"))==null?void 0:p.value)||"",t=((w=o("#subjectDOB"))==null?void 0:w.value)||"",n=((C=o("#subjectMRN"))==null?void 0:C.value)||"",s=((L=o("#subjectPhone"))==null?void 0:L.value)||"";e&&(o("#patientName").value=e),t&&(o("#patientDOB").value=t),n&&(o("#patientMRN").value=n),s&&(o("#patientPhone").value=s),n&&j("existing"),T("Subject applied")}),X==null||X.addEventListener("click",()=>{r("#patientName, #patientMRN, #patientDOB, #patientPhone").forEach(e=>e.value=""),j("new"),T("Subject cleared")}),Z==null||Z.addEventListener("click",async()=>{var t,n,s;if(!c.searchPatients){T("Search not configured");return}const e={name:((t=o("#subjectName"))==null?void 0:t.value)||"",dob:((n=o("#subjectDOB"))==null?void 0:n.value)||"",mrn:((s=o("#subjectMRN"))==null?void 0:s.value)||""};try{const p=await c.searchPatients(e);Array.isArray(p)&&p.length?(le(p),Q()):T("No results")}catch(p){console.warn("searchPatients failed",p)}}),(de=o("#showSearchBtn"))==null||de.addEventListener("click",()=>{const e=o("#subjectSearchWrap");e==null||e.classList.remove("hidden"),e==null||e.setAttribute("aria-hidden","false"),e==null||e.scrollIntoView({behavior:"smooth",block:"nearest"})}),(ue=o("#copyCallerToSubjectBtn"))==null||ue.addEventListener("click",()=>{if(!m)return;const e=o("#subjectPhone");e&&(e.value=m,T("Copied caller phone"))}),(fe=o("#householdSearchBtn"))==null||fe.addEventListener("click",()=>{ce();const e=o("#subjectSearchWrap");e==null||e.classList.remove("hidden"),e==null||e.setAttribute("aria-hidden","false"),e==null||e.scrollIntoView({behavior:"smooth",block:"nearest"})}),(he=o("#closeHouseholdBtn"))==null||he.addEventListener("click",ce);try{const e=new URL(window.location.href),t=e.searchParams.get("phone");t&&window.ScreenpopAPI.handleIncomingCall(t),e.searchParams.get("callfor")==="proxy"&&(r('.seg[data-group="callfor"]').forEach(s=>s.classList.toggle("active",s.getAttribute("data-value")==="proxy")),u="proxy",M())}catch{}function ee(e){const t=String(e||"").trim();if(!t||!f)return null;if(U.has(t))return U.get(t);const n=document.createElement("button");return n.type="button",n.className="reason-toggle",n.setAttribute("data-reason",t),n.setAttribute("aria-pressed","false"),n.textContent=t,n.addEventListener("click",()=>Oe(t)),f.appendChild(n),U.set(t,n),n}function te(){U.forEach((e,t)=>{const n=O.has(t);e.classList.toggle("is-selected",n),e.setAttribute("aria-pressed",n?"true":"false")})}function Oe(e){ee(e)&&(O.has(e)?O.delete(e):O.add(e),te())}function ne(e=[]){O.clear(),(Array.isArray(e)?e:[e]).map(n=>String(n||"").trim()).filter(Boolean).forEach(n=>{ee(n)&&O.add(n)}),te()}function _(){ne([])}function Te(){return Array.from(O)}function xe(){var me,be,ge,ye,ve;const e=ie(),t=e[0]||"",s=e.includes("Other")&&(i==null?void 0:i.value)||"",p=Te(),w=O.has("Question Only"),C=o(".pt-type .seg.active"),L=C?C.getAttribute("data-ptype"):"",I=!!((me=o("#confirmCheck"))!=null&&me.checked),N=Ne(),F=pe(),Be=b||F.apptType||"",Me=h||oe(F.office||F.location)||"";return{patient:{name:((be=o("#patientName"))==null?void 0:be.value)||"",phone:((ge=o("#patientPhone"))==null?void 0:ge.value)||"",mrn:((ye=o("#patientMRN"))==null?void 0:ye.value)||"",dob:((ve=o("#patientDOB"))==null?void 0:ve.value)||"",type:L||(typeof F.isExisting=="boolean"?F.isExisting?"existing":"new":"")},callFor:P("callfor")||"self",appointment:{scheduled:P("scheduled")==="yes",change:P("change")||"none",reason:t,reasons:e,noAppointmentReasons:p,questionOnly:w,otherText:s,confirmed:I,type:Be,office:Me},actions:N}}function Ne(){const e={};return r(".reasons .reason-row").forEach(t=>{var C,L;const n=((L=(C=t.querySelector(".reason-label"))==null?void 0:C.textContent)==null?void 0:L.trim().toLowerCase())||"";if(!n)return;const s=n.replace(/\s+/g,"_"),p=!!t.querySelector('.mini-btn[data-action="task"].pressed'),w=!!t.querySelector('.mini-btn[data-action="transfer"].pressed');e[s]={task:p,transfer:w}}),e}function pe(){try{const e=new URL(window.location.href),t=e.searchParams.get("ani")||e.searchParams.get("phone")||"",n=e.searchParams.get("agent")||"",s=e.searchParams.get("callId")||"",p=e.searchParams.get("apptType")||e.searchParams.get("appt")||"",w=e.searchParams.get("office")||e.searchParams.get("location")||"";return{ani:t,agent:n,callId:s,apptType:p,office:w}}catch{return{}}}window.addEventListener("message",async e=>{const t=e.data||{};try{switch(t.type){case"incoming_call":t.phone&&await window.ScreenpopAPI.handleIncomingCall(t.phone);break;case"appointment_update":window.ScreenpopAPI.applyAppointment(t.update||{});break;default:break}}catch(n){console.warn("message handling error",n)}})})()}function Fe(){(function(){const r={sessionId:null,acceptBackground:!0,stalenessMs:3e5,lastAppliedAt:0};function A(){return Date.now()}function m(a){return typeof a=="number"&&A()-a>r.stalenessMs}function u(a){if(!Array.isArray(a))return;const c=new Set(["scheduled","booked","confirmed","rescheduled","tentative"]);return a.some(d=>c.has(String(d.status||"").toLowerCase()))}function h(a){switch(String(a||"").toLowerCase()){case"cancel":case"cancellation":return"cancellation";case"reschedule":return"reschedule";case"book":case"confirm":default:return"none"}}function b({scheduled:a,change:c,reason:d,reasons:y,otherText:S,apptType:g,office:i}){var f;const l={};typeof a=="boolean"&&(l.scheduled=a),c&&(l.change=c),Array.isArray(y)&&y.length?(l.reasons=y,!d&&y.length&&(l.reason=y[0])):d&&(l.reason=d),S&&(l.otherText=S),typeof g=="string"&&(l.apptType=g),typeof i=="string"&&(l.office=i),Object.keys(l).length&&((f=window.ScreenpopAPI)==null||f.applyAppointment(l),r.lastAppliedAt=A())}function E({sessionId:a,occurredAt:c}){return a&&r.sessionId&&a!==r.sessionId?!!r.acceptBackground:!(c&&m(c))}window.ScreenpopLogic={configure({sessionId:a,acceptBackground:c,stalenessMs:d}={}){a&&(r.sessionId=a),typeof c=="boolean"&&(r.acceptBackground=c),typeof d=="number"&&(r.stalenessMs=d)},processCrmSnapshot(a={}){var y,S,g,i,l,f,v,R;if(!E(a))return;const c=u(a.appointments),d=h((y=a.lastChange)==null?void 0:y.type);b({scheduled:c,change:d,reason:(S=a.lastChange)==null?void 0:S.reason,reasons:(g=a.lastChange)==null?void 0:g.reasons,otherText:(i=a.lastChange)==null?void 0:i.otherText,apptType:((l=a.lastChange)==null?void 0:l.apptType)??((f=a.lastChange)==null?void 0:f.appointmentType)??((v=a.lastChange)==null?void 0:v.typeName),office:((R=a.lastChange)==null?void 0:R.office)??a.office??a.location})},processCrmEvent(a={}){if(!E(a))return;let c;Array.isArray(a.appointments)?c=u(a.appointments):typeof a.remainingScheduled=="number"?c=a.remainingScheduled>0:String(a.type).toLowerCase()==="cancel"&&(c=!1);const d=h(a.type);b({scheduled:c,change:d,reason:a.reason,reasons:a.reasons,otherText:a.otherText,apptType:a.apptType??a.appointmentType??a.typeName,office:a.office??a.location})}}})()}function He(){(function(){var E;const o=[{id:"p1",name:"John Smith",phone:"+1 (555) 123-4567",mrn:"A123456",dob:"1985-03-15",isExisting:!0},{id:"p2",name:"Sarah Johnson",phone:"+1 (555) 456-7890",mrn:"B998877",dob:"1992-08-22",isExisting:!0},{id:"p3",name:"Michael Brown",phone:"+1 (555) 777-1234",mrn:"C445566",dob:"1978-11-05",isExisting:!0},{id:"p4",name:"Sarah Smith",phone:"+1 (555) 333-4444",mrn:"D112233",dob:"1979-01-10",isExisting:!0}],r=new Map([["+15551234567",o.find(a=>a.id==="p1")],["+15554567890",o.find(a=>a.id==="p2")],["+15557771234",o.find(a=>a.id==="p3")],["+15553334444",[o.find(a=>a.id==="p4"),o.find(a=>a.id==="p1")]]]);function A(a){if(!a)return"";const c=String(a).replace(/\D+/g,"");return c.length===11&&c.startsWith("1")?`+${c}`:c.length===10?`+1${c}`:`+${c}`}(E=window.ScreenpopAPI)==null||E.configure({lookupPatientByPhone:async a=>{const c=A(a);await b(300);const d=r.get(c);return d||null},searchPatients:async({name:a,dob:c,mrn:d})=>{await b(300);const y=(a||"").trim().toLowerCase(),S=(c||"").trim(),g=(d||"").trim().toLowerCase();return o.filter(i=>{const l=y?i.name.toLowerCase().includes(y):!0,f=S?i.dob===S:!0,v=g?i.mrn.toLowerCase()===g:!0;return l&&f&&v}).slice(0,5)},onReasonSubmit:({change:a,reason:c,otherText:d})=>{console.log("[MockCRM] Reason captured:",{change:a,reason:c,otherText:d})}}),document.addEventListener("DOMContentLoaded",async()=>{const{phone:a,demo:c}=h(),d=a||m(c);await b(300),await window.ScreenpopAPI.handleIncomingCall(d);const y=u(c);y&&(await b(600),window.ScreenpopAPI.applyAppointment(y))});function m(a){switch(a){case"existing_scheduled":return"+15551234567";case"existing_cancelled":return"+15554567890";case"existing_rescheduled":return"+15557771234";case"household":return"+15553334444";case"new":return"+15559998888";default:return"+15551234567"}}function u(a){switch(a){case"existing_scheduled":return{scheduled:!0,change:"none"};case"existing_cancelled":return{scheduled:!0,change:"cancellation",reason:"Illness/Family Emergency"};case"existing_rescheduled":return{scheduled:!0,change:"reschedule",reason:"Work/School Conflict"};case"new":return{scheduled:!1,change:"none"};default:return{scheduled:!0,change:"none"}}}function h(){try{const a=new URL(window.location.href);return{phone:a.searchParams.get("phone"),demo:a.searchParams.get("demo")}}catch{return{phone:null,demo:null}}}function b(a){return new Promise(c=>setTimeout(c,a))}})()}function Ue(){(function(){const o=(i,l=document)=>l.querySelector(i),r=(i,l=document)=>Array.from(l.querySelectorAll(i)),A="+15551234567",m="Testing mode — send the test caller to load mock data";let u=null;function h(i){const l=o("#statusMsg");l&&typeof i=="string"&&(l.textContent=i)}async function b(){await E(A),h(`Loaded mock caller ${A}`)}async function E(i){await window.ScreenpopAPI.handleIncomingCall(i),S(),g()}function a(){var l,f;document.querySelectorAll('.seg[data-group="callfor"]').forEach(v=>{v.classList.toggle("active",v.getAttribute("data-value")==="self")});const i=document.getElementById("subjectSearchWrap");i&&(i.classList.add("hidden"),i.setAttribute("aria-hidden","true")),(l=window.ScreenpopAPI)==null||l.applyAppointment({scheduled:!0,change:"none"}),(f=window.ScreenpopAPI)==null||f.clearNoAppointmentReasons()}function c(){r('input[type="text"], input[type="tel"], input[type="date"]').forEach(v=>{v.value=""}),d("new"),a(),r(".reasons .mini-btn").forEach(v=>v.classList.remove("pressed"));const i=o("#confirmCheck");i&&(i.checked=!1),y();const l=o("#apptTypeSelect");l&&(l.value="");const f=o("#officePicker");f&&(f.value=""),S(),g(),h(m)}document.addEventListener("DOMContentLoaded",()=>{var R;u="sess_"+Math.random().toString(36).slice(2,8),(R=window.ScreenpopLogic)==null||R.configure({sessionId:u,acceptBackground:!1});const i=o("#runScenario"),l=o("#resetScenario"),f=o("#apptTypeSelect"),v=o("#officePicker");i==null||i.addEventListener("click",b),l==null||l.addEventListener("click",c),f==null||f.addEventListener("change",S),v==null||v.addEventListener("change",g),a(),S(),g(),h(m)});function d(i){const l=o(".pt-type");l&&r(".seg",l).forEach(f=>f.classList.toggle("active",f.getAttribute("data-ptype")===i))}function y(){var i;r('.reason-toggle[aria-pressed="true"]').forEach(l=>l.click()),(i=window.ScreenpopAPI)==null||i.clearNoAppointmentReasons()}function S(){var f;const i=o("#apptTypeSelect");if(!i)return;const l=i.value||"";(f=window.ScreenpopAPI)==null||f.setAppointmentType(l)}function g(){var f;const i=o("#officePicker"),l=(i==null?void 0:i.value)||"";(f=window.ScreenpopAPI)==null||f.setAppointmentOffice(l)}})()}const Ae=document.getElementById("app");if(!Ae)throw new Error("Screenpop root element not found");Ae.innerHTML=Ie();_e();Fe();Ue();let Se=!0;try{new URL(window.location.href).searchParams.get("mock")==="0"&&(Se=!1)}catch{}Se&&He();const Ve=De({host:window,integrations:{ganger:je()}});Ve.boot();
