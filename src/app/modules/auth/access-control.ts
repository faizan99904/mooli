const ELEVATED_ROLES = new Set(['owner', 'superadmin', 'admin']);

type RouteAccess = {
  path: string;
  access: string[];
};

const DEFAULT_ROUTE_ACCESS: RouteAccess[] = [
  { path: '/dashboard', access: ['owner', 'superAdmin', 'hospital_dashboard.read'] },
  { path: '/appointments', access: ['owner', 'superAdmin', 'appointments.read'] },
  { path: '/patients/all-patients', access: ['owner', 'superAdmin', 'patients.read'] },
  {
    path: '/patients/add-patient',
    access: ['owner', 'superAdmin', 'patients.create', 'patients.update'],
  },
  { path: '/payments/invoices', access: ['owner', 'superAdmin', 'bills.read'] },
  {
    path: '/payments/addpayment',
    access: ['owner', 'superAdmin', 'bills.create', 'bills.update_payment'],
  },
  { path: '/departments', access: ['owner', 'superAdmin', 'departments.read'] },
  { path: '/all-doctors', access: ['owner', 'superAdmin', 'doctors.read'] },
  {
    path: '/clinical-records',
    access: ['owner', 'superAdmin', 'patients_history.read', 'patients_history.create'],
  },
  { path: '/pharmacy', access: ['owner', 'superAdmin', 'pharmacy', 'products.read'] },
  {
    path: '/prescriptions',
    access: ['owner', 'superAdmin', 'prescriptions.read', 'prescriptions.create'],
  },
  {
    path: '/room-allotment/alloted-rooms',
    access: ['owner', 'superAdmin', 'room_allotments.read', 'rooms.read'],
  },
  {
    path: '/room-allotment/add-alloted-rooms',
    access: [
      'owner',
      'superAdmin',
      'room_allotments.create',
      'room_allotments.update',
      'rooms.create',
      'rooms.update',
    ],
  },
  {
    path: '/laboratory',
    access: ['owner', 'superAdmin', 'patients.read', 'patients_history.read'],
  },
  {
    path: '/ward-admin',
    access: ['owner', 'superAdmin', 'room_allotments.read', 'patients_history.read'],
  },
  { path: '/users', access: ['owner', 'superAdmin', 'users.read'] },
  { path: '/hospitals', access: ['owner', 'superAdmin', 'hospitals.read'] },
  { path: '/roles', access: ['owner', 'superAdmin', 'roles.read'] },
];

export const normalizeAccessKey = (value: string) =>
  value.trim().replace(/[\s_-]/g, '').toLowerCase();

export const sanitizePermissions = (permissions: unknown): string[] => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions
    .filter((permission): permission is string => typeof permission === 'string')
    .map((permission) => permission.trim())
    .filter(Boolean);
};

export const readStoredPermissions = (): string[] => {
  try {
    return sanitizePermissions(JSON.parse(localStorage.getItem('permissions') || '[]'));
  } catch {
    localStorage.removeItem('permissions');
    return [];
  }
};

export const hasRouteAccess = (
  allowedAccess: string[],
  role: string | null,
  permissions: string[]
): boolean => {
  const normalizedRole = role ? normalizeAccessKey(role) : '';
  const normalizedPermissions = new Set(
    permissions.map((permission) => normalizeAccessKey(permission))
  );

  if (
    ELEVATED_ROLES.has(normalizedRole) ||
    permissions.includes('*') ||
    normalizedPermissions.has('*')
  ) {
    return true;
  }

  return allowedAccess.some((allowedItem) => {
    const normalizedAllowedItem = normalizeAccessKey(allowedItem);
    return (
      normalizedAllowedItem === normalizedRole ||
      normalizedPermissions.has(normalizedAllowedItem)
    );
  });
};

export const resolveDefaultRoute = (
  role: string | null | undefined,
  permissions: string[]
): string => {
  return (
    DEFAULT_ROUTE_ACCESS.find((routeAccess) =>
      hasRouteAccess(routeAccess.access, role || null, permissions)
    )?.path || '/login/access'
  );
};
