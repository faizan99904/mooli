import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { Bill } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-payments',
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent implements OnInit {
  bills: Bill[] = [];
  loading = false;
  paymentStatus = '';
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
      .getBills({
        page: this.page,
        limit: this.limit,
        paymentStatus: this.paymentStatus,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.bills = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.bills = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  patientName(bill: Bill): string {
    return bill.patient ? `${bill.patient.firstName} ${bill.patient.lastName}`.trim() : '-';
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPayments();
  }
}
