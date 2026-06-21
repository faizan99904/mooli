import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  Hospital,
  LabComparisonRow,
  LabOrder,
  LabOrderItem,
  LabOrderStatus,
  LabResultParameter,
  LabSample,
  LabTestCatalog,
  User,
} from '../../../shared/models/hospital.model';
import { buildLabOrderReportHtml, openLabReportPrintWindow } from './lab-order-report.builder';
import { isLabOrderReportReady } from './lab-print-details';
import {
  buildLabComparisonColumns,
  findComparisonHistoryPoint,
  LabComparisonColumn,
} from './lab-comparison.utils';
import { printLabSampleLabels } from './lab-sample-label.builder';
import {
  activeLabSamples,
  canEditLabOrder,
  hasPendingSampleCollection,
  sampleStatusLabel,
} from './lab-order.utils';

@Component({
  selector: 'app-lab-order-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-order-detail.component.html',
  styleUrl: './lab-order-detail.component.scss',
})
export class LabOrderDetailComponent implements OnInit {
  order: LabOrder | null = null;
  hospital: Hospital | null = null;
  comparison: LabComparisonRow[] = [];
  catalog: LabTestCatalog[] = [];
  loading = false;
  saving = false;
  activeItemId = '';
  remarks = '';
  uploadUrl = '';
  addonSearch = '';
  selectedAddonIds: string[] = [];
  parameterGroups: Array<{
    subCategory: string;
    parameters: LabResultParameter[];
    showHeader: boolean;
  }> = [];

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
          if (!order) {
            this.order = null;
            this.parameterGroups = [];
            return;
          }

