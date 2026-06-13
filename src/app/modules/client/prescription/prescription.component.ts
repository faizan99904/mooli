import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { MooliOfflineService, MooliQueuedWork } from '../../../core/services/mooli-offline.service';
import {
  Appointment,
  Doctor,
  DoctorMedicine,
  Hospital,
  Patient,
  PrescriptionPrintSettings,
  ProductCatalogItem,
  Prescription,
} from '../../../shared/models/hospital.model';
import {
  buildVitalDisplayItems,
  buildVitalTrendVisits,
  getPatientAgeYears,
  VitalDisplayItem,
  VitalStatus,
  VitalTrendVisit,
} from './vitals-analytics';

interface PrintPreviewData {
  patient: Patient;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientNo: string;
  patientAddress: string;
  patientPhone: string;
  doctorName: string;
  doctorQualification: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalLogoUrl: string;
  showHospitalLogo: boolean;
  prescriptionRevisionNote: string;
  prescriptionFollowUpLine: string;
  prescriptionFooterLines: string[];
  date: string;
  disease: string;
  vitals: Record<string, string>;
  vitalRows: Array<{ label: string; value: string }>;
  labTests: Array<{ name: string; category: string }>;
  medicines: Array<Record<string, unknown>>;
  followUpDate: string;
}

type DoseSlot = 'morning' | 'noon' | 'evening' | 'night';

interface ParsedMedicineCommand {
  medicineName: string;
  genericName: string;
  dose: string;
  frequency: string;
  duration: string;
  afterMeal: boolean;
  beforeMeal: boolean;
  morning: boolean;
  morningDose: string;
  noon: boolean;
  noonDose: string;
  evening: boolean;
  eveningDose: string;
  night: boolean;
  nightDose: string;
  instruction: string;
}

interface MedicineSuggestionOption {
  source: 'doctor' | 'store';
  value: string;
  meta: string;
  doctorMedicine?: DoctorMedicine;
  storeMedicine?: ProductCatalogItem;
}

@Component({
  selector: 'app-prescription',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prescription.component.html',
  styleUrl: './prescription.component.scss',
})
export class PrescriptionComponent implements OnInit {
  @ViewChild('printContent', { static: false }) printContent!: ElementRef;
  @ViewChild('smartMedicineInputRef', { static: false }) smartMedicineInputRef?: ElementRef<HTMLInputElement>;
  @ViewChildren('medicineNameInput') medicineNameInputs?: QueryList<ElementRef<HTMLInputElement>>;

