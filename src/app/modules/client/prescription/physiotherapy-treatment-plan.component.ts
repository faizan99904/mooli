import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, finalize, merge, Subscription } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  Doctor,
  Hospital,
  Patient,
  Prescription,
  User,
} from '../../../shared/models/hospital.model';
import { inferSpecialtyTemplateKey } from './prescription-specialty-print';
import { getPatientAgeYears } from './vitals-analytics';
import {
  BALANCE_OPTIONS,
  BETTER_WITH_OPTIONS,
  COMMON_EXERCISES,
  COMMON_THERAPIES,
  GAIT_OPTIONS,
  MUSCLE_STRENGTH_OPTIONS,
  PAIN_LOCATIONS,
  PAIN_SINCE_OPTIONS,
  PAIN_TIME_OPTIONS,
  PAIN_TYPES,
  PHYSIO_DOCUMENT_TYPES,
  POSTURE_OPTIONS,
  ROM_OPTIONS,
  SESSION_STATUS_OPTIONS,
  SPECIAL_TEST_OPTIONS,
  SWELLING_OPTIONS,
  TEST_RESULT_OPTIONS,
  WEIGHT_BEARING_OPTIONS,
  WORSE_WITH_OPTIONS,
} from './physiotherapy-catalog';
import { ToastrService } from 'ngx-toastr';
import {
  buildPhysiotherapyPrintHtml,
  buildPhysiotherapySessionPrintHtml,
} from './physiotherapy-print';
import {
  buildPhysioSpecialtyData,
  computeProgressChange,
  createDocumentGroup,
  createExerciseGroup,
  createPhysioPlanForm,
  createSessionGroup,
  createSpecialTestGroup,
  createTherapyGroup,
  parsePhysioPlanFromPrescription,
  PhysioTabKey,
  serializePhysioPlan,
} from './physiotherapy-treatment-plan.model';
import {
  buildDonutSegments,
  buildLineChartModel,
  ChartPoint,
  parseNumericValue,
} from './physiotherapy-charts';
import { canEditPrescriptionInPlace, resolvePrescriptionOwnerUserId } from './prescription-edit-policy';

@Component({
  selector: 'app-physiotherapy-treatment-plan',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './physiotherapy-treatment-plan.component.html',
  styleUrl: './physiotherapy-treatment-plan.component.scss',
})
export class PhysiotherapyTreatmentPlanComponent implements OnInit, OnDestroy {
  physioForm: FormGroup;
  activeTab: PhysioTabKey = 'assessment';
  saving = false;
  editingId = '';
  private editingInPlace = false;
  private editingPrescriptionOwnerId = '';
  appointmentsLoading = false;
  selectedAppointmentId = '';
  selectedPatientId = '';
  appointments: Appointment[] = [];
  visibleAppointments: Appointment[] = [];
  doctors: Doctor[] = [];
  patients: Patient[] = [];
  progressSnapshotItems: Array<{ label: string; text: string; tone: string }> = [
    { label: 'Pain', text: '- → -', tone: 'neutral' },
    { label: 'ROM', text: '- → -', tone: 'neutral' },
    { label: 'Strength', text: '- → -', tone: 'neutral' },
  ];
  currentHospitalId: string | null = null;
  currentHospital: Hospital | null = null;
  currentUserId: string | null = null;
  currentRole = '';
  selectedTherapies = new Set<string>();
  selectedExercises = new Set<string>();
  progressCompareWith = 'initial';
  exerciseSummary = { total: 0, home: 0, clinic: 0 };
  sessionOverview = { total: 0, done: 0, pending: 0, cancelled: 0, remaining: 0 };
  sessionDonutSegments: Array<{ label: string; value: number; color: string; dash: string; offset: number }> = [];
  sessionPainTrendChart = buildLineChartModel([]);
  painProgressChart = buildLineChartModel([]);
  romProgressChart = buildLineChartModel([]);
  private routeSub?: Subscription;
  private syncSub?: Subscription;
  private syncingAssessment = false;

  readonly tabs: Array<{ key: PhysioTabKey; label: string }> = [
    { key: 'assessment', label: 'Assessment' },
    { key: 'therapy', label: 'Therapy Plan' },
    { key: 'exercise', label: 'Exercise Plan' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'progress', label: 'Progress' },
    { key: 'advice', label: 'Advice' },
    { key: 'documents', label: 'Documents' },
  ];

