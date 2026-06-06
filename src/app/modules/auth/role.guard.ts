import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { inject } from '@angular/core';

import { hasRouteAccess, readStoredPermissions, resolveDefaultRoute } from './access-control';

export const roleGuard = (allowedRoles: string[], deniedRoles: string[] = []): CanActivateFn => {
  return (_route, state) => {
    const role = localStorage.getItem('role');
    const permissions = readStoredPermissions();
    const router = inject(Router);

    if (hasRouteAccess(allowedRoles, role, permissions, deniedRoles)) {
      return true;
    }

    const fallbackRoute = resolveDefaultRoute(role, permissions);
    const currentPath = state.url.split('?')[0];

    if (fallbackRoute !== currentPath) {
      return router.parseUrl(fallbackRoute);
    }

    return router.parseUrl('/login/access');
  };
};
