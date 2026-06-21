export const API_BASE_URL = 'https://hmsbackend-faizan99904.fly.dev/api/v1';

// Previous combined backend:
// export const API_BASE_URL = 'https://posbackend-faizan99904.fly.dev/api/v1';
// export const API_BASE_URL = 'http://localhost:3001/api/v1';

export const CONFIG = {
  auth: {
    login: API_BASE_URL + '/auth/login',
    me: API_BASE_URL + '/auth/me',
    changePassword: API_BASE_URL + '/auth/change-password',
    forgotPassword: API_BASE_URL + '/auth/forgot-password',
    resetPassword: API_BASE_URL + '/auth/reset-password',
  },

  hospitalDashboard: {
    summary: API_BASE_URL + '/hospital-dashboard/summary',
    doctorSummary: API_BASE_URL + '/hospital-dashboard/doctor-summary',
  },

  hospitals: API_BASE_URL + '/hospitals',
  companies: API_BASE_URL + '/companies',
  departments: API_BASE_URL + '/departments',
  doctors: API_BASE_URL + '/doctors',
  patients: API_BASE_URL + '/patients',
  patientHistory: API_BASE_URL + '/patient-history',
  appointments: API_BASE_URL + '/appointments',
  prescriptions: API_BASE_URL + '/prescriptions',
  laboratory: API_BASE_URL + '/laboratory',
  categories: API_BASE_URL + '/categories',
  customers: API_BASE_URL + '/customers',
  suppliers: API_BASE_URL + '/suppliers',
  products: API_BASE_URL + '/products',
  inventory: API_BASE_URL + '/inventory',
  stockMovements: API_BASE_URL + '/stock-movements',
  rooms: API_BASE_URL + '/rooms',
  roomAllotments: API_BASE_URL + '/room-allotments',
  ward: API_BASE_URL + '/ward',
  bills: API_BASE_URL + '/bills',
  encounters: API_BASE_URL + '/encounters',
  payments: API_BASE_URL + '/payments',
  sales: API_BASE_URL + '/sales',
  returns: {
    sales: API_BASE_URL + '/returns/sales',
  },
  registerSessions: API_BASE_URL + '/register-sessions',
  transfers: API_BASE_URL + '/transfers',
  warehouses: API_BASE_URL + '/warehouses',
  expenses: API_BASE_URL + '/expenses',
  reports: {
    dashboard: API_BASE_URL + '/reports/dashboard',
    sales: API_BASE_URL + '/reports/sales',
    inventory: API_BASE_URL + '/reports/inventory',
    profitLoss: API_BASE_URL + '/reports/profit-loss',
    stockMovements: API_BASE_URL + '/reports/stock-movements',
    payments: API_BASE_URL + '/reports/payments',
    expenses: API_BASE_URL + '/reports/expenses',
  },
  users: API_BASE_URL + '/users',
  roles: API_BASE_URL + '/roles',
  auditLogs: API_BASE_URL + '/audit-logs',
  stores: API_BASE_URL + '/stores',
};
