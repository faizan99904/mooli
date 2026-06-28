import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ClinicalRxPrintPage } from './clinical-rx-print-pages';
import { resolvePrintSlotDose } from './medicine-instruction-formatter';

type GynaePrintPreview = {
  doctorName: string;
  doctorNamePlain: string;
  doctorQualification: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalLogoUrl: string;
  showHospitalLogo: boolean;
  prescriptionNo: string;
  patientNo: string;
  date: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientPhone: string;
  patientAddress: string;
  disease: string;
  vitals: Record<string, string>;
  labTests: Array<{ name: string; category: string }>;
  ivFluids: Array<{ name: string; rate: string; quantity: string; route: string }>;
  medicines: Array<Record<string, unknown>>;
  specialtyTitle: string;
  gynaeConsultationRows: Array<{ label: string; value: string }>;
  consultationRows?: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeSidebarRows: Array<{ label: string; value: string; wide?: boolean }>;
  patientNote: string;
  prescriptionRevisionNote: string;
  prescriptionFollowUpLine: string;
  prescriptionFooterLines: string[];
  followUpDate: string;
};

type DoseSlot = 'morning' | 'noon' | 'evening' | 'night';

@Component({
  selector: 'app-gynae-clinical-print-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gynae-clinical-print-page.component.html',
  styleUrl: './gynae-clinical-print-page.component.scss',
})
export class GynaeClinicalPrintPageComponent {
  @Input({ required: true }) preview!: GynaePrintPreview;
  @Input({ required: true }) page!: ClinicalRxPrintPage;
  @Input() medicineDensityClass = '';

  slotDose(medicine: Record<string, unknown> | null | undefined, slot: DoseSlot): string {
    return resolvePrintSlotDose(medicine, slot);
  }

  patientNoteLines(note = ''): string[] {
    return String(note || '')
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
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

  contactPhone(): string {
    const combined = this.preview.prescriptionFooterLines.join(' | ');
    const phoneMatch = combined.match(/Phone:\s*([^|]+)/i);
    if (phoneMatch?.[1]?.trim()) {
      return phoneMatch[1].trim();
    }

    const line = this.preview.prescriptionFooterLines.find(
      (item) => !/@/.test(item) && /phone|tel|cell|mobile|call/i.test(item)
    );
    return line?.replace(/^[^:]+:\s*/, '').trim() || '-';
  }

  contactEmail(): string {
    const combined = this.preview.prescriptionFooterLines.join(' | ');
    const emailMatch = combined.match(/Email:\s*([^|]+)/i);
    if (emailMatch?.[1]?.trim()) {
      return emailMatch[1].trim();
    }

    const line = this.preview.prescriptionFooterLines.find((item) => /@/.test(item));
    return line?.replace(/^[^:]+:\s*/, '').trim() || '-';
  }
}
