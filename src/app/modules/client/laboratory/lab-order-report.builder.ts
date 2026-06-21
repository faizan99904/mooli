import {
  Hospital,
  LabComparisonRow,
  LabOrder,
  LabOrderItem,
  LabResultParameter,
  User,
} from '../../../shared/models/hospital.model';
import { buildPreviousComparisonOrders } from './lab-comparison.utils';
import { getLabReportItems, resolveLabPrintDetails, resolveLabReportThemeColors } from './lab-print-details';

export interface LabReportRow {
  itemId: string;
  testName: string;
  shortCode: string;
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
  reportGeneratedBy?: User | null;
}

interface LabReportSection {
  item: LabOrderItem;
  rows: LabReportRow[];
}

interface LabReportColumn {
  key: string;
  label: string;
  subLabel: string;
  current: boolean;
  orderId?: string;
}

interface LabCellValue {
  value: string;
  statusKey: string;
}

type ReportUserRef = Pick<User, 'name' | 'email'> | null | undefined;

const NA = 'Not Available';
const EMPTY_CELL = '-';

export function buildLabOrderReportHtml(context: LabReportContext): string {
  const sections = collectReportSections(context.order);
  const rows = sections.flatMap((section) => section.rows);
  const abnormal = rows.filter((row) => ['low', 'high', 'critical'].includes(row.statusKey));
  const patient = context.order.patient;
  const printDetails = resolveLabPrintDetails(context.hospital, {
    mode: 'report',
    order: context.order,
  });
  const labName = displayValue(printDetails.name) === NA ? 'Laboratory' : printDetails.name;
  const collectionRaw =
    context.order.sampleCollectionAt ||
    earliestDate(context.order.items.map((item) => item.collectedAt));
  const processingRaw = earliestDate(context.order.items.map((item) => item.resultEnteredAt));
  const reportingRaw =
    latestDate(context.order.items.map((item) => item.verifiedAt || item.resultEnteredAt)) ||
    context.order.updatedAt ||
    context.order.createdAt;
  const columns = buildReportColumns(context, reportingRaw);
  const totalColumnCount = 3 + columns.length;
  const reportCreatedBy = reportCreatorName(context);
  const theme = resolveLabReportThemeColors(context.hospital);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(context.order.orderNo)} - Lab Report</title>
    <style>${reportStyles(theme)}</style>
  </head>
  <body>
    <div class="report">
      <header class="report-header">
        <div class="brand-lockup">
          ${brandMarkHtml(context.hospital, labName)}
          <div class="brand-copy">
            <h1>${escapeHtml(labName.toUpperCase())}</h1>
            <p>${escapeHtml(printDetails.tagline || 'Clinical Diagnostic Laboratory')}</p>
            ${printDetails.addressLine ? `<p>${escapeHtml(printDetails.addressLine)}</p>` : ''}
            ${printDetails.phone ? `<p>${escapeHtml(printDetails.phone)}</p>` : ''}
          </div>
        </div>
        <div class="qr-panel">
          ${qrSvg(`${context.order.orderNo}|${displayValue(patient?.patientNo)}|${patientName(patient)}`)}
          <span>${escapeHtml(context.order.orderNo)}</span>
        </div>
      </header>

      <section class="report-title-bar">
        <span>Laboratory Report</span>
        <strong>${escapeHtml(context.order.orderNo)}</strong>
      </section>

      <section class="patient-strip">
        <div class="patient-box patient-box-wide">
          <span>Patient Details</span>
          <strong>${escapeHtml(patientName(patient))}</strong>
          <em>${escapeHtml(patientAgeGenderShort(patient))}</em>
        </div>
        <div class="patient-box">
          <span>Registration Location</span>
          <strong>${escapeHtml(printDetails.addressLine || patientLocation(context.order))}</strong>
          <em>Reg Date: ${escapeHtml(formatReportDate(context.order.createdAt))}</em>
        </div>
        <div class="patient-box">
          <span>Reference</span>
          <strong>${escapeHtml(consultantName(context.order))}</strong>
          <em>${escapeHtml(sourceLabel(context.order.source))}</em>
        </div>
        <div class="patient-box">
          <span>Patient Number</span>
          <strong>${escapeHtml(displayValue(patient?.patientNo))}</strong>
          <em>Case No: ${escapeHtml(caseNumber(context.order))}</em>
        </div>
      </section>

      <section class="date-strip">
        <div><span>Collection Date/Time:</span><strong>${escapeHtml(formatReportDate(collectionRaw))}</strong></div>
        <div><span>Processing Date/Time:</span><strong>${escapeHtml(formatReportDate(processingRaw))}</strong></div>
        <div><span>Reporting Date/Time:</span><strong>${escapeHtml(formatReportDate(reportingRaw))}</strong></div>
        <div><span>Report Created By:</span><strong>${escapeHtml(reportCreatedBy)}</strong></div>
      </section>

      <main class="report-content">
        ${
          sections.length
            ? sections
                .map((section) =>
                  sectionReportHtml(section, columns, context.comparison, totalColumnCount)
                )
                .join('')
            : emptyReportSectionHtml(totalColumnCount)
        }

        ${abnormal.length ? abnormalSummaryHtml(abnormal) : ''}
        ${context.order.notes ? `<section class="report-note"><strong>Notes:</strong> ${escapeHtml(context.order.notes)}</section>` : ''}
      </main>

      <footer class="signature-footer">
        <div class="signature-grid">
          <div class="signature-box">
            <span></span>
            <strong>Lab Technologist</strong>
          </div>
          <div class="signature-box">
            <span></span>
            <strong>Pathologist</strong>
          </div>
          <div class="signature-box">
            <span></span>
            <strong>Consultant</strong>
          </div>
          <div class="signature-box">
            <span></span>
            <strong>Verified By</strong>
          </div>
        </div>
        <div class="footer-meta">
          <span>Report Created By: ${escapeHtml(reportCreatedBy)}</span>
          <span>${escapeHtml(formatReportDate(new Date().toISOString()))}</span>
        </div>
        <p>Result(s) relate only to the sample received. Clinical correlation is recommended.</p>
      </footer>
    </div>
  </body>
