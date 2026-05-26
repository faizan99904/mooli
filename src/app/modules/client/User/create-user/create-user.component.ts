import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../../../core/services/backend.service';
import { Router } from '@angular/router';
import { Role, User } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-create-user',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.scss',
})
export class CreateUserComponent implements OnInit {
  showPassword = false;
  userForm!: FormGroup;
  roles: Role[] = [];
  saving = false;
  editingUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private toast: ToastrService,
    private backend: BackendService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.editingUser = history.state?.user || null;
    this.initForm();
    this.backend.getRoles().subscribe({
      next: (roles) => (this.roles = roles),
      error: () => (this.roles = []),
    });
  }

  togglePasswordVisibility(field: 'password') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    }
  }

  initForm() {
    this.userForm = this.fb.group({
      roleId: [this.editingUser?.roleId || '', Validators.required],
      name: [this.editingUser?.name || '', Validators.required],
      email: [this.editingUser?.email || '', [Validators.required, Validators.email]],
      password: ['', this.editingUser ? [] : [Validators.required, Validators.minLength(8)]],
      phone: [this.editingUser?.phone || ''],
      status: [this.editingUser?.status || 'active', Validators.required],
      isEmailVerified: [true],
    });
  }

  submitForm() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.value;
    const payload: Record<string, unknown> = {
      roleId: value.roleId,
      hospitalId: null,
      name: value.name,
      email: value.email,
      phone: value.phone || undefined,
      status: value.status,
      isEmailVerified: value.isEmailVerified,
      storeId: null,
      warehouseId: null,
    };

    if (!this.editingUser) {
      payload['password'] = value.password;
    }

    this.saving = true;
    const request$ = this.editingUser
      ? this.backend.updateUser(this.editingUser._id, payload)
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
}
