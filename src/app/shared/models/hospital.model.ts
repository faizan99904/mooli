import { Pagination } from './api-response.model';

export type Status = 'active' | 'inactive';
export type PrescriptionTemplate =
  | 'classic'
  | 'clinical-blue'
  | 'minimal-teal'
  | 'compact-mono';

export interface Role {
  _id: string;
  companyId?: string | null;
  hospitalId?: string | null;
  context?: 'pos' | 'hospital';
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole?: boolean;
  isActive?: boolean;
}

export interface User {
  _id: string;
  companyId?: string;
  hospitalId?: string | null;
  hospital?: Hospital | null;
  storeId?: string | null;
  warehouseId?: string | null;
  roleId?: string;
  name: string;
  email: string;
  phone?: string | null;
  status?: string;
  role?: Role | null;
}

export interface PrescriptionPrintSettings {
  showLogo: boolean;
  revisionNote?: string | null;
  followUpLine?: string | null;
  contactLine?: string | null;
  footerLines: string[];
}

export interface Store {
  _id: string;
  companyId: string;
  hospitalId?: string | null;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  managerName?: string | null;
  isActive: boolean;
}

export interface Category {
  _id: string;
  companyId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  parentCategoryId?: string | null;
  isActive?: boolean;
}

export interface Hospital {
  _id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  logoUrl?: string | null;
  status: Status;
  subscriptionPlan?: string | null;
  prescriptionSettings?: PrescriptionPrintSettings | null;
}

export interface Department {
  _id: string;
  hospitalId: string;
  name: string;
  description?: string | null;
  status: Status;
}

export interface Doctor {
  _id: string;
  hospitalId: string;
  userId: string;
  user?: User | null;
  departmentId?: string | null;
  department?: Department | null;
  specialization?: string | null;
  qualification?: string | null;
  nameUrdu?: string | null;
  experienceYears?: number;
  consultationFee?: number;
  prescriptionTemplate?: PrescriptionTemplate;
  availableDays?: string[];
  availableSlots?: Array<{ day: string; startTime: string; endTime: string }>;
  status: Status;
}

export interface Patient {
  _id: string;
  hospitalId: string;
  patientNo: string;
  assignedDoctorId: string;
  assignedDoctor?: User | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  status: 'active' | 'inactive' | 'deceased';
  createdAt?: string;
}

export interface PatientHistory {
  _id: string;
  hospitalId: string;
  patientId: string;
  patient?: Patient | null;
  doctorId: string;
  doctor?: User | null;
  appointmentId?: string | null;
  sourcePrescriptionId?: string | null;
  recordType?: 'clinical' | 'laboratory' | 'ward';
  title?: string | null;
  diagnosis?: string | null;
  symptoms?: string | null;
  notes?: string | null;
  vitals?: Record<string, string>;
  attachments?: Array<{ name?: string; url: string }>;
  createdAt?: string;
}

export interface Appointment {
  _id: string;
  hospitalId: string;
  appointmentNo: string;
  patientId: string;
  patient?: Patient | null;
  doctorId: string;
  doctor?: User | null;
  departmentId?: string | null;
  department?: Department | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
  visitType?: 'Consultation' | 'Follow-up' | 'Walk-in' | 'Emergency' | string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  consultationFee?: number;
  paymentStatus?: 'unpaid' | 'paid';
  vitals?: Record<string, string>;
  notes?: string | null;
  createdAt?: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  afterMeal?: boolean;
  beforeMeal?: boolean;
  morning?: boolean;
  morningDose?: string;
  noon?: boolean;
  noonDose?: string;
  evening?: boolean;
  eveningDose?: string;
  night?: boolean;
  nightDose?: string;
  instructions?: string;
}

