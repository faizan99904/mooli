import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  cancelling = false;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private dialog: AppDialogService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (id) {
      this.backend.getSaleById(id).subscribe({
        next: (sale) => (this.sale = sale),
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load sale detail.'),
      });
    }
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
    this.backend.cancelSale(this.sale._id).subscribe({
      next: (response) => {
        this.sale = response.data;
        this.cancelling = false;
        this.toastr.success('Sale cancelled.');
      },
      error: (err) => {
        this.cancelling = false;
        this.toastr.error(err?.error?.message || 'Unable to cancel sale.');
      },
    });
  }

  currency(value: string | number | null | undefined): string {
    return formatCurrency(value);
  }

  date(_value: string | null | undefined): string {
    return formatDate(_value);
  }

  dateTime(value: string | null | undefined): string {
    return formatDateTime(value);
  }
}
