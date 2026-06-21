import { Routes } from '@angular/router';
import { LayoutComponent } from '../../layout/layout.component';
import { SignupComponent } from './pages/signup/signup.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DoctorDashboardComponent } from './doctor-dashboard/doctor-dashboard.component';
import { EmailComponent } from './email/email.component';
import { ChatComponent } from './chat/chat.component';
import { ChartsComponent } from './charts/charts.component';
import { TodoListComponent } from './todo-list/todo-list.component';
import { FilemanagerComponent } from './filemanager/filemanager.component';
import { ContactsComponent } from './contacts/contacts.component';
import { BlogComponent } from './blog/blog.component';
import { SocialComponent } from './social/social.component';
import { SettingsComponent } from './settings/settings.component';
import { ComposeEmailComponent } from './email/compose-email/compose-email.component';
import { ComposeEmailDetailsComponent } from './email/compose-email-details/compose-email-details.component';
import { InvoicesComponent } from './payments/invoices/invoices.component';
import { InvoiceDetailComponent } from './payments/invoices/invoice-detail/invoice-detail.component';
import { PaymentsComponent } from './payments/payments.component';
import { AddpaymentsComponent } from './payments/addpayments/addpayments.component';
import { EncounterLedgerComponent } from './payments/encounter-ledger/encounter-ledger.component';
import { DepartmentComponent } from './department/department.component';
import { OurCentersComponent } from './our-centers/our-centers.component';
import { OurStaffComponent } from './our-staff/our-staff.component';
import { AllotedRoomsComponent } from './room-allotment/alloted-rooms/alloted-rooms.component';
import { AddAllotmentComponent } from './room-allotment/add-allotment/add-allotment.component';
import { RoomAllotmentComponent } from './room-allotment/room-allotment.component';
import { PatientsComponent } from './patients/patients.component';
import { AllPatientsComponent } from './patients/all-patients/all-patients.component';
import { AddPatientComponent } from './patients/add-patient/add-patient.component';
import { PatientProfileComponent } from './patients/patient-profile/patient-profile.component';
import { PatientInvoicesComponent } from './patients/patient-invoices/patient-invoices.component';
import { AppointmentComponent } from './appointment/appointment.component';
import { DoctorsComponent } from './doctors/doctors.component';
import { AllDoctorsComponent } from './doctors/all-doctors/all-doctors.component';
import { AddDoctorsComponent } from './doctors/add-doctors/add-doctors.component';
import { DoctorsProfileComponent } from './doctors/doctors-profile/doctors-profile.component';
import { DoctorsScheduleComponent } from './doctors/doctors-schedule/doctors-schedule.component';
import { EventsComponent } from './doctors/doctors-schedule/events/events.component';
import { CovidComponent } from './dashboard/covid/covid.component';
import { authGuard } from '../auth/auth.guard';
import { roleGuard } from '../auth/role.guard';
import { UsersComponent } from './User/users/users.component';
import { CreateUserComponent } from './User/create-user/create-user.component';
import { HospitalsComponent } from './hospitals/hospitals.component'; 
import { CreateHospitalComponent } from './create-hospital/create-hospital.component';
import { RolesComponent } from './roles/roles.component';
import { CareRecordsComponent } from './care-records/care-records.component';
import { PrescriptionComponent } from './prescription/prescription.component';
import { CreatedPrescriptionsComponent } from './prescription/created-prescriptions.component';
import { CreatedLabReportsComponent } from './laboratory/created-lab-reports.component';
import { LabDashboardComponent } from './laboratory/lab-dashboard.component';
import { LabOrderCreateComponent } from './laboratory/lab-order-create.component';
import { LabTestCatalogComponent } from './laboratory/lab-test-catalog.component';
import { LabOrderDetailComponent } from './laboratory/lab-order-detail.component';
import { LabSettingsComponent } from './laboratory/lab-settings.component';
import { PharmacyComponent } from './pharmacy/pharmacy.component';
import { PharmacyProductsComponent } from './pharmacy-products/pharmacy-products.component';
import { PharmacyPosComponent } from './pharmacy-pos/pharmacy-pos.component';
import { PharmacyCustomersComponent } from './pharmacy-customers/pharmacy-customers.component';
import { PharmacySuppliersComponent } from './pharmacy-suppliers/pharmacy-suppliers.component';
import { PharmacyInventoryComponent } from './pharmacy-inventory/pharmacy-inventory.component';
import { PharmacyStockMovementsComponent } from './pharmacy-stock-movements/pharmacy-stock-movements.component';
import { PharmacySalesComponent } from './pharmacy-sales/pharmacy-sales.component';
import { PharmacySaleDetailComponent } from './pharmacy-sale-detail/pharmacy-sale-detail.component';
import { PharmacySalesReturnsComponent } from './pharmacy-sales-returns/pharmacy-sales-returns.component';
import { PharmacyPaymentsComponent } from './pharmacy-payments/pharmacy-payments.component';
import { PharmacyRegisterSessionsComponent } from './pharmacy-register-sessions/pharmacy-register-sessions.component';
import { PharmacyRegisterSessionDetailComponent } from './pharmacy-register-session-detail/pharmacy-register-session-detail.component';
import { PharmacyExpensesComponent } from './pharmacy-expenses/pharmacy-expenses.component';
import { PosReportsComponent } from './pos-reports/pos-reports.component';
import { AuditLogsComponent } from './audit-logs/audit-logs.component';
import { WardDashboardComponent } from './ward/ward-dashboard.component';
import { WardBedManagementComponent } from './ward/ward-bed-management.component';
import { WardPatientListComponent } from './ward/ward-patient-list.component';
import { WardModulePageComponent } from './ward/ward-module-page.component';
import { WardPatientDetailComponent } from './ward/ward-patient-detail.component';

