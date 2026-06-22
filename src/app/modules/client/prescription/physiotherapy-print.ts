import { Doctor, Hospital, Patient, Prescription } from '../../../shared/models/hospital.model';
import { getPatientAgeYears } from './vitals-analytics';
import { PhysioPlanPayload } from './physiotherapy-treatment-plan.model';

const NAVY = '#012f75';
const TEAL = '#019c9d';
const NAVY_SOFT = '#e8f1fa';
const TEAL_SOFT = '#e8f7f7';
const BORDER = '#c9dced';

export function buildPhysiotherapyPrintHtml(
  prescription: Prescription,
  patient: Patient,
  doctor: Doctor | null,
  plan: PhysioPlanPayload,
  hospital?: Hospital | null
): string {
  const doctorName = doctor?.user?.name || 'Physiotherapist';
  const doctorQualification = doctor?.qualification || 'DPT';
  const doctorSpecialization = doctor?.specialization || 'Physiotherapy';
  const hospitalName = hospital?.name || 'Clinic';
  const hospitalPhone = hospital?.phone || '-';
  const hospitalEmail = hospital?.email || '-';
  const hospitalAddress = [hospital?.address, hospital?.city, hospital?.country].filter(Boolean).join(', ') || '-';
  const hospitalLogoUrl = safeLogoUrl(hospital?.logoUrl);
  const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || '-';
  const patientAge = getPatientAgeYears(patient.dateOfBirth || null);
  const visitDate = formatPrintDate(prescription.createdAt || new Date().toISOString());
  const nextReview = formatPrintDate(prescription.followUpDate || plan.sessionPlan.nextSessionDate || '');
  const planNo = formatPlanNo(prescription._id);

  const painScore = displayPainScore(plan.summary.painScore || plan.assessment.painScore);
  const painLocation = plan.assessment.painLocation || '-';
  const rom = plan.summary.rom || plan.assessment.rom || '-';
  const muscleStrength = displayMuscleStrength(plan.summary.muscleStrength || plan.assessment.muscleStrength);
  const swelling = plan.summary.swelling || plan.assessment.swelling || '-';
  const gait = plan.summary.gait || plan.assessment.gait || '-';
  const functionalScore = displayFunctionalScore(plan.summary.functionalScore || plan.assessment.functionalScore);

  const therapyRows = plan.therapyPlan.length
    ? plan.therapyPlan
        .map(
          (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.therapy)}</td>
          <td>${escapeHtml(row.areaSite)}</td>
          <td>${escapeHtml(row.duration)}</td>
          <td>${escapeHtml(row.frequency)}</td>
          <td>${escapeHtml(row.sessions)}</td>
          <td>${escapeHtml(row.notes)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="7" class="empty">No therapy plan added</td></tr>`;

  const exerciseRows = plan.exercisePlan.length
    ? plan.exercisePlan
        .map(
          (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.exercise)}</td>
          <td>${escapeHtml(row.bodyArea)}</td>
          <td>${escapeHtml(row.sets)}</td>
          <td>${escapeHtml(row.repsHold)}</td>
          <td>${escapeHtml(row.frequency)}</td>
          <td>${escapeHtml(row.instructions)}</td>
          <td class="check">${row.isHomeExercise ? '&#10003;' : ''}</td>
          <td class="check">${row.isClinicExercise ? '&#10003;' : ''}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="9" class="empty">No exercise plan added</td></tr>`;

  const specialTestRows = (plan.assessment.specialTests || []).length
    ? plan.assessment.specialTests
        .map(
          (row) => `
        <tr>
          <td>${escapeHtml(row.testName)}</td>
          <td>${escapeHtml(row.result)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="2" class="empty">No special tests recorded</td></tr>`;

  const adviceNotes = [
    plan.assessment.clinicalNotes,
    plan.physioAssessment,
    prescription.examination,
    prescription.advice,
    plan.advice.nextReviewInstructions,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Physiotherapy Treatment Plan</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      color: #1f2937;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      margin: 0;
      padding: 0;
    }
    .page {
      margin: 0 auto;
      max-width: 210mm;
      padding: 8px 10px 14px;
    }
    .top-header {
      align-items: flex-start;
      border-bottom: 2px solid ${TEAL};
      display: grid;
      gap: 12px;
      grid-template-columns: 1.1fr 1.4fr 0.9fr;
      margin-bottom: 10px;
      padding-bottom: 10px;
    }
    .brand img {
      display: block;
      max-height: 52px;
      max-width: 150px;
      object-fit: contain;
    }
    .brand-fallback strong {
      color: ${NAVY};
      display: block;
      font-size: 18px;
      letter-spacing: 0.4px;
    }
    .brand-fallback span {
      color: ${TEAL};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .title-block { text-align: center; }
    .title-block h1 {
      color: ${NAVY};
      font-size: 22px;
      letter-spacing: 0.5px;
      margin: 0 0 4px;
    }
    .title-block p {
      color: ${TEAL};
      font-size: 12px;
      font-weight: 700;
      margin: 0;
    }
    .meta-block { font-size: 11px; }
    .meta-row {
      display: grid;
      gap: 4px;
      grid-template-columns: 88px 1fr;
      margin-bottom: 4px;
    }
    .meta-row span { color: #6b7280; }
    .meta-row strong { color: ${NAVY}; font-weight: 700; }
    .info-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 10px;
    }
    .info-card {
      border: 1px solid ${BORDER};
      border-radius: 6px;
      overflow: hidden;
    }
    .info-card-head {
      background: ${NAVY_SOFT};
      color: ${NAVY};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      padding: 6px 10px;
      text-transform: uppercase;
    }
    .info-card-body { padding: 8px 10px; }
    .field-row {
      display: grid;
      gap: 8px;
      grid-template-columns: 108px 1fr;
      margin-bottom: 5px;
    }
    .field-row:last-child { margin-bottom: 0; }
    .field-row dt {
      color: #6b7280;
      font-weight: 600;
      margin: 0;
    }
    .field-row dd {
      color: #111827;
      font-weight: 700;
      margin: 0;
    }
    .section {
      border: 1px solid ${BORDER};
      border-radius: 6px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .section-head {
      background: ${NAVY_SOFT};
      color: ${NAVY};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      padding: 6px 10px;
      text-transform: uppercase;
    }
    .section-body { padding: 8px 10px; }
    .consult-grid {
      display: grid;
      gap: 8px 16px;
      grid-template-columns: 1fr 1fr;
    }
    .consult-item strong {
      color: #6b7280;
      display: block;
      font-size: 10px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .consult-item p {
      color: #111827;
      font-weight: 600;
      margin: 0;
      white-space: pre-wrap;
    }
    .metrics {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }
    .metric {
      background: #fff;
      border: 1px solid ${BORDER};
      border-radius: 6px;
      padding: 8px 6px;
      text-align: center;
    }
    .metric-icon {
      align-items: center;
      display: flex;
      height: 34px;
      justify-content: center;
      margin: 0 auto 6px;
      width: 34px;
    }
    .metric-icon svg { height: 28px; width: 28px; }
    .metric-label {
      color: #6b7280;
      font-size: 9px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .metric-value {
      color: ${NAVY};
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
    }
    table {
      border-collapse: collapse;
      font-size: 10px;
      width: 100%;
    }
    th, td {
      border: 1px solid ${BORDER};
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: ${TEAL_SOFT};
      color: ${NAVY};
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    tr:nth-child(even) td { background: #f8fbff; }
    td.empty {
      color: #9ca3af;
      font-style: italic;
      text-align: center;
    }
    td.check {
      color: ${TEAL};
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      width: 42px;
    }
    .split-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr 1fr;
    }
    .session-list { list-style: none; margin: 0; padding: 0; }
    .session-list li {
      align-items: center;
      display: grid;
      gap: 8px;
      grid-template-columns: 24px 1fr;
      margin-bottom: 8px;
    }
    .session-list li:last-child { margin-bottom: 0; }
    .session-list strong { color: ${NAVY}; display: block; }
    .session-list span { color: #6b7280; font-size: 10px; }
    .advice-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .advice-card {
      border: 1px solid ${BORDER};
      border-radius: 6px;
      min-height: 120px;
      padding: 8px;
    }
    .advice-card h4 {
      align-items: center;
      color: ${NAVY};
      display: flex;
      font-size: 10px;
      gap: 6px;
      margin: 0 0 6px;
      text-transform: uppercase;
    }
    .advice-card ul {
      margin: 0;
      padding-left: 16px;
    }
    .advice-card li {
      margin-bottom: 4px;
    }
    .advice-card .muted,
    .muted { color: #9ca3af; font-style: italic; }
    .footer {
      border-top: 1px solid ${BORDER};
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr 120px 1fr;
      margin-top: 12px;
      padding-top: 12px;
    }
    .signature strong {
      color: ${NAVY};
      display: block;
      font-size: 10px;
      margin-bottom: 28px;
      text-transform: uppercase;
    }
    .signature-line {
      border-top: 1px solid #9ca3af;
      color: #374151;
      font-size: 11px;
      font-weight: 700;
      padding-top: 4px;
      width: 180px;
    }
    .qr-box {
      border: 1px dashed ${BORDER};
      border-radius: 6px;
      color: #6b7280;
      font-size: 8px;
      height: 88px;
      line-height: 1.3;
      padding: 6px;
      text-align: center;
    }
    .contact strong {
      color: ${NAVY};
      display: block;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .contact p {
      color: #374151;
      margin: 0 0 4px;
    }
    .note {
      color: ${TEAL};
      font-size: 10px;
      font-style: italic;
      margin-top: 10px;
      text-align: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { max-width: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="top-header">
      <div class="brand">
        ${
          hospitalLogoUrl
            ? `<img src="${escapeAttribute(hospitalLogoUrl)}" alt="${escapeAttribute(hospitalName)}" />`
            : `<div class="brand-fallback"><strong>${escapeHtml(hospitalName)}</strong><span>Clinic Management</span></div>`
        }
      </div>
      <div class="title-block">
        <h1>PHYSIOTHERAPY TREATMENT PLAN</h1>
        <p>${escapeHtml(plan.planTitle || 'Rehabilitation Plan')}</p>
      </div>
      <div class="meta-block">
        <div class="meta-row"><span>Date</span><strong>${escapeHtml(visitDate)}</strong></div>
        <div class="meta-row"><span>Plan No.</span><strong>${escapeHtml(planNo)}</strong></div>
        <div class="meta-row"><span>Next Review</span><strong>${escapeHtml(nextReview)}</strong></div>
      </div>
    </header>

    <section class="info-grid">
      <article class="info-card">
        <div class="info-card-head">Patient Information</div>
        <div class="info-card-body">
          <dl class="field-row"><dt>Patient Name</dt><dd>${escapeHtml(patientName)}</dd></dl>
          <dl class="field-row"><dt>Age / Gender</dt><dd>${escapeHtml(`${patientAge || '-'} / ${patient.gender || '-'}`)}</dd></dl>
          <dl class="field-row"><dt>MRN</dt><dd>${escapeHtml(patient.patientNo || '-')}</dd></dl>
          <dl class="field-row"><dt>Phone</dt><dd>${escapeHtml(patient.phone || '-')}</dd></dl>
        </div>
      </article>
      <article class="info-card">
        <div class="info-card-head">Physiotherapist</div>
        <div class="info-card-body">
          <dl class="field-row"><dt>Physiotherapist</dt><dd>${escapeHtml(doctorName)}</dd></dl>
          <dl class="field-row"><dt>Qualification</dt><dd>${escapeHtml(doctorQualification)}</dd></dl>
          <dl class="field-row"><dt>Specialization</dt><dd>${escapeHtml(doctorSpecialization)}</dd></dl>
        </div>
      </article>
    </section>

    <section class="section">
      <div class="section-head">Consultation Summary</div>
      <div class="section-body consult-grid">
        <div class="consult-item"><strong>Chief Complaint</strong><p>${escapeHtml(prescription.chiefComplaint || '-')}</p></div>
        <div class="consult-item"><strong>Diagnosis / Condition</strong><p>${escapeHtml(prescription.diagnosis || '-')}</p></div>
        <div class="consult-item"><strong>History</strong><p>${escapeHtml(prescription.history || '-')}</p></div>
        <div class="consult-item"><strong>Treatment Goal</strong><p>${escapeHtml(plan.treatmentGoal || '-')}</p></div>
        <div class="consult-item" style="grid-column: 1 / -1;"><strong>Advice / Notes</strong><p>${escapeHtml(adviceNotes || '-')}</p></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">Assessment Summary</div>
      <div class="section-body metrics">
        ${metricCard(iconPain(), 'Pain Score', painScore)}
        ${metricCard(iconLocation(), 'Pain Location', painLocation)}
        ${metricCard(iconRom(), 'ROM', rom)}
        ${metricCard(iconStrength(), 'Muscle Strength', muscleStrength)}
        ${metricCard(iconSwelling(), 'Swelling', swelling)}
        ${metricCard(iconGait(), 'Gait', gait)}
        ${metricCard(iconScore(), 'Functional Score', functionalScore)}
      </div>
    </section>

    <section class="section">
      <div class="section-head">Therapy Plan (Clinic Treatment)</div>
      <div class="section-body" style="padding:0;">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Therapy</th><th>Area / Site</th><th>Duration</th><th>Frequency</th><th>Sessions</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>${therapyRows}</tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="section-head">Exercise Plan (Home + Clinic)</div>
      <div class="section-body" style="padding:0;">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Exercise</th><th>Body Area</th><th>Sets</th><th>Reps / Hold</th><th>Frequency</th><th>Instructions</th><th>Home</th><th>Clinic</th>
            </tr>
          </thead>
          <tbody>${exerciseRows}</tbody>
        </table>
      </div>
    </section>

    <section class="split-grid">
      <article class="section" style="margin-bottom:0;">
        <div class="section-head">Session Plan</div>
        <div class="section-body">
          <ul class="session-list">
            <li>${iconCalendar()}<div><strong>Total Sessions</strong><span>${escapeHtml(plan.sessionPlan.totalSessions || '-')}</span></div></li>
            <li>${iconClock()}<div><strong>Frequency</strong><span>${escapeHtml(plan.sessionPlan.frequency || '-')}</span></div></li>
            <li>${iconReview()}<div><strong>Review After</strong><span>${escapeHtml(plan.sessionPlan.reviewAfter || '-')}</span></div></li>
            <li>${iconNext()}<div><strong>Next Session</strong><span>${escapeHtml(formatPrintDate(plan.sessionPlan.nextSessionDate || ''))}</span></div></li>
          </ul>
        </div>
      </article>
      <article class="section" style="margin-bottom:0;">
        <div class="section-head">Special Tests</div>
        <div class="section-body" style="padding:0;">
          <table>
            <thead><tr><th>Test</th><th>Result</th></tr></thead>
            <tbody>${specialTestRows}</tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="section" style="margin-top:10px;">
      <div class="section-head">Advice / Precautions</div>
      <div class="section-body advice-grid">
        <div class="advice-card">
          <h4>${iconCheck()} Do's</h4>
          <ul>${bulletItems(plan.advice.dos)}</ul>
        </div>
        <div class="advice-card">
          <h4>${iconCross()} Don'ts</h4>
          <ul>${bulletItems(plan.advice.donts)}</ul>
        </div>
        <div class="advice-card">
          <h4>${iconAlert()} Red Flags</h4>
          <ul>${bulletItems(plan.advice.redFlags)}</ul>
        </div>
        <div class="advice-card">
          <h4>${iconHome()} Home Care</h4>
          <ul>${bulletItems(plan.advice.homeCare || plan.advice.precautions)}</ul>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="signature">
        <strong>Physiotherapist Signature</strong>
        <div class="signature-line">${escapeHtml(doctorName)}</div>
      </div>
      <div class="qr-box">
        <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
          <rect x="4" y="4" width="18" height="18" fill="none" stroke="${NAVY}" stroke-width="3"/>
          <rect x="42" y="4" width="18" height="18" fill="none" stroke="${NAVY}" stroke-width="3"/>
          <rect x="4" y="42" width="18" height="18" fill="none" stroke="${NAVY}" stroke-width="3"/>
          <rect x="12" y="12" width="6" height="6" fill="${NAVY}"/>
          <rect x="50" y="12" width="6" height="6" fill="${NAVY}"/>
          <rect x="12" y="50" width="6" height="6" fill="${NAVY}"/>
          <rect x="30" y="30" width="6" height="6" fill="${TEAL}"/>
          <rect x="38" y="38" width="6" height="6" fill="${TEAL}"/>
          <rect x="46" y="46" width="10" height="10" fill="${NAVY}"/>
        </svg>
        <div>Scan for exercise videos and more information</div>
      </div>
      <div class="contact">
        <strong>${escapeHtml(hospitalName)}</strong>
        <p>Phone: ${escapeHtml(hospitalPhone)}</p>
        <p>Email: ${escapeHtml(hospitalEmail)}</p>
        <p>${escapeHtml(hospitalAddress)}</p>
      </div>
    </footer>

    <p class="note">Note: This plan is personalized for the patient. Follow the plan consistently for best results.</p>
  </div>
</body>
</html>`;
}

export function buildPhysiotherapySessionPrintHtml(
  patient: Patient,
  doctor: Doctor | null,
  session: {
    sessionNo: number;
    date: string;
    therapyDone: string;
    exerciseDone: string;
    painBefore: string;
    painAfter: string;
    remarks: string;
  }
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Physiotherapy Session Note</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#111827}
h1{color:${NAVY};font-size:20px}
table{width:100%;border-collapse:collapse;margin-top:12px}
td,th{border:1px solid ${BORDER};padding:8px;font-size:12px;text-align:left}
th{background:${NAVY_SOFT};color:${NAVY}}
</style>
</head><body>
<h1>Physiotherapy Session Note</h1>
<p><strong>Patient:</strong> ${escapeHtml(`${patient.firstName || ''} ${patient.lastName || ''}`.trim())} (${escapeHtml(patient.patientNo || '-')})</p>
<p><strong>Physiotherapist:</strong> ${escapeHtml(doctor?.user?.name || '-')}</p>
<table>
<tr><th>Session #</th><td>${session.sessionNo}</td></tr>
<tr><th>Date</th><td>${escapeHtml(session.date)}</td></tr>
<tr><th>Therapy Done</th><td>${escapeHtml(session.therapyDone)}</td></tr>
<tr><th>Exercise Done</th><td>${escapeHtml(session.exerciseDone)}</td></tr>
<tr><th>Pain Before</th><td>${escapeHtml(session.painBefore)}</td></tr>
<tr><th>Pain After</th><td>${escapeHtml(session.painAfter)}</td></tr>
<tr><th>Remarks</th><td>${escapeHtml(session.remarks)}</td></tr>
</table>
</body></html>`;
}

function metricCard(icon: string, label: string, value: string): string {
  return `
    <div class="metric">
      <div class="metric-icon">${icon}</div>
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
    </div>`;
}

function bulletItems(text: string): string {
  const lines = String(text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return '<li class="muted">—</li>';
  }

  return lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
}

function formatPrintDate(value: string | Date): string {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPlanNo(prescriptionId?: string): string {
  const raw = String(prescriptionId || '').trim();
  if (!raw) {
    return 'PT-DRAFT';
  }

  const suffix = raw.slice(-7).toUpperCase();
  return `PT-${suffix}`;
}

function displayPainScore(value: string | number): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '-';
  }

  return raw.includes('/') ? raw : `${raw} / 10`;
}

function displayMuscleStrength(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '-';
  }

  return raw.includes('/') ? raw : `${raw} / 5`;
}

function displayFunctionalScore(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '-';
  }

  return raw.includes('/') ? raw : `${raw} / 100`;
}

function safeLogoUrl(value?: string | null): string {
  const logoUrl = String(value || '').trim();
  if (!logoUrl) {
    return '';
  }

  return logoUrl.startsWith('data:image/') && logoUrl.length > 1000000 ? '' : logoUrl;
}

function iconPain(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.8"><circle cx="12" cy="7" r="3"/><path d="M8 21v-4l2-2 2 2 2-2 2 2v4"/><path d="M12 10v3"/></svg>`;
}

function iconLocation(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.8"><circle cx="12" cy="10" r="6"/><path d="M12 16v5"/><path d="M9 21h6"/></svg>`;
}

function iconRom(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.8"><path d="M5 18l6-10 4 6 4-8"/><circle cx="5" cy="18" r="1.5" fill="${TEAL}"/></svg>`;
}

function iconStrength(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.8"><path d="M7 14l3-6 3 3 4-7"/><path d="M6 18h12"/></svg>`;
}

function iconSwelling(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.8"><path d="M8 6c0 4 2 6 4 8s4 4 4 8"/><path d="M6 20h12"/></svg>`;
}

function iconGait(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.8"><circle cx="12" cy="5" r="2"/><path d="M10 8l-2 6 3 2-1 6"/><path d="M14 8l2 6-3 2 1 6"/></svg>`;
}

function iconScore(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.8"><path d="M5 18V8"/><path d="M10 18V12"/><path d="M15 18V10"/><path d="M20 18V6"/><path d="M4 18h16"/></svg>`;
}

function iconCalendar(): string {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${TEAL}" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`;
}

function iconClock(): string {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${TEAL}" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>`;
}

function iconReview(): string {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${TEAL}" stroke-width="1.8"><path d="M6 6h12v12H6z"/><path d="M9 10h6M9 14h4"/></svg>`;
}

function iconNext(): string {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${TEAL}" stroke-width="1.8"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 3v4M16 3v4"/><path d="M9 14l2 2 4-4"/></svg>`;
}

function iconCheck(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#16a34a" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M5 8l2 2 4-4"/></svg>`;
}

function iconCross(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></svg>`;
}

function iconAlert(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2"><path d="M8 2l6 11H2z"/><path d="M8 7v3"/><circle cx="8" cy="12" r="0.8" fill="#dc2626"/></svg>`;
}

function iconHome(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="${TEAL}" stroke-width="1.8"><path d="M2 7.5 8 2l6 5.5V14H2z"/><path d="M6.5 14v-4h3v4"/></svg>`;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
