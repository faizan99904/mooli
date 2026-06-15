import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { inject } from '@angular/core';

import {
  hasRouteAccess,
  readStoredPermissions,
  resolveDefaultRoute,
} from './access-control';
import type { AccessRequirement } from './access-control';

export const roleGuard = (accessRequirement: AccessRequirement): CanActivateFn => {
  return (_route, state) => {
    const permissions = readStoredPermissions();
    const router = inject(Router);
    const currentPath = state.url.split('?')[0];

    if (hasRouteAccess(accessRequirement, permissions)) {
      return true;
    }

    const fallbackRoute = resolveDefaultRoute(permissions);

    if (fallbackRoute !== currentPath) {
      return router.parseUrl(fallbackRoute);
    }

    return router.parseUrl('/login/access');
  };
};
