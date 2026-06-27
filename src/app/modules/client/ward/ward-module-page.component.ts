import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WARD_MODULE_PAGE_CONFIGS } from './ward-module.config';
import {
  WardModuleKpi,
  WardModulePageConfig,
  WardModuleReportCard,
  WardModuleRow,
  WardRowMenuItem,
} from './ward-module.models';
import { getWardHierarchyNodes } from './ward-module.mock';
import { WardActionModalComponent } from './ward-action-modal.component';
import { WardDripActionModalComponent } from './ward-drip-action-modal.component';
import { WardVitalsTrendsComponent } from './ward-vitals-trends.component';
import { WardDataService } from './services/ward-data.service';
import { WARD_PATIENT_SHIFT_OPTIONS } from './ward-patient-list.mock';

@Component({
  selector: 'app-ward-module-page',
  imports: [CommonModule, FormsModule, WardActionModalComponent, WardDripActionModalComponent, WardVitalsTrendsComponent],
  templateUrl: './ward-module-page.component.html',
  styleUrl: './ward-module-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardModulePageComponent implements OnInit {
  config!: WardModulePageConfig;
  loading = false;
  rows: WardModuleRow[] = [];
  allRows: WardModuleRow[] = [];
  reportCards: WardModuleReportCard[] = [];
  allReportCards: WardModuleReportCard[] = [];
  hierarchyNodes = getWardHierarchyNodes();

  ward = '';
  date = new Date().toISOString().slice(0, 10);
  shift = 'Day Shift';
  activeTab = 'all';
  search = '';
  currentPage = 1;
  readonly pageSize = 8;

  contextPatientId = '';
  contextAdmissionId = '';
  contextPatientName = '';
  contextRoomId = '';
  contextBedNo = '';

  wardOptions: string[] = [];
  readonly shiftOptions = WARD_PATIENT_SHIFT_OPTIONS;
  actionModalOpen = false;
  actionPreset: Record<string, string | number> = {};
  vitalsTrendsRefreshToken = 0;
  dripActionModalOpen = false;
  dripActionType: 'stop' | 'complete' = 'stop';
  dripActionRow: WardModuleRow | null = null;
  activeMenuRow: WardModuleRow | null = null;
  menuPosition: Record<string, string> = {};
  private pendingDripPatch: { rowId: string; status: 'planned' | 'running' | 'completed' } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private wardData: WardDataService
  ) {}

  ngOnInit(): void {
    const moduleKey = this.route.snapshot.data['wardModuleKey'] as string;
    this.config = WARD_MODULE_PAGE_CONFIGS[moduleKey];
    this.applyRouteContext(this.route.snapshot.queryParamMap);
    this.refreshRows();
  }

  get displayKpis(): WardModuleKpi[] {
    if (this.config?.key === 'drips-iv') {
      const running = this.allRows.filter((row) => row.cells['_tab'] === 'running').length;
      const completed = this.allRows.filter((row) => row.cells['_tab'] === 'completed').length;
      const planned = this.allRows.filter((row) => row.cells['status'] === 'Planned').length;
      return [
        { label: 'Running', value: running, icon: 'fa-tint', tone: 'blue' },
        { label: 'Planned', value: planned, icon: 'fa-clock-o', tone: 'orange' },
        { label: 'Completed', value: completed, icon: 'fa-check', tone: 'green' },
        { label: 'Total', value: this.allRows.length, icon: 'fa-list', tone: 'teal' },
      ];
    }
    if (this.config?.key === 'vitals') {
      const recorded = this.allRows.filter((row) => row.cells['_tab'] === 'recorded').length;
      const due = this.allRows.filter((row) => row.cells['_tab'] === 'due').length;
      return [
        { label: 'Recorded', value: recorded, icon: 'fa-check', tone: 'green' },
        { label: 'Due', value: due, icon: 'fa-heartbeat', tone: 'orange' },
        { label: 'Patients', value: new Set(this.allRows.map((row) => row.cells['patient'])).size, icon: 'fa-users', tone: 'blue' },
        { label: 'Total Entries', value: this.allRows.length, icon: 'fa-list', tone: 'teal' },
      ];
    }
    return this.config?.kpis || [];
  }

  get hideVitalsListTable(): boolean {
    return this.config?.key === 'vitals' && this.hasPatientContext;
  }

  @HostListener('document:click', ['$event'])
  closeRowMenuOnOutsideClick(event: Event): void {
    if (!this.activeMenuRow) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.table-actions__menu') || target?.closest('.table-actions__dropdown--fixed')) {
      return;
    }

    this.closeRowMenu();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  closeRowMenuOnViewportChange(): void {
    this.closeRowMenu();
  }

  toggleRowMenu(row: WardModuleRow, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.activeMenuRow?.id === row.id) {
      this.closeRowMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuWidth = 196;
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);

    this.activeMenuRow = row;
    this.menuPosition = {
      top: `${rect.bottom + 6}px`,
      left: `${left}px`,
    };
    this.cdr.markForCheck();
  }

  closeRowMenu(): void {
    if (!this.activeMenuRow) {
      return;
    }
    this.activeMenuRow = null;
    this.cdr.markForCheck();
  }

  isRowMenuOpen(rowId: string): boolean {
    return this.activeMenuRow?.id === rowId;
  }

  runDripAction(row: WardModuleRow, action: 'start' | 'stop' | 'complete'): void {
    if (action === 'start') {
      this.updateDripStatus(row, action);
      return;
    }
    this.openDripActionModal(row, action);
  }

  dripFluidStatus(row: WardModuleRow): 'planned' | 'running' | 'completed' {
    if (row.meta?.fluidStatus) {
      return row.meta.fluidStatus;
    }

    const fromCell = String(row.cells['status'] || '').trim().toLowerCase();
    if (fromCell === 'running' || fromCell === 'completed' || fromCell === 'planned') {
      return fromCell;
    }

    return 'planned';
  }

  openDripActionModal(row: WardModuleRow, action: 'stop' | 'complete'): void {
    this.dripActionRow = row;
    this.dripActionType = action;
    this.dripActionModalOpen = true;
    this.closeRowMenu();
    this.cdr.markForCheck();
  }

  closeDripActionModal(): void {
    this.dripActionModalOpen = false;
    this.dripActionRow = null;
    this.cdr.markForCheck();
  }

  confirmDripAction(reason: string): void {
    if (!this.dripActionRow) {
      return;
    }
    this.updateDripStatus(this.dripActionRow, this.dripActionType, reason);
    this.closeDripActionModal();
  }

  get dripActionPatientName(): string {
    return this.dripActionRow?.cells['patient'] || this.contextPatientName || '';
  }

  get dripActionFluidName(): string {
    return this.dripActionRow?.cells['fluid'] || this.dripActionRow?.meta?.fluidName || '';
  }

  rowMenuItems(row: WardModuleRow): WardRowMenuItem[] {
    const items: WardRowMenuItem[] = [];
    const meta = row.meta || {};
    const patientId = meta.patientId || this.contextPatientId;
    const admissionId = meta.admissionId || this.contextAdmissionId;

    if (row.linkRoute || patientId) {
      items.push({ id: 'view-patient', label: 'View Patient Chart' });
    }

    if (this.config.key === 'drips-iv') {
      const status = this.dripFluidStatus(row);
      if (status === 'planned') {
        items.push({ id: 'drip-start', label: 'Start Drip' });
      }
      if (status === 'running') {
        items.push({ id: 'drip-stop', label: 'Stop Drip' });
        items.push({ id: 'drip-complete', label: 'Complete Drip' });
      }
    }

    if (patientId) {
      items.push({ id: 'mar', label: 'View MAR' });
      if (this.config.key !== 'vitals') {
        items.push({ id: 'vitals', label: 'View Vitals' });
      }
      if (this.config.key !== 'drips-iv') {
        items.push({ id: 'drips', label: 'View Drips / IV' });
      }
    }

    if (admissionId || this.contextAdmissionId) {
      items.push({ id: 'transfer', label: 'Transfer Bed' });
      items.push({ id: 'discharge', label: 'Discharge Patient', danger: true });
    }

    return items;
  }

  handleRowMenuAction(row: WardModuleRow, actionId: string): void {
    this.closeRowMenu();
    const meta = row.meta || {};
    const patientId = meta.patientId || this.contextPatientId;
    const admissionId = meta.admissionId || this.contextAdmissionId;
    const patientName = row.cells['patient'] || this.contextPatientName;

    switch (actionId) {
      case 'view-patient':
        if (row.linkRoute) {
          void this.router.navigateByUrl(row.linkRoute);
        } else if (patientId) {
          void this.router.navigate(['/ward/patient-detail', patientId]);
        }
        break;
      case 'drip-start':
        this.updateDripStatus(row, 'start');
        break;
      case 'drip-stop':
        this.openDripActionModal(row, 'stop');
        break;
      case 'drip-complete':
        this.openDripActionModal(row, 'complete');
        break;
      case 'mar':
        this.navigateWithPatient('/ward/mar', patientId, admissionId, patientName);
        break;
      case 'vitals':
        this.navigateWithPatient('/ward/vitals', patientId, admissionId, patientName);
        break;
      case 'drips':
        this.navigateWithPatient('/ward/drips-iv', patientId, admissionId, patientName);
        break;
      case 'transfer':
        this.transferPatient(admissionId);
        break;
      case 'discharge':
        this.dischargePatient(admissionId);
        break;
    }
    this.cdr.markForCheck();
  }

  transferCurrentPatient(): void {
    this.transferPatient(this.contextAdmissionId);
  }

  dischargeCurrentPatient(): void {
    this.dischargePatient(this.contextAdmissionId);
  }

  private transferPatient(admissionId: string): void {
    if (!admissionId) {
      this.toastr.warning('No admission found for this patient.');
      return;
    }
    void this.router.navigate(['/ward/bed-management'], {
      queryParams: {
        admissionId,
        bedNo: this.contextBedNo || undefined,
        patientName: this.contextPatientName || undefined,
      },
    });
  }

  private dischargePatient(admissionId: string): void {
    if (!admissionId) {
      this.toastr.warning('No admission found for this patient.');
      return;
    }
    this.wardData.dischargeAllotment(admissionId).subscribe({
      next: () => {
        this.toastr.success('Patient discharged successfully.');
        this.clearPatientContext();
        this.refreshRows();
      },
      error: () => this.toastr.error('Failed to discharge patient.'),
    });
  }

  private updateDripStatus(row: WardModuleRow, action: 'start' | 'stop' | 'complete', notes?: string): void {
    const meta = row.meta;
    if (!meta?.prescriptionId) {
      this.toastr.error('Missing prescription reference for this drip.');
      return;
    }
    this.wardData
      .updateDripStatus({
        action,
        prescriptionId: meta.prescriptionId,
        fluidIndex: meta.fluidIndex,
        fluidName: meta.fluidName,
        patientId: meta.patientId || this.contextPatientId || undefined,
        admissionId: meta.admissionId || this.contextAdmissionId || undefined,
        notes: notes || undefined,
      })
      .subscribe({
        next: (result) => {
          const nextStatus = this.resolveDripStatusFromResult(row, action, result);
          this.pendingDripPatch = { rowId: row.id, status: nextStatus };
          if (this.activeTab !== 'all') {
            this.activeTab = nextStatus;
          }
          const label = action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'completed';
          this.toastr.success(`Drip ${label} successfully.`);
          this.refreshRows();
        },
        error: () => this.toastr.error('Failed to update drip status.'),
      });
  }

  private resolveDripStatusFromResult(
    row: WardModuleRow,
    action: 'start' | 'stop' | 'complete',
    result?: Record<string, unknown>
  ): 'planned' | 'running' | 'completed' {
    const fluidIndex = row.meta?.fluidIndex;
    const ivFluids = result?.['ivFluids'] as Array<{ status?: string }> | undefined;
    if (ivFluids && fluidIndex != null && ivFluids[fluidIndex]?.status) {
      return this.normalizeDripStatus(ivFluids[fluidIndex].status);
    }
    return action === 'start' ? 'running' : action === 'stop' ? 'planned' : 'completed';
  }

  private normalizeDripStatus(status?: string): 'planned' | 'running' | 'completed' {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'running') {
      return 'running';
    }
    if (value === 'completed') {
      return 'completed';
    }
    return 'planned';
  }

  private applyDripStatusPatch(rows: WardModuleRow[]): WardModuleRow[] {
    if (!this.pendingDripPatch) {
      return rows;
    }

    const { rowId, status } = this.pendingDripPatch;
    this.pendingDripPatch = null;
    const statusLabel = status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : 'Planned';
    const tab = status === 'running' ? 'running' : status === 'completed' ? 'completed' : 'planned';
    const badgeStatus = status === 'running' ? 'running' : status === 'completed' ? 'completed' : 'pending';

    return rows.map((row) => {
      if (row.id !== rowId) {
        return row;
      }
      return {
        ...row,
        meta: {
          ...row.meta,
          fluidStatus: status,
        },
        cells: {
          ...row.cells,
          status: statusLabel,
          _tab: tab,
        },
        badgeTone: {
          ...row.badgeTone,
          status: badgeStatus,
        },
      };
    });
  }

  private navigateWithPatient(path: string, patientId: string, admissionId: string, patientName: string): void {
    void this.router.navigate([path], {
      queryParams: {
        patientId: patientId || undefined,
        admissionId: admissionId || undefined,
        patientName: patientName || undefined,
        wardName: this.ward || undefined,
        bedNo: this.contextBedNo || undefined,
        roomId: this.contextRoomId || undefined,
      },
    });
  }

  get hasPatientContext(): boolean {
    return Boolean(this.contextPatientId || this.contextAdmissionId || this.contextPatientName);
  }

  get patientContextLabel(): string {
    return this.contextPatientName || 'Selected patient';
  }

  get selectedWardLabel(): string {
    return this.ward || 'All Wards';
  }

  clearPatientContext(): void {
    this.contextPatientId = '';
    this.contextAdmissionId = '';
    this.contextPatientName = '';
    this.contextRoomId = '';
    this.contextBedNo = '';
    this.search = '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        admissionId: null,
        patientId: null,
        patientName: null,
        roomId: null,
        bedNo: null,
        wardName: null,
      },
      queryParamsHandling: 'merge',
    });
    this.onFilterChange();
  }

  resetFilters(): void {
    this.activeTab = 'all';
    this.clearPatientContext();
  }

  get paginatedRows(): WardModuleRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginationStart(): number {
    return this.rows.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.rows.length);
  }

  tabCount(tabKey: string): number {
    if (this.config.layout === 'reports') {
      return this.allReportCards.length;
    }

    if (tabKey === 'all') {
      return this.allRows.length;
    }

    return this.allRows.filter((row) => row.cells['_tab'] === tabKey).length;
  }

  setTab(tabKey: string): void {
    this.activeTab = tabKey;
    this.currentPage = 1;
    this.refreshRows();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.refreshRows();
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
    this.cdr.markForCheck();
  }

  refresh(): void {
    this.refreshRows();
    this.toastr.success(`${this.config.title} refreshed.`);
  }

  primaryAction(): void {
    if (this.config.layout === 'reports') {
      this.toastr.info('Report summary loaded from live ward data.', this.config.title);
      return;
    }
    this.actionPreset = this.buildActionPreset();
    this.actionModalOpen = true;
    this.cdr.markForCheck();
  }

  onActionSaved(): void {
    this.toastr.success(`${this.config.primaryActionLabel || 'Action'} saved successfully.`);
    if (this.config.key === 'vitals') {
      this.vitalsTrendsRefreshToken += 1;
    }
    this.refreshRows();
  }

  closeActionModal(): void {
    this.actionModalOpen = false;
    this.cdr.markForCheck();
  }

  exportData(): void {
    if (!this.rows.length) {
      this.toastr.info('No records to export.', 'Export');
      return;
    }

    const columns = this.config.columns.map((column) => column.label);
    const lines = this.rows.map((row) =>
      this.config.columns
        .map((column) => `"${(row.cells[column.key] || '').replace(/"/g, '""')}"`)
        .join(',')
    );
    this.downloadCsv([columns.join(','), ...lines].join('\n'), `${this.config.key}-export.csv`);
  }

  openRow(row: WardModuleRow): void {
    if (row.linkRoute) {
      void this.router.navigateByUrl(row.linkRoute);
    }
  }

  openReport(card: WardModuleReportCard): void {
    this.toastr.info(card.description, card.title);
  }

  badgeClass(columnKey: string, row: WardModuleRow): string {
    const tone = row.badgeTone?.[columnKey] || row.cells[columnKey]?.toLowerCase().replace(/\s+/g, '') || 'stable';
    return `ward-badge ward-badge--${tone}`;
  }

  trackById(_index: number, row: WardModuleRow): string {
    return row.id;
  }

  private refreshRows(): void {
    this.loading = true;

    if (this.config.layout === 'reports') {
      this.wardData.loadReportCards(this.activeTab, this.search).subscribe({
        next: (cards) => {
          this.allReportCards = cards;
          this.reportCards = cards;
          this.rows = [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.allReportCards = [];
          this.reportCards = [];
          this.loading = false;
          this.toastr.error('Failed to load reports.');
          this.cdr.markForCheck();
        },
      });
      return;
    }

    this.wardData.loadModuleRows(this.config.key, 'all', this.search, this.moduleFilters()).subscribe({
      next: (rows) => {
        const patchedRows = this.applyDripStatusPatch(rows);
        this.allRows = patchedRows;
        this.rows =
          this.activeTab === 'all' ? patchedRows : patchedRows.filter((row) => row.cells['_tab'] === this.activeTab);
        this.reportCards = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.allRows = [];
        this.rows = [];
        this.loading = false;
        this.toastr.error(`Failed to load ${this.config.title}.`);
        this.cdr.markForCheck();
      },
    });

    this.wardData.loadBedManagement().subscribe({
      next: (data) => {
        this.wardOptions = data.wardOptions;
        this.cdr.markForCheck();
      },
    });
  }

  private applyRouteContext(query: { get: (key: string) => string | null }): void {
    this.contextPatientId = query.get('patientId') || '';
    this.contextAdmissionId = query.get('admissionId') || '';
    this.contextPatientName = query.get('patientName') || '';
    this.contextRoomId = query.get('roomId') || '';
    this.contextBedNo = query.get('bedNo') || '';

    const wardName = query.get('wardName');
    if (wardName) {
      this.ward = wardName;
    }

    this.search =
      this.contextPatientName && !this.contextPatientId && !this.contextAdmissionId
        ? this.contextPatientName
        : '';
  }

  private moduleFilters() {
    const hasPatientContext = Boolean(
      this.contextPatientId || this.contextAdmissionId || this.contextPatientName
    );

    return {
      patientId: this.contextPatientId || undefined,
      admissionId: this.contextAdmissionId || undefined,
      patientName: this.contextPatientName || undefined,
      wardName: hasPatientContext ? undefined : this.ward || undefined,
    };
  }

  private buildActionPreset(): Record<string, string | number> {
    const preset: Record<string, string | number> = {};
    if (this.contextPatientId) {
      preset['patientId'] = this.contextPatientId;
    }
    if (this.contextAdmissionId) {
      preset['admissionId'] = this.contextAdmissionId;
    }
    return preset;
  }

  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    this.toastr.success('Export completed.', 'Export');
  }
}
