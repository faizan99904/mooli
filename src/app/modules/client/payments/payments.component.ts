import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { Payment } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-payments',
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent implements OnInit {
  payments: Payment[] = [];
  loading = false;
  method = '';
  referenceType = '';
  page = 1;
  limit = 10;
  totalPages = 0;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading = true;
    this.backend
      .getPayments({
        page: this.page,
        limit: this.limit,
        method: this.method,
        referenceType: this.referenceType,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.payments = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.payments = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPayments();
  }
}
