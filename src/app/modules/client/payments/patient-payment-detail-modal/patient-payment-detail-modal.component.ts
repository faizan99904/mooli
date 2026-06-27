import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import {
  PatientPaymentDetail,
  PatientPaymentSourceSummary,
} from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-patient-payment-detail-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-payment-detail-modal.component.html',
  styleUrl: './patient-payment-detail-modal.component.scss',
})
export class PatientPaymentDetailModalComponent implements OnChanges {
  @Input() open = false;
  @Input() patientId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  detail: PatientPaymentDetail | null = null;
  loading = false;
  saving = false;

  discountAmount = 0;
  collectAmount = 0;
  paymentMethod = 'cash';
  paymentType: 'partial' | 'final' | 'advance' = 'partial';
  paymentNote = '';

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['patientId']) && this.open && this.patientId) {
      this.loadDetail();
    }

    if (changes['open'] && !this.open) {
      this.resetForm();
    }
  }

  loadDetail(): void {
    if (!this.patientId) {
      return;
    }

    this.loading = true;
    this.backend
      .getPatientPaymentDetail(this.patientId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (detail) => {
          this.detail = detail;
          this.collectAmount = Math.max(detail.totals.balance, 0);
          this.discountAmount = 0;
        },
        error: (err: { error?: { message?: string } }) => this.toastr.error(err?.error?.message || 'Unable to load payment details'),
      });
  }

  close(): void {
    this.closed.emit();
  }

  patientName(): string {
    if (!this.detail?.patient) {
      return 'Patient';
    }

    const patient = this.detail.patient;
    return [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.patientNo || 'Patient';
  }

  remainingSources(): PatientPaymentSourceSummary[] {
    return Object.values(this.detail?.remainingBySource || {})
      .filter((item) => (item.remaining || 0) > 0)
      .sort((a, b) => (b.remaining || 0) - (a.remaining || 0));
  }

  paymentStatus(): 'paid' | 'partial' | 'unpaid' {
    if (!this.detail) {
      return 'unpaid';
    }

    const { balance, netPayable, totalPaid } = this.detail.totals;
    if (balance <= 0 && netPayable > 0) {
      return 'paid';
    }
    if (totalPaid > 0 && balance > 0) {
      return 'partial';
    }
    if (balance > 0) {
      return 'unpaid';
    }
    return 'paid';
  }

  statusLabel(): string {
    const status = this.paymentStatus();
    if (status === 'paid') return 'Paid';
    if (status === 'partial') return 'Partial';
    return 'Unpaid';
  }

  projectedBalance(): number {
    if (!this.detail) {
      return 0;
    }

    return Math.max(this.detail.totals.balance - Number(this.discountAmount || 0) - Number(this.collectAmount || 0), 0);
  }

  fillRemaining(): void {
    if (!this.detail) {
      return;
    }

    const afterDiscount = Math.max(this.detail.totals.balance - Number(this.discountAmount || 0), 0);
    this.collectAmount = afterDiscount;
    this.paymentType = afterDiscount === this.detail.totals.balance ? 'final' : 'partial';
  }

  collectPayment(): void {
    if (!this.detail?.primaryEncounterId) {
      this.toastr.error('No open encounter found for this patient');
      return;
    }

    const discount = Number(this.discountAmount || 0);
    const amount = Number(this.collectAmount || 0);

    if (discount <= 0 && amount <= 0) {
      this.toastr.error('Enter discount or collect amount');
      return;
    }

    if (discount > 0 && discount > this.detail.totals.balance) {
      this.toastr.error('Discount cannot be greater than remaining balance');
      return;
    }

    if (amount > 0) {
      const maxCollect = Math.max(this.detail.totals.balance - discount, 0);
      if (amount > maxCollect) {
        this.toastr.error('Collect amount is greater than remaining balance');
        return;
      }
    }

    this.saving = true;
    const encounterId = this.detail.primaryEncounterId;

    const completeSuccess = (): void => {
      this.toastr.success('Payment updated successfully');
      this.saved.emit();
      this.loadDetail();
    };

    const runPayment = (): void => {
      if (amount <= 0) {
        this.saving = false;
        completeSuccess();
        return;
      }

      this.backend
        .recordEncounterPayment(encounterId, {
          amount,
          method: this.paymentMethod,
          type: this.paymentType,
          note: this.paymentNote,
        })
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => completeSuccess(),
          error: (err: { error?: { message?: string } }) =>
            this.toastr.error(err?.error?.message || 'Unable to collect payment'),
        });
    };

    if (discount > 0) {
      this.backend
        .applyEncounterDiscount(encounterId, {
          amount: discount,
          note: this.paymentNote || 'Payment discount',
        })
        .subscribe({
          next: () => runPayment(),
          error: (err: { error?: { message?: string } }) => {
            this.saving = false;
            this.toastr.error(err?.error?.message || 'Unable to apply discount');
          },
        });
      return;
    }

    runPayment();
  }

  sourceLabel(sourceType: string): string {
    const map: Record<string, string> = {
      appointment: 'Appointment',
      lab: 'Laboratory',
      bed: 'Room / Bed',
      ward: 'Ward',
      pharmacy: 'Pharmacy',
      doctor: 'Doctor',
      procedure: 'Procedure',
      nursing: 'Nursing',
      manual: 'Manual',
      misc: 'Other',
    };
    return map[sourceType] || sourceType;
  }

  private resetForm(): void {
    this.detail = null;
    this.discountAmount = 0;
    this.collectAmount = 0;
    this.paymentMethod = 'cash';
    this.paymentType = 'partial';
    this.paymentNote = '';
  }
}
