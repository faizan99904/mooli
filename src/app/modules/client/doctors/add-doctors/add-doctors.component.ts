import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Department, Doctor, Hospital, User } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-add-doctors',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-doctors.component.html',
  styleUrl: './add-doctors.component.scss',
})
export class AddDoctorsComponent implements OnInit {
  doctorForm: FormGroup;
  editingDoctor: Doctor | null = null;

  departments: Department[] = [];
  hospitals: Hospital[] = [];

  currentUser: User | null = null;
  currentHospitalId: string | null = null;
  isOwnerOrSuperAdmin = false;

  saving = false;

  days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  selectedDays: string[] = [];

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.doctorForm = this.fb.group({
      hospitalId: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: [''],
      departmentId: [''],
      specialization: [''],
      qualification: [''],
      experienceYears: [0],
      consultationFee: [0],
      slotDay: ['monday'],
      startTime: ['09:00'],
      endTime: ['13:00'],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.editingDoctor = history.state?.doctor || null;
    this.setLoggedInUser();
    this.applyEditingState();
    this.loadInitialData();
  }

  setLoggedInUser(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;

    const role = localStorage.getItem('role') || '';
    const normalizedRole = role.trim().replace(/[\s_-]/g, '').toLowerCase();
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];

    this.isOwnerOrSuperAdmin =
      normalizedRole === 'owner' ||
      normalizedRole === 'superadmin' ||
      permissions.includes('*');

    this.currentHospitalId = this.currentUser?.hospitalId || null;

    if (this.currentHospitalId) {
      this.doctorForm.patchValue({
        hospitalId: this.currentHospitalId,
      });
    }
  }

  loadInitialData(): void {
    if (this.isOwnerOrSuperAdmin) {
      this.backend.getHospitals().subscribe({
        next: (result) => {
          this.hospitals = result.items || [];

          if (!this.currentHospitalId && this.hospitals.length > 0) {
            this.doctorForm.patchValue({
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

  loadDepartments(): void {
    const hospitalId = this.doctorForm.value.hospitalId || this.currentHospitalId || this.editingDoctor?.hospitalId;

    this.backend
      .getDepartments({
        limit: 100,
        status: 'active',
        hospitalId,
      })
      .subscribe({
        next: (result) => {
          this.departments = result.items || [];
        },
        error: () => {
          this.departments = [];
        },
      });
  }

  onHospitalChange(): void {
    this.doctorForm.patchValue({
      departmentId: '',
    });

    this.loadDepartments();
  }

  toggleDay(day: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    const nextDays = checked
      ? [...this.selectedDays, day]
      : this.selectedDays.filter((item) => item !== day);

    this.selectedDays = this.normalizeDays(nextDays);
  }

  isDaySelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  submitDoctor(): void {
    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    const value = this.doctorForm.value;
    const hospitalId = value.hospitalId || this.currentHospitalId;

    const payload: Record<string, unknown> = {
      name: value.name,
      email: value.email,
      phone: value.phone || undefined,
      departmentId: value.departmentId || undefined,
      specialization: value.specialization || undefined,
      qualification: value.qualification || undefined,
      experienceYears: Number(value.experienceYears || 0),
      consultationFee: Number(value.consultationFee || 0),
      availableDays: this.normalizeDays(this.selectedDays),
      availableSlots:
        value.startTime && value.endTime
          ? [
            {
              day: value.slotDay,
              startTime: value.startTime,
              endTime: value.endTime,
            },
          ]
          : [],
      status: value.status,
    };

    if (!this.editingDoctor) {
      payload['hospitalId'] = hospitalId;
      payload['password'] = value.password;
    }

    this.saving = true;

    const request$ = this.editingDoctor
      ? this.backend.updateDoctor(this.editingDoctor._id, payload)
      : this.backend.createDoctor(payload);

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.router.navigateByUrl('/all-doctors');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  private applyEditingState(): void {
    if (!this.editingDoctor) {
      return;
    }

    this.selectedDays = this.normalizeDays(this.editingDoctor.availableDays || []);
    const primarySlot = this.editingDoctor.availableSlots?.[0];

    this.doctorForm.patchValue({
      hospitalId: this.editingDoctor.hospitalId || this.currentHospitalId || '',
      name: this.editingDoctor.user?.name || '',
      email: this.editingDoctor.user?.email || '',
      password: '',
      phone: this.editingDoctor.user?.phone || '',
      departmentId: this.editingDoctor.departmentId || '',
      specialization: this.editingDoctor.specialization || '',
      qualification: this.editingDoctor.qualification || '',
      experienceYears: this.editingDoctor.experienceYears || 0,
      consultationFee: this.editingDoctor.consultationFee || 0,
      slotDay: primarySlot?.day || this.selectedDays[0] || 'monday',
      startTime: primarySlot?.startTime || '09:00',
      endTime: primarySlot?.endTime || '13:00',
      status: this.editingDoctor.status || 'active',
    });

    this.doctorForm.get('password')?.clearValidators();
    this.doctorForm.get('password')?.updateValueAndValidity();
  }

  private normalizeDays(days: string[]): string[] {
    const selected = new Set(days);
    return this.days.filter((day) => selected.has(day));
  }
}
