import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  CreateSalePayload,
  Prescription,
  PrescriptionMedicine,
  ProductCatalogItem,
  RegisterSession,
  Sale,
  SalePaymentMethod,
  Store,
  User,
} from '../../../shared/models/hospital.model';

interface PharmacyBillLine {
  sourceMedicineName: string;
  product: ProductCatalogItem;
  requestedQty: number;
  billQty: number;
  availableQty: number;
  unitPrice: number;
  discount: number;
}

interface UnavailableMedicine {
  medicineName: string;
  requestedQty: number;
  reason: string;
}

interface ReceiptPreviewLine {
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface ReceiptPreviewData {
  reference: string;
  saleDate: string;
  storeName: string;
  storeAddress: string;
  cashierName: string;
  customerName: string;
  paymentMethod: string;
  paymentStatus: string;
  items: ReceiptPreviewLine[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  cashReceivedAmount: number;
  changeDueAmount: number;
  note: string;
}

@Component({
  selector: 'app-pharmacy-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-pos.component.html',
  styleUrl: './pharmacy-pos.component.scss',
})
export class PharmacyPosComponent implements OnInit {
  stores: Store[] = [];
  products: ProductCatalogItem[] = [];
  billLines: PharmacyBillLine[] = [];
  unavailableMedicines: UnavailableMedicine[] = [];
  prescription: Prescription | null = null;
  selectedStoreId = '';
  prescriptionId = '';
  productSearch = '';
  paymentMethod: SalePaymentMethod = 'cash';
  paidAmount = '0';
  cashReceivedAmount = '0';
  storesLoading = false;
  productsLoading = false;
  prescriptionLoading = false;
  saleSaving = false;
  saleInvoiceNo = '';
  registerSession: RegisterSession | null = null;
  registerOpened = false;
  registerOpening = false;
  registerClosed = false;
  registerLoading = false;
  closeRegisterOpen = false;
  closeRegisterSaving = false;
  saleHistoryOpen = false;
  saleHistoryLoading = false;
  recentSales: Sale[] = [];
  receiptPreviewOpen = false;
  receiptPreview: ReceiptPreviewData | null = null;
  openingAmount: number | null = null;
  openingNote = '';
  closingAmount: number | null = null;
  closeNote = '';
  posMessage = '';
  posMessageType: 'success' | 'warning' | 'danger' | 'info' = 'info';

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.prescriptionId = params.get('prescriptionId') || '';
      this.selectedStoreId = params.get('storeId') || this.getStoredUser()?.storeId || '';
      this.loadStores();
      this.loadProducts();
      this.refreshRegisterState();

      if (this.prescriptionId) {
        this.loadPrescription(this.prescriptionId);
      }
    });

