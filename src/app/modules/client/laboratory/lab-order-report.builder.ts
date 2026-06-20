import {
  Hospital,
  LabComparisonRow,
  LabOrder,
  LabOrderItem,
  LabResultParameter,
} from '../../../shared/models/hospital.model';
import { resolveLabPrintDetails } from './lab-print-details';

export interface LabReportRow {
  testName: string;
  subCategory: string;
  parameterName: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  status: string;
  statusKey: string;
}

export interface LabReportContext {
  order: LabOrder;
  hospital: Hospital | null;
  comparison: LabComparisonRow[];
}

const NA = 'Not Available';

const TREND_TARGETS = [
  { key: 'creatinine', label: 'Creatinine', patterns: ['creatinine', 'serum creatinine'] },
  { key: 'urea', label: 'Urea', patterns: ['urea', 'blood urea', 'bun'] },
  { key: 'sodium', label: 'Sodium', patterns: ['sodium', 'na+', 'serum sodium'] },
  {
    key: 'cbc',
    label: 'CBC (Haemoglobin)',
    patterns: ['hemoglobin', 'haemoglobin', 'hb', 'hgb'],
  },
];

export function buildLabOrderReportHtml(context: LabReportContext): string {
  const rows = collectReportRows(context.order);
  const abnormal = rows.filter((row) => ['low', 'high', 'critical'].includes(row.statusKey));
  const summary = buildClinicalSummary(rows, abnormal);
  const graphs = buildTrendGraphs(context.comparison);
  const patient = context.order.patient;
  const printDetails = resolveLabPrintDetails(context.hospital, {
    mode: 'report',
    order: context.order,
  });
  const labName = displayValue(printDetails.name) === NA ? 'Laboratory' : printDetails.name;
  const collectionDate = formatReportDate(
    context.order.sampleCollectionAt ||
      earliestDate(context.order.items.map((item) => item.collectedAt))
  );
  const reportingDate = formatReportDate(
    latestDate(context.order.items.map((item) => item.verifiedAt || item.resultEnteredAt)) ||
      context.order.updatedAt
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(context.order.orderNo)} - Lab Report</title>
    <style>${reportStyles()}</style>
  </head>
  <body>
    <div class="report">
      <header class="report-header">
        <div class="header-brand">
          <h1>${escapeHtml(labName.toUpperCase())}</h1>
          <p class="header-sub">${escapeHtml(printDetails.tagline)}</p>
          ${printDetails.addressLine ? `<p class="header-address">${escapeHtml(printDetails.addressLine)}</p>` : ''}
          ${printDetails.phone ? `<p class="header-address">${escapeHtml(printDetails.phone)}</p>` : ''}
          ${printDetails.email ? `<p class="header-address">${escapeHtml(printDetails.email)}</p>` : ''}
        </div>
        <div class="header-meta">
          <div class="meta-box">
            <span class="meta-label">Report ID</span>
            <strong>${escapeHtml(context.order.orderNo)}</strong>
          </div>
          <div class="meta-box">
            <span class="meta-label">Collection Date</span>
            <strong>${escapeHtml(collectionDate)}</strong>
          </div>
          <div class="meta-box">
            <span class="meta-label">Reporting Date</span>
            <strong>${escapeHtml(reportingDate)}</strong>
          </div>
        </div>
      </header>

      <section class="patient-panel">
        <h2>Patient Information</h2>
        <div class="patient-grid">
          <div class="patient-field">
            <span>Name</span>
            <strong>${escapeHtml(patientName(patient))}</strong>
          </div>
          <div class="patient-field">
            <span>Age / Gender</span>
            <strong>${escapeHtml(patientAgeGender(patient))}</strong>
          </div>
          <div class="patient-field">
            <span>MRN</span>
            <strong>${escapeHtml(displayValue(patient?.patientNo))}</strong>
          </div>
          <div class="patient-field">
            <span>Location</span>
            <strong>${escapeHtml(patientLocation(context.order))}</strong>
          </div>
          <div class="patient-field patient-field-wide">
            <span>Consultant</span>
            <strong>${escapeHtml(consultantName(context.order))}</strong>
          </div>
        </div>
      </section>

      <section class="results-panel">
        <h2>Laboratory Results</h2>
        <table class="results-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Reference Range</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((row) => resultRowHtml(row)).join('') : emptyResultRow()}
          </tbody>
        </table>
      </section>

      <section class="abnormal-panel ${abnormal.length ? '' : 'abnormal-panel-empty'}">
        <h2>Abnormal Values</h2>
        ${
          abnormal.length
            ? `<div class="abnormal-list">${abnormal.map((row) => abnormalItemHtml(row)).join('')}</div>`
            : '<p class="muted">No abnormal values detected in this report.</p>'
        }
      </section>

      <section class="graphs-panel page-break-before">
        <h2>Trend Analysis</h2>
        <div class="graph-grid">
          ${graphs.map((graph) => graphCardHtml(graph)).join('')}
        </div>
      </section>

      <section class="summary-panel">
        <h2>Clinical Interpretation Summary</h2>
        <div class="summary-grid">
          <article class="summary-card">
            <h3>Kidney Function</h3>
            <p>${escapeHtml(summary.kidney)}</p>
          </article>
          <article class="summary-card">
            <h3>Infection Signs</h3>
            <p>${escapeHtml(summary.infection)}</p>
          </article>
          <article class="summary-card">
            <h3>Electrolyte Balance</h3>
            <p>${escapeHtml(summary.electrolyte)}</p>
          </article>
        </div>
        <p class="summary-note">This summary is generated from recorded laboratory values and is intended as a screening aid only.</p>
      </section>

      <footer class="report-footer">
        <div class="footer-line">Electronically verified report</div>
        <div class="footer-line footer-warning">Physician interpretation required before clinical decision-making</div>
        <div class="footer-meta">Generated ${escapeHtml(formatReportDate(new Date().toISOString()))}</div>
      </footer>
    </div>
  </body>
</html>`;
}

function collectReportRows(order: LabOrder): LabReportRow[] {
  const rows: LabReportRow[] = [];

  for (const item of order.items || []) {
    for (const parameter of item.parameters || []) {
      rows.push({
        testName: displayValue(item.testName),
        subCategory: displayValue(parameter.subCategory),
        parameterName: displayValue(parameter.parameterName),
        resultValue: displayValue(parameter.resultValue),
        unit: displayValue(parameter.unit),
        referenceRange: referenceRange(parameter),
        status: statusLabel(parameter.status),
        statusKey: String(parameter.status || '').toLowerCase(),
      });
    }
  }

  return rows;
}

function resultRowHtml(row: LabReportRow): string {
  const abnormalRow = ['low', 'high', 'critical'].includes(row.statusKey) ? ' row-abnormal' : '';
  const parameterLabel =
    row.subCategory !== NA && row.subCategory !== row.parameterName
      ? `${row.subCategory} · ${row.parameterName}`
      : row.parameterName;

  return `<tr class="${abnormalRow}">
    <td><strong>${escapeHtml(row.testName)}</strong><br /><span class="param-name">${escapeHtml(parameterLabel)}</span></td>
    <td class="result-value">${escapeHtml(row.resultValue)}</td>
    <td>${escapeHtml(row.unit)}</td>
    <td>${escapeHtml(row.referenceRange)}</td>
    <td><span class="status-pill status-${escapeHtml(row.statusKey || 'unknown')}">${escapeHtml(row.status)}</span></td>
  </tr>`;
}

function emptyResultRow(): string {
  return `<tr><td colspan="5" class="empty-cell">${NA}</td></tr>`;
}

function abnormalItemHtml(row: LabReportRow): string {
  return `<div class="abnormal-item status-${escapeHtml(row.statusKey)}">
    <strong>${escapeHtml(row.testName)} — ${escapeHtml(row.parameterName)}</strong>
    <span>${escapeHtml(row.resultValue)} ${escapeHtml(row.unit !== NA ? row.unit : '')}</span>
    <em>${escapeHtml(row.status)}</em>
  </div>`;
}

function buildTrendGraphs(comparison: LabComparisonRow[]): Array<{
  label: string;
  svg: string;
  caption: string;
}> {
  return TREND_TARGETS.map((target) => {
    const row = findComparisonRow(comparison, target.patterns);
    if (!row) {
      return { label: target.label, svg: naSvg(), caption: NA };
    }

    const caption = buildTrendCaption(row);
    return { label: target.label, svg: buildTrendSvg(row), caption };
  });
}

function graphCardHtml(graph: { label: string; svg: string; caption: string }): string {
  return `<article class="graph-card">
    <h3>${escapeHtml(graph.label)}</h3>
    <div class="graph-svg">${graph.svg}</div>
    <p class="graph-caption">${escapeHtml(graph.caption)}</p>
  </article>`;
}

function findComparisonRow(comparison: LabComparisonRow[], patterns: string[]): LabComparisonRow | null {
  const normalized = patterns.map((pattern) => pattern.toLowerCase());
  return (
    comparison.find((row) => {
      const name = row.parameterName.toLowerCase();
      return normalized.some((pattern) => name === pattern || name.includes(pattern));
    }) || null
  );
}

function buildTrendCaption(row: LabComparisonRow): string {
  const points = sortedHistory(row);
  if (!points.length) {
    return NA;
  }

  const latest = points[points.length - 1];
  const values = points
    .map((point) => parseNumeric(point.resultValue))
    .filter((value): value is number => value != null);

  if (values.length < 2) {
    return `Latest: ${displayValue(latest.resultValue)} ${displayValue(row.unit)}`;
  }

  const first = values[0];
  const last = values[values.length - 1];
  const direction = last > first ? 'rising' : last < first ? 'declining' : 'stable';
  return `${points.length} readings · ${direction} trend · Latest ${displayValue(latest.resultValue)} ${displayValue(row.unit)}`;
}

function sortedHistory(row: LabComparisonRow) {
  return [...row.history]
    .filter((point) => point.date)
    .sort((left, right) => new Date(left.date || 0).getTime() - new Date(right.date || 0).getTime())
    .slice(-6);
}

function buildTrendSvg(row: LabComparisonRow): string {
  const points = sortedHistory(row)
    .map((point) => ({
      date: point.date || '',
      value: parseNumeric(point.resultValue),
      label: displayValue(point.resultValue),
    }))
    .filter((point) => point.value != null) as Array<{ date: string; value: number; label: string }>;

  if (points.length < 2) {
    return naSvg();
  }

  const width = 280;
  const height = 120;
  const padding = { top: 16, right: 12, bottom: 28, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = padding.left + (index / (points.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((point.value - min) / range) * chartHeight;
    return { x, y, point };
  });

  const polyline = coords.map((coord) => `${coord.x},${coord.y}`).join(' ');
  const refMin = row.referenceMin;
  const refMax = row.referenceMax;
  let refBand = '';

  if (refMin != null && refMax != null) {
    const yTop = padding.top + chartHeight - ((refMax - min) / range) * chartHeight;
    const yBottom = padding.top + chartHeight - ((refMin - min) / range) * chartHeight;
    const bandTop = Math.min(yTop, yBottom);
    const bandHeight = Math.abs(yBottom - yTop);
    refBand = `<rect x="${padding.left}" y="${bandTop}" width="${chartWidth}" height="${bandHeight}" fill="#e8f8ef" opacity="0.9" />`;
  }

  const dots = coords
    .map(
      (coord) =>
        `<circle cx="${coord.x}" cy="${coord.y}" r="3.5" fill="#0b7285" />
         <text x="${coord.x}" y="${height - 8}" text-anchor="middle" font-size="8" fill="#5c6b7a">${escapeHtml(formatShortDate(coord.point.date))}</text>`
    )
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="120" role="img" aria-label="${escapeHtml(row.parameterName)} trend">
    ${refBand}
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#d7dee7" />
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#d7dee7" />
    <polyline points="${polyline}" fill="none" stroke="#0b7285" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
    ${dots}
  </svg>`;
}

