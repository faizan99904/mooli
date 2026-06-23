import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { BackendService } from '../../../core/services/backend.service';
import { StockMovement } from '../../../shared/models/hospital.model';
import { formatCurrency, formatDateTime } from '../pharmacy-admin.utils';

@Component({
  selector: 'app-pharmacy-stock-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-stock-movements.component.html',
  styleUrl: './pharmacy-stock-movements.component.scss',
})
export class PharmacyStockMovementsComponent implements OnInit {
  movements: StockMovement[] = [];
  loading = false;
  referenceType = '';
  locationType = '';
  fromDate = '';
  toDate = '';

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.loading = true;
    this.backend.getStockMovements({
      limit: 100,
      referenceType: this.referenceType.trim() || undefined,
      locationType: this.locationType || undefined,
      fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.movements = result.items),
        error: (err) => {
          this.movements = [];
          this.toastr.error(err?.error?.message || 'Unable to load stock movements.');
        },
      });
  }

  reset(): void {
    this.referenceType = '';
    this.locationType = '';
    this.fromDate = '';
    this.toDate = '';
    this.loadMovements();
  }

  currency(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === '' ? '-' : formatCurrency(value);
  }

  dateTime(value: string | null | undefined): string {
    return formatDateTime(value);
  }
}
