import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, map, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PieChartComponent } from '../charts/pie-chart/pie-chart.component';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  DashboardSummary,
  ListResult,
  Patient,
  Prescription,
} from '../../../shared/models/hospital.model';
import { isDoctorRole } from '../../auth/access-control';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PieChartComponent,
  ],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.scss',
})
export class DoctorDashboardComponent implements OnInit {
  loading = false;
  readonly today = new Date();
  canOpenClinicalRecords = false;
  canOpenPrescriptions = false;
  canOpenPatients = false;
  summary: DashboardSummary = {
    totalPatients: 0,
    totalDoctors: 1,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    totalRevenue: 0,
    recentPatients: [],
    upcomingAppointments: [],
  };
  currentUserId = '';
  currentUserName = 'Doctor';
  doctorPrescriptionCount = 0;
  cards: Array<{ label: string; value: number; icon: string }> = [];
  quickLinks: Array<{ label: string; route: string; visible: boolean }> = [];

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.hydrateSession();
    this.initializePermissions();
    this.loadSummary();
  }

  get isDoctor(): boolean {
    return isDoctorRole(localStorage.getItem('role') || '');
  }

  get dashboardTitle(): string {
    return `Welcome back, Dr. ${this.currentUserName}`;
  }

  get dashboardSubtitle(): string {
    return 'Here is your personal dashboard with only your appointments, patients, and follow-ups.';
  }

  get scheduleHeading(): string {
    return "Today's Schedule";
  }

  get patientSectionHeading(): string {
    return 'My Recent Patients';
  }

  get emptyPatientsMessage(): string {
    return 'No patients are assigned to you yet.';
  }

  get emptyAppointmentsMessage(): string {
    return 'No appointments are scheduled for you right now.';
  }

  loadSummary(): void {
    this.loading = true;

    this.loadDoctorDashboard()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.syncDashboardState();
        },
        error: (err) => {
          this.summary = this.emptySummary();
          this.syncDashboardState();
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  patientName(patient?: Patient | null): string {
    if (!patient) {
      return '-';
    }

    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || '-';
  }

  appointmentPatientName(appointment: Appointment): string {
    return this.patientName(appointment.patient);
  }

  formatDate(value?: string | null): string {
    return value ? new Date(value).toLocaleDateString() : '-';
  }

  dashboardMenu(): void {
    document.getElementById('navbarNavDropdown')?.classList.toggle('show');
  }

  private hydrateSession(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { _id?: string; name?: string | null }
      | null;

    this.currentUserId = currentUser?._id || '';
    this.currentUserName =
      (currentUser?.name || 'Doctor').replace(/^dr\.?\s*/i, '').trim() || 'Doctor';
  }

  private initializePermissions(): void {
    this.canOpenClinicalRecords = this.backend.hasPermission('patients_history.read');
    this.canOpenPrescriptions =
      this.backend.hasPermission('prescriptions.read') ||
      this.backend.hasPermission('prescriptions.create');
    this.canOpenPatients = this.backend.hasPermission('patients.read');

    this.quickLinks = [
      { label: 'Clinical Records', route: '/clinical-records', visible: this.canOpenClinicalRecords },
      { label: 'Prescriptions', route: '/prescriptions', visible: this.canOpenPrescriptions },
      { label: 'Patients', route: '/patients/all-patients', visible: this.canOpenPatients },
      { label: 'Settings', route: '/settings', visible: true },
    ];
  }

  private syncDashboardState(): void {
    this.cards = [
      { label: 'My Patients', value: this.summary.totalPatients, icon: 'fa-user-circle-o' },
      { label: "Today's Appointments", value: this.summary.todayAppointments, icon: 'fa-calendar' },
      { label: 'Pending Follow-ups', value: this.summary.pendingAppointments, icon: 'fa-clock-o' },
      { label: 'Completed Visits', value: this.summary.completedAppointments, icon: 'fa-check-circle' },
    ];
  }

  private loadDoctorDashboard() {
    if (!this.currentUserId) {
      return of(this.emptySummary());
    }

    return forkJoin({
      patients: this.backend.getPatients({
        assignedDoctorId: this.currentUserId,
        limit: 6,
      }),
      appointments: this.backend.getAppointments({
        doctorId: this.currentUserId,
        limit: 100,
      }),
      todayAppointments: this.backend.getAppointments({
        doctorId: this.currentUserId,
        dateFrom: this.dateValue(this.today),
        dateTo: this.dateValue(this.today),
        limit: 1,
      }),
      pendingAppointments: this.backend.getAppointments({
        doctorId: this.currentUserId,
        status: 'pending',
        limit: 1,
      }),
      completedAppointments: this.backend.getAppointments({
        doctorId: this.currentUserId,
        status: 'completed',
        limit: 1,
      }),
      prescriptions: this.canOpenPrescriptions
        ? this.backend.getPrescriptions({
            doctorId: this.currentUserId,
            limit: 1,
          })
        : of(this.emptyListResult<Prescription>()),
    }).pipe(
      map(
        ({
          patients,
          appointments,
          todayAppointments,
          pendingAppointments,
          completedAppointments,
          prescriptions,
        }) => {
          this.doctorPrescriptionCount = prescriptions.pagination.total;

          const appointmentItems = [...appointments.items].sort(
            (a, b) => this.appointmentTimestamp(a) - this.appointmentTimestamp(b)
          );

          const upcomingAppointments = appointmentItems
            .filter(
              (appointment) =>
                ['pending', 'confirmed'].includes(appointment.status) &&
                this.appointmentTimestamp(appointment) >= this.startOfDay(this.today).getTime()
            )
            .slice(0, 6);

          const recentPatients = [...patients.items]
            .sort((a, b) => this.recordTimestamp(b.createdAt) - this.recordTimestamp(a.createdAt))
            .slice(0, 6);

          return {
            totalPatients: patients.pagination.total,
            totalDoctors: 1,
            todayAppointments: todayAppointments.pagination.total,
            pendingAppointments: pendingAppointments.pagination.total,
            completedAppointments: completedAppointments.pagination.total,
            totalRevenue: appointmentItems.reduce(
              (sum, appointment) => sum + Number(appointment.consultationFee || 0),
              0
            ),
            recentPatients,
            upcomingAppointments,
          } as DashboardSummary;
        }
      )
    );
  }

  private emptySummary(): DashboardSummary {
    return {
      totalPatients: 0,
      totalDoctors: 1,
      todayAppointments: 0,
      pendingAppointments: 0,
      completedAppointments: 0,
      totalRevenue: 0,
      recentPatients: [],
      upcomingAppointments: [],
    };
  }

  private emptyListResult<T>(): ListResult<T> {
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

  private dateValue(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private appointmentTimestamp(appointment: Appointment): number {
    const time = appointment.startTime || '00:00';
    return new Date(`${appointment.appointmentDate}T${time}`).getTime();
  }

  private recordTimestamp(value?: string | null): number {
    return value ? new Date(value).getTime() : 0;
  }

  private startOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }
}
