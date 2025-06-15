import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BackendService } from '../../../core/services/backend.service';

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
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.email]],
      password: [''],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const payload = this.loginForm.value;
      this.backend.login(payload).subscribe({
        next: (response) => {
          const token = response?.data?.token;
          if (token) {
            localStorage.setItem('token', token);
            this.router.navigateByUrl('/');
            console.log('navigated!', response.message);
          } else {
            console.log('Login Failed');
          }
        },
        error: (err) => {
          console.error('Login failed:', err);
        },
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
