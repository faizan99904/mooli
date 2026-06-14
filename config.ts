export const API_BASE_URL = 'https://posbackend-faizan99904.fly.dev/api/v1';

// export const API_BASE_URL = 'http://localhost:3000/api/v1';

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
  },

  hospitals: API_BASE_URL + '/hospitals',
  companies: API_BASE_URL + '/companies',
  departments: API_BASE_URL + '/departments',
  doctors: API_BASE_URL + '/doctors',
  patients: API_BASE_URL + '/patients',
  patientHistory: API_BASE_URL + '/patient-history',
  appointments: API_BASE_URL + '/appointments',
  prescriptions: API_BASE_URL + '/prescriptions',
  categories: API_BASE_URL + '/categories',
  products: API_BASE_URL + '/products',
  inventory: API_BASE_URL + '/inventory',
  rooms: API_BASE_URL + '/rooms',
  roomAllotments: API_BASE_URL + '/room-allotments',
  bills: API_BASE_URL + '/bills',
  encounters: API_BASE_URL + '/encounters',
  payments: API_BASE_URL + '/payments',
  sales: API_BASE_URL + '/sales',
  returns: {
    sales: API_BASE_URL + '/returns/sales',
  },
  registerSessions: API_BASE_URL + '/register-sessions',
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
  stores: API_BASE_URL + '/stores',
};
