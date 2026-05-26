import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../../core/services/backend.service';
import { Bill } from '../../../../../shared/models/hospital.model';

@Component({
  selector: 'app-invoice-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss',
})
export class InvoiceDetailComponent implements OnInit {
  bill: Bill | null = null;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading = true;
      this.backend
        .getBill(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (bill) => (this.bill = bill),
          error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
        });
    }
  }

  patientName(): string {
    const patient = this.bill?.patient;
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }
}
