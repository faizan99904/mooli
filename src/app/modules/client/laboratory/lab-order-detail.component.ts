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
  LabTestCatalog,
} from '../../../shared/models/hospital.model';
import { buildLabOrderReportHtml } from './lab-order-report.builder';
import { isLabOrderReportReady } from './lab-print-details';
import { canEditLabOrder } from './lab-order.utils';

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
    if (!this.order) {
      return;
    }

    if (!isLabOrderReportReady(this.order)) {
      this.toastr.info('Report will print with hospital details until all tests are verified.');
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Lab report print');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      border: '0',
      height: '0',
      left: '-10000px',
      opacity: '0',
      pointerEvents: 'none',
      position: 'fixed',
      top: '0',
      width: '100vw',
    });

    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const printDocument = iframe.contentDocument || printWindow?.document;
    if (!printWindow || !printDocument) {
      iframe.remove();
      this.toastr.error('Unable to open print preview.');
      return;
    }

    printDocument.open();
    printDocument.write(
      buildLabOrderReportHtml({
        order: this.order,
        hospital: this.hospital,
        comparison: this.comparison,
      })
    );
    printDocument.close();

    let handled = false;
    const finish = () => {
      if (handled) {
        return;
      }

      handled = true;
      iframe.remove();
    };

    printWindow.onafterprint = finish;

    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        finish();
      }
    }, 250);

    window.setTimeout(finish, 30000);
  }
}
