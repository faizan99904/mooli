import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Prescription } from '../../../shared/models/hospital.model';

export type PhysioTabKey =
  | 'assessment'
  | 'therapy'
  | 'exercise'
  | 'sessions'
  | 'progress'
  | 'advice'
  | 'documents';

export interface PhysioSpecialTest {
  testName: string;
  result: string;
  notes: string;
}

export interface PhysioTherapyRow {
  therapy: string;
  areaSite: string;
  duration: string;
  frequency: string;
  sessions: string;
  notes: string;
}

export interface PhysioExerciseRow {
  exercise: string;
  bodyArea: string;
  sets: string;
  repsHold: string;
  frequency: string;
  instructions: string;
  isHomeExercise: boolean;
  isClinicExercise: boolean;
}

export interface PhysioSessionRow {
  sessionNo: number;
  date: string;
  therapyDone: string;
  exerciseDone: string;
  painBefore: string;
  painAfter: string;
  status: string;
  remarks: string;
}

export interface PhysioProgressRow {
  parameter: string;
  initialValue: string;
  currentValue: string;
  change: string;
  status: string;
}

export interface PhysioDocumentRow {
  name: string;
  type: string;
  uploadedOn: string;
  uploadedBy: string;
  url: string;
}

export interface PhysioAssessmentSummary {
  painScore: string;
  rom: string;
  muscleStrength: string;
  swelling: string;
  gait: string;
  functionalScore: string;
}

export interface PhysioSessionPlan {
  totalSessions: string;
  frequency: string;
  reviewAfter: string;
  nextSessionDate: string;
  sessionFee: string;
  packageFee: string;
}

export interface PhysioAdvice {
  precautions: string;
  homeCare: string;
  dos: string;
  donts: string;
  redFlags: string;
  nextReviewInstructions: string;
}

export interface PhysioPlanPayload {
  version: number;
  planTitle: string;
  treatmentGoal: string;
  physioAssessment: string;
  assessment: {
    painScore: string;
    painLocation: string;
    painType: string;
    radiatingPain: string;
    painSince: string;
    worseWith: string;
    betterWith: string;
    painTime: string;
    rom: string;
    muscleStrength: string;
    swelling: string;
    tenderness: string;
    posture: string;
    gait: string;
    balance: string;
    weightBearing: string;
    functionalScore: string;
    clinicalNotes: string;
    specialTests: PhysioSpecialTest[];
  };
  summary: PhysioAssessmentSummary;
  therapyPlan: PhysioTherapyRow[];
  exercisePlan: PhysioExerciseRow[];
  sessionPlan: PhysioSessionPlan;
  sessions: PhysioSessionRow[];
  progress: PhysioProgressRow[];
  advice: PhysioAdvice;
  documents: PhysioDocumentRow[];
  progressNotes?: string;
}

export function defaultPhysioPlanPayload(): PhysioPlanPayload {
  return {
    version: 1,
    planTitle: '',
    treatmentGoal: '',
    physioAssessment: '',
    assessment: {
      painScore: '0',
      painLocation: '',
      painType: '',
      radiatingPain: 'No',
      painSince: '',
      worseWith: '',
      betterWith: '',
      painTime: '',
      rom: '',
      muscleStrength: '',
      swelling: '',
      tenderness: 'No',
      posture: 'Normal',
      gait: 'Normal',
      balance: 'Good',
      weightBearing: 'Full',
      functionalScore: '',
      clinicalNotes: '',
      specialTests: [],
    },
    summary: {
      painScore: '0',
      rom: '',
      muscleStrength: '',
      swelling: '',
      gait: '',
      functionalScore: '',
    },
    therapyPlan: [],
    exercisePlan: [],
    sessionPlan: {
      totalSessions: '',
      frequency: '',
      reviewAfter: '',
      nextSessionDate: '',
      sessionFee: '',
      packageFee: '',
    },
    sessions: [],
    progress: PROGRESS_DEFAULT_ROWS(),
    advice: {
      precautions: '',
      homeCare: '',
      dos: '',
      donts: '',
      redFlags: '',
      nextReviewInstructions: '',
    },
    documents: [],
  };
}

