import {
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const role = localStorage.getItem('role');
    const router = inject(Router);

    if (role && allowedRoles.includes(role)) {
      return true;
    } else {
      router.navigate(['/login']);
      return false;
    }
  };
};
