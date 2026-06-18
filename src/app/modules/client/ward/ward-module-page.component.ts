import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WARD_MODULE_PAGE_CONFIGS } from './ward-module.config';
import {
  WardModulePageConfig,
  WardModuleReportCard,
  WardModuleRow,
} from './ward-module.models';
import { getWardHierarchyNodes } from './ward-module.mock';
import { WardActionModalComponent } from './ward-action-modal.component';
import { WardDataService } from './services/ward-data.service';
import { WARD_PATIENT_SHIFT_OPTIONS } from './ward-patient-list.mock';

@Component({
  selector: 'app-ward-module-page',
  imports: [CommonModule, FormsModule, WardActionModalComponent],
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

  wardOptions: string[] = [];
  readonly shiftOptions = WARD_PATIENT_SHIFT_OPTIONS;
  actionModalOpen = false;

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

    const admissionId = this.route.snapshot.queryParamMap.get('admissionId');
    if (admissionId && this.search === '') {
      this.search = admissionId;
    }

    this.refreshRows();
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
    this.actionModalOpen = true;
    this.cdr.markForCheck();
  }

  onActionSaved(): void {
    this.toastr.success(`${this.config.primaryActionLabel || 'Action'} saved successfully.`);
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

    this.wardData.loadModuleRows(this.config.key, 'all', this.search).subscribe({
      next: (rows) => {
        this.allRows = rows;
        this.rows =
          this.activeTab === 'all' ? rows : rows.filter((row) => row.cells['_tab'] === this.activeTab);
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
        if (!this.ward && this.wardOptions.length) {
          this.ward = this.wardOptions[0];
          this.cdr.markForCheck();
        }
      },
    });
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
