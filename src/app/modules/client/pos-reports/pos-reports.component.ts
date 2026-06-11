import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { BackendService } from '../../../core/services/backend.service';
import { Store, User } from '../../../shared/models/hospital.model';

type ReportKey =
  | 'sales'
  | 'inventory'
  | 'profit-loss'
  | 'stock-movements'
  | 'payments'
  | 'expenses';

interface ReportDefinition {
  key: ReportKey;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-pos-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './pos-reports.component.html',
  styleUrl: './pos-reports.component.scss',
})
export class PosReportsComponent implements OnInit {
  readonly reports: ReportDefinition[] = [
    {
      key: 'sales',
      title: 'Sales',
      description: 'Revenue, paid totals, invoices, and sale count.',
      icon: 'fa-line-chart',
    },
    {
      key: 'inventory',
      title: 'Inventory',
      description: 'Store-wise medicine stock, available quantity, and valuation.',
      icon: 'fa-cubes',
    },
    {
      key: 'profit-loss',
      title: 'Profit / Loss',
      description: 'Revenue, COGS, expenses, gross profit, and net profit.',
      icon: 'fa-balance-scale',
    },
    {
      key: 'stock-movements',
      title: 'Stock Movements',
      description: 'Audit trail of pharmacy stock changes.',
      icon: 'fa-exchange',
    },
    {
      key: 'payments',
      title: 'Payments',
      description: 'Payment totals, methods, and reference mix.',
      icon: 'fa-credit-card',
    },
    {
      key: 'expenses',
      title: 'Expenses',
      description: 'Expense totals and category distribution.',
      icon: 'fa-money',
    },
  ];

  activeReport: ReportKey = 'sales';
  reportData: unknown[] | Record<string, unknown> | null = null;
  stores: Store[] = [];
  loading = false;
  storesLoading = false;
  errorMessage = '';
  fromDate = '';
  toDate = '';
  storeId = '';
  lowStockOnly = false;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.applyAssignedStore();
    this.loadStores();
    this.loadReport();
  }

  get activeReportDefinition(): ReportDefinition {
    return this.reports.find((report) => report.key === this.activeReport) || this.reports[0];
  }

  get supportsLowStockFilter(): boolean {
    return this.activeReport === 'inventory';
  }

  get canChooseStore(): boolean {
    return this.backend.hasPermission('*') || this.backend.hasPermission('stores.read');
  }

  get items(): Record<string, unknown>[] {
    if (Array.isArray(this.reportData)) {
      return this.reportData.filter(this.isRecord);
    }

    const possibleItems = this.isRecord(this.reportData) ? this.reportData['items'] : null;
    return Array.isArray(possibleItems) ? possibleItems.filter(this.isRecord) : [];
  }

  get summaryEntries(): Array<{ key: string; value: unknown }> {
    if (!this.isRecord(this.reportData) || Array.isArray(this.reportData)) {
      return [];
    }

    return Object.entries(this.reportData)
      .filter(([key]) => key !== 'items')
      .map(([key, value]) => ({ key, value }));
  }

  get tableColumns(): string[] {
    const firstItem = this.items[0];
    return firstItem ? Object.keys(firstItem) : [];
  }

  selectReport(reportKey: ReportKey): void {
    if (this.activeReport === reportKey) {
      return;
    }

    this.activeReport = reportKey;
    this.errorMessage = '';
    if (!this.supportsLowStockFilter) {
      this.lowStockOnly = false;
    }
    this.loadReport();
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.setDefaultDateRange();
    this.applyAssignedStore();
    this.lowStockOnly = false;
    this.errorMessage = '';
    this.loadReport();
  }

  loadStores(): void {
    if (!this.canChooseStore) {
      return;
    }

    this.storesLoading = true;
    this.backend
      .getStores({ limit: 100, isActive: true })
      .pipe(finalize(() => (this.storesLoading = false)))
      .subscribe({
        next: (result) => {
          this.stores = result.items || [];
        },
        error: () => {
          this.stores = [];
        },
      });
  }

  loadReport(): void {
    if (!this.backend.hasPermission('reports.read')) {
      this.errorMessage = 'This role needs reports.read to view POS reports.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.reportData = null;

    const params = this.buildReportParams();
    this.resolveReportRequest(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.reportData = data;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to load POS report.';
          this.toastr.error(this.errorMessage);
        },
      });
  }

  objectEntries(value: unknown): Array<{ key: string; value: unknown }> {
    return this.isRecord(value)
      ? Object.entries(value).map(([key, entryValue]) => ({ key, value: entryValue }))
      : [];
  }

  isPlainObject(value: unknown): boolean {
    return this.isRecord(value);
  }

  cellValue(row: Record<string, unknown>, column: string): unknown {
    return row[column];
  }

  labelFor(key: string): string {
    return key
      .replace(/Id$/, ' ID')
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  formatValue(key: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (this.isRecord(value)) {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    if (this.isMoneyKey(key)) {
      return this.formatCurrency(value);
    }

    if (this.isDateKey(key)) {
      return this.formatDate(value);
    }

    return String(value);
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }

  trackByColumn(_index: number, column: string): string {
    return column;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private resolveReportRequest(params: Record<string, unknown>): Observable<unknown[] | Record<string, unknown>> {
    switch (this.activeReport) {
      case 'sales':
        return this.backend.getSalesReport(params);
      case 'inventory':
        return this.backend.getInventoryReport(params);
      case 'profit-loss':
        return this.backend.getProfitLossReport(params);
      case 'stock-movements':
        return this.backend.getStockMovementsReport(params);
      case 'payments':
        return this.backend.getPaymentsReport(params);
      case 'expenses':
        return this.backend.getExpensesReport(params);
      default:
        return this.backend.getSalesReport(params);
    }
  }

  private buildReportParams(): Record<string, unknown> {
    return {
      fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
      storeId: this.storeId || undefined,
      lowStock: this.supportsLowStockFilter && this.lowStockOnly ? true : undefined,
    };
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 30);
    this.fromDate = this.toDateInputValue(from);
    this.toDate = this.toDateInputValue(today);
  }

  private applyAssignedStore(): void {
    const currentUser = this.getStoredUser();
    this.storeId = currentUser?.storeId || '';
  }

  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatCurrency(value: unknown): string {
    const numeric = Number(value ?? 0);
    return `PKR ${(Number.isFinite(numeric) ? numeric : 0).toFixed(2)}`;
  }

  private formatDate(value: unknown): string {
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleString();
  }

  private isMoneyKey(key: string): boolean {
    return [
      'amount',
      'cashSales',
      'cogs',
      'expenses',
      'grossProfit',
      'grossProfitToday',
      'netProfit',
      'paidAmount',
      'revenue',
      'total',
      'totalExpenses',
      'totalExpensesToday',
      'totalInventoryValue',
      'totalPaid',
      'totalPayments',
      'totalSales',
      'totalSalesToday',
      'valuation',
    ].includes(key);
  }

  private isDateKey(key: string): boolean {
    return /date|createdAt|updatedAt/i.test(key);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
