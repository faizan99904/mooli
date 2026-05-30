import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { inject } from '@angular/core';

const normalizeAccessKey = (value: string) =>
  value.trim().replace(/[\s_-]/g, '').toLowerCase();

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const role = localStorage.getItem('role');
    const permissions = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    ) as string[];
    const router = inject(Router);
    const normalizedRole = role ? normalizeAccessKey(role) : '';
    const isElevated =
      normalizedRole === 'owner' ||
      normalizedRole === 'superadmin' ||
      permissions.includes('*');
    const hasAllowedRole = allowedRoles.some(
      (allowedRole) => normalizeAccessKey(allowedRole) === normalizedRole
    );
    const normalizedPermissions = new Set(
      permissions.map((permission) => normalizeAccessKey(permission))
    );
    const hasAllowedPermission = allowedRoles.some((allowedRole) => {
      const normalizedAllowedRole = normalizeAccessKey(allowedRole);
      return normalizedPermissions.has(normalizedAllowedRole);
    });

    if (isElevated || hasAllowedRole || hasAllowedPermission) {
      return true;
    } else {
      return router.createUrlTree(['/dashboard']);
    }
  };
};
