import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BackendService } from '../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';
import { resolveDefaultRoute, sanitizePermissions } from '../access-control';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  showNewPassword = false;
  loading = false;
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private router: Router,
    private toaster: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  togglePasswordVisibility(field: 'password') {
    if (field === 'password') {
      this.showNewPassword = !this.showNewPassword;
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
    };

    this.backend.login(payload).subscribe({
      next: (response) => {
        this.loading = false;

        const data = response.data;
        const token = data.token;
        const user = data.user;
        const userRole = user?.role;
        const role = userRole?.name;
        const roleId = userRole?._id;
        const permissions = sanitizePermissions(userRole?.permissions);

        if (!token) {
          this.toaster.error('Invalid login response');
          return;
        }

        localStorage.setItem('token', token);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        localStorage.setItem('role', role || '');
        localStorage.setItem('roleId', roleId || '');
        localStorage.setItem('permissions', JSON.stringify(permissions));

        this.toaster.success(response?.message || 'Login Successfully');

        this.router.navigateByUrl(resolveDefaultRoute(permissions));
      },

      error: (err) => {
        this.loading = false;
        this.toaster.error(err?.error?.message || 'Something went wrong!');
        console.error('Login failed:', err);
      },
    });
  }
}
