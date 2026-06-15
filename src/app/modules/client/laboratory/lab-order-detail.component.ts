import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  LabComparisonRow,
  LabOrder,
  LabOrderItem,
  LabOrderStatus,
  LabResultParameter,
  LabTestCatalog,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-lab-order-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-order-detail.component.html',
  styleUrl: './lab-order-detail.component.scss',
})
export class LabOrderDetailComponent implements OnInit {
  order: LabOrder | null = null;
  comparison: LabComparisonRow[] = [];
  catalog: LabTestCatalog[] = [];
  loading = false;
  saving = false;
  activeItemId = '';
  remarks = '';
  uploadUrl = '';
  addonSearch = '';
  selectedAddonIds: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      if (id) {
        this.loadOrder(id);
      }
    });
    this.backend.getLabTests({ limit: 100, isActive: true }).subscribe({
      next: (result) => {
        this.catalog = result.items;
      },
    });
  }

  loadOrder(id: string): void {
    this.loading = true;
    this.backend
      .getLabOrder(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (order) => {
          this.order = order;
          this.activeItemId = order.items[0]?._id || '';
          this.loadComparison(order.patientId);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load lab order.'),
      });
  }

  loadComparison(patientId: string): void {
    this.backend.getPatientLabComparison(patientId).subscribe({
      next: (rows) => {
        this.comparison = rows;
      },
      error: () => {
        this.comparison = [];
      },
    });
  }

  activeItem(): LabOrderItem | null {
    return this.order?.items.find((item) => item._id === this.activeItemId) || this.order?.items[0] || null;
  }

  patientName(): string {
    const patient = this.order?.patient;
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  selectItem(item: LabOrderItem): void {
    this.activeItemId = item._id;
    this.remarks = item.remarks || '';
  }

  collectSample(): void {
    if (!this.order) {
      return;
    }

    this.backend.collectLabSample(this.order._id, {}).subscribe({
      next: (response) => {
        this.order = response.data || this.order;
        this.toastr.success('Sample collected.');
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to collect sample.'),
    });
  }

  saveResults(submitForVerification = false): void {
    const order = this.order;
    const item = this.activeItem();
    if (!order || !item) {
      return;
    }

    this.saving = true;
    this.backend
      .saveLabItemResults(order._id, item._id, {
        parameters: item.parameters,
        remarks: this.remarks,
        submitForVerification,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.order = response.data || order;
          this.toastr.success(submitForVerification ? 'Sent for verification.' : 'Results saved.');
          this.loadComparison(order.patientId);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save results.'),
      });
  }

  uploadReport(): void {
    const order = this.order;
    const item = this.activeItem();
    if (!order || !item || !this.uploadUrl.trim()) {
      this.toastr.error('Enter report file URL.');
      return;
    }

    this.saving = true;
    this.backend
      .uploadLabItemReport(order._id, item._id, {
        fileUrl: this.uploadUrl.trim(),
        fileType: this.uploadUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
        reportType: item.testName,
        submitForVerification: true,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.order = response.data || order;
          this.uploadUrl = '';
          this.toastr.success('Report uploaded.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to upload report.'),
      });
  }

  verifyItem(): void {
    const order = this.order;
    const item = this.activeItem();
    if (!order || !item) {
      return;
    }

    this.backend.verifyLabOrderItem(order._id, item._id, { remarks: this.remarks }).subscribe({
      next: (response) => {
        this.order = response.data || order;
        this.toastr.success('Result verified.');
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to verify result.'),
    });
  }

  filteredAddons(): LabTestCatalog[] {
    const existing = new Set((this.order?.items || []).map((item) => item.testName.toLowerCase()));
    const query = this.addonSearch.trim().toLowerCase();
    return this.catalog.filter((test) => {
      if (existing.has(test.name.toLowerCase()) || existing.has(test.shortCode.toLowerCase())) {
        return false;
      }
      return !query || `${test.name} ${test.shortCode}`.toLowerCase().includes(query);
    });
  }

  toggleAddon(test: LabTestCatalog): void {
    this.selectedAddonIds = this.selectedAddonIds.includes(test._id)
      ? this.selectedAddonIds.filter((id) => id !== test._id)
      : [...this.selectedAddonIds, test._id];
  }

  addExtraTests(): void {
    if (!this.order || this.selectedAddonIds.length === 0) {
      return;
    }

    this.backend
      .addTestsToLabOrder(this.order._id, {
        tests: this.selectedAddonIds.map((testId) => ({ testId })),
      })
      .subscribe({
        next: (response) => {
          this.order = response.data || this.order;
          this.selectedAddonIds = [];
          this.toastr.success('Extra tests added to order.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to add tests.'),
      });
  }

  comparisonForActiveTest(): LabComparisonRow[] {
    const item = this.activeItem();
    if (!item) {
      return [];
    }

    return this.comparison.filter((row) => row.testName.toLowerCase() === item.testName.toLowerCase());
  }

  comparisonDates(): string[] {
    const dates = new Set<string>();
    this.comparisonForActiveTest().forEach((row) => {
      row.history.forEach((point) => {
        if (point.date) {
          dates.add(point.date);
        }
      });
    });

    return Array.from(dates)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())
      .slice(-5);
  }

  comparisonPoint(row: LabComparisonRow, date: string) {
    return row.history.find((point) => point.date === date);
  }

  latestTrend(row: LabComparisonRow): string | undefined {
    const latest = [...row.history]
      .filter((point) => point.date)
      .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())[0];
    return latest?.trend;
  }

  formatRange(parameter: LabResultParameter): string {
    if (parameter.referenceMin != null && parameter.referenceMax != null) {
      return `${parameter.referenceMin} - ${parameter.referenceMax}`;
    }
    return '—';
  }

  formatComparisonRange(row: LabComparisonRow): string {
    if (row.referenceMin != null && row.referenceMax != null) {
      return `${row.referenceMin} - ${row.referenceMax}`;
    }
    return '—';
  }

  patientMeta(): string {
    const patient = this.order?.patient;
    if (!patient) {
      return '—';
    }

    const parts = [
      patient.patientNo ? `MRN ${patient.patientNo}` : '',
      patient.gender ? patient.gender.toUpperCase() : '',
      patient.phone || '',
    ].filter(Boolean);

    return parts.join(' · ') || '—';
  }

  sourceLabel(source?: string): string {
    const labels: Record<string, string> = {
      doctor: 'Doctor Prescription',
      'walk-in': 'Walk-in',
      admission: 'Admission',
      emergency: 'Emergency',
    };
    return labels[String(source || '')] || source || '—';
  }

  statusLabel(status?: string): string {
    return String(status || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  resultModeLabel(mode?: string): string {
    const labels: Record<string, string> = {
      structured: 'Structured Entry',
      uploaded_report: 'Upload Report',
      both: 'Structured + Upload',
    };
    return labels[String(mode || '')] || 'Structured Entry';
  }

  trendLabel(trend?: string): string {
    const labels: Record<string, string> = {
      improved: 'Improving',
      worsened: 'Worsening',
      stable: 'Stable',
      unknown: 'Unknown',
    };
    return labels[String(trend || '')] || this.statusLabel(trend);
  }

  orderStatusClass(status?: string): string {
    return `status-${String(status || 'ordered').replace(/_/g, '-')}`;
  }

  paramStatusClass(status?: string): string {
    return `param-${String(status || 'unknown').replace(/_/g, '-')}`;
  }

  trendClass(trend?: string): string {
    return `trend-${String(trend || 'unknown').replace(/_/g, '-')}`;
  }

  isStepDone(step: LabOrderStatus): boolean {
    const order = ['ordered', 'sample_collected', 'processing', 'result_entered', 'verified', 'completed'];
    const current = this.order?.status || 'ordered';
    return order.indexOf(step) <= order.indexOf(current);
  }

  statusClass(status?: string): string {
    return this.orderStatusClass(status);
  }

  printReport(): void {
    window.print();
  }
}