  readonly painLocations = PAIN_LOCATIONS;
  readonly painTypes = PAIN_TYPES;
  readonly painSinceOptions = PAIN_SINCE_OPTIONS;
  readonly worseWithOptions = WORSE_WITH_OPTIONS;
  readonly betterWithOptions = BETTER_WITH_OPTIONS;
  readonly painTimeOptions = PAIN_TIME_OPTIONS;
  readonly romOptions = ROM_OPTIONS;
  readonly muscleStrengthOptions = MUSCLE_STRENGTH_OPTIONS;
  readonly swellingOptions = SWELLING_OPTIONS;
  readonly postureOptions = POSTURE_OPTIONS;
  readonly gaitOptions = GAIT_OPTIONS;
  readonly balanceOptions = BALANCE_OPTIONS;
  readonly weightBearingOptions = WEIGHT_BEARING_OPTIONS;
  readonly specialTestOptions = SPECIAL_TEST_OPTIONS;
  readonly testResultOptions = TEST_RESULT_OPTIONS;
  readonly commonTherapies = COMMON_THERAPIES;
  readonly commonExercises = COMMON_EXERCISES;
  readonly sessionStatusOptions = SESSION_STATUS_OPTIONS;
  readonly documentTypes = PHYSIO_DOCUMENT_TYPES;
  readonly clinicalNoteSnippets: Array<{ label: string; text: string }> = [
    { label: 'Tenderness', text: 'Tenderness noted on palpation.' },
    { label: 'ROM limited', text: 'Range of motion is limited compared to the opposite side.' },
    { label: 'Muscle weakness', text: 'Reduced muscle strength observed during manual testing.' },
    { label: 'Swelling', text: 'Mild swelling present around the affected area.' },
    { label: 'Gait issue', text: 'Antalgic gait observed during walking assessment.' },
    { label: 'Posture', text: 'Postural deviation noted during standing assessment.' },
    { label: 'Neuro intact', text: 'Sensation and reflexes appear within normal limits.' },
    { label: 'Home program', text: 'Patient educated for home exercise and activity modification.' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private backend: BackendService,
    private toastr: ToastrService
  ) {
    this.physioForm = createPhysioPlanForm(this.fb);
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    this.currentHospitalId = user?.hospitalId || null;
    this.currentUserId = user?._id || null;
    this.currentRole = String(localStorage.getItem('role') || user?.role?.name || '');

    if (this.currentHospitalId) {
      this.backend.getHospital(this.currentHospitalId).subscribe({
        next: (hospital) => {
          this.currentHospital = hospital;
        },
        error: () => {
          this.currentHospital = null;
        },
      });
    }

    this.loadLookups();
    this.setupAssessmentSync();
    this.refreshProgressSnapshot();
    this.refreshTabAnalytics();

    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      this.selectedPatientId = params.get('patientId') || '';
      this.selectedAppointmentId = params.get('appointmentId') || '';
      const doctorId = params.get('doctorId') || '';
      const prescriptionId = params.get('prescriptionId') || '';
      const mode = params.get('mode') || '';

      if (doctorId) {
        this.physioForm.patchValue({ doctorId });
      } else if (this.isDoctorUser()) {
        this.physioForm.patchValue({ doctorId: this.currentUserId });
      }

      if (this.selectedPatientId) {
        this.physioForm.patchValue({ patientId: this.selectedPatientId });
      }

      if (this.selectedAppointmentId) {
        this.physioForm.patchValue({ appointmentId: this.selectedAppointmentId });
      }

      if (prescriptionId) {
        this.loadPrescription(prescriptionId, mode);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.syncSub?.unsubscribe();
  }

  get assessmentGroup(): FormGroup {
    return this.physioForm.get('assessment') as FormGroup;
  }

  get summaryGroup(): FormGroup {
    return this.physioForm.get('summary') as FormGroup;
  }

  get sessionPlanGroup(): FormGroup {
    return this.physioForm.get('sessionPlan') as FormGroup;
  }

  get adviceDetailsGroup(): FormGroup {
    return this.physioForm.get('adviceDetails') as FormGroup;
  }

  get specialTests(): FormArray {
    return this.assessmentGroup.get('specialTests') as FormArray;
  }

  get therapyPlan(): FormArray {
    return this.physioForm.get('therapyPlan') as FormArray;
  }

  get exercisePlan(): FormArray {
    return this.physioForm.get('exercisePlan') as FormArray;
  }

  get sessions(): FormArray {
    return this.physioForm.get('sessions') as FormArray;
  }

  get progressRows(): FormArray {
    return this.physioForm.get('progress') as FormArray;
  }

  get documents(): FormArray {
    return this.physioForm.get('documents') as FormArray;
  }

  selectedPatient(): Patient | null {
    const patientId = String(this.physioForm.get('patientId')?.value || this.selectedPatientId || '');
    return (
      this.selectedAppointment()?.patient ||
      this.patients.find((item) => item._id === patientId) ||
      null
    );
  }

  private resolvePatientForPrint(prescription?: Prescription | null): Patient | null {
    const patientId = String(
      prescription?.patientId || this.physioForm.get('patientId')?.value || this.selectedPatientId || ''
    );

    const patient =
      prescription?.patient ||
      this.selectedAppointment()?.patient ||
      this.patients.find((item) => item._id === patientId) ||
      null;

    if (patient) {
      this.rememberPatient(patient);
      return patient;
    }

    if (!patientId) {
      return null;
    }

    return {
      _id: patientId,
      hospitalId: String(prescription?.hospitalId || this.currentHospitalId || ''),
      patientNo: '-',
      assignedDoctorId: '',
      firstName: 'Patient',
      lastName: '',
      phone: null,
      gender: 'other',
      dateOfBirth: null,
      address: null,
      bloodGroup: null,
      allergies: [],
      chronicDiseases: [],
      currentMedications: [],
      status: 'active',
    } as Patient;
  }

  private rememberPatient(patient: Patient): void {
    if (!patient?._id) {
      return;
    }

    if (!this.patients.some((item) => item._id === patient._id)) {
      this.patients = [patient, ...this.patients];
    }
  }

  selectedAppointment(): Appointment | null {
    return this.appointments.find((item) => item._id === this.selectedAppointmentId) || null;
  }

  selectedDoctorProfile(): Doctor | null {
    const doctorId = String(this.physioForm.get('doctorId')?.value || '');
    return (
      this.doctors.find((item) => item.userId === doctorId || item._id === doctorId) || null
    );
  }

  selectedDoctorName(): string {
    return this.selectedDoctorProfile()?.user?.name || 'Physiotherapist';
  }

  patientName(patient?: Patient | null): string {
    if (!patient) {
      return '-';
    }
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || '-';
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }

  ageLabel(patient: Patient): string {
    const age = getPatientAgeYears(patient.dateOfBirth || null);
    return age ? `${age} yrs` : '-';
  }

  appointmentStatusLabel(status?: string): string {
    return String(status || 'scheduled').replace(/_/g, ' ');
  }

  appointmentStatusClass(status?: string): string {
    const value = String(status || '').toLowerCase();
    if (value === 'completed') return 'status-completed';
    if (value === 'cancelled') return 'status-cancelled';
    return 'status-scheduled';
  }

  isDoctorUser(): boolean {
    return this.currentRole.toLowerCase() === 'doctor';
  }

  canCreate(): boolean {
    return this.backend.hasPermission('prescriptions.create');
  }

  canUpdate(): boolean {
    return this.backend.hasPermission('prescriptions.update');
  }

  selectAppointment(appointment: Appointment): void {
    this.selectedAppointmentId = appointment._id;
    this.selectedPatientId = appointment.patientId;
    if (appointment.patient) {
      this.rememberPatient(appointment.patient);
    }
    this.physioForm.patchValue({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId || this.physioForm.get('doctorId')?.value,
      chiefComplaint: this.physioForm.get('chiefComplaint')?.value,
      visitDate: appointment.appointmentDate?.slice(0, 10) || this.physioForm.get('visitDate')?.value,
    });
  }

  refreshAppointments(): void {
    const appointmentDate = new Date().toISOString().slice(0, 10);
    this.appointmentsLoading = true;
    this.backend
      .getAppointments({
        limit: 100,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
        dateFrom: appointmentDate,
        dateTo: appointmentDate,
      })
      .pipe(finalize(() => (this.appointmentsLoading = false)))
      .subscribe({
        next: (result) => {
          this.appointments = result.items || [];
          this.visibleAppointments = this.appointments.filter((item) => item.status !== 'cancelled');
          if (this.selectedAppointmentId) {
            const match = this.visibleAppointments.find((item) => item._id === this.selectedAppointmentId);
            if (match) {
              this.selectAppointment(match);
            }
          }
        },
        error: () => {
          this.appointments = [];
          this.visibleAppointments = [];
        },
      });
  }

  addSpecialTest(name = ''): void {
    this.specialTests.push(createSpecialTestGroup(this.fb, { testName: name, result: 'Not Tested' }));
  }

  removeSpecialTest(index: number): void {
    this.specialTests.removeAt(index);
  }

  addTherapyRow(item?: Partial<{ therapy: string }>): void {
    this.therapyPlan.push(createTherapyGroup(this.fb, item));
  }

  removeTherapyRow(index: number): void {
    this.therapyPlan.removeAt(index);
  }

  selectTab(tab: PhysioTabKey): void {
    this.activeTab = tab;
    this.refreshTabAnalytics();
  }

  trackByIndex(index: number): number {
    return index;
  }

  addExerciseRow(item?: Partial<{ exercise: string; bodyArea: string; isHomeExercise: boolean; isClinicExercise: boolean }>): void {
    this.exercisePlan.push(createExerciseGroup(this.fb, item));
    this.refreshTabAnalytics();
  }

  addCommonExercise(exercise: string): void {
    const painLocation = String(this.assessmentGroup.get('painLocation')?.value || '').trim();
    this.addExerciseRow({
      exercise,
      bodyArea: painLocation || '',
      isHomeExercise: true,
      isClinicExercise: false,
    });
  }

  toggleExerciseSelection(exercise: string, checked: boolean): void {
    if (checked) {
      this.selectedExercises.add(exercise);
    } else {
      this.selectedExercises.delete(exercise);
    }
  }

  isExerciseSelected(exercise: string): boolean {
    return this.selectedExercises.has(exercise);
  }

  addSelectedExercisesToPlan(): void {
    this.selectedExercises.forEach((exercise) => this.addCommonExercise(exercise));
    this.selectedExercises.clear();
  }

  private refreshTabAnalytics(): void {
    const exerciseRows = this.exercisePlan.getRawValue() as Array<{
      isHomeExercise?: boolean;
      isClinicExercise?: boolean;
    }>;
    this.exerciseSummary = {
      total: exerciseRows.length,
      home: exerciseRows.filter((row) => row.isHomeExercise).length,
      clinic: exerciseRows.filter((row) => row.isClinicExercise).length,
    };

    const planned = Number.parseInt(String(this.sessionPlanGroup.get('totalSessions')?.value || ''), 10);
    const sessionRows = this.sessions.getRawValue() as Array<{ status?: string }>;
    const done = sessionRows.filter((row) => row.status === 'Done').length;
    const pending = sessionRows.filter((row) => row.status === 'Pending').length;
    const cancelled = sessionRows.filter((row) => row.status === 'Cancelled').length;
    const total =
      Number.isFinite(planned) && planned > 0 ? planned : Math.max(sessionRows.length, done + pending + cancelled);
    const remaining = Math.max(total - done - cancelled, 0);

    this.sessionOverview = { total, done, pending, cancelled, remaining };
    this.sessionDonutSegments = buildDonutSegments([
      { label: 'Done', value: done, color: '#019c9d' },
      { label: 'Pending', value: pending, color: '#f59e0b' },
      { label: 'Cancelled', value: cancelled, color: '#ef4444' },
      { label: 'Remaining', value: remaining, color: '#cbd5e1' },
    ]);

    const sessionPainPoints: ChartPoint[] = (this.sessions.getRawValue() as Array<{
      sessionNo?: number;
      painAfter?: string;
      painBefore?: string;
    }>)
      .map((session, index) => {
        const value =
          parseNumericValue(session.painAfter) ?? parseNumericValue(session.painBefore) ?? null;
        if (value === null) {
          return null;
        }

        return {
          label: `S${session.sessionNo || index + 1}`,
          value,
        };
      })
      .filter((point): point is ChartPoint => Boolean(point));
    this.sessionPainTrendChart = buildLineChartModel(sessionPainPoints);

    const painRow = this.progressRows.controls.find(
      (control) => String(control.get('parameter')?.value || '') === 'Pain Score'
    );
    const painInitial = parseNumericValue(painRow?.get('initialValue')?.value);
    const painCurrent = parseNumericValue(painRow?.get('currentValue')?.value);
    const painPoints: ChartPoint[] = [];

    if (painInitial !== null) {
      painPoints.push({ label: 'Start', value: painInitial });
    }

    const painSessionPoints = (this.sessions.getRawValue() as Array<{ sessionNo?: number; painAfter?: string }>)
      .map((session, index) => {
        const value = parseNumericValue(session.painAfter);
        if (value === null) {
          return null;
        }
        return { label: `S${session.sessionNo || index + 1}`, value };
      })
      .filter((point): point is ChartPoint => Boolean(point));

    if (painSessionPoints.length) {
      painPoints.push(...painSessionPoints);
    } else if (painCurrent !== null) {
      painPoints.push({ label: 'Now', value: painCurrent });
    }
    this.painProgressChart = buildLineChartModel(painPoints);

    const romRow = this.progressRows.controls.find(
      (control) => String(control.get('parameter')?.value || '') === 'ROM'
    );
    const romInitial = parseNumericValue(romRow?.get('initialValue')?.value);
    const romCurrent = parseNumericValue(romRow?.get('currentValue')?.value);
    const romPoints: ChartPoint[] = [];

    if (romInitial !== null) {
      romPoints.push({ label: 'Start', value: romInitial });
    }
    if (romCurrent !== null) {
      romPoints.push({ label: 'Now', value: romCurrent });
    }
    this.romProgressChart = buildLineChartModel(romPoints);
  }

  progressInitialLabel(): string {
    return this.formatShortDate(this.physioForm.get('visitDate')?.value || this.prescriptionCreatedLabel());
  }

  progressCurrentLabel(): string {
    const sessions = (this.sessions.getRawValue() as Array<{ date?: string }>).filter((row) => row.date);
    const lastDate = sessions[sessions.length - 1]?.date;
    return this.formatShortDate(lastDate || new Date().toISOString());
  }

  sessionStatusClass(status?: string): string {
    const value = String(status || '').toLowerCase();
    if (value === 'done') {
      return 'session-badge done';
    }
    if (value === 'cancelled') {
      return 'session-badge cancelled';
    }
    return 'session-badge pending';
  }

  progressStatusClass(status?: string): string {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'improving') {
      return 'progress-status improving';
    }
    if (value === 'worsening') {
      return 'progress-status worsening';
    }
    if (value === 'changed') {
      return 'progress-status changed';
    }
    if (value === 'stable') {
      return 'progress-status stable';
    }
    return 'progress-status neutral';
  }

  progressChangeClass(change?: string, status?: string): string {
    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus === 'improving') {
      return 'change-cell improving';
    }
    if (normalizedStatus === 'worsening') {
      return 'change-cell worsening';
    }

    const raw = String(change || '').trim();
    if (raw.startsWith('-')) {
      return 'change-cell improving';
    }
    if (raw.startsWith('+')) {
      return 'change-cell worsening';
    }
    return 'change-cell neutral';
  }

