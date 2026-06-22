import { PrescriptionTemplate } from '../models/hospital.model';
import { SpecialtyTemplateKey } from '../../modules/client/prescription/prescription-specialty-print';

export const CUSTOM_SPECIALIZATION_VALUE = '__custom__';
export const AUTO_PRESCRIPTION_SPECIALTY = 'auto';

export type ClinicalDepartmentKey =
  | 'general_medical'
  | 'surgery'
  | 'women_child'
  | 'eye_ent_dental'
  | 'physiotherapy'
  | 'diagnostics'
  | 'other_common';

export interface ClinicalDepartmentOption {
  key: ClinicalDepartmentKey;
  label: string;
}

export interface CatalogOption {
  value: string;
  label?: string;
  specialtyTemplate?: SpecialtyTemplateKey;
  prescriptionTemplate?: PrescriptionTemplate;
}

export const CLINICAL_DEPARTMENTS: ClinicalDepartmentOption[] = [
  { key: 'general_medical', label: 'General / Medical' },
  { key: 'surgery', label: 'Surgery' },
  { key: 'women_child', label: 'Women & Child' },
  { key: 'eye_ent_dental', label: 'Eye / ENT / Dental' },
  { key: 'physiotherapy', label: 'Physiotherapy' },
  { key: 'diagnostics', label: 'Diagnostics / Reports' },
  { key: 'other_common', label: 'Other Common' },
];

const SPECIALIZATIONS: Record<ClinicalDepartmentKey, CatalogOption[]> = {
  general_medical: [
    { value: 'General Physician', specialtyTemplate: 'general' },
    { value: 'Family Physician', specialtyTemplate: 'general' },
    { value: 'Internal Medicine', specialtyTemplate: 'general' },
    { value: 'Consultant Physician', specialtyTemplate: 'general' },
    { value: 'Diabetologist', specialtyTemplate: 'general' },
    { value: 'Endocrinologist', specialtyTemplate: 'general' },
    { value: 'Cardiologist', specialtyTemplate: 'general' },
    { value: 'Pulmonologist / Chest Specialist', specialtyTemplate: 'general' },
    { value: 'Gastroenterologist', specialtyTemplate: 'general' },
    { value: 'Nephrologist', specialtyTemplate: 'general' },
    { value: 'Neurologist', specialtyTemplate: 'general' },
    { value: 'Dermatologist', specialtyTemplate: 'general' },
    { value: 'Psychiatrist', specialtyTemplate: 'general' },
    { value: 'Rheumatologist', specialtyTemplate: 'general' },
    { value: 'Infectious Disease Specialist', specialtyTemplate: 'general' },
  ],
  surgery: [
    { value: 'General Surgeon', specialtyTemplate: 'general' },
    { value: 'Orthopedic Surgeon', specialtyTemplate: 'general' },
    { value: 'Neurosurgeon', specialtyTemplate: 'general' },
    { value: 'Urologist', specialtyTemplate: 'general' },
    { value: 'ENT Surgeon', specialtyTemplate: 'general' },
    { value: 'Plastic Surgeon', specialtyTemplate: 'general' },
    { value: 'Vascular Surgeon', specialtyTemplate: 'general' },
    { value: 'Pediatric Surgeon', specialtyTemplate: 'general' },
    { value: 'Cardiac Surgeon', specialtyTemplate: 'general' },
  ],
  women_child: [
    { value: 'Gynecologist', specialtyTemplate: 'gynae' },
    { value: 'Obstetrician', specialtyTemplate: 'gynae' },
    { value: 'Pediatrician', specialtyTemplate: 'general' },
    { value: 'Neonatologist', specialtyTemplate: 'general' },
    { value: 'Fertility Specialist', specialtyTemplate: 'gynae' },
  ],
  eye_ent_dental: [
    { value: 'Eye Specialist / Ophthalmologist', specialtyTemplate: 'eye' },
    { value: 'Optometrist', specialtyTemplate: 'eye' },
    { value: 'ENT Specialist', specialtyTemplate: 'general' },
    { value: 'Audiologist', specialtyTemplate: 'general' },
    { value: 'Dentist', specialtyTemplate: 'dental' },
    { value: 'Orthodontist', specialtyTemplate: 'dental' },
    { value: 'Oral & Maxillofacial Surgeon', specialtyTemplate: 'dental' },
    { value: 'Periodontist', specialtyTemplate: 'dental' },
    { value: 'Endodontist', specialtyTemplate: 'dental' },
  ],
  physiotherapy: [
    { value: 'Physiotherapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Orthopedic Physiotherapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Sports Physiotherapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Neuro Physiotherapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Pediatric Physiotherapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Geriatric Physiotherapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Cardio-Pulmonary Physiotherapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Manual Therapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Chiropractor', specialtyTemplate: 'physiotherapy' },
    { value: 'Rehabilitation Specialist', specialtyTemplate: 'physiotherapy' },
  ],
  diagnostics: [
    { value: 'Radiologist', specialtyTemplate: 'radiology' },
    { value: 'Sonologist / Ultrasound Specialist', specialtyTemplate: 'ultrasound' },
    { value: 'Pathologist', specialtyTemplate: 'lab' },
    { value: 'Microbiologist', specialtyTemplate: 'lab' },
    { value: 'Hematologist', specialtyTemplate: 'lab' },
    { value: 'Biochemist', specialtyTemplate: 'lab' },
    { value: 'Lab Consultant', specialtyTemplate: 'lab' },
  ],
  other_common: [
    { value: 'Nutritionist / Dietitian', specialtyTemplate: 'general' },
    { value: 'Speech Therapist', specialtyTemplate: 'general' },
    { value: 'Occupational Therapist', specialtyTemplate: 'physiotherapy' },
    { value: 'Psychologist', specialtyTemplate: 'general' },
    { value: 'Homeopathic Doctor', specialtyTemplate: 'general' },
    { value: 'Hakim / Tibb Specialist', specialtyTemplate: 'general' },
  ],
};

