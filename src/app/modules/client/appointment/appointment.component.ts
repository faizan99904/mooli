import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  Department,
  Doctor,
  Patient,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-appointment',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.scss',
})
export class AppointmentComponent implements OnInit {
  appointments: Appointment[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  departments: Department[] = [];
  appointmentForm: FormGroup;
  loading = false;
  saving = false;
  status = '';
  dateFrom = '';
  dateTo = '';
  page = 1;
  limit = 10;
  totalPages = 0;
  editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService
  ) {
    this.appointmentForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      departmentId: [''],
      appointmentDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      reason: [''],
      status: ['confirmed', Validators.required],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadAppointments();
  }

  loadLookups(): void {
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.patients = result.items),
      error: () => (this.patients = []),
    });
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.doctors = result.items),
      error: () => (this.doctors = []),
    });
    this.backend.getDepartments({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.departments = result.items),
      error: () => (this.departments = []),
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
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    const value = this.appointmentForm.value;
    if (value.startTime >= value.endTime) {
      this.toastr.error('Start time must be before end time');
      return;
    }

    const payload: Record<string, unknown> = {
      ...value,
      departmentId: value.departmentId || undefined,
    };

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
    this.appointmentForm.reset({ status: 'confirmed' });
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadAppointments();
  }
}
