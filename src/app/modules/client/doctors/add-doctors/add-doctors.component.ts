import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
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
  AUTO_PRESCRIPTION_SPECIALTY,
  CLINICAL_DEPARTMENTS,
  CUSTOM_SPECIALIZATION_VALUE,
  CatalogOption,
  PRESCRIPTION_SPECIALTY_OPTIONS,
  QUALIFICATION_OPTIONS,
  findSpecializationOption,
  inferClinicalDepartmentFromSpecialization,
  resolveSpecialtyTemplateForSpecialization,
  specializationsForDepartment,
  specialtyTemplateLabel,
} from '../../../../shared/catalogs/doctor-specialization.catalog';
import {
  ClinicalDepartmentKey,
  Department,
  Doctor,
  Hospital,
  PrescriptionSpecialtyTemplate,
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
  specializationSearch = '';
  qualificationSearch = '';
  specializationDropdownOpen = false;
  qualificationDropdownOpen = false;
  filteredSpecializationOptions: CatalogOption[] = [];
  filteredQualificationOptions: CatalogOption[] = [];
  autoPrescriptionSpecialtyLabelText = 'Auto by specialization';
  private lastAutoUrduName = '';
  private readonly destroy$ = new Subject<void>();

  readonly clinicalDepartments = CLINICAL_DEPARTMENTS;
  readonly qualificationOptions = QUALIFICATION_OPTIONS;
  readonly prescriptionSpecialtyOptions = PRESCRIPTION_SPECIALTY_OPTIONS;
  readonly customSpecializationValue = CUSTOM_SPECIALIZATION_VALUE;
  readonly autoPrescriptionSpecialty = AUTO_PRESCRIPTION_SPECIALTY;

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
      id: 'gynae-clinical',
      name: "Gynae Theme 1 · Clinical Teal",
      description: 'Professional teal gynae prescription layout.',
    },
    {
      id: 'gynae-womens-health',
      name: "Gynae Theme 2 · Women's Health",
      description: 'Bilingual women\'s health clinic layout.',
    },
    {
      id: 'gynae-modern',
      name: 'Gynae Theme 3 · Modern Purple',
      description: 'Premium pink and purple women\'s health layout.',
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
      clinicalDepartment: ['', Validators.required],
      specializationSelect: ['', Validators.required],
      specializationCustom: [''],
      qualificationSelect: ['', Validators.required],
      qualificationCustom: [''],
      experienceYears: [0],
      consultationFee: [0, [Validators.required, Validators.min(0)]],
      prescriptionSpecialtyMode: [AUTO_PRESCRIPTION_SPECIALTY, Validators.required],
      prescriptionSpecialtyTemplate: ['general' as PrescriptionSpecialtyTemplate],
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
    this.setupClinicalFieldWatchers();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get showCustomSpecialization(): boolean {
    return this.doctorForm.get('specializationSelect')?.value === CUSTOM_SPECIALIZATION_VALUE;
  }

  get showCustomQualification(): boolean {
    return this.doctorForm.get('qualificationSelect')?.value === CUSTOM_SPECIALIZATION_VALUE;
  }

  get isManualPrescriptionSpecialty(): boolean {
    return this.doctorForm.get('prescriptionSpecialtyMode')?.value !== AUTO_PRESCRIPTION_SPECIALTY;
  }

  selectedClinicalDepartment(): ClinicalDepartmentKey | '' {
    return String(this.doctorForm.get('clinicalDepartment')?.value || '') as ClinicalDepartmentKey | '';
  }

  selectedSpecializationLabel(): string {
    const value = String(this.doctorForm.get('specializationSelect')?.value || '');
    if (!value || value === CUSTOM_SPECIALIZATION_VALUE) {
      return this.doctorForm.get('specializationCustom')?.value || 'Select specialization';
    }
    return value;
  }

  selectedQualificationLabel(): string {
    const value = String(this.doctorForm.get('qualificationSelect')?.value || '');
    if (!value || value === CUSTOM_SPECIALIZATION_VALUE) {
      return this.doctorForm.get('qualificationCustom')?.value || 'Select qualification';
    }
    return value;
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

  onClinicalDepartmentChange(): void {
    this.specializationSearch = '';
    this.closeCatalogDropdowns();
    this.doctorForm.patchValue({
      specializationSelect: '',
      specializationCustom: '',
    });
    this.syncSpecializationValidators();
    this.refreshSpecializationOptions();
    this.applyAutoPrescriptionSpecialty();
  }

  toggleSpecializationDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.selectedClinicalDepartment()) {
      return;
    }

    this.qualificationDropdownOpen = false;
    this.specializationDropdownOpen = !this.specializationDropdownOpen;

    if (this.specializationDropdownOpen) {
      this.refreshSpecializationOptions();
    }
  }

  toggleQualificationDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.specializationDropdownOpen = false;
    this.qualificationDropdownOpen = !this.qualificationDropdownOpen;

    if (this.qualificationDropdownOpen) {
      this.refreshQualificationOptions();
    }
  }

  onSpecializationSearchInput(event: Event): void {
    this.specializationSearch = (event.target as HTMLInputElement).value;
    this.refreshSpecializationOptions();
  }

  onQualificationSearchInput(event: Event): void {
    this.qualificationSearch = (event.target as HTMLInputElement).value;
    this.refreshQualificationOptions();
  }

  closeCatalogDropdowns(): void {
    this.specializationDropdownOpen = false;
    this.qualificationDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.catalog-select')) {
      return;
    }

    this.closeCatalogDropdowns();
  }

  trackCatalogOption(_index: number, option: CatalogOption): string {
    return option.value;
  }

  selectSpecialization(option: CatalogOption | typeof CUSTOM_SPECIALIZATION_VALUE): void {
    if (option === CUSTOM_SPECIALIZATION_VALUE) {
      this.doctorForm.patchValue({
        specializationSelect: CUSTOM_SPECIALIZATION_VALUE,
        specializationCustom: '',
      });
    } else {
      this.doctorForm.patchValue({
        specializationSelect: option.value,
        specializationCustom: '',
      });
    }

    this.specializationSearch = '';
    this.specializationDropdownOpen = false;
    this.refreshSpecializationOptions();
    this.syncSpecializationValidators();
    this.applyAutoPrescriptionSpecialty();
  }

  selectQualification(option: CatalogOption | typeof CUSTOM_SPECIALIZATION_VALUE): void {
    if (option === CUSTOM_SPECIALIZATION_VALUE) {
      this.doctorForm.patchValue({
        qualificationSelect: CUSTOM_SPECIALIZATION_VALUE,
        qualificationCustom: '',
      });
    } else {
      this.doctorForm.patchValue({
        qualificationSelect: option.value,
        qualificationCustom: '',
      });
    }

    this.qualificationSearch = '';
    this.qualificationDropdownOpen = false;
    this.refreshQualificationOptions();
    this.syncQualificationValidators();
  }

  onPrescriptionSpecialtyModeChange(): void {
    const manual = this.isManualPrescriptionSpecialty;
    const control = this.doctorForm.get('prescriptionSpecialtyTemplate');
    if (manual) {
      control?.setValidators([Validators.required]);
    } else {
      control?.clearValidators();
      this.applyAutoPrescriptionSpecialty();
    }
    control?.updateValueAndValidity();
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

    this.syncSpecializationValidators();
    this.syncQualificationValidators();

    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    const value = this.doctorForm.value;
    const hospitalId = value.hospitalId || this.currentHospitalId;
    const specialization = this.resolvedSpecialization();
    const qualification = this.resolvedQualification();

    const payload: Record<string, unknown> = {
      name: value.name,
      nameUrdu: value.nameUrdu?.trim() || '',
      email: value.email,
      phone: value.phone || undefined,
      departmentId: value.departmentId || undefined,
      clinicalDepartment: value.clinicalDepartment,
      specialization,
      qualification,
      experienceYears: Number(value.experienceYears || 0),
      consultationFee: Number(value.consultationFee || 0),
      prescriptionTemplate: value.prescriptionTemplate || 'classic',
      prescriptionSpecialtyTemplate: this.resolvedPrescriptionSpecialtyTemplate(),
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

  private setupClinicalFieldWatchers(): void {
    this.doctorForm
      .get('specializationCustom')
      ?.valueChanges.pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(() => this.applyAutoPrescriptionSpecialty());
  }

  private applyEditingState(): void {
    if (!this.editingDoctor) {
      return;
    }

    this.selectedDays = this.normalizeDays(this.editingDoctor.availableDays || []);
    const primarySlot = this.editingDoctor.availableSlots?.[0];
    const specialization = String(this.editingDoctor.specialization || '').trim();
    const qualification = String(this.editingDoctor.qualification || '').trim();
    const clinicalDepartment =
      this.editingDoctor.clinicalDepartment ||
      inferClinicalDepartmentFromSpecialization(specialization) ||
      '';
    const specializationMatch = findSpecializationOption(clinicalDepartment, specialization);
    const qualificationMatch = this.qualificationOptions.find(
      (item) => item.value.toLowerCase() === qualification.toLowerCase()
    );
    const autoTemplate = resolveSpecialtyTemplateForSpecialization(
      specialization,
      clinicalDepartment as ClinicalDepartmentKey
    );
    const storedTemplate = this.editingDoctor.prescriptionSpecialtyTemplate || autoTemplate;
    const manualPrescriptionSpecialty = storedTemplate !== autoTemplate;

    this.doctorForm.patchValue({
      hospitalId: this.editingDoctor.hospitalId || this.currentHospitalId || '',
      name: this.editingDoctor.user?.name || '',
      nameUrdu: this.editingDoctor.nameUrdu || '',
      email: this.editingDoctor.user?.email || '',
      password: '',
      phone: this.editingDoctor.user?.phone || '',
      departmentId: this.editingDoctor.departmentId || '',
      clinicalDepartment,
      specializationSelect: specializationMatch
        ? specializationMatch.value
        : specialization
          ? CUSTOM_SPECIALIZATION_VALUE
          : '',
      specializationCustom: specializationMatch ? '' : specialization,
      qualificationSelect: qualificationMatch
        ? qualificationMatch.value
        : qualification
          ? CUSTOM_SPECIALIZATION_VALUE
          : '',
      qualificationCustom: qualificationMatch ? '' : qualification,
      experienceYears: this.editingDoctor.experienceYears || 0,
      consultationFee: this.editingDoctor.consultationFee || 0,
      prescriptionSpecialtyMode: manualPrescriptionSpecialty ? 'manual' : AUTO_PRESCRIPTION_SPECIALTY,
      prescriptionSpecialtyTemplate: storedTemplate,
      prescriptionTemplate: this.editingDoctor.prescriptionTemplate || 'classic',
      slotDay: primarySlot?.day || this.selectedDays[0] || 'monday',
      startTime: primarySlot?.startTime || '09:00',
      endTime: primarySlot?.endTime || '13:00',
      status: this.editingDoctor.status || 'active',
    });

    this.doctorForm.get('password')?.clearValidators();
    this.doctorForm.get('password')?.updateValueAndValidity();
    this.syncSpecializationValidators();
    this.syncQualificationValidators();
    this.refreshSpecializationOptions();
    this.refreshQualificationOptions();
    this.updateAutoPrescriptionSpecialtyLabel();
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

  private resolvedSpecialization(): string {
    const selected = String(this.doctorForm.get('specializationSelect')?.value || '').trim();
    if (selected === CUSTOM_SPECIALIZATION_VALUE) {
      return String(this.doctorForm.get('specializationCustom')?.value || '').trim();
    }
    return selected;
  }

  private resolvedQualification(): string {
    const selected = String(this.doctorForm.get('qualificationSelect')?.value || '').trim();
    if (selected === CUSTOM_SPECIALIZATION_VALUE) {
      return String(this.doctorForm.get('qualificationCustom')?.value || '').trim();
    }
    return selected;
  }

  private resolvedPrescriptionSpecialtyTemplate(): PrescriptionSpecialtyTemplate {
    if (this.isManualPrescriptionSpecialty) {
      return (this.doctorForm.get('prescriptionSpecialtyTemplate')?.value ||
        'general') as PrescriptionSpecialtyTemplate;
    }

    const specialization = this.resolvedSpecialization();
    return resolveSpecialtyTemplateForSpecialization(
      specialization,
      this.selectedClinicalDepartment()
    );
  }

  private applyAutoPrescriptionSpecialty(): void {
    if (this.isManualPrescriptionSpecialty) {
      this.updateAutoPrescriptionSpecialtyLabel();
      return;
    }

    const template = this.resolvedPrescriptionSpecialtyTemplate();
    this.doctorForm.patchValue(
      {
        prescriptionSpecialtyTemplate: template,
      },
      { emitEvent: false }
    );
    this.updateAutoPrescriptionSpecialtyLabel();
  }

  private refreshSpecializationOptions(): void {
    const department = this.selectedClinicalDepartment();
    const query = this.specializationSearch.trim().toLowerCase();
    this.filteredSpecializationOptions = specializationsForDepartment(department).filter((item) =>
      !query ? true : item.value.toLowerCase().includes(query)
    );
  }

  private refreshQualificationOptions(): void {
    const query = this.qualificationSearch.trim().toLowerCase();
    this.filteredQualificationOptions = this.qualificationOptions.filter((item) =>
      !query ? true : item.value.toLowerCase().includes(query)
    );
  }

  private updateAutoPrescriptionSpecialtyLabel(): void {
    const specialization = this.resolvedSpecialization();
    const department = this.selectedClinicalDepartment();

    if (!specialization) {
      this.autoPrescriptionSpecialtyLabelText = 'Auto by specialization';
      return;
    }

    const key = resolveSpecialtyTemplateForSpecialization(specialization, department);
    this.autoPrescriptionSpecialtyLabelText = specialtyTemplateLabel(key);
  }

  private syncSpecializationValidators(): void {
    const customControl = this.doctorForm.get('specializationCustom');
    if (this.showCustomSpecialization) {
      customControl?.setValidators([Validators.required, Validators.maxLength(150)]);
    } else {
      customControl?.clearValidators();
      customControl?.setValue('', { emitEvent: false });
    }
    customControl?.updateValueAndValidity({ emitEvent: false });
  }

  private syncQualificationValidators(): void {
    const customControl = this.doctorForm.get('qualificationCustom');
    if (this.showCustomQualification) {
      customControl?.setValidators([Validators.required, Validators.maxLength(150)]);
    } else {
      customControl?.clearValidators();
      customControl?.setValue('', { emitEvent: false });
    }
    customControl?.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeDays(days: string[]): string[] {
    const selected = new Set(days);
    return this.days.filter((day) => selected.has(day));
  }
}
