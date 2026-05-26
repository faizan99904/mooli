import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const role = localStorage.getItem('role');
    const router = inject(Router);
    const normalizeRole = (value: string) =>
      value.trim().replace(/[\s_-]/g, '').toLowerCase();
    const normalizedRole = role ? normalizeRole(role) : '';
    const isOwner = normalizedRole === 'owner';
    const hasAllowedRole = allowedRoles.some(
      (allowedRole) => normalizeRole(allowedRole) === normalizedRole
    );

    if (isOwner || hasAllowedRole) {
      return true;
    } else {
      return router.createUrlTree(['/login']);
    }
  };
};