export function PROGRESS_DEFAULT_ROWS(): PhysioProgressRow[] {
  return [
    'Pain Score',
    'ROM',
    'Muscle Strength',
    'Swelling',
    'Gait',
    'Balance',
    'Functional Score',
    'Walking Ability',
  ].map((parameter) => ({
    parameter,
    initialValue: '',
    currentValue: '',
    change: '',
    status: '',
  }));
}

export function createPhysioPlanForm(fb: FormBuilder): FormGroup {
  const defaults = defaultPhysioPlanPayload();

  return fb.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    appointmentId: [''],
    visitType: ['opd'],
    visitDate: [new Date().toISOString().slice(0, 10)],
    chiefComplaint: [''],
    history: [''],
    physioAssessment: [''],
    diagnosis: [''],
    treatmentGoal: [''],
    advice: [''],
    followUpDate: [''],
    planTitle: [''],
    summary: fb.group({
      painScore: [defaults.summary.painScore],
      rom: [defaults.summary.rom],
      muscleStrength: [defaults.summary.muscleStrength],
      swelling: [defaults.summary.swelling],
      gait: [defaults.summary.gait],
      functionalScore: [defaults.summary.functionalScore],
    }),
    assessment: fb.group({
      painScore: [defaults.assessment.painScore],
      painLocation: [defaults.assessment.painLocation],
      painType: [defaults.assessment.painType],
      radiatingPain: [defaults.assessment.radiatingPain],
      painSince: [defaults.assessment.painSince],
      worseWith: [defaults.assessment.worseWith],
      betterWith: [defaults.assessment.betterWith],
      painTime: [defaults.assessment.painTime],
      rom: [defaults.assessment.rom],
      muscleStrength: [defaults.assessment.muscleStrength],
      swelling: [defaults.assessment.swelling],
      tenderness: [defaults.assessment.tenderness],
      posture: [defaults.assessment.posture],
      gait: [defaults.assessment.gait],
      balance: [defaults.assessment.balance],
      weightBearing: [defaults.assessment.weightBearing],
      functionalScore: [defaults.assessment.functionalScore],
      clinicalNotes: [defaults.assessment.clinicalNotes],
      specialTests: fb.array([]),
    }),
    therapyPlan: fb.array([]),
    exercisePlan: fb.array([]),
    sessionPlan: fb.group({
      totalSessions: [defaults.sessionPlan.totalSessions],
      frequency: [defaults.sessionPlan.frequency],
      reviewAfter: [defaults.sessionPlan.reviewAfter],
      nextSessionDate: [defaults.sessionPlan.nextSessionDate],
      sessionFee: [defaults.sessionPlan.sessionFee],
      packageFee: [defaults.sessionPlan.packageFee],
    }),
    sessions: fb.array([]),
    progress: fb.array(defaults.progress.map((row) => fb.group(row))),
    adviceDetails: fb.group(defaults.advice),
    progressNotes: [''],
    documents: fb.array([]),
    vitals: fb.group({
      bp: [''],
      pulse: [''],
      weight: [''],
      temperature: [''],
      spo2: [''],
    }),
  });
}

export function createSpecialTestGroup(fb: FormBuilder, item?: Partial<PhysioSpecialTest>): FormGroup {
  return fb.group({
    testName: [item?.testName || '', Validators.required],
    result: [item?.result || 'Not Tested'],
    notes: [item?.notes || ''],
  });
}

export function createTherapyGroup(fb: FormBuilder, item?: Partial<PhysioTherapyRow>): FormGroup {
  return fb.group({
    therapy: [item?.therapy || '', Validators.required],
    areaSite: [item?.areaSite || ''],
    duration: [item?.duration || ''],
    frequency: [item?.frequency || ''],
    sessions: [item?.sessions || ''],
    notes: [item?.notes || ''],
  });
}

export function createExerciseGroup(fb: FormBuilder, item?: Partial<PhysioExerciseRow>): FormGroup {
  return fb.group({
    exercise: [item?.exercise || '', Validators.required],
    bodyArea: [item?.bodyArea || ''],
    sets: [item?.sets || ''],
    repsHold: [item?.repsHold || ''],
    frequency: [item?.frequency || ''],
    instructions: [item?.instructions || ''],
    isHomeExercise: [item?.isHomeExercise ?? true],
    isClinicExercise: [item?.isClinicExercise ?? false],
  });
}