function naSvg(): string {
  return `<div class="graph-na">${NA}</div>`;
}

function buildClinicalSummary(
  rows: LabReportRow[],
  abnormal: LabReportRow[]
): { kidney: string; infection: string; electrolyte: string } {
  const kidneyMarkers = findRowsByPatterns(rows, ['creatinine', 'urea', 'bun', 'egfr', 'gfr']);
  const infectionMarkers = findRowsByPatterns(rows, [
    'wbc',
    'white blood',
    'neutrophil',
    'crp',
    'esr',
    'procalcitonin',
  ]);
  const electrolyteMarkers = findRowsByPatterns(rows, ['sodium', 'potassium', 'chloride', 'bicarbonate', 'calcium']);

  return {
    kidney: interpretKidney(kidneyMarkers, abnormal),
    infection: interpretInfection(infectionMarkers, abnormal),
    electrolyte: interpretElectrolytes(electrolyteMarkers, abnormal),
  };
}

function interpretKidney(markers: LabReportRow[], abnormal: LabReportRow[]): string {
  if (!markers.length) {
    return 'Kidney function markers were not available in this order.';
  }

  const flagged = markers.filter((marker) => abnormal.includes(marker));
  if (!flagged.length) {
    return 'Recorded kidney function parameters are within reference limits. No acute renal impairment pattern detected from available values.';
  }

  const details = flagged
    .map((marker) => `${marker.parameterName} ${marker.resultValue}${marker.unit !== NA ? ` ${marker.unit}` : ''} (${marker.status})`)
    .join('; ');
  return `Abnormal kidney-related values noted: ${details}. Correlate with hydration status, medications, and clinical context.`;
}