          const previousItemId = this.activeItemId;
          this.order = order;
          this.activeItemId =
            order.items?.find((item) => item._id === previousItemId)?._id ||
            order.items?.[0]?._id ||
            '';
          const activeItem = this.activeItem();
          this.remarks = activeItem?.remarks || '';
          this.refreshParameterGroups();
          this.loadHospital(order.hospitalId);
          this.loadComparison(order.patientId);
        },
        error: (err) => {
          this.order = null;
          this.parameterGroups = [];
          this.toastr.error(err?.error?.message || 'Unable to load lab order.');
        },
      });
  }

  loadHospital(hospitalId: string): void {
    if (!hospitalId) {
      return;
    }

    this.backend.getHospital(hospitalId).subscribe({
      next: (hospital) => {
        this.hospital = hospital;
      },
      error: () => {
        this.hospital = null;
      },
    });

    this.backend.getLabSettings().subscribe({
      next: (settings) => {
        if (!this.hospital) {
          this.hospital = {
            _id: hospitalId,
            name: settings.hospital.name,
            code: '',
            status: 'active',
            phone: settings.hospital.phone,
            email: settings.hospital.email,
            address: settings.hospital.address,
            city: settings.hospital.city,
            laboratorySettings: settings.laboratorySettings,
          };
          return;
        }

        this.hospital = {
          ...this.hospital,
          laboratorySettings: settings.laboratorySettings,
        };
      },
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

  canEditOrder(): boolean {
    return canEditLabOrder(this.order);
  }

  hasPendingSampleCollection(): boolean {
    return hasPendingSampleCollection(this.order);
  }

  activeSamples(): LabSample[] {
    return activeLabSamples(this.order);
  }

  sampleStatusLabel(status?: string): string {
    return sampleStatusLabel(status);
  }

  testsForSample(sample: LabSample): string {
    if (sample.testsSummary) {
      return sample.testsSummary;
    }

    const linked = (this.order?.items || []).filter((item) => item.sampleId === sample._id);
    return linked.map((item) => item.shortCode || item.testName).join(', ') || '-';
  }

  sampleForItem(item: LabOrderItem | null | undefined): LabSample | null {
    if (!item?.sampleId) {
      return null;
    }

    return (this.order?.samples || []).find((sample) => sample._id === item.sampleId) || null;
  }

  canRejectSample(sample: LabSample): boolean {
    if (sample.status === 'rejected') {
      return false;
    }

    const linked = (this.order?.items || []).filter((item) => item.sampleId === sample._id);
    return linked.every((item) => ['sample_collected', 'ordered'].includes(item.status));
  }

  selectItem(item: LabOrderItem): void {
    this.activeItemId = item._id;
    this.remarks = item.remarks || '';
    this.refreshParameterGroups();
  }

  refreshParameterGroups(): void {
    const item = this.activeItem();
    if (!item) {
      this.parameterGroups = [];
      return;
    }

    const grouped = new Map<string, LabResultParameter[]>();

    (item.parameters || []).forEach((parameter) => {
      const key = (parameter.subCategory || '').trim() || '__default__';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(parameter);
    });

    this.parameterGroups = Array.from(grouped.entries()).map(([key, parameters]) => ({
      subCategory: key === '__default__' ? '' : key,
      parameters,
      showHeader: key !== '__default__',
    }));
  }

  reloadOrderParameters(): void {
    const orderId = this.order?._id;
    if (!orderId) {
      return;
    }

    this.loadOrder(orderId);
    this.toastr.info('Reloading parameters from test catalog...');
  }

  collectSample(): void {
    if (!this.order) {
      return;
    }

    this.backend.collectLabSample(this.order._id, {}).subscribe({
      next: (response) => {
        this.order = response.data || this.order;
        this.refreshParameterGroups();
        const labels = (this.order?.samples || []).filter((sample) => sample.status === 'collected');
        if (this.order && labels.length) {
          printLabSampleLabels(this.order, labels);
        }
        this.toastr.success(`${labels.length || 1} sample label(s) ready.`);
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to collect sample.'),
    });
  }

  printSampleLabels(): void {
    if (!this.order) {
      return;
    }

    const labels = this.activeSamples();
    if (!labels.length) {
      this.toastr.info('No collected samples available for printing.');
      return;
    }

    printLabSampleLabels(this.order, labels);
  }

  printSingleSampleLabel(sample: LabSample): void {
    if (!this.order || sample.status === 'rejected') {
      return;
    }

    printLabSampleLabels(this.order, [sample]);
  }

  rejectSample(sample: LabSample): void {
    if (!this.order) {
      return;
    }

    const reason = window.prompt('Enter rejection reason (clotted, insufficient quantity, wrong container, etc.)');
    if (!reason?.trim()) {
      return;
    }

    this.backend.rejectLabSample(this.order._id, sample._id, { rejectionReason: reason.trim() }).subscribe({
      next: (response) => {
        this.order = response.data || this.order;
        this.refreshParameterGroups();
        this.toastr.success('Sample rejected. Collect again to generate a new sample ID.');
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to reject sample.'),
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
          this.refreshParameterGroups();
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
          this.refreshParameterGroups();
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
        this.refreshParameterGroups();
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
          this.activeItemId = this.order?.items?.[0]?._id || this.activeItemId;
          this.selectedAddonIds = [];
          this.refreshParameterGroups();
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

  comparisonColumns(): LabComparisonColumn[] {
    return buildLabComparisonColumns(this.comparisonForActiveTest(), this.order?._id, 4);
  }

  comparisonPoint(row: LabComparisonRow, column: LabComparisonColumn) {
    return findComparisonHistoryPoint(row, column.orderId);
  }

  isReportReady(): boolean {
    return isLabOrderReportReady(this.order);
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
    if (!this.order) {
      return;
    }

    if (!isLabOrderReportReady(this.order)) {
      this.toastr.error('Complete and verify all tests before printing the PDF report.');
      return;
    }

    const opened = openLabReportPrintWindow(
      buildLabOrderReportHtml({
        order: this.order,
        hospital: this.hospital,
        comparison: this.comparison,
        reportGeneratedBy: this.currentUser(),
      })
    );

    if (!opened) {
      this.toastr.error('Unable to open print preview.');
    }
  }

  private currentUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }
}