const WILDCARD_ACCESS = ['*'];
const HOSPITAL_DASHBOARD_ACCESS = ['hospital_dashboard.read'];
const DOCTOR_READ_ACCESS = ['doctors.read'];
const DOCTOR_MANAGE_ACCESS = ['doctors.create', 'doctors.update'];
const APPOINTMENT_ACCESS = ['appointments.read'];
const PATIENT_READ_ACCESS = ['patients.read'];
const PATIENT_MANAGE_ACCESS = ['patients.create', 'patients.update'];
const BILL_READ_ACCESS = ['bills.read'];
const BILL_MANAGE_ACCESS = ['bills.create', 'bills.update_payment'];
const DEPARTMENT_ACCESS = ['departments.read'];
const ROOM_ACCESS = ['rooms.read', 'rooms.create', 'rooms.update'];
const ROOM_ALLOTMENT_READ_ACCESS = ['room_allotments.read'];
const ROOM_ALLOTMENT_MANAGE_ACCESS = {
  all: ['room_allotments.create', 'rooms.read', 'patients.read'],
};
const USER_READ_ACCESS = ['users.read'];
const USER_MANAGE_ACCESS = ['users.create', 'users.update'];
const HOSPITAL_READ_ACCESS = ['hospitals.read'];
const HOSPITAL_MANAGE_ACCESS = ['hospitals.create', 'hospitals.update'];
const ROLE_READ_ACCESS = ['roles.read'];
const AUDIT_LOGS_ACCESS = ['audit_logs.read'];
const HISTORY_ACCESS = ['patients_history.read', 'patients_history.create'];
const PRESCRIPTION_ACCESS = ['prescriptions.read', 'prescriptions.create'];
const PHARMACY_ACCESS = ['products.read'];
const PHARMACY_CUSTOMERS_ACCESS = ['customers.read'];
const PHARMACY_SUPPLIERS_ACCESS = ['suppliers.read'];
const PHARMACY_INVENTORY_ACCESS = ['inventory.read'];
const PHARMACY_STOCK_MOVEMENTS_ACCESS = ['stock_movements.read'];
const PHARMACY_SALES_ACCESS = ['sales.read'];
const PHARMACY_TRANSFERS_ACCESS = ['transfers.read'];
const PHARMACY_RETURNS_ACCESS = ['returns.read'];
const PHARMACY_PAYMENTS_ACCESS = ['payments.read'];
const PHARMACY_REGISTER_ACCESS = {
  any: ['register_sessions.read', 'register_sessions.admin_read'],
};
const PHARMACY_EXPENSES_ACCESS = ['expenses.read'];
const REPORT_ACCESS = {
  any: ['reports.read', 'sales.read', 'products.read', 'register_sessions.read'],
};
const PHARMACY_POS_ACCESS = {
  all: [
    'sales.create',
    'sales.read',
    'products.read',
    'register_sessions.open',
    'register_sessions.read',
    'register_sessions.close',
  ],
};
const LAB_ACCESS = ['lab_orders.read', 'lab_tests.read', 'patients_history.read'];
const LAB_MANAGE_ACCESS = ['lab_orders.create', 'lab_orders.update', 'lab_tests.create', 'patients_history.create'];
const WARD_ADMIN_ACCESS = ['patients_history.read'];