export function createSessionGroup(fb: FormBuilder, item?: Partial<PhysioSessionRow>): FormGroup {
  return fb.group({
    sessionNo: [item?.sessionNo || 1],
    date: [item?.date || new Date().toISOString().slice(0, 10)],
    therapyDone: [item?.therapyDone || ''],
    exerciseDone: [item?.exerciseDone || ''],
    painBefore: [item?.painBefore || ''],
    painAfter: [item?.painAfter || ''],
    status: [item?.status || 'Pending'],
    remarks: [item?.remarks || ''],
  });
}

export function createDocumentGroup(fb: FormBuilder, item?: Partial<PhysioDocumentRow>): FormGroup {
  return fb.group({
    name: [item?.name || '', Validators.required],
    type: [item?.type || 'Other'],
    uploadedOn: [item?.uploadedOn || new Date().toISOString()],
    uploadedBy: [item?.uploadedBy || ''],
    url: [item?.url || ''],
  });
}

export function serializePhysioPlan(formValue: Record<string, unknown>): PhysioPlanPayload {
  const assessment = (formValue['assessment'] || {}) as Record<string, unknown>;
  return {
    version: 1,
    planTitle: String(formValue['planTitle'] || '').trim(),
    treatmentGoal: String(formValue['treatmentGoal'] || '').trim(),
    physioAssessment: String(formValue['physioAssessment'] || '').trim(),
    assessment: {
      painScore: String(assessment['painScore'] || ''),
      painLocation: String(assessment['painLocation'] || ''),
      painType: String(assessment['painType'] || ''),
      radiatingPain: String(assessment['radiatingPain'] || ''),
      painSince: String(assessment['painSince'] || ''),
      worseWith: String(assessment['worseWith'] || ''),
      betterWith: String(assessment['betterWith'] || ''),
      painTime: String(assessment['painTime'] || ''),
      rom: String(assessment['rom'] || ''),
      muscleStrength: String(assessment['muscleStrength'] || ''),
      swelling: String(assessment['swelling'] || ''),
      tenderness: String(assessment['tenderness'] || ''),
      posture: String(assessment['posture'] || ''),
      gait: String(assessment['gait'] || ''),
      balance: String(assessment['balance'] || ''),
      weightBearing: String(assessment['weightBearing'] || ''),
      functionalScore: String(assessment['functionalScore'] || ''),
      clinicalNotes: String(assessment['clinicalNotes'] || ''),
      specialTests: ((assessment['specialTests'] || []) as PhysioSpecialTest[]).map((row) => ({
        testName: String(row.testName || '').trim(),
        result: String(row.result || '').trim(),
        notes: String(row.notes || '').trim(),
      })),
    },
    summary: (formValue['summary'] || {}) as PhysioAssessmentSummary,
    therapyPlan: (formValue['therapyPlan'] || []) as PhysioTherapyRow[],
    exercisePlan: (formValue['exercisePlan'] || []) as PhysioExerciseRow[],
    sessionPlan: (formValue['sessionPlan'] || {}) as PhysioSessionPlan,
    sessions: (formValue['sessions'] || []) as PhysioSessionRow[],
    progress: (formValue['progress'] || []) as PhysioProgressRow[],
    advice: (formValue['adviceDetails'] || {}) as PhysioAdvice,
    documents: (formValue['documents'] || []) as PhysioDocumentRow[],
    progressNotes: String(formValue['progressNotes'] || '').trim(),
  };
}

