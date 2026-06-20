import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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

type LabTestCatalogRow = LabTestCatalog & { summaryText: string };

@Component({
  selector: 'app-lab-test-catalog',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-test-catalog.component.html',
  styleUrl: './lab-test-catalog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabTestCatalogComponent implements OnInit, OnDestroy {
  tests: LabTestCatalogRow[] = [];
  loading = false;
  search = '';
  showForm = false;
  saving = false;
  isEditMode = false;
  editingTestId = '';
  currentHospitalId: string | null = null;
  form = this.emptyForm();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
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

  ngOnDestroy(): void {
    document.body.classList.remove('catalog-modal-open');
    document.body.style.overflow = '';
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
      parameters: [this.emptyParameter(1)],
    };
  }

  emptyParameter(sortOrder = 1): LabTestParameterForm {
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

  openFormModal(): void {
    this.isEditMode = false;
    this.editingTestId = '';
    this.form = this.emptyForm();
    this.showForm = true;
    document.body.classList.add('catalog-modal-open');
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  openEditModal(test: LabTestCatalogRow): void {
    this.isEditMode = true;
    this.editingTestId = test._id;
    this.form = this.testToForm(test);
    this.showForm = true;
    document.body.classList.add('catalog-modal-open');
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    if (this.saving) {
      return;
    }

    this.dismissModal();
  }

  private dismissModal(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingTestId = '';
    this.form = this.emptyForm();
    document.body.classList.remove('catalog-modal-open');
    document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  private testToForm(test: LabTestCatalog) {
    const parameters = (test.parameters?.length ? test.parameters : [this.emptyParameter()]).map(
      (parameter, index) => ({
        subCategory: parameter.subCategory || '',
        parameterName: parameter.parameterName || '',
        unit: parameter.unit || '',
        referenceMin: parameter.referenceMin ?? null,
        referenceMax: parameter.referenceMax ?? null,
        referenceText: parameter.referenceText || '',
        criticalMin: parameter.criticalMin ?? null,
        criticalMax: parameter.criticalMax ?? null,
        sortOrder: parameter.sortOrder ?? index + 1,
      })
    );

    return {
      name: test.name,
      shortCode: test.shortCode,
      department: test.department,
      sampleType: test.sampleType,
      tubeType: test.tubeType || '',
      price: test.price,
      reportType: (test.reportType || 'structured') as LabTestReportType,
      turnaroundHours: test.turnaroundHours ?? 2,
      requiresFasting: Boolean(test.requiresFasting),
      isActive: test.isActive !== false,
      parameters,
    };
  }

  trackTest(_index: number, test: LabTestCatalogRow): string {
    return test._id;
  }

  trackParameter(index: number): number {
    return index;
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

  private buildParameterSummary(test: LabTestCatalog): string {
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
      .map((parameter, index) => {
        const subCategory = parameter.subCategory.trim();
        const parameterName = parameter.parameterName.trim() || subCategory;

        return {
          subCategory,
          parameterName,
          unit: parameter.unit.trim(),
          referenceMin: this.normalizeNumber(parameter.referenceMin),
          referenceMax: this.normalizeNumber(parameter.referenceMax),
          referenceText: parameter.referenceText.trim(),
          criticalMin: this.normalizeNumber(parameter.criticalMin),
          criticalMax: this.normalizeNumber(parameter.criticalMax),
          sortOrder: this.normalizeNumber(parameter.sortOrder) ?? index + 1,
        };
      })
      .filter((parameter) => parameter.parameterName);
  }

  private mapTestRows(items: LabTestCatalog[]): LabTestCatalogRow[] {
    return items.map((test) => ({
      ...test,
      summaryText: this.buildParameterSummary(test),
    }));
  }

  loadTests(): void {
    this.loading = true;
    this.backend
      .getLabTests({ limit: 100, search: this.search.trim() || undefined })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (result) => {
          this.tests = this.mapTestRows(result.items);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.tests = [];
          this.toastr.error(err?.error?.message || 'Unable to load test catalog.');
          this.cdr.markForCheck();
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

    if (!this.isEditMode && !this.currentHospitalId) {
      this.toastr.error('Hospital is required to create a lab test.');
      return;
    }

    const parameters = this.buildParametersPayload();
    if ((this.form.reportType === 'structured' || this.form.reportType === 'both') && parameters.length === 0) {
      this.toastr.error('Add at least one parameter for a structured report.');
      return;
    }

    const payload = {
      name: this.form.name.trim(),
      shortCode: this.form.shortCode.trim(),
      department: this.form.department.trim(),
      sampleType: this.form.sampleType.trim(),
      tubeType: this.form.tubeType.trim(),
      price: Number(this.form.price || 0),
      reportType: this.form.reportType,
      turnaroundHours: Number(this.form.turnaroundHours || 0),
      requiresFasting: this.form.requiresFasting,
      isActive: this.form.isActive,
      parameters,
    };

    this.saving = true;
    this.cdr.markForCheck();

    const request$ =
      this.isEditMode && this.editingTestId
        ? this.backend.updateLabTest(this.editingTestId, payload)
        : this.backend.createLabTest({ ...payload, hospitalId: this.currentHospitalId });

    request$
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.toastr.success(this.isEditMode ? 'Lab test updated.' : 'Lab test saved.');
          this.dismissModal();
          this.loadTests();
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message || (this.isEditMode ? 'Unable to update test.' : 'Unable to save test.')
          );
          this.cdr.markForCheck();
        },
      });
  }
}
