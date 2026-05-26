import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const role = localStorage.getItem('role');
    const permissions = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    ) as string[];
    const router = inject(Router);
    const normalizeRole = (value: string) =>
      value.trim().replace(/[\s_-]/g, '').toLowerCase();
    const normalizedRole = role ? normalizeRole(role) : '';
    const isElevated =
      normalizedRole === 'owner' ||
      normalizedRole === 'superadmin' ||
      permissions.includes('*');
    const hasAllowedRole = allowedRoles.some(
      (allowedRole) => normalizeRole(allowedRole) === normalizedRole
    );
    const hasAllowedPermission = allowedRoles.some((allowedRole) =>
      permissions.includes(allowedRole)
    );

    if (isElevated || hasAllowedRole || hasAllowedPermission) {
      return true;
    } else {
      return router.createUrlTree(['/dashboard']);
    }
  };
};
