import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Data, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  Doctor,
  Patient,
  PatientHistory,
  RoomAllotment,
} from '../../../shared/models/hospital.model';

type RecordType = 'clinical' | 'laboratory' | 'ward';

@Component({
  selector: 'app-care-records',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './care-records.component.html',
  styleUrl: './care-records.component.scss',
})
export class CareRecordsComponent implements OnInit {
  recordType: RecordType = 'clinical';
  pageTitle = 'Clinical Records';
  pageSubtitle = 'Doctor notes, diagnosis, and patient follow-up records';

  records: PatientHistory[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  activeAllotments: RoomAllotment[] = [];
  recordForm: FormGroup;
  loading = false;
  saving = false;
  recordsPage = 1;
  limit = 10;
  totalPages = 0;
  editingId: string | null = null;
  selectedPatientId = '';
  currentHospitalId: string | null = null;
  currentUserId: string | null = null;
  currentRole = '';
  routePatientId = '';
  routeDoctorId = '';
  routeAppointmentId = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService,
    private dialog: AppDialogService
  ) {
    this.recordForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      appointmentId: [''],
      title: [''],
      diagnosis: [''],
      symptoms: [''],
      notes: [''],
      bloodPressure: [''],
      temperature: [''],
      pulse: [''],
      weight: [''],
      height: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { _id?: string; hospitalId?: string | null; role?: { name?: string | null } | null }
      | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.currentUserId = currentUser?._id || null;
    this.currentRole = String(localStorage.getItem('role') || currentUser?.role?.name || '');

    this.route.data.subscribe((data) => {
      this.applyRouteData(data);
      this.loadRecords();
      if (this.recordType === 'ward') {
        this.loadActiveAllotments();
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      this.routePatientId = params.get('patientId') || '';
      this.routeDoctorId = params.get('doctorId') || '';
      this.routeAppointmentId = params.get('appointmentId') || '';
      this.selectedPatientId = this.routePatientId;
      this.applyRouteDefaults();
      this.recordsPage = 1;
      this.loadRecords();
    });

    this.loadLookups();
  }

  get canCreate(): boolean {
    return this.backend.hasPermission('patients_history.create');
  }

  get canUpdate(): boolean {
    return this.backend.hasPermission('patients_history.update');
  }

  get canDelete(): boolean {
    return this.backend.hasPermission('patients_history.delete');
  }

  get canChooseDoctor(): boolean {
    return !this.isDoctorUser() || this.backend.hasPermission('*');
  }

  get titleLabel(): string {
    if (this.recordType === 'laboratory') {
      return 'Test / Report Title';
    }
    if (this.recordType === 'ward') {
      return 'Treatment / Drip Title';
    }
    return 'Record Title';
  }

  get diagnosisLabel(): string {
    if (this.recordType === 'laboratory') {
      return 'Result Summary';
    }
    if (this.recordType === 'ward') {
      return 'Ward Update';
    }
    return 'Diagnosis';
  }

  get symptomsLabel(): string {
    if (this.recordType === 'laboratory') {
      return 'Requested Test / Findings';
    }
    if (this.recordType === 'ward') {
      return 'Observation';
    }
    return 'Symptoms';
  }

  get notesLabel(): string {
    if (this.recordType === 'laboratory') {
      return 'Report Notes';
    }
    if (this.recordType === 'ward') {
      return 'Treatment Notes';
    }
    return 'Clinical Notes';
  }

  loadLookups(): void {
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.patients = result.items;
        this.ensureDoctorPatientScope();
      },
      error: () => (this.patients = []),
    });

    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
        this.applyRouteDefaults();
      },
      error: () => (this.doctors = []),
    });

    this.backend
      .getAppointments({
        limit: 100,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
      })
      .subscribe({
      next: (result) => (this.appointments = result.items),
      error: () => (this.appointments = []),
    });
  }

  loadRecords(): void {
    this.loading = true;
    this.backend
      .getPatientHistoryRecords({
        page: this.recordsPage,
        limit: this.limit,
        patientId: this.selectedPatientId || undefined,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
        recordType: this.recordType,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.records = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.records = [];
          this.toastr.error(err?.error?.message || 'Unable to load records.');
        },
      });
  }

  loadActiveAllotments(): void {
    this.backend.getRoomAllotments({ limit: 50, status: 'admitted' }).subscribe({
      next: (result) => {
        this.activeAllotments = result.items;
      },
      error: () => {
        this.activeAllotments = [];
      },
    });
  }

  submitRecord(): void {
    if (!this.canCreate && !this.editingId) {
      this.toastr.error('You do not have permission to create records.');
      return;
    }

    if (!this.canUpdate && this.editingId) {
      this.toastr.error('You do not have permission to update records.');
      return;
    }

    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      return;
    }

    const value = this.recordForm.getRawValue();
    const payload: Record<string, unknown> = {
      hospitalId: this.currentHospitalId || undefined,
      patientId: value.patientId,
      doctorId: value.doctorId,
      appointmentId: value.appointmentId || undefined,
      recordType: this.recordType,
      title: value.title || undefined,
      diagnosis: value.diagnosis || undefined,
      symptoms: value.symptoms || undefined,
      notes: value.notes || undefined,
      vitals: this.buildVitalsPayload(value),
    };

    this.saving = true;
    const request$ = this.editingId
      ? this.backend.updatePatientHistory(this.editingId, payload)
      : this.backend.createPatientHistory(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response.message || 'Record saved successfully.');
        this.resetForm();
        this.loadRecords();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to save record.');
      },
    });
  }

  editRecord(record: PatientHistory): void {
    if (!this.canUpdate) {
      return;
    }

    this.editingId = record._id;
    this.recordForm.patchValue({
      patientId: record.patientId,
      doctorId: record.doctorId,
      appointmentId: record.appointmentId || '',
      title: record.title || '',
      diagnosis: record.diagnosis || '',
      symptoms: record.symptoms || '',
      notes: record.notes || '',
      bloodPressure: record.vitals?.['bloodPressure'] || '',
      temperature: record.vitals?.['temperature'] || '',
      pulse: record.vitals?.['pulse'] || '',
      weight: record.vitals?.['weight'] || '',
      height: record.vitals?.['height'] || '',
    });
  }

  async deleteRecord(record: PatientHistory): Promise<void> {
    if (!this.canDelete) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Delete Record',
      message: 'Delete this record? This action cannot be undone.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.backend.deletePatientHistory(record._id).subscribe({
      next: (response) => {
        this.toastr.success(response.message || 'Record deleted successfully.');
        if (this.editingId === record._id) {
          this.resetForm();
        }
        this.loadRecords();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to delete record.');
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.recordForm.reset();
    this.applyRouteDefaults();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.recordsPage = nextPage;
    this.loadRecords();
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  doctorName(doctorId: string, doctor?: { name?: string | null } | null): string {
    if (doctor?.name) {
      return doctor.name;
    }

    const doctorProfile = this.doctors.find((item) => item.userId === doctorId);
    return doctorProfile?.user?.name || '-';
  }

  private applyRouteData(data: Data): void {
    this.recordType = (data['recordType'] as RecordType) || 'clinical';
    this.pageTitle = String(data['pageTitle'] || 'Clinical Records');
    this.pageSubtitle = String(
      data['pageSubtitle'] || 'Doctor notes, diagnosis, and patient follow-up records'
    );
  }

  private applyRouteDefaults(): void {
    const defaultDoctorId = this.isDoctorUser() ? this.currentUserId || '' : this.routeDoctorId;
    const nextValues: Record<string, string> = {
      patientId: this.routePatientId,
      doctorId: defaultDoctorId,
      appointmentId: this.routeAppointmentId,
    };

    if (!this.editingId) {
      this.recordForm.patchValue(nextValues, { emitEvent: false });
    }

    if (this.isDoctorUser() && !this.backend.hasPermission('*')) {
      this.recordForm.get('doctorId')?.disable({ emitEvent: false });
    } else {
      this.recordForm.get('doctorId')?.enable({ emitEvent: false });
    }
  }

  private ensureDoctorPatientScope(): void {
    if (!this.isDoctorUser()) {
      return;
    }

    const activePatientId = String(this.recordForm.get('patientId')?.value || '');
    const allowedPatientIds = new Set(this.patients.map((patient) => patient._id));

    if (activePatientId && !allowedPatientIds.has(activePatientId)) {
      this.selectedPatientId = '';
      this.routePatientId = '';
      this.recordForm.patchValue({ patientId: '', appointmentId: '' }, { emitEvent: false });
      this.toastr.warning('Doctors can manage records for assigned patients only.');
    }
  }

  private buildVitalsPayload(value: Record<string, string>): Record<string, string> | undefined {
    const vitals = {
      bloodPressure: value['bloodPressure'] || '',
      temperature: value['temperature'] || '',
      pulse: value['pulse'] || '',
      weight: value['weight'] || '',
      height: value['height'] || '',
    };

    return Object.values(vitals).some((entry) => entry) ? vitals : undefined;
  }

  private isDoctorUser(): boolean {
    return this.normalizeRole(this.currentRole) === 'doctor';
  }

  private normalizeRole(role: string): string {
    return role.trim().replace(/[\s_-]/g, '').toLowerCase();
  }
}
