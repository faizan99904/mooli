export type AccessRequirement =
  | string[]
  | {
      any?: string[];
      all?: string[];
    };

type RouteAccess = {
  path: string;
  access: AccessRequirement;
};

const DEFAULT_ROUTE_ACCESS: RouteAccess[] = [
  { path: '/dashboard', access: ['hospital_dashboard.read'] },
  { path: '/settings', access: [] },
  { path: '/appointments', access: ['appointments.read'] },
  { path: '/patients/all-patients', access: ['patients.read'] },
  {
    path: '/patients/add-patient',
    access: ['patients.create', 'patients.update'],
  },
  { path: '/payments/invoices', access: ['bills.read', 'encounters.read'] },
  { path: '/payments/ledger', access: ['encounters.read', 'bills.read'] },
  {
    path: '/payments/addpayment',
    access: ['bills.create', 'bills.update_payment'],
  },
  { path: '/departments', access: ['departments.read'] },
  { path: '/all-doctors', access: ['doctors.read'] },
  {
    path: '/clinical-records',
    access: ['patients_history.read', 'patients_history.create'],
  },
  { path: '/pharmacy', access: ['products.read'] },
  {
    path: '/prescriptions',
    access: ['prescriptions.read', 'prescriptions.create'],
  },
  {
    path: '/pos-reports',
    access: ['reports.read'],
  },
  {
    path: '/room-allotment',
    access: ['rooms.read', 'rooms.create', 'rooms.update'],
  },
  {
    path: '/room-allotment/alloted-rooms',
    access: ['room_allotments.read'],
  },
  {
    path: '/room-allotment/add-alloted-rooms',
    access: {
      all: ['room_allotments.create', 'rooms.read', 'patients.read'],
    },
  },
  {
    path: '/laboratory',
    access: ['lab_orders.read', 'lab_tests.read', 'patients_history.read'],
  },
  {
    path: '/laboratory/create-order',
    access: ['lab_orders.create', 'patients_history.create'],
  },
  {
    path: '/laboratory/catalog',
    access: ['lab_tests.read', 'patients_history.read'],
  },
  {
    path: '/laboratory/records',
    access: ['patients_history.read'],
  },
  {
    path: '/ward-admin',
    access: ['patients_history.read'],
  },
  { path: '/users', access: ['users.read'] },
  { path: '/hospitals', access: ['hospitals.read'] },
  { path: '/roles', access: ['roles.read'] },
];

export const normalizeAccessKey = (value: string) =>
  value.trim().replace(/[\s_-]/g, '').toLowerCase();

export const readStoredRole = (): string => {
  try {
    return String(localStorage.getItem('role') || '');
  } catch {
    return '';
  }
};

export const isDoctorRole = (role: string): boolean =>
  normalizeAccessKey(role) === 'doctor';

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
  allowedAccess: AccessRequirement,
  permissions: string[]
): boolean => {
  const normalizedPermissions = new Set(
    permissions.map((permission) => normalizeAccessKey(permission))
  );

  if (permissions.includes('*') || normalizedPermissions.has('*')) {
    return true;
  }

  const anyAccess = Array.isArray(allowedAccess) ? allowedAccess : allowedAccess.any || [];
  const allAccess = Array.isArray(allowedAccess) ? [] : allowedAccess.all || [];
  const hasAccessItem = (allowedItem: string) => {
    const normalizedAllowedItem = normalizeAccessKey(allowedItem);
    return normalizedPermissions.has(normalizedAllowedItem);
  };

  const passesAny = anyAccess.length === 0 || anyAccess.some(hasAccessItem);
  const passesAll = allAccess.every(hasAccessItem);

  return passesAny && passesAll;
};

export const resolveDefaultRoute = (
  permissions: string[],
  role = readStoredRole()
): string => {
  if (isDoctorRole(role)) {
    return '/doctor-dashboard';
  }

  return (
    DEFAULT_ROUTE_ACCESS.find((routeAccess) =>
      hasRouteAccess(routeAccess.access, permissions)
    )?.path || '/login/access'
  );
};
