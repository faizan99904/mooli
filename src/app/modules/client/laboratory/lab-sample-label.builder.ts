import { LabOrder, LabSample } from '../../../shared/models/hospital.model';

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hashString(value: string): number {
  return value.split('').reduce((hash, char) => {
    const next = (hash << 5) - hash + char.charCodeAt(0);
    return next >>> 0;
  }, 2166136261);
}

function isFinderArea(x: number, y: number, size: number): boolean {
  return (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
}

function finderPattern(x: number, y: number): string {
  return `<g fill="#111827">
    <rect x="${x}" y="${y}" width="7" height="7" />
    <rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff" />
    <rect x="${x + 2}" y="${y + 2}" width="3" height="3" />
  </g>`;
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

  return `<svg class="qr-code" viewBox="0 0 ${size} ${size}" aria-label="Sample code" role="img">
    <rect width="${size}" height="${size}" fill="#fff" />
    ${finderPattern(0, 0)}
    ${finderPattern(size - 7, 0)}
    ${finderPattern(0, size - 7)}
    <g fill="#111827">${cells.join('')}</g>
  </svg>`;
}

function patientName(order: LabOrder): string {
  const patient = order.patient;
  if (!patient) {
    return 'Patient';
  }

  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
}

function calculateAge(dateOfBirth?: string | null): string {
  if (!dateOfBirth) {
    return '';
  }

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return '';
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? String(age) : '';
}

function patientAgeGender(order: LabOrder): string {
  const patient = order.patient;
  if (!patient) {
    return '-';
  }

  const age = calculateAge(patient.dateOfBirth);
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() : '';
  if (age && gender) {
    return `${age}/${gender}`;
  }

  return age || gender || '-';
}

function formatCollectedAt(value?: string): string {
  if (!value) {
    return new Date().toLocaleString('en-PK');
  }

  return new Date(value).toLocaleString('en-PK');
}

function sampleStatusLabel(status?: string): string {
  return String(status || 'collected').replace(/_/g, ' ');
}

function buildSampleLabelHtml(order: LabOrder, sample: LabSample): string {
  return `
    <section class="label">
      <div class="label-top">
        <div>
          <p class="label-kicker">Sample ID</p>
          <h1>${escapeHtml(sample.sampleNo)}</h1>
        </div>
        ${qrSvg(sample.sampleNo)}
      </div>
      <div class="label-grid">
        <div><span>Patient</span><strong>${escapeHtml(patientName(order))}</strong></div>
        <div><span>Patient No.</span><strong>${escapeHtml(order.patient?.patientNo || '-')}</strong></div>
        <div><span>Lab Order</span><strong>${escapeHtml(order.orderNo)}</strong></div>
        <div><span>Age/Gender</span><strong>${escapeHtml(patientAgeGender(order))}</strong></div>
        <div><span>Sample Type</span><strong>${escapeHtml(sample.sampleType || '-')}</strong></div>
        <div><span>Container</span><strong>${escapeHtml(sample.containerType || '-')}</strong></div>
        <div class="label-wide"><span>Tests</span><strong>${escapeHtml(sample.testsSummary || '-')}</strong></div>
        <div class="label-wide"><span>Collected</span><strong>${escapeHtml(formatCollectedAt(sample.collectedAt))}</strong></div>
        <div class="label-wide"><span>Status</span><strong>${escapeHtml(sampleStatusLabel(sample.status))}</strong></div>
      </div>
    </section>
  `;
}

export function buildLabSampleLabelsHtml(order: LabOrder, samples: LabSample[]): string {
  const labels = samples.map((sample) => buildSampleLabelHtml(order, sample)).join('');

  return `<!doctype html>
<html>
  <head>
    <title>${escapeHtml(order.orderNo)} Sample Labels</title>
    <style>
      @page { margin: 8mm; size: 80mm auto; }
      * { box-sizing: border-box; }
      body {
        background: #fff;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        margin: 0;
        padding: 0;
      }
      .label {
        border: 1px solid #111827;
        margin: 0 auto 8mm;
        max-width: 72mm;
        padding: 8px;
        page-break-inside: avoid;
      }
      .label-top {
        align-items: flex-start;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .label-kicker {
        color: #475569;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin: 0 0 2px;
        text-transform: uppercase;
      }
      h1 {
        font-size: 13px;
        line-height: 1.2;
        margin: 0;
        word-break: break-word;
      }
      .qr-code {
        flex: 0 0 56px;
        height: 56px;
        width: 56px;
      }
      .label-grid {
        display: grid;
        gap: 4px;
        grid-template-columns: 1fr 1fr;
      }
      .label-grid div {
        min-width: 0;
      }
      .label-grid span {
        color: #64748b;
        display: block;
        font-size: 8px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .label-grid strong {
        display: block;
        font-size: 10px;
        line-height: 1.25;
        word-break: break-word;
      }
      .label-wide {
        grid-column: 1 / -1;
      }
      @media print {
        body { margin: 0; }
        .label { margin-bottom: 6mm; }
      }
    </style>
  </head>
  <body>${labels}</body>
</html>`;
}

export function printLabSampleLabels(order: LabOrder, samples: LabSample[]): void {
  if (!samples.length) {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Lab sample labels print');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    border: '0',
    height: '0',
    left: '-10000px',
    opacity: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: '100vw',
  });

  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = iframe.contentDocument || printWindow?.document;
  if (!printWindow || !printDocument) {
    iframe.remove();
    return;
  }

  printDocument.open();
  printDocument.write(buildLabSampleLabelsHtml(order, samples));
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
  }, 200);

  window.setTimeout(finish, 30000);
}
