import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import {
  Department,
  Doctor,
  Hospital,
  PrescriptionTemplate,
  User,
} from '../../../../shared/models/hospital.model';
import { transliterateDoctorNameToUrdu } from '../../../../shared/utils/urdu-transliteration';

@Component({
  selector: 'app-add-doctors',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-doctors.component.html',
  styleUrl: './add-doctors.component.scss',
})
export class AddDoctorsComponent implements OnInit, OnDestroy {
  doctorForm: FormGroup;
  editingDoctor: Doctor | null = null;

  departments: Department[] = [];
  hospitals: Hospital[] = [];

  currentUser: User | null = null;
  currentHospitalId: string | null = null;
  canSelectHospital = false;

  saving = false;
  autoUrduName = true;
  private lastAutoUrduName = '';
  private readonly destroy$ = new Subject<void>();

  days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  selectedDays: string[] = [];
  readonly prescriptionTemplates: Array<{
    id: PrescriptionTemplate;
    name: string;
    description: string;
  }> = [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional bilingual prescription layout.',
    },
    {
      id: 'clinical-blue',
      name: 'Clinical Blue',
      description: 'Detailed blue hospital layout based on the reference design.',
    },
    {
      id: 'minimal-teal',
      name: 'Minimal Teal',
      description: 'Clean modern layout with light teal accents.',
    },
    {
      id: 'compact-mono',
      name: 'Compact Mono',
      description: 'Space-efficient black and white clinical print.',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.doctorForm = this.fb.group({
      hospitalId: ['', Validators.required],
      name: ['', Validators.required],
      nameUrdu: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: [''],
      departmentId: [''],
      specialization: [''],
      qualification: [''],
      experienceYears: [0],
      consultationFee: [0],
      prescriptionTemplate: ['classic' as PrescriptionTemplate, Validators.required],
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
    this.setupNameTranslation();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setLoggedInUser(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;

    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];

    this.canSelectHospital = permissions.includes('*');

    this.currentHospitalId = this.currentUser?.hospitalId || null;

    if (this.currentHospitalId) {
      this.doctorForm.patchValue({
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

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  onUrduNameInput(): void {
    const currentValue = String(this.doctorForm.get('nameUrdu')?.value || '').trim();
    this.autoUrduName = !currentValue || currentValue === this.lastAutoUrduName;
  }

  autoFillUrduName(): void {
    this.applyUrduNameTranslation(true);
  }

  submitDoctor(): void {
    if (!this.editingDoctor && !this.can('doctors.create')) {
      return;
    }

    if (this.editingDoctor && !this.can('doctors.update')) {
      return;
    }

    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    const value = this.doctorForm.value;
    const hospitalId = value.hospitalId || this.currentHospitalId;

    const payload: Record<string, unknown> = {
      name: value.name,
      nameUrdu: value.nameUrdu?.trim() || '',
      email: value.email,
      phone: value.phone || undefined,
      departmentId: value.departmentId || undefined,
      specialization: value.specialization || undefined,
      qualification: value.qualification || undefined,
      experienceYears: Number(value.experienceYears || 0),
      consultationFee: Number(value.consultationFee || 0),
      prescriptionTemplate: value.prescriptionTemplate || 'classic',
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
      nameUrdu: this.editingDoctor.nameUrdu || '',
      email: this.editingDoctor.user?.email || '',
      password: '',
      phone: this.editingDoctor.user?.phone || '',
      departmentId: this.editingDoctor.departmentId || '',
      specialization: this.editingDoctor.specialization || '',
      qualification: this.editingDoctor.qualification || '',
      experienceYears: this.editingDoctor.experienceYears || 0,
      consultationFee: this.editingDoctor.consultationFee || 0,
      prescriptionTemplate: this.editingDoctor.prescriptionTemplate || 'classic',
      slotDay: primarySlot?.day || this.selectedDays[0] || 'monday',
      startTime: primarySlot?.startTime || '09:00',
      endTime: primarySlot?.endTime || '13:00',
      status: this.editingDoctor.status || 'active',
    });

    this.doctorForm.get('password')?.clearValidators();
    this.doctorForm.get('password')?.updateValueAndValidity();
    this.autoUrduName = true;
  }

  private setupNameTranslation(): void {
    this.doctorForm
      .get('name')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyUrduNameTranslation());

    if (!this.doctorForm.get('nameUrdu')?.value) {
      this.applyUrduNameTranslation();
    }
  }

  private applyUrduNameTranslation(force = false): void {
    const englishName = String(this.doctorForm.get('name')?.value || '').trim();
    const urduControl = this.doctorForm.get('nameUrdu');
    const currentUrduName = String(urduControl?.value || '').trim();
    const canAutoFill =
      force ||
      this.autoUrduName ||
      !currentUrduName ||
      currentUrduName === this.lastAutoUrduName;

    if (!canAutoFill) {
      return;
    }

    const translatedName = transliterateDoctorNameToUrdu(englishName);
    urduControl?.setValue(translatedName, { emitEvent: false });
    this.lastAutoUrduName = translatedName;
    this.autoUrduName = true;
  }

  private normalizeDays(days: string[]): string[] {
    const selected = new Set(days);
    return this.days.filter((day) => selected.has(day));
  }
}
