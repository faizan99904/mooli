import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import {
  GYNAE_CONSULT_MODE_TABS,
  GynaeConsultMode,
} from './gynae-prescription-data';
import {
  ClinicalRxPrintPage,
  findGynaePrintRowValue,
  GynaePrintPreview,
  resolveGynaePrintContactEmail,
  resolveGynaePrintContactPhone,
} from './gynae-print-preview.model';

type GynaePrintRow = { label: string; value: string; wide?: boolean };

const METRIC_LABEL_HINTS = [
  'lmp',
  'edd',
  'gestational',
  'gravida',
  'para',
  'blood group',
  'weight',
  'bp',
  'consult mode',
];

@Component({
  selector: 'app-gynae-womens-health-print-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gynae-womens-health-print-page.component.html',
  styleUrl: './gynae-womens-health-print-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GynaeWomensHealthPrintPageComponent implements OnChanges {
  @Input({ required: true }) preview!: GynaePrintPreview;
  @Input({ required: true }) page!: ClinicalRxPrintPage;

  readonly consultTabs = GYNAE_CONSULT_MODE_TABS;

  activeMode: GynaeConsultMode = 'antenatal';
  lmpValue = '-';
  eddValue = '-';
  gestationalValue = '-';
  gravidaParaValue = '-';
  chiefComplaint = '-';
  historyValue = '-';
  examinationValue = '-';
  dangerSigns = '-';
  contactPhoneValue = '-';
  contactEmailValue = '-';
  instructionLines: string[] = [];
  obsRows: GynaePrintRow[] = [];
  showExtraVitals = false;

  ngOnChanges(): void {
    this.activeMode = this.preview.gynaeMode || 'antenatal';
    this.lmpValue = findGynaePrintRowValue(this.preview, ['lmp', 'last menstrual']);
    this.eddValue = findGynaePrintRowValue(this.preview, ['edd', 'estimated due']);
    this.gestationalValue = findGynaePrintRowValue(this.preview, ['gestational']);
    this.gravidaParaValue = this.buildGravidaPara();
    this.chiefComplaint = this.readConsultationValue('Chief Complaint');
    this.historyValue = this.readConsultationValue('History');
    this.examinationValue = this.readConsultationValue('Examination');
    this.dangerSigns = this.readDangerSigns();
    this.contactPhoneValue = resolveGynaePrintContactPhone(this.preview.prescriptionFooterLines);
    this.contactEmailValue = resolveGynaePrintContactEmail(this.preview.prescriptionFooterLines);
    this.instructionLines = this.buildInstructionLines();
    this.obsRows = this.buildObsRows();
    const vitals = this.preview.vitals || {};
    this.showExtraVitals = Boolean(vitals['pulse'] || vitals['temperature'] || vitals['spo2']);
  }

  isActiveTab(key: GynaeConsultMode): boolean {
    return this.activeMode === key;
  }

  isDangerRow(label: string): boolean {
    return /danger|red flag|warning/i.test(label);
  }

  trackObsRow(_index: number, row: GynaePrintRow): string {
    return row.label;
  }

  trackMedicine(index: number, medicine: Record<string, unknown>): string {
    return String(medicine['name'] || index);
  }

  trackDrip(_index: number, drip: { name: string }): string {
    return drip.name;
  }

  trackLabTest(_index: number, test: { name: string }): string {
    return test.name;
  }

  trackInstruction(index: number, line: string): string {
    return `${index}-${line}`;
  }

  private buildGravidaPara(): string {
    const gravida = findGynaePrintRowValue(this.preview, ['gravida']);
    const para = findGynaePrintRowValue(this.preview, ['para']);
    if (gravida === '-' && para === '-') {
      return '-';
    }

    return `G${gravida === '-' ? '0' : gravida} / P${para === '-' ? '0' : para}`;
  }

  private readConsultationValue(label: string): string {
    const row = this.preview.gynaeConsultationRows.find((item) => item.label === label);
    if (row?.value?.trim()) {
      return row.value.trim();
    }

    const fallback = this.preview.consultationRows?.find((item) => item.label === label);
    return fallback?.value?.trim() || '-';
  }

  private readDangerSigns(): string {
    const row = [...this.page.gynaeExtendedRows, ...this.preview.gynaeSidebarRows, ...this.preview.gynaeExtendedRows].find(
      (item) => /danger/i.test(item.label)
    );
    return row?.value?.trim() || '-';
  }

  private buildInstructionLines(): string[] {
    return String(this.preview.patientNote || '')
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  }

  private buildObsRows(): GynaePrintRow[] {
    if (!this.page.isFirstPage) {
      return this.page.gynaeExtendedRows;
    }

    const merged = [...this.preview.gynaeSidebarRows, ...this.page.gynaeExtendedRows];
    const seen = new Set<string>();
    const rows: GynaePrintRow[] = [];

    merged.forEach((row) => {
      const label = String(row.label || '').trim();
      const value = String(row.value || '').trim();
      if (!label || !value) {
        return;
      }

      const key = label.toLowerCase();
      if (seen.has(key) || this.isMetricLabel(label)) {
        return;
      }

      seen.add(key);
      rows.push({ label, value, wide: row.wide });
    });

    return rows;
  }

  private isMetricLabel(label: string): boolean {
    const normalized = label.toLowerCase();
    return METRIC_LABEL_HINTS.some((hint) => normalized.includes(hint));
  }
}
