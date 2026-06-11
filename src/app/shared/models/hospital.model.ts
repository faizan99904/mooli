import { Pagination } from './api-response.model';

export type Status = 'active' | 'inactive';

export interface Role {
  _id: string;
  companyId?: string | null;
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
  experienceYears?: number;
  consultationFee?: number;
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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string | null;
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
  vitals?: Record<string, string> | null;
  advice?: string | null;
  followUpDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
