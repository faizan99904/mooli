import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  Doctor,
  Patient,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-appointment',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.scss',
})
export class AppointmentComponent implements OnInit {
  appointments: Appointment[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  appointmentForm: FormGroup;
  patientForm: FormGroup;
  loading = false;
  saving = false;
  patientSaving = false;
  status = '';
  dateFrom = '';
  dateTo = '';
  page = 1;
  limit = 10;
  totalPages = 0;
  editingId: string | null = null;
  currentHospitalId: string | null = null;
  patientPhone = '';
  phoneLookupLoading = false;
  phoneLookupPerformed = false;
  phoneMatchedPatients: Patient[] = [];
  phoneMatchedTotal = 0;
  selectedPatient: Patient | null = null;
  addPatientModalOpen = false;
  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  visitType = 'Consultation';

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService
  ) {
    this.appointmentForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      departmentId: [''],
      appointmentDate: [this.todayValue(), Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      reason: [''],
      status: ['confirmed', Validators.required],
      notes: [''],
    });

    this.patientForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      gender: ['male', Validators.required],
      dateOfBirth: [''],
      bloodGroup: [''],
      address: [''],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      allergies: [''],
      chronicDiseases: [''],
      currentMedications: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as { hospitalId?: string | null } | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.loadLookups();
    this.loadAppointments();
  }

  loadLookups(): void {
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
        this.patchDepartmentFromDoctor(this.appointmentForm.value.doctorId);
      },
      error: () => (this.doctors = []),
    });
  }

  loadAppointments(): void {
    this.loading = true;
    this.backend
      .getAppointments({
        page: this.page,
        limit: this.limit,
        status: this.status,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.appointments = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.appointments = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  submitAppointment(): void {
    if (!this.appointmentForm.value.patientId) {
      this.appointmentForm.get('patientId')?.markAsTouched();
      this.toastr.error('Search phone number and select a patient first');
      return;
    }

    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    const value = this.appointmentForm.value;
    if (value.startTime >= value.endTime) {
      this.toastr.error('Start time must be before end time');
      return;
    }

    const selectedDoctor = this.findDoctorByUserId(value.doctorId);
    const payload: Record<string, unknown> = {
      ...value,
      departmentId: selectedDoctor?.departmentId || value.departmentId || undefined,
    };

    if (!this.editingId && this.currentHospitalId) {
      payload['hospitalId'] = this.currentHospitalId;
    }

    this.saving = true;
    const request$ = this.editingId
      ? this.backend.updateAppointment(this.editingId, payload)
      : this.backend.createAppointment(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.resetForm();
        this.loadAppointments();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  editAppointment(appointment: Appointment): void {
    this.editingId = appointment._id;
    this.selectedPatient = appointment.patient || null;
    this.patientPhone = appointment.patient?.phone || '';
    this.phoneMatchedPatients = appointment.patient ? [appointment.patient] : [];
    this.patients = this.phoneMatchedPatients;
    this.phoneMatchedTotal = this.phoneMatchedPatients.length;
    this.phoneLookupPerformed = Boolean(appointment.patient);
    this.appointmentForm.patchValue({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      departmentId: appointment.departmentId || '',
      appointmentDate: appointment.appointmentDate.slice(0, 10),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      reason: appointment.reason || '',
      status: appointment.status,
      notes: appointment.notes || '',
    });
  }

  updateStatus(appointment: Appointment, status: string): void {
    this.backend
      .updateAppointmentStatus(appointment._id, { status, notes: appointment.notes || '' })
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.loadAppointments();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
      });
  }

  deleteAppointment(id: string): void {
    if (!confirm('Delete this appointment?')) {
      return;
    }

    this.backend.deleteAppointment(id).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.loadAppointments();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.appointmentForm.reset({
      appointmentDate: this.todayValue(),
      status: 'confirmed',
    });
    this.patientPhone = '';
    this.phoneLookupLoading = false;
    this.phoneLookupPerformed = false;
    this.phoneMatchedPatients = [];
    this.phoneMatchedTotal = 0;
    this.selectedPatient = null;
    this.patients = [];
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  get totalAppointmentsToday(): number {
    const today = this.dateOnly(new Date());
    return this.appointments.filter(
      (appointment) => this.dateOnly(appointment.appointmentDate) === today
    ).length;
  }

  get pendingCheckIns(): number {
    return this.appointments.filter((appointment) => appointment.status === 'pending').length;
  }

  get availableDoctors(): number {
    return this.doctors.length;
  }

  get walkIns(): number {
    return this.appointments.filter((appointment) =>
      `${appointment.reason || ''} ${appointment.notes || ''}`.toLowerCase().includes('walk')
    ).length;
  }

  get appointmentRangeLabel(): string {
    const start = this.dateFrom || this.appointmentForm.value.appointmentDate || new Date();
    const end = this.dateTo || start;
    return `${this.shortDate(start)} - ${this.shortDate(end)}`;
  }

  get timeSlots(): string[] {
    const firstSlot = this.nextAvailableHalfHour(new Date());

    return Array.from({ length: 7 }, (_, index) => {
      const slotDate = new Date(firstSlot);
      slotDate.setMinutes(firstSlot.getMinutes() + index * 30);

      return this.formatTime(slotDate);
    });
  }

  canSearchPatientPhone(): boolean {
    return this.normalizePhone(this.patientPhone).length >= 4 && !this.phoneLookupLoading;
  }

  lookupPatientsByPhone(): void {
    const phone = this.patientPhone.trim();
    const normalizedPhone = this.normalizePhone(phone);

    if (normalizedPhone.length < 4) {
      this.toastr.error('Enter at least 4 digits of phone number');
      return;
    }

    this.phoneLookupLoading = true;
    this.phoneLookupPerformed = false;
    this.phoneMatchedPatients = [];
    this.phoneMatchedTotal = 0;
    this.selectedPatient = null;
    this.patients = [];
    this.appointmentForm.patchValue({ patientId: '' });

    this.backend
      .getPatients({ limit: 100, status: 'active', search: phone })
      .pipe(finalize(() => (this.phoneLookupLoading = false)))
      .subscribe({
        next: (result) => {
          const matchedPatients = (result.items || []).filter((patient) =>
            this.normalizePhone(patient.phone || '').includes(normalizedPhone)
          );

          this.phoneMatchedPatients = matchedPatients;
          this.patients = matchedPatients;
          this.phoneMatchedTotal = matchedPatients.length;
          this.phoneLookupPerformed = true;

          if (matchedPatients.length === 0) {
            this.toastr.info('No patient found against this phone number');
          }
        },
        error: (err) => {
          this.phoneLookupPerformed = true;
          this.toastr.error(err?.error?.message || 'Unable to search patients');
        },
      });
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.appointmentForm.patchValue({ patientId: patient._id });

    if (patient.phone) {
      this.patientPhone = patient.phone;
    }

    if (patient.assignedDoctorId) {
      this.appointmentForm.patchValue({ doctorId: patient.assignedDoctorId });
      this.patchDepartmentFromDoctor(patient.assignedDoctorId);
    }
  }

  onDoctorChange(): void {
    this.patchDepartmentFromDoctor(this.appointmentForm.value.doctorId);
  }

  doctorOptionLabel(doctor: Doctor): string {
    const doctorName = doctor.user?.name || doctor.specialization || 'Doctor';
    const departmentName = doctor.department?.name || '';

    return departmentName ? `${doctorName} - ${departmentName}` : doctorName;
  }

  selectTimeSlot(slot: string): void {
    this.appointmentForm.patchValue({
      startTime: slot,
      endTime: this.nextHalfHour(slot),
    });
  }

  isSelectedTimeSlot(slot: string): boolean {
    return this.appointmentForm.value.startTime === slot;
  }

  patientMeta(patient?: Patient | null): string {
    if (!patient) {
      return '-';
    }

    const parts = [patient.gender ? this.titleCase(patient.gender) : null];
    const age = this.ageLabel(patient.dateOfBirth || null);

    if (age) {
      parts.push(age);
    }

    return parts.filter(Boolean).join(' - ');
  }

  appointmentStatusClass(status: string): string {
    return `status-${status.replace(/_/g, '-')}`;
  }

  initials(value?: string | null): string {
    const words = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) {
      return 'NA';
    }

    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  shortDate(value: string | Date): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  openAddPatientModal(): void {
    this.patientForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: this.patientPhone || '',
      gender: 'male',
      dateOfBirth: '',
      bloodGroup: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      allergies: '',
      chronicDiseases: '',
      currentMedications: '',
    });
    this.addPatientModalOpen = true;
  }

  closeAddPatientModal(): void {
    if (this.patientSaving) {
      return;
    }

    this.addPatientModalOpen = false;
  }

  submitPatientFromModal(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    const value = this.patientForm.value;
    const payload: Record<string, unknown> = {
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email || undefined,
      phone: value.phone || undefined,
      gender: value.gender,
      dateOfBirth: value.dateOfBirth || undefined,
      bloodGroup: value.bloodGroup || undefined,
      address: value.address || undefined,
      emergencyContactName: value.emergencyContactName || undefined,
      emergencyContactPhone: value.emergencyContactPhone || undefined,
      allergies: this.toArray(value.allergies),
      chronicDiseases: this.toArray(value.chronicDiseases),
      currentMedications: this.toArray(value.currentMedications),
    };

    if (this.currentHospitalId) {
      payload['hospitalId'] = this.currentHospitalId;
    }

    this.patientSaving = true;
    this.backend
      .createPatient(payload)
      .pipe(finalize(() => (this.patientSaving = false)))
      .subscribe({
        next: (response) => {
          const patient = response.data;
          this.toastr.success(response.message);
          this.addPatientModalOpen = false;
          this.patientPhone = patient.phone || this.patientPhone;
          this.phoneLookupPerformed = true;
          this.phoneMatchedPatients = [patient, ...this.phoneMatchedPatients];
          this.patients = this.phoneMatchedPatients;
          this.phoneMatchedTotal = this.phoneMatchedPatients.length;
          this.selectPatient(patient);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to add patient'),
      });
  }

  clearSelectedPatient(): void {
    this.selectedPatient = null;
    this.appointmentForm.patchValue({ patientId: '' });
  }

  private toArray(value: string): string[] {
    return value
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }

  private nextHalfHour(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hour || 0, minute || 0, 0, 0);
    date.setMinutes(date.getMinutes() + 30);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private nextAvailableHalfHour(date: Date): Date {
    const nextSlot = new Date(date);
    nextSlot.setSeconds(0, 0);

    const minutes = nextSlot.getMinutes();
    if (minutes < 30) {
      nextSlot.setMinutes(30);
    } else {
      nextSlot.setHours(nextSlot.getHours() + 1, 0);
    }

    return nextSlot;
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private dateOnly(value: string | Date): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  private ageLabel(dateOfBirth: string | null): string {
    if (!dateOfBirth) {
      return '';
    }

    const birthDate = new Date(dateOfBirth);

    if (Number.isNaN(birthDate.getTime())) {
      return '';
    }

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
      years -= 1;
    }

    return `${Math.max(years, 0)} Yrs`;
  }

  private titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private todayValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private findDoctorByUserId(userId?: string | null): Doctor | undefined {
    return this.doctors.find((doctor) => doctor.userId === userId);
  }

  private patchDepartmentFromDoctor(userId?: string | null): void {
    const departmentId = this.findDoctorByUserId(userId)?.departmentId || '';
    this.appointmentForm.patchValue({ departmentId });
  }

  canOpenClinicalRecords(): boolean {
    return this.backend.hasPermission('patients_history.read');
  }

  canOpenPrescriptions(): boolean {
    return this.backend.hasPermission('prescriptions.read') || this.backend.hasPermission('prescriptions.create');
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadAppointments();
  }
}
