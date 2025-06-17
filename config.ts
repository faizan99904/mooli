const BASE_URL_API = 'https://hospital-backend-jfr5.onrender.com';
// const BASE_URL_API = 'https://hospital-backend-red-log-7860.fly.dev';

export const CONFIG = {
  login: BASE_URL_API + '/api/auth/login',
  forgetPass: BASE_URL_API + '/api/forgetpassword',
  verifyOtp: BASE_URL_API + '/api/verifyotp',
  getAllUsers: BASE_URL_API + '/api/users/getalluser',
};
