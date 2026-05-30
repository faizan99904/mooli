import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Department, Doctor } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-all-doctors',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './all-doctors.component.html',
  styleUrl: './all-doctors.component.scss',
})
export class AllDoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  departments: Department[] = [];
  loading = false;
  search = '';
  status = '';
  departmentId = '';
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
    this.loadDoctors();
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  loadLookups(): void {
    this.backend.getDepartments({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.departments = result.items;
      },
      error: () => {
        this.departments = [];
      },
    });
  }

  loadDoctors(): void {
    this.loading = true;
    this.backend
      .getDoctors({
        page: this.page,
        limit: this.limit,
        search: this.search,
        status: this.status,
        departmentId: this.departmentId,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.doctors = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.doctors = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  deleteDoctor(id: string): void {
    if (!confirm('Delete this doctor?')) {
      return;
    }

    this.backend.deleteDoctor(id).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.loadDoctors();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  editDoctor(doctor: Doctor): void {
    this.router.navigate(['/add-doctors'], { state: { doctor } });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadDoctors();
  }
}