export interface DoctorMedicine extends PrescriptionMedicine {
  _id: string;
  hospitalId: string;
  doctorId: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrescriptionLabTest {
  name: string;
  category?: string;
  selected?: boolean;
}

export interface PrescriptionIvFluid {
  name: string;
  rate?: string;
  duration?: string;
  route?: string;
  status?: 'running' | 'completed' | 'planned';
  startDateTime?: string;
}

export interface AdmissionOrderItem {
  order: string;
  category?: string;
  orderedOn?: string;
  priority?: 'normal' | 'high';
  status?: 'active' | 'planned' | 'completed';
}

export interface PatientDocumentItem {
  name: string;
  type?: string;
  uploadedOn?: string;
  uploadedBy?: string;
  url?: string;
}

export interface Prescription {
  _id: string;
  hospitalId: string;
  patientId: string;
  patient?: Patient | null;
  doctorId: string;
  doctor?: User | null;
  appointmentId?: string | null;
  appointment?: Appointment | null;
  medicines: PrescriptionMedicine[];
  chiefComplaint?: string | null;
  history?: string | null;
  examination?: string | null;
  diagnosis?: string | null;
  visitType?: 'opd' | 'follow_up' | string | null;
  labTests?: PrescriptionLabTest[];
  ivFluids?: PrescriptionIvFluid[];
  admissionOrders?: {
    roomType?: string;
    bed?: string;
    regularDiet?: boolean;
    npo?: boolean;
    consultation?: string;
    monitoring?: {
      bp?: boolean;
      pulse?: boolean;
      spo2?: boolean;
      rbs?: boolean;
    };
    notes?: string;
  } | null;
  admissionOrderItems?: AdmissionOrderItem[];
  patientDocuments?: PatientDocumentItem[];
  vitals?: Record<string, string> | null;
  advice?: string | null;
  followUpDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type LabOrderSource = 'doctor' | 'walk-in' | 'admission' | 'emergency';
export type LabOrderStatus =
  | 'ordered'
  | 'sample_collected'
  | 'processing'
  | 'result_entered'
  | 'verified'
  | 'completed'
  | 'cancelled';
export type LabParameterStatus = 'low' | 'normal' | 'high' | 'critical';
export type LabParameterTrend = 'improved' | 'worsened' | 'stable' | 'unknown';

export interface LabTestParameterTemplate {
  parameterName: string;
  unit?: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
  referenceText?: string;
  criticalMin?: number | null;
  criticalMax?: number | null;
  sortOrder?: number;
}

export interface LabTestCatalog {
  _id: string;
  hospitalId: string;
  name: string;
  shortCode: string;
  department: string;
  sampleType: string;
  tubeType?: string;
  price: number;
  reportType: 'structured' | 'uploaded_report' | 'both';
  turnaroundHours?: number;
  requiresFasting?: boolean;
  parameters: LabTestParameterTemplate[];
  isActive: boolean;
}

export interface LabResultParameter {
  _id?: string;
  parameterName: string;
  resultValue?: string;
  unit?: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
  referenceText?: string;
  status?: LabParameterStatus;
  previousValue?: string;
  changeValue?: string;
  changePercent?: number | null;
  trend?: LabParameterTrend;
}

export interface LabReportFile {
  _id?: string;
  fileUrl: string;
  fileType: 'pdf' | 'image';
  reportType?: string;
  reportDate?: string;
  status?: 'pending' | 'verified';
}

export interface LabOrderItem {
  _id: string;
  testId?: string | null;
  testName: string;
  shortCode?: string;
  department?: string;
  sampleType?: string;
  tubeType?: string;
  price: number;
  status: LabOrderStatus;
  resultMode: 'structured' | 'uploaded_report' | 'both';
  parameters: LabResultParameter[];
  reportFiles: LabReportFile[];
  remarks?: string;
  collectedAt?: string;
  resultEnteredAt?: string;
  verifiedAt?: string;
  addedLater?: boolean;
}

export interface LabOrder {
  _id: string;
  hospitalId: string;
  orderNo: string;
  patientId: string;
  patient?: Patient | null;
  prescriptionId?: string | null;
  appointmentId?: string | null;
  source: LabOrderSource;
  doctorId?: string | null;
  doctor?: User | null;
  referredBy?: string;
  status: LabOrderStatus;
  priority: 'normal' | 'urgent';
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  sampleCollectionAt?: string;
  notes?: string;
  items: LabOrderItem[];
  criticalAlerts?: Array<{
    testName: string;
    parameterName: string;
    resultValue: string;
    message: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabDashboardStats {
  pendingOrders: number;
  sampleCollected: number;
  resultPending: number;
  readyToVerify: number;
  completedToday: number;
}

export interface LabComparisonRow {
  testName: string;
  parameterName: string;
  unit?: string;
  referenceText?: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
  history: Array<{
    orderId: string;
    orderNo: string;
    date?: string;
    resultValue?: string;
    status?: LabParameterStatus;
    trend?: LabParameterTrend;
  }>;
}

export interface Room {
  _id: string;
  hospitalId: string;
  roomNo: string;
  roomType: 'general' | 'private' | 'icu' | 'emergency' | 'operation_theater';
  floor?: string | null;
  chargesPerDay: number;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface RoomAllotment {
  _id: string;
  hospitalId: string;
  patientId: string;
  patient?: Patient | null;
  roomId: string;
  room?: Room | null;
  encounterId?: string | null;
  consultantDoctorId?: string | null;
  bedLabel?: string;
  admissionReason?: string;
  admittedAt: string;
  dischargedAt?: string | null;
  status: 'admitted' | 'discharged';
  notes?: string | null;
}

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface Bill {
  _id: string;
  hospitalId: string;
  patientId: string;
  patient?: Patient | null;
  appointmentId?: string | null;
  appointment?: Appointment | null;
  billNo: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EncounterSummary {
  totalCharges: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  totalRefunded: number;
  balance: number;
}

export interface Encounter {
  _id: string;
  hospitalId: string;
  patientId: string;
  patient?: Patient | null;
  encounterNo: string;
  type: 'opd' | 'admission' | 'emergency' | 'follow_up';
  status: 'open' | 'admitted' | 'ready_for_discharge' | 'discharged' | 'closed' | 'cancelled';
  appointmentId?: string | null;
  roomAllotmentId?: string | null;
  prescriptionId?: string | null;
  consultantDoctorId?: string | null;
  roomId?: string | null;
  room?: Room | null;
  wardLabel?: string;
  bedLabel?: string;
  admissionReason?: string;
  openedAt?: string;
  closedAt?: string | null;
  summary?: EncounterSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface LedgerItem {
  _id: string;
  encounterId: string;
  patientId: string;
  sourceType: string;
  sourceId?: string;
  category: string;
  title: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  discount: number;
  netAmount: number;
  status: 'active' | 'cancelled' | 'refunded';
  reason?: string;
  createdAt?: string;
}

export interface LedgerPayment {
  _id: string;
  encounterId: string;
  patientId: string;
  paymentNo: string;
  amount: number;
  method: string;
  type: 'advance' | 'partial' | 'final' | 'refund';
  note?: string;
  referenceNo?: string;
  createdAt?: string;
}

export interface EncounterLedger {
  encounter: Encounter;
  items: LedgerItem[];
  payments: LedgerPayment[];
}

export interface ChargeCatalogItem {
  _id: string;
  name: string;
  code?: string;
  category: string;
  defaultAmount: number;
  isOptional: boolean;
  manualAmountAllowed: boolean;
  reasonRequired: boolean;
  department?: string;
  active: boolean;
}

export interface Payment {
  _id: string;
  referenceType: string;
  referenceId: string;
  method: string;
  amount: string;
  paymentDate: string;
  referenceNo: string;
}

export type ProductDiscountType = 'amount' | 'percentage';

export interface ProductCatalogItem {
  _id: string;
  companyId?: string;
  categoryId?: string | null;
  name: string;
  sku: string;
  barcode?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  mfdDate?: string | null;
  description?: string | null;
  strengthValue?: string | null;
  strengthUnit?: string | null;
  brand?: string | null;
  unit?: string | null;
  costPrice?: string | null;
  sellingPrice?: string | null;
  reorderLevel?: string | null;
  storeId?: string | null;
  stockQuantity?: string | null;
  reservedQuantity?: string | null;
  availableQuantity?: string | null;
  discountEligible?: boolean;
  maxDiscountType?: ProductDiscountType | null;
  maxDiscountValue?: number | string | null;
  stockScopeCity?: string | null;
  stockLocationCount?: number;
  isActive?: boolean;
}

export type SalePaymentMethod = 'cash' | 'card' | 'bank' | 'online' | 'wallet' | 'check';
export type SaleStatus = 'draft' | 'quotation' | 'suspended' | 'completed' | 'cancelled' | 'returned';

export interface SaleItem {
  productId: string;
  name?: string;
  sku?: string;
  qty: string | number;
  unitPrice?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;
}

export interface Sale {
  _id: string;
  companyId?: string;
  storeId: string;
  customerId?: string | null;
  userId?: string;
  registerSessionId?: string | null;
  invoiceNo: string;
  saleDate: string;
  items: SaleItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paidAmount: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  status: SaleStatus;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSalePayload {
  storeId: string;
  customerId?: string;
  saleDate: string;
  items: SaleItem[];
  status?: 'draft' | 'quotation' | 'suspended' | 'completed';
  registerSessionId?: string;
  paidAmount?: string | number;
  paymentMethod?: SalePaymentMethod;
  paymentReferenceNo?: string;
  note?: string;
}

export interface CreateSaleResponse {
  sale: Sale;
  payment?: Payment | null;
  payments?: Payment[];
}

export interface CreateHeldSalePayload {
  storeId: string;
  customerId?: string;
  items: SaleItem[];
  note?: string;
}

export interface HeldSale {
  _id: string;
  companyId?: string;
  storeId: string;
  customerId?: string | null;
  userId?: string;
  holdNo: string;
  items: SaleItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paidAmount?: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RestoreHeldSaleResponse {
  heldSale: HeldSale;
  salePayload: CreateSalePayload;
}

export interface ReturnItem {
  productId: string;
  name?: string;
  sku?: string;
  qty: number | string;
  unitPrice?: number | string;
  unitCost?: number | string;
  total?: number | string;
  reason?: string;
}

export interface SalesReturn {
  _id: string;
  companyId?: string;
  saleId: string;
  storeId: string;
  customerId?: string | null;
  returnNo: string;
  returnDate: string;
  items: ReturnItem[];
  total: number | string;
  refundAmount: number | string;
  status: string;
  createdBy?: string | null;
  createdAt?: string;
}

export interface CreateSalesReturnPayload {
  saleId: string;
  returnDate: string;
  items: Array<{
    productId: string;
    qty: number;
    reason?: string;
  }>;
  refundAmount?: number;
  paymentMethod?: Exclude<SalePaymentMethod, 'check'>;
  paymentReferenceNo?: string;
}

export interface RegisterSessionSummary {
  salesCount: number;
  totalSales: number | string;
  cashSales: number | string;
  cardSales: number | string;
  checkSales: number | string;
  bankSales: number | string;
  onlineSales: number | string;
  walletSales: number | string;
  creditSales: number | string;
  partialSales: number | string;
  totalPaid: number | string;
  totalUnpaidBalance: number | string;
  totalExpenses: number | string;
  cashExpenses: number | string;
  expectedCashInDrawer: number | string;
}

export interface RegisterSession {
  _id: string;
  companyId: string;
  storeId: string;
  cashierId: string;
  businessDate: string;
  openingAmount: number | string;
  openingNote?: string | null;
  openedAt: string;
  status: 'open' | 'closed';
  closingAmount?: number | string | null;
  expectedCashAmount?: number | string | null;
  cashDifference?: number | string | null;
  closeNote?: string | null;
  closedAt?: string | null;
  summary?: RegisterSessionSummary;
  store?: Pick<Store, '_id' | 'name' | 'code' | 'phone' | 'email' | 'address' | 'city'> | null;
  cashier?: Pick<User, '_id' | 'name' | 'email' | 'phone'> | null;
}

export interface OpenRegisterPayload {
  storeId: string;
  businessDate?: string;
  openingAmount: number;
  openingNote?: string;
}

export interface CloseRegisterPayload {
  closingAmount: number;
  closeNote?: string;
}

export interface DashboardSummary {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  recentPatients: Patient[];
  upcomingAppointments: Appointment[];
}

export interface DataTablesResponse<T> {
  data: {
    data: T[];
    recordsTotal: number;
    recordsFiltered: number;
  };
}

export interface ListResult<T> {
  items: T[];
  pagination: Pagination;
}
