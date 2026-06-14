import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Encounter, EncounterLedger } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-encounter-ledger',
  imports: [CommonModule, FormsModule],
  templateUrl: './encounter-ledger.component.html',
  styleUrl: './encounter-ledger.component.scss',
})
export class EncounterLedgerComponent implements OnInit {
  encounters: Encounter[] = [];
  selectedLedger: EncounterLedger | null = null;
  selectedEncounterId: string | null = null;
  showDetailPanel = false;
  loading = false;
  ledgerLoading = false;
  status = '';
  type = '';
  page = 1;
  limit = 10;
  totalPages = 0;

  paymentAmount = 0;
  paymentMethod = 'cash';
  paymentType = 'partial';
  paymentNote = '';

  constructor(
    private backend: BackendService,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const encounterId = params.get('encounterId');
      this.loadEncounters();

      if (encounterId) {
        this.openLedger(encounterId);
      }
    });
  }

  loadEncounters(): void {
    this.loading = true;
    this.backend
      .getEncounters({
        page: this.page,
        limit: this.limit,
        status: this.status || undefined,
        type: this.type || undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.encounters = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load encounters'),
      });
  }

  openLedger(encounterId: string): void {
    this.selectedEncounterId = encounterId;
    this.showDetailPanel = true;
    this.ledgerLoading = true;
    this.backend
      .getEncounterLedger(encounterId)
      .pipe(finalize(() => (this.ledgerLoading = false)))
      .subscribe({
        next: (ledger) => {
          this.selectedLedger = ledger;
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load patient ledger'),
      });
  }

  recordPayment(): void {
    if (!this.selectedLedger || this.paymentAmount <= 0) {
      this.toastr.error('Enter a valid payment amount');
      return;
    }

    this.backend
      .recordEncounterPayment(this.selectedLedger.encounter._id, {
        amount: this.paymentAmount,
        method: this.paymentMethod,
        type: this.paymentType,
        note: this.paymentNote,
      })
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message || 'Payment recorded');
          this.paymentAmount = 0;
          this.paymentNote = '';
          this.openLedger(this.selectedLedger!.encounter._id);
          this.loadEncounters();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to record payment'),
      });
  }

  closeLedger(): void {
    this.showDetailPanel = false;
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages > 0 && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadEncounters();
  }

  statusBadgeClass(status: string): string {
    return `badge-${status.replace(/_/g, '-')}`;
  }

  patientName(encounter: Encounter): string {
    const patient = encounter.patient;
    if (!patient) {
      return 'Unknown patient';
    }

    return [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.patientNo || 'Patient';
  }
}
