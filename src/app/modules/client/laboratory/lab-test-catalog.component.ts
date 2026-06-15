import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { LabTestCatalog } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-lab-test-catalog',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-test-catalog.component.html',
  styleUrl: './lab-test-catalog.component.scss',
})
export class LabTestCatalogComponent implements OnInit {
  tests: LabTestCatalog[] = [];
  loading = false;
  search = '';
  showForm = false;
  saving = false;
  currentHospitalId: string | null = null;
  form = this.emptyForm();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
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
    this.loadTests();
  }

  emptyForm() {
    return {
      name: '',
      shortCode: '',
      department: 'Hematology',
      sampleType: 'Blood',
      tubeType: 'EDTA',
      price: 0,
      reportType: 'structured' as const,
      turnaroundHours: 2,
      requiresFasting: false,
      isActive: true,
    };
  }

  loadTests(): void {
    this.loading = true;
    this.backend
      .getLabTests({ limit: 100, search: this.search.trim() || undefined })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.tests = result.items;
        },
        error: (err) => {
          this.tests = [];
          this.toastr.error(err?.error?.message || 'Unable to load test catalog.');
        },
      });
  }

  seedDefaults(): void {
    this.backend.seedDefaultLabTests().subscribe({
      next: (response) => {
        this.toastr.success(`${response.data?.seeded || 0} default tests seeded.`);
        this.loadTests();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to seed tests.'),
    });
  }

  saveTest(): void {
    if (!this.form.name.trim() || !this.form.shortCode.trim()) {
      this.toastr.error('Test name and short code are required.');
      return;
    }

    if (!this.currentHospitalId) {
      this.toastr.error('Hospital is required to create a lab test.');
      return;
    }

    this.saving = true;
    this.backend
      .createLabTest({ ...this.form, hospitalId: this.currentHospitalId })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Lab test saved.');
          this.showForm = false;
          this.form = this.emptyForm();
          this.loadTests();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save test.'),
      });
  }
}