function interpretInfection(markers: LabReportRow[], abnormal: LabReportRow[]): string {
  if (!markers.length) {
    return 'No infection-related markers (e.g. WBC, CRP) were available in this order.';
  }

  const flagged = markers.filter((marker) => abnormal.includes(marker));
  if (!flagged.length) {
    return 'Available infection-related markers do not show an abnormal pattern in this report.';
  }

  const highWbc = flagged.find((marker) => /wbc|white blood/i.test(marker.parameterName) && marker.statusKey === 'high');
  if (highWbc) {
    return `Elevated ${highWbc.parameterName} (${highWbc.resultValue}) may suggest active infection or inflammation. Clinical correlation and repeat testing may be warranted.`;
  }

  const details = flagged.map((marker) => `${marker.parameterName} ${marker.resultValue} (${marker.status})`).join('; ');
  return `Abnormal infection-related markers: ${details}. Evaluate for infectious or inflammatory process.`;
}

function interpretElectrolytes(markers: LabReportRow[], abnormal: LabReportRow[]): string {
  if (!markers.length) {
    return 'Electrolyte panel values were not available in this order.';
  }

  const flagged = markers.filter((marker) => abnormal.includes(marker));
  if (!flagged.length) {
    return 'Recorded electrolyte values appear within reference limits based on available results.';
  }

  const details = flagged
    .map((marker) => `${marker.parameterName} ${marker.resultValue}${marker.unit !== NA ? ` ${marker.unit}` : ''} (${marker.status})`)
    .join('; ');
  return `Electrolyte imbalance suggested by: ${details}. Review fluid status, diuretics, and renal function.`;
}

