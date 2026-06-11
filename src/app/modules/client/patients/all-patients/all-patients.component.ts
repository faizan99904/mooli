import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Doctor, Patient } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-all-patients',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './all-patients.component.html',
  styleUrl: './all-patients.component.scss',
})
export class AllPatientsComponent implements OnInit {
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  loading = false;
  search = '';
  status = '';
  assignedDoctorId = '';
  page = 1;
  limit = 10;
  totalPages = 0;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadPatients();
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
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
    this.loading = true;
    this.backend
      .getPatients({
        page: this.page,
        limit: this.limit,
        search: this.search,
        status: this.status,
        assignedDoctorId: this.assignedDoctorId,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.patients = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.patients = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  deletePatient(id: string): void {
    if (!this.can('patients.delete')) {
      this.toastr.error('You do not have permission to delete patients.');
      return;
    }

    if (!confirm('Delete this patient?')) {
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
}
