import { GynaeConsultMode } from './gynae-prescription-data';
import { ClinicalRxPrintPage } from './clinical-rx-print-pages';

export type GynaePrintPreview = {
  doctorName: string;
  doctorNamePlain: string;
  doctorQualification: string;
  hospitalName: string;
  hospitalNameUrdu: string;
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
  patientBloodGroup: string;
  disease: string;
  vitals: Record<string, string>;
  labTests: Array<{ name: string; category: string }>;
  ivFluids: Array<{ name: string; rate: string; quantity: string; route: string }>;
  medicines: Array<Record<string, unknown>>;
  specialtyTitle: string;
  specialtyRows: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeConsultationRows: Array<{ label: string; value: string }>;
  consultationRows?: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeSidebarRows: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeExtendedRows: Array<{ label: string; value: string; wide?: boolean }>;
  patientNote: string;
  prescriptionRevisionNote: string;
  prescriptionFollowUpLine: string;
  prescriptionFooterLines: string[];
  followUpDate: string;
  gynaeMode: GynaeConsultMode;
};

export function resolveGynaePrintContactPhone(footerLines: string[]): string {
  const combined = footerLines.join(' | ');
  const phoneMatch = combined.match(/Phone:\s*([^|]+)/i);
  if (phoneMatch?.[1]?.trim()) {
    return phoneMatch[1].trim();
  }

  const line = footerLines.find(
    (item) => !/@/.test(item) && /phone|tel|cell|mobile|call/i.test(item)
  );
  return line?.replace(/^[^:]+:\s*/, '').trim() || '-';
}

export function resolveGynaePrintContactEmail(footerLines: string[]): string {
  const combined = footerLines.join(' | ');
  const emailMatch = combined.match(/Email:\s*([^|]+)/i);
  if (emailMatch?.[1]?.trim()) {
    return emailMatch[1].trim();
  }

  const line = footerLines.find((item) => /@/.test(item));
  return line?.replace(/^[^:]+:\s*/, '').trim() || '-';
}

export function findGynaePrintRowValue(
  preview: Pick<GynaePrintPreview, 'gynaeSidebarRows' | 'gynaeExtendedRows' | 'specialtyRows'>,
  matchers: string[]
): string {
  const rows = [...preview.gynaeSidebarRows, ...preview.gynaeExtendedRows, ...preview.specialtyRows];
  for (const matcher of matchers) {
    const row = rows.find((item) => item.label.toLowerCase().includes(matcher.toLowerCase()));
    if (row?.value?.trim()) {
      return row.value.trim();
    }
  }

  return '-';
}

export type { ClinicalRxPrintPage };
