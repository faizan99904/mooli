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

import { BackendService } from '../../../core/services/backend.service';
import { Role } from '../../../shared/models/hospital.model';

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
        { key: 'hospitals.create', label: 'Create Hospitals' },
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
  loading = false;
  saving = false;
  search = '';
  status = '';
  editingRoleId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService
  ) {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      isActive: [true],
      permissions: this.fb.array([], [Validators.required]),
    });
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  get permissionSelections(): FormArray {
    return this.roleForm.get('permissions') as FormArray;
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  loadRoles(): void {
    this.loading = true;
    this.backend
      .getRoles({ context: this.roleContext })
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
    const payload = {
      name: String(raw.name || '').trim(),
      description: String(raw.description || '').trim(),
      isActive: Boolean(raw.isActive),
      context: this.roleContext,
      permissions: [...new Set((raw.permissions || []).map((permission: string) => String(permission)))],
    };

    this.saving = true;
    const request$ = this.editingRoleId
      ? this.backend.updateRole(this.editingRoleId, payload, { context: this.roleContext })
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

  deleteRole(role: Role): void {
    if (!this.can('roles.delete')) {
      this.toastr.error('You do not have permission to delete roles.');
      return;
    }

    if (!confirm(`Delete the "${role.name}" role?`)) {
      return;
    }

    this.backend.deleteRole(role._id, { context: this.roleContext }).subscribe({
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
}
