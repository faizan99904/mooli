import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { PatientPaymentSummary } from '../../../shared/models/hospital.model';
import { PatientPaymentDetailModalComponent } from './patient-payment-detail-modal/patient-payment-detail-modal.component';

@Component({
  selector: 'app-payments',
  imports: [CommonModule, FormsModule, RouterLink, PatientPaymentDetailModalComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent implements OnInit {
  summaries: PatientPaymentSummary[] = [];
  loading = false;
  search = '';
  hasBalanceOnly = false;
  page = 1;
  limit = 15;
  totalPages = 0;

  modalOpen = false;
  selectedPatientId: string | null = null;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSummaries();
  }

  loadSummaries(): void {
    this.loading = true;
    this.backend
      .getPatientPaymentSummaries({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        hasBalance: this.hasBalanceOnly ? 'true' : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.summaries = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.summaries = [];
          this.toastr.error(err?.error?.message || 'Unable to load patient payments');
        },
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadSummaries();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages > 0 && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadSummaries();
  }

  openDetail(summary: PatientPaymentSummary): void {
    this.selectedPatientId = summary.patient._id;
    this.modalOpen = true;
  }

  closeDetail(): void {
    this.modalOpen = false;
    this.selectedPatientId = null;
  }

  onPaymentSaved(): void {
    this.loadSummaries();
  }

  patientName(summary: PatientPaymentSummary): string {
    const patient = summary.patient;
    return [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.patientNo || 'Patient';
  }

  paymentStatus(summary: PatientPaymentSummary): 'paid' | 'partial' | 'unpaid' {
    if (summary.balance <= 0 && summary.netPayable > 0) {
      return 'paid';
    }
    if (summary.totalPaid > 0 && summary.balance > 0) {
      return 'partial';
    }
    if (summary.balance > 0) {
      return 'unpaid';
    }
    return 'paid';
  }

  statusLabel(summary: PatientPaymentSummary): string {
    const status = this.paymentStatus(summary);
    if (status === 'paid') return 'Paid';
    if (status === 'partial') return 'Partial';
    return 'Unpaid';
  }
}
