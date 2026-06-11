import { Routes } from '@angular/router';
import { LayoutComponent } from '../../layout/layout.component';
import { SignupComponent } from './pages/signup/signup.component';
import { DashboardComponent } from './dashboard/dashboard.component';
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
import { PharmacyComponent } from './pharmacy/pharmacy.component';
import { PharmacyProductsComponent } from './pharmacy-products/pharmacy-products.component';
import { PharmacyPosComponent } from './pharmacy-pos/pharmacy-pos.component';
import { PosReportsComponent } from './pos-reports/pos-reports.component';

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
const HISTORY_ACCESS = ['patients_history.read', 'patients_history.create'];
const PRESCRIPTION_ACCESS = ['prescriptions.read', 'prescriptions.create'];
const PHARMACY_ACCESS = ['products.read'];
const REPORT_ACCESS = ['reports.read'];
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
const LABORATORY_ACCESS = ['patients_history.read'];
const WARD_ADMIN_ACCESS = ['patients_history.read'];

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
        canActivate: [roleGuard(WILDCARD_ACCESS)],
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
        component: CareRecordsComponent,
        data: {
          title: 'Mooli | Laboratory',
          pageTitle: 'Laboratory Records',
          pageSubtitle: 'CBC, test notes, and patient lab result updates',
          recordType: 'laboratory',
        },
        canActivate: [roleGuard(LABORATORY_ACCESS)],
      },
      {
        path: 'ward-admin',
        component: CareRecordsComponent,
        data: {
          title: 'Mooli | Ward Admin',
          pageTitle: 'Ward Admin',
          pageSubtitle: 'Admitted patients, drip notes, and ward treatment updates',
          recordType: 'ward',
        },
        canActivate: [roleGuard(WARD_ADMIN_ACCESS)],
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
        path: 'pharmacy/pos',
        component: PharmacyPosComponent,
        data: { title: 'Mooli | Pharmacy POS' },
        canActivate: [roleGuard(PHARMACY_POS_ACCESS)],
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
    ],
  },

  {
    path: 'signup',
    component: SignupComponent,
    data: { title: 'Mooli | Signup' },
  },
];
