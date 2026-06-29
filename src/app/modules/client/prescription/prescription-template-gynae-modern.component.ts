import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { resolvePrintSlotDose } from './medicine-instruction-formatter';
import {
  ClinicalRxPrintPage,
  GynaePrintPreview,
  resolveGynaePrintContactEmail,
  resolveGynaePrintContactPhone,
} from './gynae-print-preview.model';

type DoseSlot = 'morning' | 'noon' | 'evening' | 'night';

@Component({
  selector: 'app-prescription-template-gynae-modern',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prescription-template-gynae-modern.component.html',
  styleUrl: './prescription-template-gynae-modern.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionTemplateGynaeModernComponent implements OnChanges {
  @Input({ required: true }) preview!: GynaePrintPreview;
  @Input({ required: true }) page!: ClinicalRxPrintPage;
  @Input() medicineDensityClass = '';

  contactPhoneValue = '-';
  contactEmailValue = '-';
  patientNoteLinesList: string[] = [];

  ngOnChanges(): void {
    this.contactPhoneValue = resolveGynaePrintContactPhone(this.preview?.prescriptionFooterLines || []);
    this.contactEmailValue = resolveGynaePrintContactEmail(this.preview?.prescriptionFooterLines || []);
    this.patientNoteLinesList = this.buildPatientNoteLines(this.preview?.patientNote || '');
  }

  slotDose(medicine: Record<string, unknown> | null | undefined, slot: DoseSlot): string {
    return resolvePrintSlotDose(medicine, slot);
  }

  foodLabel(medicine: Record<string, unknown> | null | undefined): string {
    if (medicine?.['beforeMeal']) {
      return 'Before Food';
    }
    if (medicine?.['afterMeal']) {
      return 'After Food';
    }
    return '-';
  }

  isDangerRow(label: string): boolean {
    return /danger|red flag|warning/i.test(label);
  }

  consultationValue(label: string): string {
    const row = this.preview.gynaeConsultationRows.find((item) => item.label === label);
    if (row?.value?.trim()) {
      return row.value.trim();
    }

    const fallback = this.preview.consultationRows?.find((item) => item.label === label);
    return fallback?.value?.trim() || '-';
  }

  dripLine(fluid: { name?: string; rate?: string; quantity?: string; route?: string }): string {
    const name = String(fluid.name || '').trim();
    const rate = String(fluid.rate || '').trim();
    if (name && rate) {
      return `${name} — ${rate}`;
    }
    return name || rate || '-';
  }

  private buildPatientNoteLines(note: string): string[] {
    return String(note || '')
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  }
}
