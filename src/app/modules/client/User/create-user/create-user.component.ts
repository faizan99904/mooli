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
import { Router } from '@angular/router';

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
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toast: ToastrService,
    private backend: BackendService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
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
