export const API_BASE_URL = 'https://posbackend-faizan99904.fly.dev/api/v1';

// export const API_BASE_URL = 'http://localhost:3000/api/v1';

export const CONFIG = {
  auth: {
    login: API_BASE_URL + '/auth/login',
    me: API_BASE_URL + '/auth/me',
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
  payments: API_BASE_URL + '/payments',
  sales: API_BASE_URL + '/sales',
  registerSessions: API_BASE_URL + '/register-sessions',
  users: API_BASE_URL + '/users',
  roles: API_BASE_URL + '/roles',
  stores: API_BASE_URL + '/stores',
};
