import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Bill } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-invoices',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
})
export class InvoicesComponent implements OnInit {
  bills: Bill[] = [];
  loading = false;
  paymentStatus = '';
  dateFrom = '';
  dateTo = '';
  page = 1;
  limit = 10;
  totalPages = 0;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadBills();
  }

  loadBills(): void {
    this.loading = true;
    this.backend
      .getBills({
        page: this.page,
        limit: this.limit,
        paymentStatus: this.paymentStatus,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
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

  updatePayment(bill: Bill): void {
    const amount = prompt('Paid amount', String(bill.paidAmount || bill.grandTotal));
    if (amount === null) {
      return;
    }

    const method = prompt('Payment method (cash, card, bank, online, wallet, check)', bill.paymentMethod || 'cash') || 'cash';
    this.backend
      .updateBillPayment(bill._id, {
        paidAmount: Number(amount),
        paymentMethod: method,
      })
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.loadBills();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
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
    this.loadBills();
  }
}
