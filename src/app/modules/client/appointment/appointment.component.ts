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
import { MooliOfflineService, MooliQueuedWork } from '../../../core/services/mooli-offline.service';
import {
  Appointment,
  Doctor,
  Patient,
} from '../../../shared/models/hospital.model';

interface AppointmentToken {
  appointmentNo: string;
  patientName: string;
  doctorName: string;
  departmentName: string;
  appointmentDate: string;
  timeRange: string;
  status: string;
  printedAt: string;
}

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
    readonly offline: MooliOfflineService,
    private toastr: ToastrService
  ) {
    this.appointmentForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      departmentId: [''],
      appointmentDate: [this.todayValue(), Validators.required],
      startTime: [''],
      endTime: [''],
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
    void this.syncOfflineWork(false);
  }

  loadLookups(): void {
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
        void this.offline.cacheValue(this.doctorsCacheKey(), this.doctors);
        this.patchDepartmentFromDoctor(this.appointmentForm.value.doctorId);
      },
      error: () => {
        void this.loadCachedDoctors();
      },
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
          void this.offline.cacheValue(this.appointmentsCacheKey(), {
            items: result.items,
            totalPages: result.pagination.totalPages,
          });
          void this.applyAppointmentList(result.items, result.pagination.totalPages);
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          void this.loadCachedAppointments(err);
        },
      });
  }

  applyAppointmentFilters(): void {
    this.page = 1;
    this.loadAppointments();
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
    if (value.startTime && value.endTime && value.startTime >= value.endTime) {
      this.toastr.error('Start time must be before end time');
      return;
    }

    const selectedDoctor = this.findDoctorByUserId(value.doctorId);
    const payload: Record<string, unknown> = {
      ...value,
      departmentId: selectedDoctor?.departmentId || value.departmentId || undefined,
    };
    this.removeEmptyTimeFields(payload);

    if (!this.editingId && this.currentHospitalId) {
      payload['hospitalId'] = this.currentHospitalId;
    }

    const isEditing = Boolean(this.editingId);
    const selectedPatient = this.selectedPatient;
    const selectedDoctorForToken = selectedDoctor;

    if (!this.offline.online() && !isEditing) {
      void this.queueAppointment(payload, selectedPatient, selectedDoctorForToken);
      return;
    }

    this.saving = true;
    const request$ = this.editingId
      ? this.backend.updateAppointment(this.editingId, payload)
      : this.backend.createAppointment(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        if (!isEditing && response.data) {
          const appointmentToken = this.buildAppointmentToken(
            response.data,
            selectedPatient,
            selectedDoctorForToken
          );
          this.printAppointmentToken(appointmentToken);
        }
        this.resetForm();
        this.loadAppointments();
      },
      error: (err) => {
        if (!isEditing && this.offline.shouldQueue(err)) {
          void this.queueAppointment(payload, selectedPatient, selectedDoctorForToken);
          return;
        }

        this.toastr.error(err?.error?.message || 'Something went wrong');
      },
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
          void this.offline.mergeCachedList(this.patientsCacheKey(), matchedPatients);
          this.phoneMatchedTotal = matchedPatients.length;
          this.phoneLookupPerformed = true;

          if (matchedPatients.length === 0) {
            this.toastr.info('No patient found against this phone number');
          }
        },
        error: (err) => {
          void this.loadCachedPatientsByPhone(normalizedPhone, err);
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

  appointmentStatusLabel(status: string): string {
    return status
      .split('_')
      .map((part) => this.titleCase(part))
      .join(' ');
  }

  appointmentTimeRange(appointment: Appointment): string {
    const start = this.formatClockTime(appointment.startTime);
    const end = this.formatClockTime(appointment.endTime);

    if (start === '-' && end === '-') {
      return 'No time set';
    }

    if (start === '-') {
      return end;
    }

    if (end === '-') {
      return start;
    }

    return `${start} - ${end}`;
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

  formatClockTime(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const [hourText, minuteText] = value.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return value;
    }

    const normalizedHour = hour % 12 || 12;
    const meridiem = hour >= 12 ? 'PM' : 'AM';
    return `${normalizedHour}:${String(minute).padStart(2, '0')} ${meridiem}`;
  }

  printAppointmentToken(token: AppointmentToken): void {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printWindow?.document;

    if (!printWindow || !printDocument) {
      printFrame.remove();
      this.toastr.error('Unable to open print window');
      return;
    }

    const tokenHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Appointment Token ${token.appointmentNo}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            * { box-sizing: border-box; }
            html, body { height: auto; width: 100%; }
            body {
              align-items: center;
              background: #fff;
              color: #111827;
              display: flex;
              font-family: Arial, sans-serif;
              justify-content: center;
              margin: 0;
              min-height: auto;
              padding: 0;
            }
            .token {
              background: #fff;
              border: 0;
              border-radius: 0;
              box-shadow: none;
              max-width: 78mm;
              padding: 20px 14px;
              text-align: center;
              width: 100%;
            }
            .eyebrow {
              color: #019C9D;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.14em;
              text-transform: uppercase;
            }
            h1 { font-size: 28px; line-height: 1; margin: 10px 0 8px; }
            p { margin: 0; }
            .sub {
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 16px;
            }
            .status-badge {
              background: #e8f7f7;
              border: 1px solid #b9e8e8;
              border-radius: 999px;
              color: #003E86;
              display: inline-block;
              font-size: 11px;
              font-weight: 800;
              margin-bottom: 18px;
              padding: 6px 10px;
            }
            .row {
              align-items: flex-start;
              display: flex;
              gap: 10px;
              justify-content: space-between;
              padding: 10px 0;
              border-top: 1px dashed #d1d5db;
              font-size: 12px;
              text-align: left;
            }
            .row:first-of-type { border-top: 0; }
            .label {
              color: #6b7280;
              font-weight: 700;
            }
            .value {
              font-weight: 800;
              max-width: 54%;
              text-align: right;
            }
            .footer {
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 11px;
              margin-top: 14px;
              padding-top: 10px;
            }
            @media print {
              @page { margin: 0; size: 80mm auto; }
              html, body {
                height: auto;
                width: 100%;
              }
              body {
                background: #fff;
                min-height: auto;
                padding: 0;
              }
              .token {
                max-width: none;
                padding: 14px 12px;
              }
              h1 { font-size: 26px; }
              .sub { font-size: 10px; margin-bottom: 14px; }
              .status-badge { font-size: 10px; margin-bottom: 16px; padding: 5px 9px; }
              .row { font-size: 11px; padding: 9px 0; }
              .footer { font-size: 10px; margin-top: 14px; padding-top: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="token">
            <div class="eyebrow">Appointment Token</div>
            <h1>${this.escapeHtml(token.appointmentNo)}</h1>
            <p class="sub">Keep this token for your visit</p>
            <div class="status-badge">${this.escapeHtml(token.status)}</div>
            ${this.printableTokenRow('Patient', token.patientName)}
            ${this.printableTokenRow('Doctor', token.doctorName)}
            ${this.printableTokenRow('Department', token.departmentName)}
            ${this.printableTokenRow('Date', token.appointmentDate)}
            ${this.printableTokenRow('Time', token.timeRange)}
            ${this.printableTokenRow('Printed At', token.printedAt)}
            <div class="footer">Please wait for your turn.</div>
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 150);
            };
            window.onafterprint = function () {
              setTimeout(function () {
                window.frameElement && window.frameElement.remove();
              }, 0);
            };
          </script>
        </body>
      </html>
    `;

    printDocument.open();
    printDocument.write(tokenHtml);
    printDocument.close();
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

    if (!this.offline.online()) {
      void this.queuePatientFromModal(payload);
      return;
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
          void this.offline.mergeCachedList(this.patientsCacheKey(), [patient]);
          this.patients = this.phoneMatchedPatients;
          this.phoneMatchedTotal = this.phoneMatchedPatients.length;
          this.selectPatient(patient);
        },
        error: (err) => {
          if (this.offline.shouldQueue(err)) {
            void this.queuePatientFromModal(payload);
            return;
          }

          this.toastr.error(err?.error?.message || 'Unable to add patient');
        },
      });
  }

  clearSelectedPatient(): void {
    this.selectedPatient = null;
    this.appointmentForm.patchValue({ patientId: '' });
  }

  async syncOfflineWork(showToast = true): Promise<void> {
    if (!this.offline.online()) {
      if (showToast) {
        this.toastr.info('Appointments will sync when internet is back.');
      }
      return;
    }

    const result = await this.offline.syncQueuedWork();
    if (result.syncedCount > 0) {
      this.loadLookups();
      this.loadAppointments();
      if (showToast) {
        this.toastr.success(`${result.syncedCount} offline item(s) synced.`);
      }
    } else if (showToast) {
      this.toastr.info('No offline appointments are waiting to sync.');
    }
  }

  private toArray(value: string): string[] {
    return value
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private async loadCachedDoctors(): Promise<void> {
    this.doctors = await this.offline.readCachedValue<Doctor[]>(this.doctorsCacheKey(), []);
    this.patchDepartmentFromDoctor(this.appointmentForm.value.doctorId);
  }

  private async loadCachedAppointments(error: unknown): Promise<void> {
    const cached = await this.offline.readCachedValue<{ items: Appointment[]; totalPages: number }>(
      this.appointmentsCacheKey(),
      { items: [], totalPages: 0 },
    );
    await this.applyAppointmentList(cached.items, cached.totalPages);
    if (!this.offline.shouldQueue(error) && cached.items.length === 0) {
      this.toastr.error((error as { error?: { message?: string } })?.error?.message || 'Something went wrong');
    }
  }

  private async applyAppointmentList(items: Appointment[], totalPages: number): Promise<void> {
    this.appointments = this.mergeAppointments([...(await this.localQueuedAppointments()), ...items])
      .filter((appointment) => this.appointmentMatchesFilters(appointment));
    this.totalPages = totalPages;
  }

  private async loadCachedPatientsByPhone(normalizedPhone: string, error: unknown): Promise<void> {
    const cachedPatients = await this.cachedPatientsWithLocal();
    const matchedPatients = cachedPatients.filter((patient) =>
      this.normalizePhone(patient.phone || '').includes(normalizedPhone),
    );

    this.phoneMatchedPatients = matchedPatients;
    this.patients = matchedPatients;
    this.phoneMatchedTotal = matchedPatients.length;
    this.phoneLookupPerformed = true;
    this.phoneLookupLoading = false;

    if (matchedPatients.length === 0 && !this.offline.shouldQueue(error)) {
      this.toastr.error((error as { error?: { message?: string } })?.error?.message || 'Unable to search patients');
    } else if (matchedPatients.length === 0) {
      this.toastr.info('No cached patient found. You can add a new patient offline.');
    }
  }

  private async cachedPatientsWithLocal(): Promise<Patient[]> {
    const cached = await this.offline.readCachedValue<Patient[]>(this.patientsCacheKey(), []);
    const localPatients = (await this.offline.getQueuedWork('patient'))
      .filter((entry) => entry.operation === 'create')
      .map((entry) => this.patientFromQueuedWork(entry));

    return this.mergePatients([...localPatients, ...cached]);
  }

  private async queuePatientFromModal(payload: Record<string, unknown>): Promise<void> {
    this.patientSaving = true;
    const localId = this.offline.buildLocalId('patient');
    const patient = this.buildLocalPatient(localId, payload);

    await this.offline.enqueueWork({
      id: localId,
      entity: 'patient',
      operation: 'create',
      localId,
      payload,
      meta: { patient },
    });
    await this.offline.mergeCachedList(this.patientsCacheKey(), [patient]);

    this.patientSaving = false;
    this.addPatientModalOpen = false;
    this.patientPhone = patient.phone || this.patientPhone;
    this.phoneLookupPerformed = true;
    this.phoneMatchedPatients = this.mergePatients([patient, ...this.phoneMatchedPatients]);
    this.patients = this.phoneMatchedPatients;
    this.phoneMatchedTotal = this.phoneMatchedPatients.length;
    this.selectPatient(patient);
    this.toastr.success('Patient saved offline and queued for sync.');
  }

  private async queueAppointment(
    payload: Record<string, unknown>,
    patient?: Patient | null,
    doctor?: Doctor,
  ): Promise<void> {
    this.saving = true;
    const localId = this.offline.buildLocalId('appointment');
    const appointment = this.buildLocalAppointment(localId, payload, patient, doctor);

    await this.offline.enqueueWork({
      id: localId,
      entity: 'appointment',
      operation: 'create',
      localId,
      payload,
      meta: { appointment, patient: patient || appointment.patient || null },
    });

    this.appointments = this.mergeAppointments([appointment, ...this.appointments]);
    this.saving = false;
    this.toastr.success('Appointment saved offline and queued for sync.');
    this.printAppointmentToken(this.buildAppointmentToken(appointment, patient, doctor));
    this.resetForm();
  }

  private buildLocalPatient(localId: string, payload: Record<string, unknown>): Patient {
    return {
      _id: localId,
      hospitalId: String(payload['hospitalId'] || this.currentHospitalId || ''),
      patientNo: `OFF-${localId.slice(-6).toUpperCase()}`,
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

  private buildLocalAppointment(
    localId: string,
    payload: Record<string, unknown>,
    patient?: Patient | null,
    doctor?: Doctor,
  ): Appointment {
    return {
      _id: localId,
      hospitalId: String(payload['hospitalId'] || this.currentHospitalId || ''),
      appointmentNo: `OFF-${localId.slice(-6).toUpperCase()}`,
      patientId: String(payload['patientId'] || patient?._id || ''),
      patient: patient || null,
      doctorId: String(payload['doctorId'] || ''),
      doctor: doctor?.user || null,
      departmentId: String(payload['departmentId'] || doctor?.departmentId || ''),
      department: doctor?.department || null,
      appointmentDate: String(payload['appointmentDate'] || this.todayValue()),
      startTime: String(payload['startTime'] || ''),
      endTime: String(payload['endTime'] || ''),
      reason: (payload['reason'] as string | undefined) || null,
      status: (payload['status'] as Appointment['status']) || 'confirmed',
      notes: (payload['notes'] as string | undefined) || 'Saved offline',
    };
  }

  private async localQueuedAppointments(): Promise<Appointment[]> {
    const entries = await this.offline.getQueuedWork('appointment');
    return entries
      .filter((entry) => entry.operation === 'create')
      .map((entry) => {
        const metaAppointment = entry.meta?.['appointment'] as Appointment | undefined;
        if (metaAppointment) {
          return metaAppointment;
        }

        return this.buildLocalAppointment(
          entry.localId || entry.id,
          entry.payload as Record<string, unknown>,
          entry.meta?.['patient'] as Patient | null,
          this.findDoctorByUserId(String((entry.payload as Record<string, unknown>)['doctorId'] || '')),
        );
      });
  }

  private patientFromQueuedWork(entry: MooliQueuedWork): Patient {
    const metaPatient = entry.meta?.['patient'] as Patient | undefined;
    if (metaPatient) {
      return metaPatient;
    }

    return this.buildLocalPatient(entry.localId || entry.id, entry.payload as Record<string, unknown>);
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
      `${second.appointmentDate} ${second.startTime}`.localeCompare(`${first.appointmentDate} ${first.startTime}`),
    );
  }

  private appointmentMatchesFilters(appointment: Appointment): boolean {
    if (this.status && appointment.status !== this.status) {
      return false;
    }

    const appointmentDate = appointment.appointmentDate.slice(0, 10);
    if (this.dateFrom && appointmentDate < this.dateFrom) {
      return false;
    }

    if (this.dateTo && appointmentDate > this.dateTo) {
      return false;
    }

    return true;
  }

  private doctorsCacheKey(): string {
    return this.offline.cacheKey('appointment-doctors');
  }

  private appointmentsCacheKey(): string {
    return this.offline.cacheKey(
      'appointments',
      this.page,
      this.limit,
      this.status || 'all',
      this.dateFrom || 'from',
      this.dateTo || 'to',
    );
  }

  private removeEmptyTimeFields(payload: Record<string, unknown>): void {
    if (!payload['startTime']) {
      delete payload['startTime'];
    }

    if (!payload['endTime']) {
      delete payload['endTime'];
    }
  }

  private patientsCacheKey(): string {
    return this.offline.cacheKey('patients');
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

  private buildAppointmentToken(
    appointment: Appointment,
    patient?: Patient | null,
    doctorRecord?: Doctor
  ): AppointmentToken {
    const resolvedPatient = appointment.patient || patient || null;
    const resolvedDoctorName = appointment.doctor?.name || doctorRecord?.user?.name || doctorRecord?.specialization || '-';
    const resolvedDepartment =
      appointment.department?.name || doctorRecord?.department?.name || 'General';

    return {
      appointmentNo: appointment.appointmentNo,
      patientName: this.patientName(resolvedPatient),
      doctorName: resolvedDoctorName,
      departmentName: resolvedDepartment,
      appointmentDate: this.shortDate(appointment.appointmentDate),
      timeRange: this.appointmentTimeRange(appointment),
      status: this.appointmentStatusLabel(appointment.status),
      printedAt: `${this.shortDate(new Date())} ${this.formatClockTime(this.formatTime(new Date()))}`,
    };
  }

  private printableTokenRow(label: string, value: string): string {
    return `
      <div class="row">
        <span class="label">${this.escapeHtml(label)}</span>
        <span class="value">${this.escapeHtml(value || '-')}</span>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