const wardModuleRoute = (path: string, title: string, wardModuleKey: string) => ({
  path,
  component: WardModulePageComponent,
  data: { title: `Mooli | ${title}`, wardModuleKey },
  canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
});

export const clientRoutes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { title: 'Mooli | Dashboard' },
        canActivate: [roleGuard(HOSPITAL_DASHBOARD_ACCESS)],
      },
      {
        path: 'doctor-dashboard',
        component: DoctorDashboardComponent,
        data: { title: 'Mooli | Doctor Dashboard' },
        canActivate: [roleGuard([])],
      },
      {
        path: 'app-inbox',
        component: EmailComponent,
        data: { title: 'Mooli | Inbox' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'app-chat',
        component: ChatComponent,
        data: { title: 'Mooli | Chat' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'chartelement',
        component: ChartsComponent,
        data: { title: 'Mooli | Chart-element' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'todolist',
        component: TodoListComponent,
        data: { title: 'Mooli | TodoList' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'filemanager',
        component: FilemanagerComponent,
        data: { title: 'Mooli | Filemanager' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'contacts',
        component: ContactsComponent,
        data: { title: 'Mooli | Contacts' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'blog',
        component: BlogComponent,
        data: { title: 'Mooli | Blog' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'social',
        component: SocialComponent,
        data: { title: 'Mooli | Social' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'settings',
        component: SettingsComponent,
        data: { title: 'Mooli | Settings' },
      },
      {
        path: 'composeemail',
        component: ComposeEmailComponent,
        data: { title: 'Mooli | ComposeEmail' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'composeemail/composeemail-details',
        component: ComposeEmailDetailsComponent,
        data: { title: 'Mooli | ComposeEmailDetails' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'doctorschedule/events',
        component: EventsComponent,
        data: { title: 'Mooli | Events' },
        canActivate: [roleGuard(DOCTOR_READ_ACCESS)],
      },
      {
        path: 'payments',
        component: PaymentsComponent,
        data: { title: 'Mooli | Payments' },
        canActivate: [roleGuard(BILL_READ_ACCESS)],
      },
      {
        path: 'payments/addpayment',
        component: AddpaymentsComponent,
        data: { title: 'Mooli | AddPayments' },
        canActivate: [roleGuard(BILL_MANAGE_ACCESS)],
      },
      {
        path: 'payments/ledger',
        component: EncounterLedgerComponent,
        data: { title: 'Mooli | Patient Ledger' },
        canActivate: [roleGuard(BILL_READ_ACCESS)],
      },
      {
        path: 'payments/invoices',
        component: InvoicesComponent,
        data: { title: 'Mooli | Invoices' },
        canActivate: [roleGuard(BILL_READ_ACCESS)],
      },
      {
        path: 'payments/invoices/invoice-detail/:id',
        component: InvoiceDetailComponent,
        data: { title: 'Mooli | InvoiceDetail' },
        canActivate: [roleGuard(BILL_READ_ACCESS)],
      },
      {
        path: 'payments/invoices/invoice-detail',
        pathMatch: 'full',
        redirectTo: 'payments/invoices',
      },

      {
        path: 'departments',
        component: DepartmentComponent,
        data: { title: 'Mooli | Departments' },
        canActivate: [roleGuard(DEPARTMENT_ACCESS)],
      },
      {
        path: 'our-centers',
        component: OurCentersComponent,
        data: { title: 'Mooli | OurCenters' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'our-staff',
        component: OurStaffComponent,
        data: { title: 'Mooli | OurStaff' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },
      {
        path: 'room-allotment',
        component: RoomAllotmentComponent,
        data: { title: 'Mooli | RoomAllotment' },
        canActivate: [roleGuard(ROOM_ACCESS)],
      },
      {
        path: 'room-allotment/alloted-rooms',
        component: AllotedRoomsComponent,
        data: { title: 'Mooli | AllotedRooms' },
        canActivate: [roleGuard(ROOM_ALLOTMENT_READ_ACCESS)],
      },
      {
        path: 'room-allotment/add-alloted-rooms',
        component: AddAllotmentComponent,
        data: { title: 'Mooli | Add-Allotment-Rooms' },
        canActivate: [roleGuard(ROOM_ALLOTMENT_MANAGE_ACCESS)],
      },
      {
        path: 'patients',
        component: PatientsComponent,
        data: { title: 'Mooli | Patients' },
        canActivate: [roleGuard(PATIENT_READ_ACCESS)],
      },
      {
        path: 'patients/all-patients',
        component: AllPatientsComponent,
        data: { title: 'Mooli | AllPatients' },
        canActivate: [roleGuard(PATIENT_READ_ACCESS)],
      },
      {
        path: 'patients/add-patient',
        component: AddPatientComponent,
        data: { title: 'Mooli | AddPatient' },
        canActivate: [roleGuard(PATIENT_MANAGE_ACCESS)],
      },
      {
        path: 'patients/patient-profile/:id',
        component: PatientProfileComponent,
        data: { title: 'Mooli | PatientProfile' },
        canActivate: [roleGuard(PATIENT_READ_ACCESS)],
      },
      {
        path: 'patients/patient-profile',
        pathMatch: 'full',
        redirectTo: 'patients/all-patients',
      },
      {
        path: 'patients/patient-invoices/:id',
        component: PatientInvoicesComponent,
        data: { title: 'Mooli | PatientInvoices' },
        canActivate: [roleGuard(BILL_READ_ACCESS)],
      },
      {
        path: 'patients/patient-invoices',
        pathMatch: 'full',
        redirectTo: 'patients/all-patients',
      },
      {
        path: 'appointments',
        component: AppointmentComponent,
        data: { title: 'Mooli | Appointment' },
        canActivate: [roleGuard(APPOINTMENT_ACCESS)],
      },
      {
        path: 'clinical-records',
        component: CareRecordsComponent,
        data: {
          title: 'Mooli | Clinical Records',
          pageTitle: 'Clinical Records',
          pageSubtitle: 'Doctor diagnosis, old notes, and follow-up entries',
          recordType: 'clinical',
        },
        canActivate: [roleGuard(HISTORY_ACCESS)],
      },
      {
        path: 'laboratory',
        component: LabDashboardComponent,
        data: { title: 'Mooli | Laboratory' },
        canActivate: [roleGuard(LAB_ACCESS)],
      },
      {
        path: 'laboratory/create-order',
        component: LabOrderCreateComponent,
        data: { title: 'Mooli | Create Lab Order' },
        canActivate: [roleGuard(LAB_MANAGE_ACCESS)],
      },
      {
        path: 'laboratory/catalog',
        component: LabTestCatalogComponent,
        data: { title: 'Mooli | Test Catalog' },
        canActivate: [roleGuard(LAB_ACCESS)],
      },
      {
        path: 'laboratory/settings',
        component: LabSettingsComponent,
        data: { title: 'Mooli | Laboratory Settings' },
        canActivate: [roleGuard(LAB_MANAGE_ACCESS)],
      },
      {
        path: 'laboratory/orders/:id/edit',
        component: LabOrderCreateComponent,
        data: { title: 'Mooli | Edit Lab Order' },
        canActivate: [roleGuard(LAB_MANAGE_ACCESS)],
      },
      {
        path: 'laboratory/orders/:id',
        component: LabOrderDetailComponent,
        data: { title: 'Mooli | Lab Order' },
        canActivate: [roleGuard(LAB_ACCESS)],
      },
      {
        path: 'laboratory/created-reports',
        component: CreatedLabReportsComponent,
        data: { title: 'Mooli | Created Lab Reports' },
        canActivate: [roleGuard(LAB_ACCESS)],
      },
      {
        path: 'laboratory/records',
        component: CareRecordsComponent,
        data: {
          title: 'Mooli | Laboratory Records',
          pageTitle: 'Laboratory Records',
          pageSubtitle: 'Legacy free-text laboratory notes',
          recordType: 'laboratory',
        },
        canActivate: [roleGuard(HISTORY_ACCESS)],
      },
      {
        path: 'ward',
        redirectTo: 'ward/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'ward/dashboard',
        component: WardDashboardComponent,
        data: { title: 'Mooli | Ward Admin Dashboard' },
        canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
      },
      {
        path: 'ward/patient-detail/:admissionId',
        component: WardPatientDetailComponent,
        data: { title: 'Mooli | Patient Detail' },
        canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
      },
      {
        path: 'ward/bed-management',
        component: WardBedManagementComponent,
        data: { title: 'Mooli | Bed Management' },
        canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
      },
      {
        path: 'ward/patient-list',
        component: WardPatientListComponent,
        data: { title: 'Mooli | Patient List' },
        canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
      },
      wardModuleRoute('ward/admissions', 'Admissions', 'admissions'),
      wardModuleRoute('ward/nursing-care', 'Nursing Care', 'nursing-care'),
      wardModuleRoute('ward/mar', 'MAR / Medications', 'mar'),
      wardModuleRoute('ward/drips-iv', 'Drips / IV Fluids', 'drips-iv'),
      wardModuleRoute('ward/vitals', 'Vitals & Observations', 'vitals'),
      wardModuleRoute('ward/io-chart', 'I/O Chart', 'io-chart'),
      wardModuleRoute('ward/orders-services', 'Orders & Services', 'orders-services'),
      wardModuleRoute('ward/shift-handover', 'Shift Handover', 'shift-handover'),
      {
        path: 'ward/nurses-staff',
        component: OurStaffComponent,
        data: { title: 'Mooli | Nurses & Staff' },
        canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
      },
      wardModuleRoute('ward/inventory', 'Ward Inventory', 'inventory'),
      wardModuleRoute('ward/reports', 'Ward Reports', 'reports'),
      {
        path: 'ward-admin',
        component: CareRecordsComponent,
        data: {
          title: 'Mooli | Ward Admin Notes',
          pageTitle: 'Ward Admin Notes',
          pageSubtitle: 'Admitted patients, drip notes, and ward treatment updates',
          recordType: 'ward',
        },
        canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
      },
      {
        path: 'prescriptions/created',
        component: CreatedPrescriptionsComponent,
        data: { title: 'Mooli | Created Prescriptions' },
        canActivate: [roleGuard(PRESCRIPTION_ACCESS)],
      },
      {
        path: 'prescriptions',
        component: PrescriptionComponent,
        data: { title: 'Mooli | Prescriptions' },
        canActivate: [roleGuard(PRESCRIPTION_ACCESS)],
      },
      {
        path: 'pharmacy/products',
        component: PharmacyProductsComponent,
        data: { title: 'Mooli | Product Management' },
        canActivate: [roleGuard(PHARMACY_ACCESS)],
      },
      {
        path: 'pharmacy/customers',
        component: PharmacyCustomersComponent,
        data: { title: 'Mooli | Pharmacy Customers' },
        canActivate: [roleGuard(PHARMACY_CUSTOMERS_ACCESS)],
      },
      {
        path: 'pharmacy/suppliers',
        component: PharmacySuppliersComponent,
        data: { title: 'Mooli | Pharmacy Suppliers' },
        canActivate: [roleGuard(PHARMACY_SUPPLIERS_ACCESS)],
      },
      {
        path: 'pharmacy/inventory',
        component: PharmacyInventoryComponent,
        data: { title: 'Mooli | Pharmacy Inventory' },
        canActivate: [roleGuard(PHARMACY_INVENTORY_ACCESS)],
      },
      {
        path: 'pharmacy/stock-movements',
        component: PharmacyStockMovementsComponent,
        data: { title: 'Mooli | Pharmacy Stock Movements' },
        canActivate: [roleGuard(PHARMACY_STOCK_MOVEMENTS_ACCESS)],
      },
      {
        path: 'pharmacy/sales',
        component: PharmacySalesComponent,
        data: { title: 'Mooli | Pharmacy Sales' },
        canActivate: [roleGuard(PHARMACY_SALES_ACCESS)],
      },
      {
        path: 'pharmacy/sales/:id',
        component: PharmacySaleDetailComponent,
        data: { title: 'Mooli | Pharmacy Sale Detail' },
        canActivate: [roleGuard(PHARMACY_SALES_ACCESS)],
      },
      {
        path: 'pharmacy/pos',
        component: PharmacyPosComponent,
        data: { title: 'Mooli | Pharmacy POS' },
        canActivate: [roleGuard(PHARMACY_POS_ACCESS)],
      },
      {
        path: 'pharmacy/returns/sales',
        component: PharmacySalesReturnsComponent,
        data: { title: 'Mooli | Pharmacy Sales Returns' },
        canActivate: [roleGuard(PHARMACY_RETURNS_ACCESS)],
      },
      {
        path: 'pharmacy/payments',
        component: PharmacyPaymentsComponent,
        data: { title: 'Mooli | Pharmacy Payments' },
        canActivate: [roleGuard(PHARMACY_PAYMENTS_ACCESS)],
      },
      {
        path: 'pharmacy/register-sessions',
        component: PharmacyRegisterSessionsComponent,
        data: { title: 'Mooli | Pharmacy Register Sessions' },
        canActivate: [roleGuard(PHARMACY_REGISTER_ACCESS)],
      },
      {
        path: 'pharmacy/register-sessions/:id',
        component: PharmacyRegisterSessionDetailComponent,
        data: { title: 'Mooli | Pharmacy Register Session Detail' },
        canActivate: [roleGuard(PHARMACY_REGISTER_ACCESS)],
      },
      {
        path: 'pharmacy/expenses',
        component: PharmacyExpensesComponent,
        data: { title: 'Mooli | Pharmacy Expenses' },
        canActivate: [roleGuard(PHARMACY_EXPENSES_ACCESS)],
      },
      {
        path: 'pos-reports',
        component: PosReportsComponent,
        data: { title: 'Mooli | POS Reports' },
        canActivate: [roleGuard(REPORT_ACCESS)],
      },
      {
        path: 'pharmacy',
        component: PharmacyComponent,
        data: { title: 'Mooli | Pharmacy' },
        canActivate: [roleGuard(PHARMACY_ACCESS)],
      },
      {
        path: 'doctors',
        component: DoctorsComponent,
        data: { title: 'Mooli | Doctors' },
        canActivate: [roleGuard(DOCTOR_READ_ACCESS)],
      },
      {
        path: 'all-doctors',
        component: AllDoctorsComponent,
        data: { title: 'Mooli | AllDoctors' },
        canActivate: [roleGuard(DOCTOR_READ_ACCESS)],
      },
      {
        path: 'add-doctors',
        component: AddDoctorsComponent,
        data: { title: 'Mooli | AddDoctors' },
        canActivate: [roleGuard(DOCTOR_MANAGE_ACCESS)],
      },
      {
        path: 'doctors-profile/:id',
        component: DoctorsProfileComponent,
        data: { title: 'Mooli | DoctorsProfile' },
        canActivate: [roleGuard(DOCTOR_READ_ACCESS)],
      },
      {
        path: 'doctors-profile',
        pathMatch: 'full',
        redirectTo: 'all-doctors',
      },
      {
        path: 'doctors-schedule',
        component: DoctorsScheduleComponent,
        data: { title: 'Mooli | DoctorsSchedule' },
        canActivate: [roleGuard(DOCTOR_READ_ACCESS)],
      },
      {
        path: 'covid-19',
        component: CovidComponent,
        data: { title: 'Mooli | Covid-19' },
        canActivate: [roleGuard(WILDCARD_ACCESS)],
      },

      {
        path: 'users',
        component: UsersComponent,
        data: { title: 'Mooli | Users' },
        canActivate: [roleGuard(USER_READ_ACCESS)],
      },

      {
        path: 'create-user',
        component: CreateUserComponent,
        data: { title: 'Mooli | Add Users' },
        canActivate: [roleGuard(USER_MANAGE_ACCESS)],
      },
      {
        path: 'hospitals',
        component: HospitalsComponent,
        data: { title: 'Mooli | Hospitals' },
        canActivate: [roleGuard(HOSPITAL_READ_ACCESS)],
      },
      {
        path: 'create-hospital',
        component: CreateHospitalComponent,
        data: { title: 'Mooli | Add Hospital' },
        canActivate: [roleGuard(HOSPITAL_MANAGE_ACCESS)],
      },
      {
        path: 'roles',
        component: RolesComponent,
        data: { title: 'Mooli | Hospital Roles' },
        canActivate: [roleGuard(ROLE_READ_ACCESS)],
      },
      {
        path: 'audit-logs',
        component: AuditLogsComponent,
        data: { title: 'Mooli | Audit Logs' },
        canActivate: [roleGuard(AUDIT_LOGS_ACCESS)],
      },
    ],
  },

  {
    path: 'signup',
    component: SignupComponent,
    data: { title: 'Mooli | Signup' },
  },
];
