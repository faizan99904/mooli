import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppDialogService } from '../../../../core/services/app-dialog.service';
import { BackendService } from '../../../../core/services/backend.service';
import { Doctor, Patient } from '../../../../shared/models/hospital.model';

type PatientDateGroup = {
  dateKey: string;
  dateLabel: string;
  items: Patient[];
};

@Component({
  selector: 'app-all-patients',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './all-patients.component.html',
  styleUrl: './all-patients.component.scss',
})
export class AllPatientsComponent implements OnInit {
  patients: Patient[] = [];
  patientGroups: PatientDateGroup[] = [];
  doctors: Doctor[] = [];
  loading = false;
  search = '';
  status = '';
  assignedDoctorId = '';
  dateFrom = '';
  dateTo = '';
  page = 1;
  limit = 10;
  totalPages = 0;
  private listRequestId = 0;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router,
    private dialog: AppDialogService
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadPatients();
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  get hasActiveFilters(): boolean {
    return Boolean(
      this.search.trim() || this.status || this.assignedDoctorId || this.dateFrom || this.dateTo
    );
  }

  loadLookups(): void {
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
      },
      error: () => {
        this.doctors = [];
      },
    });
  }

  loadPatients(): void {
    const requestId = ++this.listRequestId;
    this.loading = true;

    const params: Record<string, unknown> = {
      page: this.page,
      limit: this.limit,
      status: this.status || undefined,
      assignedDoctorId: this.assignedDoctorId || undefined,
    };

    const search = this.search.trim();
    if (search) {
      params['search'] = search;
    }

    if (this.dateFrom) {
      params['dateFrom'] = this.dateFrom;
    }

    if (this.dateTo) {
      params['dateTo'] = this.dateTo;
    }

    this.backend
      .getPatients(params)
      .pipe(
        finalize(() => {
          if (requestId === this.listRequestId) {
            this.loading = false;
          }
        })
      )
      .subscribe({
        next: (result) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.patients = result.items;
          this.totalPages = result.pagination.totalPages;
          this.rebuildPatientGroups();
        },
        error: (err) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.patients = [];
          this.patientGroups = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadPatients();
  }

  clearFilters(): void {
    this.search = '';
    this.status = '';
    this.assignedDoctorId = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.page = 1;
    this.loadPatients();
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  trackPatientGroup(_index: number, group: PatientDateGroup): string {
    return group.dateKey;
  }

  async deletePatient(id: string): Promise<void> {
    if (!this.can('patients.delete')) {
      this.toastr.error('You do not have permission to delete patients.');
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Delete Patient',
      message: 'Delete this patient? This action cannot be undone.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.backend.deletePatient(id).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.loadPatients();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  editPatient(patient: Patient): void {
    if (!this.can('patients.update')) {
      return;
    }

    this.router.navigate(['/patients/add-patient'], { state: { patient } });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPatients();
  }

  private rebuildPatientGroups(): void {
    const groups = new Map<string, Patient[]>();

    this.patients.forEach((patient) => {
      const dateKey = this.patientDateKey(patient);
      const bucket = groups.get(dateKey) || [];
      bucket.push(patient);
      groups.set(dateKey, bucket);
    });

    this.patientGroups = Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      dateLabel: this.formatDateLabel(dateKey),
      items,
    }));
  }

  private patientDateKey(patient: Patient): string {
    const createdAt = patient.createdAt ? new Date(patient.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return 'unknown';
    }

    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');
    const day = String(createdAt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateLabel(dateKey: string): string {
    if (dateKey === 'unknown') {
      return 'Unknown Date';
    }

    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateKey;
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