export const QUALIFICATION_OPTIONS: CatalogOption[] = [
  { value: 'MBBS' },
  { value: 'BDS' },
  { value: 'DPT' },
  { value: 'FCPS' },
  { value: 'MCPS' },
  { value: 'FRCS' },
  { value: 'MRCP' },
  { value: 'MS' },
  { value: 'MD' },
  { value: 'DOMS' },
  { value: 'DLO' },
  { value: 'DCH' },
  { value: 'MDS' },
  { value: 'MPhil' },
  { value: 'PhD' },
  { value: 'Diploma' },
];

export const PRESCRIPTION_SPECIALTY_OPTIONS: Array<{ key: SpecialtyTemplateKey; label: string }> = [
  { key: 'general', label: 'General Prescription (Medicines + Vitals + Lab)' },
  { key: 'eye', label: 'Eye Prescription' },
  { key: 'physiotherapy', label: 'Physiotherapy Treatment Plan' },
  { key: 'dental', label: 'Dental Chart + Procedure' },
  { key: 'ultrasound', label: 'Ultrasound Report' },
  { key: 'radiology', label: 'Radiology Report' },
  { key: 'gynae', label: 'Gynae / Obstetric Notes' },
  { key: 'lab', label: 'Lab Report Format' },
];

export function specializationsForDepartment(
  departmentKey: ClinicalDepartmentKey | ''
): CatalogOption[] {
  if (!departmentKey) {
    return [];
  }

  return (SPECIALIZATIONS[departmentKey] || []).map((item) => ({
    ...item,
    label: item.label || item.value,
  }));
}

export function findSpecializationOption(
  departmentKey: ClinicalDepartmentKey | '',
  value: string
): CatalogOption | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return (
    specializationsForDepartment(departmentKey).find(
      (item) => item.value.trim().toLowerCase() === normalized
    ) || null
  );
}

export function inferClinicalDepartmentFromSpecialization(
  specialization: string
): ClinicalDepartmentKey | '' {
  const normalized = String(specialization || '').trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  for (const department of CLINICAL_DEPARTMENTS) {
    const match = specializationsForDepartment(department.key).some(
      (item) => item.value.trim().toLowerCase() === normalized
    );
    if (match) {
      return department.key;
    }
  }

  return '';
}

export function resolveSpecialtyTemplateForSpecialization(
  specialization: string,
  departmentKey: ClinicalDepartmentKey | '' = ''
): SpecialtyTemplateKey {
  const fromCatalog = findSpecializationOption(departmentKey, specialization);
  if (fromCatalog?.specialtyTemplate) {
    return fromCatalog.specialtyTemplate;
  }

  const source = specialization.toLowerCase();
  if (/eye|ophthalm|optom|vision|refraction/.test(source)) return 'eye';
  if (/ultra|sonolog|usg|doppler/.test(source)) return 'ultrasound';
  if (/radio|x-?ray|ct|mri|imaging/.test(source)) return 'radiology';
  if (/gyn|obst|obs|pregnan|antenatal|fertility/.test(source)) return 'gynae';
  if (/dental|dentist|tooth|oral|orthodont/.test(source)) return 'dental';
  if (/physio|rehab|chiropract|occupational therapist/.test(source)) return 'physiotherapy';
  if (/patholog|microbiolog|hematolog|biochemist|lab consultant/.test(source)) return 'lab';
  return 'general';
}

export function specialtyTemplateLabel(key: SpecialtyTemplateKey): string {
  return PRESCRIPTION_SPECIALTY_OPTIONS.find((item) => item.key === key)?.label || key;
}

export function clinicalDepartmentLabel(
  key: ClinicalDepartmentKey | '' | null | undefined
): string {
  if (!key) {
    return '-';
  }

  return CLINICAL_DEPARTMENTS.find((item) => item.key === key)?.label || key;
}
