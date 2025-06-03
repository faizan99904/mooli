import { Routes } from '@angular/router';
import { authRoutes } from './modules/auth/auth.routes';
import { clientRoutes } from './modules/client/client.routes';

export const routes: Routes = [
  ...authRoutes,
  ...clientRoutes,
  { path: '**', redirectTo: 'login' },
];
