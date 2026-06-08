import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { MooliOfflineService, MooliQueuedWork } from '../../../core/services/mooli-offline.service';
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
    readonly offline: MooliOfflineService,
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
    void this.syncOfflineWork(false);
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
          void this.offline.cacheValue(this.storesCacheKey(), this.stores);
          if (!this.selectedStoreId) {
            this.selectedStoreId = user?.storeId || this.stores[0]?._id || '';
            this.loadProducts();
            this.refreshRegisterState();
          }
        },
        error: () => {
          void this.loadCachedStores(user?.storeId || '');
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
          void this.offline.cacheValue(this.productsCacheKey(storeId), this.products);
          if (!this.saleInvoiceNo) {
            this.rebuildPrescriptionBill();
          }
        },
        error: (err) => {
          void this.loadCachedProducts(storeId, err);
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
          void this.offline.cacheValue(this.prescriptionCacheKey(id), prescription);
          this.rebuildPrescriptionBill();
        },
        error: (err) => {
          void this.loadCachedPrescription(id, err);
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
          void this.offline.cacheValue(this.registerCacheKey(storeId), registerSession);
          if (registerSession?.status === 'open') {
            this.openingAmount = Number(registerSession.openingAmount || 0);
          }
          this.loadRecentSales();
        },
        error: () => {
          void this.loadCachedRegisterState(storeId);
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

  async confirmCloseRegister(): Promise<void> {
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

    const queuedSales = (await this.offline.getQueuedWork('sale')).filter(
      (entry) => (entry.payload as unknown as CreateSalePayload).storeId === this.currentStoreId(),
    );
    if (queuedSales.length > 0) {
      this.toastr.error('Sync queued offline POS sales before closing register.');
      void this.syncOfflineWork(false);
      return;
    }

    if (!this.offline.online()) {
      this.toastr.error('Register can be closed after internet returns.');
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
          void this.offline.cacheValue(this.registerCacheKey(this.currentStoreId()), this.registerSession);
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
          void this.offline.cacheValue(this.recentSalesCacheKey(storeId), result.items || []);
          void this.applyRecentSales(result.items || []);
        },
        error: () => {
          void this.loadCachedRecentSales(storeId);
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

    if (!this.offline.online()) {
      void this.queueOfflineSale(payload);
      return;
    }

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
          if (this.offline.shouldQueue(err)) {
            void this.queueOfflineSale(payload);
            return;
          }

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

  productBatchExpiryLabel(product: ProductCatalogItem): string {
    const parts = [
      product.batchNumber ? `Batch ${product.batchNumber}` : '',
      product.mfdDate ? `MFD ${this.formatProductDate(product.mfdDate)}` : '',
      product.expiryDate ? `Exp ${this.formatProductDate(product.expiryDate)}` : '',
    ];

    return parts.filter(Boolean).join(' · ');
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

  async syncOfflineWork(showToast = true): Promise<void> {
    if (!this.offline.online()) {
      if (showToast) {
        this.toastr.info('POS sales will sync when internet is back.');
      }
      return;
    }

    const result = await this.offline.syncQueuedWork();
    if (result.syncedCount > 0) {
      this.loadProducts();
      this.refreshRegisterState();
      this.loadRecentSales();
      if (showToast) {
        this.toastr.success(`${result.syncedCount} offline item(s) synced.`);
      }
    } else if (showToast) {
      this.toastr.info('No offline POS sales are waiting to sync.');
    }
  }

  private async loadCachedStores(userStoreId = ''): Promise<void> {
    this.stores = await this.offline.readCachedValue<Store[]>(this.storesCacheKey(), []);
    if (!this.selectedStoreId) {
      this.selectedStoreId = userStoreId || this.stores[0]?._id || '';
    }
  }

  private async loadCachedProducts(storeId: string, error: unknown): Promise<void> {
    this.products = await this.offline.readCachedValue<ProductCatalogItem[]>(
      this.productsCacheKey(storeId),
      [],
    );
    this.rebuildPrescriptionBill();

    if (!this.offline.shouldQueue(error) && this.products.length === 0) {
      this.toastr.error(
        (error as { error?: { message?: string } })?.error?.message ||
          'Unable to load pharmacy store products.',
      );
    }
  }

  private async loadCachedPrescription(id: string, error: unknown): Promise<void> {
    this.prescription = await this.offline.readCachedValue<Prescription | null>(
      this.prescriptionCacheKey(id),
      null,
    );
    this.rebuildPrescriptionBill();

    if (!this.offline.shouldQueue(error) && !this.prescription) {
      this.toastr.error(
        (error as { error?: { message?: string } })?.error?.message ||
          'Unable to load prescription for billing.',
      );
    }
  }

  private async loadCachedRegisterState(storeId: string): Promise<void> {
    this.registerSession = await this.offline.readCachedValue<RegisterSession | null>(
      this.registerCacheKey(storeId),
      null,
    );
    this.registerOpened = this.registerSession?.status === 'open';
    this.registerClosed = this.registerSession?.status === 'closed';
    if (this.registerSession?.status === 'open') {
      this.openingAmount = Number(this.registerSession.openingAmount || 0);
    }
    this.loadRecentSales();
  }

  private async loadCachedRecentSales(storeId: string): Promise<void> {
    const cached = await this.offline.readCachedValue<Sale[]>(this.recentSalesCacheKey(storeId), []);
    await this.applyRecentSales(cached);
  }

  private async applyRecentSales(items: Sale[]): Promise<void> {
    this.recentSales = this.mergeSales([...(await this.localQueuedSales()), ...items]);
  }

  private async queueOfflineSale(payload: CreateSalePayload): Promise<void> {
    this.saleSaving = true;
    const localId = this.offline.buildLocalId('sale');
    const invoiceNo = `OFF-${localId.slice(-6).toUpperCase()}`;
    const receipt = {
      ...this.buildReceiptFromCurrentCart(),
      reference: invoiceNo,
      note: `${this.prescription ? `Prescription ${this.prescription._id}. ` : ''}Saved offline`,
    };
    const sale = this.buildLocalSale(localId, invoiceNo, payload, receipt);

    await this.offline.enqueueWork({
      id: localId,
      entity: 'sale',
      operation: 'create',
      localId,
      payload,
      meta: { sale, receipt },
    });

    this.recentSales = this.mergeSales([sale, ...this.recentSales]);
    this.saleInvoiceNo = invoiceNo;
    this.receiptPreview = receipt;
    this.receiptPreviewOpen = true;
    this.billLines = [];
    this.unavailableMedicines = [];
    this.paidAmount = '0';
    this.cashReceivedAmount = '0';
    this.saleSaving = false;
    this.showPosMessage(`Sale saved offline: ${invoiceNo}`, 'success');
    this.toastr.success('POS sale saved offline and queued for sync.');
  }

  private buildLocalSale(
    localId: string,
    invoiceNo: string,
    payload: CreateSalePayload,
    receipt: ReceiptPreviewData,
  ): Sale {
    return {
      _id: localId,
      storeId: payload.storeId,
      registerSessionId: payload.registerSessionId || null,
      invoiceNo,
      saleDate: payload.saleDate,
      items: payload.items.map((item, index) => ({
        ...item,
        name: receipt.items[index]?.name || 'Product',
        sku: receipt.items[index]?.sku || '',
        total: receipt.items[index]?.total || 0,
      })),
      subtotal: String(receipt.subtotal),
      discount: String(receipt.discount),
      tax: '0',
      total: String(receipt.total),
      paidAmount: String(receipt.paidAmount),
      paymentStatus: receipt.paymentStatus as Sale['paymentStatus'],
      status: 'completed',
      note: payload.note || 'Offline Mooli pharmacy POS bill',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async localQueuedSales(): Promise<Sale[]> {
    const storeId = this.currentStoreId();
    const entries = await this.offline.getQueuedWork('sale');
    return entries
      .filter((entry) => (entry.payload as unknown as CreateSalePayload).storeId === storeId)
      .map((entry) => this.saleFromQueuedWork(entry));
  }

  private saleFromQueuedWork(entry: MooliQueuedWork): Sale {
    const metaSale = entry.meta?.['sale'] as Sale | undefined;
    if (metaSale) {
      return metaSale;
    }

    const payload = entry.payload as unknown as CreateSalePayload;
    const localId = entry.localId || entry.id;
    const invoiceNo = `OFF-${localId.slice(-6).toUpperCase()}`;

    return {
      _id: localId,
      storeId: payload.storeId,
      registerSessionId: payload.registerSessionId || null,
      invoiceNo,
      saleDate: payload.saleDate,
      items: payload.items,
      subtotal: '0',
      discount: '0',
      tax: '0',
      total: String(payload.paidAmount || 0),
      paidAmount: String(payload.paidAmount || 0),
      paymentStatus: Number(payload.paidAmount || 0) > 0 ? 'paid' : 'unpaid',
      status: 'completed',
      note: payload.note || 'Offline Mooli pharmacy POS bill',
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
    };
  }

  private mergeSales(items: Sale[]): Sale[] {
    const map = new Map<string, Sale>();
    items.forEach((item) => {
      if (item?._id) {
        map.set(item._id, item);
      }
    });
    return Array.from(map.values()).sort((first, second) =>
      String(second.createdAt || second.saleDate || '').localeCompare(String(first.createdAt || first.saleDate || '')),
    );
  }

  private storesCacheKey(): string {
    return this.offline.cacheKey('pos-stores');
  }

  private productsCacheKey(storeId: string): string {
    return this.offline.cacheKey('pos-products', storeId || 'store');
  }

  private prescriptionCacheKey(id: string): string {
    return this.offline.cacheKey('pos-prescription', id || 'prescription');
  }

  private registerCacheKey(storeId: string): string {
    return this.offline.cacheKey('pos-register', storeId || 'store');
  }

  private recentSalesCacheKey(storeId: string): string {
    return this.offline.cacheKey('pos-recent-sales', storeId || 'store', this.registerSession?._id || 'register');
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
        product.batchNumber,
        product.brand,
        product.unit,
        product.strengthValue,
        product.strengthUnit,
      ].join(' ')
    );
  }

  private formatProductDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
