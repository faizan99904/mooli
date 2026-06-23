import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import { Sale } from '../../../shared/models/hospital.model';
import { formatCurrency, formatDate, formatDateTime } from '../pharmacy-admin.utils';

@Component({
  selector: 'app-pharmacy-sale-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pharmacy-sale-detail.component.html',
  styleUrl: './pharmacy-sale-detail.component.scss',
})
export class PharmacySaleDetailComponent implements OnInit {
  sale: Sale | null = null;
  loading = false;
  loadError = '';
  cancelling = false;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private dialog: AppDialogService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      this.loadError = 'Sale ID is missing.';
      return;
    }

    this.loading = true;
    this.backend
      .getSaleById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (sale) => {
          this.sale = sale;
          this.loadError = sale ? '' : 'Sale not found.';
        },
        error: (err) => {
          this.sale = null;
          this.loadError = err?.error?.message || 'Unable to load sale detail.';
          this.toastr.error(this.loadError);
        },
      });
  }

  canCancel(sale: Sale): boolean {
    return this.backend.hasPermission('sales.cancel') && sale.status === 'completed';
  }

  async cancel(): Promise<void> {
    if (!this.sale) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Cancel Sale',
      message: `Cancel ${this.sale.invoiceNo}?`,
      confirmText: 'Cancel Sale',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.cancelling = true;
    this.backend
      .cancelSale(this.sale._id)
      .pipe(finalize(() => (this.cancelling = false)))
      .subscribe({
        next: (response) => {
          this.sale = response.data;
          this.toastr.success('Sale cancelled.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to cancel sale.'),
      });
  }

  currency(value: string | number | null | undefined): string {
    return formatCurrency(value);
  }

  date(value: string | null | undefined): string {
    return formatDate(value);
  }

  dateTime(value: string | null | undefined): string {
    return formatDateTime(value);
  }

  statusClass(status?: string): string {
    return `pharmacy-status-pill status-${String(status || 'draft').replace(/_/g, '-')}`;
  }

  balance(sale: Sale): number {
    const total = Number(sale.total) || 0;
    const paid = Number(sale.paidAmount) || 0;
    return total - paid;
  }
}
