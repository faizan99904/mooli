import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { BackendService } from '../../../core/services/backend.service';
import {
  Expense,
  Payment,
  Sale,
  SalePaymentMethod,
  SalesReturn,
  Store,
} from '../../../shared/models/hospital.model';
import { formatCurrency, formatDate, readAssignedStoreId, toDateInputValue } from '../pharmacy-admin.utils';

@Component({
  selector: 'app-pharmacy-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-payments.component.html',
  styleUrl: './pharmacy-payments.component.scss',
})
export class PharmacyPaymentsComponent implements OnInit {
  stores: Store[] = [];
  payments: Payment[] = [];
  sales: Sale[] = [];
  salesReturns: SalesReturn[] = [];
  expenses: Expense[] = [];
  loading = false;
  saving = false;
  modalOpen = false;
  storeId = readAssignedStoreId();
  method = '';
  fromDate = '';
  toDate = '';
  methods: SalePaymentMethod[] = ['cash', 'card', 'bank', 'online', 'wallet', 'check'];
  form = this.emptyForm();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadStores();
    this.loadPayments();
  }

  get canCreate(): boolean {
    return this.backend.hasPermission('payments.create');
  }

  loadStores(): void {
    if (!this.backend.hasPermission('stores.read')) {
      return;
    }

    this.backend.getStores({ limit: 100, isActive: true }).subscribe({
      next: (result) => (this.stores = result.items),
      error: () => (this.stores = []),
    });
  }

  loadPayments(): void {
    this.loading = true;
    this.backend.getPayments({
      limit: 100,
      storeId: this.storeId || undefined,
      method: this.method || undefined,
      fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.payments = result.items),
        error: (err) => {
          this.payments = [];
          this.toastr.error(err?.error?.message || 'Unable to load payments.');
        },
      });
  }

  reset(): void {
    this.storeId = readAssignedStoreId();
    this.method = '';
    this.fromDate = '';
    this.toDate = '';
    this.loadPayments();
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.form.storeId = this.storeId;
    this.modalOpen = true;
    this.loadReferenceOptions();
  }

  closeModal(): void {
    if (!this.saving) {
      this.modalOpen = false;
    }
  }

  onReferenceTypeChange(): void {
    this.form.referenceId = '';
  }

  currentReferenceOptions(): Array<Sale | SalesReturn | Expense> {
    if (this.form.referenceType === 'sales_return') {
      return this.salesReturns;
    }
    if (this.form.referenceType === 'expense') {
      return this.expenses;
    }
    return this.sales;
  }

  referenceLabel(item: Sale | SalesReturn | Expense): string {
    if ('invoiceNo' in item) {
      return item.invoiceNo || item._id;
    }
    if ('returnNo' in item) {
      return item.returnNo || item._id;
    }
    return item.title || item._id;
  }

  save(): void {
    if (!this.form.referenceId || Number(this.form.amount || 0) <= 0) {
      this.toastr.error('Reference and valid amount are required.');
      return;
    }

    this.saving = true;
    this.backend.createPayment({
      referenceType: this.form.referenceType,
      referenceId: this.form.referenceId,
      amount: Number(this.form.amount || 0),
      method: this.form.method,
      paymentDate: new Date(`${this.form.paymentDate}T12:00:00`).toISOString(),
      storeId: this.form.storeId || undefined,
      referenceNo: this.form.referenceNo.trim() || undefined,
      note: this.form.note.trim() || undefined,
    })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.modalOpen = false;
          this.toastr.success('Payment created.');
          this.loadPayments();
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to create payment.');
        },
      });
  }

  storeName(id: string | null | undefined): string {
    return id ? this.stores.find((item) => item._id === id)?.name || id : '-';
  }

  currency(value: string | number | null | undefined): string {
    return formatCurrency(value);
  }

  date(value: string | null | undefined): string {
    return formatDate(value);
  }

  private loadReferenceOptions(): void {
    this.backend.getSales({ limit: 50, storeId: this.storeId || undefined, status: 'completed' }).subscribe({
      next: (result) => (this.sales = result.items),
      error: () => (this.sales = []),
    });
    this.backend.listSalesReturns({ limit: 50, storeId: this.storeId || undefined }).subscribe({
      next: (result) => (this.salesReturns = result.items),
      error: () => (this.salesReturns = []),
    });
    this.backend.getExpenses({ limit: 50, storeId: this.storeId || undefined }).subscribe({
      next: (result) => (this.expenses = result.items),
      error: () => (this.expenses = []),
    });
  }

  private emptyForm() {
    return {
      referenceType: 'sale',
      referenceId: '',
      amount: '0',
      method: 'cash' as SalePaymentMethod,
      paymentDate: toDateInputValue(new Date()),
      storeId: readAssignedStoreId(),
      referenceNo: '',
      note: '',
    };
  }
}
