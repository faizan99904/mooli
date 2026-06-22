import { Doctor } from '../../../shared/models/hospital.model';

export type SpecialtyTemplateKey =
  | 'general'
  | 'eye'
  | 'ultrasound'
  | 'radiology'
  | 'gynae'
  | 'dental'
  | 'physiotherapy'
  | 'lab';

export type SpecialtyField = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date';
  placeholder?: string;
  options?: string[];
  wide?: boolean;
};

export type SpecialtyTemplate = {
  key: SpecialtyTemplateKey;
  title: string;
  description: string;
  fields: SpecialtyField[];
};

export type SpecialtyPrintRow = {
  label: string;
  value: string;
  wide?: boolean;
};

const SPECIALTY_FIELDS: SpecialtyField[] = [
  { key: 'visualAcuityRight', label: 'Right Eye Vision', type: 'select', options: ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL'] },
  { key: 'visualAcuityLeft', label: 'Left Eye Vision', type: 'select', options: ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL'] },
  { key: 'iopRight', label: 'Right Eye IOP', placeholder: '16 mmHg' },
  { key: 'iopLeft', label: 'Left Eye IOP', placeholder: '17 mmHg' },
  { key: 'refractionRightSph', label: 'RE SPH', placeholder: '+0.50' },
  { key: 'refractionRightCyl', label: 'RE CYL', placeholder: '-0.75' },
  { key: 'refractionRightAxis', label: 'RE Axis', placeholder: '90' },
  { key: 'refractionLeftSph', label: 'LE SPH', placeholder: '+0.25' },
  { key: 'refractionLeftCyl', label: 'LE CYL', placeholder: '-0.50' },
  { key: 'refractionLeftAxis', label: 'LE Axis', placeholder: '80' },
  { key: 'slitLampFindings', label: 'Slit Lamp Findings', type: 'textarea', wide: true },
  { key: 'fundusFindings', label: 'Fundus Findings', type: 'textarea', wide: true },
  { key: 'glassesPrescription', label: 'Glasses Prescription', type: 'textarea', wide: true },
  { key: 'eyeDiagnosis', label: 'Eye Diagnosis', type: 'textarea', wide: true },
  { key: 'studyType', label: 'Study Type', type: 'select', options: ['USG Abdomen', 'USG Pelvis', 'USG KUB', 'USG Obstetric', 'USG Breast', 'USG Thyroid', 'USG Scrotum', 'Doppler Study', 'X-Ray Chest PA View', 'X-Ray KUB', 'X-Ray Spine', 'CT Scan', 'MRI'] },
  { key: 'clinicalHistory', label: 'Clinical History', type: 'textarea', wide: true },
  { key: 'technique', label: 'Technique', type: 'textarea', wide: true },
  { key: 'findings', label: 'Findings', type: 'textarea', wide: true },
  { key: 'impression', label: 'Impression', type: 'textarea', wide: true },
  { key: 'recommendation', label: 'Recommendation', type: 'textarea', wide: true },
  { key: 'referredBy', label: 'Referred By' },
  { key: 'reportDate', label: 'Report Date', type: 'date' },
  { key: 'reportingDoctor', label: 'Radiologist / Sonologist' },
  { key: 'lmp', label: 'LMP', type: 'date' },
  { key: 'edd', label: 'EDD', type: 'date' },
  { key: 'gestationalAge', label: 'Gestational Age', placeholder: '12 weeks 3 days' },
  { key: 'gravida', label: 'Gravida' },
  { key: 'para', label: 'Para' },
  { key: 'abortion', label: 'Abortion' },
  { key: 'fetalHeartRate', label: 'Fetal Heart Rate', placeholder: '140 bpm' },
  { key: 'gynaeBp', label: 'BP' },
  { key: 'gynaeWeight', label: 'Weight' },
  { key: 'fundalHeight', label: 'Fundal Height' },
  { key: 'pvExamination', label: 'PV Examination', type: 'textarea', wide: true },
  { key: 'toothNumber', label: 'Tooth Number', placeholder: '36, 46' },
  { key: 'dentalComplaint', label: 'Dental Complaint', type: 'textarea', wide: true },
  { key: 'procedure', label: 'Procedure' },
  { key: 'treatmentPlan', label: 'Treatment Plan', type: 'textarea', wide: true },
  { key: 'nextVisit', label: 'Next Visit', type: 'date' },
  { key: 'dentalNotes', label: 'Dental Notes', type: 'textarea', wide: true },
  { key: 'chiefComplaint', label: 'Chief Complaint', type: 'textarea', wide: true },
  { key: 'painScore', label: 'Pain Score', placeholder: '0-10' },
  { key: 'rangeOfMotion', label: 'Range of Motion', type: 'textarea', wide: true },
  { key: 'muscleStrength', label: 'Muscle Strength', placeholder: '4/5' },
  { key: 'functionalAssessment', label: 'Functional Assessment', type: 'textarea', wide: true },
  { key: 'therapyPlan', label: 'Therapy Plan', type: 'textarea', wide: true },
  { key: 'exercisePlan', label: 'Exercise Plan', type: 'textarea', wide: true },
  { key: 'sessionsRecommended', label: 'Sessions Recommended', placeholder: '3 per week' },
  { key: 'labFindings', label: 'Lab Findings', type: 'textarea', wide: true },
  { key: 'labImpression', label: 'Lab Impression', type: 'textarea', wide: true },
  { key: 'specialtyNotes', label: 'Specialty Notes', type: 'textarea', wide: true },
];

const SPECIALTY_FIELD_MAP = new Map(SPECIALTY_FIELDS.map((field) => [field.key, field]));

export const SPECIALTY_TEMPLATES: Record<SpecialtyTemplateKey, SpecialtyTemplate> = {
  general: {
    key: 'general',
    title: 'Specialty Notes',
    description: 'General specialty notes for this visit.',
    fields: [SPECIALTY_FIELD_MAP.get('specialtyNotes')!],
  },
  eye: {
    key: 'eye',
    title: 'Eye Examination',
    description: 'Vision, IOP, refraction, slit lamp, fundus and glasses details.',
    fields: ['visualAcuityRight', 'visualAcuityLeft', 'iopRight', 'iopLeft', 'refractionRightSph', 'refractionRightCyl', 'refractionRightAxis', 'refractionLeftSph', 'refractionLeftCyl', 'refractionLeftAxis', 'slitLampFindings', 'fundusFindings', 'glassesPrescription', 'eyeDiagnosis'].map((key) => SPECIALTY_FIELD_MAP.get(key)!),
  },
  ultrasound: {
    key: 'ultrasound',
    title: 'Ultrasound Report',
    description: 'Study type, clinical history, findings and impression.',
    fields: ['studyType', 'referredBy', 'reportDate', 'reportingDoctor', 'clinicalHistory', 'findings', 'impression', 'recommendation'].map((key) => SPECIALTY_FIELD_MAP.get(key)!),
  },
  radiology: {
    key: 'radiology',
    title: 'Radiology Report',
    description: 'Examination, technique, findings, impression and recommendation.',
    fields: ['studyType', 'clinicalHistory', 'technique', 'findings', 'impression', 'recommendation', 'reportingDoctor', 'reportDate'].map((key) => SPECIALTY_FIELD_MAP.get(key)!),
  },
  gynae: {
    key: 'gynae',
    title: 'Obstetric / Gynae',
    description: 'Pregnancy and gynae visit details.',
    fields: ['lmp', 'edd', 'gestationalAge', 'gravida', 'para', 'abortion', 'fetalHeartRate', 'gynaeBp', 'gynaeWeight', 'fundalHeight', 'pvExamination'].map((key) => SPECIALTY_FIELD_MAP.get(key)!),
  },
  dental: {
    key: 'dental',
    title: 'Dental Chart',
    description: 'Tooth chart, procedure and treatment plan.',
    fields: ['toothNumber', 'dentalComplaint', 'procedure', 'treatmentPlan', 'nextVisit', 'dentalNotes'].map((key) => SPECIALTY_FIELD_MAP.get(key)!),
  },
  physiotherapy: {
    key: 'physiotherapy',
    title: 'Physiotherapy Treatment Plan',
    description: 'Assessment, therapy plan and exercise plan.',
    fields: ['chiefComplaint', 'painScore', 'rangeOfMotion', 'muscleStrength', 'functionalAssessment', 'therapyPlan', 'exercisePlan', 'sessionsRecommended', 'specialtyNotes'].map((key) => SPECIALTY_FIELD_MAP.get(key)!),
  },
  lab: {
    key: 'lab',
    title: 'Lab Report',
    description: 'Laboratory findings and impression.',
    fields: ['studyType', 'clinicalHistory', 'labFindings', 'labImpression', 'recommendation', 'reportingDoctor', 'reportDate'].map((key) => SPECIALTY_FIELD_MAP.get(key)!),
  },
};

export { SPECIALTY_FIELDS };

export function inferSpecialtyTemplateKey(doctor?: Doctor | null): SpecialtyTemplateKey {
  const explicit = String(doctor?.prescriptionSpecialtyTemplate || '').trim() as SpecialtyTemplateKey;
  if (explicit && SPECIALTY_TEMPLATES[explicit]) {
    return explicit;
  }

  const source = [doctor?.specialization, doctor?.clinicalDepartment, doctor?.department?.name, doctor?.qualification]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/eye|ophthalm|optom|vision|refraction/.test(source)) {
    return 'eye';
  }

  if (/ultra|sonolog|usg|doppler/.test(source)) {
    return 'ultrasound';
  }

  if (/radio|x-?ray|ct|mri|imaging/.test(source)) {
    return 'radiology';
  }

  if (/gyn|obst|obs|pregnan|antenatal/.test(source)) {
    return 'gynae';
  }

  if (/dental|dentist|tooth|oral/.test(source)) {
    return 'dental';
  }

  if (/physio|rehab|chiropract|occupational therapist|manual therapist/.test(source)) {
    return 'physiotherapy';
  }

  if (/patholog|microbiolog|hematolog|biochemist|lab consultant/.test(source)) {
    return 'lab';
  }

  return 'general';
}

function hasEyeSpecialtyData(record: Record<string, unknown>): boolean {
  return [
    'visualAcuityRight',
    'visualAcuityLeft',
    'iopRight',
    'iopLeft',
    'refractionRightSph',
    'refractionRightCyl',
    'refractionRightAxis',
    'refractionLeftSph',
    'refractionLeftCyl',
    'refractionLeftAxis',
    'slitLampFindings',
    'fundusFindings',
    'glassesPrescription',
    'eyeDiagnosis',
  ].some((key) => String(record[key] || '').trim());
}

export function resolvePrintSpecialtyTemplate(
  source: Record<string, unknown>,
  doctor?: Doctor | null
): SpecialtyTemplate {
  const section = String(source['specialtySection'] || '').trim() as SpecialtyTemplateKey;
  if (section && SPECIALTY_TEMPLATES[section]) {
    return SPECIALTY_TEMPLATES[section];
  }

  const data = source['specialtyData'];
  if (data && typeof data === 'object' && !Array.isArray(data) && hasEyeSpecialtyData(data as Record<string, unknown>)) {
    return SPECIALTY_TEMPLATES.eye;
  }

  return SPECIALTY_TEMPLATES[inferSpecialtyTemplateKey(doctor || null)];
}

export function resolvePrescriptionRouteForDoctor(doctor?: Doctor | null): '/prescriptions' | '/prescriptions/physiotherapy' {
  return inferSpecialtyTemplateKey(doctor) === 'physiotherapy'
    ? '/prescriptions/physiotherapy'
    : '/prescriptions';
}

export function resolvePrescriptionRouteForPrescription(
  prescription?: { specialtySection?: string | null } | null
): '/prescriptions' | '/prescriptions/physiotherapy' {
  return prescription?.specialtySection === 'physiotherapy'
    ? '/prescriptions/physiotherapy'
    : '/prescriptions';
}

export function resolvePrintSpecialtyRows(
  source: Record<string, unknown>,
  template: SpecialtyTemplate
): SpecialtyPrintRow[] {
  const data = source['specialtyData'];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }

  const record = data as Record<string, unknown>;
  const rowLimit = template.key === 'eye' ? 14 : 12;

  return template.fields
    .map((field) => ({
      label: field.label,
      value: String(record[field.key] || '').trim(),
      wide: field.wide || field.type === 'textarea',
    }))
    .filter((row) => row.value)
    .slice(0, rowLimit);
}
