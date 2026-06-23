import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { CONFIG } from '../../../../config';
import { normalizeAccessKey, readStoredPermissions } from '../../modules/auth/access-control';
import {
  ApiResponse,
  PaginatedResponse,
  Pagination,
} from '../../shared/models/api-response.model';
import {
  CompanyProfile,
  UpdateCompanyProfilePayload,
} from '../../shared/models/company.model';
import {
  Appointment,
  Bill,
  Category,
  ChargeCatalogItem,
  CloseRegisterPayload,
  Customer,
  CreateHeldSalePayload,
  CreateSalesReturnPayload,
  CreateSalePayload,
  CreateSaleResponse,
  DashboardSummary,
  DataTablesResponse,
  Department,
  Doctor,
  DoctorMedicine,
  Encounter,
  EncounterLedger,
  Expense,
  Hospital,
  ListResult,
  Patient,
  PatientHistory,
  PatientLastVisit,
  Payment,
  ProductCatalogItem,
  Prescription,
  LabOrder,
  LabTestCatalog,
  LabDashboardStats,
  LabComparisonRow,
  LabSettingsResponse,
  HospitalWard,
  WardFloor,
  HeldSale,
  LedgerItem,
  LedgerPayment,
  AuditLog,
  OpenRegisterPayload,
  RegisterSession,
  RegisterSessionDetail,
  RegisterSessionSummary,
  Role,
  Room,
  RoomAllotment,
  Sale,
  StockMovement,
  Store,
  RestoreHeldSaleResponse,
  SalesReturn,
  Supplier,
  Transfer,
  User,
  Warehouse,
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

  private unwrapListResult<T>(
    response: ApiResponse<PaginatedResponse<T> | T[] | Record<string, unknown>>
  ): ListResult<T> {
    const data = response.data as unknown;

    if (Array.isArray(data)) {
      return {
        items: data as T[],
        pagination: {
          page: 1,
          limit: data.length,
          total: data.length,
          totalPages: 1,
        },
      };
    }

    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (Array.isArray(record['items'])) {
        return {
          items: record['items'] as T[],
          pagination: (record['pagination'] as Pagination) || {
            page: 1,
            limit: (record['items'] as T[]).length,
            total: (record['items'] as T[]).length,
            totalPages: 1,
          },
        };
      }
      if (Array.isArray(record['data'])) {
        const items = record['data'] as T[];
        return {
          items,
          pagination: {
            page: 1,
            limit: items.length,
            total: items.length,
            totalPages: 1,
          },
        };
      }
    }

    return {
      items: [],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        totalPages: 0,
      },
    };
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

  updateMe(payload: {
    name?: string;
    email?: string;
    phone?: string;
  }): Observable<ApiResponse<User>> {
    return this.patch<User>(CONFIG.auth.me, payload);
  }

  getMyCompany(): Observable<CompanyProfile> {
    return this.get<CompanyProfile>(`${CONFIG.companies}/me`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  updateMyCompany(payload: UpdateCompanyProfilePayload): Observable<ApiResponse<CompanyProfile>> {
    return this.patch<CompanyProfile>(`${CONFIG.companies}/me`, payload);
  }

  forgetPass(payload: { email: string }): Observable<
    ApiResponse<{ expiresInSeconds: number; resendAfterSeconds: number }>
  > {
    return this.post<{ expiresInSeconds: number; resendAfterSeconds: number }>(
      CONFIG.auth.forgotPassword,
      payload
    );
  }

  verifyOtp(payload: {
    email: string;
    otp: string;
    newPassword: string;
  }): Observable<ApiResponse<null>> {
    return this.post<null>(CONFIG.auth.resetPassword, payload);
  }

  changePass(payload: {
    currentPassword: string;
    newPassword: string;
  }): Observable<ApiResponse<null>> {
    return this.patch<null>(CONFIG.auth.changePassword, payload);
  }

  getHospitalDashboardSummary(): Observable<DashboardSummary> {
    return this.get<DashboardSummary>(CONFIG.hospitalDashboard.summary).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getDoctorDashboardSummary(): Observable<DashboardSummary> {
    return this.get<DashboardSummary>(CONFIG.hospitalDashboard.doctorSummary).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  sendDoctorDailySummaryEmail(payload?: { doctorId?: string; date?: string }): Observable<ApiResponse<{
    recipientEmail: string;
    doctorName: string;
    date: string;
    shiftLabel: string;
    totalPatients: number;
    checkedPatients: number;
    netCollected: number;
  }>> {
    return this.post(CONFIG.hospitalDashboard.doctorSummaryEmail, payload || {});
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

  getMyDoctorProfile(): Observable<Doctor> {
    return this.get<Doctor>(`${CONFIG.doctors}/me`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createDoctor(payload: Record<string, unknown>): Observable<ApiResponse<Doctor>> {
    return this.post<Doctor>(CONFIG.doctors, payload);
  }

  updateDoctor(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Doctor>> {
    return this.patch<Doctor>(`${CONFIG.doctors}/${id}`, payload);
  }

  updateMyPrescriptionTemplate(payload: { prescriptionTemplate: string }): Observable<ApiResponse<Doctor>> {
    return this.patch<Doctor>(`${CONFIG.doctors}/me/prescription-template`, payload);
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

  getPatientLastVisit(
    patientId: string,
    params?: Record<string, unknown>
  ): Observable<PatientLastVisit> {
    return this.get<PatientLastVisit>(`${CONFIG.appointments}/patients/${patientId}/last-visit`, params).pipe(
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

  getLabTests(params?: Record<string, unknown>): Observable<ListResult<LabTestCatalog>> {
    return this.get<PaginatedResponse<LabTestCatalog>>(`${CONFIG.laboratory}/tests`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createLabTest(payload: Record<string, unknown>): Observable<ApiResponse<LabTestCatalog>> {
    return this.post<LabTestCatalog>(`${CONFIG.laboratory}/tests`, payload);
  }

  updateLabTest(id: string, payload: Record<string, unknown>): Observable<ApiResponse<LabTestCatalog>> {
    return this.patch<LabTestCatalog>(`${CONFIG.laboratory}/tests/${id}`, payload);
  }

  seedDefaultLabTests(): Observable<ApiResponse<{ seeded: number }>> {
    return this.post<{ seeded: number }>(`${CONFIG.laboratory}/tests/seed-defaults`, {});
  }

  getLabDashboardStats(params?: Record<string, unknown>): Observable<LabDashboardStats> {
    return this.get<LabDashboardStats>(`${CONFIG.laboratory}/dashboard/stats`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getLabSettings(): Observable<LabSettingsResponse> {
    return this.get<LabSettingsResponse>(`${CONFIG.laboratory}/settings`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  updateLabSettings(payload: Record<string, unknown>): Observable<ApiResponse<LabSettingsResponse>> {
    return this.patch<LabSettingsResponse>(`${CONFIG.laboratory}/settings`, payload);
  }

  getLabOrders(params?: Record<string, unknown>): Observable<ListResult<LabOrder>> {
    return this.get<PaginatedResponse<LabOrder>>(`${CONFIG.laboratory}/orders`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getLabOrder(id: string): Observable<LabOrder> {
    return this.get<LabOrder>(`${CONFIG.laboratory}/orders/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createLabOrder(payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.post<LabOrder>(`${CONFIG.laboratory}/orders`, payload);
  }

  updateLabOrder(id: string, payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.patch<LabOrder>(`${CONFIG.laboratory}/orders/${id}`, payload);
  }

  addTestsToLabOrder(id: string, payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.post<LabOrder>(`${CONFIG.laboratory}/orders/${id}/tests`, payload);
  }

  collectLabSample(id: string, payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.post<LabOrder>(`${CONFIG.laboratory}/orders/${id}/collect-sample`, payload);
  }

  rejectLabSample(orderId: string, sampleId: string, payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.post<LabOrder>(`${CONFIG.laboratory}/orders/${orderId}/samples/${sampleId}/reject`, payload);
  }

  saveLabItemResults(orderId: string, itemId: string, payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.post<LabOrder>(`${CONFIG.laboratory}/orders/${orderId}/items/${itemId}/results`, payload);
  }

  uploadLabItemReport(orderId: string, itemId: string, payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.post<LabOrder>(`${CONFIG.laboratory}/orders/${orderId}/items/${itemId}/upload-report`, payload);
  }

  verifyLabOrderItem(orderId: string, itemId: string, payload: Record<string, unknown>): Observable<ApiResponse<LabOrder>> {
    return this.post<LabOrder>(`${CONFIG.laboratory}/orders/${orderId}/items/${itemId}/verify`, payload);
  }

  getPatientLabComparison(patientId: string, params?: Record<string, unknown>): Observable<LabComparisonRow[]> {
    return this.get<LabComparisonRow[]>(`${CONFIG.laboratory}/patients/${patientId}/comparison`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPatientLabHistory(patientId: string): Observable<LabOrder[]> {
    return this.get<LabOrder[]>(`${CONFIG.laboratory}/patients/${patientId}/history`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getCategories(params?: Record<string, unknown>): Observable<ListResult<Category>> {
    return this.get<PaginatedResponse<Category>>(CONFIG.categories, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createCategory(payload: Record<string, unknown>): Observable<ApiResponse<Category>> {
    return this.post<Category>(CONFIG.categories, payload);
  }

  getCustomers(params?: Record<string, unknown>): Observable<ListResult<Customer>> {
    return this.get<PaginatedResponse<Customer>>(CONFIG.customers, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createCustomer(payload: Record<string, unknown>): Observable<ApiResponse<Customer>> {
    return this.post<Customer>(CONFIG.customers, payload);
  }

  updateCustomer(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Customer>> {
    return this.patch<Customer>(`${CONFIG.customers}/${id}`, payload);
  }

  deleteCustomer(id: string): Observable<ApiResponse<Customer>> {
    return this.delete<Customer>(`${CONFIG.customers}/${id}`);
  }

  getSuppliers(params?: Record<string, unknown>): Observable<ListResult<Supplier>> {
    return this.get<PaginatedResponse<Supplier>>(CONFIG.suppliers, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createSupplier(payload: Record<string, unknown>): Observable<ApiResponse<Supplier>> {
    return this.post<Supplier>(CONFIG.suppliers, payload);
  }

  updateSupplier(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Supplier>> {
    return this.patch<Supplier>(`${CONFIG.suppliers}/${id}`, payload);
  }

  deleteSupplier(id: string): Observable<ApiResponse<Supplier>> {
    return this.delete<Supplier>(`${CONFIG.suppliers}/${id}`);
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

  getWarehouses(params?: Record<string, unknown>): Observable<ListResult<Warehouse>> {
    return this.get<PaginatedResponse<Warehouse>>(CONFIG.warehouses, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getStockMovements(params?: Record<string, unknown>): Observable<ListResult<StockMovement>> {
    return this.get<PaginatedResponse<StockMovement>>(CONFIG.stockMovements, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createSale(payload: CreateSalePayload): Observable<ApiResponse<CreateSaleResponse>> {
    return this.post<CreateSaleResponse>(CONFIG.sales, payload);
  }

  getSaleById(id: string): Observable<Sale> {
    return this.get<Sale>(`${CONFIG.sales}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getSales(params?: Record<string, unknown>): Observable<ListResult<Sale>> {
    return this.get<PaginatedResponse<Sale>>(CONFIG.sales, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  cancelSale(id: string): Observable<ApiResponse<Sale>> {
    return this.post<Sale>(`${CONFIG.sales}/${id}/cancel`, {});
  }

  createHeldSale(payload: CreateHeldSalePayload): Observable<ApiResponse<HeldSale>> {
    return this.post<HeldSale>(`${CONFIG.sales}/holds`, payload);
  }

  listHeldSales(params?: Record<string, unknown>): Observable<ListResult<HeldSale>> {
    return this.get<PaginatedResponse<HeldSale>>(`${CONFIG.sales}/holds`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  restoreHeldSale(id: string): Observable<RestoreHeldSaleResponse> {
    return this.post<RestoreHeldSaleResponse>(`${CONFIG.sales}/holds/${id}/restore`, {}).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  deleteHeldSale(id: string): Observable<ApiResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`${CONFIG.sales}/holds/${id}`);
  }

  createSalesReturn(payload: CreateSalesReturnPayload): Observable<SalesReturn> {
    return this.post<SalesReturn | { salesReturn?: SalesReturn }>(CONFIG.returns.sales, payload).pipe(
      map((response) => {
        const data = response.data;
        return ('salesReturn' in data ? data.salesReturn : data) as SalesReturn;
      })
    );
  }

  listSalesReturns(params?: Record<string, unknown>): Observable<ListResult<SalesReturn>> {
    return this.get<PaginatedResponse<SalesReturn>>(CONFIG.returns.sales, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getDashboardReport(params?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(CONFIG.reports.dashboard, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getSalesReport(params?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(CONFIG.reports.sales, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getInventoryReport(params?: Record<string, unknown>): Observable<unknown[] | Record<string, unknown>> {
    return this.get<unknown[] | Record<string, unknown>>(CONFIG.reports.inventory, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getProfitLossReport(params?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(CONFIG.reports.profitLoss, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getStockMovementsReport(params?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(CONFIG.reports.stockMovements, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getPaymentsReport(params?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(CONFIG.reports.payments, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getExpensesReport(params?: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(CONFIG.reports.expenses, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getCurrentRegister(params?: Record<string, unknown>): Observable<RegisterSession | null> {
    return this.get<{ registerSession: RegisterSession | null }>(`${CONFIG.registerSessions}/current`, params).pipe(
      map((response) => response.data?.registerSession || null)
    );
  }

  getRegisterSessions(params?: Record<string, unknown>): Observable<ListResult<RegisterSession>> {
    return this.get<PaginatedResponse<RegisterSession>>(CONFIG.registerSessions, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getRegisterSessionById(id: string): Observable<RegisterSessionDetail> {
    return this.get<RegisterSessionDetail>(`${CONFIG.registerSessions}/${id}`).pipe(
      map((response) => this.unwrapData(response))
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

  getTransfers(params?: Record<string, unknown>): Observable<ListResult<Transfer>> {
    return this.get<PaginatedResponse<Transfer>>(CONFIG.transfers, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getTransferById(id: string): Observable<Transfer> {
    return this.get<Transfer>(`${CONFIG.transfers}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createTransfer(payload: Record<string, unknown>): Observable<ApiResponse<Transfer>> {
    return this.post<Transfer>(CONFIG.transfers, payload);
  }

  approveTransfer(id: string): Observable<ApiResponse<Transfer>> {
    return this.post<Transfer>(`${CONFIG.transfers}/${id}/approve`, {});
  }

  dispatchTransfer(id: string): Observable<ApiResponse<Transfer>> {
    return this.post<Transfer>(`${CONFIG.transfers}/${id}/dispatch`, {});
  }

  receiveTransfer(id: string): Observable<ApiResponse<Transfer>> {
    return this.post<Transfer>(`${CONFIG.transfers}/${id}/receive`, {});
  }

  cancelTransfer(id: string): Observable<ApiResponse<Transfer>> {
    return this.post<Transfer>(`${CONFIG.transfers}/${id}/cancel`, {});
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

  getHospitalWards(params?: Record<string, unknown>): Observable<ListResult<HospitalWard>> {
    return this.get<PaginatedResponse<HospitalWard> | HospitalWard[]>(CONFIG.hospitalWards, params).pipe(
      map((response) => this.unwrapListResult(response))
    );
  }

  createHospitalWard(payload: Record<string, unknown>): Observable<ApiResponse<HospitalWard>> {
    return this.post<HospitalWard>(CONFIG.hospitalWards, payload);
  }

  updateHospitalWard(id: string, payload: Record<string, unknown>): Observable<ApiResponse<HospitalWard>> {
    return this.patch<HospitalWard>(`${CONFIG.hospitalWards}/${id}`, payload);
  }

  deleteHospitalWard(id: string): Observable<ApiResponse<HospitalWard>> {
    return this.delete<HospitalWard>(`${CONFIG.hospitalWards}/${id}`);
  }

  getWardFloors(wardId: string, params?: Record<string, unknown>): Observable<ListResult<WardFloor>> {
    return this.get<PaginatedResponse<WardFloor> | WardFloor[]>(
      `${CONFIG.hospitalWards}/${wardId}/floors`,
      params
    ).pipe(map((response) => this.unwrapListResult(response)));
  }

  createWardFloor(wardId: string, payload: Record<string, unknown>): Observable<ApiResponse<WardFloor>> {
    return this.post<WardFloor>(`${CONFIG.hospitalWards}/${wardId}/floors`, payload);
  }

  updateWardFloor(
    wardId: string,
    floorId: string,
    payload: Record<string, unknown>
  ): Observable<ApiResponse<WardFloor>> {
    return this.patch<WardFloor>(`${CONFIG.hospitalWards}/${wardId}/floors/${floorId}`, payload);
  }

  deleteWardFloor(wardId: string, floorId: string): Observable<ApiResponse<WardFloor>> {
    return this.delete<WardFloor>(`${CONFIG.hospitalWards}/${wardId}/floors/${floorId}`);
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

  transferRoomAllotment(id: string, payload: Record<string, unknown>): Observable<ApiResponse<RoomAllotment>> {
    return this.patch<RoomAllotment>(`${CONFIG.roomAllotments}/${id}/transfer`, payload);
  }

  assignNurseToAllotment(id: string, payload: Record<string, unknown>): Observable<ApiResponse<RoomAllotment>> {
    return this.patch<RoomAllotment>(`${CONFIG.roomAllotments}/${id}/assign-nurse`, payload);
  }

  getWardBeds(params?: Record<string, unknown>): Observable<ListResult<Record<string, unknown>>> {
    return this.get<PaginatedResponse<Record<string, unknown>>>(`${CONFIG.ward}/beds`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createWardBed(payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(`${CONFIG.ward}/beds`, payload);
  }

  updateWardBed(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.patch<Record<string, unknown>>(`${CONFIG.ward}/beds/${id}`, payload);
  }

  deleteWardBed(id: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.delete<Record<string, unknown>>(`${CONFIG.ward}/beds/${id}`);
  }

  getWardActivities(params?: Record<string, unknown>): Observable<ListResult<Record<string, unknown>>> {
    return this.get<PaginatedResponse<Record<string, unknown>>>(`${CONFIG.ward}/activities`, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createWardActivity(payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(`${CONFIG.ward}/activities`, payload);
  }

  updateWardActivity(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.patch<Record<string, unknown>>(`${CONFIG.ward}/activities/${id}`, payload);
  }

  createWardAdmission(payload: Record<string, unknown>): Observable<ApiResponse<RoomAllotment>> {
    return this.post<RoomAllotment>(`${CONFIG.ward}/admissions`, payload);
  }

  recordWardVitals(payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(`${CONFIG.ward}/vitals`, payload);
  }

  recordWardDose(payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(`${CONFIG.ward}/mar/record-dose`, payload);
  }

  wardDripAction(payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(`${CONFIG.ward}/drips/action`, payload);
  }

  createWardOrder(payload: Record<string, unknown>): Observable<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(`${CONFIG.ward}/orders`, payload);
  }

  getWardReports(): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(`${CONFIG.ward}/reports`).pipe(
      map((response) => this.unwrapData(response))
    );
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

  getEncounters(params?: Record<string, unknown>): Observable<ListResult<Encounter>> {
    return this.get<PaginatedResponse<Encounter>>(CONFIG.encounters, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getEncounter(id: string): Observable<Encounter> {
    return this.get<Encounter>(`${CONFIG.encounters}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getEncounterLedger(id: string): Observable<EncounterLedger> {
    return this.get<EncounterLedger>(`${CONFIG.encounters}/${id}/ledger`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createEncounterFromAppointment(appointmentId: string): Observable<ApiResponse<Encounter>> {
    return this.post<Encounter>(`${CONFIG.encounters}/from-appointment`, { appointmentId });
  }

  addEncounterLedgerItem(encounterId: string, payload: Record<string, unknown>): Observable<ApiResponse<LedgerItem>> {
    return this.post<LedgerItem>(`${CONFIG.encounters}/${encounterId}/ledger-items`, payload);
  }

  recordEncounterPayment(encounterId: string, payload: Record<string, unknown>): Observable<ApiResponse<LedgerPayment>> {
    return this.post<LedgerPayment>(`${CONFIG.encounters}/${encounterId}/payments`, payload);
  }

  getChargeCatalog(params?: Record<string, unknown>): Observable<ListResult<ChargeCatalogItem>> {
    return this.get<PaginatedResponse<ChargeCatalogItem>>(`${CONFIG.encounters}/charge-catalog`, params).pipe(
      map((response) => this.unwrapData(response))
    );
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

  getExpenses(params?: Record<string, unknown>): Observable<ListResult<Expense>> {
    return this.get<PaginatedResponse<Expense>>(CONFIG.expenses, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  createExpense(payload: Record<string, unknown>): Observable<ApiResponse<Expense>> {
    return this.post<Expense>(CONFIG.expenses, payload);
  }

  updateExpense(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Expense>> {
    return this.patch<Expense>(`${CONFIG.expenses}/${id}`, payload);
  }

  deleteExpense(id: string): Observable<ApiResponse<Expense>> {
    return this.delete<Expense>(`${CONFIG.expenses}/${id}`);
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
    const normalizedPermission = normalizeAccessKey(permission);
    const permissions = readStoredPermissions();
    const normalizedPermissions = new Set(
      permissions.map((storedPermission) => normalizeAccessKey(storedPermission))
    );

    return normalizedPermissions.has('*') || normalizedPermissions.has(normalizedPermission);
  }

  getAuditLogs(params?: Record<string, unknown>): Observable<ListResult<AuditLog>> {
    return this.get<PaginatedResponse<AuditLog>>(CONFIG.auditLogs, params).pipe(
      map((response) => this.unwrapData(response))
    );
  }

  getAuditLogById(id: string): Observable<AuditLog> {
    return this.get<AuditLog>(`${CONFIG.auditLogs}/${id}`).pipe(
      map((response) => this.unwrapData(response))
    );
  }

}