export function buildPhysioSpecialtyData(formValue: Record<string, unknown>): Record<string, unknown> {
  const plan = serializePhysioPlan(formValue);
  return {
    ...plan,
    chiefComplaint: String(formValue['chiefComplaint'] || '').trim(),
    painScore: plan.summary.painScore || plan.assessment.painScore,
    rangeOfMotion: plan.summary.rom || plan.assessment.rom,
    muscleStrength: plan.summary.muscleStrength || plan.assessment.muscleStrength,
    functionalAssessment: plan.physioAssessment,
    therapyPlanRows: plan.therapyPlan,
    exercisePlanRows: plan.exercisePlan,
    therapyPlan: plan.therapyPlan.map((row) => `${row.therapy} | ${row.areaSite} | ${row.duration}`).join('\n'),
    exercisePlan: plan.exercisePlan.map((row) => `${row.exercise} | ${row.bodyArea} | ${row.sets}`).join('\n'),
    sessionsRecommended: plan.sessionPlan.frequency,
    specialtyNotes: plan.assessment.clinicalNotes,
    adviceDetails: plan.advice,
    progressNotes: plan.progressNotes || '',
    physioPlanJson: JSON.stringify(plan),
  };
}

export function parsePhysioPlanFromPrescription(prescription?: Prescription | null): PhysioPlanPayload | null {
  if (!prescription?.specialtyData) {
    return null;
  }

  const raw = prescription.specialtyData['physioPlanJson'];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return JSON.parse(raw) as PhysioPlanPayload;
    } catch {
      return null;
    }
  }

  const data = prescription.specialtyData;
  const defaults = defaultPhysioPlanPayload();
  return {
    ...defaults,
    planTitle: String(data['planTitle'] || '').trim(),
    treatmentGoal: String(data['treatmentGoal'] || '').trim(),
    physioAssessment: String(data['functionalAssessment'] || data['physioAssessment'] || '').trim(),
    assessment: {
      ...defaults.assessment,
      painScore: String(data['painScore'] || defaults.assessment.painScore),
      rom: String(data['rangeOfMotion'] || defaults.assessment.rom),
      muscleStrength: String(data['muscleStrength'] || defaults.assessment.muscleStrength),
      clinicalNotes: String(data['specialtyNotes'] || defaults.assessment.clinicalNotes),
      specialTests: Array.isArray(data['specialTests']) ? (data['specialTests'] as PhysioSpecialTest[]) : [],
    },
    summary: {
      ...defaults.summary,
      painScore: String(data['painScore'] || defaults.summary.painScore),
      rom: String(data['rangeOfMotion'] || defaults.summary.rom),
      muscleStrength: String(data['muscleStrength'] || defaults.summary.muscleStrength),
    },
    therapyPlan: Array.isArray(data['therapyPlanRows']) ? (data['therapyPlanRows'] as PhysioTherapyRow[]) : defaults.therapyPlan,
    exercisePlan: Array.isArray(data['exercisePlanRows']) ? (data['exercisePlanRows'] as PhysioExerciseRow[]) : defaults.exercisePlan,
    sessionPlan: {
      ...defaults.sessionPlan,
      frequency: String(data['sessionsRecommended'] || ''),
    },
    sessions: Array.isArray(data['sessions']) ? (data['sessions'] as PhysioSessionRow[]) : [],
    progress: Array.isArray(data['progress']) ? (data['progress'] as PhysioProgressRow[]) : defaults.progress,
    advice: {
      ...defaults.advice,
      ...(typeof data['adviceDetails'] === 'object' && data['adviceDetails'] ? (data['adviceDetails'] as PhysioAdvice) : {}),
    },
    documents: Array.isArray(data['documents']) ? (data['documents'] as PhysioDocumentRow[]) : [],
    progressNotes: String(data['progressNotes'] || '').trim(),
  };
}

export function computeProgressChange(initial: string, current: string): { change: string; status: string } {
  const initialNum = Number.parseFloat(initial);
  const currentNum = Number.parseFloat(current);
  if (!Number.isFinite(initialNum) || !Number.isFinite(currentNum)) {
    if (initial && current && initial !== current) {
      return { change: `${initial} → ${current}`, status: 'Changed' };
    }
    return { change: '', status: '' };
  }

  const delta = currentNum - initialNum;
  if (delta === 0) {
    return { change: '0', status: 'Stable' };
  }

  const arrow = delta < 0 ? '↓' : '↑';
  const improving = delta < 0;
  return {
    change: `${arrow} ${Math.abs(delta)}`,
    status: improving ? 'Improving' : 'Needs Attention',
  };
}
