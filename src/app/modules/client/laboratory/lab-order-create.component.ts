import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { LabTestCatalog, Patient } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-lab-order-create',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-order-create.component.html',
  styleUrl: './lab-order-create.component.scss',
})
export class LabOrderCreateComponent implements OnInit {
  patients: Patient[] = [];
  catalog: LabTestCatalog[] = [];
  selectedTests: LabTestCatalog[] = [];
  loading = false;
  saving = false;
  patientPhone = '';
  phoneLookupLoading = false;
  phoneLookupPerformed = false;
  phoneMatchedTotal = 0;
  selectedPatientId = '';
  selectedPatient: Patient | null = null;
  currentHospitalId: string | null = null;
  source: 'doctor' | 'walk-in' | 'admission' | 'emergency' = 'walk-in';
  referredBy = '';
  priority: 'normal' | 'urgent' = 'normal';
  paidAmount = 0;
  notes = '';
  testSearch = '';

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { hospitalId?: string | null }
      | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.backend.getMe().subscribe({
      next: (user) => {
        this.currentHospitalId = user.hospitalId || this.currentHospitalId;
      },
    });
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading = true;
    this.backend
      .getLabTests({ limit: 100, isActive: true })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.catalog = result.items;
          if (this.catalog.length === 0) {
            this.backend.seedDefaultLabTests().subscribe({
              next: () => this.loadCatalog(),
            });
          }
        },
        error: () => {
          this.catalog = [];
        },
      });
  }

  canSearchPatientPhone(): boolean {
    return this.normalizePhone(this.patientPhone).length >= 4 && !this.phoneLookupLoading;
  }

  lookupPatientsByPhone(): void {
    const phone = this.patientPhone.trim();
    const normalizedPhone = this.normalizePhone(phone);

    if (normalizedPhone.length < 4) {
      this.toastr.error('Enter at least 4 digits of phone number.');
      return;
    }

    this.phoneLookupLoading = true;
    this.phoneLookupPerformed = false;
    this.phoneMatchedTotal = 0;
    this.patients = [];
    this.selectedPatientId = '';
    this.selectedPatient = null;

    this.backend
      .getPatients({ limit: 100, status: 'active', search: phone })
      .pipe(finalize(() => (this.phoneLookupLoading = false)))
      .subscribe({
        next: (result) => {
          this.patients = (result.items || []).filter((patient) =>
            this.normalizePhone(patient.phone || '').includes(normalizedPhone)
          );
          this.phoneMatchedTotal = this.patients.length;
          this.phoneLookupPerformed = true;

          if (this.phoneMatchedTotal === 0) {
            this.toastr.info('No patient found against this phone number.');
          }
        },
        error: (err) => {
          this.phoneLookupPerformed = true;
          this.toastr.error(err?.error?.message || 'Unable to search patients.');
        },
      });
  }

  filteredCatalog(): LabTestCatalog[] {
    const query = this.testSearch.trim().toLowerCase();
    if (!query) {
      return this.catalog;
    }

    return this.catalog.filter((test) =>
      `${test.name} ${test.shortCode} ${test.department}`.toLowerCase().includes(query)
    );
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  selectPatient(patient: Patient): void {
    this.selectedPatientId = patient._id;
    this.selectedPatient = patient;
    this.patientPhone = patient.phone || this.patientPhone;
  }

  resolveHospitalId(): string | null {
    return this.currentHospitalId || this.selectedPatient?.hospitalId || null;
  }

  toggleTest(test: LabTestCatalog): void {
    const exists = this.selectedTests.some((item) => item._id === test._id);
    this.selectedTests = exists
      ? this.selectedTests.filter((item) => item._id !== test._id)
      : [...this.selectedTests, test];
  }

  isSelected(test: LabTestCatalog): boolean {
    return this.selectedTests.some((item) => item._id === test._id);
  }

  totalAmount(): number {
    return this.selectedTests.reduce((sum, test) => sum + Number(test.price || 0), 0);
  }

  balanceAmount(): number {
    return Math.max(this.totalAmount() - Number(this.paidAmount || 0), 0);
  }

  saveOrder(printReceipt = false): void {
    if (!this.selectedPatientId) {
      this.toastr.error('Select a patient first.');
      return;
    }

    if (this.selectedTests.length === 0) {
      this.toastr.error('Select at least one test.');
      return;
    }

    const hospitalId = this.resolveHospitalId();
    if (!hospitalId) {
      this.toastr.error('Hospital is required. Select a patient linked to a hospital.');
      return;
    }

    this.saving = true;
    this.backend
      .createLabOrder({
        hospitalId,
        patientId: this.selectedPatientId,
        source: this.source,
        referredBy: this.referredBy,
        priority: this.priority,
        paidAmount: this.paidAmount,
        notes: this.notes,
        tests: this.selectedTests.map((test) => ({ testId: test._id })),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success('Lab order created.');
          if (printReceipt) {
            window.print();
          }
          void this.router.navigate(['/laboratory/orders', response.data?._id || '']);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to create lab order.'),
      });
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }
}