    this.refreshCurrentUser();
  }

  get canReadProducts(): boolean {
    return this.backend.hasPermission('products.read');
  }

  get canCreateSale(): boolean {
    return this.backend.hasPermission('sales.create');
  }

  get canReadSales(): boolean {
    return this.backend.hasPermission('sales.read');
  }

  get canReadRegister(): boolean {
    return this.backend.hasPermission('register_sessions.read');
  }

  get canOpenRegister(): boolean {
    return this.backend.hasPermission('register_sessions.open');
  }

  get canCloseRegister(): boolean {
    return this.backend.hasPermission('register_sessions.close');
  }

  get selectedStoreLabel(): string {
    const store = this.stores.find((item) => item._id === this.currentStoreId());
    return store?.name || 'Assigned pharmacy store';
  }

  get subtotal(): number {
    return this.billLines.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  get totalDiscount(): number {
    return this.billLines.reduce((sum, line) => sum + Number(line.discount || 0), 0);
  }

  get totalQuantity(): number {
    return this.billLines.reduce((sum, line) => sum + Number(line.billQty || 0), 0);
  }

  get payableAmount(): string {
    return this.subtotal.toFixed(2);
  }

  get readyForBilling(): boolean {
    return this.canCheckout;
  }

  get canCheckout(): boolean {
    return (
      this.canCreateSale &&
      this.registerOpened &&
      !this.registerClosed &&
      !this.saleSaving &&
      this.billLines.some((line) => line.billQty > 0) &&
      !!this.currentStoreId()
    );
  }

  get cashierName(): string {
    return this.getStoredUser()?.name || 'Cashier';
  }

  get expectedClosingAmount(): number {
    return Number(
      this.registerSession?.expectedCashAmount ||
        this.registerSession?.summary?.expectedCashInDrawer ||
        this.registerSession?.openingAmount ||
        0
    );
  }

  get changeDueAmount(): number {
    if (this.paymentMethod !== 'cash') {
      return 0;
    }

    return Math.max(Number(this.cashReceivedAmount || this.paidAmount || 0) - this.subtotal, 0);
  }

  loadStores(): void {
    const user = this.getStoredUser();
    if (!this.backend.hasPermission('stores.read')) {
      if (!this.selectedStoreId && user?.storeId) {
        this.selectedStoreId = user.storeId;
      }
      this.stores = [];
      return;
    }

    this.storesLoading = true;
    this.backend
      .getStores({ limit: 100, isActive: true, hospitalId: user?.hospitalId || undefined })
      .pipe(finalize(() => (this.storesLoading = false)))
      .subscribe({
        next: (result) => {
          this.stores = result.items || [];
          if (!this.selectedStoreId) {
            this.selectedStoreId = user?.storeId || this.stores[0]?._id || '';
            this.loadProducts();
            this.refreshRegisterState();
          }
        },
        error: () => {
          this.stores = [];
          if (!this.selectedStoreId && user?.storeId) {
            this.selectedStoreId = user.storeId;
          }
        },
      });
  }

  loadProducts(): void {
    if (!this.canReadProducts) {
      this.products = [];
      this.rebuildPrescriptionBill();
      return;
    }

    const storeId = this.currentStoreId();
    if (!storeId) {
      this.products = [];
      this.rebuildPrescriptionBill();
      return;
    }

    this.productsLoading = true;
    this.backend
      .getProducts({ limit: 100, isActive: true, storeId })
      .pipe(finalize(() => (this.productsLoading = false)))
      .subscribe({
        next: (result) => {
          this.products = result.items || [];
          if (!this.saleInvoiceNo) {
            this.rebuildPrescriptionBill();
          }
        },
        error: (err) => {
          this.products = [];
          this.rebuildPrescriptionBill();
          this.toastr.error(err?.error?.message || 'Unable to load pharmacy store products.');
        },
      });
  }

  loadPrescription(id: string): void {
    this.prescriptionLoading = true;
    this.backend
      .getPrescription(id)
      .pipe(finalize(() => (this.prescriptionLoading = false)))
      .subscribe({
        next: (prescription) => {
          this.prescription = prescription;
          this.rebuildPrescriptionBill();
        },
        error: (err) => {
          this.prescription = null;
          this.rebuildPrescriptionBill();
          this.toastr.error(err?.error?.message || 'Unable to load prescription for billing.');
        },
      });
  }

  refreshCurrentUser(): void {
    this.backend.getMe().subscribe({
      next: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('role', user.role?.name || '');
        localStorage.setItem('permissions', JSON.stringify(user.role?.permissions || []));

        if (!this.selectedStoreId && user.storeId) {
          this.selectedStoreId = user.storeId;
          this.loadProducts();
          this.refreshRegisterState();
        }
      },
      error: () => {
        // Cached session data is enough to keep the POS page usable.
      },
    });
  }

  refreshRegisterState(): void {
    const storeId = this.currentStoreId();
    if (!storeId || !this.canReadRegister) {
      this.registerSession = null;
      this.registerOpened = false;
      this.registerClosed = false;
      return;
    }

    this.registerLoading = true;
    this.backend
      .getCurrentRegister({ storeId })
      .pipe(finalize(() => (this.registerLoading = false)))
      .subscribe({
        next: (registerSession) => {
          this.registerSession = registerSession;
          this.registerOpened = registerSession?.status === 'open';
          this.registerClosed = registerSession?.status === 'closed';
          if (registerSession?.status === 'open') {
            this.openingAmount = Number(registerSession.openingAmount || 0);
          }
          this.loadRecentSales();
        },
        error: () => {
          this.registerSession = null;
          this.registerOpened = false;
          this.registerClosed = false;
        },
      });
  }

  openRegister(): void {
    if (!this.canOpenRegister) {
      this.toastr.error('Missing POS permission: register_sessions.open');
      return;
    }

    const storeId = this.currentStoreId();
    if (!storeId) {
      this.toastr.error('Select a pharmacy store before opening register.');
      return;
    }

    if (this.openingAmount === null || Number(this.openingAmount) < 0) {
      this.toastr.error('Enter opening balance before opening register.');
      return;
    }

    this.registerOpening = true;
    this.backend
      .openRegister({
        storeId,
        businessDate: this.todayValue(),
        openingAmount: Number(this.openingAmount || 0),
        openingNote: this.openingNote.trim() || undefined,
      })
      .pipe(finalize(() => (this.registerOpening = false)))
      .subscribe({
        next: (response) => {
          this.registerSession = response.data?.registerSession || null;
          this.registerOpened = this.registerSession?.status === 'open';
          this.registerClosed = false;
          this.loadRecentSales();
          this.showPosMessage(
            `Register opened with ${this.formatCurrency(this.registerSession?.openingAmount || this.openingAmount || 0)}.`,
            'success'
          );
          this.toastr.success('Register opened successfully.');
        },
        error: (err) => {
          this.registerOpened = false;
          this.registerClosed = false;
          this.toastr.error(err?.error?.message || 'Unable to open register.');
        },
      });
  }

  openCloseRegister(): void {
    if (!this.registerSession) {
      return;
    }

    this.closingAmount = this.expectedClosingAmount;
    this.closeNote = '';
    this.closeRegisterOpen = true;
  }

  closeCloseRegister(): void {
    if (this.closeRegisterSaving) {
      return;
    }

    this.closeRegisterOpen = false;
  }

  confirmCloseRegister(): void {
    if (!this.canCloseRegister) {
      this.toastr.error('Missing POS permission: register_sessions.close');
      return;
    }

    if (!this.registerSession) {
      this.toastr.error('No open register session found.');
      return;
    }

    if (this.closingAmount === null || Number(this.closingAmount) < 0) {
      this.toastr.error('Enter closing cash amount.');
      return;
    }

    this.closeRegisterSaving = true;
    this.backend
      .closeRegister(this.registerSession._id, {
        closingAmount: Number(this.closingAmount || 0),
        closeNote: this.closeNote.trim() || undefined,
      })
      .pipe(finalize(() => (this.closeRegisterSaving = false)))
      .subscribe({
        next: (response) => {
          this.registerSession = response.data?.registerSession || this.registerSession;
          this.registerOpened = false;
          this.registerClosed = true;
          this.closeRegisterOpen = false;
          this.clearSale();
          this.loadRecentSales();
          this.showPosMessage('Register closed successfully.', 'success');
          this.toastr.success('Register closed successfully.');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to close register.');
        },
      });
  }

  onStoreChange(): void {
    this.saleInvoiceNo = '';
    this.billLines = [];
    this.unavailableMedicines = [];
    this.loadProducts();
    this.refreshRegisterState();
  }

  handleProductSearchEnter(event: Event): void {
    event.preventDefault();
    const product = this.filteredProducts()[0];
    if (product) {
      this.addProduct(product);
      this.productSearch = '';
    }
  }

  checkoutWith(method: SalePaymentMethod): void {
    this.paymentMethod = method;
    this.paidAmount = this.payableAmount;
    this.cashReceivedAmount = this.payableAmount;
    this.confirmBilling();
  }

  clearSale(): void {
    this.billLines = [];
    this.unavailableMedicines = [];
    this.saleInvoiceNo = '';
    this.productSearch = '';
    this.paidAmount = '0';
    this.cashReceivedAmount = '0';
    this.posMessage = '';
  }

  openSaleHistory(): void {
    this.saleHistoryOpen = true;
    this.loadRecentSales();
  }

  closeSaleHistory(): void {
    this.saleHistoryOpen = false;
  }

  openCurrentBillPreview(): void {
    if (!this.billLines.some((line) => line.billQty > 0)) {
      this.toastr.info('Add at least one medicine before previewing bill.');
      return;
    }

    this.receiptPreview = this.buildReceiptFromCurrentCart();
    this.receiptPreviewOpen = true;
  }

  openSaleReceipt(sale: Sale): void {
    this.receiptPreview = this.buildReceiptFromSale(sale);
    this.receiptPreviewOpen = true;
  }

  closeReceiptPreview(): void {
    this.receiptPreviewOpen = false;
    this.receiptPreview = null;
  }

  printReceipt(): void {
    if (!this.receiptPreview) {
      return;
    }

    this.openReceiptPrintWindow(this.receiptPreview);
  }

  loadRecentSales(): void {
    if (!this.canReadSales) {
      this.recentSales = [];
      return;
    }

    const storeId = this.currentStoreId();
    if (!storeId) {
      this.recentSales = [];
      return;
    }

    this.saleHistoryLoading = true;
    this.backend
      .getSales({
        limit: 20,
        storeId,
        registerSessionId: this.registerSession?.status === 'open' ? this.registerSession._id : undefined,
      })
      .pipe(finalize(() => (this.saleHistoryLoading = false)))
      .subscribe({
        next: (result) => {
          this.recentSales = result.items || [];
        },
        error: () => {
          this.recentSales = [];
        },
      });
  }

  saleItemsSummary(sale: Sale): string {
    const count = sale.items?.length || 0;
    if (!count) {
      return 'No items';
    }

    const firstItem = sale.items[0]?.name || sale.items[0]?.sku || 'Item';
    return count === 1 ? firstItem : `${firstItem} +${count - 1} more`;
  }

  filteredProducts(): ProductCatalogItem[] {
    const query = this.normalizeText(this.productSearch);
    if (!query) {
      return this.products.slice(0, 20);
    }

    return this.products
      .filter((product) => this.productSearchText(product).includes(query))
      .slice(0, 20);
  }

  addProduct(product: ProductCatalogItem): void {
    const existing = this.billLines.find((line) => line.product._id === product._id);
    const availableQty = this.productAvailableQty(product);

    if (existing) {
      existing.billQty = Math.min(existing.billQty + 1, Math.max(availableQty, 0));
      this.refreshPaidAmount();
      return;
    }

    this.billLines.push({
      sourceMedicineName: product.name,
      product,
      requestedQty: 1,
      billQty: availableQty > 0 ? 1 : 0,
      availableQty,
      unitPrice: this.productPrice(product),
      discount: 0,
    });
    this.refreshPaidAmount();
  }

  removeLine(index: number): void {
    this.billLines.splice(index, 1);
    this.refreshPaidAmount();
  }

  onQtyChange(line: PharmacyBillLine): void {
    const qty = Number(line.billQty || 0);
    line.billQty = Math.max(0, Math.min(qty, Math.max(line.availableQty, 0)));
    this.refreshPaidAmount();
  }

  lineTotal(line: PharmacyBillLine): number {
    return Math.max(
      Number(line.billQty || 0) * Number(line.unitPrice || 0) - Number(line.discount || 0),
      0
    );
  }

  confirmBilling(): void {
    if (!this.canCreateSale) {
      this.toastr.error('Missing POS permission: sales.create');
      return;
    }

    if (!this.registerSession || this.registerSession.status !== 'open') {
      this.showPosMessage('Open the register with opening balance before checkout.', 'warning');
      return;
    }

    const storeId = this.currentStoreId();
    if (!storeId) {
      this.toastr.error('No pharmacy store is selected.');
      return;
    }

    const saleItems = this.billLines
      .filter((line) => line.billQty > 0)
      .map((line) => ({
        productId: line.product._id,
        qty: line.billQty,
        unitPrice: line.unitPrice,
        discount: Number(line.discount || 0),
        tax: 0,
      }));

    if (saleItems.length === 0) {
      this.toastr.error('No available medicine is selected for billing.');
      return;
    }

    const payload: CreateSalePayload = {
      storeId,
      saleDate: new Date().toISOString(),
      status: 'completed',
      registerSessionId: this.registerSession._id,
      items: saleItems,
      paidAmount: Number(this.paidAmount || this.subtotal),
      paymentMethod: this.paymentMethod,
      note: this.prescription
        ? `Mooli pharmacy bill for prescription ${this.prescription._id}`
        : 'Mooli pharmacy POS bill',
    };

    this.saleSaving = true;
    this.backend
      .createSale(payload)
      .pipe(finalize(() => (this.saleSaving = false)))
      .subscribe({
        next: (response) => {
          this.saleInvoiceNo = response.data?.sale?.invoiceNo || '';
          const completedSale = response.data?.sale || null;
          if (completedSale) {
            this.receiptPreview = this.buildReceiptFromSale(completedSale);
            this.receiptPreviewOpen = true;
          }
          this.showPosMessage(
            this.saleInvoiceNo ? `Sale completed: ${this.saleInvoiceNo}` : 'Sale completed successfully.',
            'success'
          );
          this.toastr.success(this.saleInvoiceNo ? `Bill created: ${this.saleInvoiceNo}` : 'Bill created successfully.');
          this.billLines = [];
          this.unavailableMedicines = [];
          this.paidAmount = '0';
          this.cashReceivedAmount = '0';
          this.loadProducts();
          this.refreshRegisterState();
        },
        error: (err) => {
          const message = err?.error?.message || 'Unable to confirm pharmacy bill.';
          if (String(message).toLowerCase().includes('register')) {
            this.toastr.error('Open an active cash register for this store before confirming the bill.');
            return;
          }

          this.toastr.error(message);
        },
      });
  }

  patientName(): string {
    const patient = this.prescription?.patient;
    return [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || '-';
  }

  doctorName(): string {
    return this.prescription?.doctor?.name || '-';
  }

  stockLabel(product: ProductCatalogItem): string {
    return String(product.availableQuantity ?? product.stockQuantity ?? '0');
  }

  formatCurrency(value: unknown): string {
    return `Rs ${Number(value || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  productDisplay(product: ProductCatalogItem): string {
    const strength = [product.strengthValue, product.strengthUnit].filter(Boolean).join(' ');
    return [product.name, strength ? `(${strength})` : ''].filter(Boolean).join(' ');
  }

  private buildReceiptFromCurrentCart(): ReceiptPreviewData {
    const rawSubtotal = this.billLines.reduce(
      (sum, line) => sum + Number(line.billQty || 0) * Number(line.unitPrice || 0),
      0
    );
    const paidAmount = Number(this.paidAmount || this.subtotal || 0);
    const cashReceived = this.paymentMethod === 'cash'
      ? Math.max(Number(this.cashReceivedAmount || paidAmount), paidAmount)
      : paidAmount;

    return {
      reference: 'Preview',
      saleDate: new Date().toISOString(),
      storeName: this.selectedStoreLabel,
      storeAddress: this.currentStoreAddress(),
      cashierName: this.cashierName,
      customerName: this.patientName() === '-' ? 'Walk-in Customer' : this.patientName(),
      paymentMethod: this.paymentMethod,
      paymentStatus: paidAmount >= this.subtotal ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      items: this.billLines
        .filter((line) => line.billQty > 0)
        .map((line) => ({
          name: this.productDisplay(line.product),
          sku: line.product.sku || '',
          qty: Number(line.billQty || 0),
          unitPrice: Number(line.unitPrice || 0),
          discount: Number(line.discount || 0),
          total: this.lineTotal(line),
        })),
      subtotal: rawSubtotal,
      discount: this.totalDiscount,
      total: this.subtotal,
      paidAmount,
      cashReceivedAmount: cashReceived,
      changeDueAmount: this.paymentMethod === 'cash' ? Math.max(cashReceived - this.subtotal, 0) : 0,
      note: this.prescription ? `Prescription ${this.prescription._id}` : 'POS sale preview',
    };
  }

  private buildReceiptFromSale(sale: Sale): ReceiptPreviewData {
    const store = this.stores.find((item) => item._id === sale.storeId);
    const paidAmount = Number(sale.paidAmount || 0);

    return {
      reference: sale.invoiceNo || sale._id,
      saleDate: sale.saleDate || sale.createdAt || new Date().toISOString(),
      storeName: store?.name || this.selectedStoreLabel,
      storeAddress: [store?.address, store?.city].filter(Boolean).join(', '),
      cashierName: this.cashierName,
      customerName: this.patientName() === '-' ? 'Walk-in Customer' : this.patientName(),
      paymentMethod: sale.paymentStatus,
      paymentStatus: sale.paymentStatus,
      items: (sale.items || []).map((item) => ({
        name: item.name || 'Product',
        sku: item.sku || '',
        qty: Number(item.qty || 0),
        unitPrice: Number(item.unitPrice || 0),
        discount: Number(item.discount || 0),
        total: Number(item.total || 0),
      })),
      subtotal: Number(sale.subtotal || 0),
      discount: Number(sale.discount || 0),
      total: Number(sale.total || 0),
      paidAmount,
      cashReceivedAmount: paidAmount,
      changeDueAmount: 0,
      note: sale.note || '',
    };
  }

  private openReceiptPrintWindow(receipt: ReceiptPreviewData): void {
    const popup = window.open('', '_blank', 'width=420,height=760,noopener');
    if (!popup) {
      this.toastr.error('Allow popups to print the receipt.');
      return;
    }

    popup.document.write(this.receiptHtml(receipt));
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
  }

  private receiptHtml(receipt: ReceiptPreviewData): string {
    const rows = receipt.items
      .map((item) => `
        <tr>
          <td>
            <strong>${this.escapeHtml(item.name)}</strong>
            <small>${this.escapeHtml(item.sku)}</small>
          </td>
          <td>${item.qty}</td>
          <td>${this.formatCurrency(item.unitPrice)}</td>
          <td>${this.formatCurrency(item.total)}</td>
        </tr>
      `)
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <title>${this.escapeHtml(receipt.reference)}</title>
          <style>
            @page { margin: 8mm; size: 80mm auto; }
            * { box-sizing: border-box; }
            body { color: #111827; font-family: Arial, sans-serif; font-size: 12px; margin: 0; }
            .receipt { margin: 0 auto; max-width: 320px; padding: 8px; }
            .center { text-align: center; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            p { margin: 2px 0; }
            .meta { border-bottom: 1px dashed #9ca3af; border-top: 1px dashed #9ca3af; margin: 10px 0; padding: 8px 0; }
            .meta div, .totals div { display: flex; justify-content: space-between; gap: 10px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 2px; text-align: left; vertical-align: top; }
            th:nth-child(2), td:nth-child(2) { text-align: center; }
            th:nth-child(3), th:nth-child(4), td:nth-child(3), td:nth-child(4) { text-align: right; }
            small { color: #6b7280; display: block; margin-top: 2px; }
            .totals { border-top: 1px dashed #9ca3af; margin-top: 8px; padding-top: 8px; }
            .grand { font-size: 15px; font-weight: 800; }
            .foot { border-top: 1px dashed #9ca3af; margin-top: 12px; padding-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <section class="receipt">
            <div class="center">
              <h1>${this.escapeHtml(receipt.storeName)}</h1>
              <p>${this.escapeHtml(receipt.storeAddress || 'Mooli Pharmacy')}</p>
              <p>Bill / Receipt</p>
            </div>
            <div class="meta">
              <div><span>Invoice</span><strong>${this.escapeHtml(receipt.reference)}</strong></div>
              <div><span>Date</span><strong>${new Date(receipt.saleDate).toLocaleString()}</strong></div>
              <div><span>Cashier</span><strong>${this.escapeHtml(receipt.cashierName)}</strong></div>
              <div><span>Patient</span><strong>${this.escapeHtml(receipt.customerName)}</strong></div>
            </div>
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="totals">
              <div><span>Subtotal</span><strong>${this.formatCurrency(receipt.subtotal)}</strong></div>
              <div><span>Discount</span><strong>${this.formatCurrency(receipt.discount)}</strong></div>
              <div class="grand"><span>Total</span><strong>${this.formatCurrency(receipt.total)}</strong></div>
              <div><span>Paid</span><strong>${this.formatCurrency(receipt.paidAmount)}</strong></div>
              <div><span>Change</span><strong>${this.formatCurrency(receipt.changeDueAmount)}</strong></div>
              <div><span>Status</span><strong>${this.escapeHtml(receipt.paymentStatus)}</strong></div>
            </div>
            <div class="foot">
              <p>${this.escapeHtml(receipt.note || 'Thank you')}</p>
              <p>Powered by Mooli</p>
            </div>
          </section>
        </body>
      </html>
    `;
  }

  private rebuildPrescriptionBill(): void {
    if (!this.prescription) {
      this.unavailableMedicines = [];
      this.refreshPaidAmount();
      return;
    }

    const lines: PharmacyBillLine[] = [];
    const unavailable: UnavailableMedicine[] = [];

    for (const medicine of this.prescription.medicines || []) {
      const requestedQty = this.requestedMedicineQty(medicine);
      const product = this.findProductForMedicine(medicine.name);

      if (!product) {
        unavailable.push({
          medicineName: medicine.name,
          requestedQty,
          reason: 'No matching product in selected store',
        });
        continue;
      }

      const availableQty = this.productAvailableQty(product);
      if (availableQty <= 0) {
        unavailable.push({
          medicineName: medicine.name,
          requestedQty,
          reason: 'Matched product has no available stock',
        });
        continue;
      }

      lines.push({
        sourceMedicineName: medicine.name,
        product,
        requestedQty,
        billQty: Math.min(requestedQty, availableQty),
        availableQty,
        unitPrice: this.productPrice(product),
        discount: 0,
      });
    }

    this.billLines = lines;
    this.unavailableMedicines = unavailable;
    this.refreshPaidAmount();
  }

  private findProductForMedicine(medicineName: string): ProductCatalogItem | null {
    const normalizedMedicine = this.normalizeText(medicineName);
    if (!normalizedMedicine) {
      return null;
    }

    const matches = this.products.filter((product) => {
      const productName = this.normalizeText(product.name);
      const haystack = this.productSearchText(product);

      return (
        haystack.includes(normalizedMedicine) ||
        normalizedMedicine.includes(productName)
      );
    });

    return matches.sort((a, b) => this.productAvailableQty(b) - this.productAvailableQty(a))[0] || null;
  }

  private requestedMedicineQty(medicine: PrescriptionMedicine): number {
    const slots: Array<'morning' | 'noon' | 'evening' | 'night'> = ['morning', 'noon', 'evening', 'night'];
    const total = slots.reduce((sum, slot) => {
      const doseKey = `${slot}Dose` as 'morningDose' | 'noonDose' | 'eveningDose' | 'nightDose';
      const doseValue = this.parseDoseAmount(medicine[doseKey]);

      if (doseValue > 0) {
        return sum + doseValue;
      }

      return medicine[slot] ? sum + 1 : sum;
    }, 0);

    return total > 0 ? total : 1;
  }

  private parseDoseAmount(value: unknown): number {
    const text = String(value || '').trim();
    const fraction = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (fraction) {
      const numerator = Number(fraction[1]);
      const denominator = Number(fraction[2]);
      return denominator > 0 ? numerator / denominator : 0;
    }

    const decimal = text.match(/\d+(?:\.\d+)?/);
    return decimal ? Number(decimal[0]) : 0;
  }

  productAvailableQty(product: ProductCatalogItem): number {
    return Number(product.availableQuantity ?? product.stockQuantity ?? 0) || 0;
  }

  private productPrice(product: ProductCatalogItem): number {
    return Number(product.sellingPrice || 0) || 0;
  }

  refreshPaidAmount(): void {
    this.paidAmount = this.payableAmount;
    if (this.paymentMethod === 'cash') {
      this.cashReceivedAmount = this.payableAmount;
    }
  }

  private todayValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private showPosMessage(message: string, type: 'success' | 'warning' | 'danger' | 'info'): void {
    this.posMessage = message;
    this.posMessageType = type;
  }

  private currentStoreAddress(): string {
    const store = this.stores.find((item) => item._id === this.currentStoreId());
    return [store?.address, store?.city].filter(Boolean).join(', ');
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private productSearchText(product: ProductCatalogItem): string {
    return this.normalizeText(
      [
        product.name,
        product.sku,
        product.barcode,
        product.brand,
        product.unit,
        product.strengthValue,
        product.strengthUnit,
      ].join(' ')
    );
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private currentStoreId(): string {
    return this.selectedStoreId || this.getStoredUser()?.storeId || this.stores[0]?._id || '';
  }

  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }
}
