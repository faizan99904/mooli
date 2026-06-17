import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexXAxis,
} from 'ng-apexcharts';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  DashboardStatusBreakdown,
  DashboardSummary,
  Patient,
} from '../../../shared/models/hospital.model';

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  plotOptions: ApexPlotOptions;
};

type BarChartOptions = {
  series: Array<{ name: string; data: number[] }>;
  chart: ApexChart;
  xaxis: ApexXAxis;
  colors: string[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CommonModule, NgApexchartsModule, DatePipe, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = false;
  readonly todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  summary: DashboardSummary = this.emptySummary();
  statCards: Array<{ label: string; value: string | number; hint: string; icon: string; tone: string; isCurrency?: boolean }> = [];

  todayDonut: DonutChartOptions = this.buildDonutChart(this.emptyBreakdown());
  operationsBar: BarChartOptions = this.buildOperationsBar();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    this.backend
      .getHospitalDashboardSummary()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.syncDashboardState();
        },
        error: (err) => {
          this.summary = this.emptySummary();
          this.syncDashboardState();
          this.toastr.error(err?.error?.message || 'Dashboard load nahi ho saka');
        },
      });
  }

  patientName(patient?: Patient | null): string {
    if (!patient) {
      return '-';
    }

    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || '-';
  }

  doctorName(appointment: Appointment): string {
    return appointment.doctor?.name || '-';
  }

  appointmentPatientName(appointment: Appointment): string {
    return this.patientName(appointment.patient);
  }

  statusClass(status?: string): string {
    return `status-${String(status || 'pending').replace(/_/g, '-')}`;
  }

  statusLabel(status?: string): string {
    return String(status || 'pending').replace(/_/g, ' ');
  }

  private syncDashboardState(): void {
    const today = this.summary.todayAppointmentBreakdown || this.emptyBreakdown();

    this.statCards = [
      { label: 'Total Doctors', value: this.summary.totalDoctors, hint: 'Active doctors', icon: 'fa-user-md', tone: 'tone-blue' },
      { label: 'Total Patients', value: this.summary.totalPatients, hint: 'Registered patients', icon: 'fa-users', tone: 'tone-teal' },
      { label: "Today's Appointments", value: this.summary.todayAppointments, hint: 'Scheduled today', icon: 'fa-calendar', tone: 'tone-green' },
      { label: 'Lab Tests Today', value: this.summary.todayLabOrders || 0, hint: 'New lab orders', icon: 'fa-flask', tone: 'tone-purple' },
      { label: 'Prescriptions Today', value: this.summary.todayPrescriptions || 0, hint: 'Created today', icon: 'fa-file-text-o', tone: 'tone-amber' },
      { label: "Today's Revenue", value: this.summary.todayRevenue || 0, hint: 'Bills collected today', icon: 'fa-money', tone: 'tone-navy', isCurrency: true },
    ];

    this.todayDonut = this.buildDonutChart(today);
    this.operationsBar = this.buildOperationsBar();
  }

  private buildDonutChart(breakdown: DashboardStatusBreakdown): DonutChartOptions {
    const series = [
      breakdown.pending,
      breakdown.confirmed,
      breakdown.completed,
      breakdown.cancelled,
      breakdown.noShow,
    ];

    return {
      series,
      chart: { type: 'donut', height: 320, fontFamily: 'inherit' },
      labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'],
      colors: ['#f59e0b', '#019c9d', '#16a34a', '#ef4444', '#94a3b8'],
      legend: { position: 'bottom', fontSize: '12px' },
      dataLabels: { enabled: true },
      stroke: { width: 1 },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Today',
                formatter: () => String(series.reduce((sum, value) => sum + value, 0)),
              },
            },
          },
        },
      },
    };
  }

  private buildOperationsBar(): BarChartOptions {
    return {
      series: [
        {
          name: 'Count',
          data: [
            this.summary.todayAppointments,
            this.summary.todayLabOrders || 0,
            this.summary.todayPrescriptions || 0,
            this.summary.todayFeesCollected || 0,
          ],
        },
      ],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: {
        categories: ['Appointments', 'Lab Tests', 'Prescriptions', 'Fees Collected'],
      },
      colors: ['#003e86'],
      plotOptions: { bar: { borderRadius: 8, columnWidth: '46%' } },
      dataLabels: { enabled: true },
      stroke: { show: true, width: 2, colors: ['transparent'] },
    };
  }

  private emptyBreakdown(): DashboardStatusBreakdown {
    return { pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };
  }

  private emptySummary(): DashboardSummary {
    return {
      totalPatients: 0,
      totalDoctors: 0,
      todayAppointments: 0,
      todayPendingAppointments: 0,
      todayConfirmedAppointments: 0,
      todayCompletedAppointments: 0,
      todayCancelledAppointments: 0,
      pendingAppointments: 0,
      completedAppointments: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      todayFeesCollected: 0,
      todayLabOrders: 0,
      todayPrescriptions: 0,
      totalPrescriptions: 0,
      appointmentBreakdown: this.emptyBreakdown(),
      todayAppointmentBreakdown: this.emptyBreakdown(),
      recentPatients: [],
      upcomingAppointments: [],
      todayAppointmentsList: [],
    };
  }
}