function findRowsByPatterns(rows: LabReportRow[], patterns: string[]): LabReportRow[] {
  const normalized = patterns.map((pattern) => pattern.toLowerCase());
  return rows.filter((row) => {
    const name = row.parameterName.toLowerCase();
    return normalized.some((pattern) => name === pattern || name.includes(pattern));
  });
}

function patientName(patient: LabOrder['patient']): string {
  if (!patient) {
    return NA;
  }
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  return name || NA;
}

function patientAgeGender(patient: LabOrder['patient']): string {
  if (!patient) {
    return NA;
  }

  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : NA;
  const gender = patient.gender ? capitalize(patient.gender) : NA;
  if (age === NA && gender === NA) {
    return NA;
  }
  if (age === NA) {
    return gender;
  }
  if (gender === NA) {
    return `${age} Years`;
  }
  return `${age} Years / ${gender}`;
}

function patientLocation(order: LabOrder): string {
  const address = order.patient?.address;
  if (address) {
    return address;
  }

  const labels: Record<string, string> = {
    doctor: 'Outpatient / Clinic',
    'walk-in': 'Walk-in Collection',
    admission: 'Inpatient Ward',
    emergency: 'Emergency Department',
  };

  return labels[String(order.source || '')] || NA;
}

function consultantName(order: LabOrder): string {
  return displayValue(order.referredBy || order.doctor?.name);
}

