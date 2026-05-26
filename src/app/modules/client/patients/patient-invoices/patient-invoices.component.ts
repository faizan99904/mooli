import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Bill } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-patient-invoices',
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-invoices.component.html',
  styleUrl: './patient-invoices.component.scss',
})
export class PatientInvoicesComponent implements OnInit {
  bills: Bill[] = [];
  loading = false;
  patientId = '';

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    if (this.patientId) {
      this.loadBills();
    }
  }

  loadBills(): void {
    this.loading = true;
    this.backend
      .getPatientBills(this.patientId, { limit: 100 })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.bills = result.items),
        error: (err) => {
          this.bills = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }
}