  onProgressRowChange(index: number): void {
    const row = this.progressRows.at(index);
    if (!row) {
      return;
    }

    const initial = String(row.get('initialValue')?.value || '');
    const current = String(row.get('currentValue')?.value || '');
    const computed = computeProgressChange(initial, current);
    row.patchValue(
      {
        change: computed.change,
        status: computed.status,
      },
      { emitEvent: false }
    );
    this.refreshProgressSnapshot();
    this.refreshTabAnalytics();
  }

  printExercisePlan(): void {
    this.printPlan();
  }

  private formatShortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value || '-');
    }

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  private prescriptionCreatedLabel(): string {
    return new Date().toISOString();
  }

  removeExerciseRow(index: number): void {
    this.exercisePlan.removeAt(index);
    this.refreshTabAnalytics();
  }

  addSessionRow(): void {
    const nextNo = this.sessions.length + 1;
    this.sessions.push(createSessionGroup(this.fb, { sessionNo: nextNo }));
    this.refreshTabAnalytics();
  }

  removeSessionRow(index: number): void {
    this.sessions.removeAt(index);
    this.refreshTabAnalytics();
  }

  markSessionCompleted(index: number): void {
    this.sessions.at(index)?.patchValue({ status: 'Done' });
    this.refreshTabAnalytics();
  }

  rescheduleSession(index: number): void {
    const nextDate = prompt('Enter new session date (YYYY-MM-DD)');
    if (nextDate) {
      this.sessions.at(index)?.patchValue({ date: nextDate, status: 'Pending' });
      this.refreshTabAnalytics();
    }
  }

  printSessionNote(index: number): void {
    const patient = this.resolvePatientForPrint();
    if (!patient) {
      this.toastr.error('Select a patient first');
      return;
    }

    const session = this.sessions.at(index)?.getRawValue();
    const html = buildPhysiotherapySessionPrintHtml(patient, this.selectedDoctorProfile(), session);
    this.openPrintWindow(html);
  }

  addDocumentRow(): void {
    this.documents.push(
      createDocumentGroup(this.fb, {
        uploadedBy: this.selectedDoctorName(),
      })
    );
  }

  removeDocumentRow(index: number): void {
    this.documents.removeAt(index);
  }

  toggleTherapySelection(therapy: string, checked: boolean): void {
    if (checked) {
      this.selectedTherapies.add(therapy);
    } else {
      this.selectedTherapies.delete(therapy);
    }
  }

  isTherapySelected(therapy: string): boolean {
    return this.selectedTherapies.has(therapy);
  }

  addSelectedTherapiesToPlan(): void {
    this.selectedTherapies.forEach((therapy) => {
      this.addTherapyRow({ therapy });
    });
    this.selectedTherapies.clear();
    this.activeTab = 'therapy';
  }

  get clinicalNotesLength(): number {
    return String(this.assessmentGroup.get('clinicalNotes')?.value || '').length;
  }

  appendClinicalNoteSnippet(snippet: { label: string; text: string }): void {
    const control = this.assessmentGroup.get('clinicalNotes');
    const current = String(control?.value || '').trim();
    const next = current ? `${current}\n${snippet.text}` : snippet.text;
    control?.setValue(next);
  }

  clearClinicalNotes(): void {
    this.assessmentGroup.get('clinicalNotes')?.setValue('');
  }

  updateProgressFromAssessment(): void {
    if (this.syncingAssessment) {
      return;
    }

    const assessment = this.assessmentGroup.getRawValue();
    const summary = this.summaryGroup.getRawValue();
    const mapping: Array<[string, string, string]> = [
      ['Pain Score', summary.painScore || assessment.painScore, assessment.painScore],
      ['ROM', summary.rom || assessment.rom, assessment.rom],
      ['Muscle Strength', summary.muscleStrength || assessment.muscleStrength, assessment.muscleStrength],
      ['Swelling', assessment.swelling, assessment.swelling],
      ['Gait', summary.gait || assessment.gait, assessment.gait],
      ['Balance', assessment.balance, assessment.balance],
      ['Functional Score', summary.functionalScore || assessment.functionalScore, assessment.functionalScore],
    ];

    mapping.forEach(([parameter, initialValue, currentValue]) => {
      const row = this.progressRows.controls.find(
        (control) => String(control.get('parameter')?.value || '') === parameter
      );
      if (!row) {
        return;
      }

      const initial = String(row.get('initialValue')?.value || initialValue || '');
      const current = String(currentValue || '');
      const computed = computeProgressChange(initial, current);
      const next = {
        initialValue: row.get('initialValue')?.value || initialValue || '',
        currentValue: current,
        change: computed.change,
        status: computed.status,
      };

      row.patchValue(next, { emitEvent: false });
    });

    this.refreshProgressSnapshot();
    this.refreshTabAnalytics();
  }

  refreshProgressSnapshot(): void {
    const find = (parameter: string) =>
      this.progressRows.controls.find(
        (control) => String(control.get('parameter')?.value || '') === parameter
      )?.getRawValue();

    const pain = find('Pain Score');
    const rom = find('ROM');
    const strength = find('Muscle Strength');

    this.progressSnapshotItems = [
      {
        label: 'Pain',
        text: `${pain?.initialValue || '-'} → ${pain?.currentValue || '-'}`,
        tone: pain?.status === 'Improving' ? 'good' : 'neutral',
      },
      {
        label: 'ROM',
        text: `${rom?.initialValue || '-'} → ${rom?.currentValue || '-'}`,
        tone: rom?.status === 'Improving' ? 'good' : 'neutral',
      },
      {
        label: 'Strength',
        text: `${strength?.initialValue || '-'} → ${strength?.currentValue || '-'}`,
        tone: strength?.status === 'Improving' ? 'good' : 'neutral',
      },
    ];
  }

  submitPlan(printAfterSave = false): void {
    let shouldUpdate = Boolean(this.editingId && this.editingInPlace);
    if (
      shouldUpdate &&
      this.editingPrescriptionOwnerId &&
      this.editingPrescriptionOwnerId !== String(this.currentUserId || '').trim()
    ) {
      shouldUpdate = false;
      this.editingInPlace = false;
      this.editingId = '';
      this.editingPrescriptionOwnerId = '';
    }

    if (!shouldUpdate && !this.canCreate()) {
      return;
    }

    if (shouldUpdate && !this.canUpdate()) {
      return;
    }

    if (this.physioForm.invalid) {
      this.physioForm.markAllAsTouched();
      this.toastr.error('Please fill required fields');
      return;
    }

    if (this.isDoctorUser() && !this.physioForm.get('appointmentId')?.value) {
      this.toastr.error('Select an assigned appointment before creating treatment plan');
      return;
    }

    this.updateProgressFromAssessment();
    const value = this.physioForm.getRawValue();
    const specialtyData = buildPhysioSpecialtyData(value);

    const payload: Record<string, unknown> = {
      patientId: value.patientId,
      doctorId: value.doctorId,
      appointmentId: value.appointmentId || undefined,
      visitType: value.visitType || 'opd',
      chiefComplaint: value.chiefComplaint || undefined,
      history: value.history || undefined,
      examination: value.physioAssessment || undefined,
      diagnosis: value.diagnosis || undefined,
      advice: value.advice || undefined,
      followUpDate: value.followUpDate || value.sessionPlan?.nextSessionDate || undefined,
      medicines: [],
      labTests: [],
      ivFluids: [],
      admissionOrderItems: [],
      admissionOrders: {},
      patientDocuments: value.documents,
      vitals: value.vitals,
      specialtySection: 'physiotherapy',
      specialtyData,
      prescriptionTemplate: this.selectedDoctorProfile()?.prescriptionTemplate || 'classic',
    };

    if (!shouldUpdate) {
      payload['hospitalId'] = this.currentHospitalId || undefined;
    }

    this.saving = true;
    const request$ = shouldUpdate
      ? this.backend.updatePrescription(this.editingId, payload)
      : this.backend.createPrescription(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.editingId = response.data?._id || this.editingId;
        this.editingInPlace = Boolean(this.editingId);
        this.editingPrescriptionOwnerId = shouldUpdate
          ? this.editingPrescriptionOwnerId
          : resolvePrescriptionOwnerUserId(response.data as Prescription);
        if (printAfterSave) {
          this.printPlan(response.data as Prescription);
        }
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to save treatment plan');
      },
    });
  }

  printPlan(prescription?: Prescription | null): void {
    const patient = this.resolvePatientForPrint(prescription);
    if (!patient) {
      this.toastr.error('Select a patient first');
      return;
    }

    const plan = serializePhysioPlan(this.physioForm.getRawValue());
    const printPrescription: Prescription =
      prescription ||
      ({
        _id: this.editingId || '',
        hospitalId: this.currentHospitalId || '',
        patientId: patient._id,
        doctorId: String(this.physioForm.get('doctorId')?.value || ''),
        medicines: [],
        chiefComplaint: this.physioForm.get('chiefComplaint')?.value,
        diagnosis: this.physioForm.get('diagnosis')?.value,
        advice: this.physioForm.get('advice')?.value,
        followUpDate: this.physioForm.get('followUpDate')?.value,
        examination: this.physioForm.get('physioAssessment')?.value,
        createdAt: new Date().toISOString(),
      } as Prescription);

    const html = buildPhysiotherapyPrintHtml(
      printPrescription,
      patient,
      this.selectedDoctorProfile(),
      plan,
      this.currentHospital
    );
    this.openPrintWindow(html);
  }

  private loadLookups(): void {
    this.backend.getDoctors({ limit: 200, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items || [];
        const doctor = this.selectedDoctorProfile();
        if (doctor && inferSpecialtyTemplateKey(doctor) !== 'physiotherapy') {
          this.toastr.warning('Selected doctor is not a physiotherapy specialist');
        }
      },
      error: () => {
        this.doctors = [];
      },
    });

    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.patients = result.items || [];
      },
      error: () => {
        this.patients = [];
      },
    });

    this.refreshAppointments();
  }

  private loadPrescription(id: string, mode: string): void {
    this.backend.getPrescription(id).subscribe({
      next: (prescription) => {
        if (prescription.specialtySection && prescription.specialtySection !== 'physiotherapy') {
          void this.router.navigate(['/prescriptions'], {
            queryParams: { prescriptionId: id, mode },
          });
          return;
        }

        if (mode === 'view') {
          this.editingInPlace = false;
          this.editingId = prescription._id;
          this.applyPrescription(prescription);
          this.printPlan(prescription);
          return;
        }

        const editInPlace = canEditPrescriptionInPlace(prescription, this.currentUserId);

        if (!editInPlace) {
          if (!this.canCreate()) {
            this.toastr.error('You cannot modify another doctor\'s treatment plan.');
            return;
          }

          this.editingInPlace = false;
          this.editingId = '';
          this.editingPrescriptionOwnerId = '';
          this.applyPrescription(prescription);
          if (this.isDoctorUser()) {
            this.physioForm.patchValue({
              doctorId: this.currentUserId || '',
              appointmentId: '',
            });
            this.selectedAppointmentId = '';
          }
          this.toastr.info('This treatment plan belongs to another doctor. Saving will create a new plan.');
          return;
        }

        if (!this.canUpdate()) {
          return;
        }

        this.editingInPlace = true;
        this.editingId = prescription._id;
        this.editingPrescriptionOwnerId = resolvePrescriptionOwnerUserId(prescription);
        this.applyPrescription(prescription);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to load treatment plan');
      },
    });
  }

  private applyPrescription(prescription: Prescription): void {
    const plan = parsePhysioPlanFromPrescription(prescription) || serializePhysioPlan({});

    if (prescription.patient) {
      this.rememberPatient(prescription.patient);
    }

    this.physioForm.patchValue({
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      appointmentId: prescription.appointmentId || '',
      visitType: prescription.visitType || 'opd',
      chiefComplaint: prescription.chiefComplaint || '',
      history: prescription.history || '',
      physioAssessment: prescription.examination || plan.physioAssessment || '',
      diagnosis: prescription.diagnosis || '',
      treatmentGoal: plan.treatmentGoal || '',
      advice: prescription.advice || '',
      followUpDate: prescription.followUpDate || '',
      planTitle: plan.planTitle || '',
      summary: plan.summary,
      assessment: {
        ...plan.assessment,
        specialTests: [],
      },
      sessionPlan: plan.sessionPlan,
      progressNotes: plan.progressNotes || '',
    });

    this.specialTests.clear();
    this.adviceDetailsGroup.patchValue(plan.advice);
    plan.assessment.specialTests.forEach((row) => this.specialTests.push(createSpecialTestGroup(this.fb, row)));

    this.therapyPlan.clear();
    plan.therapyPlan.forEach((row) => this.therapyPlan.push(createTherapyGroup(this.fb, row)));

    this.exercisePlan.clear();
    plan.exercisePlan.forEach((row) => this.exercisePlan.push(createExerciseGroup(this.fb, row)));

    this.sessions.clear();
    plan.sessions.forEach((row) => this.sessions.push(createSessionGroup(this.fb, row)));

    this.documents.clear();
    plan.documents.forEach((row) => this.documents.push(createDocumentGroup(this.fb, row)));

    this.selectedAppointmentId = prescription.appointmentId || '';
    this.selectedPatientId = prescription.patientId;
    this.refreshTabAnalytics();
  }

  private setupAssessmentSync(): void {
    const assessmentSub = this.assessmentGroup.valueChanges.pipe(debounceTime(150)).subscribe(() => {
      if (this.syncingAssessment) {
        return;
      }

      this.syncingAssessment = true;
      const assessment = this.assessmentGroup.getRawValue();
      this.summaryGroup.patchValue(
        {
          painScore: assessment.painScore,
          rom: assessment.rom,
          muscleStrength: assessment.muscleStrength,
          swelling: assessment.swelling,
          gait: assessment.gait,
          functionalScore: assessment.functionalScore,
        },
        { emitEvent: false }
      );
      this.syncingAssessment = false;
      this.updateProgressFromAssessment();
    });

    const summarySub = this.summaryGroup.valueChanges.pipe(debounceTime(150)).subscribe((summary) => {
      if (this.syncingAssessment) {
        return;
      }

      this.syncingAssessment = true;
      this.assessmentGroup.patchValue(
        {
          painScore: summary.painScore,
          rom: summary.rom,
          muscleStrength: summary.muscleStrength,
          swelling: summary.swelling,
          gait: summary.gait,
          functionalScore: summary.functionalScore,
        },
        { emitEvent: false }
      );
      this.syncingAssessment = false;
      this.updateProgressFromAssessment();
    });

    this.syncSub = new Subscription();
    this.syncSub.add(assessmentSub);
    this.syncSub.add(summarySub);

    const analyticsSub = merge(
      this.sessions.valueChanges,
      this.sessionPlanGroup.valueChanges,
      this.exercisePlan.valueChanges,
      this.progressRows.valueChanges
    )
      .pipe(debounceTime(120))
      .subscribe(() => this.refreshTabAnalytics());
    this.syncSub.add(analyticsSub);
  }

  private openPrintWindow(html: string): void {
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    let printed = false;
    const printFrame = () => {
      if (printed || !document.body.contains(frame)) {
        return;
      }

      printed = true;
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        this.toastr.error('Unable to open print preview');
      } finally {
        window.setTimeout(() => frame.remove(), 1000);
      }
    };

    frame.onload = () => {
      window.setTimeout(printFrame, 150);
    };

    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) {
      this.toastr.error('Unable to open print preview');
      frame.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    window.setTimeout(printFrame, 500);
  }
}