function referenceRange(parameter: LabResultParameter): string {
  if (parameter.referenceText) {
    return parameter.referenceText;
  }
  if (parameter.referenceMin != null && parameter.referenceMax != null) {
    return `${parameter.referenceMin} - ${parameter.referenceMax}`;
  }
  return NA;
}

function statusLabel(status?: string): string {
  const key = String(status || '').toLowerCase();
  const labels: Record<string, string> = {
    normal: 'Normal',
    high: 'High',
    low: 'Low',
    critical: 'Critical',
  };
  return labels[key] || NA;
}

function displayValue(value: string | number | null | undefined): string {
  if (value == null) {
    return NA;
  }
  const text = String(value).trim();
  return text || NA;
}

function calculateAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) {
    return NA;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 ? String(age) : NA;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatReportDate(value?: string | null): string {
  if (!value) {
    return NA;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return NA;
  }
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function earliestDate(values: Array<string | undefined>): string | undefined {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(String(value)).getTime())
    .filter((time) => !Number.isNaN(time));
  if (!timestamps.length) {
    return undefined;
  }
  return new Date(Math.min(...timestamps)).toISOString();
}

function latestDate(values: Array<string | undefined>): string | undefined {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(String(value)).getTime())
    .filter((time) => !Number.isNaN(time));
  if (!timestamps.length) {
    return undefined;
  }
  return new Date(Math.max(...timestamps)).toISOString();
}

