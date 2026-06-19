import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { LabTestCatalog, LabTestParameterTemplate } from '../../../shared/models/hospital.model';

type LabTestReportType = 'structured' | 'uploaded_report' | 'both';

type LabTestParameterForm = {
  subCategory: string;
  parameterName: string;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  referenceText: string;
  criticalMin: number | null;
  criticalMax: number | null;
  sortOrder: number;
};

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
      reportType: 'structured' as LabTestReportType,
      turnaroundHours: 2,
      requiresFasting: false,
      isActive: true,
      parameters: [this.emptyParameter()],
    };
  }

  emptyParameter(sortOrder = this.form?.parameters?.length ? this.form.parameters.length + 1 : 1): LabTestParameterForm {
    return {
      subCategory: '',
      parameterName: '',
      unit: '',
      referenceMin: null,
      referenceMax: null,
      referenceText: '',
      criticalMin: null,
      criticalMax: null,
      sortOrder,
    };
  }

  addParameter(): void {
    this.form.parameters = [...this.form.parameters, this.emptyParameter(this.form.parameters.length + 1)];
  }

  removeParameter(index: number): void {
    this.form.parameters = this.form.parameters
      .filter((_parameter, parameterIndex) => parameterIndex !== index)
      .map((parameter, parameterIndex) => ({ ...parameter, sortOrder: parameterIndex + 1 }));
  }

  applyElectrolytesPreset(): void {
    this.form.name = this.form.name || 'Serum Electrolytes';
    this.form.shortCode = this.form.shortCode || 'SE';
    this.form.department = this.form.department || 'Biochemistry';
    this.form.sampleType = this.form.sampleType || 'Serum';
    this.form.tubeType = this.form.tubeType || 'Plain';
    this.form.parameters = [
      { subCategory: 'Electrolytes', parameterName: 'Serum Sodium', unit: 'mmol/L', referenceMin: 135, referenceMax: 145, referenceText: '', criticalMin: 120, criticalMax: 160, sortOrder: 1 },
      { subCategory: 'Electrolytes', parameterName: 'Serum Potassium', unit: 'mmol/L', referenceMin: 3.5, referenceMax: 5.1, referenceText: '', criticalMin: 2.5, criticalMax: 6.5, sortOrder: 2 },
      { subCategory: 'Electrolytes', parameterName: 'Serum Chloride', unit: 'mmol/L', referenceMin: 98, referenceMax: 107, referenceText: '', criticalMin: null, criticalMax: null, sortOrder: 3 },
      { subCategory: 'Electrolytes', parameterName: 'Serum Bicarbonate', unit: 'mmol/L', referenceMin: 22, referenceMax: 29, referenceText: '', criticalMin: null, criticalMax: null, sortOrder: 4 },
    ];
  }

  parameterSummary(test: LabTestCatalog): string {
    const count = test.parameters?.length || 0;
    if (!count) {
      return 'No structured parameters';
    }

    const preview = test.parameters
      .slice(0, 3)
      .map((parameter) => parameter.parameterName)
      .filter(Boolean)
      .join(', ');

    return `${count} parameter${count === 1 ? '' : 's'}${preview ? `: ${preview}` : ''}${count > 3 ? '...' : ''}`;
  }

  private normalizeNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private buildParametersPayload(): LabTestParameterTemplate[] {
    return this.form.parameters
      .map((parameter, index) => ({
        subCategory: parameter.subCategory.trim(),
        parameterName: parameter.parameterName.trim(),
        unit: parameter.unit.trim(),
        referenceMin: this.normalizeNumber(parameter.referenceMin),
        referenceMax: this.normalizeNumber(parameter.referenceMax),
        referenceText: parameter.referenceText.trim(),
        criticalMin: this.normalizeNumber(parameter.criticalMin),
        criticalMax: this.normalizeNumber(parameter.criticalMax),
        sortOrder: this.normalizeNumber(parameter.sortOrder) ?? index + 1,
      }))
      .filter((parameter) => parameter.parameterName);
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

    const parameters = this.buildParametersPayload();
    if ((this.form.reportType === 'structured' || this.form.reportType === 'both') && parameters.length === 0) {
      this.toastr.error('Add at least one parameter for a structured report.');
      return;
    }

    this.saving = true;
    this.backend
      .createLabTest({ ...this.form, parameters, hospitalId: this.currentHospitalId })
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
