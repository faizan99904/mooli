// const BASE_URL_API = 'https://hospital-backend-jfr5.onrender.com';
const BASE_URL_API = 'https://hospital-backend-red-log-7860.fly.dev';

export const CONFIG = {
  login: BASE_URL_API + '/api/auth/login',
  forgetPass: BASE_URL_API + '/api/forgetpassword',
  verifyOtp: BASE_URL_API + '/api/verifyotp',
  getAllUsers: BASE_URL_API + '/api/users/getAllUsers',
  createUser: BASE_URL_API + '/api/users/createuser',
  getAllRole: BASE_URL_API + '/api/users/getAllRole',
  getAllNotes: BASE_URL_API + '/api/note/getAllNote',
  addNotes: BASE_URL_API + '/api/note/addNote',
  changePass: BASE_URL_API + '/api/auth/changepassword',
  deleteNote: BASE_URL_API + '/api/note/deleteNote/:id',
};
