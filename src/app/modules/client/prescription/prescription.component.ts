import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  Doctor,
  DoctorMedicine,
  Patient,
  Prescription,
} from '../../../shared/models/hospital.model';

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
  date: string;
  disease: string;
  vitals: Record<string, string>;
  labTests: Array<{ name: string; category: string }>;
  medicines: Array<Record<string, unknown>>;
  followUpDate: string;
}

@Component({
  selector: 'app-prescription',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prescription.component.html',
  styleUrl: './prescription.component.scss',
})
export class PrescriptionComponent implements OnInit {
  @ViewChild('printContent', { static: false }) printContent!: ElementRef;

  prescriptions: Prescription[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  doctorMedicines: DoctorMedicine[] = [];
  prescriptionForm: FormGroup;
  doctorMedicineForm: FormGroup;
  loading = false;
  saving = false;
  page = 1;
  limit = 100;
  totalPages = 0;
  selectedPatientId = '';
  selectedAppointmentId = '';
  editingId: string | null = null;
  currentHospitalId: string | null = null;
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
  medicineLibraryOpen = false;
  medicineLibraryLoading = false;
  savingDoctorMedicine = false;
  selectedMedicineRowIndex: number | null = null;
  today = new Date();
  readonly durationOptions = [
    '1 Day',
    '3 Days',
    '5 Days',
    '7 Days',
    '10 Days',
    '14 Days',
    '1 Month',
    '2 Months',
    '3 Months',
    'Continue',
  ];
  readonly medicineTypeOptions = [
    'Tablet',
    'Syrup',
    'Capsule',
    'Injection',
    'Drops',
    'Cream',
    'Ointment',
    'Sachet',
    'Inhaler',
    'Other',
  ];

  readonly labTestCatalog = [
    { name: 'CBC', category: 'Hematology' },
    { name: 'ESR', category: 'Hematology' },
    { name: 'CRP', category: 'Serology' },
    { name: 'Blood Sugar Fasting', category: 'Biochemistry' },
    { name: 'Chest X-Ray', category: 'Radiology' },
    { name: 'Sputum Culture', category: 'Microbiology' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {
    this.prescriptionForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      appointmentId: [''],
      chiefComplaint: [''],
      history: [''],
      examination: [''],
      diagnosis: [''],
      medicines: this.fb.array([this.createMedicineGroup()]),
      labTests: this.fb.array(this.labTestCatalog.map((test) => this.createLabTestGroup(test))),
      customLabTest: [''],
      ivFluids: this.fb.array([this.createIvFluidGroup('DNS', '80 ml/hr', '500 ml')]),
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
      advice: [''],
      followUpDate: [''],
    });
    this.doctorMedicineForm = this.fb.group({
      name: ['', Validators.required],
      type: ['Tablet', Validators.required],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { _id?: string; hospitalId?: string | null; role?: { name?: string | null } | null }
      | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.currentUserId = currentUser?._id || null;
    this.currentRole = String(localStorage.getItem('role') || currentUser?.role?.name || '');

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

  createMedicineGroup(medicine?: Record<string, unknown>): FormGroup {
    return this.fb.group({
      name: [medicine?.['name'] || '', Validators.required],
      dosage: [medicine?.['dosage'] || ''],
      frequency: [medicine?.['frequency'] || ''],
      duration: [medicine?.['duration'] || '1 Month'],
      afterMeal: [Boolean(medicine?.['afterMeal'])],
      beforeMeal: [Boolean(medicine?.['beforeMeal'])],
      morning: [Boolean(medicine?.['morning'])],
      noon: [Boolean(medicine?.['noon'])],
      evening: [Boolean(medicine?.['evening'])],
      night: [Boolean(medicine?.['night'])],
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
      name: [name, Validators.required],
      rate: [rate],
      duration: [duration],
    });
  }

  addMedicine(): void {
    this.medicines.push(this.createMedicineGroup());
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
    if (this.medicines.length > 1) {
      this.medicines.removeAt(index);
      return;
    }

    this.medicines.at(index).reset({ duration: '1 Month' });
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
      },
      error: () => (this.patients = []),
    });

    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.doctors = result.items),
      error: () => (this.doctors = []),
    });

    this.backend
      .getAppointments({
        limit: 100,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
      })
      .subscribe({
        next: (result) => {
          this.appointments = result.items;
          this.selectInitialAppointment();
        },
        error: () => (this.appointments = []),
      });
  }

  loadDoctorMedicines(search = ''): void {
    const doctorId = this.activeDoctorId();
    if (!doctorId) {
      this.doctorMedicines = [];
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
        next: (items) => (this.doctorMedicines = items),
        error: () => (this.doctorMedicines = []),
      });
  }

  onMedicineNameInput(index: number): void {
    const query = String(this.medicines.at(index).get('name')?.value || '').trim();
    if (!query) {
      return;
    }

    this.loadDoctorMedicines(query);
  }

  medicineSuggestions(index: number): DoctorMedicine[] {
    const query = String(this.medicines.at(index).get('name')?.value || '')
      .trim()
      .toLowerCase();

    if (!query) {
      return [];
    }

    return this.doctorMedicines
      .filter((medicine) => medicine.name.toLowerCase().startsWith(query))
      .slice(0, 8);
  }

  applyMedicineSuggestion(index: number): void {
    const query = String(this.medicines.at(index).get('name')?.value || '')
      .trim()
      .toLowerCase();
    const medicine = this.doctorMedicines.find(
      (item) =>
        item.name.trim().toLowerCase() === query ||
        this.doctorMedicineDisplayName(item).toLowerCase() === query
    );

    if (medicine) {
      this.useDoctorMedicine(medicine, index);
    }
  }

  doctorMedicineDisplayName(medicine: Pick<DoctorMedicine, 'name' | 'type'>): string {
    const type = String(medicine.type || '').trim();
    const name = String(medicine.name || '').trim();

    return [type, name].filter(Boolean).join(' ');
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
          this.prescriptions = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.prescriptions = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  submitPrescription(printAfterSave = false): void {
    if (this.prescriptionForm.invalid) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    const value = this.prescriptionForm.getRawValue();

    if (this.isDoctorUser() && !value.appointmentId) {
      this.toastr.error('Select an assigned appointment before creating prescription');
      return;
    }

    const medicines = value.medicines.filter((medicine: Record<string, unknown>) =>
      String(medicine['name'] || '').trim()
    );

    if (medicines.length === 0) {
      this.toastr.error('Add at least one medicine');
      return;
    }

    const payload: Record<string, unknown> = {
      patientId: value.patientId,
      doctorId: value.doctorId,
      appointmentId: value.appointmentId || undefined,
      chiefComplaint: value.chiefComplaint || undefined,
      history: value.history || undefined,
      examination: value.examination || undefined,
      diagnosis: value.diagnosis || undefined,
      medicines,
      labTests: value.labTests.filter((test: Record<string, unknown>) => test['selected'] && test['name']),
      ivFluids: value.ivFluids.filter((fluid: Record<string, unknown>) => String(fluid['name'] || '').trim()),
      admissionOrders: value.admissionOrders,
      vitals: value.vitals,
      advice: value.advice || undefined,
      followUpDate: value.followUpDate || undefined,
    };

    if (!this.editingId) {
      payload['hospitalId'] = this.currentHospitalId || undefined;
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
      error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
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
  }

  editPrescription(prescription: Prescription): void {
    this.editingId = prescription._id;
    this.selectedPatientId = prescription.patientId;
    this.selectedAppointmentId = prescription.appointmentId || '';
    this.prescriptionForm.patchValue({
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      appointmentId: prescription.appointmentId || '',
      chiefComplaint: prescription.chiefComplaint || '',
      history: prescription.history || '',
      examination: prescription.examination || '',
      diagnosis: prescription.diagnosis || '',
      advice: prescription.advice || '',
      followUpDate: prescription.followUpDate ? String(prescription.followUpDate).slice(0, 10) : '',
      vitals: prescription.vitals || {},
      admissionOrders: prescription.admissionOrders || {},
    });

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
  }

  resetForm(): void {
    this.editingId = null;
    this.prescriptionForm.reset({
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
    this.medicines.clear();
    this.addMedicine();
    this.labTests.clear();
    this.labTestCatalog.forEach((test) => this.labTests.push(this.createLabTestGroup(test)));
    this.ivFluids.clear();
    this.ivFluids.push(this.createIvFluidGroup('DNS', '80 ml/hr', '500 ml'));
    this.applyRouteDefaults();
    this.selectInitialAppointment();
    this.loadDoctorMedicines();
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
    this.previewPrescription = prescription;
    this.printPreviewData = this.buildPrintPreviewData(prescription);
    this.printPreviewOpen = true;

    if (!prescription?._id) {
      return;
    }

    this.printPreviewLoading = true;
    this.backend
      .getPrescription(prescription._id)
      .pipe(finalize(() => (this.printPreviewLoading = false)))
      .subscribe({
        next: (result) => {
          this.previewPrescription = result;
          this.printPreviewData = this.buildPrintPreviewData(result);
        },
        error: (err) => {
          this.printPreviewLoading = false;
          this.toastr.error(err?.error?.message || 'Unable to load prescription preview');
        },
      });
  }

  closePrintPreview(): void {
    this.printPreviewOpen = false;
    this.printPreviewLoading = false;
    this.previewPrescription = null;
    this.printPreviewData = null;
  }

  printPrescription(): void {
    if (!this.printContent?.nativeElement) {
      return;
    }

    html2canvas(this.printContent.nativeElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      (pdf as any).autoPrint?.();
      const printUrl = pdf.output('bloburl');
      window.open(printUrl, '_blank');
    });
  }

  visibleAppointments(): Appointment[] {
    const query = this.patientSearch.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const items = this.appointments.filter((appointment) => appointment.appointmentDate.slice(0, 10) === today);
    const source = items.length ? items : this.appointments;

    if (!query) {
      return source.slice(0, 8);
    }

    return source
      .filter((appointment) => `${this.patientName(appointment.patient)} ${appointment.appointmentNo}`.toLowerCase().includes(query))
      .slice(0, 8);
  }

  deletePrescription(id: string): void {
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

    this.medicines.at(targetIndex).patchValue({
      name: this.doctorMedicineDisplayName(medicine),
    });
  }

  private parseMedicineTypeAndName(value: string): { name: string; type: string } {
    const trimmedValue = value.trim();
    const matchedType = this.medicineTypeOptions.find((type) =>
      trimmedValue.toLowerCase().startsWith(`${type.toLowerCase()} `)
    );
    const aliasMap: Record<string, string> = {
      tab: 'Tablet',
      tablet: 'Tablet',
      cap: 'Capsule',
      capsule: 'Capsule',
      inj: 'Injection',
      injection: 'Injection',
      syp: 'Syrup',
      syr: 'Syrup',
      syrup: 'Syrup',
      drop: 'Drops',
      drops: 'Drops',
    };
    const firstWord = trimmedValue.split(/\s+/)[0]?.toLowerCase().replace(/\.$/, '');

    if (!matchedType) {
      if (firstWord && aliasMap[firstWord]) {
        return {
          name: trimmedValue.slice(firstWord.length).trim(),
          type: aliasMap[firstWord],
        };
      }

      return {
        name: trimmedValue,
        type: 'Tablet',
      };
    }

    return {
      name: trimmedValue.slice(matchedType.length).trim(),
      type: matchedType,
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
    const createdAt = source['createdAt'] || new Date();
    const followUpDate = source['followUpDate'];
    const labTests = (source['labTests'] || [])
      .filter((test: { selected?: boolean; name?: string }) => Boolean(test.name) && (prescription || test.selected))
      .map((test: { name: string; category?: string }) => ({
        name: test.name,
        category: test.category || '',
      }));

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
      date: this.formatPrintDate(createdAt),
      disease: source['diagnosis'] || source['chiefComplaint'] || source['history'] || '-',
      vitals: source['vitals'] || {},
      labTests,
      medicines: source['medicines'] || [],
      followUpDate: followUpDate ? this.shortDate(followUpDate) : '-',
    };
  }

  private resolvePrintPatient(source: Record<string, any>): Patient | null {
    const patientId = String(source['patientId'] || '');
    const patient =
      this.patients.find((item) => item._id === patientId) ||
      source['patient'] ||
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
}
