import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { Hospital, LabComparisonRow, LabOrder, User } from '../../../shared/models/hospital.model';
import { buildLabOrderReportHtml, openLabReportPrintWindow } from './lab-order-report.builder';
import { isLabOrderReportReady } from './lab-print-details';

type LabReportDateGroup = {
  dateKey: string;
  dateLabel: string;
  items: LabOrder[];
};

@Component({
  selector: 'app-created-lab-reports',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './created-lab-reports.component.html',
  styleUrl: './created-lab-reports.component.scss',
})
export class CreatedLabReportsComponent implements OnInit, OnDestroy {
  orders: LabOrder[] = [];
  reportGroups: LabReportDateGroup[] = [];
  hospital: Hospital | null = null;
  loading = false;
  search = '';
  dateFrom = this.defaultDateFrom();
  dateTo = this.todayValue();
  page = 1;
  totalPages = 0;
  totalOrders = 0;
  readonly pageSize = 10;
  viewModalOpen = false;
  viewLoading = false;
  viewOrder: LabOrder | null = null;
  viewComparison: LabComparisonRow[] = [];
  viewReportHtml = '';
  viewReportSrc: SafeResourceUrl | null = null;
  private listRequestId = 0;
  private viewRequestId = 0;
  private viewReportBlobUrl: string | null = null;
  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadHospital();
    this.loadReports();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }

    this.revokeViewReportBlobUrl();
  }

  loadReports(): void {
    const requestId = ++this.listRequestId;
    this.loading = true;

    this.backend
      .getLabOrders(this.reportFilterParams())
      .pipe(
        finalize(() => {
          if (requestId === this.listRequestId) {
            this.loading = false;
          }
        })
      )
      .subscribe({
        next: (result) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.orders = (result.items || []).filter((order) => isLabOrderReportReady(order));
          this.totalPages = result.pagination?.totalPages || 0;
          this.totalOrders = result.pagination?.total || this.orders.length;
          this.rebuildReportGroups();
        },
        error: (err) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          this.orders = [];
          this.totalPages = 0;
          this.totalOrders = 0;
          this.rebuildReportGroups();
          this.toastr.error(err?.error?.message || 'Unable to load lab reports.');
        },
      });
  }

  onSearchInput(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }

    this.searchDebounceId = setTimeout(() => {
      this.page = 1;
      this.loadReports();
    }, 300);
  }

  applyDateFilter(): void {
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.toastr.error('Start date cannot be after end date.');
      return;
    }

    this.page = 1;
    this.loadReports();
  }

  resetDateFilter(): void {
    this.dateFrom = this.todayValue();
    this.dateTo = this.todayValue();
    this.page = 1;
    this.loadReports();
  }

  clearFilters(): void {
    this.search = '';
    this.dateFrom = this.defaultDateFrom();
    this.dateTo = this.todayValue();
    this.page = 1;
    this.loadReports();
  }

  hasCustomFilters(): boolean {
    return Boolean(
      this.search.trim() ||
        this.dateFrom !== this.defaultDateFrom() ||
        this.dateTo !== this.todayValue()
    );
  }

  isTodayFilter(): boolean {
    return this.dateFrom === this.todayValue() && this.dateTo === this.todayValue();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadReports();
  }

  openViewReport(order: LabOrder): void {
    const requestId = ++this.viewRequestId;
    this.viewModalOpen = true;
    this.viewLoading = true;
    this.viewOrder = order;
    this.viewComparison = [];
    this.viewReportHtml = '';
    this.viewReportSrc = null;

    this.backend
      .getLabOrder(order._id)
      .pipe(
        finalize(() => {
          if (requestId === this.viewRequestId) {
            this.viewLoading = false;
          }
        })
      )
      .subscribe({
        next: (freshOrder) => {
          if (requestId !== this.viewRequestId) {
            return;
          }

          if (!isLabOrderReportReady(freshOrder)) {
            this.viewModalOpen = false;
            this.viewOrder = null;
            this.toastr.error('Complete and verify all tests before opening the PDF report.');
            return;
          }

          this.viewOrder = freshOrder;
          this.loadComparisonAndPreview(freshOrder, requestId);
        },
        error: (err) => {
          if (requestId !== this.viewRequestId) {
            return;
          }

          this.viewModalOpen = false;
          this.toastr.error(err?.error?.message || 'Unable to load lab report.');
        },
      });
  }

  closeViewModal(): void {
    this.viewRequestId += 1;
    this.viewModalOpen = false;
    this.viewLoading = false;
    this.viewOrder = null;
    this.viewComparison = [];
    this.viewReportHtml = '';
    this.viewReportSrc = null;
    this.revokeViewReportBlobUrl();
  }

  printViewReport(): void {
    if (!this.viewReportHtml.trim()) {
      this.toastr.error('Report preview is not ready yet.');
      return;
    }

    const opened = openLabReportPrintWindow(this.viewReportHtml);
    if (!opened) {
      this.toastr.error('Unable to open report print view.');
    }
  }

  patientName(order: LabOrder): string {
    const patient = order.patient;
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  testsSummary(order: LabOrder): string {
    return (order.items || []).map((item) => item.shortCode || item.testName).join(', ') || '-';
  }

  reportDate(order: LabOrder): string {
    const verifiedAt = this.latestVerifiedAt(order);
    return this.shortDate(verifiedAt || order.updatedAt || order.createdAt);
  }

  initials(value?: string | null): string {
    const words = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return words.length
      ? words
          .slice(0, 2)
          .map((word) => word[0])
          .join('')
          .toUpperCase()
      : 'NA';
  }

  trackReportGroup(_index: number, group: LabReportDateGroup): string {
    return group.dateKey;
  }

  trackOrderId(_index: number, order: LabOrder): string {
    return String(order._id || order.orderNo || _index);
  }

  private loadHospital(): void {
    this.backend.getMe().subscribe({
      next: (user) => {
        this.hospital = user.hospital || null;
      },
      error: () => undefined,
    });
  }

  private loadComparisonAndPreview(order: LabOrder, requestId: number): void {
    if (!order.patientId) {
      this.setViewReportPreview(order, []);
      return;
    }

    this.backend.getPatientLabComparison(String(order.patientId)).subscribe({
      next: (rows) => {
        if (requestId !== this.viewRequestId) {
          return;
        }

        this.setViewReportPreview(order, rows);
      },
      error: () => {
        if (requestId !== this.viewRequestId) {
          return;
        }

        this.setViewReportPreview(order, []);
      },
    });
  }

  private setViewReportPreview(order: LabOrder, comparison: LabComparisonRow[]): void {
    this.viewComparison = comparison;
    this.viewReportHtml = buildLabOrderReportHtml({
      order,
      hospital: this.hospital,
      comparison,
      reportGeneratedBy: this.currentUser(),
    });
    this.revokeViewReportBlobUrl();
    const blob = new Blob([this.viewReportHtml], { type: 'text/html;charset=utf-8' });
    this.viewReportBlobUrl = URL.createObjectURL(blob);
    this.viewReportSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.viewReportBlobUrl);
  }

  private revokeViewReportBlobUrl(): void {
    if (!this.viewReportBlobUrl) {
      return;
    }

    URL.revokeObjectURL(this.viewReportBlobUrl);
    this.viewReportBlobUrl = null;
  }

  private reportFilterParams(): Record<string, unknown> {
    const params: Record<string, unknown> = {
      page: this.page,
      limit: this.pageSize,
      reportReady: true,
      search: this.search.trim() || undefined,
    };

    if (!this.search.trim()) {
      params['dateFrom'] = this.dateFrom || this.defaultDateFrom();
      params['dateTo'] = this.dateTo || this.todayValue();
    }

    return params;
  }

  private rebuildReportGroups(): void {
    const groups = new Map<string, LabOrder[]>();

    this.orders.forEach((order) => {
      const dateKey = this.reportDateKey(order);
      const bucket = groups.get(dateKey) || [];
      bucket.push(order);
      groups.set(dateKey, bucket);
    });

    this.reportGroups = Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      dateLabel: this.formatGroupDateLabel(dateKey),
      items,
    }));
  }

  private reportDateKey(order: LabOrder): string {
    const value = this.latestVerifiedAt(order) || order.updatedAt || order.createdAt;
    const date = value ? new Date(value) : null;

    if (!date || Number.isNaN(date.getTime())) {
      return 'unknown';
    }

    return this.dateOnly(date);
  }

  private latestVerifiedAt(order: LabOrder): string | null {
    const dates = (order.items || [])
      .map((item) => item.verifiedAt || item.resultEnteredAt)
      .filter(Boolean)
      .map((value) => new Date(String(value)).getTime())
      .filter((value) => Number.isFinite(value));

    if (!dates.length) {
      return null;
    }

    return new Date(Math.max(...dates)).toISOString();
  }

  private formatGroupDateLabel(dateKey: string): string {
    if (dateKey === 'unknown') {
      return 'Unknown Date';
    }

    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateKey;
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private shortDate(value?: string | Date | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private currentUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }

  private todayValue(): string {
    return this.dateOnly(new Date());
  }

  private defaultDateFrom(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return this.dateOnly(date);
  }

  private dateOnly(value: Date): string {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }
}
