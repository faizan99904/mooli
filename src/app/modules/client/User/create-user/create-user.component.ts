import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../../../core/services/backend.service';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { Hospital, Role, Store, User } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-create-user',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.scss',
})
export class CreateUserComponent implements OnInit, OnDestroy {
  showPassword = false;
  userForm!: FormGroup;
  roles: Role[] = [];
  hospitals: Hospital[] = [];
  stores: Store[] = [];
  hospitalSearchControl = new FormControl('', { nonNullable: true });
  currentUser: User | null = null;
  currentHospitalId: string | null = null;
  currentHospitalName = '';
  canSelectHospital = false;
  canAssignPosStore = false;
  isHospitalAdminUser = false;
  rolesLoading = false;
  rolesError = '';
  hospitalsLoading = false;
  hospitalsError = '';
  storesLoading = false;
  storesError = '';
  saving = false;
  editingUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private toast: ToastrService,
    private backend: BackendService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.editingUser = history.state?.user || null;
    this.setLoggedInUser();
    this.initForm();
    this.validateEditingScope();
    this.loadRoles();
    this.loadHospitalContext();
    this.loadStores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePasswordVisibility(field: 'password') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    }
  }

  initForm() {
    const hospitalId = this.canSelectHospital
      ? this.editingUser?.hospitalId || ''
      : this.currentHospitalId || '';

    this.userForm = this.fb.group({
      hospitalId: [hospitalId, Validators.required],
      roleId: [this.editingUser?.roleId || '', Validators.required],
      name: [this.editingUser?.name || '', Validators.required],
      email: [this.editingUser?.email || '', [Validators.required, Validators.email]],
      password: ['', this.editingUser ? [] : [Validators.required, Validators.minLength(8)]],
      phone: [this.editingUser?.phone || ''],
      storeId: [this.editingUser?.storeId || ''],
      status: [this.editingUser?.status || 'active', Validators.required],
      isEmailVerified: [true],
    });

    if (!this.canSelectHospital) {
      this.userForm.get('hospitalId')?.disable({ emitEvent: false });
    }
  }

  submitForm() {
    if (!this.editingUser && !this.backend.hasPermission('users.create')) {
      return;
    }

    if (this.editingUser && !this.backend.hasPermission('users.update')) {
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.getRawValue();
    const hospitalId = this.getResolvedHospitalId();

    if (!hospitalId) {
      this.userForm.get('hospitalId')?.markAsTouched();
      this.toast.error('A hospital is required before saving this user.');
      return;
    }

    if (!this.canAssignSelectedRole(String(value.roleId || ''))) {
      this.toast.error('You cannot assign the selected role.');
      return;
    }

    const payload: Record<string, unknown> = {
      roleId: value.roleId,
      hospitalId,
      name: value.name,
      email: value.email,
      phone: value.phone || undefined,
      storeId: value.storeId || null,
      status: value.status,
      isEmailVerified: value.isEmailVerified,
    };

    if (!this.editingUser) {
      payload['password'] = value.password;
    }

    this.saving = true;
    const request$ = this.editingUser
      ? this.backend.updateUser(this.editingUser._id, payload, { context: 'hospital' })
      : this.backend.createUser(payload);

    request$.subscribe({
      next: (resp) => {
        this.saving = false;
        this.toast.success(resp?.message || 'User saved successfully');
        this.router.navigateByUrl('/users');
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Oops!');
      },
    });
  }

  get isSubmitDisabled(): boolean {
    return (
      !this.userForm ||
      this.userForm.invalid ||
      this.saving ||
      this.rolesLoading ||
      (this.canAssignPosStore && this.storesLoading) ||
      (this.canSelectHospital && this.hospitalsLoading) ||
      !this.getResolvedHospitalId()
    );
  }

  private setLoggedInUser(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;

    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
    const currentRoleName = String(
      this.currentUser?.role?.name || localStorage.getItem('role') || ''
    );

    this.canSelectHospital = permissions.includes('*');
    this.canAssignPosStore =
      this.canSelectHospital ||
      permissions.includes('stores.read') ||
      permissions.includes('stores.manage');
    this.isHospitalAdminUser = this.normalizeRoleName(currentRoleName) === 'hospitaladmin';

    this.currentHospitalId = this.currentUser?.hospitalId || null;
    this.currentHospitalName = this.currentUser?.hospital?.name || '';
  }

  private validateEditingScope(): void {
    if (
      this.editingUser?.hospitalId &&
      this.currentHospitalId &&
      !this.canSelectHospital &&
      this.editingUser.hospitalId !== this.currentHospitalId
    ) {
      this.toast.error('You cannot edit a user from another hospital.');
      this.router.navigateByUrl('/users');
    }
  }

  private loadRoles(): void {
    const hospitalId = this.getResolvedHospitalId();
    if (this.canSelectHospital && !hospitalId) {
      this.roles = [];
      this.rolesLoading = false;
      this.rolesError = '';
      return;
    }

    this.rolesLoading = true;
    this.rolesError = '';

    this.backend
      .getRoles({
        context: 'hospital',
        hospitalId: hospitalId || undefined,
      })
      .pipe(finalize(() => (this.rolesLoading = false)))
      .subscribe({
        next: (roles) => {
          this.roles = this.filterAssignableRoles(roles || []);

          if (
            this.userForm.value.roleId &&
            !this.canAssignSelectedRole(String(this.userForm.value.roleId))
          ) {
            this.userForm.patchValue({ roleId: '' });
          }
        },
        error: (err) => {
          this.roles = [];
          this.rolesError = err?.error?.message || 'Unable to load roles.';
        },
      });
  }

  private loadHospitalContext(): void {
    if (this.canSelectHospital) {
      this.loadHospitals();
      this.hospitalSearchControl.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe((search) => this.loadHospitals(search));
      return;
    }

    if (!this.currentHospitalId) {
      this.hospitalsError = 'Your account is not assigned to a hospital.';
      return;
    }

    if (this.currentHospitalName) {
      return;
    }

    this.backend.getHospital(this.currentHospitalId).subscribe({
      next: (hospital) => (this.currentHospitalName = hospital.name),
      error: () => (this.currentHospitalName = 'Assigned hospital'),
    });
  }

  private loadStores(): void {
    if (!this.canAssignPosStore) {
      return;
    }

    const hospitalId = this.getResolvedHospitalId();
    if (this.canSelectHospital && !hospitalId) {
      this.stores = [];
      this.storesLoading = false;
      this.storesError = '';
      return;
    }

    this.storesLoading = true;
    this.storesError = '';

    this.backend
      .getStores({
        limit: 100,
        isActive: true,
        hospitalId: hospitalId || undefined,
      })
      .pipe(finalize(() => (this.storesLoading = false)))
      .subscribe({
        next: (result) => {
          this.stores = result.items || [];
        },
        error: (err) => {
          this.stores = [];
          this.storesError = err?.error?.message || 'Unable to load POS stores.';
        },
      });
  }

  private loadHospitals(search = ''): void {
    this.hospitalsLoading = true;
    this.hospitalsError = '';

    this.backend
      .getHospitals({
        limit: 50,
        search,
      })
      .pipe(finalize(() => (this.hospitalsLoading = false)))
      .subscribe({
        next: (result) => {
          this.hospitals = result.items || [];
          this.includeSelectedHospitalIfMissing();
        },
        error: (err) => {
          this.hospitals = [];
          this.hospitalsError = err?.error?.message || 'Unable to load hospitals.';
        },
      });
  }

  private includeSelectedHospitalIfMissing(): void {
    const selectedHospitalId = String(this.userForm.get('hospitalId')?.value || '');

    if (
      !selectedHospitalId ||
      this.hospitals.some((hospital) => hospital._id === selectedHospitalId)
    ) {
      return;
    }

    this.backend.getHospital(selectedHospitalId).subscribe({
      next: (hospital) => (this.hospitals = [hospital, ...this.hospitals]),
    });
  }

  private filterAssignableRoles(roles: Role[]): Role[] {
    return roles.filter((role) => {
      if (role.isActive === false) {
        return false;
      }

      if (!this.canSelectHospital && this.isWildcardRole(role)) {
        return false;
      }

      if (this.isHospitalAdminUser && this.isHospitalAdminRole(role)) {
        return false;
      }

      return true;
    });
  }

  private canAssignSelectedRole(roleId: string): boolean {
    return this.roles.some((role) => role._id === roleId);
  }

  private isWildcardRole(role: Role): boolean {
    return Boolean(role.permissions?.includes('*'));
  }

  private isHospitalAdminRole(role: Role): boolean {
    return this.normalizeRoleName(role.name) === 'hospitaladmin';
  }

  private normalizeRoleName(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .replace(/[\s_-]/g, '')
      .toLowerCase();
  }

  private getResolvedHospitalId(): string {
    const formHospitalId = String(this.userForm?.getRawValue()?.hospitalId || '');

    if (this.canSelectHospital) {
      return formHospitalId;
    }

    return this.currentHospitalId || formHospitalId;
  }

  onHospitalChange(): void {
    this.userForm.patchValue({
      roleId: '',
      storeId: '',
    });
    this.roles = [];
    this.stores = [];
    this.loadRoles();
    this.loadStores();
  }
}
