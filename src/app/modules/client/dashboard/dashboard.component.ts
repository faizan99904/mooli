import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { LineChartComponent } from "../charts/line-chart/line-chart.component";
import { BarChartComponent } from "../charts/bar-chart/bar-chart.component";
import { PieChartComponent } from "../charts/pie-chart/pie-chart.component";
import { ColumnChartComponent } from "../charts/column-chart/column-chart.component";
import { WorldmapComponent } from "../worldmap/worldmap.component";
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  DashboardSummary,
  Patient,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CommonModule, LineChartComponent, BarChartComponent, PieChartComponent, ColumnChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  isFull!: boolean;
  isFull1!: any;
  isFull3!: boolean;
  isFull4!: boolean;
  loading = false;
  summary: DashboardSummary = {
    totalPatients: 0,
    totalDoctors: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    totalRevenue: 0,
    recentPatients: [],
    upcomingAppointments: [],
  };

  constructor(
    private router: Router,
    private backend: BackendService,
    private toastr: ToastrService
  ) { }

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
        },
        error: (err) => {
          this.summary.recentPatients = [];
          this.summary.upcomingAppointments = [];
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

  doctorName(appointment: Appointment): string {
    return appointment.doctor?.name || '-';
  }

  appointmentPatientName(appointment: Appointment): string {
    return this.patientName(appointment.patient);
  }

  formatDate(value?: string | null): string {
    return value ? new Date(value).toLocaleDateString() : '-';
  }
  closeMenu() {
    const body = document.getElementsByTagName('body')[0].classList.remove("offcanvas-active");
  }

  dashboardMenu() {
    document.getElementById('navbarNavDropdown')?.classList.toggle("show");
  }

  fullScreenSection(number:any) {
    if (number == 1) {
      if (this.isFull) {
        this.isFull = false;
      }
      else {
        this.isFull = true;
      }
    }
    else if (number == 2) {
      if (this.isFull1) {
        this.isFull1 = false;
      }
      else {
        this.isFull1 = true;
      }
    }
    else if (number == 3) {
      if (this.isFull3) {
        this.isFull3 = false;
      }
      else {
        this.isFull3 = true;
      }
    }
    else if (number == 4) {
      if (this.isFull4) {
        this.isFull4 = false;
      }
      else {
        this.isFull4 = true;
      }
    }

  }
}
