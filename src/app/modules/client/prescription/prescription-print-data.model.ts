import { Patient, PrescriptionTemplate } from '../../../shared/models/hospital.model';

export type PrescriptionPrintDoseSlot = 'morning' | 'noon' | 'evening' | 'night';

export interface PrescriptionPrintPreviewData {
  template: PrescriptionTemplate;
  patient: Patient;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientNo: string;
  patientPhone: string;
  patientAddress: string;
  doctorName: string;
  doctorNamePlain: string;
  doctorNameUrdu: string;
  doctorQualification: string;
  doctorQualificationUrdu: string;
  doctorTitleEnglish: string;
  doctorTitleUrdu: string;
  hospitalName: string;
  hospitalNameUrdu: string;
  hospitalAddress: string;
  hospitalAddressUrdu: string;
  hospitalLogoUrl: string;
  showHospitalLogo: boolean;
  prescriptionRevisionNote: string;
  prescriptionFollowUpLine: string;
  prescriptionFooterLines: string[];
  date: string;
  prescriptionNo: string;
  disease: string;
  vitals: Record<string, string>;
  vitalRows: Array<{ label: string; value: string }>;
  labTests: Array<{ name: string; category: string }>;
  ivFluids: Array<{ name: string; rate: string; quantity: string; route: string }>;
  medicines: Array<Record<string, unknown>>;
  followUpDate: string;
  patientNote: string;
  consultation: string;
  admissionOrderLines: string[];
}
