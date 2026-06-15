import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormArray,
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
import { Hospital, Role, User } from '../../../shared/models/hospital.model';

interface PermissionGroup {
  title: string;
  permissions: Array<{ key: string; label: string }>;
}

@Component({
  selector: 'app-roles',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesComponent implements OnInit {
  readonly roleContext = 'hospital';
  readonly permissionGroups: PermissionGroup[] = [
    {
      title: 'Dashboard',
      permissions: [{ key: 'hospital_dashboard.read', label: 'View Hospital Dashboard' }],
    },
    {
      title: 'Hospitals',
      permissions: [
        { key: 'hospitals.read', label: 'View Hospitals' },
        { key: 'hospitals.update', label: 'Update Hospitals' },
        { key: 'hospitals.delete', label: 'Delete Hospitals' },
      ],
    },
    {
      title: 'Departments',
      permissions: [
        { key: 'departments.create', label: 'Create Departments' },
        { key: 'departments.read', label: 'View Departments' },
        { key: 'departments.update', label: 'Update Departments' },
        { key: 'departments.delete', label: 'Delete Departments' },
      ],
    },
    {
      title: 'Doctors',
      permissions: [
        { key: 'doctors.create', label: 'Create Doctors' },
        { key: 'doctors.read', label: 'View Doctors' },
        { key: 'doctors.update', label: 'Update Doctors' },
        { key: 'doctors.delete', label: 'Delete Doctors' },
      ],
    },
    {
      title: 'Patients',
      permissions: [
        { key: 'patients.create', label: 'Create Patients' },
        { key: 'patients.read', label: 'View Patients' },
        { key: 'patients.update', label: 'Update Patients' },
        { key: 'patients.delete', label: 'Delete Patients' },
      ],
    },
    {
      title: 'Patient History',
      permissions: [
        { key: 'patients_history.create', label: 'Create History Records' },
        { key: 'patients_history.read', label: 'View History Records' },
        { key: 'patients_history.update', label: 'Update History Records' },
        { key: 'patients_history.delete', label: 'Delete History Records' },
      ],
    },
    {
      title: 'Appointments',
      permissions: [
        { key: 'appointments.create', label: 'Create Appointments' },
        { key: 'appointments.read', label: 'View Appointments' },
        { key: 'appointments.update', label: 'Update Appointments' },
        { key: 'appointments.delete', label: 'Delete Appointments' },
        { key: 'appointments.status_update', label: 'Update Appointment Status' },
      ],
    },
    {
      title: 'Prescriptions',
      permissions: [
        { key: 'prescriptions.create', label: 'Create Prescriptions' },
        { key: 'prescriptions.read', label: 'View Prescriptions' },
        { key: 'prescriptions.update', label: 'Update Prescriptions' },
        { key: 'prescriptions.delete', label: 'Delete Prescriptions' },
      ],
    },
    {
      title: 'Pharmacy / POS',
      permissions: [
        { key: 'products.read', label: 'View POS Medicine Catalog' },
        { key: 'products.create', label: 'Add POS Medicines' },
        { key: 'products.update', label: 'Update POS Medicines' },
        { key: 'products.delete', label: 'Delete POS Medicines' },
        { key: 'sales.create', label: 'Dispense Medicines / Create POS Sales' },
        { key: 'sales.read', label: 'View POS Sales' },
        { key: 'stores.read', label: 'View POS Stores' },
        { key: 'customers.read', label: 'View POS Customers' },
        { key: 'categories.create', label: 'Add Medicine Categories' },
        { key: 'categories.read', label: 'View Medicine Categories' },
        { key: 'inventory.read', label: 'View Medicine Stock' },
        { key: 'inventory.adjust', label: 'Adjust Store Stock' },
        { key: 'register_sessions.open', label: 'Open Cash Register' },
        { key: 'register_sessions.read', label: 'View Cash Register' },
        { key: 'register_sessions.close', label: 'Close Cash Register' },
      ],
    },
    {
      title: 'POS Reports',
      permissions: [
        { key: 'reports.read', label: 'View POS Reports' },
      ],
    },
    {
      title: 'Rooms',
      permissions: [
        { key: 'rooms.create', label: 'Create Rooms' },
        { key: 'rooms.read', label: 'View Rooms' },
        { key: 'rooms.update', label: 'Update Rooms' },
        { key: 'rooms.delete', label: 'Delete Rooms' },
      ],
    },
    {
      title: 'Room Allotments',
      permissions: [
        { key: 'room_allotments.create', label: 'Create Room Allotments' },
        { key: 'room_allotments.read', label: 'View Room Allotments' },
        { key: 'room_allotments.update', label: 'Update / Discharge Allotments' },
      ],
    },
    {
      title: 'Billing',
      permissions: [
        { key: 'bills.create', label: 'Create Bills' },
        { key: 'bills.read', label: 'View Bills' },
        { key: 'bills.update_payment', label: 'Update Bill Payments' },
      ],
    },
    {
      title: 'Administration',
      permissions: [
        { key: 'roles.create', label: 'Create Roles' },
        { key: 'roles.read', label: 'View Roles' },
        { key: 'roles.update', label: 'Update Roles' },
        { key: 'roles.delete', label: 'Delete Roles' },
        { key: 'users.create', label: 'Create Users' },
        { key: 'users.read', label: 'View Users' },
        { key: 'users.update', label: 'Update Users' },
        { key: 'users.delete', label: 'Delete Users' },
      ],
    },
  ];

  readonly roleForm: FormGroup;

  roles: Role[] = [];
  hospitals: Hospital[] = [];
  loading = false;
  saving = false;
  hospitalsLoading = false;
  search = '';
  status = '';
  editingRoleId: string | null = null;
  canSelectHospital = false;
  isHospitalScopedUser = false;
  currentHospitalId = '';
  currentHospitalName = '';
  selectedHospitalId = '';

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private dialog: AppDialogService
  ) {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      isActive: [true],
      permissions: this.fb.array([], [Validators.required]),
    });
  }

  ngOnInit(): void {
    this.setHospitalContext();
    this.loadCurrentHospitalSummary();
    this.loadHospitals();
    this.loadRoles();
  }

  get permissionSelections(): FormArray {
    return this.roleForm.get('permissions') as FormArray;
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  loadRoles(): void {
    if (this.canSelectHospital && !this.selectedHospitalId) {
      this.roles = [];
      return;
    }

    if (!this.selectedHospitalId && !this.canSelectHospital) {
      this.roles = [];
      return;
    }

    this.loading = true;
    const params: Record<string, unknown> = {
      context: this.roleContext,
    };

    if (this.canSelectHospital && this.selectedHospitalId) {
      params['hospitalId'] = this.selectedHospitalId;
    }

    this.backend
      .getRoles(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (roles) => {
          const search = this.search.trim().toLowerCase();
          this.roles = (roles || []).filter((role) => {
            const matchesSearch = !search
              ? true
              : [role.name, role.description || '', ...(role.permissions || [])]
                  .join(' ')
                  .toLowerCase()
                  .includes(search);
            const matchesStatus =
              !this.status ||
              (this.status === 'active' ? role.isActive !== false : role.isActive === false);

            return matchesSearch && matchesStatus;
          });
        },
        error: (err) => {
          this.roles = [];
          this.toastr.error(err?.error?.message || 'Unable to load hospital roles.');
        },
      });
  }

  togglePermission(permission: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const index = this.permissionSelections.controls.findIndex(
      (control) => control.value === permission
    );

    if (checked && index === -1) {
      this.permissionSelections.push(this.fb.control(permission));
    }

    if (!checked && index >= 0) {
      this.permissionSelections.removeAt(index);
    }
  }

  hasPermissionSelected(permission: string): boolean {
    return this.permissionSelections.controls.some((control) => control.value === permission);
  }

  submitRole(): void {
    if (!this.editingRoleId && !this.can('roles.create')) {
      this.toastr.error('You do not have permission to create roles.');
      return;
    }

    if (this.editingRoleId && !this.can('roles.update')) {
      this.toastr.error('You do not have permission to update roles.');
      return;
    }

    if (this.roleForm.invalid || this.permissionSelections.length === 0) {
      this.roleForm.markAllAsTouched();
      if (this.permissionSelections.length === 0) {
        this.toastr.error('Select at least one permission for this role.');
      }
      return;
    }

    const raw = this.roleForm.getRawValue();
    if (!this.selectedHospitalId && this.canSelectHospital) {
      this.toastr.error('Select a hospital before saving a hospital role.');
      return;
    }

    const payload = {
      name: String(raw.name || '').trim(),
      description: String(raw.description || '').trim(),
      isActive: Boolean(raw.isActive),
      context: this.roleContext,
      hospitalId: this.selectedHospitalId || undefined,
      permissions: [...new Set((raw.permissions || []).map((permission: string) => String(permission)))],
    };

    this.saving = true;
    const request$ = this.editingRoleId
      ? this.backend.updateRole(this.editingRoleId, payload, {
          context: this.roleContext,
          hospitalId: this.canSelectHospital ? this.selectedHospitalId || undefined : undefined,
        })
      : this.backend.createRole(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response?.message || 'Role saved successfully.');
        this.resetForm();
        this.loadRoles();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to save hospital role.');
      },
    });
  }

  editRole(role: Role): void {
    if (!this.can('roles.update')) {
      return;
    }

    if (this.isProtectedRole(role)) {
      this.toastr.info('Super Admin role cannot be edited here.');
      return;
    }

    this.editingRoleId = role._id;
    this.roleForm.patchValue({
      name: role.name,
      description: role.description || '',
      isActive: role.isActive !== false,
    });
    this.permissionSelections.clear();
    (role.permissions || []).forEach((permission) => {
      this.permissionSelections.push(this.fb.control(permission));
    });
  }

  async deleteRole(role: Role): Promise<void> {
    if (!this.can('roles.delete')) {
      this.toastr.error('You do not have permission to delete roles.');
      return;
    }

    if (role.isSystemRole) {
      this.toastr.info('System roles cannot be deleted here.');
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Delete Role',
      message: `Delete the "${role.name}" role? This action cannot be undone.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.backend
      .deleteRole(role._id, {
        context: this.roleContext,
        hospitalId: this.canSelectHospital ? this.selectedHospitalId || undefined : undefined,
      })
      .subscribe({
      next: (response) => {
        this.toastr.success(response?.message || 'Role deleted successfully.');
        if (this.editingRoleId === role._id) {
          this.resetForm();
        }
        this.loadRoles();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to delete hospital role.');
      },
      });
  }

  resetForm(): void {
    this.editingRoleId = null;
    this.roleForm.reset({
      name: '',
      description: '',
      isActive: true,
    });
    this.permissionSelections.clear();
  }

  visibleRoles(): Role[] {
    return this.roles;
  }

  onHospitalChange(): void {
    this.resetForm();
    this.loadRoles();
  }

  private setHospitalContext(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
    this.currentHospitalId = this.resolveId(
      currentUser?.hospitalId || currentUser?.hospital || null
    );
    this.isHospitalScopedUser = Boolean(this.currentHospitalId);
    this.canSelectHospital = permissions.includes('*') && !this.isHospitalScopedUser;
    this.currentHospitalName = currentUser?.hospital?.name || '';
    this.selectedHospitalId = this.isHospitalScopedUser ? this.currentHospitalId : '';
  }

  private loadCurrentHospitalSummary(): void {
    if (this.canSelectHospital || !this.currentHospitalId || this.currentHospitalName) {
      return;
    }

    this.backend.getHospital(this.currentHospitalId).subscribe({
      next: (hospital) => {
        this.currentHospitalName = hospital.name || this.currentHospitalName;
      },
      error: () => {
        if (!this.currentHospitalName) {
          this.currentHospitalName = 'Assigned hospital';
        }
      },
    });
  }

  private loadHospitals(): void {
    if (!this.canSelectHospital) {
      return;
    }

    this.hospitalsLoading = true;
    this.backend
      .getHospitals({ limit: 100 })
      .pipe(finalize(() => (this.hospitalsLoading = false)))
      .subscribe({
        next: (result) => {
          this.hospitals = result.items || [];
        },
        error: (err) => {
          this.hospitals = [];
          this.toastr.error(err?.error?.message || 'Unable to load hospitals.');
        },
      });
  }

  private isProtectedRole(role: Role): boolean {
    return Boolean(role.permissions?.includes('*'));
  }

  private resolveId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null && '_id' in value) {
      return String((value as { _id?: unknown })._id || '');
    }

    return '';
  }
}
