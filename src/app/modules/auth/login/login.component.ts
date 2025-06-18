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
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loading: boolean = false;
  loginForm: FormGroup;
  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private router: Router,
    private toaster: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      const payload = this.loginForm.value;

      this.backend.login(payload).subscribe({
        next: (response) => {
          this.loading = false;
          const token = response?.data.token;
          const role = response?.data.userDetails.role;
          if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('role', role);
            setTimeout(() => {
              this.router.navigateByUrl('/');
              this.toaster.success(response.message || 'Login Successfully');
            }, 100);
          } else {
            console.log('Login Failed');
          }
        },
        error: (err) => {
          this.loading = false;
          this.toaster.error(err.error?.message || 'Something went wrong!');
          console.error('Login failed:', err);
        },
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