function parseNumeric(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reportStyles(): string {
  return `
    @page {
      margin: 12mm 10mm;
      size: A4 portrait;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      background: #fff;
      color: #1f2a37;
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
    }

    .report {
      margin: 0 auto;
      max-width: 190mm;
      padding: 0;
    }

    .report-header {
      border-bottom: 3px solid #c92a2a;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 12px;
    }

    .header-brand h1 {
      color: #c92a2a;
      font-size: 22px;
      letter-spacing: 0.04em;
      margin: 0 0 4px;
    }

    .header-sub,
    .header-address {
      color: #5c6b7a;
      font-size: 11px;
      margin: 2px 0;
    }

    .header-meta {
      display: grid;
      gap: 6px;
      min-width: 180px;
    }

    .meta-box {
      background: #f8fafc;
      border: 1px solid #d7dee7;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: right;
    }

    .meta-label {
      color: #5c6b7a;
      display: block;
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .meta-box strong {
      font-size: 11px;
    }

    h2 {
      border-left: 4px solid #0b7285;
      color: #17324d;
      font-size: 13px;
      letter-spacing: 0.03em;
      margin: 0 0 10px;
      padding-left: 8px;
      text-transform: uppercase;
    }

    .patient-panel,
    .results-panel,
    .abnormal-panel,
    .graphs-panel,
    .summary-panel {
      margin-bottom: 14px;
    }

    .patient-grid {
      border: 1px solid #d7dee7;
      border-radius: 8px;
      display: grid;
      gap: 0;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      overflow: hidden;
    }

    .patient-field {
      border-bottom: 1px solid #e8edf2;
      border-right: 1px solid #e8edf2;
      padding: 8px 10px;
    }

    .patient-field:nth-child(2n) {
      border-right: 0;
    }

    .patient-field-wide {
      grid-column: 1 / -1;
    }

    .patient-field span {
      color: #5c6b7a;
      display: block;
      font-size: 9px;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
      text-transform: uppercase;
    }

    .patient-field strong {
      font-size: 12px;
    }

    .results-table {
      border-collapse: collapse;
      width: 100%;
    }

    .results-table th,
    .results-table td {
      border: 1px solid #d7dee7;
      font-size: 10px;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }

    .results-table th {
      background: #f1f5f9;
      color: #17324d;
      font-size: 9px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .results-table tbody tr:nth-child(even) {
      background: #fbfdff;
    }

    .param-name {
      color: #5c6b7a;
      font-size: 9px;
    }

    .result-value {
      font-size: 11px;
      font-weight: 700;
    }

    .row-abnormal {
      background: #fff8f0 !important;
    }

    .status-pill {
      border-radius: 999px;
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 3px 8px;
      text-transform: uppercase;
    }

    .status-normal {
      background: #e8f8ef;
      color: #2b8a3e;
    }

    .status-high,
    .status-critical {
      background: #ffe3e3;
      color: #c92a2a;
    }

    .status-low {
      background: #fff4e6;
      color: #e67700;
    }

    .status-unknown {
      background: #edf2f7;
      color: #5c6b7a;
    }

    .empty-cell,
    .muted {
      color: #5c6b7a;
      font-size: 10px;
      text-align: center;
    }

    .abnormal-list {
      display: grid;
      gap: 6px;
    }

    .abnormal-item {
      align-items: center;
      border: 1px solid #f1c39d;
      border-left-width: 4px;
      border-radius: 6px;
      display: grid;
      gap: 2px;
      grid-template-columns: 1fr auto auto;
      padding: 8px 10px;
    }

    .abnormal-item.status-high,
    .abnormal-item.status-critical {
      border-color: #f3b0b0;
      border-left-color: #c92a2a;
    }

    .abnormal-item.status-low {
      border-color: #f6d5a8;
      border-left-color: #e67700;
    }

    .abnormal-item strong {
      font-size: 10px;
    }

    .abnormal-item span {
      font-size: 11px;
      font-weight: 700;
    }

    .abnormal-item em {
      color: #5c6b7a;
      font-size: 9px;
      font-style: normal;
      font-weight: 700;
      text-transform: uppercase;
    }

    .graph-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .graph-card {
      border: 1px solid #d7dee7;
      border-radius: 8px;
      padding: 8px 10px 10px;
    }

    .graph-card h3 {
      color: #17324d;
      font-size: 11px;
      margin: 0 0 6px;
    }

    .graph-caption {
      color: #5c6b7a;
      font-size: 9px;
      margin: 6px 0 0;
    }

    .graph-na {
      align-items: center;
      color: #5c6b7a;
      display: flex;
      font-size: 10px;
      height: 120px;
      justify-content: center;
    }

    .summary-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .summary-card {
      background: #f8fafc;
      border: 1px solid #d7dee7;
      border-radius: 8px;
      padding: 10px;
    }

    .summary-card h3 {
      color: #0b7285;
      font-size: 10px;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .summary-card p {
      font-size: 10px;
      line-height: 1.45;
      margin: 0;
    }

    .summary-note {
      color: #5c6b7a;
      font-size: 9px;
      margin: 8px 0 0;
    }

    .report-footer {
      border-top: 2px solid #17324d;
      margin-top: 16px;
      padding-top: 10px;
      text-align: center;
    }

    .footer-line {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin: 2px 0;
      text-transform: uppercase;
    }

    .footer-warning {
      color: #c92a2a;
    }

    .footer-meta {
      color: #5c6b7a;
      font-size: 9px;
      margin-top: 6px;
    }

    .page-break-before {
      break-before: page;
      page-break-before: always;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}
