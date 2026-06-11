import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { CONFIG } from '../../../../config';
import {
  ApiResponse,
  PaginatedResponse,
} from '../../shared/models/api-response.model';
import {
  CompanyProfile,
  UpdateCompanyProfilePayload,
} from '../../shared/models/company.model';
import {
  Appointment,
  Bill,
  Category,
  CloseRegisterPayload,
  CreateSalePayload,
  CreateSaleResponse,
  DashboardSummary,
  DataTablesResponse,
  Department,
  Doctor,
  DoctorMedicine,
  Hospital,
  ListResult,
  Patient,
  PatientHistory,
  Payment,
  ProductCatalogItem,
  Prescription,
  OpenRegisterPayload,
  RegisterSession,
  RegisterSessionSummary,
  Role,
  Room,
  RoomAllotment,
  Sale,
  Store,
  User,
} from '../../shared/models/hospital.model';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  constructor(private http: HttpClient) { }

  private cleanParams(params?: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }

      httpParams = httpParams.set(key, String(value));
    });

    return httpParams;
  }

  private get<T>(url: string, params?: Record<string, unknown>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(url, {
      params: this.cleanParams(params),
    });
  }

  private post<T>(url: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(url, this.cleanBody(body));
  }

  private patch<T>(url: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(url, this.cleanBody(body));
  }

  private delete<T>(url: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(url);
  }

  private cleanBody(body: unknown): unknown {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return body;
    }

    return Object.fromEntries(
      Object.entries(body as Record<string, unknown>).filter(
        ([, value]) => value !== undefined
      )
    );
  }

  unwrapList<T>(response: ApiResponse<PaginatedResponse<T>>): T[] {
    return response.data?.items || [];
  }

  unwrapPagination<T>(response: ApiResponse<PaginatedResponse<T>>) {
    return response.data?.pagination;
  }

  unwrapData<T>(response: ApiResponse<T>): T {
    return response.data;
  }

  toDataTablesParams(dataTablesParameters?: any): Record<string, unknown> {
    const length = Number(dataTablesParameters?.length || 10);
    const start = Number(dataTablesParameters?.start || 0);

    return {
      page: Math.floor(start / length) + 1,
      limit: length,
      search: dataTablesParameters?.search?.value || '',
    };
  }

  toDataTablesResponse<T>(
    result: ListResult<T> | T[],
    fallbackTotal?: number
  ): DataTablesResponse<T> {
    const items = Array.isArray(result) ? result : result.items;
    const total = Array.isArray(result)
      ? fallbackTotal ?? result.length
      : result.pagination.total;

    return {
      data: {
        data: items,
        recordsTotal: total,
        recordsFiltered: total,
      },
    };
  }

  login(payload: { email: string; password: string }): Observable<ApiResponse<{ token: string; user: User }>> {
    return this.post<{ token: string; user: User }>(CONFIG.auth.login, payload);
  }

  getMe(): Observable<User> {
    return this.get<User>(CONFIG.auth.me).pipe(map((response) => this.unwrapData(response)));
  }

  getMyCompany(): Observable<CompanyProfile> {
    return this.get<CompanyProfile>(`${CONFIG.companies}/me`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  updateMyCompany(payload: UpdateCompanyProfilePayload): Observable<ApiResponse<CompanyProfile>> {
    return this.patch<CompanyProfile>(`${CONFIG.companies}/me`, payload);
  }

  forgetPass(payload: { email: string }): Observable<any> {
    return of({
      message: 'Password reset is not enabled for this backend yet.',
      data: { email: payload.email },
    });
  }

  verifyOtp(payload: {
    email: string;
    otp: string;
    newPassword?: string;
  }): Observable<any> {
    return of({
      message: 'OTP flow is not enabled for this backend yet.',
      data: payload,
    });
  }

  changePass(payload: {
    newPassword: string;
    oldPassword: string;
  }): Observable<any> {
    return of({
      message: 'Password change is not enabled for this backend yet.',
      data: payload,
    });
  }

  getHospitalDashboardSummary(): Observable<DashboardSummary> {
    return this.get<DashboardSummary>(CONFIG.hospitalDashboard.summary).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getHospitals(params?: Record<string, unknown>): Observable<ListResult<Hospital>> {
    return this.get<PaginatedResponse<Hospital>>(CONFIG.hospitals, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getHospital(id: string): Observable<Hospital> {
    return this.get<Hospital>(`${CONFIG.hospitals}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createHospital(payload: Record<string, unknown>): Observable<ApiResponse<Hospital>> {
    return this.post<Hospital>(CONFIG.hospitals, payload);
  }

  updateHospital(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Hospital>> {
    return this.patch<Hospital>(`${CONFIG.hospitals}/${id}`, payload);
  }

  deleteHospital(id: string): Observable<ApiResponse<Hospital>> {
    return this.delete<Hospital>(`${CONFIG.hospitals}/${id}`);
  }

  getDepartments(params?: Record<string, unknown>): Observable<ListResult<Department>> {
    return this.get<PaginatedResponse<Department>>(CONFIG.departments, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getDepartment(id: string): Observable<Department> {
    return this.get<Department>(`${CONFIG.departments}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createDepartment(payload: Partial<Department>): Observable<ApiResponse<Department>> {
    return this.post<Department>(CONFIG.departments, payload);
  }

  updateDepartment(id: string, payload: Partial<Department>): Observable<ApiResponse<Department>> {
    return this.patch<Department>(`${CONFIG.departments}/${id}`, payload);
  }

  deleteDepartment(id: string): Observable<ApiResponse<Department>> {
    return this.delete<Department>(`${CONFIG.departments}/${id}`);
  }

  getDoctors(params?: Record<string, unknown>): Observable<ListResult<Doctor>> {
    return this.get<PaginatedResponse<Doctor>>(CONFIG.doctors, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getDoctor(id: string): Observable<Doctor> {
    return this.get<Doctor>(`${CONFIG.doctors}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createDoctor(payload: Record<string, unknown>): Observable<ApiResponse<Doctor>> {
    return this.post<Doctor>(CONFIG.doctors, payload);
  }

  updateDoctor(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Doctor>> {
    return this.patch<Doctor>(`${CONFIG.doctors}/${id}`, payload);
  }

  deleteDoctor(id: string): Observable<ApiResponse<Doctor>> {
    return this.delete<Doctor>(`${CONFIG.doctors}/${id}`);
  }

  getDoctorPatients(id: string, params?: Record<string, unknown>): Observable<ListResult<Patient>> {
    return this.get<PaginatedResponse<Patient>>(`${CONFIG.doctors}/${id}/patients`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getDoctorAppointments(id: string, params?: Record<string, unknown>): Observable<ListResult<Appointment>> {
    return this.get<PaginatedResponse<Appointment>>(
      `${CONFIG.doctors}/${id}/appointments`,
      params
    ).pipe(map((response) => this.unwrapData(response)));
  }

  getPatients(params?: Record<string, unknown>): Observable<ListResult<Patient>> {
    return this.get<PaginatedResponse<Patient>>(CONFIG.patients, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPatient(id: string): Observable<Patient> {
    return this.get<Patient>(`${CONFIG.patients}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPatientProfile(id: string): Observable<Patient> {
    return this.get<Patient>(`${CONFIG.patients}/${id}/profile`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createPatient(payload: Record<string, unknown>): Observable<ApiResponse<Patient>> {
    return this.post<Patient>(CONFIG.patients, payload);
  }

  updatePatient(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Patient>> {
    return this.patch<Patient>(`${CONFIG.patients}/${id}`, payload);
  }

  deletePatient(id: string): Observable<ApiResponse<Patient>> {
    return this.delete<Patient>(`${CONFIG.patients}/${id}`);
  }

  getPatientHistory(id: string, params?: Record<string, unknown>): Observable<ListResult<PatientHistory>> {
    return this.get<PaginatedResponse<PatientHistory>>(`${CONFIG.patients}/${id}/history`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPatientPrescriptions(id: string, params?: Record<string, unknown>): Observable<ListResult<Prescription>> {
    return this.get<PaginatedResponse<Prescription>>(
      `${CONFIG.patients}/${id}/prescriptions`,
      params
    ).pipe(map((response) => this.unwrapData(response)));
  }

  getPatientBills(id: string, params?: Record<string, unknown>): Observable<ListResult<Bill>> {
    return this.get<PaginatedResponse<Bill>>(`${CONFIG.patients}/${id}/bills`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPatientHistoryRecords(params?: Record<string, unknown>): Observable<ListResult<PatientHistory>> {
    return this.get<PaginatedResponse<PatientHistory>>(CONFIG.patientHistory, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createPatientHistory(payload: Record<string, unknown>): Observable<ApiResponse<PatientHistory>> {
    return this.post<PatientHistory>(CONFIG.patientHistory, payload);
  }

  updatePatientHistory(id: string, payload: Record<string, unknown>): Observable<ApiResponse<PatientHistory>> {
    return this.patch<PatientHistory>(`${CONFIG.patientHistory}/${id}`, payload);
  }

  deletePatientHistory(id: string): Observable<ApiResponse<PatientHistory>> {
    return this.delete<PatientHistory>(`${CONFIG.patientHistory}/${id}`);
  }

  getAppointments(params?: Record<string, unknown>): Observable<ListResult<Appointment>> {
    return this.get<PaginatedResponse<Appointment>>(CONFIG.appointments, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getAppointment(id: string): Observable<Appointment> {
    return this.get<Appointment>(`${CONFIG.appointments}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getAppointmentCalendar(params?: Record<string, unknown>): Observable<Appointment[]> {
    return this.get<Appointment[]>(`${CONFIG.appointments}/calendar`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createAppointment(payload: Record<string, unknown>): Observable<ApiResponse<Appointment>> {
    return this.post<Appointment>(CONFIG.appointments, payload);
  }

  updateAppointment(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Appointment>> {
    return this.patch<Appointment>(`${CONFIG.appointments}/${id}`, payload);
  }

  updateAppointmentStatus(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Appointment>> {
    return this.patch<Appointment>(`${CONFIG.appointments}/${id}/status`, payload);
  }

  deleteAppointment(id: string): Observable<ApiResponse<Appointment>> {
    return this.delete<Appointment>(`${CONFIG.appointments}/${id}`);
  }

  getPrescriptions(params?: Record<string, unknown>): Observable<ListResult<Prescription>> {
    return this.get<PaginatedResponse<Prescription>>(CONFIG.prescriptions, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPrescription(id: string): Observable<Prescription> {
    return this.get<Prescription>(`${CONFIG.prescriptions}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createPrescription(payload: Record<string, unknown>): Observable<ApiResponse<Prescription>> {
    return this.post<Prescription>(CONFIG.prescriptions, payload);
  }

  updatePrescription(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Prescription>> {
    return this.patch<Prescription>(`${CONFIG.prescriptions}/${id}`, payload);
  }

  deletePrescription(id: string): Observable<ApiResponse<Prescription>> {
    return this.delete<Prescription>(`${CONFIG.prescriptions}/${id}`);
  }

  getDoctorMedicines(params?: Record<string, unknown>): Observable<DoctorMedicine[]> {
    return this.get<DoctorMedicine[]>(`${CONFIG.prescriptions}/doctor-medicines`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createDoctorMedicine(payload: Record<string, unknown>): Observable<ApiResponse<DoctorMedicine>> {
    return this.post<DoctorMedicine>(`${CONFIG.prescriptions}/doctor-medicines`, payload);
  }

  getCategories(params?: Record<string, unknown>): Observable<ListResult<Category>> {
    return this.get<PaginatedResponse<Category>>(CONFIG.categories, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createCategory(payload: Record<string, unknown>): Observable<ApiResponse<Category>> {
    return this.post<Category>(CONFIG.categories, payload);
  }

  getProducts(params?: Record<string, unknown>): Observable<ListResult<ProductCatalogItem>> {
    return this.get<PaginatedResponse<ProductCatalogItem>>(CONFIG.products, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPrescriptionProductSuggestions(params?: Record<string, unknown>): Observable<ListResult<ProductCatalogItem>> {
    return this.get<PaginatedResponse<ProductCatalogItem>>(`${CONFIG.products}/prescription-suggestions`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createProduct(payload: Record<string, unknown>): Observable<ApiResponse<ProductCatalogItem>> {
    return this.post<ProductCatalogItem>(CONFIG.products, payload);
  }

  updateProduct(id: string, payload: Record<string, unknown>): Observable<ApiResponse<ProductCatalogItem>> {
    return this.patch<ProductCatalogItem>(`${CONFIG.products}/${id}`, payload);
  }

  deleteProduct(id: string): Observable<ApiResponse<ProductCatalogItem>> {
    return this.delete<ProductCatalogItem>(`${CONFIG.products}/${id}`);
  }

  adjustInventory(payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.post<unknown>(`${CONFIG.inventory}/adjust`, payload);
  }

  getStores(params?: Record<string, unknown>): Observable<ListResult<Store>> {
    return this.get<PaginatedResponse<Store>>(CONFIG.stores, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createSale(payload: CreateSalePayload): Observable<ApiResponse<CreateSaleResponse>> {
    return this.post<CreateSaleResponse>(CONFIG.sales, payload);
  }

  getSales(params?: Record<string, unknown>): Observable<ListResult<Sale>> {
    return this.get<PaginatedResponse<Sale>>(CONFIG.sales, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getCurrentRegister(params?: Record<string, unknown>): Observable<RegisterSession | null> {
    return this.get<{ registerSession: RegisterSession | null }>(`${CONFIG.registerSessions}/current`, params).pipe(
      map((response) => response.data?.registerSession || null)
    );
  }

  openRegister(payload: OpenRegisterPayload): Observable<ApiResponse<{ registerSession: RegisterSession }>> {
    return this.post<{ registerSession: RegisterSession }>(`${CONFIG.registerSessions}/open`, payload);
  }

  closeRegister(
    id: string,
    payload: CloseRegisterPayload
  ): Observable<ApiResponse<{ registerSession: RegisterSession; summary?: RegisterSessionSummary }>> {
    return this.post<{ registerSession: RegisterSession; summary?: RegisterSessionSummary }>(
      `${CONFIG.registerSessions}/${id}/close`,
      payload
    );
  }

  getRooms(params?: Record<string, unknown>): Observable<ListResult<Room>> {
    return this.get<PaginatedResponse<Room>>(CONFIG.rooms, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getRoom(id: string): Observable<Room> {
    return this.get<Room>(`${CONFIG.rooms}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createRoom(payload: Record<string, unknown>): Observable<ApiResponse<Room>> {
    return this.post<Room>(CONFIG.rooms, payload);
  }

  updateRoom(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Room>> {
    return this.patch<Room>(`${CONFIG.rooms}/${id}`, payload);
  }

  deleteRoom(id: string): Observable<ApiResponse<Room>> {
    return this.delete<Room>(`${CONFIG.rooms}/${id}`);
  }

  getRoomAllotments(params?: Record<string, unknown>): Observable<ListResult<RoomAllotment>> {
    return this.get<PaginatedResponse<RoomAllotment>>(CONFIG.roomAllotments, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getRoomAllotment(id: string): Observable<RoomAllotment> {
    return this.get<RoomAllotment>(`${CONFIG.roomAllotments}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createRoomAllotment(payload: Record<string, unknown>): Observable<ApiResponse<RoomAllotment>> {
    return this.post<RoomAllotment>(CONFIG.roomAllotments, payload);
  }

  dischargeRoomAllotment(id: string, payload: Record<string, unknown>): Observable<ApiResponse<RoomAllotment>> {
    return this.patch<RoomAllotment>(`${CONFIG.roomAllotments}/${id}/discharge`, payload);
  }

  getBills(params?: Record<string, unknown>): Observable<ListResult<Bill>> {
    return this.get<PaginatedResponse<Bill>>(CONFIG.bills, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getBill(id: string): Observable<Bill> {
    return this.get<Bill>(`${CONFIG.bills}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createBill(payload: Record<string, unknown>): Observable<ApiResponse<Bill>> {
    return this.post<Bill>(CONFIG.bills, payload);
  }

  updateBillPayment(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Bill>> {
    return this.patch<Bill>(`${CONFIG.bills}/${id}/payment`, payload);
  }

  getPayments(params?: Record<string, unknown>): Observable<ListResult<Payment>> {
    return this.get<PaginatedResponse<Payment>>(CONFIG.payments, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPayment(id: string): Observable<Payment> {
    return this.get<Payment>(`${CONFIG.payments}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createPayment(payload: Record<string, unknown>): Observable<ApiResponse<Payment>> {
    return this.post<Payment>(CONFIG.payments, payload);
  }

  getRoles(params?: Record<string, unknown>): Observable<Role[]> {
    return this.get<Role[]>(CONFIG.roles, params).pipe(map((response) => this.unwrapData(response)));
  }

  getRole(): Observable<{ data: Role[] }> {
    return this.getRoles().pipe(map((roles) => ({ data: roles })));
  }

  createRole(payload: Record<string, unknown>): Observable<ApiResponse<Role>> {
    return this.post<Role>(CONFIG.roles, payload);
  }

  updateRole(
    id: string,
    payload: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Observable<ApiResponse<Role>> {
    const url = params ? `${CONFIG.roles}/${id}?${this.cleanParams(params).toString()}` : `${CONFIG.roles}/${id}`;
    return this.patch<Role>(url, payload);
  }

  deleteRole(id: string, params?: Record<string, unknown>): Observable<ApiResponse<Role>> {
    const url = params ? `${CONFIG.roles}/${id}?${this.cleanParams(params).toString()}` : `${CONFIG.roles}/${id}`;
    return this.delete<Role>(url);
  }

  getUsers(params?: Record<string, unknown>): Observable<User[]> {
    return this.get<User[]>(CONFIG.users, params).pipe(map((response) => this.unwrapData(response)));
  }

  getAllUsers(dataTablesParameters?: any): Observable<DataTablesResponse<User>> {
    return this.getUsers().pipe(
      map((users) => {
        const search = String(dataTablesParameters?.search?.value || '').toLowerCase();
        const filtered = search
          ? users.filter((user) =>
            [user.name, user.email, user.phone, user.role?.name, user.status]
              .join(' ')
              .toLowerCase()
              .includes(search)
          )
          : users;

        return this.toDataTablesResponse(filtered, users.length);
      })
    );
  }

  createUser(payload: Record<string, unknown>): Observable<ApiResponse<User>> {
    return this.post<User>(CONFIG.users, payload);
  }

  getUser(id: string, params?: Record<string, unknown>): Observable<User> {
    return this.get<User>(`${CONFIG.users}/${id}`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  updateUser(
    id: string,
    payload: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Observable<ApiResponse<User>> {
    const url = params ? `${CONFIG.users}/${id}?${this.cleanParams(params).toString()}` : `${CONFIG.users}/${id}`;
    return this.patch<User>(url, payload);
  }

  deleteUser(id: string, params?: Record<string, unknown>): Observable<ApiResponse<User>> {
    const url = params ? `${CONFIG.users}/${id}?${this.cleanParams(params).toString()}` : `${CONFIG.users}/${id}`;
    return this.delete<User>(url);
  }

  getAllNotes(): Observable<{ data: any[] }> {
    return of({
      data: JSON.parse(localStorage.getItem('mooli_notes') || '[]'),
    });
  }

  addNote(payload: Record<string, unknown>): Observable<{ message: string; data: any }> {
    const notes = JSON.parse(localStorage.getItem('mooli_notes') || '[]') as any[];
    const note = {
      _id: String(Date.now()),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    localStorage.setItem('mooli_notes', JSON.stringify([note, ...notes]));

    return of({
      message: 'Note added Successfully!',
      data: note,
    });
  }

  deleteNote(id: string): Observable<{ message: string }> {
    const notes = JSON.parse(localStorage.getItem('mooli_notes') || '[]') as any[];
    localStorage.setItem(
      'mooli_notes',
      JSON.stringify(notes.filter((note) => note._id !== id))
    );

    return of({
      message: 'Note deleted Successfully!',
    });
  }

  hasPermission(permission: string): boolean {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
    return permissions.includes('*') || permissions.includes(permission);
  }



}