</html>`;
}

function collectReportSections(order: LabOrder): LabReportSection[] {
  return getLabReportItems(order).map((item) => ({
    item,
    rows: collectItemRows(item),
  }));
}

function collectItemRows(item: LabOrderItem): LabReportRow[] {
  return (item.parameters || []).map((parameter) => ({
    itemId: item._id,
    testName: displayValue(item.testName),
    shortCode: displayValue(item.shortCode),
    subCategory: displayValue(parameter.subCategory),
    parameterName: displayValue(parameter.parameterName),
    resultValue: displayValue(parameter.resultValue),
    unit: displayValue(parameter.unit),
    referenceRange: referenceRange(parameter),
    status: statusLabel(parameter.status),
    statusKey: String(parameter.status || '').toLowerCase(),
  }));
}

function buildReportColumns(context: LabReportContext, reportingRaw?: string): LabReportColumn[] {
  const previousOrders = buildPreviousComparisonOrders(
    context.comparison,
    String(context.order._id || ''),
    4
  );

  return [
    {
      key: 'current',
      label: formatColumnDate(reportingRaw || context.order.updatedAt || context.order.createdAt),
      subLabel: context.order.orderNo,
      current: true,
    },
    ...previousOrders.map((entry) => ({
      key: entry.orderId,
      orderId: entry.orderId,
      label: formatColumnDate(entry.date),
      subLabel: entry.orderNo || 'Previous',
      current: false,
    })),
  ];
}

function sectionReportHtml(
  section: LabReportSection,
  columns: LabReportColumn[],
  comparison: LabComparisonRow[],
  columnCount: number
): string {
  return `<section class="result-section">
    <h2>${escapeHtml(sectionTitle(section.item))}</h2>
    <table class="report-table">
      <thead>
        <tr>
          <th class="test-column">Test</th>
          <th class="reference-column">Reference Value</th>
          <th class="unit-column">Unit</th>
          ${columns
            .map(
              (column) =>
                `<th class="value-column"><strong>${escapeHtml(column.label)}</strong><span>${escapeHtml(column.subLabel)}</span></th>`
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${
          section.rows.length
            ? sectionRowsHtml(section.rows, columns, comparison, columnCount)
            : emptySectionRowsHtml(columnCount)
        }
      </tbody>
    </table>
    ${section.item.remarks ? `<div class="section-remarks"><strong>Remarks:</strong> ${escapeHtml(section.item.remarks)}</div>` : ''}
  </section>`;
}

function sectionRowsHtml(
  rows: LabReportRow[],
  columns: LabReportColumn[],
  comparison: LabComparisonRow[],
  columnCount: number
): string {
  let currentSubCategory = '';

  return rows
    .map((row) => {
      const subCategory = row.subCategory === NA ? '' : row.subCategory;
      const subCategoryHeader =
        subCategory && subCategory !== currentSubCategory
          ? `<tr class="subcategory-row"><td colspan="${columnCount}">${escapeHtml(subCategory)}</td></tr>`
          : '';

      if (subCategory) {
        currentSubCategory = subCategory;
      }

      return `${subCategoryHeader}${resultRowHtml(row, columns, comparison)}`;
    })
    .join('');
}

function resultRowHtml(
  row: LabReportRow,
  columns: LabReportColumn[],
  comparison: LabComparisonRow[]
): string {
  return `<tr>
    <td class="test-name">${escapeHtml(row.parameterName)}</td>
    <td>${escapeHtml(row.referenceRange)}</td>
    <td>${escapeHtml(row.unit)}</td>
    ${columns.map((column) => resultCellHtml(row, column, comparison)).join('')}
  </tr>`;
}

function resultCellHtml(
  row: LabReportRow,
  column: LabReportColumn,
  comparison: LabComparisonRow[]
): string {
  const cell = column.current
    ? { value: row.resultValue, statusKey: row.statusKey }
    : historyCell(row, column, comparison);
  const value = cell.value === NA ? EMPTY_CELL : cell.value;
  const statusClass = cell.statusKey ? ` status-${escapeAttribute(cell.statusKey)}` : '';
  return `<td class="result-value${statusClass}">${escapeHtml(value)}</td>`;
}

function historyCell(
  row: LabReportRow,
  column: LabReportColumn,
  comparison: LabComparisonRow[]
): LabCellValue {
  const match = matchingComparisonRow(row, comparison);
  const point = match?.history.find(
    (item) => String(item.orderId || '') === String(column.orderId || '')
  );

  return {
    value: displayValue(point?.resultValue),
    statusKey: String(point?.status || '').toLowerCase(),
  };
}

function matchingComparisonRow(
  row: LabReportRow,
  comparison: LabComparisonRow[]
): LabComparisonRow | undefined {
  const exact = comparison.find(
    (item) =>
      normalize(item.testName) === normalize(row.testName) &&
      normalize(item.parameterName) === normalize(row.parameterName) &&
      (!item.subCategory || row.subCategory === NA || normalize(item.subCategory) === normalize(row.subCategory))
  );

  if (exact) {
    return exact;
  }

  return comparison.find(
    (item) =>
      normalize(item.parameterName) === normalize(row.parameterName) &&
      (!item.subCategory || row.subCategory === NA || normalize(item.subCategory) === normalize(row.subCategory))
  );
}

function emptySectionRowsHtml(columnCount: number): string {
  return `<tr><td colspan="${columnCount}" class="empty-cell">No structured result parameters are available for this test.</td></tr>`;
}

function emptyReportSectionHtml(columnCount: number): string {
  return `<section class="result-section">
    <h2>Laboratory Results</h2>
    <table class="report-table">
      <tbody>${emptySectionRowsHtml(columnCount)}</tbody>
    </table>
  </section>`;
}

function abnormalSummaryHtml(rows: LabReportRow[]): string {
  return `<section class="abnormal-strip">
    <strong>Flagged Values</strong>
    ${rows
      .map(
        (row) =>
          `<span class="flagged-value status-${escapeAttribute(row.statusKey)}">${escapeHtml(row.parameterName)}: ${escapeHtml(row.resultValue)} ${escapeHtml(row.unit !== NA ? row.unit : '')} (${escapeHtml(row.status)})</span>`
      )
      .join('')}
  </section>`;
}

function reportCreatorName(context: LabReportContext): string {
  return (
    userDisplayName(latestResultCreator(context.order)) ||
    userDisplayName(context.order.createdBy) ||
    userDisplayName(context.reportGeneratedBy) ||
    NA
  );
}

function latestResultCreator(order: LabOrder): ReportUserRef {
  const events: Array<{ date?: string; user: ReportUserRef }> = [];

  (order.items || []).forEach((item) => {
    events.push({ date: item.resultEnteredAt, user: item.resultEnteredBy });

    (item.reportFiles || []).forEach((file) => {
      events.push({ date: file.reportDate, user: file.uploadedBy });
    });
  });

  return (
    events
      .filter((event) => userDisplayName(event.user))
      .sort((left, right) => dateValue(right.date) - dateValue(left.date))[0]?.user || null
  );
}

function userDisplayName(user: ReportUserRef): string {
  return String(user?.name || user?.email || '').trim();
}

function dateValue(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sectionTitle(item: LabOrderItem): string {
  const name = displayValue(item.testName);
  const shortCode = displayValue(item.shortCode);
  if (shortCode !== NA && shortCode !== name) {
    return `${name} (${shortCode})`;
  }
  return name;
}

function brandMarkHtml(hospital: Hospital | null, labName: string): string {
  const logoUrl = hospital?.logoUrl?.trim();
  if (logoUrl) {
    return `<div class="brand-mark"><img src="${escapeAttribute(logoUrl)}" alt="${escapeAttribute(labName)} logo" /></div>`;
  }

  return `<div class="brand-mark brand-mark-fallback"><span>${escapeHtml(initials(labName))}</span></div>`;
}

function qrSvg(value: string): string {
  const size = 29;
  const seed = hashString(value);
  const cells: string[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (isFinderArea(x, y, size)) {
        continue;
      }

      const filled = ((seed + x * 17 + y * 31 + x * y * 7) % 11) < 5;
      if (filled) {
        cells.push(`<rect x="${x}" y="${y}" width="1" height="1" />`);
      }
    }
  }

  return `<svg class="qr-code" viewBox="0 0 ${size} ${size}" aria-label="Report code" role="img">
    <rect width="${size}" height="${size}" fill="#fff" />
    ${finderPattern(0, 0)}
    ${finderPattern(size - 7, 0)}
    ${finderPattern(0, size - 7)}
    <g fill="#111827">${cells.join('')}</g>
  </svg>`;
}

function finderPattern(x: number, y: number): string {
  return `<g fill="#111827">
    <rect x="${x}" y="${y}" width="7" height="7" />
    <rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff" />
    <rect x="${x + 2}" y="${y + 2}" width="3" height="3" />
  </g>`;
}

function isFinderArea(x: number, y: number, size: number): boolean {
  return (
    (x < 8 && y < 8) ||
    (x >= size - 8 && y < 8) ||
    (x < 8 && y >= size - 8)
  );
}

function hashString(value: string): number {
  return value.split('').reduce((hash, char) => {
    const next = (hash << 5) - hash + char.charCodeAt(0);
    return next >>> 0;
  }, 2166136261);
}

function patientName(patient: LabOrder['patient']): string {
  if (!patient) {
    return NA;
  }
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  return name || NA;
}

function patientAgeGenderShort(patient: LabOrder['patient']): string {
  if (!patient) {
    return 'Age/Sex: Not Available';
  }

  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : NA;
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() : NA;
  if (age === NA && gender === NA) {
    return 'Age/Sex: Not Available';
  }
  if (age === NA) {
    return `Age/Sex: ${gender}`;
  }
  if (gender === NA) {
    return `Age/Sex: ${age} Y`;
  }
  return `Age/Sex: ${age} Y / ${gender}`;
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

function caseNumber(order: LabOrder): string {
  return displayValue(order.appointmentId || order.prescriptionId || order._id);
}

function sourceLabel(source?: string): string {
  const labels: Record<string, string> = {
    doctor: 'Doctor Prescription',
    'walk-in': 'Walk-in',
    admission: 'Admission',
    emergency: 'Emergency',
  };
  return labels[String(source || '')] || source || NA;
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

function formatReportDate(value?: string | null): string {
  if (!value) {
    return NA;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return NA;
  }
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

function formatColumnDate(value?: string | null): string {
  if (!value) {
    return NA;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return NA;
  }
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

function initials(value: string): string {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return 'L';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function normalize(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value: string | number | null | undefined): string {
  return escapeHtml(value).replace(/'/g, '&#039;');
}

function reportStyles(theme: { nameColor: string; borderColor: string }): string {
  const nameColor = escapeAttribute(theme.nameColor);
  const borderColor = escapeAttribute(theme.borderColor);

  return `
    @page {
      margin: 8mm 8mm 9mm;
      size: A4 portrait;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      background: #fff;
      color: #202124;
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report {
      display: flex;
      flex-direction: column;
      margin: 0 auto;
      min-height: 278mm;
      width: 192mm;
    }

    .report-header {
      align-items: flex-start;
      border-top: 4px solid ${borderColor};
      border-bottom: 3px solid ${borderColor};
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 7px 0 8px;
    }

    .brand-lockup {
      align-items: flex-start;
      display: flex;
      gap: 8px;
      min-width: 0;
    }

    .brand-mark {
      align-items: center;
      border: 1px solid ${borderColor};
      border-radius: 5px;
      display: flex;
      height: 44px;
      justify-content: center;
      overflow: hidden;
      width: 44px;
    }

    .brand-mark img {
      display: block;
      height: 100%;
      object-fit: contain;
      width: 100%;
    }

    .brand-mark-fallback {
      background: ${borderColor};
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .brand-copy h1 {
      color: ${nameColor};
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.03em;
      line-height: 1;
      margin: 1px 0 4px;
    }

    .brand-copy p {
      color: #4b5563;
      font-size: 8px;
      line-height: 1.25;
      margin: 1px 0;
    }

    .qr-panel {
      align-items: center;
      display: grid;
      gap: 2px;
      justify-items: center;
      width: 68px;
    }

    .qr-code {
      border: 1px solid #111827;
      display: block;
      height: 54px;
      width: 54px;
    }

    .qr-panel span {
      color: #202124;
      font-size: 6.5px;
      font-weight: 700;
      line-height: 1;
      max-width: 66px;
      overflow-wrap: anywhere;
      text-align: center;
    }

    .report-title-bar {
      align-items: center;
      background: #f4f7fb;
      border: 1px solid #d7dee8;
      border-left: 4px solid ${borderColor};
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      padding: 5px 8px;
    }

    .report-title-bar span {
      color: ${borderColor};
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .report-title-bar strong {
      color: #334155;
      font-size: 8px;
      letter-spacing: 0.03em;
    }

    .patient-strip {
      border: 1px solid #d7dee8;
      border-top: 0;
      display: grid;
      gap: 0;
      grid-template-columns: 1.25fr 1.45fr 1.1fr 1.05fr;
    }

    .patient-box {
      border-right: 1px solid #e2e8f0;
      min-width: 0;
      padding: 6px 8px;
    }

    .patient-box + .patient-box {
      padding-left: 8px;
    }

    .patient-box:last-child {
      border-right: 0;
    }

    .patient-box span,
    .date-strip span {
      color: #64748b;
      display: block;
      font-size: 6.9px;
      font-weight: 700;
      letter-spacing: 0.05em;
      line-height: 1.2;
      margin-bottom: 2px;
      text-transform: uppercase;
    }

    .patient-box strong {
      color: #111827;
      display: block;
      font-size: 8.4px;
      font-weight: 800;
      line-height: 1.25;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }

    .patient-box em {
      color: #475569;
      display: block;
      font-size: 7.2px;
      font-style: normal;
      line-height: 1.25;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }

    .date-strip {
      background: #fbfcfe;
      border: 1px solid #d7dee8;
      border-top: 0;
      display: grid;
      gap: 0;
      grid-template-columns: repeat(4, 1fr);
    }

    .date-strip div {
      border-right: 1px solid #e2e8f0;
      display: block;
      min-width: 0;
      padding: 5px 8px;
    }

    .date-strip div:last-child {
      border-right: 0;
    }

    .date-strip strong {
      color: #111827;
      display: block;
      font-size: 7.6px;
      font-weight: 800;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .report-content {
      flex: 1 1 auto;
      padding-top: 10px;
    }

    .result-section {
      break-inside: auto;
      margin-bottom: 11px;
    }

    .result-section h2 {
      background: color-mix(in srgb, ${borderColor} 8%, #ffffff);
      border-left: 4px solid ${borderColor};
      color: ${borderColor};
      font-size: 9.4px;
      font-weight: 800;
      letter-spacing: 0.03em;
      line-height: 1.2;
      margin: 0 0 6px;
      padding: 5px 7px;
      text-transform: uppercase;
    }

    .report-table {
      border: 1px solid ${borderColor};
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
    }

    .report-table th,
    .report-table td {
      border-bottom: 1px solid color-mix(in srgb, ${borderColor} 22%, #d7dee8);
      border-right: 1px solid color-mix(in srgb, ${borderColor} 12%, #edf1f6);
      color: #303030;
      font-size: 7.5px;
      line-height: 1.2;
      padding: 4px 6px;
      text-align: left;
      vertical-align: middle;
      word-break: normal;
    }

    .report-table th:last-child,
    .report-table td:last-child {
      border-right: 0;
    }

    .report-table tbody tr:nth-child(even):not(.subcategory-row) {
      background: color-mix(in srgb, ${borderColor} 4%, #fbfdff);
    }

    .report-table th {
      background: ${borderColor};
      border-bottom: 1px solid ${borderColor};
      color: #fff;
      font-size: 6.9px;
      font-weight: 800;
      padding: 4px 6px;
    }

    .report-table th span {
      color: rgba(255, 255, 255, 0.78);
      display: block;
      font-size: 5.8px;
      font-weight: 700;
      line-height: 1.15;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }

    .test-column {
      width: 24%;
    }

    .reference-column {
      width: 14%;
    }

    .unit-column {
      width: 10%;
    }

    .value-column {
      text-align: center !important;
    }

    .test-name {
      color: #111827;
      font-weight: 800;
    }

    .result-value {
      color: ${nameColor} !important;
      font-size: 8.2px !important;
      font-weight: 900;
      text-align: center !important;
    }

    .result-value.status-high,
    .result-value.status-low,
    .result-value.status-critical {
      color: #b42318 !important;
    }

    .subcategory-row td {
      background: color-mix(in srgb, ${borderColor} 10%, #ffffff);
      border-bottom-color: color-mix(in srgb, ${borderColor} 28%, #c8d0dc);
      color: ${borderColor};
      font-size: 7px;
      font-weight: 800;
      letter-spacing: 0.03em;
      padding: 4px 5px 3px;
      text-transform: uppercase;
    }

    .empty-cell {
      color: #777 !important;
      font-size: 8px !important;
      font-weight: 700;
      padding: 8px !important;
      text-align: center !important;
    }

    .section-remarks,
    .report-note,
    .abnormal-strip {
      background: #fbfcfe;
      border: 1px solid #d7dee8;
      color: #334155;
      font-size: 7.4px;
      line-height: 1.35;
      margin-top: 7px;
      padding: 6px 8px;
    }

    .abnormal-strip {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 8px;
    }

    .abnormal-strip strong {
      color: ${borderColor};
      font-size: 7.4px;
      margin-right: 2px;
      text-transform: uppercase;
    }

    .flagged-value {
      background: #fff4f2;
      border: 1px solid #fecdca;
      border-radius: 2px;
      color: #b42318;
      font-size: 6.8px;
      font-weight: 800;
      padding: 2px 5px;
    }

    .signature-footer {
      break-inside: avoid;
      margin-top: 20px;
      padding-top: 26px;
    }

    .signature-grid {
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(4, 1fr);
    }

    .signature-box {
      color: #1f2a44;
      font-size: 7px;
      font-weight: 800;
      text-align: center;
    }

    .signature-box span {
      border-bottom: 1px solid #94a3b8;
      display: block;
      height: 20px;
      margin-bottom: 5px;
    }

    .footer-meta {
      align-items: center;
      border-top: 1px solid #d7dee8;
      color: #475569;
      display: flex;
      font-size: 7px;
      font-weight: 700;
      justify-content: space-between;
      margin-top: 16px;
      padding-top: 6px;
    }

    .signature-footer p {
      color: #64748b;
      font-size: 6.9px;
      line-height: 1.25;
      margin: 4px 0 0;
      text-align: center;
    }

    @media screen {
      body {
        background: #eef2f6;
        padding: 18px;
      }

      .report {
        background: #fff;
        box-shadow: 0 8px 28px rgba(15, 23, 42, 0.14);
        padding: 8mm;
      }
    }

    @media print {
      .report {
        box-shadow: none;
        padding: 0;
      }
    }
  `;
}

export function openLabReportPrintWindow(html: string): boolean {
  const content = String(html || '').trim();
  if (!content) {
    return false;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Lab report print');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    border: '0',
    height: '0',
    left: '-10000px',
    opacity: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: '0',
  });

  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = iframe.contentDocument || printWindow?.document;
  if (!printWindow || !printDocument) {
    iframe.remove();
    return false;
  }

  printDocument.open();
  printDocument.write(content);
  printDocument.close();

  let handled = false;
  const finish = () => {
    if (handled) {
      return;
    }

    handled = true;
    iframe.remove();
  };

  printWindow.onafterprint = finish;

  window.setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      finish();
    }
  }, 300);

  window.setTimeout(finish, 30000);
  return true;
}
