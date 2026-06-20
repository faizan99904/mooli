import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { Hospital, LabOrder, LabTestCatalog, Patient } from '../../../shared/models/hospital.model';
import { resolveLabPrintDetails } from './lab-print-details';
import { canEditLabOrder } from './lab-order.utils';

type LabOrderReceiptItem = {
  code: string;
  name: string;
  department: string;
  sampleType: string;
  price: number;
};

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
  hospital: Hospital | null = null;
  source: 'doctor' | 'walk-in' | 'admission' | 'emergency' = 'walk-in';
  referredBy = '';
  priority: 'normal' | 'urgent' = 'normal';
  paidAmount = 0;
  notes = '';
  testSearch = '';
  isEditMode = false;
  editingOrderId = '';
  editingOrderNo = '';
  orderLoading = false;
  private pendingEditOrder: LabOrder | null = null;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { hospitalId?: string | null }
      | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.backend.getMe().subscribe({
      next: (user) => {
        this.currentHospitalId = user.hospitalId || this.currentHospitalId;
        this.loadHospital(this.currentHospitalId);
      },
    });
    this.loadCatalog();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      if (id) {
        this.isEditMode = true;
        this.editingOrderId = id;
        this.loadOrderForEdit(id);
      }
    });
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
            return;
          }

          if (this.pendingEditOrder) {
            this.applyOrderToForm(this.pendingEditOrder);
            this.pendingEditOrder = null;
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
    this.loadHospital(patient.hospitalId || this.currentHospitalId);
  }

  private loadHospital(hospitalId: string | null | undefined): void {
    if (!hospitalId) {
      return;
    }

    this.backend.getHospital(hospitalId).subscribe({
      next: (hospital) => {
        this.backend.getLabSettings().subscribe({
          next: (settings) => {
            this.hospital = {
              ...hospital,
              laboratorySettings: settings.laboratorySettings,
            };
          },
          error: () => {
            this.hospital = hospital;
          },
        });
      },
    });
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

  loadOrderForEdit(id: string): void {
    this.orderLoading = true;
    this.backend
      .getLabOrder(id)
      .pipe(finalize(() => (this.orderLoading = false)))
      .subscribe({
        next: (order) => {
          if (!canEditLabOrder(order)) {
            this.toastr.error('This lab order can no longer be edited.');
            void this.router.navigate(['/laboratory/orders', id]);
            return;
          }

          if (this.catalog.length) {
            this.applyOrderToForm(order);
          } else {
            this.pendingEditOrder = order;
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to load lab order for editing.');
          void this.router.navigate(['/laboratory']);
        },
      });
  }

  private applyOrderToForm(order: LabOrder): void {
    this.editingOrderNo = order.orderNo;
    this.selectedPatientId = order.patientId;
    this.selectedPatient = order.patient || null;
    this.patientPhone = order.patient?.phone || '';
    this.phoneLookupPerformed = Boolean(order.patient);
    this.source = order.source;
    this.referredBy = order.referredBy || '';
    this.priority = order.priority;
    this.paidAmount = order.paidAmount;
    this.notes = order.notes || '';

    const testIds = new Set(
      (order.items || []).map((item) => String(item.testId || '')).filter(Boolean)
    );
    this.selectedTests = this.catalog.filter((test) => testIds.has(test._id));

    if (order.patient) {
      this.patients = [order.patient];
      this.phoneMatchedTotal = 1;
    }

    this.loadHospital(order.hospitalId || this.currentHospitalId);
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

    const payload = {
      source: this.source,
      referredBy: this.referredBy,
      priority: this.priority,
      paidAmount: this.paidAmount,
      notes: this.notes,
      tests: this.selectedTests.map((test) => ({ testId: test._id })),
    };

    if (this.isEditMode && this.editingOrderId) {
      this.updateOrder(printReceipt, payload);
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
        ...payload,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          const order = response.data;
          const orderId = order?._id || '';
          this.toastr.success('Lab order created.');

          if (printReceipt && order) {
            this.printLabOrderReceipt(order, orderId);
            return;
          }

          if (orderId) {
            void this.router.navigate(['/laboratory/orders', orderId]);
          }
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to create lab order.'),
      });
  }

  private updateOrder(
    printReceipt: boolean,
    payload: {
      source: 'doctor' | 'walk-in' | 'admission' | 'emergency';
      referredBy: string;
      priority: 'normal' | 'urgent';
      paidAmount: number;
      notes: string;
      tests: Array<{ testId: string }>;
    }
  ): void {
    this.saving = true;
    this.backend
      .updateLabOrder(this.editingOrderId, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          const order = response.data;
          const orderId = order?._id || this.editingOrderId;
          this.toastr.success('Lab order updated.');

          if (printReceipt && order) {
            this.printLabOrderReceipt(order, orderId);
            return;
          }

          void this.router.navigate(['/laboratory/orders', orderId]);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to update lab order.'),
      });
  }

  private printLabOrderReceipt(order: LabOrder, orderId: string): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Lab order receipt print');
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
      this.navigateAfterReceiptPrint(orderId);
      return;
    }

    printDocument.open();
    printDocument.write(this.receiptHtml(order));
    printDocument.close();

    let handled = false;
    const finish = () => {
      if (handled) {
        return;
      }

      handled = true;
      iframe.remove();
      this.navigateAfterReceiptPrint(orderId);
    };

    printWindow.onafterprint = finish;

    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        finish();
      }
    }, 200);

    window.setTimeout(finish, 30000);
  }

  private navigateAfterReceiptPrint(orderId: string): void {
    if (orderId) {
      void this.router.navigate(['/laboratory/orders', orderId]);
    }
  }

  private receiptHtml(order: LabOrder): string {
    const patient = order.patient || this.selectedPatient;
    const patientName = patient ? this.patientName(patient) : 'Patient';
    const patientNo = patient?.patientNo || '-';
    const patientPhone = patient?.phone || this.patientPhone || '-';
    const printDetails = resolveLabPrintDetails(this.hospital, { mode: 'receipt' });
    const headerName = (printDetails.name || 'Laboratory').toUpperCase();
    const headerAddress = printDetails.addressLine;
    const headerPhone = printDetails.phone;
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
    const items = this.receiptItems(order);
    const rows = items
      .map(
        (item) => `
          <tr>
            <td>${this.escapeHtml(this.receiptTestLabel(item))}</td>
            <td>${this.escapeHtml(item.department)}</td>
            <td>${this.escapeHtml(item.sampleType)}</td>
            <td class="amount">${this.formatCurrency(item.price)}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <title>${this.escapeHtml(order.orderNo)}</title>
          <style>
            @page {
              margin: 0;
              size: 80mm auto;
            }

            * {
              box-sizing: border-box;
            }

            html {
              background: #fff;
              height: 100%;
              margin: 0;
              padding: 0;
              width: 100%;
            }

            body {
              align-items: flex-start;
              background: #fff;
              color: #000;
              display: flex;
              font-family: "Courier New", Courier, monospace;
              font-size: 11px;
              justify-content: center;
              line-height: 1.3;
              margin: 0;
              min-height: 100%;
              padding: 0;
              text-align: center;
              width: 100%;
            }

            .receipt {
              display: inline-block;
              margin: 0 auto;
              max-width: 80mm;
              padding: 4mm 3mm 6mm;
              text-align: left;
              width: 72mm;
            }

            .center {
              text-align: center;
            }

            .hospital-name {
              font-size: 15px;
              font-weight: 700;
              letter-spacing: 0.03em;
              margin: 0 0 4px;
              text-transform: uppercase;
            }

            .hospital-line {
              font-size: 10px;
              margin: 0 0 2px;
            }

            .receipt-title {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.1em;
              margin: 8px 0 0;
              text-transform: uppercase;
            }

            .rule {
              border: 0;
              border-top: 1px solid #000;
              margin: 8px 0;
            }

            .line {
              font-size: 10px;
              margin: 0 0 2px;
              word-break: break-word;
            }

            .kv {
              display: flex;
              font-size: 10px;
              gap: 6px;
              justify-content: space-between;
              margin: 0 0 2px;
            }

            .kv-label {
              flex: 0 0 auto;
            }

            .kv-value {
              font-weight: 700;
              text-align: right;
              white-space: nowrap;
            }

            table {
              border-collapse: collapse;
              table-layout: fixed;
              width: 100%;
            }

            th,
            td {
              font-size: 9px;
              line-height: 1.25;
              padding: 3px 0;
              text-align: left;
              vertical-align: top;
              word-break: break-word;
            }

            th {
              font-weight: 700;
            }

            th:nth-child(1),
            td:nth-child(1) {
              width: 36%;
            }

            th:nth-child(2),
            td:nth-child(2) {
              width: 20%;
            }

            th:nth-child(3),
            td:nth-child(3) {
              width: 18%;
            }

            th:nth-child(4),
            td:nth-child(4) {
              width: 26%;
            }

            th:last-child,
            td.amount {
              text-align: right;
            }

            .totals .balance .kv-value {
              font-weight: 800;
            }

            .notes {
              font-size: 10px;
              margin: 6px 0 0;
            }

            .foot {
              font-size: 10px;
              margin-top: 8px;
              text-align: left;
            }

            .foot p {
              margin: 0 0 3px;
            }

            @media print {
              @page {
                margin: 0;
                size: 80mm auto;
              }

              html,
              body {
                align-items: flex-start !important;
                display: block !important;
                height: auto !important;
                margin: 0 !important;
                min-height: 0 !important;
                padding: 0 !important;
                text-align: center !important;
                width: 100% !important;
              }

              .receipt {
                display: inline-block !important;
                margin: 0 auto !important;
                max-width: 80mm !important;
                page-break-after: avoid;
                text-align: left !important;
                width: 72mm !important;
              }
            }
          </style>
        </head>
        <body>
          <section class="receipt">
            <div class="center">
              <h1 class="hospital-name">${this.escapeHtml(headerName)}</h1>
              ${headerAddress ? `<p class="hospital-line">${this.escapeHtml(headerAddress)}</p>` : ''}
              ${headerPhone ? `<p class="hospital-line">${this.escapeHtml(headerPhone)}</p>` : ''}
              <p class="receipt-title">Lab Order Receipt</p>
            </div>

            <hr class="rule" />

            <div class="section">
              ${this.receiptInfoLine('Order No', order.orderNo)}
              ${this.receiptInfoLine('Date', orderDate)}
              ${this.receiptInfoLine('Source', this.sourceLabel(order.source))}
              ${this.receiptInfoLine('Priority', order.priority === 'urgent' ? 'Urgent' : 'Normal')}
              ${order.referredBy ? this.receiptInfoLine('Referred By', order.referredBy) : ''}
            </div>

            <hr class="rule" />

            <div class="section">
              ${this.receiptInfoLine('Patient', patientName)}
              ${this.receiptInfoLine('File No', patientNo)}
              ${this.receiptInfoLine('Phone', patientPhone)}
            </div>

            <hr class="rule" />

            <table>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Dept</th>
                  <th>Sample</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <hr class="rule" />

            <div class="section totals">
              ${this.receiptLine('Total', this.formatCurrency(order.totalAmount))}
              ${this.receiptLine('Paid', this.formatCurrency(order.paidAmount))}
              ${this.receiptLine('Balance', this.formatCurrency(order.balanceAmount), true)}
            </div>

            <hr class="rule" />

            ${order.notes ? `<div class="notes">${this.receiptInfoLine('Notes', order.notes)}</div><hr class="rule" />` : ''}

            <div class="foot">
              <p>Please keep this receipt for sample collection.</p>
              <p>Report will be available after processing.</p>
              <p>Thank you for choosing ${this.escapeHtml(this.hospital?.name || 'our hospital')}.</p>
            </div>
          </section>
        </body>
      </html>
    `;
  }

  private receiptInfoLine(label: string, value: string | number): string {
    return `<div class="line">${this.escapeHtml(label)}: ${this.escapeHtml(value)}</div>`;
  }

  private receiptLine(label: string, value: string | number, emphasize = false): string {
    return `
      <div class="kv${emphasize ? ' balance' : ''}">
        <span class="kv-label">${this.escapeHtml(label)}:</span>
        <span class="kv-value">${this.escapeHtml(value)}</span>
      </div>
    `;
  }

  private receiptTestLabel(item: LabOrderReceiptItem): string {
    if (item.code && item.name && item.code !== item.name) {
      return `${item.code} (${item.name})`;
    }

    return item.name || item.code || '-';
  }

  private receiptItems(order: LabOrder): LabOrderReceiptItem[] {
    if (order.items?.length) {
      return order.items.map((item) => ({
        code: item.shortCode || '-',
        name: item.testName,
        department: item.department || '-',
        sampleType: item.sampleType || '-',
        price: Number(item.price || 0),
      }));
    }

    return this.selectedTests.map((test) => ({
      code: test.shortCode,
      name: test.name,
      department: test.department,
      sampleType: test.sampleType,
      price: Number(test.price || 0),
    }));
  }

  private sourceLabel(source: LabOrder['source']): string {
    switch (source) {
      case 'doctor':
        return 'Doctor Prescribed';
      case 'admission':
        return 'Admission';
      case 'emergency':
        return 'Emergency';
      default:
        return 'Walk-in';
    }
  }

  private formatCurrency(value: number | string | null | undefined): string {
    const amount = Number(value || 0);
    return `Rs. ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  }

  private escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }
}
