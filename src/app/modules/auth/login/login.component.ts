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

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
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
      const payload = this.loginForm.value;
      
      
      this.backend.login(payload).subscribe({
        next: (response) => {
          const token = response?.data.token;
          const role = response?.data.userDetails.role;
          if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('role', role);
            this.toaster.success(response.message || 'Login Successfully');
            this.router.navigateByUrl('/');
          } else {
            console.log('Login Failed');
          }
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'Something went wrong!');
          console.error('Login failed:', err);
        },
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
