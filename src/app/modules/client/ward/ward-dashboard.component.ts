import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  MonitoringCard,
  NursingSummaryRow,
  TodaySummaryRow,
  WardBed,
  WardDashboardFilters,
  WardKpiCard,
  WardSection,
} from './ward-dashboard.models';
import { WardDataService } from './services/ward-data.service';

@Component({
  selector: 'app-ward-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './ward-dashboard.component.html',
  styleUrl: './ward-dashboard.component.scss',
})
export class WardDashboardComponent implements OnInit {
  loading = false;
  kpiCards: WardKpiCard[] = [];
  bedSections: WardSection[] = [];
  todaySummary: TodaySummaryRow[] = [];
  nursingSummary: NursingSummaryRow[] = [];
  monitoringCards: MonitoringCard[] = [];

  wardOptions: string[] = [];
  readonly shiftOptions = [
    { value: 'day', label: 'Day Shift' },
    { value: 'evening', label: 'Evening Shift' },
    { value: 'night', label: 'Night Shift' },
  ];

  filters: WardDashboardFilters = {
    ward: '',
    date: this.todayInputValue(),
    shift: 'day',
  };

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private wardData: WardDataService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  get selectedShiftLabel(): string {
    return this.shiftOptions.find((shift) => shift.value === this.filters.shift)?.label || '';
  }

  get bedOverviewTitle(): string {
    return `Bed Overview — ${this.filters.ward}`;
  }

  loadDashboard(): void {
    this.loading = true;
    const requestedWard = this.filters.ward;
    this.wardData.loadDashboard(requestedWard).subscribe({
      next: (data) => {
        this.wardOptions = data.wardOptions;
        if (!requestedWard && this.wardOptions.length) {
          this.filters.ward = this.wardOptions[0];
          this.loadDashboard();
          return;
        }
        this.kpiCards = data.kpiCards;
        this.bedSections = data.bedSections;
        this.todaySummary = data.todaySummary;
        this.nursingSummary = data.nursingSummary;
        this.monitoringCards = data.monitoringCards;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Failed to load ward dashboard.', 'Dashboard');
      },
    });
  }

  onWardChange(): void {
    this.loadDashboard();
  }

  refresh(): void {
    this.loadDashboard();
    this.toastr.success('Ward dashboard refreshed.');
  }

  onBedClick(bed: WardBed): void {
    if (bed.status === 'occupied' && bed.admissionId) {
      void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
      return;
    }

    void this.router.navigate(['/ward/bed-management']);
  }

  navigateTo(route?: string): void {
    if (!route) {
      return;
    }

    void this.router.navigate([route]);
  }

  bedStatusLabel(bed: WardBed): string {
    if (bed.status === 'occupied') {
      return 'Occupied / Stable';
    }

    const labels: Record<WardBed['status'], string> = {
      available: 'Available',
      on_hold: 'On Hold',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      occupied: 'Occupied',
      critical: 'Critical',
    };

    return labels[bed.status];
  }

  bedStatusClass(status: WardBed['status']): string {
    return `ward-bed--${status}`;
  }

  kpiToneClass(tone: WardKpiCard['tone']): string {
    return `stat-card--${tone}`;
  }

  monitoringToneClass(tone: MonitoringCard['tone']): string {
    return `monitor-card--${tone}`;
  }

  nursingToneClass(tone: NursingSummaryRow['tone']): string {
    return `nursing-dot--${tone}`;
  }

  private todayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
