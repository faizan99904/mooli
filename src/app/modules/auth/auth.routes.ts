import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';

export const authRoutes: Routes = [
  {
    path: 'login',
    component: LandingComponent,
    data: { title: 'Mooli | Showcase' },
  },
  {
    path: 'login/access',
    component: LoginComponent,
    data: { title: 'Log In' },
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    data: { title: 'Forgot Password' },
  },
];
