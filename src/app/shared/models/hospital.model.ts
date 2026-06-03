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
  noon?: boolean;
  evening?: boolean;
  night?: boolean;
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
