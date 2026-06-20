import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PrescriptionTemplate } from '../../../shared/models/hospital.model';
import {
  PrescriptionPrintDoseSlot,
  PrescriptionPrintPreviewData,
} from './prescription-print-data.model';

@Component({
  selector: 'app-prescription-print-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prescription-print-sheet.component.html',
})
export class PrescriptionPrintSheetComponent {
  @ViewChild('printContent', { static: false }) printContent?: ElementRef<HTMLElement>;

  @Input() preview: PrescriptionPrintPreviewData | null = null;
  @Input() template: PrescriptionTemplate = 'classic';

  slotDose(
    medicine: Record<string, unknown> | null | undefined,
    slot: PrescriptionPrintDoseSlot
  ): string {
    const doseKey = `${slot}Dose` as 'morningDose' | 'noonDose' | 'eveningDose' | 'nightDose';
    const dose = String(medicine?.[doseKey] || '').trim();
    if (dose) {
      return dose;
    }

    return medicine?.[slot] ? '1' : '';
  }

  printMedicineDensityClass(medicineCount: number): string {
    if (medicineCount >= 18) {
      return 'print-medicine-density-compact';
    }

    if (medicineCount >= 12) {
      return 'print-medicine-density-tight';
    }

    return 'print-medicine-density-normal';
  }

}
