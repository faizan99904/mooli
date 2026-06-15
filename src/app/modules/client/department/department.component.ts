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
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import { Department, Hospital, User } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-department',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './department.component.html',
  styleUrl: './department.component.scss',
})
export class DepartmentComponent implements OnInit {
  departments: Department[] = [];
  departmentForm: FormGroup;
  hospitals: Hospital[] = [];
  currentUser: User | null = null;
  currentHospitalId: string | null = null;
  canSelectHospital = false;
  loading = false;
  saving = false;
  search = '';
  status = '';
  page = 1;
  limit = 10;
  totalPages = 0;
  editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private dialog: AppDialogService
  ) {
    this.departmentForm = this.fb.group({
      hospitalId: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.setLoggedInUser();
    this.loadInitialData();
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  loadDepartments(): void {
    this.loading = true;
    this.backend
      .getDepartments({
        page: this.page,
        limit: this.limit,
        search: this.search,
        status: this.status,
        hospitalId: this.departmentForm.value.hospitalId || this.currentHospitalId,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.departments = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.departments = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  submitDepartment(): void {
    if (!this.editingId && !this.can('departments.create')) {
      this.toastr.error('You do not have permission to create departments.');
      return;
    }

    if (this.editingId && !this.can('departments.update')) {
      this.toastr.error('You do not have permission to update departments.');
      return;
    }

    if (this.departmentForm.invalid) {
      this.departmentForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const value = this.departmentForm.value;

    const payload: Partial<Department> = {
      hospitalId: value.hospitalId || this.currentHospitalId || '',
      name: value.name,
      description: value.description || '',
      status: value.status,
    };

    const request$ = this.editingId
      ? this.backend.updateDepartment(this.editingId, payload)
      : this.backend.createDepartment(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.resetForm();
        this.loadDepartments();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  editDepartment(department: Department): void {
    if (!this.can('departments.update')) {
      return;
    }

    this.editingId = department._id;
    this.departmentForm.patchValue({
      hospitalId: department.hospitalId || this.currentHospitalId || '',
      name: department.name,
      description: department.description || '',
      status: department.status,
    });
  }

  async deleteDepartment(id: string): Promise<void> {
    if (!this.can('departments.delete')) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Delete Department',
      message: 'Delete this department? This action cannot be undone.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.backend.deleteDepartment(id).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.loadDepartments();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.departmentForm.reset({
      hospitalId: this.currentHospitalId || this.departmentForm.value.hospitalId || '',
      name: '',
      description: '',
      status: 'active',
    });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadDepartments();
  }

  setLoggedInUser(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;

    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];

    this.canSelectHospital = permissions.includes('*');

    this.currentHospitalId = this.currentUser?.hospitalId || null;

    if (this.currentHospitalId) {
      this.departmentForm.patchValue({
        hospitalId: this.currentHospitalId,
      });
    }
  }

  loadInitialData(): void {
    if (this.canSelectHospital) {
      this.backend.getHospitals().subscribe({
        next: (result) => {
          this.hospitals = result.items || [];

          if (!this.currentHospitalId && this.hospitals.length > 0) {
            this.departmentForm.patchValue({
              hospitalId: this.hospitals[0]._id,
            });
          }

          this.loadDepartments();
        },
        error: () => {
          this.hospitals = [];
          this.loadDepartments();
        },
      });

      return;
    }

    this.loadDepartments();
  }
}
