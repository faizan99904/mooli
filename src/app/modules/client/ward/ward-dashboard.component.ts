import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { formatAdmissionDateTime } from './services/ward-api.mapper';
import {
  MonitoringCard,
  NursingSummaryRow,
  TodaySummaryRow,
  WardAlertRow,
  WardBed,
  WardBedMenuAction,
  WardDashboardFilters,
  WardKpiCard,
  WardRoomStatusFilter,
  WardSection,
  WardTaskRow,
  WardWorkflowTab,
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
  todayAlerts: WardAlertRow[] = [];
  nursingTasks: WardTaskRow[] = [];
  nursingSummary: NursingSummaryRow[] = [];
  monitoringCards: MonitoringCard[] = [];

  wardOptions: string[] = [];
  statusFilter: WardRoomStatusFilter = 'all';
  bedSearchQuery = '';
  activeBedMenu: { key: string; bed: WardBed; actions: WardBedMenuAction[]; opensUp: boolean } | null = null;

  readonly shiftOptions = [
    { value: 'day', label: 'Day Shift (08 AM - 02 PM)' },
    { value: 'evening', label: 'Evening Shift (02 PM - 08 PM)' },
    { value: 'night', label: 'Night Shift (08 PM - 08 AM)' },
  ];

  readonly statusFilters: Array<{ key: WardRoomStatusFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'occupied', label: 'Occupied' },
    { key: 'icu', label: 'ICU' },
    { key: 'private', label: 'Private' },
    { key: 'general', label: 'General' },
    { key: 'cleaning', label: 'Cleaning' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'critical', label: 'Critical' },
    { key: 'discharge_pending', label: 'Discharge Pending' },
  ];

  readonly workflowTabs: WardWorkflowTab[] = [
    { key: 'dashboard', label: 'Dashboard', route: '/ward/dashboard', icon: 'fa-th-large' },
    { key: 'beds', label: 'Beds', route: '/ward/bed-management', icon: 'fa-bed' },
    { key: 'admissions', label: 'Admissions', route: '/ward/admissions', icon: 'fa-hospital-o' },
    { key: 'vitals', label: 'Vitals', route: '/ward/vitals', icon: 'fa-heartbeat' },
    { key: 'mar', label: 'MAR', route: '/ward/mar', icon: 'fa-medkit' },
    { key: 'drips', label: 'Drips / IV', route: '/ward/drips-iv', icon: 'fa-tint' },
    { key: 'notes', label: 'Notes', route: '/ward/nursing-care', icon: 'fa-sticky-note' },
    { key: 'discharge', label: 'Discharge', route: '/ward/admissions', icon: 'fa-sign-out' },
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
      ? `${this.filters.ward} nurse task center · ${this.selectedShiftLabel}`
      : `All wards nurse task center · ${this.selectedShiftLabel}`;
  }

  loadDashboard(): void {
    this.loading = true;
    this.wardData.loadDashboard(this.filters.ward).subscribe({
      next: (data) => {
        this.wardOptions = data.wardOptions;
        this.kpiCards = data.kpiCards;
        this.bedSections = data.bedSections;
        this.todaySummary = data.todaySummary;
        this.todayAlerts = data.todayAlerts;
        this.nursingTasks = data.nursingTasks;
        this.nursingSummary = data.nursingSummary;
        this.monitoringCards = data.monitoringCards;
        this.applyBedFilters();
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

  onSearchChange(): void {
    this.applyBedFilters();
  }

  refresh(): void {
    this.loadDashboard();
    this.toastr.success('Ward dashboard refreshed.');
  }

  isOccupiedBed(bed: WardBed): boolean {
    return bed.status === 'occupied' || bed.status === 'critical';
  }

  onBedClick(bed: WardBed, event?: Event): void {
    const target = event?.target as HTMLElement | undefined;
    if (target?.closest('.ward-bed-card__menu-wrap, .ward-bed-card__actions, .ward-bed-card__quick-btn')) {
      return;
    }

    if (this.activeBedMenu) {
      this.activeBedMenu = null;
      return;
    }

    if (this.isOccupiedBed(bed) && bed.admissionId) {
      void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
      return;
    }

    void this.router.navigate(['/ward/bed-management'], {
      queryParams: {
        roomId: bed.roomId || undefined,
        bedNo: bed.bedNo,
      },
    });
  }

  onBedQuickAction(action: string, bed: WardBed, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.onBedMenuAction(action, bed, event);
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
    const menuHeight = dropdown.getBoundingClientRect().height || 220;
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
    const occupied = this.isOccupiedBed(bed);
    const available = bed.status === 'available';
    const cleaning = bed.status === 'cleaning';
    const actions: WardBedMenuAction[] = [];

    if (occupied && bed.admissionId) {
      actions.push(
        { key: 'view_chart', label: 'Patient Chart', icon: 'fa-file-text-o' },
        { key: 'add_vitals', label: 'Add Vitals', icon: 'fa-heartbeat' },
        { key: 'add_note', label: 'Add Nursing Note', icon: 'fa-sticky-note' },
        { key: 'mar', label: 'Medication / MAR', icon: 'fa-medkit' },
        { key: 'add_drip', label: 'Add Drip / IV', icon: 'fa-tint' },
        { key: 'transfer', label: 'Transfer Bed', icon: 'fa-random' },
        { key: 'discharge', label: 'Request Discharge', icon: 'fa-sign-out' }
      );
    }

    if (available) {
      actions.push(
        { key: 'admit_patient', label: 'Admit Patient', icon: 'fa-hospital-o' },
        { key: 'reserve_bed', label: 'Reserve Bed', icon: 'fa-bookmark' },
        { key: 'mark_cleaning', label: 'Mark Cleaning', icon: 'fa-shower' },
        { key: 'maintenance', label: 'Mark Maintenance', icon: 'fa-wrench' }
      );
    }

    if (cleaning) {
      actions.push({ key: 'mark_available', label: 'Mark Available', icon: 'fa-check-circle' });
    }

    if (bed.status === 'maintenance') {
      actions.push({ key: 'mark_available', label: 'Mark Available', icon: 'fa-check-circle' });
    }

    actions.push({ key: 'bed_details', label: 'Bed Details', icon: 'fa-bed' });
    return actions;
  }

  onBedMenuAction(action: string, bed: WardBed, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeBedMenu = null;

    const query = {
      admissionId: bed.admissionId || undefined,
      patientId: bed.patientId || undefined,
      patientName: bed.patientName || undefined,
      roomId: bed.roomId || undefined,
      bedNo: bed.bedNo,
      wardName: bed.wardName || undefined,
    };

    switch (action) {
      case 'admit_patient':
        void this.router.navigate(['/room-allotment/add-alloted-rooms'], { queryParams: query });
        return;
      case 'reserve_bed':
      case 'mark_cleaning':
      case 'maintenance':
      case 'mark_available':
      case 'bed_details':
        void this.router.navigate(['/ward/bed-management'], {
          queryParams: {
            ...query,
            status:
              action === 'maintenance'
                ? 'maintenance'
                : action === 'mark_available'
                  ? 'available'
                  : action === 'mark_cleaning'
                    ? 'cleaning'
                    : undefined,
          },
        });
        return;
      case 'view_chart':
      case 'view_patient':
        if (bed.admissionId) {
          void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
        }
        return;
      case 'add_vitals':
      case 'vitals':
        void this.router.navigate(['/ward/vitals'], { queryParams: query });
        return;
      case 'add_note':
        void this.router.navigate(['/ward/nursing-care'], { queryParams: query });
        return;
      case 'mar':
        void this.router.navigate(['/ward/mar'], { queryParams: query });
        return;
      case 'add_drip':
        void this.router.navigate(['/ward/drips-iv'], { queryParams: query });
        return;
      case 'transfer':
        void this.router.navigate(['/ward/bed-management'], { queryParams: query });
        return;
      case 'discharge':
        void this.router.navigate(['/ward/admissions'], { queryParams: { ...query, action: 'discharge' } });
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
    if (bed.clinicalStatus === 'critical') {
      return 'Critical';
    }
    if (bed.clinicalStatus === 'discharge_pending') {
      return 'Discharge Pending';
    }
    if (bed.clinicalStatus === 'observation') {
      return 'Observation';
    }

    const labels: Record<WardBed['status'], string> = {
      available: 'Available',
      occupied: 'Stable',
      on_hold: 'On Hold',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      critical: 'Critical',
    };

    return labels[bed.status];
  }

  bedStatusClass(bed: WardBed): string {
    if (bed.clinicalStatus === 'discharge_pending') {
      return 'ward-bed--discharge';
    }
    if (bed.clinicalStatus === 'observation') {
      return 'ward-bed--observation';
    }

    return `ward-bed--${bed.status}`;
  }

  patientMeta(bed: WardBed): string {
    const parts = [
      bed.age != null ? `${bed.age}Y` : '',
      bed.sex || '',
    ].filter(Boolean);
    return parts.join(' / ');
  }

  bedTitle(bed: WardBed): string {
    const room = bed.roomNo || bed.bedNo;
    return `${room} - ${bed.bedNo}`;
  }

  wardTypeLabel(bed: WardBed): string {
    return bed.roomType ? `${bed.roomType} Ward` : bed.wardName || 'Ward';
  }

  admissionLabel(bed: WardBed): string {
    return formatAdmissionDateTime(bed.admittedAt);
  }

  trackBySectionName(_index: number, section: WardSection): string {
    return `${section.sectionName}|${section.subtitle}`;
  }

  private applyBedFilters(): void {
    const query = this.bedSearchQuery.trim().toLowerCase();

    this.filteredBedSections = this.bedSections
      .map((section) => ({
        ...section,
        beds: section.beds.filter((bed) => this.matchesBedFilters(bed, query)),
      }))
      .filter((section) => section.beds.length > 0);
  }

  private matchesBedFilters(bed: WardBed, query: string): boolean {
    if (!this.matchesStatusFilter(bed)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      bed.patientName,
      bed.patientNo,
      bed.bedNo,
      bed.roomNo,
      bed.doctorName,
      bed.wardName,
      bed.diagnosis,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private matchesStatusFilter(bed: WardBed): boolean {
    switch (this.statusFilter) {
      case 'all':
        return true;
      case 'available':
        return bed.status === 'available';
      case 'occupied':
        return bed.status === 'occupied' || bed.status === 'critical';
      case 'cleaning':
        return bed.status === 'cleaning';
      case 'maintenance':
        return bed.status === 'maintenance';
      case 'critical':
        return bed.status === 'critical' || bed.clinicalStatus === 'critical';
      case 'discharge_pending':
        return bed.clinicalStatus === 'discharge_pending';
      case 'icu':
        return String(bed.roomType || '').toLowerCase() === 'icu';
      case 'private':
        return String(bed.roomType || '').toLowerCase() === 'private';
      case 'general':
        return String(bed.roomType || '').toLowerCase() === 'general';
      default:
        return true;
    }
  }

  private todayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
