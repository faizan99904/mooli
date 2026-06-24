import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  MonitoringCard,
  NursingSummaryRow,
  TodaySummaryRow,
  WardBed,
  WardBedMenuAction,
  WardDashboardFilters,
  WardKpiCard,
  WardRoomStatusFilter,
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
  filteredBedSections: WardSection[] = [];
  todaySummary: TodaySummaryRow[] = [];
  nursingSummary: NursingSummaryRow[] = [];
  monitoringCards: MonitoringCard[] = [];

  wardOptions: string[] = [];
  statusFilter: WardRoomStatusFilter = 'all';
  activeBedMenu: { key: string; bed: WardBed; actions: WardBedMenuAction[]; opensUp: boolean } | null = null;

  readonly shiftOptions = [
    { value: 'day', label: 'Day Shift (08 AM - 02 PM)' },
    { value: 'evening', label: 'Evening Shift (02 PM - 08 PM)' },
    { value: 'night', label: 'Night Shift (08 PM - 08 AM)' },
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
    return this.filters.ward ? `Bed Overview — ${this.filters.ward}` : 'Bed Overview — All Wards';
  }

  get dashboardSubtitle(): string {
    return this.filters.ward
      ? `${this.filters.ward} overview · ${this.selectedShiftLabel}`
      : `All wards overview · ${this.selectedShiftLabel}`;
  }

  loadDashboard(): void {
    this.loading = true;
    this.wardData.loadDashboard(this.filters.ward).subscribe({
      next: (data) => {
        this.wardOptions = data.wardOptions;
        this.kpiCards = data.kpiCards;
        this.bedSections = data.bedSections;
        this.applyBedFilters();
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

  onStatusFilterChange(filter: WardRoomStatusFilter): void {
    this.statusFilter = filter;
    this.applyBedFilters();
  }

  refresh(): void {
    this.loadDashboard();
    this.toastr.success('Ward dashboard refreshed.');
  }

  onBedClick(bed: WardBed, event?: Event): void {
    const target = event?.target as HTMLElement | undefined;
    if (target?.closest('.ward-bed-card__menu-wrap')) {
      return;
    }

    if (this.activeBedMenu) {
      this.activeBedMenu = null;
      return;
    }

    if ((bed.status === 'occupied' || bed.status === 'critical') && bed.admissionId) {
      void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
      return;
    }

    void this.router.navigate(['/ward/bed-management']);
  }

  toggleBedMenu(bed: WardBed, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const key = this.bedMenuKey(bed);
    if (this.activeBedMenu?.key === key) {
      this.activeBedMenu = null;
      return;
    }

    this.activeBedMenu = {
      key,
      bed,
      actions: this.buildBedMenuActions(bed),
      opensUp: false,
    };

    queueMicrotask(() => this.updateMenuPlacement(event, key));
  }

  menuOpensUp(bed: WardBed): boolean {
    return this.isBedMenuOpen(bed) && Boolean(this.activeBedMenu?.opensUp);
  }

  private updateMenuPlacement(event: Event, key: string): void {
    if (!this.activeBedMenu || this.activeBedMenu.key !== key) {
      return;
    }

    const button = event.currentTarget as HTMLElement | null;
    const dropdown = button?.closest('.ward-bed-card')?.querySelector('.ward-bed-card__dropdown') as HTMLElement | null;
    if (!button || !dropdown) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const menuHeight = dropdown.getBoundingClientRect().height || 200;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const opensUp = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

    if (this.activeBedMenu.key === key) {
      this.activeBedMenu = {
        ...this.activeBedMenu,
        opensUp,
      };
    }
  }

  isBedMenuOpen(bed: WardBed): boolean {
    return this.activeBedMenu?.key === this.bedMenuKey(bed);
  }

  activeMenuActions(bed: WardBed): WardBedMenuAction[] {
    return this.isBedMenuOpen(bed) ? this.activeBedMenu?.actions || [] : [];
  }

  bedMenuKey(bed: WardBed): string {
    return String(bed.roomId || bed.bedNo);
  }

  private buildBedMenuActions(bed: WardBed): WardBedMenuAction[] {
    const occupied = bed.status === 'occupied' || bed.status === 'critical';
    const available = bed.status === 'available';
    const actions: WardBedMenuAction[] = [];

    if (occupied && bed.admissionId) {
      actions.push(
        { key: 'view_patient', label: 'View Patient', icon: 'fa-eye' },
        { key: 'vitals', label: 'View Vitals', icon: 'fa-heartbeat' },
        { key: 'mar', label: 'View MAR', icon: 'fa-medkit' },
        { key: 'transfer', label: 'Transfer Bed', icon: 'fa-random' },
        { key: 'discharge', label: 'Discharge Patient', icon: 'fa-sign-out' }
      );
    }

    if (available) {
      actions.push(
        { key: 'add_patient', label: 'Add Patient', icon: 'fa-user-plus' },
        { key: 'admit_patient', label: 'Admit Patient', icon: 'fa-hospital-o' }
      );
    }

    if (bed.status === 'maintenance') {
      actions.push({ key: 'mark_available', label: 'Mark Available', icon: 'fa-check-circle' });
    } else if (!occupied) {
      actions.push({ key: 'maintenance', label: 'Mark Maintenance', icon: 'fa-wrench' });
    }

    actions.push({ key: 'bed_details', label: 'Bed Details', icon: 'fa-bed' });

    return actions;
  }

  onBedMenuAction(action: string, bed: WardBed, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeBedMenu = null;

    switch (action) {
      case 'add_patient':
        void this.router.navigate(['/patients/add-patient'], {
          queryParams: bed.roomId ? { roomId: bed.roomId } : undefined,
        });
        return;
      case 'admit_patient':
        void this.router.navigate(['/room-allotment/add-alloted-rooms'], {
          queryParams: {
            roomId: bed.roomId || undefined,
            bedNo: bed.bedNo,
            wardName: bed.wardName || undefined,
          },
        });
        return;
      case 'view_patient':
        if (bed.admissionId) {
          void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
        }
        return;
      case 'vitals':
        void this.router.navigate(['/ward/vitals'], {
          queryParams: { admissionId: bed.admissionId || undefined, patientId: bed.patientId || undefined },
        });
        return;
      case 'mar':
        void this.router.navigate(['/ward/mar'], {
          queryParams: { admissionId: bed.admissionId || undefined, patientId: bed.patientId || undefined },
        });
        return;
      case 'transfer':
        void this.router.navigate(['/ward/bed-management'], {
          queryParams: {
            admissionId: bed.admissionId || undefined,
            bedNo: bed.bedNo,
            roomId: bed.roomId || undefined,
          },
        });
        return;
      case 'discharge':
        void this.router.navigate(['/ward/admissions'], {
          queryParams: { admissionId: bed.admissionId || undefined, action: 'discharge' },
        });
        return;
      case 'maintenance':
      case 'mark_available':
      case 'bed_details':
        void this.router.navigate(['/ward/bed-management'], {
          queryParams: {
            roomId: bed.roomId || undefined,
            bedNo: bed.bedNo,
            status: action === 'maintenance' ? 'maintenance' : action === 'mark_available' ? 'available' : undefined,
          },
        });
        return;
      default:
        return;
    }
  }

  @HostListener('document:click', ['$event'])
  closeBedMenus(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.ward-bed-card__menu-wrap')) {
      return;
    }

    this.activeBedMenu = null;
  }

  trackByBedKey(_index: number, bed: WardBed): string {
    return String(bed.roomId || bed.bedNo);
  }

  trackByMenuAction(_index: number, action: WardBedMenuAction): string {
    return action.key;
  }

  navigateTo(route?: string): void {
    if (!route) {
      return;
    }

    void this.router.navigate([route]);
  }

  bedStatusLabel(bed: WardBed): string {
    const labels: Record<WardBed['status'], string> = {
      available: 'Available',
      occupied: 'Occupied / Stable',
      on_hold: 'On Hold',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      critical: 'Critical',
    };

    return labels[bed.status];
  }

  bedStatusClass(status: WardBed['status']): string {
    return `ward-bed--${status}`;
  }

  patientMeta(bed: WardBed): string {
    const parts = [bed.sex, bed.age != null ? `${bed.age} Y` : ''].filter(Boolean);
    return parts.join(' / ');
  }

  trackBySectionName(_index: number, section: WardSection): string {
    return `${section.sectionName}|${section.subtitle}`;
  }

  private applyBedFilters(): void {
    this.filteredBedSections = this.bedSections
      .map((section) => ({
        ...section,
        beds: section.beds.filter((bed) => this.matchesStatusFilter(bed.status)),
      }))
      .filter((section) => section.beds.length > 0);
  }

  private matchesStatusFilter(status: WardBed['status']): boolean {
    if (this.statusFilter === 'all') {
      return true;
    }

    if (this.statusFilter === 'occupied') {
      return status === 'occupied' || status === 'critical';
    }

    return status === this.statusFilter;
  }

  private todayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