  prescriptions: Prescription[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  doctorMedicines: DoctorMedicine[] = [];
  storeMedicines: ProductCatalogItem[] = [];
  storeMedicineSearchDisabled = false;
  medicineRowSuggestions: Record<number, MedicineSuggestionOption[]> = {};
  prescriptionForm: FormGroup;
  doctorMedicineForm: FormGroup;
  vitalsModalForm: FormGroup;
  loading = false;
  saving = false;
  page = 1;
  limit = 100;
  totalPages = 0;
  selectedPatientId = '';
  selectedAppointmentId = '';
  editingId: string | null = null;
  currentHospitalId: string | null = null;
  currentHospital: Hospital | null = null;
  currentUserId: string | null = null;
  currentRole = '';
  routePatientId = '';
  routeDoctorId = '';
  routeAppointmentId = '';
  activeTab = 'prescription';
  patientSearch = '';
  printPreviewOpen = false;
  printPreviewLoading = false;
  previewPrescription: Prescription | null = null;
  printPreviewData: PrintPreviewData | null = null;
  smartMedicineInput = '';
  smartMedicineSuggestions: MedicineSuggestionOption[] = [];
  activeMedicineSuggestionIndex = -1;
  medicineLibraryOpen = false;
  medicineLibraryLoading = false;
  savingDoctorMedicine = false;
  selectedMedicineRowIndex: number | null = null;
  vitalsModalOpen = false;
  vitalsTrendModalOpen = false;
  vitalDisplayItems: VitalDisplayItem[] = [];
  vitalTrendVisits: VitalTrendVisit[] = [];
  today = new Date();
  private medicineInputSearchTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private smartMedicineSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private smartMedicineBlurTimer: ReturnType<typeof setTimeout> | null = null;
  private printPreviewRequestId = 0;
  readonly durationOptions = [
    '1 Day',
    '3 Days',
    '5 Days',
    '7 Days',
    '10 Days',
    '14 Days',
    '1 Week',
    '2 Weeks',
    '4 Weeks',
    '1 Month',
    '2 Months',
    '3 Months',
    'Continue',
  ];

  readonly labTestCatalog = [
    { name: 'CBC', category: 'Hematology' },
    { name: 'ESR', category: 'Hematology' },
    { name: 'CRP', category: 'Serology' },
    { name: 'Blood Sugar Fasting', category: 'Biochemistry' },
    { name: 'Chest X-Ray', category: 'Radiology' },
    { name: 'Sputum Culture', category: 'Microbiology' },
  ];
  readonly defaultVitalKeys = new Set(['bp', 'pulse', 'weight', 'temperature', 'spo2']);
  readonly defaultVitalLabels: Record<string, string> = {
    bp: 'BP',
    pulse: 'Pulse',
    weight: 'Weight',
    temperature: 'Temperature',
    spo2: 'SpO2',
  };
  readonly vitalTrendKeys = ['weight', 'bp', 'temperature', 'pulse', 'spo2'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private backend: BackendService,
    readonly offline: MooliOfflineService,
    private toastr: ToastrService
  ) {
    this.prescriptionForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      appointmentId: [''],
      visitType: ['opd'],
      chiefComplaint: [''],
      history: [''],
      examination: [''],
      diagnosis: [''],
      medicines: this.fb.array([this.createMedicineGroup()]),
      labTests: this.fb.array(this.labTestCatalog.map((test) => this.createLabTestGroup(test))),
      customLabTest: [''],
      ivFluids: this.fb.array([this.createIvFluidGroup()]),
      admissionOrders: this.fb.group({
        regularDiet: [true],
        npo: [false],
        consultation: [''],
        monitoring: this.fb.group({
          bp: [true],
          pulse: [true],
          spo2: [true],
          rbs: [true],
        }),
        notes: [''],
      }),
      vitals: this.fb.group({
        bp: [''],
        pulse: [''],
        weight: [''],
        temperature: [''],
        spo2: [''],
      }),
      customVitals: this.fb.array([]),
      advice: [''],
      followUpDate: [''],
    });
    this.doctorMedicineForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
    });
    this.vitalsModalForm = this.fb.group({
      bp: [''],
      pulse: [''],
      weight: [''],
      height: [''],
      temperature: [''],
      spo2: [''],
      respiratoryRate: [''],
      bloodSugar: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { _id?: string; hospitalId?: string | null; hospital?: Hospital | null; role?: { name?: string | null } | null }
      | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.currentHospital = currentUser?.hospital || null;
    this.currentUserId = currentUser?._id || null;
    this.currentRole = String(localStorage.getItem('role') || currentUser?.role?.name || '');
    this.refreshCurrentHospital();

    this.route.queryParamMap.subscribe((params) => {
      this.routePatientId = params.get('patientId') || '';
      this.routeDoctorId = params.get('doctorId') || '';
      this.routeAppointmentId = params.get('appointmentId') || '';
      this.selectedPatientId = this.routePatientId;
      this.selectedAppointmentId = this.routeAppointmentId;
      this.applyRouteDefaults();
      this.page = 1;
      this.loadPrescriptions();
    });

    this.loadLookups();
    this.loadPrescriptions();
    void this.syncOfflineWork(false);

    this.vitalsGroup.valueChanges.subscribe(() => this.refreshVitalAnalytics());
    this.customVitals.valueChanges.subscribe(() => this.refreshVitalAnalytics());
  }

  get medicines(): FormArray {
    return this.prescriptionForm.get('medicines') as FormArray;
  }

  get labTests(): FormArray {
    return this.prescriptionForm.get('labTests') as FormArray;
  }

  get ivFluids(): FormArray {
    return this.prescriptionForm.get('ivFluids') as FormArray;
  }

  get vitalsGroup(): FormGroup {
    return this.prescriptionForm.get('vitals') as FormGroup;
  }

  get customVitals(): FormArray {
    return this.prescriptionForm.get('customVitals') as FormArray;
  }

  get canCreatePrescriptions(): boolean {
    return this.backend.hasPermission('prescriptions.create');
  }

  get canUpdatePrescriptions(): boolean {
    return this.backend.hasPermission('prescriptions.update');
  }

  get canDeletePrescriptions(): boolean {
    return this.backend.hasPermission('prescriptions.delete');
  }

  createMedicineGroup(medicine?: Record<string, unknown>): FormGroup {
    const morningDose = String(medicine?.['morningDose'] || '').trim();
    const noonDose = String(medicine?.['noonDose'] || '').trim();
    const eveningDose = String(medicine?.['eveningDose'] || '').trim();
    const nightDose = String(medicine?.['nightDose'] || '').trim();

    return this.fb.group({
      name: [medicine?.['name'] || '', Validators.required],
      dosage: [medicine?.['dosage'] || ''],
      frequency: [medicine?.['frequency'] || ''],
      duration: [medicine?.['duration'] || '1 Month'],
      afterMeal: [Boolean(medicine?.['afterMeal'])],
      beforeMeal: [Boolean(medicine?.['beforeMeal'])],
      morning: [Boolean(medicine?.['morning']) || Boolean(morningDose)],
      morningDose: [morningDose],
      noon: [Boolean(medicine?.['noon']) || Boolean(noonDose)],
      noonDose: [noonDose],
      evening: [Boolean(medicine?.['evening']) || Boolean(eveningDose)],
      eveningDose: [eveningDose],
      night: [Boolean(medicine?.['night']) || Boolean(nightDose)],
      nightDose: [nightDose],
      instructions: [medicine?.['instructions'] || ''],
    });
  }

  createLabTestGroup(test?: { name?: string; category?: string; selected?: boolean }): FormGroup {
    return this.fb.group({
      selected: [Boolean(test?.selected)],
      name: [test?.name || ''],
      category: [test?.category || ''],
    });
  }

  createIvFluidGroup(name = '', rate = '', duration = ''): FormGroup {
    return this.fb.group({
      name: [name],
      rate: [rate],
      duration: [duration],
    });
  }

  createCustomVitalGroup(key = '', value = ''): FormGroup {
    return this.fb.group({
      key: [key],
      value: [value],
    });
  }

  addMedicine(): void {
    this.medicines.push(this.createMedicineGroup());
  }

  addCustomVital(key = '', value = ''): void {
    this.openVitalsModal();
  }

  openVitalsModal(): void {
    const vitals = this.vitalsGroup.getRawValue() as Record<string, string>;
    const customMap = this.customVitalsToMap();

    this.vitalsModalForm.reset({
      bp: vitals['bp'] || '',
      pulse: vitals['pulse'] || '',
      weight: vitals['weight'] || '',
      height: customMap['height'] || '',
      temperature: vitals['temperature'] || '',
      spo2: vitals['spo2'] || '',
      respiratoryRate: customMap['respiratoryRate'] || customMap['respiratory_rate'] || '',
      bloodSugar: customMap['bloodSugar'] || customMap['blood_sugar'] || '',
      notes: customMap['notes'] || '',
    });
    this.vitalsModalOpen = true;
  }

  closeVitalsModal(): void {
    this.vitalsModalOpen = false;
  }

  saveVitalsModal(): void {
    const value = this.vitalsModalForm.getRawValue() as Record<string, string>;

    this.vitalsGroup.patchValue({
      bp: value['bp'] || '',
      pulse: value['pulse'] || '',
      weight: value['weight'] || '',
      temperature: value['temperature'] || '',
      spo2: value['spo2'] || '',
    });

    this.syncCustomVitalValue('height', value['height'] || '');
    this.syncCustomVitalValue('respiratoryRate', value['respiratoryRate'] || '');
    this.syncCustomVitalValue('bloodSugar', value['bloodSugar'] || '');
    this.syncCustomVitalValue('notes', value['notes'] || '');

    this.vitalsModalOpen = false;
    this.refreshVitalAnalytics();
  }

  openVitalsTrendsModal(): void {
    this.vitalTrendVisits = buildVitalTrendVisits(this.patientPrescriptionHistory());
    this.vitalsTrendModalOpen = true;
  }

  closeVitalsTrendsModal(): void {
    this.vitalsTrendModalOpen = false;
  }

  vitalStatusClass(status: VitalStatus): string {
    return `vital-status-${status}`;
  }

  trendClass(item: VitalDisplayItem): string {
    if (!item.trendText) {
      return 'unknown';
    }

    if (item.status === 'critical') {
      return 'critical';
    }

    if (item.status === 'warning') {
      return 'warning';
    }

    if (item.status === 'watch') {
      return 'watch';
    }

    if (item.trendDirection === 'up') {
      return 'normal';
    }

    if (item.trendDirection === 'down') {
      return item.key === 'weight' ? 'warning' : 'watch';
    }

    return 'normal';
  }

  trendVitalValue(visit: VitalTrendVisit, key: string): string {
    const value = String(visit.vitals[key] || '').trim();
    return value || '—';
  }

  trendSectionHasData(key: string): boolean {
    return this.vitalTrendVisits.some((visit) => Boolean(String(visit.vitals[key] || '').trim()));
  }

  vitalTrendSectionLabel(key: string): string {
    return this.defaultVitalLabels[key] || key;
  }

  hasVitalTrendData(): boolean {
    return this.vitalTrendVisits.length > 0;
  }

  hasRecordedVitals(): boolean {
    return this.vitalDisplayItems.some((item) => Boolean(item.value));
  }

  patientPrescriptionHistory(): Prescription[] {
    const patientId = this.prescriptionForm.getRawValue().patientId || this.selectedPatientId;
    if (!patientId) {
      return [];
    }

    return [...this.prescriptions]
      .filter((prescription) => prescription.patientId === patientId)
      .sort(
        (first, second) =>
          new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
      );
  }

  refreshVitalAnalytics(): void {
    const current = this.buildVitalsPayload(
      this.vitalsGroup.getRawValue() as Record<string, unknown>,
      this.customVitals.getRawValue() as Array<Record<string, unknown>>
    );
    const previous = this.getPreviousVisitVitals();
    const patient = this.selectedPatient();

    this.vitalDisplayItems = buildVitalDisplayItems(
      current,
      previous,
      getPatientAgeYears(patient?.dateOfBirth || null)
    );
    this.vitalTrendVisits = buildVitalTrendVisits(this.patientPrescriptionHistory());
  }

  private getPreviousVisitVitals(): Record<string, string> {
    const history = this.patientPrescriptionHistory();
    const previousPrescription = history.find((prescription) => prescription._id !== this.editingId);
    return (previousPrescription?.vitals as Record<string, string> | undefined) || {};
  }

  private customVitalsToMap(): Record<string, string> {
    return (this.customVitals.getRawValue() as Array<Record<string, string>>).reduce(
      (map, entry) => {
        const key = String(entry['key'] || '').trim();
        if (key) {
          map[key] = String(entry['value'] || '').trim();
        }
        return map;
      },
      {} as Record<string, string>
    );
  }

  private syncCustomVitalValue(key: string, value: string): void {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }

    const index = (this.customVitals.getRawValue() as Array<Record<string, string>>).findIndex(
      (entry) => String(entry['key'] || '').trim() === normalizedKey
    );

    if (!String(value || '').trim()) {
      if (index >= 0) {
        this.customVitals.removeAt(index);
      }
      return;
    }

    if (index >= 0) {
      this.customVitals.at(index).patchValue({ key: normalizedKey, value });
      return;
    }

    this.customVitals.push(this.createCustomVitalGroup(normalizedKey, value));
  }

  removeCustomVital(index: number): void {
    this.customVitals.removeAt(index);
  }

  onSmartMedicineInputChange(): void {
    this.cancelSmartMedicineBlurClose();
    const query = this.extractMedicineQuery(this.smartMedicineInput);
    if (this.smartMedicineSearchTimer) {
      clearTimeout(this.smartMedicineSearchTimer);
      this.smartMedicineSearchTimer = null;
    }

    if (!query) {
      this.clearSmartMedicineSuggestions();
      return;
    }

    this.refreshSmartMedicineSuggestions(query);
    this.smartMedicineSearchTimer = setTimeout(() => {
      this.smartMedicineSearchTimer = null;
      const latestQuery = this.extractMedicineQuery(this.smartMedicineInput);
      if (latestQuery !== query) {
        return;
      }

      this.loadDoctorMedicines(query, true);
      this.loadStoreMedicines(query, true);
    }, 250);
  }

  scheduleSmartMedicineBlurClose(): void {
    this.cancelSmartMedicineBlurClose();
    this.smartMedicineBlurTimer = setTimeout(() => {
      this.smartMedicineBlurTimer = null;
      this.clearSmartMedicineSuggestions();
    }, 120);
  }

  cancelSmartMedicineBlurClose(): void {
    if (!this.smartMedicineBlurTimer) {
      return;
    }

    clearTimeout(this.smartMedicineBlurTimer);
    this.smartMedicineBlurTimer = null;
  }

  handleSmartMedicineKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveMedicineSuggestion(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveMedicineSuggestion(-1);
      return;
    }

    if (event.key === 'Escape') {
      this.clearSmartMedicineSuggestions();
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    const selected = this.smartMedicineSuggestions[this.activeMedicineSuggestionIndex];
    if (selected && !this.hasSmartMedicineCommand(this.smartMedicineInput)) {
      this.addMedicineFromSuggestion(selected);
      return;
    }

    this.addSmartMedicineFromInput();
  }

  addSmartMedicineFromInput(): void {
    const command = this.smartMedicineInput.trim();
    if (!command) {
      this.toastr.error('Enter medicine name or shortcut');
      return;
    }

    const parsed = this.parseMedicineCommand(command);
    this.appendMedicineRow(this.createMedicineRow(parsed));
    this.resetSmartMedicineInput();
  }

  addMedicineFromLibrary(medicine: DoctorMedicine): void {
    const parsed = this.parseMedicineCommand(this.doctorMedicineDisplayName(medicine));
    this.appendMedicineRow(this.createMedicineRow(parsed));
    this.resetSmartMedicineInput();
  }

  addMedicineFromSuggestion(suggestion: MedicineSuggestionOption): void {
    if (suggestion.doctorMedicine) {
      this.addMedicineFromLibrary(suggestion.doctorMedicine);
      return;
    }

    if (suggestion.storeMedicine) {
      this.appendMedicineRow({
        name: this.storeMedicineDisplayName(suggestion.storeMedicine),
        dosage: this.defaultStoreMedicineDose(suggestion.storeMedicine),
        duration: '1 Month',
      });
      this.resetSmartMedicineInput();
    }
  }

  addFavoriteMedicine(medicine: DoctorMedicine): void {
    this.addMedicineFromLibrary(medicine);
  }

  favoriteDoctorMedicines(): DoctorMedicine[] {
    return this.doctorMedicines.slice(0, 8);
  }

  prescriptionMedicineTemplates(): Prescription[] {
    return this.prescriptions
      .filter((prescription) => prescription.medicines?.some((medicine) => String(medicine.name || '').trim()))
      .slice(0, 6);
  }

  medicineTemplateLabel(prescription: Prescription): string {
    return (
      prescription.diagnosis ||
      prescription.chiefComplaint ||
      `${this.prescriptionPatientName(prescription)} - ${this.prescriptionDate(prescription)}`
    );
  }

  applyTemplate(template: Prescription): void {
    (template.medicines || [])
      .filter((medicine) => String(medicine.name || '').trim())
      .forEach((medicine) =>
        this.appendMedicineRow({
          name: medicine.name,
          dosage: medicine.dosage || '',
          frequency: medicine.frequency || '',
          duration: medicine.duration || '1 Month',
          afterMeal: Boolean(medicine.afterMeal),
          beforeMeal: Boolean(medicine.beforeMeal),
          morning: Boolean(medicine.morning),
          morningDose: medicine.morningDose || '',
          noon: Boolean(medicine.noon),
          noonDose: medicine.noonDose || '',
          evening: Boolean(medicine.evening),
          eveningDose: medicine.eveningDose || '',
          night: Boolean(medicine.night),
          nightDose: medicine.nightDose || '',
          instructions: medicine.instructions || '',
        })
      );
  }

  duplicateMedicine(index: number): void {
    const value = this.medicines.at(index)?.getRawValue();
    if (!value) {
      return;
    }

    this.medicines.insert(index + 1, this.createMedicineGroup(value));
  }

  focusMedicineRow(index: number): void {
    setTimeout(() => this.medicineNameInputs?.get(index)?.nativeElement.focus());
  }

  parseMedicineCommand(input: string): ParsedMedicineCommand {
    const tokens = input.trim().split(/\s+/).filter(Boolean);
    const frequencyToken = tokens.find((token) => this.mapFrequencyToTimings(token).label);
    const mealToken = tokens.find((token) => ['pc', 'ac'].includes(token.toLowerCase()));
    const durationToken =
      tokens.find((token) => this.formatDuration(token)) ||
      tokens.find((token) => token.toLowerCase() === 'continue');
    const strengthToken = tokens.find((token) => /^\d+(\.\d+)?\s*(mg|ml|g|iu)?$/i.test(token));

    // Keep medicine name parsing forgiving: remove known shortcut tokens, then use the
    // remaining words to search the doctor's saved backend medicines; custom medicines are still allowed.
    const medicineQuery = tokens
      .filter((token) => {
        const lower = token.toLowerCase();
        return (
          lower !== frequencyToken?.toLowerCase() &&
          lower !== mealToken?.toLowerCase() &&
          lower !== durationToken?.toLowerCase() &&
          lower !== strengthToken?.toLowerCase()
        );
      })
      .join(' ');
    const savedMedicineMatch =
      this.findDoctorMedicineMatch(medicineQuery) || this.findDoctorMedicineMatch(tokens[0] || '');
    const timings = this.mapFrequencyToTimings(frequencyToken || '');
    const duration = this.formatDuration(durationToken || '') || '1 Month';
    const afterMeal = mealToken?.toLowerCase() === 'pc';
    const beforeMeal = mealToken?.toLowerCase() === 'ac';
    const fallbackName = this.toTitleCase(medicineQuery || input);
    const strength = this.formatStrength(strengthToken || '');
    const dose = this.resolveMedicineDose(savedMedicineMatch, strengthToken || '');
    const defaultSlotDose = this.defaultSlotDose(savedMedicineMatch);
    const instructions = [
      beforeMeal ? 'Before meal' : '',
      afterMeal ? 'After meal' : '',
      timings.instruction,
    ].filter(Boolean);

    return {
      medicineName: savedMedicineMatch ? this.doctorMedicineDisplayName(savedMedicineMatch) : fallbackName,
      genericName: '',
      dose,
      frequency: timings.label || '',
      duration,
      afterMeal,
      beforeMeal,
      morning: timings.morning,
      morningDose: timings.morning ? defaultSlotDose : '',
      noon: timings.noon,
      noonDose: timings.noon ? defaultSlotDose : '',
      evening: timings.evening,
      eveningDose: timings.evening ? defaultSlotDose : '',
      night: timings.night,
      nightDose: timings.night ? defaultSlotDose : '',
      instruction: instructions.join('. ') || (strength ? strength : ''),
    };
  }

  mapFrequencyToTimings(shortcut = ''): {
    label: string;
    instruction: string;
    morning: boolean;
    noon: boolean;
    evening: boolean;
    night: boolean;
  } {
    const frequency = shortcut.toLowerCase();
    const empty = { label: '', instruction: '', morning: false, noon: false, evening: false, night: false };
    const map: Record<string, typeof empty> = {
      od: { label: 'Once daily (OD)', instruction: '', morning: true, noon: false, evening: false, night: false },
      bd: { label: 'Twice daily (BD)', instruction: '', morning: true, noon: false, evening: true, night: false },
      tds: { label: 'Three times daily (TDS)', instruction: '', morning: true, noon: true, evening: true, night: false },
      qid: { label: 'Four times daily (QID)', instruction: '', morning: true, noon: true, evening: true, night: true },
      hs: { label: 'At night (HS)', instruction: 'Take at night', morning: false, noon: false, evening: false, night: true },
      am: { label: 'Morning (AM)', instruction: '', morning: true, noon: false, evening: false, night: false },
      noon: { label: 'Noon', instruction: '', morning: false, noon: true, evening: false, night: false },
      pm: { label: 'Evening (PM)', instruction: '', morning: false, noon: false, evening: true, night: false },
      sos: { label: 'When needed (SOS)', instruction: 'Use when needed', morning: false, noon: false, evening: false, night: false },
    };

    return map[frequency] || empty;
  }

  formatDuration(token = ''): string {
    const value = token.toLowerCase();
    if (value === 'continue') {
      return 'Continue';
    }

    const match = /^(\d+)(d|w|m)$/.exec(value);
    if (!match) {
      return '';
    }

    const amount = Number(match[1]);
    const unitMap: Record<string, string> = {
      d: amount === 1 ? 'Day' : 'Days',
      w: amount === 1 ? 'Week' : 'Weeks',
      m: amount === 1 ? 'Month' : 'Months',
    };

    return `${amount} ${unitMap[match[2]]}`;
  }

  createMedicineRow(parsedData: ParsedMedicineCommand): Record<string, unknown> {
    return {
      name: parsedData.medicineName,
      dosage: parsedData.dose,
      frequency: parsedData.frequency,
      duration: parsedData.duration,
      afterMeal: parsedData.afterMeal,
      beforeMeal: parsedData.beforeMeal,
      morning: parsedData.morning,
      morningDose: parsedData.morningDose,
      noon: parsedData.noon,
      noonDose: parsedData.noonDose,
      evening: parsedData.evening,
      eveningDose: parsedData.eveningDose,
      night: parsedData.night,
      nightDose: parsedData.nightDose,
      instructions: parsedData.instruction,
    };
  }

  openDoctorMedicineModal(rowIndex: number | null = null): void {
    this.selectedMedicineRowIndex = rowIndex;
    const source =
      rowIndex !== null ? (this.medicines.at(rowIndex)?.getRawValue() as Record<string, unknown>) : {};
    const parsedMedicine = this.parseMedicineTypeAndName(String(source['name'] || ''));

    this.doctorMedicineForm.reset({
      name: parsedMedicine.name,
      type: parsedMedicine.type,
    });
    this.medicineLibraryOpen = true;
  }

  closeDoctorMedicineModal(): void {
    if (this.savingDoctorMedicine) {
      return;
    }

    this.medicineLibraryOpen = false;
    this.selectedMedicineRowIndex = null;
  }

  saveDoctorMedicine(useInPrescription = false): void {
    if (this.doctorMedicineForm.invalid) {
      this.doctorMedicineForm.markAllAsTouched();
      return;
    }

    const doctorId = this.activeDoctorId();
    if (!doctorId) {
      this.toastr.error('Select an appointment doctor before adding medicine');
      return;
    }

    const payload: Record<string, unknown> = {
      ...this.doctorMedicineForm.getRawValue(),
      doctorId,
      hospitalId: this.currentHospitalId || undefined,
    };

    this.savingDoctorMedicine = true;
    this.backend
      .createDoctorMedicine(payload)
      .pipe(finalize(() => (this.savingDoctorMedicine = false)))
      .subscribe({
        next: (response) => {
          const medicine = response.data;
          this.upsertDoctorMedicine(medicine);
          if (useInPrescription) {
            this.useDoctorMedicine(medicine);
          }
          this.toastr.success(response.message || 'Medicine added successfully');
          this.savingDoctorMedicine = false;
          this.closeDoctorMedicineModal();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to add medicine'),
      });
  }

  removeMedicine(index: number): void {
    this.clearMedicineRowSuggestion(index);

    if (this.medicines.length > 1) {
      this.medicines.removeAt(index);
      return;
    }

    this.medicines.at(index).reset({
      duration: '1 Month',
      morningDose: '',
      noonDose: '',
      eveningDose: '',
      nightDose: '',
    });
  }

  slotDose(medicine: Record<string, unknown> | null | undefined, slot: DoseSlot): string {
    const dose = String(medicine?.[`${slot}Dose`] || '').trim();
    if (dose) {
      return dose;
    }

    return medicine?.[slot] ? '1' : '';
  }

  onSlotDoseInput(index: number, slot: DoseSlot): void {
    const group = this.medicines.at(index);
    const dose = String(group.get(`${slot}Dose`)?.value || '').trim();

    if (dose && !group.get(slot)?.value) {
      group.get(slot)?.setValue(true, { emitEvent: false });
    }
  }

  onSlotToggle(index: number, slot: DoseSlot): void {
    const group = this.medicines.at(index);

    if (!group.get(slot)?.value) {
      group.get(`${slot}Dose`)?.setValue('');
    }
  }

  addCustomLabTest(): void {
    const name = String(this.prescriptionForm.value.customLabTest || '').trim();
    if (!name) {
      return;
    }

    this.labTests.push(this.createLabTestGroup({ name, category: 'Other', selected: true }));
    this.prescriptionForm.patchValue({ customLabTest: '' });
  }

  addIvFluid(): void {
    this.ivFluids.push(this.createIvFluidGroup());
  }

  removeIvFluid(index: number): void {
    if (this.ivFluids.length > 1) {
      this.ivFluids.removeAt(index);
    }
  }

  loadLookups(): void {
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.patients = result.items;
        void this.offline.cacheValue(this.patientsCacheKey(), this.patients);
      },
      error: () => {
        void this.loadCachedPatients();
      },
    });

    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
        void this.offline.cacheValue(this.doctorsCacheKey(), this.doctors);
      },
      error: () => {
        void this.loadCachedDoctors();
      },
    });

    const appointmentDate = this.todayValue();

    this.backend
      .getAppointments({
        limit: 100,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
        dateFrom: appointmentDate,
        dateTo: appointmentDate,
      })
      .subscribe({
        next: (result) => {
          void this.offline.cacheValue(this.appointmentsCacheKey(), result.items);
          void this.applyAppointmentList(result.items);
          this.selectInitialAppointment();
        },
        error: () => {
          void this.loadCachedAppointments();
        },
      });
  }

  loadDoctorMedicines(search = '', updateSmartSuggestions = false, afterLoad?: () => void): void {
    const doctorId = this.activeDoctorId();
    if (!doctorId) {
      this.doctorMedicines = [];
      if (updateSmartSuggestions) {
        this.clearSmartMedicineSuggestions();
      }
      return;
    }

    this.medicineLibraryLoading = true;
    this.backend
      .getDoctorMedicines({
        doctorId,
        q: search.trim() || undefined,
        limit: 50,
      })
      .pipe(finalize(() => (this.medicineLibraryLoading = false)))
      .subscribe({
        next: (items) => {
          this.doctorMedicines = this.mergeDoctorMedicines(items);
          void this.offline.cacheValue(this.doctorMedicinesCacheKey(search), this.doctorMedicines);
          if (updateSmartSuggestions) {
            this.refreshSmartMedicineSuggestions(search);
          }
          afterLoad?.();
        },
        error: () => {
          void this.loadCachedDoctorMedicines(search, updateSmartSuggestions, afterLoad);
        },
      });
  }

  loadStoreMedicines(search = '', updateSmartSuggestions = false, afterLoad?: () => void): void {
    if (this.storeMedicineSearchDisabled) {
      afterLoad?.();
      return;
    }

    this.backend
      .getPrescriptionProductSuggestions({
        limit: 50,
        isActive: true,
        search: search.trim() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.storeMedicines = result.items;
          void this.offline.cacheValue(this.storeMedicinesCacheKey(search), this.storeMedicines);
          if (updateSmartSuggestions) {
            this.refreshSmartMedicineSuggestions(search);
          }
          afterLoad?.();
        },
        error: (err) => {
          void this.loadCachedStoreMedicines(search, updateSmartSuggestions, afterLoad);
          if (err?.status === 403) {
            this.storeMedicineSearchDisabled = true;
          }
        },
      });
  }

  onMedicineNameInput(index: number): void {
    const query = String(this.medicines.at(index).get('name')?.value || '').trim();
    const existingTimer = this.medicineInputSearchTimers.get(index);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (!query) {
      this.clearMedicineRowSuggestion(index);
      return;
    }

    this.refreshMedicineRowSuggestions(index, query);
    const timer = setTimeout(() => {
      this.medicineInputSearchTimers.delete(index);
      const latestQuery = String(this.medicines.at(index)?.get('name')?.value || '').trim();
      if (latestQuery !== query) {
        return;
      }

      this.loadDoctorMedicines(query, false, () => this.refreshMedicineRowSuggestions(index, query));
      this.loadStoreMedicines(query, false, () => this.refreshMedicineRowSuggestions(index, query));
    }, 250);

    this.medicineInputSearchTimers.set(index, timer);
  }

  private buildMedicineSuggestionOptions(query: string, limit = 10): MedicineSuggestionOption[] {
    const suggestions: MedicineSuggestionOption[] = [];
    const seen = new Set<string>();

    this.searchMedicineLibrary(query).forEach((medicine) => {
      const value = this.doctorMedicineDisplayName(medicine);
      const key = this.normalizeMedicineSuggestionKey(value);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      suggestions.push({
        source: 'doctor',
        value,
        meta: this.doctorMedicineMeta(medicine),
        doctorMedicine: medicine,
      });
    });

    this.searchStoreMedicines(query).forEach((medicine) => {
      const value = this.storeMedicineDisplayName(medicine);
      const key = this.normalizeMedicineSuggestionKey(value);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      suggestions.push({
        source: 'store',
        value,
        meta: this.storeMedicineMeta(medicine),
        storeMedicine: medicine,
      });
    });

    return suggestions.slice(0, limit);
  }

  private refreshSmartMedicineSuggestions(search: string): void {
    const query = this.extractMedicineQuery(search);
    this.smartMedicineSuggestions = this.buildMedicineSuggestionOptions(query, 8);
    this.activeMedicineSuggestionIndex = this.smartMedicineSuggestions.length ? 0 : -1;
  }

  private refreshMedicineRowSuggestions(index: number, search: string): void {
    const query = search.trim();
    if (!query) {
      this.clearMedicineRowSuggestion(index);
      return;
    }

    this.medicineRowSuggestions = {
      ...this.medicineRowSuggestions,
      [index]: this.buildMedicineSuggestionOptions(query, 10),
    };
  }

  private clearMedicineRowSuggestion(index: number): void {
    const timer = this.medicineInputSearchTimers.get(index);
    if (timer) {
      clearTimeout(timer);
      this.medicineInputSearchTimers.delete(index);
    }

    if (!this.medicineRowSuggestions[index]) {
      return;
    }

    const nextSuggestions = { ...this.medicineRowSuggestions };
    delete nextSuggestions[index];
    this.medicineRowSuggestions = nextSuggestions;
  }

  applyMedicineSuggestion(index: number): void {
    const query = String(this.medicines.at(index).get('name')?.value || '')
      .trim()
      .toLowerCase();
    const suggestion = (this.medicineRowSuggestions[index] || this.buildMedicineSuggestionOptions(query, 10)).find(
      (item) => item.value.trim().toLowerCase() === query
    );

    if (suggestion?.doctorMedicine) {
      this.useDoctorMedicine(suggestion.doctorMedicine, index);
      return;
    }

    if (suggestion?.storeMedicine) {
      this.useStoreMedicine(suggestion.storeMedicine, index);
    }
  }

  doctorMedicineDisplayName(medicine: Pick<DoctorMedicine, 'name' | 'type'>): string {
    const type = String(medicine.type || '').trim();
    const name = String(medicine.name || '').trim();

    return [type, name].filter(Boolean).join(' ');
  }

  doctorMedicineMeta(medicine: DoctorMedicine): string {
    const type = String(medicine.type || '').trim();
    const common = [medicine.dosage, medicine.frequency].filter(Boolean).join(' ');

    return [type || 'Saved medicine', common ? `Common: ${common}` : ''].filter(Boolean).join(' | ');
  }

  storeMedicineDisplayName(medicine: ProductCatalogItem): string {
    const unit = String(medicine.unit || '').trim();
    const name = String(medicine.name || '').trim();
    const strength = this.storeMedicineStrength(medicine);

    return [unit, name, strength ? `(${strength})` : ''].filter(Boolean).join(' ');
  }

  storeMedicineMeta(medicine: ProductCatalogItem): string {
    const brand = String(medicine.brand || '').trim();
    const sku = String(medicine.sku || '').trim();
    const stock = String(medicine.availableQuantity ?? medicine.stockQuantity ?? '').trim();

    return [
      'Hospital store',
      brand,
      sku ? `SKU: ${sku}` : '',
      stock ? `Stock: ${stock}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }

  loadPrescriptions(): void {
    this.loading = true;
    this.backend
      .getPrescriptions({
        page: this.page,
        limit: this.limit,
        patientId: this.selectedPatientId,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          void this.offline.cacheValue(this.prescriptionsCacheKey(), {
            items: result.items,
            totalPages: result.pagination.totalPages,
          });
          void this.applyPrescriptionList(result.items, result.pagination.totalPages);
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          void this.loadCachedPrescriptions(err);
        },
      });
  }

  submitPrescription(printAfterSave = false): void {
    if (!this.editingId && !this.canCreatePrescriptions) {
      this.toastr.error('You do not have permission to create prescriptions.');
      return;
    }

    if (this.editingId && !this.canUpdatePrescriptions) {
      this.toastr.error('You do not have permission to update prescriptions.');
      return;
    }

    if (this.prescriptionForm.invalid) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    const value = this.prescriptionForm.getRawValue();

    if (this.isDoctorUser() && !value.appointmentId) {
      this.toastr.error('Select an assigned appointment before creating prescription');
      return;
    }

    const medicines = this.normalizeMedicinesForSave(value.medicines);

    if (medicines.length === 0) {
      this.toastr.error('Add at least one medicine');
      return;
    }

    const payload: Record<string, unknown> = {
      patientId: value.patientId,
      doctorId: value.doctorId,
      appointmentId: value.appointmentId || undefined,
      visitType: value.visitType || 'opd',
      chiefComplaint: value.chiefComplaint || undefined,
      history: value.history || undefined,
      examination: value.examination || undefined,
      diagnosis: value.diagnosis || undefined,
      medicines,
      labTests: value.labTests.filter((test: Record<string, unknown>) => test['selected'] && test['name']),
      ivFluids: value.ivFluids.filter((fluid: Record<string, unknown>) => String(fluid['name'] || '').trim()),
      admissionOrders: value.admissionOrders,
      vitals: this.buildVitalsPayload(
        value.vitals as Record<string, unknown>,
        value.customVitals as Array<Record<string, unknown>>
      ),
      advice: value.advice || undefined,
      followUpDate: value.followUpDate || undefined,
    };

    if (!this.editingId) {
      payload['hospitalId'] = this.currentHospitalId || undefined;
    }

    if (!this.offline.online() && !this.editingId) {
      void this.queuePrescription(payload, printAfterSave);
      return;
    }

    this.saving = true;
    const request$ = this.editingId
      ? this.backend.updatePrescription(this.editingId, payload)
      : this.backend.createPrescription(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.editingId = response.data?._id || this.editingId;
        this.markAppointmentCompleted(response.data?.appointmentId || value.appointmentId);
        this.loadPrescriptions();
        if (printAfterSave) {
          this.openPrintPreview(response.data);
        }
      },
      error: (err) => {
        if (!this.editingId && this.offline.shouldQueue(err)) {
          void this.queuePrescription(payload, printAfterSave);
          return;
        }

        this.toastr.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  selectAppointment(appointment: Appointment): void {
    this.selectedAppointmentId = appointment._id;
    this.selectedPatientId = appointment.patientId;
    this.prescriptionForm.patchValue({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment._id,
      chiefComplaint: appointment.reason || this.prescriptionForm.value.chiefComplaint || '',
    });
    this.loadDoctorMedicines();
    this.loadPrescriptions();
    this.refreshVitalAnalytics();
  }

  editPrescription(prescription: Prescription): void {
    if (!this.canUpdatePrescriptions) {
      return;
    }

    this.editingId = prescription._id;
    this.selectedPatientId = prescription.patientId;
    this.selectedAppointmentId = prescription.appointmentId || '';
    this.prescriptionForm.patchValue({
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      appointmentId: prescription.appointmentId || '',
      visitType: prescription.visitType || 'opd',
      chiefComplaint: prescription.chiefComplaint || '',
      history: prescription.history || '',
      examination: prescription.examination || '',
      diagnosis: prescription.diagnosis || '',
      advice: prescription.advice || '',
      followUpDate: prescription.followUpDate ? String(prescription.followUpDate).slice(0, 10) : '',
      vitals: this.extractDefaultVitals(prescription.vitals || {}),
      admissionOrders: prescription.admissionOrders || {},
    });
    this.customVitals.clear();
    this.extractCustomVitals(prescription.vitals || {}).forEach((entry) =>
      this.customVitals.push(this.createCustomVitalGroup(entry.key, entry.value))
    );

    this.medicines.clear();
    (prescription.medicines || []).forEach((medicine) => this.medicines.push(this.createMedicineGroup(medicine as any)));
    if (this.medicines.length === 0) {
      this.addMedicine();
    }

    this.labTests.clear();
    const savedTests = prescription.labTests || [];
    const savedNames = new Set(savedTests.map((test) => test.name));
    this.labTestCatalog.forEach((test) => {
      const saved = savedTests.find((item) => item.name === test.name);
      this.labTests.push(this.createLabTestGroup({ ...test, selected: Boolean(saved) }));
    });
    savedTests
      .filter((test) => !savedNames.has(test.name) || !this.labTestCatalog.some((item) => item.name === test.name))
      .forEach((test) => this.labTests.push(this.createLabTestGroup({ ...test, selected: true })));

    this.ivFluids.clear();
    (prescription.ivFluids || []).forEach((fluid) =>
      this.ivFluids.push(this.createIvFluidGroup(fluid.name, fluid.rate || '', fluid.duration || ''))
    );
    if (this.ivFluids.length === 0) {
      this.addIvFluid();
    }
    this.loadDoctorMedicines();
    this.refreshVitalAnalytics();
  }

  resetForm(): void {
    this.editingId = null;
    this.prescriptionForm.reset({
      visitType: 'opd',
      admissionOrders: {
        regularDiet: true,
        monitoring: {
          bp: true,
          pulse: true,
          spo2: true,
          rbs: true,
        },
      },
    });
    this.customVitals.clear();
    this.medicines.clear();
    this.addMedicine();
    this.labTests.clear();
    this.labTestCatalog.forEach((test) => this.labTests.push(this.createLabTestGroup(test)));
    this.ivFluids.clear();
    this.ivFluids.push(this.createIvFluidGroup());
    this.applyRouteDefaults();
    this.selectInitialAppointment();
    this.loadDoctorMedicines();
    this.refreshVitalAnalytics();
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  doctorName(doctor?: Doctor | null): string {
    return doctor?.user?.name || doctor?.specialization || '-';
  }

  appointmentStatusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  appointmentStatusClass(status: string): string {
    return `status-${status.replace(/_/g, '-')}`;
  }

  initials(value?: string | null): string {
    const words = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return words.length
      ? words
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase()
      : 'NA';
  }

  shortDate(value: string | Date): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  currentTime(): string {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  ageLabel(patient?: Patient | null): string {
    if (!patient?.dateOfBirth) {
      return '-';
    }

    const birthDate = new Date(patient.dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      return '-';
    }

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
      years -= 1;
    }

    return `${Math.max(years, 0)} Y`;
  }

  selectedAppointment(): Appointment | null {
    return this.appointments.find((appointment) => appointment._id === this.selectedAppointmentId) || null;
  }

  selectedPatient(): Patient | null {
    const patientId = this.prescriptionForm.getRawValue().patientId || this.selectedPatientId;
    return (
      this.selectedAppointment()?.patient ||
      this.patients.find((patient) => patient._id === patientId) ||
      null
    );
  }

  selectedDoctorName(): string {
    const appointment = this.selectedAppointment();
    if (appointment?.doctor?.name) {
      return appointment.doctor.name;
    }

    const doctorId = this.prescriptionForm.getRawValue().doctorId;
    const doctor = this.doctors.find((item) => item.userId === doctorId);
    return this.doctorName(doctor);
  }

  selectedDoctorQualification(doctorId = this.prescriptionForm.getRawValue().doctorId): string {
    const doctor = this.doctors.find((item) => item.userId === doctorId);
    return doctor?.qualification || doctor?.specialization || 'M.B.B.S., F.C.P.S.';
  }

  prescriptionPatientName(prescription: Prescription): string {
    const patient = prescription.patient || this.patients.find((item) => item._id === prescription.patientId);
    return this.patientName(patient || null);
  }

  prescriptionDoctorName(prescription: Prescription): string {
    if (prescription.doctor?.name) {
      return prescription.doctor.name;
    }

    const doctor = this.doctors.find((item) => item.userId === prescription.doctorId);
    return this.doctorName(doctor);
  }

  prescriptionDate(prescription: Prescription): string {
    return this.shortDate(prescription.createdAt || prescription.followUpDate || new Date());
  }

  prescriptionMedicineCount(prescription: Prescription): number {
    return prescription.medicines?.length || 0;
  }

  genderShort(patient?: Patient | null): string {
    if (!patient?.gender) {
      return '-';
    }

    return patient.gender.charAt(0).toUpperCase();
  }

  openPrintPreview(prescription: Prescription | null = null): void {
    const requestId = ++this.printPreviewRequestId;
    this.previewPrescription = prescription;
    this.printPreviewData = null;
    this.printPreviewLoading = true;
    this.printPreviewOpen = true;

    window.setTimeout(() => {
      if (requestId !== this.printPreviewRequestId || !this.printPreviewOpen) {
        return;
      }

      try {
        const previewData =
          this.buildPrintPreviewData(prescription) ||
          this.buildPrintPreviewData();

        if (!previewData) {
          this.printPreviewOpen = false;
          this.toastr.error('Unable to build prescription preview.');
          return;
        }

        this.printPreviewData = previewData;
      } catch (error) {
        console.error('Unable to build prescription preview', error);
        this.printPreviewOpen = false;
        this.toastr.error('Unable to build prescription preview.');
      } finally {
        this.printPreviewLoading = false;
      }
    }, 0);
  }

  closePrintPreview(): void {
    this.printPreviewRequestId += 1;
    this.printPreviewOpen = false;
    this.printPreviewLoading = false;
    this.previewPrescription = null;
    this.printPreviewData = null;
  }

  printPrescription(): void {
    if (!this.printContent?.nativeElement) {
      return;
    }

    this.openPrescriptionPrintWindow(this.printContent.nativeElement.innerHTML);
  }

  visibleAppointments(): Appointment[] {
    const query = this.patientSearch.trim().toLowerCase();
    const source = this.appointments.filter((appointment) => this.isTodayAppointment(appointment));

    if (!query) {
      return source.slice(0, 8);
    }

    return source
      .filter((appointment) => `${this.patientName(appointment.patient)} ${appointment.appointmentNo}`.toLowerCase().includes(query))
      .slice(0, 8);
  }

  deletePrescription(id: string): void {
    if (!this.canDeletePrescriptions) {
      return;
    }

    if (!confirm('Delete this prescription?')) {
      return;
    }

    this.backend.deletePrescription(id).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.loadPrescriptions();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPrescriptions();
  }

  async syncOfflineWork(showToast = true): Promise<void> {
    if (!this.offline.online()) {
      if (showToast) {
        this.toastr.info('Prescriptions will sync when internet is back.');
      }
      return;
    }

    const result = await this.offline.syncQueuedWork();
    if (result.syncedCount > 0) {
      this.loadLookups();
      this.loadPrescriptions();
      if (showToast) {
        this.toastr.success(`${result.syncedCount} offline item(s) synced.`);
      }
    } else if (showToast) {
      this.toastr.info('No offline prescriptions are waiting to sync.');
    }
  }

  private async loadCachedPatients(): Promise<void> {
    const cached = await this.offline.readCachedValue<Patient[]>(this.patientsCacheKey(), []);
    const localPatients = (await this.offline.getQueuedWork('patient'))
      .filter((entry) => entry.operation === 'create')
      .map((entry) => this.patientFromQueuedWork(entry));
    this.patients = this.mergePatients([...localPatients, ...cached]);
  }

  private async loadCachedDoctors(): Promise<void> {
    this.doctors = await this.offline.readCachedValue<Doctor[]>(this.doctorsCacheKey(), []);
  }

  private async loadCachedAppointments(): Promise<void> {
    const cached = await this.offline.readCachedValue<Appointment[]>(this.appointmentsCacheKey(), []);
    await this.applyAppointmentList(cached);
    this.selectInitialAppointment();
  }

  private async applyAppointmentList(items: Appointment[]): Promise<void> {
    const localAppointments = await this.localQueuedAppointments();
    this.appointments = this.mergeAppointments([...localAppointments, ...items]).filter((appointment) =>
      this.isTodayAppointment(appointment),
    );
  }

  private async loadCachedDoctorMedicines(
    search: string,
    updateSmartSuggestions: boolean,
    afterLoad?: () => void,
  ): Promise<void> {
    const cached = await this.offline.readCachedValue<DoctorMedicine[]>(
      this.doctorMedicinesCacheKey(search),
      [],
    );
    this.doctorMedicines = this.mergeDoctorMedicines(cached);
    if (updateSmartSuggestions) {
      if (cached.length) {
        this.refreshSmartMedicineSuggestions(search);
      } else {
        this.clearSmartMedicineSuggestions();
      }
    }
    afterLoad?.();
  }

  private async loadCachedStoreMedicines(
    search: string,
    updateSmartSuggestions: boolean,
    afterLoad?: () => void,
  ): Promise<void> {
    this.storeMedicines = await this.offline.readCachedValue<ProductCatalogItem[]>(
      this.storeMedicinesCacheKey(search),
      [],
    );
    if (updateSmartSuggestions) {
      this.refreshSmartMedicineSuggestions(search);
    }
    afterLoad?.();
  }

  private async loadCachedPrescriptions(error: unknown): Promise<void> {
    const cached = await this.offline.readCachedValue<{ items: Prescription[]; totalPages: number }>(
      this.prescriptionsCacheKey(),
      { items: [], totalPages: 0 },
    );
    await this.applyPrescriptionList(cached.items, cached.totalPages);
    if (!this.offline.shouldQueue(error) && cached.items.length === 0) {
      this.toastr.error((error as { error?: { message?: string } })?.error?.message || 'Something went wrong');
    }
  }

  private async applyPrescriptionList(items: Prescription[], totalPages: number): Promise<void> {
    const localPrescriptions = await this.localQueuedPrescriptions();
    this.prescriptions = this.mergePrescriptions([...localPrescriptions, ...items]);
    this.totalPages = totalPages;
    this.refreshVitalAnalytics();
  }

  private async queuePrescription(payload: Record<string, unknown>, printAfterSave: boolean): Promise<void> {
    this.saving = true;
    const localId = this.offline.buildLocalId('prescription');
    const prescription = this.buildLocalPrescription(localId, payload);

    await this.offline.enqueueWork({
      id: localId,
      entity: 'prescription',
      operation: 'create',
      localId,
      payload,
      meta: { prescription },
    });

    this.prescriptions = this.mergePrescriptions([prescription, ...this.prescriptions]);
    this.editingId = localId;
    this.markAppointmentCompleted(prescription.appointmentId);
    this.saving = false;
    this.toastr.success('Prescription saved offline and queued for sync.');
    if (printAfterSave) {
      this.openPrintPreview(prescription);
    }
  }

  private buildLocalPrescription(localId: string, payload: Record<string, unknown>): Prescription {
    const appointment = this.selectedAppointment();
    const patient = this.selectedPatient();

    return {
      _id: localId,
      hospitalId: String(payload['hospitalId'] || this.currentHospitalId || ''),
      patientId: String(payload['patientId'] || patient?._id || ''),
      patient,
      doctorId: String(payload['doctorId'] || ''),
      doctor: appointment?.doctor || null,
      appointmentId: (payload['appointmentId'] as string | undefined) || null,
      appointment,
      medicines: (payload['medicines'] as Prescription['medicines']) || [],
      chiefComplaint: (payload['chiefComplaint'] as string | undefined) || null,
      history: (payload['history'] as string | undefined) || null,
      examination: (payload['examination'] as string | undefined) || null,
      diagnosis: (payload['diagnosis'] as string | undefined) || null,
      labTests: (payload['labTests'] as Prescription['labTests']) || [],
      ivFluids: (payload['ivFluids'] as Prescription['ivFluids']) || [],
      admissionOrders: (payload['admissionOrders'] as Prescription['admissionOrders']) || null,
      vitals: (payload['vitals'] as Record<string, string> | undefined) || {},
      advice: (payload['advice'] as string | undefined) || null,
      visitType: (payload['visitType'] as string | undefined) || 'opd',
      followUpDate: (payload['followUpDate'] as string | undefined) || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async localQueuedAppointments(): Promise<Appointment[]> {
    const entries = await this.offline.getQueuedWork('appointment');
    return entries
      .filter((entry) => entry.operation === 'create')
      .map((entry) => this.appointmentFromQueuedWork(entry));
  }

  private appointmentFromQueuedWork(entry: MooliQueuedWork): Appointment {
    const metaAppointment = entry.meta?.['appointment'] as Appointment | undefined;
    if (metaAppointment) {
      return metaAppointment;
    }

    const payload = entry.payload as Record<string, unknown>;
    const doctor = this.doctors.find((item) => item.userId === payload['doctorId']);
    const patient = (entry.meta?.['patient'] as Patient | null) ||
      this.patients.find((item) => item._id === payload['patientId']) ||
      null;

    return {
      _id: entry.localId || entry.id,
      hospitalId: String(payload['hospitalId'] || this.currentHospitalId || ''),
      appointmentNo: `OFF-${(entry.localId || entry.id).slice(-6).toUpperCase()}`,
      patientId: String(payload['patientId'] || ''),
      patient,
      doctorId: String(payload['doctorId'] || ''),
      doctor: doctor?.user || null,
      departmentId: String(payload['departmentId'] || doctor?.departmentId || ''),
      department: doctor?.department || null,
      appointmentDate: String(payload['appointmentDate'] || new Date().toISOString()),
      startTime: String(payload['startTime'] || ''),
      endTime: String(payload['endTime'] || ''),
      reason: (payload['reason'] as string | undefined) || null,
      status: (payload['status'] as Appointment['status']) || 'confirmed',
      notes: (payload['notes'] as string | undefined) || 'Saved offline',
    };
  }

  private async localQueuedPrescriptions(): Promise<Prescription[]> {
    const entries = await this.offline.getQueuedWork('prescription');
    return entries
      .filter((entry) => entry.operation === 'create')
      .map((entry) => {
        const metaPrescription = entry.meta?.['prescription'] as Prescription | undefined;
        return metaPrescription || this.buildLocalPrescription(entry.localId || entry.id, entry.payload as Record<string, unknown>);
      });
  }

  private patientFromQueuedWork(entry: MooliQueuedWork): Patient {
    const metaPatient = entry.meta?.['patient'] as Patient | undefined;
    if (metaPatient) {
      return metaPatient;
    }

    const payload = entry.payload as Record<string, unknown>;
    return {
      _id: entry.localId || entry.id,
      hospitalId: String(payload['hospitalId'] || this.currentHospitalId || ''),
      patientNo: `OFF-${(entry.localId || entry.id).slice(-6).toUpperCase()}`,
      assignedDoctorId: String(payload['assignedDoctorId'] || ''),
      firstName: String(payload['firstName'] || ''),
      lastName: String(payload['lastName'] || ''),
      email: (payload['email'] as string | undefined) || null,
      phone: (payload['phone'] as string | undefined) || null,
      gender: (payload['gender'] as Patient['gender']) || 'other',
      dateOfBirth: (payload['dateOfBirth'] as string | undefined) || null,
      bloodGroup: (payload['bloodGroup'] as string | undefined) || null,
      address: (payload['address'] as string | undefined) || null,
      emergencyContactName: (payload['emergencyContactName'] as string | undefined) || null,
      emergencyContactPhone: (payload['emergencyContactPhone'] as string | undefined) || null,
      allergies: (payload['allergies'] as string[]) || [],
      chronicDiseases: (payload['chronicDiseases'] as string[]) || [],
      currentMedications: (payload['currentMedications'] as string[]) || [],
      status: 'active',
    };
  }

  private mergePatients(items: Patient[]): Patient[] {
    const map = new Map<string, Patient>();
    items.forEach((item) => {
      if (item?._id) {
        map.set(item._id, item);
      }
    });
    return Array.from(map.values());
  }

  private mergeAppointments(items: Appointment[]): Appointment[] {
    const map = new Map<string, Appointment>();
    items.forEach((item) => {
      if (item?._id) {
        map.set(item._id, item);
      }
    });
    return Array.from(map.values()).sort((first, second) =>
      `${first.appointmentDate} ${first.startTime}`.localeCompare(`${second.appointmentDate} ${second.startTime}`),
    );
  }

  private mergePrescriptions(items: Prescription[]): Prescription[] {
    const map = new Map<string, Prescription>();
    items.forEach((item) => {
      if (item?._id) {
        map.set(item._id, item);
      }
    });
    return Array.from(map.values()).sort((first, second) =>
      String(second.createdAt || '').localeCompare(String(first.createdAt || '')),
    );
  }

  private patientsCacheKey(): string {
    return this.offline.cacheKey('patients');
  }

  private doctorsCacheKey(): string {
    return this.offline.cacheKey('prescription-doctors');
  }

  private appointmentsCacheKey(): string {
    return this.offline.cacheKey(
      'prescription-appointments',
      this.isDoctorUser() ? this.currentUserId || 'doctor' : 'all',
      this.todayValue(),
    );
  }

  private prescriptionsCacheKey(): string {
    return this.offline.cacheKey(
      'prescriptions',
      this.page,
      this.limit,
      this.selectedPatientId || 'all',
      this.isDoctorUser() ? this.currentUserId || 'doctor' : 'all',
    );
  }

  private doctorMedicinesCacheKey(search = ''): string {
    return this.offline.cacheKey('doctor-medicines', this.activeDoctorId() || 'doctor', search.trim() || 'all');
  }

  private storeMedicinesCacheKey(search = ''): string {
    return this.offline.cacheKey('store-medicine-suggestions', search.trim() || 'all');
  }

  private applyRouteDefaults(): void {
    if (this.editingId) {
      return;
    }

    this.prescriptionForm.patchValue({
      patientId: this.routePatientId,
      doctorId: this.isDoctorUser() ? this.currentUserId || '' : this.routeDoctorId,
      appointmentId: this.routeAppointmentId,
    });

    if (this.isDoctorUser()) {
      this.prescriptionForm.get('doctorId')?.disable({ emitEvent: false });
    } else {
      this.prescriptionForm.get('doctorId')?.enable({ emitEvent: false });
    }

    this.loadDoctorMedicines();
  }

  private selectInitialAppointment(): void {
    if (this.selectedAppointmentId) {
      const appointment = this.appointments.find((item) => item._id === this.selectedAppointmentId);
      if (appointment) {
        this.selectAppointment(appointment);
      }
      return;
    }

    const firstAppointment = this.visibleAppointments()[0];
    if (firstAppointment && !this.prescriptionForm.value.patientId) {
      this.selectAppointment(firstAppointment);
    }
  }

  private isTodayAppointment(appointment: Appointment): boolean {
    return this.dateOnly(appointment.appointmentDate) === this.todayValue();
  }

  private dateOnly(value: string | Date): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private todayValue(): string {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private isDoctorUser(): boolean {
    return this.currentRole.trim().replace(/[\s_-]/g, '').toLowerCase() === 'doctor';
  }

  private activeDoctorId(): string {
    return String(
      this.prescriptionForm.getRawValue().doctorId ||
      (this.isDoctorUser() ? this.currentUserId : '') ||
      ''
    ).trim();
  }

  private mergeDoctorMedicines(items: DoctorMedicine[]): DoctorMedicine[] {
    const map = new Map<string, DoctorMedicine>();
    [...this.doctorMedicines, ...items].forEach((medicine) => {
      if (medicine?._id) {
        map.set(medicine._id, medicine);
      }
    });

    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name));
  }

  private extractMedicineQuery(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .filter((token) => {
        const lower = token.toLowerCase();
        return (
          !this.mapFrequencyToTimings(lower).label &&
          !['pc', 'ac', 'continue'].includes(lower) &&
          !this.formatDuration(lower) &&
          !/^\d+(\.\d+)?\s*(mg|ml|g|iu)?$/i.test(token)
        );
      })
      .join(' ');
  }

  private findDoctorMedicineMatch(query: string): DoctorMedicine | undefined {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return undefined;
    }

    const matches = this.searchMedicineLibrary(normalizedQuery);
    return (
      matches.find((medicine) =>
        [medicine.name, this.doctorMedicineDisplayName(medicine)]
          .filter(Boolean)
          .some((value) => value.trim().toLowerCase() === normalizedQuery)
      ) || matches[0]
    );
  }

  private searchMedicineLibrary(query: string): DoctorMedicine[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return this.doctorMedicines.filter((medicine) => {
      const searchText = [medicine.name, medicine.type, this.doctorMedicineDisplayName(medicine)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }

  private searchStoreMedicines(query: string): ProductCatalogItem[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return this.storeMedicines.filter((medicine) => {
      const searchText = [
        medicine.name,
        medicine.unit,
        medicine.brand,
        medicine.sku,
        medicine.barcode,
        medicine.strengthValue,
        medicine.strengthUnit,
        this.storeMedicineDisplayName(medicine),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }

  private storeMedicineStrength(medicine: Pick<ProductCatalogItem, 'strengthValue' | 'strengthUnit'>): string {
    const value = String(medicine.strengthValue || '').trim();
    const unit = String(medicine.strengthUnit || '').trim();

    return [value, unit].filter(Boolean).join(' ');
  }

  private defaultStoreMedicineDose(medicine: ProductCatalogItem): string {
    const unit = String(medicine.unit || '').trim();
    const strength = this.storeMedicineStrength(medicine);

    return [unit ? `1 ${unit}` : '', strength ? `(${strength})` : ''].filter(Boolean).join(' ');
  }

  private normalizeMedicineSuggestionKey(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private appendMedicineRow(row: Record<string, unknown>): void {
    const firstEmptyIndex = this.medicines.controls.findIndex(
      (control) => !String(control.get('name')?.value || '').trim()
    );

    if (firstEmptyIndex >= 0) {
      this.medicines.at(firstEmptyIndex).patchValue(row);
      return;
    }

    this.medicines.push(this.createMedicineGroup(row));
  }

  private normalizeMedicinesForSave(rawMedicines: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return rawMedicines
      .filter((medicine) => String(medicine['name'] || '').trim())
      .map((medicine) => {
        const normalized = { ...medicine };

        (['morning', 'noon', 'evening', 'night'] as DoseSlot[]).forEach((slot) => {
          const doseKey = `${slot}Dose`;
          const dose = String(normalized[doseKey] || '').trim();

          normalized[doseKey] = dose;
          normalized[slot] = Boolean(normalized[slot]) || Boolean(dose);
        });

        return normalized;
      });
  }

  private resetSmartMedicineInput(): void {
    this.smartMedicineInput = '';
    this.clearSmartMedicineSuggestions();
    this.focusSmartMedicineInput();
  }

  private focusSmartMedicineInput(): void {
    setTimeout(() => this.smartMedicineInputRef?.nativeElement.focus());
  }

  private clearSmartMedicineSuggestions(): void {
    this.smartMedicineSuggestions = [];
    this.activeMedicineSuggestionIndex = -1;
  }

  private moveMedicineSuggestion(direction: 1 | -1): void {
    if (!this.smartMedicineSuggestions.length) {
      return;
    }

    const nextIndex = this.activeMedicineSuggestionIndex + direction;
    this.activeMedicineSuggestionIndex =
      (nextIndex + this.smartMedicineSuggestions.length) % this.smartMedicineSuggestions.length;
  }

  private hasSmartMedicineCommand(value: string): boolean {
    return value
      .trim()
      .split(/\s+/)
      .some((token) => {
        const lower = token.toLowerCase();
        return (
          Boolean(this.mapFrequencyToTimings(lower).label) ||
          ['pc', 'ac', 'continue'].includes(lower) ||
          Boolean(this.formatDuration(lower)) ||
          /^\d+(\.\d+)?\s*(mg|ml|g|iu)?$/i.test(token)
        );
      });
  }

  private resolveMedicineDose(medicine: DoctorMedicine | undefined, strengthToken: string): string {
    const strength = this.formatStrength(strengthToken);
    if (!medicine) {
      return strength;
    }

    const type = String(medicine.type || '').trim();
    return [type ? `1 ${type}` : '', strength ? `(${strength})` : ''].filter(Boolean).join(' ');
  }

  private defaultSlotDose(medicine: Pick<DoctorMedicine, 'type'> | undefined): string {
    const type = String(medicine?.type || '').trim();
    return type ? `1 ${type}` : '';
  }

  private formatStrength(value: string): string {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return '';
    }

    if (/^\d+(\.\d+)?$/i.test(trimmedValue)) {
      return `${trimmedValue}mg`;
    }

    return trimmedValue;
  }

  private toTitleCase(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
      .join(' ');
  }

  private upsertDoctorMedicine(medicine: DoctorMedicine): void {
    const index = this.doctorMedicines.findIndex((item) => item._id === medicine._id);
    if (index >= 0) {
      this.doctorMedicines[index] = medicine;
      this.doctorMedicines = [...this.doctorMedicines];
      return;
    }

    this.doctorMedicines = [...this.doctorMedicines, medicine].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  private useDoctorMedicine(medicine: DoctorMedicine, rowIndex = this.selectedMedicineRowIndex): void {
    let targetIndex = rowIndex;

    if (targetIndex === null) {
      targetIndex = this.medicines.controls.findIndex((control) => {
        const value = String(control.get('name')?.value || '').trim();
        return !value;
      });
    }

    if (targetIndex === null || targetIndex < 0) {
      this.addMedicine();
      targetIndex = this.medicines.length - 1;
    }

    const control = this.medicines.at(targetIndex);
    const current = control.getRawValue() as Record<string, unknown>;
    const defaultDose = this.defaultSlotDose(medicine);

    control.patchValue({
      name: this.doctorMedicineDisplayName(medicine),
      morningDose: current['morning'] && !current['morningDose'] ? defaultDose : current['morningDose'],
      noonDose: current['noon'] && !current['noonDose'] ? defaultDose : current['noonDose'],
      eveningDose: current['evening'] && !current['eveningDose'] ? defaultDose : current['eveningDose'],
      nightDose: current['night'] && !current['nightDose'] ? defaultDose : current['nightDose'],
    });
  }

  private useStoreMedicine(medicine: ProductCatalogItem, rowIndex = this.selectedMedicineRowIndex): void {
    let targetIndex = rowIndex;

    if (targetIndex === null) {
      targetIndex = this.medicines.controls.findIndex((control) => {
        const value = String(control.get('name')?.value || '').trim();
        return !value;
      });
    }

    if (targetIndex === null || targetIndex < 0) {
      this.addMedicine();
      targetIndex = this.medicines.length - 1;
    }

    const control = this.medicines.at(targetIndex);
    const current = control.getRawValue() as Record<string, unknown>;
    const defaultDose = this.defaultStoreMedicineDose(medicine);

    control.patchValue({
      name: this.storeMedicineDisplayName(medicine),
      dosage: current['dosage'] || defaultDose,
      morningDose: current['morning'] && !current['morningDose'] ? defaultDose : current['morningDose'],
      noonDose: current['noon'] && !current['noonDose'] ? defaultDose : current['noonDose'],
      eveningDose: current['evening'] && !current['eveningDose'] ? defaultDose : current['eveningDose'],
      nightDose: current['night'] && !current['nightDose'] ? defaultDose : current['nightDose'],
    });
  }

  private parseMedicineTypeAndName(value: string): { name: string; type: string } {
    const trimmedValue = value.trim();
    const savedMedicine = this.doctorMedicines.find((medicine) => {
      const displayName = this.doctorMedicineDisplayName(medicine).toLowerCase();
      const medicineName = String(medicine.name || '').trim().toLowerCase();
      const normalizedValue = trimmedValue.toLowerCase();
      return displayName === normalizedValue || medicineName === normalizedValue;
    });

    if (savedMedicine) {
      return {
        name: savedMedicine.name,
        type: savedMedicine.type || '',
      };
    }

    return {
      name: trimmedValue,
      type: '',
    };
  }

  private markAppointmentCompleted(appointmentId?: string | null): void {
    if (!appointmentId) {
      return;
    }

    this.appointments = this.appointments.map((appointment) =>
      appointment._id === appointmentId
        ? {
          ...appointment,
          status: 'completed',
        }
        : appointment
    );
  }

  private buildPrintPreviewData(prescription: Prescription | null = null): PrintPreviewData | null {
    const source: Record<string, any> = prescription || this.prescriptionForm.getRawValue();
    const patient = this.resolvePrintPatient(source);

    if (!patient) {
      return null;
    }

    const doctorId = String(source['doctorId'] || '');
    const doctor = this.doctors.find((item) => item.userId === doctorId);
    const hospital = this.resolvePrintHospital(source);
    const settings = this.resolvePrescriptionSettings(hospital);
    const hospitalName = hospital?.name || 'MediLink City Care Hospital';
    const hospitalLogoUrl = this.safeHospitalLogoUrl(hospital?.logoUrl);
    const createdAt = source['createdAt'] || new Date();
    const followUpDate = source['followUpDate'];
    const vitals = this.safeStringRecord(source['vitals']);
    const labTests = this.safeArray(source['labTests'])
      .map((test) => this.normalizePrintLabTest(test))
      .filter((test): test is { name: string; category: string; selected?: boolean } =>
        Boolean(test?.name) && Boolean(prescription || test?.selected)
      )
      .slice(0, 80)
      .map((test) => ({
        name: test.name,
        category: test.category,
      }));
    const medicines = this.safeArray(source['medicines'])
      .map((medicine) => this.normalizePrintMedicine(medicine))
      .filter((medicine): medicine is Record<string, unknown> => Boolean(medicine))
      .slice(0, 80);

    return {
      patient,
      patientName: this.patientName(patient),
      patientAge: this.ageLabel(patient),
      patientGender: this.genderShort(patient),
      patientNo: patient.patientNo || '-',
      patientAddress: patient.address || '-',
      patientPhone: patient.phone || '-',
      doctorName: source['doctor']?.name || (doctor ? this.doctorName(doctor) : this.selectedDoctorName()),
      doctorQualification: doctor?.qualification || doctor?.specialization || 'M.B.B.S., F.C.P.S.',
      hospitalName,
      hospitalAddress: this.hospitalAddressLine(hospital),
      hospitalLogoUrl,
      showHospitalLogo: settings.showLogo !== false && Boolean(hospitalLogoUrl),
      prescriptionRevisionNote: settings.revisionNote || '* Rx to be revised after Reports.',
      prescriptionFollowUpLine:
        settings.followUpLine || `For appointment and follow up, contact ${hospitalName}.`,
      prescriptionFooterLines: this.prescriptionFooterLines(hospital, settings),
      date: this.formatPrintDate(createdAt),
      disease: source['diagnosis'] || source['chiefComplaint'] || source['history'] || '-',
      vitals,
      vitalRows: this.vitalEntries(vitals),
      labTests,
      medicines,
      followUpDate: followUpDate ? this.shortDate(followUpDate) : '-',
    };
  }

  private safeArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim() ? [value] : [];
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    const record = value as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(record, 'name')
      ? [record]
      : Object.values(record).filter((entry) => entry !== null && entry !== undefined);
  }

  private safeStringRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.entries(value as Record<string, unknown>).reduce((record, [key, entryValue]) => {
      const safeKey = String(key || '').trim();
      if (!safeKey) {
        return record;
      }

      record[safeKey] = String(entryValue ?? '').trim();
      return record;
    }, {} as Record<string, string>);
  }

  private normalizePrintLabTest(test: unknown): { name: string; category: string; selected?: boolean } | null {
    if (typeof test === 'string') {
      const name = test.trim();
      return name ? { name, category: '', selected: true } : null;
    }

    if (!test || typeof test !== 'object' || Array.isArray(test)) {
      return null;
    }

    const record = test as Record<string, unknown>;
    const name = String(record['name'] ?? '').trim();

    if (!name) {
      return null;
    }

    return {
      name,
      category: String(record['category'] ?? '').trim(),
      selected: record['selected'] === undefined ? true : this.toBoolean(record['selected']),
    };
  }

  private normalizePrintMedicine(medicine: unknown): Record<string, unknown> | null {
    if (typeof medicine === 'string') {
      const name = medicine.trim();
      return name ? { name } : null;
    }

    if (!medicine || typeof medicine !== 'object' || Array.isArray(medicine)) {
      return null;
    }

    return medicine as Record<string, unknown>;
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private safeHospitalLogoUrl(value: unknown): string {
    const logoUrl = String(value || '').trim();
    if (!logoUrl) {
      return '';
    }

    return logoUrl.startsWith('data:image/') && logoUrl.length > 1000000 ? '' : logoUrl;
  }

  vitalEntries(vitals: Record<string, string> | null | undefined): Array<{ label: string; value: string }> {
    const source = vitals || {};
    const orderedDefaultEntries = ['bp', 'weight', 'pulse', 'temperature', 'spo2']
      .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
      .map((key) => ({
        label: this.defaultVitalLabels[key] || key,
        value: String(source[key] || '').trim() || '-',
      }));

    const customEntries = Object.entries(source)
      .filter(([key]) => !this.defaultVitalKeys.has(key))
      .map(([key, value]) => ({
        label: this.formatVitalLabel(key),
        value: String(value || '').trim() || '-',
      }));

    return [...orderedDefaultEntries, ...customEntries];
  }

  private resolvePrintPatient(source: Record<string, any>): Patient | null {
    const patientId = String(source['patientId'] || '');
    const patient =
      this.patients.find((item) => item._id === patientId) ||
      source['patient'] ||
      this.selectedPatient() ||
      this.selectedAppointment()?.patient ||
      null;

    if (patient) {
      return patient as Patient;
    }

    if (!patientId) {
      return null;
    }

    return {
      _id: patientId,
      hospitalId: String(source['hospitalId'] || ''),
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

  private refreshCurrentHospital(): void {
    this.backend.getMe().subscribe({
      next: (user) => {
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as Record<string, unknown> | null;
        localStorage.setItem('user', JSON.stringify({ ...(storedUser || {}), ...user }));
        this.currentHospitalId = user.hospitalId || this.currentHospitalId;
        this.currentHospital = user.hospital || this.currentHospital;
        this.refreshOpenPreviewData();

        if (!this.currentHospital && this.currentHospitalId && this.backend.hasPermission('hospitals.read')) {
          this.loadCurrentHospitalById();
        }
      },
      error: () => {
        if (this.currentHospitalId && this.backend.hasPermission('hospitals.read')) {
          this.loadCurrentHospitalById();
        }
      },
    });
  }

  private loadCurrentHospitalById(): void {
    if (!this.currentHospitalId) {
      return;
    }

    this.backend.getHospital(this.currentHospitalId).subscribe({
      next: (hospital) => {
        this.currentHospital = hospital;
        this.updateStoredHospital(hospital);
        this.refreshOpenPreviewData();
      },
      error: () => undefined,
    });
  }

  private updateStoredHospital(hospital: Hospital): void {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as Record<string, unknown> | null;

    if (!storedUser) {
      return;
    }

    localStorage.setItem(
      'user',
      JSON.stringify({
        ...storedUser,
        hospitalId: hospital._id,
        hospital,
      }),
    );
  }

  private refreshOpenPreviewData(): void {
    if (!this.printPreviewOpen || !this.printPreviewData) {
      return;
    }

    try {
      this.printPreviewData =
        this.buildPrintPreviewData(this.previewPrescription) ||
        this.printPreviewData;
    } catch (error) {
      console.error('Unable to refresh prescription preview', error);
    }
  }

  private resolvePrintHospital(source: Record<string, any>): Hospital | null {
    return (source['hospital'] as Hospital | null) || this.currentHospital || null;
  }

  private resolvePrescriptionSettings(hospital: Hospital | null): PrescriptionPrintSettings {
    return {
      showLogo: hospital?.prescriptionSettings?.showLogo !== false,
      revisionNote: hospital?.prescriptionSettings?.revisionNote || '* Rx to be revised after Reports.',
      followUpLine: hospital?.prescriptionSettings?.followUpLine || '',
      contactLine: hospital?.prescriptionSettings?.contactLine || '',
      footerLines: hospital?.prescriptionSettings?.footerLines || [],
    };
  }

  private hospitalAddressLine(hospital: Hospital | null): string {
    return [hospital?.address, hospital?.city, hospital?.country].filter(Boolean).join(', ');
  }

  private prescriptionFooterLines(hospital: Hospital | null, settings: PrescriptionPrintSettings): string[] {
    const configuredLines = (settings.footerLines || []).filter((line) => Boolean(line?.trim()));

    if (configuredLines.length > 0) {
      return configuredLines;
    }

    const contactLine = settings.contactLine || this.defaultHospitalContactLine(hospital);
    return contactLine ? [contactLine] : [];
  }

  private defaultHospitalContactLine(hospital: Hospital | null): string {
    const parts = [
      hospital?.email ? `Email: ${hospital.email}` : '',
      hospital?.phone ? `Phone: ${hospital.phone}` : '',
    ].filter(Boolean);

    return parts.join(' | ') || 'Email: info@medilink.local | Phone: 0300-0000000';
  }

  private formatPrintDate(value: string | Date): string {
    const date = new Date(value);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

    return safeDate
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .replace(/ /g, '-')
      .toUpperCase();
  }

  private openPrescriptionPrintWindow(content: string): void {
    const iframe = document.createElement('iframe');
    const baseHref = document.baseURI || window.location.href;
    const styles = this.collectDocumentStyles();
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const printDocument = iframe.contentWindow?.document;
    const printWindow = iframe.contentWindow;

    if (!printDocument || !printWindow) {
      iframe.remove();
      this.toastr.error('Unable to open prescription print view.');
      return;
    }

    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${baseHref}" />
          <title>Prescription Print</title>
          ${styles}
          <style>
            body {
              background: #ffffff;
              margin: 0;
              padding: 0;
            }

            @page {
              margin: 0;
              size: A4;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printDocument.close();
    printWindow.onafterprint = () => iframe.remove();

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 15000);
    }, 300);
  }

  private collectDocumentStyles(): string {
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map((style) => style.outerHTML)
      .join('\n');
    const linkedStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((style) => style.outerHTML)
      .join('\n');

    return `${linkedStyles}\n${inlineStyles}`;
  }

  private buildVitalsPayload(
    vitals: Record<string, unknown>,
    customVitals: Array<Record<string, unknown>>
  ): Record<string, string> {
    const payload: Record<string, string> = {};

    Object.entries(vitals || {}).forEach(([key, value]) => {
      payload[key] = String(value || '').trim();
    });

    (customVitals || []).forEach((entry) => {
      const key = String(entry['key'] || '').trim();
      const value = String(entry['value'] || '').trim();
      if (!key) {
        return;
      }
      payload[key] = value;
    });

    return payload;
  }

  private extractDefaultVitals(vitals: Record<string, string>): Record<string, string> {
    return {
      bp: String(vitals['bp'] || ''),
      pulse: String(vitals['pulse'] || ''),
      weight: String(vitals['weight'] || ''),
      temperature: String(vitals['temperature'] || ''),
      spo2: String(vitals['spo2'] || ''),
    };
  }

  private extractCustomVitals(vitals: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(vitals || {})
      .filter(([key]) => !this.defaultVitalKeys.has(key))
      .map(([key, value]) => ({
        key,
        value: String(value || ''),
      }));
  }

  private formatVitalLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (letter) => letter.toUpperCase());
  }
}
