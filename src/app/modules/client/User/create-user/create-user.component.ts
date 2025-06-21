import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CONFIG } from '../../../../../../config';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../../../core/services/backend.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-create-user',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.scss',
})
export class CreateUserComponent implements OnInit {
  userForm!: FormGroup;
  roleId: any;
  roles: any[] = [];
  adminRoleId: string = '';
  superAdminRoleId: string = '';
  isRoleLoaded = false;
  editingUserId: string | null = null;
  isEditMode = false;
  userFormData: any = null;
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toast: ToastrService,
    private backend: BackendService,
    private router: Router
  ) {
    const navState = history.state.user;

    if (navState) {
      this.userFormData = navState;
      this.editingUserId = navState.userId;
      this.isEditMode = true;
    }
  }

  ngOnInit(): void {
    this.initForm();

    if (this.userFormData && this.isEditMode) {
      this.userForm.patchValue({
        username: this.userFormData.username || '',
        email: this.userFormData.email || '',
        firstName: this.userFormData.firstName || '',
        lastName: this.userFormData.lastName || '',
        mobile: this.userFormData.mobile || '',
        address: this.userFormData.address || '',
        role: this.userFormData.role || '',
      });
    }

    this.backend.getRole().subscribe({
      next: (res) => {
        for (const role of res.data) {
          if (role.name === 'ADMIN') {
            this.adminRoleId = role._id;
          } else if (role.name === 'superAdmin') {
            this.superAdminRoleId = role._id;
          }
        }
        this.isRoleLoaded = true;
      },
    });

    const navState = history.state.user;
    if (navState && this.isEditMode) {
      this.userForm.patchValue({
        username: navState.username,
        email: navState.email,
        firstName: navState.firstName,
        lastName: navState.lastName,
        mobile: navState.mobile,
        address: navState.address,
        role: navState.role,
      });
    }
  }

  initForm() {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
      address: ['', Validators.required],
      role: ['', Validators.required],
    });
  }

  submitForm() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.userForm.value };

    if (this.isEditMode && this.editingUserId) {
      this.backend.updateUser(this.editingUserId, payload).subscribe({
        next: (resp: any) => {
          this.toast.success(resp?.message || 'User updated successfully');
          this.router.navigateByUrl('/users');
        },
        error: (err) => {
          this.toast.error(err?.message || 'Update failed');
        },
      });
    } else {
      payload.role = [payload.role];
      this.http.post(CONFIG.createUser, payload).subscribe({
        next: (resp: any) => {
          this.toast.success(resp?.message || 'User created successfully');
          this.router.navigateByUrl('/users');
        },
        error: (err) => {
          this.toast.error(err?.message || 'Oops!');
        },
      });
    }
  }
}
