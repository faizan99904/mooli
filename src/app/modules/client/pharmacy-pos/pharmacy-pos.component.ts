import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  MooliOfflineService,
  MooliQueuedWork,
} from '../../../core/services/mooli-offline.service';
import {
  CompanyProfile,
  ReceiptLetterheadSettings,
} from '../../../shared/models/company.model';
import {
  CreateHeldSalePayload,
  CreateSalesReturnPayload,
  CreateSalePayload,
  HeldSale,
  Prescription,
  PrescriptionMedicine,
  ProductDiscountType,
  ProductCatalogItem,
  RegisterSession,
  RestoreHeldSaleResponse,
  Sale,
  SalePaymentMethod,
  SalesReturn,
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
  discountInput: number;
  discountType: ProductDiscountType;
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
  discountLabel: string;
  unitPrice: number;
  discount: number;
  total: number;
}

interface ReceiptPreviewData {
  reference: string;
  saleDate: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxNumber: string;
  companyLogoUrl: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
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
  receiptLetterhead?: ReceiptLetterheadSettings;
}

interface PosShortcutDefinition {
  id: string;
  label: string;
  description: string;
  defaultCombo: string;
}

type PosKeyboardZone = 'search' | 'products' | 'cart' | 'actions';
type PharmacyPosPaymentMethod = SalePaymentMethod | 'credit';

interface PharmacyReportCard {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warn';
  note?: string;
}

interface PharmacyReturnLine {
  productId: string;
  name: string;
  sku: string;
  soldQty: number;
  alreadyReturnedQty: number;
  maxQty: number;
  qty: number;
  unitPrice: number;
  reason: string;
}

@Component({
  selector: 'app-pharmacy-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-pos.component.html',
  styleUrl: './pharmacy-pos.component.scss',
})
export class PharmacyPosComponent implements OnInit {
  companyProfile: CompanyProfile | null = null;
  stores: Store[] = [];
  products: ProductCatalogItem[] = [];
  billLines: PharmacyBillLine[] = [];
  unavailableMedicines: UnavailableMedicine[] = [];
  prescription: Prescription | null = null;
  selectedStoreId = '';
  prescriptionId = '';
  productSearch = '';
  paymentMethod: PharmacyPosPaymentMethod = 'cash';
  paidAmount = '0';
  cashReceivedAmount = '0';
  customDiscountPercent = '10';
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
  heldSalesLoading = false;
  reportsOpen = false;
  recentSales: Sale[] = [];
  heldSales: HeldSale[] = [];
  saleReturnOpen = false;
  saleReturnLoading = false;
  saleReturnSubmitting = false;
  saleReturnErrorMessage = '';
  returnSaleSearch = '';
  selectedReturnSale: Sale | null = null;
  selectedReturnHistory: SalesReturn[] = [];
  selectedReturnRefundCeiling = 0;
  returnLines: PharmacyReturnLine[] = [];
  returnRefundAmount = 0;
  returnPaymentMethod: Exclude<SalePaymentMethod, 'check'> = 'cash';
  receiptPreviewOpen = false;
  receiptPreview: ReceiptPreviewData | null = null;
  shortcutInfoOpen = false;
  keyboardZone: PosKeyboardZone = 'search';
  selectedProductIndex = 0;
  selectedCartIndex = 0;
  selectedCartCellIndex = 0;
  selectedDockIndex = 0;
  shortcutBindings: Record<string, string> = {};
  private initialProductSearchFocused = false;
  private pendingPrintSearchFocus = false;
  private printSearchFocusAttempts = 0;
  private paidAmountTouched = false;
  private cashReceivedTouched = false;
  openingAmount: number | null = null;
  openingNote = '';
  closingAmount: number | null = null;
  closeNote = '';
  readonly shortcutDefinitions: PosShortcutDefinition[] = [
    {
      id: 'focusSearch',
      label: 'Focus Product Search',
      description: 'Jump to the search box to scan or search medicines.',
      defaultCombo: 'F2',
    },
    {
      id: 'focusProducts',
      label: 'Focus Catalog',
      description: 'Move keyboard control to the medicine catalog.',
      defaultCombo: 'F3',
    },
    {
      id: 'newSale',
      label: 'New Sale',
      description: 'Clear the current bill and start fresh.',
      defaultCombo: 'F6',
    },
    {
      id: 'recentTransactions',
      label: 'Sale History',
      description: 'Open the sale history panel.',
      defaultCombo: 'F7',
    },
    {
      id: 'holdSale',
      label: 'Hold Sale',
      description: 'Save the current cart as a held pharmacy sale.',
      defaultCombo: 'Ctrl+H',
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Open pharmacy profit, loss, and stock summary.',
      defaultCombo: 'F8',
    },
    {
      id: 'cashPayment',
      label: 'Cash Payment',
      description: 'Set payment to cash and fill payable amount.',
      defaultCombo: 'F9',
    },
    {
      id: 'print',
      label: 'Print Receipt',
      description: 'Print the open receipt preview.',
      defaultCombo: 'F10',
    },
    {
      id: 'preview',
      label: 'Receipt Preview',
      description: 'Open receipt preview for the current bill.',
      defaultCombo: 'F12',
    },
    {
      id: 'closeRegister',
      label: 'Close Register',
      description: 'Open the close register dialog.',
      defaultCombo: 'Ctrl+Shift+L',
    },
    {
      id: 'shortcutInfo',
      label: 'Shortcut Controls',
      description: 'Open the shortcuts info and editor.',
      defaultCombo: 'Ctrl+/',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: BackendService,
    readonly offline: MooliOfflineService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadCompanyProfile();
    this.loadShortcutBindings();
    this.route.queryParamMap.subscribe((params) => {
      this.prescriptionId = params.get('prescriptionId') || '';
      this.selectedStoreId =
        params.get('storeId') || this.getStoredUser()?.storeId || '';
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

  @HostListener('window:focus')
  handleWindowFocus(): void {
    this.flushPendingPrintSearchFocus();
  }

  @HostListener('document:visibilitychange')
  handleVisibilityChange(): void {
    if (!document.hidden) {
      this.flushPendingPrintSearchFocus();
    }
  }

  private loadCompanyProfile(): void {
    this.backend.getMyCompany().subscribe({
      next: (company) => {
        this.companyProfile = company;
      },
      error: () => {
        this.companyProfile = null;
      },
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSaleReturn();
      this.closeReports();
      this.closeShortcutInfo();
      this.closeReceiptPreview();
      this.closeSaleHistory();
      this.closeCloseRegister();
      return;
    }

    if (event.defaultPrevented) {
      return;
    }

    if (this.handleOverlayTab(event)) {
      return;
    }

    if (this.handleOverlayEnter(event)) {
      return;
    }

    const action = this.findShortcutAction(event);
    if (action) {
      event.preventDefault();
      this.runShortcutAction(action);
      return;
    }

    if (this.handleKeyboardNavigation(event)) {
      return;
    }
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
    const store = this.stores.find(
      (item) => item._id === this.currentStoreId(),
    );
    return store?.name || 'Assigned pharmacy store';
  }

  get subtotal(): number {
    return this.billLines.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  get totalDiscount(): number {
    return this.billLines.reduce(
      (sum, line) => sum + Number(line.discount || 0),
      0,
    );
  }

  get totalQuantity(): number {
    return this.billLines.reduce(
      (sum, line) => sum + Number(line.billQty || 0),
      0,
    );
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

  get hasDiscountEligibleBillLines(): boolean {
    return this.billLines.some(
      (line) => line.billQty > 0 && line.product.discountEligible,
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
        0,
    );
  }

  get changeDueAmount(): number {
    if (this.paymentMethod !== 'cash') {
      return 0;
    }

    return Math.max(
      Number(this.cashReceivedAmount || this.paidAmount || 0) - this.subtotal,
      0,
    );
  }

  get totalStockUnits(): number {
    return this.products.reduce(
      (sum, product) => sum + this.productAvailableQty(product),
      0,
    );
  }

  get totalStockCostValue(): number {
    return this.products.reduce(
      (sum, product) =>
        sum + this.productAvailableQty(product) * this.productCost(product),
      0,
    );
  }

  get totalStockRetailValue(): number {
    return this.products.reduce(
      (sum, product) =>
        sum + this.productAvailableQty(product) * this.productPrice(product),
      0,
    );
  }

  get totalPotentialProfit(): number {
    return this.totalStockRetailValue - this.totalStockCostValue;
  }

  get registerSalesTotal(): number {
    return Number(this.registerSession?.summary?.totalSales || 0) || 0;
  }

  get registerCashSales(): number {
    return Number(this.registerSession?.summary?.cashSales || 0) || 0;
  }

  get registerSalesCount(): number {
    return Number(this.registerSession?.summary?.salesCount || 0) || 0;
  }

  get registerExpectedDrawer(): number {
    return Number(
      this.registerSession?.summary?.expectedCashInDrawer ||
        this.registerSession?.expectedCashAmount ||
        0,
    );
  }

  get grossProfitEstimate(): number {
    return this.recentSales.reduce((sum, sale) => {
      return (
        sum +
        (sale.items || []).reduce((saleSum, item) => {
          const matchedProduct = this.products.find(
            (product) => product._id === item.productId,
          );
          const qty = Number(item.qty || 0) || 0;
          const unitPrice = Number(item.unitPrice || 0) || 0;
          const costPrice = matchedProduct
            ? this.productCost(matchedProduct)
            : 0;
          return saleSum + qty * Math.max(unitPrice - costPrice, 0);
        }, 0)
      );
    }, 0);
  }

  get pharmacyReportCards(): PharmacyReportCard[] {
    return [
      {
        label: 'Available stock units',
        value: this.formatCompactNumber(this.totalStockUnits),
        note: 'Across the current pharmacy store catalog.',
      },
      {
        label: 'Stock cost value',
        value: this.formatCurrency(this.totalStockCostValue),
        note: 'Current medicine cost in hand.',
      },
      {
        label: 'Stock retail value',
        value: this.formatCurrency(this.totalStockRetailValue),
        tone: 'good',
        note: 'Selling value of the available stock.',
      },
      {
        label: 'Potential profit',
        value: this.formatCurrency(this.totalPotentialProfit),
        tone: this.totalPotentialProfit >= 0 ? 'good' : 'warn',
        note: 'Retail value minus cost value.',
      },
      {
        label: 'Register sales total',
        value: this.formatCurrency(this.registerSalesTotal),
        note: 'Based on the current register summary.',
      },
      {
        label: 'Gross profit estimate',
        value: this.formatCurrency(this.grossProfitEstimate),
        tone: this.grossProfitEstimate >= 0 ? 'good' : 'warn',
        note: 'Estimated from sales lines and product cost price.',
      },
    ];
  }

  get returnableRecentSales(): Sale[] {
    const search = this.returnSaleSearch.trim().toLowerCase();
    return this.recentSales
      .filter((sale) => this.canReturnSale(sale))
      .filter((sale) => ['completed', 'returned'].includes(sale.status))
      .filter((sale) => this.saleHasRemainingReturnQuantity(sale))
      .filter((sale) => {
        if (!search) {
          return true;
        }

        return [
          sale.invoiceNo,
          sale._id,
          sale.paymentStatus,
          sale.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });
  }

  get selectedReturnItemsCount(): number {
    return this.returnLines.filter((line) => line.qty > 0).length;
  }

  get saleReturnEstimatedTotal(): number {
    return this.returnLines.reduce(
      (sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0),
      0,
    );
  }

  get balanceDueAmount(): number {
    return Math.max(this.subtotal - Number(this.paidAmount || 0), 0);
  }

  get paymentStatusPreview(): 'paid' | 'partial' | 'unpaid' {
    const paid = Number(this.paidAmount || 0);
    if (paid <= 0) {
      return 'unpaid';
    }

    if (paid < this.subtotal) {
      return 'partial';
    }

    return 'paid';
  }

  get saleReturnRefundLimit(): number {
    return Math.min(
      this.saleReturnEstimatedTotal,
      this.selectedReturnRefundCeiling,
    );
  }

  receiptBrandTitle(receipt: ReceiptPreviewData | null | undefined): string {
    const letterhead = this.activeReceiptLetterhead(receipt);
    return (
      letterhead?.brandTitle?.trim() || receipt?.companyName || 'Mooli Pharmacy'
    );
  }

  receiptBrandSubtitle(receipt: ReceiptPreviewData | null | undefined): string {
    const letterhead = this.activeReceiptLetterhead(receipt);
    return letterhead?.brandSubtitle?.trim() || receipt?.storeName || '';
  }

  receiptHeaderNote(receipt: ReceiptPreviewData | null | undefined): string {
    return this.activeReceiptLetterhead(receipt)?.headerNote?.trim() || '';
  }

  receiptHeaderLines(receipt: ReceiptPreviewData | null | undefined): string[] {
    return (this.activeReceiptLetterhead(receipt)?.extraHeaderLines || [])
      .map((line) => String(line || '').trim())
      .filter(Boolean);
  }

  receiptHeaderDisplayLines(
    receipt: ReceiptPreviewData | null | undefined,
  ): string[] {
    if (!receipt) {
      return [];
    }

    const subtitle = this.receiptBrandSubtitle(receipt);
    return this.uniqueReceiptLines([
      subtitle,
      this.receiptHeaderNote(receipt),
      this.sameReceiptText(subtitle, receipt.storeName)
        ? ''
        : receipt.storeName,
      this.receiptAddressLine(receipt),
      ...this.receiptHeaderLines(receipt),
      this.receiptContactLine(receipt),
      this.receiptTaxLine(receipt),
    ]);
  }

  receiptAddressLine(receipt: ReceiptPreviewData | null | undefined): string {
    if (!receipt) {
      return '';
    }

    const address = receipt.companyAddress || receipt.storeAddress || '';
    return this.sameReceiptText(address, this.receiptBrandSubtitle(receipt))
      ? ''
      : address;
  }

  receiptContactLine(receipt: ReceiptPreviewData | null | undefined): string {
    if (!receipt) {
      return '';
    }

    const configured =
      this.activeReceiptLetterhead(receipt)?.contactLine?.trim() || '';
    if (configured) {
      return configured;
    }

    return this.uniqueReceiptLines([
      receipt.companyPhone ? `Phone: ${receipt.companyPhone}` : '',
      receipt.companyEmail ? `Email: ${receipt.companyEmail}` : '',
      receipt.storePhone && receipt.storePhone !== receipt.companyPhone
        ? `Store: ${receipt.storePhone}`
        : '',
    ]).join(' | ');
  }

  receiptTaxLine(receipt: ReceiptPreviewData | null | undefined): string {
    return receipt?.companyTaxNumber
      ? `Tax / NTN: ${receipt.companyTaxNumber}`
      : '';
  }

  receiptFooterTitle(receipt: ReceiptPreviewData | null | undefined): string {
    const letterhead = this.activeReceiptLetterhead(receipt);
    return (
      letterhead?.footerTitle?.trim() ||
      `Thank you for trusting ${receipt?.companyName || 'Mooli Pharmacy'}.`
    );
  }

  receiptFooterLines(receipt: ReceiptPreviewData | null | undefined): string[] {
    const configuredLines = (
      this.activeReceiptLetterhead(receipt)?.footerLines || []
    )
      .map((line) => String(line || '').trim())
      .filter(Boolean);

    return configuredLines.length
      ? configuredLines
      : ['Please check your items before leaving the pharmacy counter.'];
  }

  receiptLogoUrl(receipt: ReceiptPreviewData | null | undefined): string {
    const letterhead = this.activeReceiptLetterhead(receipt);
    if (!letterhead?.showLogo) {
      return '';
    }

    return letterhead.logoUrl?.trim() || receipt?.companyLogoUrl || '';
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
      .getStores({
        limit: 100,
        isActive: true,
        hospitalId: user?.hospitalId || undefined,
      })
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
      this.focusInitialProductSearch();
      return;
    }

    const storeId = this.currentStoreId();
    if (!storeId) {
      this.products = [];
      this.rebuildPrescriptionBill();
      this.focusInitialProductSearch();
      return;
    }

    this.productsLoading = true;
    this.backend
      .getProducts({ limit: 100, isActive: true, storeId })
      .pipe(
        finalize(() => {
          this.productsLoading = false;
          this.focusInitialProductSearch();
        }),
      )
      .subscribe({
        next: (result) => {
          this.products = result.items || [];
          void this.offline.cacheValue(
            this.productsCacheKey(storeId),
            this.products,
          );
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
          void this.offline.cacheValue(
            this.prescriptionCacheKey(id),
            prescription,
          );
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
        localStorage.setItem(
          'permissions',
          JSON.stringify(user.role?.permissions || []),
        );

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
          void this.offline.cacheValue(
            this.registerCacheKey(storeId),
            registerSession,
          );
          if (registerSession?.status === 'open') {
            this.openingAmount = Number(registerSession.openingAmount || 0);
          }
          this.loadRecentSales();
          this.focusInitialProductSearch();
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
            'success',
          );
          this.focusProductSearch(true);
        },
        error: (err) => {
          this.registerOpened = false;
          this.registerClosed = false;
          if (err?.status === 403) {
            this.showPosMessage(
              'This backend user is still blocked from opening the cash register. Please update the assigned role permissions.',
              'danger',
            );
            return;
          }
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
    this.focusOverlayControl('[data-kb-closing-amount]', true);
  }

  closeCloseRegister(): void {
    if (this.closeRegisterSaving) {
      return;
    }

    const wasOpen = this.closeRegisterOpen;
    this.closeRegisterOpen = false;
    if (wasOpen) {
      this.restoreSearchFocusAfterOverlayClose();
    }
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
      (entry) =>
        (entry.payload as unknown as CreateSalePayload).storeId ===
        this.currentStoreId(),
    );
    if (queuedSales.length > 0) {
      this.toastr.error(
        'Sync queued offline POS sales before closing register.',
      );
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
          this.registerSession =
            response.data?.registerSession || this.registerSession;
          void this.offline.cacheValue(
            this.registerCacheKey(this.currentStoreId()),
            this.registerSession,
          );
          this.registerOpened = false;
          this.registerClosed = true;
          this.closeRegisterOpen = false;
          this.clearSale();
          this.loadRecentSales();
          this.showPosMessage('Register closed successfully.', 'success');
        },
        error: (err) => {
          if (err?.status === 403) {
            this.showPosMessage(
              'This backend user is still blocked from closing the cash register. Please update the assigned role permissions.',
              'danger',
            );
            return;
          }
          this.toastr.error(err?.error?.message || 'Unable to close register.');
        },
      });
  }

  onStoreChange(): void {
    this.saleInvoiceNo = '';
    this.billLines = [];
    this.unavailableMedicines = [];
    this.selectedProductIndex = 0;
    this.loadProducts();
    this.refreshRegisterState();
  }

  onProductSearchChange(): void {
    this.selectedProductIndex = 0;
    this.clampKeyboardNavigationState();
  }

  handleProductSearchEnter(event: Event): void {
    event.preventDefault();
    const product = this.filteredProducts()[0];
    if (product) {
      this.addProduct(product);
      this.productSearch = '';
      this.selectedProductIndex = 0;
    }
  }

  checkoutWith(method: SalePaymentMethod): void {
    this.paymentMethod = method;
    this.paidAmount = this.payableAmount;
    this.cashReceivedAmount = this.payableAmount;
    this.paidAmountTouched = false;
    this.cashReceivedTouched = false;
    this.confirmBilling();
  }

  checkoutCredit(): void {
    this.paymentMethod = 'credit';
    this.paidAmount = '0';
    this.cashReceivedAmount = '0';
    this.paidAmountTouched = true;
    this.cashReceivedTouched = false;
    this.confirmBilling();
  }

  clearSale(): void {
    this.billLines = [];
    this.unavailableMedicines = [];
    this.saleInvoiceNo = '';
    this.productSearch = '';
    this.selectedProductIndex = 0;
    this.selectedCartIndex = 0;
    this.selectedCartCellIndex = 0;
    this.selectedDockIndex = 0;
    this.paidAmount = '0';
    this.cashReceivedAmount = '0';
    this.paymentMethod = 'cash';
    this.paidAmountTouched = false;
    this.cashReceivedTouched = false;
  }

  onPaymentMethodChange(): void {
    if (this.paymentMethod === 'credit') {
      this.paidAmount = '0';
      this.cashReceivedAmount = '0';
      this.paidAmountTouched = true;
      this.cashReceivedTouched = false;
      return;
    }

    if (Number(this.paidAmount || 0) <= 0) {
      this.paidAmountTouched = false;
      this.paidAmount = this.payableAmount;
    }

    if (this.paymentMethod === 'cash') {
      this.cashReceivedAmount = String(
        Math.max(Number(this.cashReceivedAmount || 0), Number(this.paidAmount || 0)),
      );
    } else {
      this.cashReceivedAmount = this.paidAmount;
      this.cashReceivedTouched = false;
    }

    if (!this.paidAmountTouched) {
      this.paidAmount = this.payableAmount;
    }
  }

  onPaidAmountChange(value: string): void {
    const normalized = this.normalizeMoneyInput(value, this.subtotal);
    this.paidAmount = String(normalized);
    this.paidAmountTouched = true;

    if (this.paymentMethod === 'credit') {
      if (normalized > 0) {
        this.paymentMethod = 'cash';
      } else {
        this.cashReceivedAmount = '0';
        return;
      }
    }

    if (this.paymentMethod === 'cash') {
      this.cashReceivedAmount = String(
        Math.max(Number(this.cashReceivedAmount || 0), normalized),
      );
    } else {
      this.cashReceivedAmount = String(normalized);
    }
  }

  onCashReceivedAmountChange(value: string): void {
    const normalized = Math.max(Number(value || 0), Number(this.paidAmount || 0), 0);
    this.cashReceivedAmount = String(normalized);
    this.cashReceivedTouched = true;
  }

  openSaleHistory(): void {
    this.saleHistoryOpen = true;
    this.loadRecentSales();
    this.loadHeldSales();
    this.focusOverlayControl('.sale-history-modal .modal-close');
  }

  closeSaleHistory(): void {
    const wasOpen = this.saleHistoryOpen;
    this.saleHistoryOpen = false;
    if (wasOpen) {
      this.restoreSearchFocusAfterOverlayClose();
    }
  }

  openSaleReturnPicker(): void {
    if (!this.registerSession || this.registerSession.status !== 'open') {
      this.showPosMessage(
        'Open the register before processing a sales return.',
        'warning',
      );
      return;
    }

    this.saleHistoryOpen = true;
    this.loadRecentSales();
    this.prepareSaleReturnModal();
    this.focusOverlayControl('.sale-return-modal .modal-close');
  }

  openSaleReturn(sale: Sale): void {
    if (!this.registerSession || this.registerSession.status !== 'open') {
      this.showPosMessage(
        'Open the register before processing a sales return.',
        'warning',
      );
      return;
    }

    this.prepareSaleReturnModal(sale._id);
    this.loadSaleReturnSale(sale._id);
  }

  closeSaleReturn(): void {
    if (this.saleReturnSubmitting) {
      return;
    }

    const wasOpen = this.saleReturnOpen;
    this.saleReturnOpen = false;
    this.saleReturnLoading = false;
    this.saleReturnSubmitting = false;
    this.saleReturnErrorMessage = '';
    this.returnSaleSearch = '';
    this.selectedReturnSale = null;
    this.selectedReturnHistory = [];
    this.selectedReturnRefundCeiling = 0;
    this.returnLines = [];
    this.returnRefundAmount = 0;
    this.returnPaymentMethod = 'cash';

    if (wasOpen && !this.saleHistoryOpen) {
      this.restoreSearchFocusAfterOverlayClose();
    }
  }

  openReports(): void {
    void this.router.navigate(['/pos-reports'], {
      queryParams: {
        storeId: this.currentStoreId() || undefined,
      },
    });
  }

  closeReports(): void {
    const wasOpen = this.reportsOpen;
    this.reportsOpen = false;
    if (wasOpen) {
      this.restoreSearchFocusAfterOverlayClose();
    }
  }

  openCurrentBillPreview(): void {
    if (!this.billLines.some((line) => line.billQty > 0)) {
      this.toastr.info('Add at least one medicine before previewing bill.');
      return;
    }

    this.showReceiptPreview(this.buildReceiptFromCurrentCart());
  }

  openSaleReceipt(sale: Sale): void {
    this.showReceiptPreview(this.buildReceiptFromSale(sale));
  }

  closeReceiptPreview(): void {
    const wasOpen = this.receiptPreviewOpen;
    this.receiptPreviewOpen = false;
    this.receiptPreview = null;
    if (wasOpen) {
      this.restoreSearchFocusAfterOverlayClose();
    }
  }

  openShortcutInfo(): void {
    this.shortcutInfoOpen = true;
    this.focusOverlayControl(
      '.modern-shortcuts-modal .modern-shortcut-inputs input',
      true,
    );
  }

  closeShortcutInfo(): void {
    const wasOpen = this.shortcutInfoOpen;
    this.shortcutInfoOpen = false;
    if (wasOpen) {
      this.restoreSearchFocusAfterOverlayClose();
    }
  }

  shortcutBinding(id: string): string {
    return this.shortcutBindings[id] || '';
  }

  updateShortcutBinding(id: string, value: string): void {
    this.shortcutBindings = {
      ...this.shortcutBindings,
      [id]: this.normalizeShortcutCombo(value),
    };
  }

  saveShortcutBindings(): void {
    const normalizedEntries = this.shortcutDefinitions.map(
      (definition) =>
        [
          definition.id,
          this.normalizeShortcutCombo(
            this.shortcutBindings[definition.id] || definition.defaultCombo,
          ),
        ] as const,
    );
    const normalizedBindings = Object.fromEntries(normalizedEntries);
    const collisions = this.findShortcutConflicts(normalizedBindings);

    if (collisions.length) {
      this.showPosMessage(
        `Shortcut conflict detected for ${collisions.join(', ')}. Give each action a unique key combo.`,
        'danger',
      );
      return;
    }

    this.shortcutBindings = normalizedBindings;
    localStorage.setItem(
      this.shortcutBindingsStorageKey(),
      JSON.stringify(this.shortcutBindings),
    );
    this.showPosMessage('POS keyboard shortcuts updated.', 'success');
    this.closeShortcutInfo();
  }

  resetShortcutBindings(): void {
    this.shortcutBindings = this.defaultShortcutBindings();
    localStorage.removeItem(this.shortcutBindingsStorageKey());
    this.showPosMessage('POS keyboard shortcuts reset to defaults.', 'success');
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
        registerSessionId:
          this.registerSession?.status === 'open'
            ? this.registerSession._id
            : undefined,
      })
      .pipe(finalize(() => (this.saleHistoryLoading = false)))
      .subscribe({
        next: (result) => {
          void this.offline.cacheValue(
            this.recentSalesCacheKey(storeId),
            result.items || [],
          );
          void this.applyRecentSales(result.items || []);
        },
        error: () => {
          void this.loadCachedRecentSales(storeId);
        },
      });
  }

  loadHeldSales(): void {
    if (!this.canReadSales) {
      this.heldSales = [];
      return;
    }

    const storeId = this.currentStoreId();
    if (!storeId) {
      this.heldSales = [];
      return;
    }

    this.heldSalesLoading = true;
    this.backend
      .listHeldSales({ limit: 20, storeId })
      .pipe(finalize(() => (this.heldSalesLoading = false)))
      .subscribe({
        next: (result) => {
          this.heldSales = result.items || [];
        },
        error: () => {
          this.heldSales = [];
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
    const existingIndex = this.billLines.findIndex(
      (line) => line.product._id === product._id,
    );
    const existing = existingIndex >= 0 ? this.billLines[existingIndex] : null;
    const availableQty = this.productAvailableQty(product);

    if (existing) {
      existing.billQty = Math.min(
        existing.billQty + 1,
        Math.max(availableQty, 0),
      );
      this.syncLineDiscount(existing);
      this.refreshPaidAmount();
      this.focusCartRow(existingIndex, true, 1);
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
      discountInput: 0,
      discountType:
        product.maxDiscountType === 'percentage' ? 'percentage' : 'amount',
    });
    this.refreshPaidAmount();
    this.focusCartRow(this.billLines.length - 1, true, 1);
  }

  removeLine(index: number): void {
    this.billLines.splice(index, 1);
    this.refreshPaidAmount();
  }

  incrementLineQty(index: number): void {
    const line = this.billLines[index];
    if (!line) {
      return;
    }

    line.billQty = Number(line.billQty || 0) + 1;
    this.onQtyChange(line);
  }

  decrementLineQty(index: number): void {
    const line = this.billLines[index];
    if (!line) {
      return;
    }

    line.billQty = Number(line.billQty || 0) - 1;
    this.onQtyChange(line);
  }

  onQtyChange(line: PharmacyBillLine): void {
    const qty = Number(line.billQty || 0);
    line.billQty = Math.max(0, Math.min(qty, Math.max(line.availableQty, 0)));
    this.syncLineDiscount(line);
    this.refreshPaidAmount();
  }

  onUnitPriceChange(line: PharmacyBillLine): void {
    line.unitPrice = Math.max(Number(line.unitPrice || 0), 0);
    this.syncLineDiscount(line);
    this.refreshPaidAmount();
  }

  lineTotal(line: PharmacyBillLine): number {
    return Math.max(
      Number(line.billQty || 0) * Number(line.unitPrice || 0) -
        Number(line.discount || 0),
      0,
    );
  }

  itemDiscountEligible(index: number): boolean {
    return Boolean(this.billLines[index]?.product.discountEligible);
  }

  lineDiscountDisplayValue(index: number): number {
    return Number(this.billLines[index]?.discountInput || 0);
  }

  lineDiscountAmount(index: number): number {
    return Number(this.billLines[index]?.discount || 0);
  }

  lineDiscountLabel(index: number): string {
    return this.lineDiscountType(index) === 'percentage' ? '%' : 'Rs';
  }

  lineDiscountMaxValue(index: number): number {
    return this.lineDiscountType(index) === 'percentage'
      ? this.lineMaxDiscountPercent(index)
      : this.lineMaxDiscountAmount(index);
  }

  lineDiscountHint(index: number): string {
    const line = this.billLines[index];
    const product = line?.product;
    if (!product) {
      return '';
    }

    if (!product.discountEligible) {
      return 'Discount locked for this product';
    }

    const maxAmount = this.lineMaxDiscountAmount(index);
    const maxPercent = this.lineMaxDiscountPercent(index);

    if (product.maxDiscountType === 'percentage') {
      return `Max ${this.formatNumber(maxPercent)}% (${this.formatCurrency(maxAmount)})`;
    }

    return `Max ${this.formatCurrency(maxAmount)} (${this.formatNumber(maxPercent)}%)`;
  }

  productDiscountSummary(product: ProductCatalogItem): string {
    if (!product.discountEligible) {
      return 'No discount';
    }

    const value = Number(product.maxDiscountValue || 0) || 0;
    return product.maxDiscountType === 'percentage'
      ? `Discount up to ${this.formatNumber(value)}%`
      : `Discount up to ${this.formatCurrency(value)}`;
  }

  updateLineDiscountInput(
    index: number,
    value: number | string | null | undefined,
  ): void {
    const line = this.billLines[index];
    if (!line) {
      return;
    }

    const requestedValue = this.normalizeHalfStepValue(value);
    const maxAllowedValue = this.lineDiscountMaxValue(index);
    line.discountInput = this.normalizeHalfStepValue(
      Math.min(requestedValue, maxAllowedValue),
    );
    this.syncLineDiscount(line);
    this.refreshPaidAmount();
  }

  handleLineDiscountKeydown(index: number, event: KeyboardEvent): void {
    if (!this.itemDiscountEligible(index)) {
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.stepLineDiscount(index, 0.5);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.stepLineDiscount(index, -0.5);
    }
  }

  applyCustomPercentDiscount(): void {
    const percent = Number(this.customDiscountPercent || 0);
    if (!Number.isFinite(percent) || percent <= 0) {
      this.toastr.info('Enter a discount percentage greater than zero.');
      return;
    }

    this.applyPercentDiscount(percent);
  }

  private applyPercentDiscount(percent: number): void {
    const requestedPercent = this.normalizeHalfStepValue(percent);
    let appliedCount = 0;

    this.billLines.forEach((line, index) => {
      if (!line.product.discountEligible || Number(line.billQty || 0) <= 0) {
        return;
      }

      if (line.discountType === 'percentage') {
        line.discountInput = this.normalizeHalfStepValue(
          Math.min(requestedPercent, this.lineMaxDiscountPercent(index)),
        );
      } else {
        const lineSubtotal =
          Number(line.billQty || 0) * Number(line.unitPrice || 0);
        const requestedAmount = Number(
          ((lineSubtotal * requestedPercent) / 100).toFixed(2),
        );
        line.discountInput = this.normalizeHalfStepValue(
          Math.min(requestedAmount, this.lineMaxDiscountAmount(index)),
        );
      }

      this.syncLineDiscount(line);
      appliedCount += 1;
    });

    if (!appliedCount) {
      this.toastr.info(
        'No discount eligible medicine is currently in the bill.',
      );
      return;
    }

    this.refreshPaidAmount();
  }

  confirmBilling(): void {
    if (!this.canCreateSale) {
      this.toastr.error('Missing POS permission: sales.create');
      return;
    }

    if (!this.registerSession || this.registerSession.status !== 'open') {
      this.showPosMessage(
        'Open the register with opening balance before checkout.',
        'warning',
      );
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

    const paidAmount =
      this.paymentMethod === 'credit'
        ? 0
        : this.normalizeMoneyInput(this.paidAmount, this.subtotal);

    const payload: CreateSalePayload = {
      storeId,
      saleDate: new Date().toISOString(),
      status: 'completed',
      registerSessionId: this.registerSession._id,
      items: saleItems,
      paidAmount,
      paymentMethod:
        this.paymentMethod === 'credit' ? undefined : this.paymentMethod,
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
            this.showReceiptPreview(this.buildReceiptFromSale(completedSale));
          }
          this.showPosMessage(
            this.saleInvoiceNo
              ? `Sale completed: ${this.saleInvoiceNo}`
              : 'Sale completed successfully.',
            'success',
          );
          this.billLines = [];
          this.unavailableMedicines = [];
          this.productSearch = '';
          this.selectedProductIndex = 0;
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

          if (err?.status === 403) {
            this.showPosMessage(
              'This backend user is still blocked from creating POS sales. Please update the assigned role permissions.',
              'danger',
            );
            return;
          }

          const message =
            err?.error?.message || 'Unable to confirm pharmacy bill.';
          if (String(message).toLowerCase().includes('register')) {
            this.toastr.error(
              'Open an active cash register for this store before confirming the bill.',
            );
            return;
          }

          this.toastr.error(message);
        },
      });
  }

  saveHeldSale(): void {
    if (!this.canCreateSale) {
      this.toastr.error('Missing POS permission: sales.create');
      return;
    }

    const storeId = this.currentStoreId();
    if (!storeId) {
      this.toastr.error('No pharmacy store is selected.');
      return;
    }

    const items = this.buildSaleItemsFromCart();
    if (!items.length) {
      this.toastr.info('Add at least one medicine before holding the sale.');
      return;
    }

    const payload: CreateHeldSalePayload = {
      storeId,
      items,
      note: this.prescription
        ? `Held pharmacy bill for prescription ${this.prescription._id}`
        : 'Held Mooli pharmacy POS bill',
    };

    this.saleSaving = true;
    this.backend
      .createHeldSale(payload)
      .pipe(finalize(() => (this.saleSaving = false)))
      .subscribe({
        next: (response) => {
          const heldSale = response.data;
          this.clearSale();
          this.loadHeldSales();
          this.showPosMessage(
            `Sale held successfully: ${heldSale?.holdNo || heldSale?._id || 'Hold created'}.`,
            'success',
          );
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to hold pharmacy sale.');
        },
      });
  }

  resumeHeldSale(heldSale: HeldSale): void {
    this.backend.restoreHeldSale(heldSale._id).subscribe({
      next: (response) => {
        this.applyRestoredSalePayload(response);
        this.backend.deleteHeldSale(heldSale._id).subscribe({
          next: () => {
            this.heldSales = this.heldSales.filter((item) => item._id !== heldSale._id);
          },
        });
        this.closeSaleHistory();
        this.showPosMessage('Held sale loaded back into the cart.', 'success');
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to restore held sale.');
      },
    });
  }

  deleteHeldSale(heldSale: HeldSale): void {
    this.backend.deleteHeldSale(heldSale._id).subscribe({
      next: () => {
        this.heldSales = this.heldSales.filter((item) => item._id !== heldSale._id);
        this.showPosMessage('Held sale deleted successfully.', 'success');
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to delete held sale.');
      },
    });
  }

  selectSaleForReturn(saleId: string): void {
    if (!saleId) {
      this.saleReturnErrorMessage = 'Select a sale to continue with the return.';
      return;
    }

    this.loadSaleReturnSale(saleId);
  }

  updateReturnRefundAmount(value: string | number): void {
    const numericValue = Number(value || 0);
    this.returnRefundAmount = Math.min(
      Math.max(Number.isFinite(numericValue) ? numericValue : 0, 0),
      this.saleReturnRefundLimit,
    );
  }

  submitSaleReturn(): void {
    if (!this.selectedReturnSale) {
      this.saleReturnErrorMessage = 'Select a sale to continue with the return.';
      return;
    }

    const items = this.returnLines
      .filter((line) => line.qty > 0)
      .map((line) => ({
        productId: line.productId,
        qty: Number(line.qty || 0),
        reason: line.reason.trim() || undefined,
      }));

    if (!items.length) {
      this.saleReturnErrorMessage = 'Select at least one return item quantity.';
      return;
    }

    if (this.returnRefundAmount > this.saleReturnRefundLimit) {
      this.saleReturnErrorMessage =
        'Refund amount cannot exceed the selected return total.';
      return;
    }

    const payload: CreateSalesReturnPayload = {
      saleId: this.selectedReturnSale._id,
      returnDate: new Date().toISOString(),
      items,
      refundAmount: this.returnRefundAmount || 0,
      paymentMethod:
        this.returnRefundAmount > 0 ? this.returnPaymentMethod : undefined,
    };

    this.saleReturnSubmitting = true;
    this.saleReturnErrorMessage = '';
    this.backend
      .createSalesReturn(payload)
      .pipe(finalize(() => (this.saleReturnSubmitting = false)))
      .subscribe({
        next: (salesReturn) => {
          this.closeSaleReturn();
          this.closeSaleHistory();
          this.loadProducts();
          this.loadRecentSales();
          this.showPosMessage(
            `Sales return ${salesReturn.returnNo || salesReturn._id} completed successfully.`,
            'success',
          );
        },
        error: (err) => {
          this.saleReturnErrorMessage =
            err?.error?.message || 'Unable to complete sales return.';
        },
      });
  }

  patientName(): string {
    const patient = this.prescription?.patient;
    return (
      [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || '-'
    );
  }

  updateReturnLineQty(line: PharmacyReturnLine, value: string | number): void {
    const qty = Math.max(0, Math.min(Number(value || 0), line.maxQty));
    line.qty = Number.isFinite(qty) ? qty : 0;
    if (this.returnRefundAmount > this.saleReturnRefundLimit) {
      this.returnRefundAmount = this.saleReturnRefundLimit;
    }
  }

  canReturnSale(sale: Sale): boolean {
    return !String(sale._id || '').startsWith('local-');
  }

  doctorName(): string {
    return this.prescription?.doctor?.name || '-';
  }

  stockLabel(product: ProductCatalogItem): string {
    return this.formatCompactNumber(this.productAvailableQty(product));
  }

  formatCurrency(value: unknown): string {
    return `${Number(value || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatCompactNumber(value: unknown): string {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
      return '0';
    }

    const absolute = Math.abs(amount);
    if (absolute >= 100000) {
      const lacValue = absolute / 100000;
      const formatted =
        lacValue >= 10 ? lacValue.toFixed(1) : lacValue.toFixed(2);
      const cleaned = formatted
        .replace(/\.0+$/, '')
        .replace(/(\.\d*[1-9])0+$/, '$1');
      return `${amount < 0 ? '-' : ''}${cleaned} Lac`;
    }

    return amount.toLocaleString('en-PK', {
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  productDisplay(product: ProductCatalogItem): string {
    const strength = [product.strengthValue, product.strengthUnit]
      .filter(Boolean)
      .join(' ');
    return [product.name, strength ? `(${strength})` : '']
      .filter(Boolean)
      .join(' ');
  }

  productBatchExpiryLabel(product: ProductCatalogItem): string {
    const parts = [
      product.batchNumber ? `Batch ${product.batchNumber}` : '',
      product.mfdDate ? `MFD ${this.formatProductDate(product.mfdDate)}` : '',
      product.expiryDate
        ? `Exp ${this.formatProductDate(product.expiryDate)}`
        : '',
    ];

    return parts.filter(Boolean).join(' · ');
  }

  private buildReceiptFromCurrentCart(): ReceiptPreviewData {
    const store = this.stores.find(
      (item) => item._id === this.currentStoreId(),
    );
    const rawSubtotal = this.billLines.reduce(
      (sum, line) =>
        sum + Number(line.billQty || 0) * Number(line.unitPrice || 0),
      0,
    );
    const paidAmount = Number(this.paidAmount || this.subtotal || 0);
    const cashReceived =
      this.paymentMethod === 'cash'
        ? Math.max(Number(this.cashReceivedAmount || paidAmount), paidAmount)
        : paidAmount;

    return {
      reference: 'Preview',
      saleDate: new Date().toISOString(),
      companyName: this.companyProfile?.name || 'Mooli Pharmacy',
      companyAddress: this.currentCompanyAddress(),
      companyPhone: this.companyProfile?.phone || '',
      companyEmail: this.companyProfile?.email || '',
      companyTaxNumber: this.companyProfile?.taxNumber || '',
      companyLogoUrl: this.companyProfile?.logoUrl || '',
      storeName: this.selectedStoreLabel,
      storeAddress: this.currentStoreAddress(),
      storePhone: store?.phone || '',
      cashierName: this.cashierName,
      customerName:
        this.patientName() === '-' ? 'Walk-in Customer' : this.patientName(),
      paymentMethod: this.receiptPaymentMethodLabel(
        this.paymentMethod,
        this.paymentStatusPreview,
      ),
      paymentStatus: this.paymentStatusPreview,
      items: this.billLines
        .filter((line) => line.billQty > 0)
        .map((line) => ({
          name: this.productDisplay(line.product),
          sku: line.product.sku || '',
          qty: Number(line.billQty || 0),
          discountLabel: this.receiptLineDiscountLabel(line),
          unitPrice: Number(line.unitPrice || 0),
          discount: Number(line.discount || 0),
          total: this.lineTotal(line),
        })),
      subtotal: rawSubtotal,
      discount: this.totalDiscount,
      total: this.subtotal,
      paidAmount,
      cashReceivedAmount: cashReceived,
      changeDueAmount:
        this.paymentMethod === 'cash'
          ? Math.max(cashReceived - this.subtotal, 0)
          : 0,
      note: this.prescription
        ? `Prescription ${this.prescription._id}`
        : 'POS sale preview',
      receiptLetterhead: this.receiptLetterheadSnapshot(),
    };
  }

  private buildSaleItemsFromCart() {
    return this.billLines
      .filter((line) => line.billQty > 0)
      .map((line) => ({
        productId: line.product._id,
        qty: line.billQty,
        unitPrice: line.unitPrice,
        discount: Number(line.discount || 0),
        tax: 0,
      }));
  }

  private buildReceiptFromSale(sale: Sale): ReceiptPreviewData {
    const store = this.stores.find((item) => item._id === sale.storeId);
    const paidAmount = Number(sale.paidAmount || 0);

    return {
      reference: sale.invoiceNo || sale._id,
      saleDate: sale.saleDate || sale.createdAt || new Date().toISOString(),
      companyName: this.companyProfile?.name || 'Mooli Pharmacy',
      companyAddress: this.currentCompanyAddress(),
      companyPhone: this.companyProfile?.phone || '',
      companyEmail: this.companyProfile?.email || '',
      companyTaxNumber: this.companyProfile?.taxNumber || '',
      companyLogoUrl: this.companyProfile?.logoUrl || '',
      storeName: store?.name || this.selectedStoreLabel,
      storeAddress: [store?.address, store?.city].filter(Boolean).join(', '),
      storePhone: store?.phone || '',
      cashierName: this.cashierName,
      customerName:
        this.patientName() === '-' ? 'Walk-in Customer' : this.patientName(),
      paymentMethod: this.resolveSalePaymentLabel(sale),
      paymentStatus: sale.paymentStatus,
      items: (sale.items || []).map((item) => ({
        name: item.name || 'Product',
        sku: item.sku || '',
        qty: Number(item.qty || 0),
        discountLabel: this.saleItemDiscountLabel(
          item,
          sale.items.indexOf(item),
        ),
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
      receiptLetterhead: this.receiptLetterheadSnapshot(),
    };
  }

  private applyRestoredSalePayload(response: RestoreHeldSaleResponse): void {
    const payload = response.salePayload;
    const productMap = new Map(this.products.map((product) => [product._id, product]));

    this.clearSale();
    payload.items.forEach((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        return;
      }

      const qty = Number(item.qty || 0) || 0;
      const discount = Number(item.discount || 0) || 0;
      const availableQty = this.productAvailableQty(product);
      const line: PharmacyBillLine = {
        sourceMedicineName: product.name,
        product,
        requestedQty: qty,
        billQty: Math.min(qty, Math.max(availableQty, 0)),
        availableQty,
        unitPrice: Number(item.unitPrice || this.productPrice(product) || 0),
        discount,
        discountInput: discount,
        discountType: 'amount',
      };
      this.syncLineDiscount(line);
      this.billLines.push(line);
    });

    this.refreshPaidAmount();
    if (this.billLines.length) {
      this.focusCartRow(0, true, 1);
    }
  }

  private openReceiptPrintWindow(receipt: ReceiptPreviewData): void {
    const popup = window.open('', '_blank', 'width=420,height=760');
    if (!popup) {
      this.toastr.error('Allow popups to print the receipt.');
      return;
    }

    this.receiptPreviewOpen = false;
    this.receiptPreview = null;

    let focusRestored = false;
    let closedPoll: number | undefined;
    const restoreSearchFocus = () => {
      if (focusRestored) {
        return;
      }

      focusRestored = true;
      if (closedPoll !== undefined) {
        window.clearInterval(closedPoll);
      }
      try {
        if (!popup.closed) {
          popup.close();
        }
      } catch {
        // The print context may already be unavailable.
      }
      window.focus();
      this.schedulePrintSearchFocus();
    };

    popup.onafterprint = restoreSearchFocus;
    popup.document.write(this.receiptHtml(receipt));
    popup.document.close();
    window.setTimeout(() => {
      try {
        popup.focus();
        popup.print();
      } catch {
        restoreSearchFocus();
      }
    }, 250);

    closedPoll = window.setInterval(() => {
      if (popup.closed) {
        restoreSearchFocus();
      }
    }, 250);
  }

  private receiptHtml(receipt: ReceiptPreviewData): string {
    const brandTitle = this.receiptBrandTitle(receipt);
    const headerLines = this.receiptHeaderDisplayLines(receipt);
    const footerTitle = this.receiptFooterTitle(receipt);
    const footerLines = this.receiptFooterLines(receipt);
    const logoUrl = this.receiptLogoUrl(receipt);
    const rows = receipt.items
      .map(
        (item) => `
        <tr>
          <td>
            <strong>${this.escapeHtml(item.name)}</strong>
            <small>${this.escapeHtml(item.sku)}</small>
          </td>
          <td>${item.qty}</td>
          <td>${this.escapeHtml(item.discountLabel)}</td>
          <td>${this.formatCurrency(item.unitPrice)}</td>
          <td>${this.formatCurrency(item.total)}</td>
        </tr>
      `,
      )
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <title>${this.escapeHtml(receipt.reference)}</title>
          <style>
            @page { margin: 8mm; size: 80mm auto; }
            * { box-sizing: border-box; }
            body { color: #111827; font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
            .receipt { margin: 0 auto; max-width: 320px; padding: 8px; }
            .center { text-align: center; }
            .logo { display: block; height: 58px; margin: 0 auto 8px; max-width: 58px; object-fit: contain; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            p { margin: 2px 0; }
            .meta { border-bottom: 1px dashed #9ca3af; border-top: 1px dashed #9ca3af; margin: 10px 0; padding: 8px 0; }
            .meta div, .totals div { display: flex; justify-content: space-between; gap: 10px; }
            table { border-collapse: collapse; table-layout: fixed; width: 100%; }
            th, td { border-bottom: 1px solid #e5e7eb; font-size: 9px; line-height: 1.2; padding: 4px 1px; text-align: left; vertical-align: top; word-break: break-word; }
            th:first-child, td:first-child { width: 38%; }
            th:nth-child(2), td:nth-child(2) { width: 10%; }
            th:nth-child(3), td:nth-child(3) { width: 15%; }
            th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5) { width: 18.5%; }
            th:nth-child(2), td:nth-child(2), th:nth-child(3), td:nth-child(3) { text-align: center; }
            th:nth-child(4), th:nth-child(5), td:nth-child(4), td:nth-child(5) { text-align: right; }
            small { color: #6b7280; display: block; font-size: 8px; margin-top: 2px; }
            .totals { border-top: 1px dashed #9ca3af; margin-top: 8px; padding-top: 8px; }
            .grand { font-size: 15px; font-weight: 800; }
            .foot { border-top: 1px dashed #9ca3af; margin-top: 12px; padding-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <section class="receipt">
            <div class="center">
              ${logoUrl ? `<img class="logo" src="${this.escapeHtml(logoUrl)}" alt="${this.escapeHtml(brandTitle)}" />` : ''}
              <h1>${this.escapeHtml(brandTitle)}</h1>
              ${headerLines.map((line) => `<p>${this.escapeHtml(line)}</p>`).join('')}
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
                <tr><th>Item</th><th>Qty</th><th>Discount</th><th>Rate</th><th>Total</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="totals">
              <div><span>Subtotal</span><strong>${this.formatCurrency(receipt.subtotal)}</strong></div>
              <div><span>Total Discount</span><strong>${this.formatCurrency(receipt.discount)}</strong></div>
              <div class="grand"><span>Total</span><strong>${this.formatCurrency(receipt.total)}</strong></div>
              <div><span>Paid</span><strong>${this.formatCurrency(receipt.paidAmount)}</strong></div>
              <div><span>Change</span><strong>${this.formatCurrency(receipt.changeDueAmount)}</strong></div>
              <div><span>Status</span><strong>${this.escapeHtml(receipt.paymentStatus)}</strong></div>
            </div>
            <div class="foot">
              <p><strong>${this.escapeHtml(footerTitle)}</strong></p>
              ${footerLines.map((line) => `<p>${this.escapeHtml(line)}</p>`).join('')}
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
    this.stores = await this.offline.readCachedValue<Store[]>(
      this.storesCacheKey(),
      [],
    );
    if (!this.selectedStoreId) {
      this.selectedStoreId = userStoreId || this.stores[0]?._id || '';
    }
  }

  private async loadCachedProducts(
    storeId: string,
    error: unknown,
  ): Promise<void> {
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

  private async loadCachedPrescription(
    id: string,
    error: unknown,
  ): Promise<void> {
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
    this.registerSession =
      await this.offline.readCachedValue<RegisterSession | null>(
        this.registerCacheKey(storeId),
        null,
      );
    this.registerOpened = this.registerSession?.status === 'open';
    this.registerClosed = this.registerSession?.status === 'closed';
    if (this.registerSession?.status === 'open') {
      this.openingAmount = Number(this.registerSession.openingAmount || 0);
    }
    this.loadRecentSales();
    this.focusInitialProductSearch();
  }

  private async loadCachedRecentSales(storeId: string): Promise<void> {
    const cached = await this.offline.readCachedValue<Sale[]>(
      this.recentSalesCacheKey(storeId),
      [],
    );
    await this.applyRecentSales(cached);
  }

  private async applyRecentSales(items: Sale[]): Promise<void> {
    this.recentSales = this.mergeSales([
      ...(await this.localQueuedSales()),
      ...items,
    ]);
  }

  private prepareSaleReturnModal(saleId = ''): void {
    this.saleReturnOpen = true;
    this.saleReturnLoading = false;
    this.saleReturnSubmitting = false;
    this.saleReturnErrorMessage = '';
    this.returnSaleSearch = '';
    this.selectedReturnSale = null;
    this.selectedReturnHistory = [];
    this.selectedReturnRefundCeiling = 0;
    this.returnLines = [];
    this.returnRefundAmount = 0;
    this.returnPaymentMethod = 'cash';

    if (saleId) {
      this.focusOverlayControl('.sale-return-modal .modal-close');
    }
  }

  private loadSaleReturnSale(saleId: string): void {
    this.saleReturnLoading = true;
    this.saleReturnErrorMessage = '';
    this.selectedReturnSale = null;
    this.selectedReturnHistory = [];
    this.selectedReturnRefundCeiling = 0;
    this.returnLines = [];

    this.backend.getSaleById(saleId).subscribe({
      next: (sale) => {
        this.backend.listSalesReturns({ saleId, limit: 100 }).subscribe({
          next: (result) => {
            this.selectedReturnSale = sale;
            this.selectedReturnHistory = result.items || [];
            this.selectedReturnRefundCeiling = Math.max(
              Number(sale.paidAmount || 0) -
                this.selectedReturnHistory.reduce(
                  (sum, item) => sum + Number(item.refundAmount || 0),
                  0,
                ),
              0,
            );
            this.returnLines = (sale.items || [])
              .map((item) => {
                const soldQty = Number(item.qty || 0) || 0;
                const returnedQty = this.returnedQuantityForSaleItem(
                  item.productId,
                  this.selectedReturnHistory,
                );
                const maxQty = Math.max(soldQty - returnedQty, 0);
                return {
                  productId: item.productId,
                  name: item.name || 'Product',
                  sku: item.sku || '',
                  soldQty,
                  alreadyReturnedQty: returnedQty,
                  maxQty,
                  qty: 0,
                  unitPrice: Number(item.unitPrice || 0),
                  reason: '',
                };
              })
              .filter((line) => line.maxQty > 0);
            this.saleReturnLoading = false;
          },
          error: (err) => {
            this.saleReturnLoading = false;
            this.saleReturnErrorMessage =
              err?.error?.message || 'Unable to load previous return history.';
          },
        });
      },
      error: (err) => {
        this.saleReturnLoading = false;
        this.saleReturnErrorMessage =
          err?.error?.message || 'Unable to load sale for return.';
      },
    });
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
    this.showReceiptPreview(receipt);
    this.billLines = [];
    this.unavailableMedicines = [];
    this.productSearch = '';
    this.selectedProductIndex = 0;
    this.paidAmount = '0';
    this.cashReceivedAmount = '0';
    this.saleSaving = false;
    this.showPosMessage(`Sale saved offline: ${invoiceNo}`, 'success');
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
      .filter(
        (entry) =>
          (entry.payload as unknown as CreateSalePayload).storeId === storeId,
      )
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

    const total = payload.items.reduce((sum, item) => {
      const qty = Number(item.qty || 0) || 0;
      const unitPrice = Number(item.unitPrice || 0) || 0;
      const discount = Number(item.discount || 0) || 0;
      const tax = Number(item.tax || 0) || 0;
      return sum + qty * unitPrice - discount + tax;
    }, 0);
    const paidAmount = Number(payload.paidAmount || 0) || 0;

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
      total: String(total),
      paidAmount: String(paidAmount),
      paymentStatus:
        paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
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
      String(second.createdAt || second.saleDate || '').localeCompare(
        String(first.createdAt || first.saleDate || ''),
      ),
    );
  }

  private returnedQuantityForSaleItem(
    productId: string,
    returns: SalesReturn[],
  ): number {
    return returns.reduce((sum, salesReturn) => {
      const returned = (salesReturn.items || [])
        .filter((item) => item.productId === productId)
        .reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0);
      return sum + returned;
    }, 0);
  }

  private saleHasRemainingReturnQuantity(sale: Sale): boolean {
    return ['completed', 'returned'].includes(sale.status);
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
    return this.offline.cacheKey(
      'pos-recent-sales',
      storeId || 'store',
      this.registerSession?._id || 'register',
    );
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
        discountInput: 0,
        discountType:
          product.maxDiscountType === 'percentage' ? 'percentage' : 'amount',
      });
    }

    this.billLines = lines;
    this.unavailableMedicines = unavailable;
    this.refreshPaidAmount();
  }

  private findProductForMedicine(
    medicineName: string,
  ): ProductCatalogItem | null {
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

    return (
      matches.sort(
        (a, b) => this.productAvailableQty(b) - this.productAvailableQty(a),
      )[0] || null
    );
  }

  private requestedMedicineQty(medicine: PrescriptionMedicine): number {
    const slots: Array<'morning' | 'noon' | 'evening' | 'night'> = [
      'morning',
      'noon',
      'evening',
      'night',
    ];
    const total = slots.reduce((sum, slot) => {
      const doseKey = `${slot}Dose` as
        | 'morningDose'
        | 'noonDose'
        | 'eveningDose'
        | 'nightDose';
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

  private productCost(product: ProductCatalogItem): number {
    return Number(product.costPrice || 0) || 0;
  }

  private productPrice(product: ProductCatalogItem): number {
    return Number(product.sellingPrice || 0) || 0;
  }

  private lineDiscountType(index: number): ProductDiscountType {
    return this.billLines[index]?.product.maxDiscountType === 'percentage'
      ? 'percentage'
      : 'amount';
  }

  private lineMaxDiscountAmount(index: number): number {
    const line = this.billLines[index];
    const product = line?.product;
    if (!line || !product?.discountEligible) {
      return 0;
    }

    const lineSubtotal =
      Number(line.billQty || 0) * Number(line.unitPrice || 0);
    const configuredValue = Number(product.maxDiscountValue || 0) || 0;
    if (lineSubtotal <= 0 || configuredValue <= 0) {
      return 0;
    }

    if (product.maxDiscountType === 'percentage') {
      return Number(((lineSubtotal * configuredValue) / 100).toFixed(2));
    }

    return Math.min(configuredValue, lineSubtotal);
  }

  private lineMaxDiscountPercent(index: number): number {
    const line = this.billLines[index];
    const lineSubtotal =
      Number(line?.billQty || 0) * Number(line?.unitPrice || 0);
    if (lineSubtotal <= 0) {
      return 0;
    }

    return Number(
      ((this.lineMaxDiscountAmount(index) / lineSubtotal) * 100).toFixed(2),
    );
  }

  private syncLineDiscount(line: PharmacyBillLine): void {
    const product = line.product;
    line.discountType =
      product.maxDiscountType === 'percentage' ? 'percentage' : 'amount';

    if (!product.discountEligible) {
      line.discount = 0;
      line.discountInput = 0;
      return;
    }

    const lineSubtotal =
      Number(line.billQty || 0) * Number(line.unitPrice || 0);
    const requestedInput = this.normalizeHalfStepValue(line.discountInput);
    const lineIndex = this.billLines.indexOf(line);
    const maxAmount =
      lineIndex >= 0 ? this.lineMaxDiscountAmount(lineIndex) : 0;
    const maxPercent =
      lineIndex >= 0 ? this.lineMaxDiscountPercent(lineIndex) : 0;

    let nextInputValue = requestedInput;
    let nextDiscountAmount = 0;

    if (line.discountType === 'percentage') {
      nextInputValue = this.normalizeHalfStepValue(
        Math.min(requestedInput, maxPercent),
      );
      nextDiscountAmount = Number(
        ((lineSubtotal * nextInputValue) / 100).toFixed(2),
      );
    } else {
      nextInputValue = this.normalizeHalfStepValue(
        Math.min(requestedInput, maxAmount),
      );
      nextDiscountAmount = nextInputValue;
    }

    line.discountInput = nextInputValue;
    line.discount = Math.max(Math.min(nextDiscountAmount, lineSubtotal), 0);
  }

  private stepLineDiscount(index: number, step: number): void {
    const line = this.billLines[index];
    if (!line) {
      return;
    }

    const nextValue = this.normalizeHalfStepValue(
      Math.max(
        0,
        Math.min(
          Number(line.discountInput || 0) + step,
          this.lineDiscountMaxValue(index),
        ),
      ),
    );

    line.discountInput = nextValue;
    this.syncLineDiscount(line);
    this.refreshPaidAmount();
  }

  private normalizeHalfStepValue(
    value: number | string | null | undefined,
  ): number {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 0;
    }

    return Math.round(numeric * 2) / 2;
  }

  private formatNumber(value: unknown): string {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
      return '0';
    }

    return amount.toLocaleString('en-PK', {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  private receiptLineDiscountLabel(line: PharmacyBillLine): string {
    if (Number(line.discount || 0) <= 0) {
      return '-';
    }

    return line.discountType === 'percentage'
      ? `${this.formatNumber(line.discountInput)}%`
      : this.formatCurrency(line.discount);
  }

  private saleItemDiscountLabel(
    item: Sale['items'][number],
    index: number,
  ): string {
    const currentLine = this.billLines[index];
    if (
      currentLine?.product._id === item.productId &&
      Number(currentLine.discount || 0) > 0
    ) {
      return this.receiptLineDiscountLabel(currentLine);
    }

    const discount = Number(item.discount || 0);
    return discount > 0 ? this.formatCurrency(discount) : '-';
  }

  refreshPaidAmount(): void {
    this.billLines.forEach((line) => this.syncLineDiscount(line));
    const nextPayable = Number(this.payableAmount || 0);

    if (this.paymentMethod === 'credit') {
      this.paidAmount = '0';
      this.cashReceivedAmount = '0';
      return;
    }

    if (!this.paidAmountTouched) {
      this.paidAmount = this.payableAmount;
    } else {
      this.paidAmount = String(
        this.normalizeMoneyInput(this.paidAmount, nextPayable),
      );
    }

    if (this.paymentMethod === 'cash') {
      if (!this.cashReceivedTouched) {
        this.cashReceivedAmount = this.paidAmount;
      } else {
        this.cashReceivedAmount = String(
          Math.max(Number(this.cashReceivedAmount || 0), Number(this.paidAmount || 0)),
        );
      }
    } else {
      this.cashReceivedAmount = this.paidAmount;
      this.cashReceivedTouched = false;
    }
  }

  private normalizeMoneyInput(
    value: string | number | null | undefined,
    maxValue: number,
  ): number {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 0;
    }

    return Math.min(numeric, Math.max(maxValue, 0));
  }

  private todayValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private showPosMessage(
    message: string,
    type: 'success' | 'warning' | 'danger' | 'info',
  ): void {
    if (type === 'success') {
      this.toastr.success(message);
      return;
    }

    if (type === 'danger') {
      this.toastr.error(message);
      return;
    }

    if (type === 'warning') {
      this.toastr.warning(message);
      return;
    }

    this.toastr.info(message);
  }

  private receiptPaymentMethodLabel(
    method: PharmacyPosPaymentMethod,
    paymentStatus: string,
  ): string {
    if (method === 'credit' || paymentStatus === 'unpaid') {
      return 'Credit';
    }

    if (paymentStatus === 'partial') {
      return `Partial ${this.formatPaymentMethodLabel(method)}`;
    }

    return this.formatPaymentMethodLabel(method);
  }

  private resolveSalePaymentLabel(sale: Sale): string {
    const total = Number(sale.total || 0) || 0;
    const paidAmount = Number(sale.paidAmount || 0) || 0;

    if (sale.paymentStatus === 'unpaid' || paidAmount <= 0) {
      return 'Credit';
    }

    if (sale.paymentStatus === 'partial' || paidAmount < total) {
      return 'Partial payment';
    }

    return 'Paid';
  }

  formatPaymentMethodLabel(value: string): string {
    const normalized = String(value || '')
      .replace(/[_-]+/g, ' ')
      .trim();

    if (!normalized) {
      return 'N/A';
    }

    return normalized
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private currentStoreAddress(): string {
    const store = this.stores.find(
      (item) => item._id === this.currentStoreId(),
    );
    return [store?.address, store?.city].filter(Boolean).join(', ');
  }

  private currentCompanyAddress(): string {
    return [
      this.companyProfile?.address,
      this.companyProfile?.city,
      this.companyProfile?.country,
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  private receiptLetterheadSnapshot(): ReceiptLetterheadSettings {
    const settings = this.companyProfile?.receiptLetterhead;

    return {
      enabled: settings?.enabled !== false,
      showLogo: Boolean(settings?.showLogo),
      logoUrl: settings?.logoUrl?.trim() || null,
      brandTitle: settings?.brandTitle?.trim() || null,
      brandSubtitle: settings?.brandSubtitle?.trim() || null,
      headerNote: settings?.headerNote?.trim() || null,
      contactLine: settings?.contactLine?.trim() || null,
      extraHeaderLines: this.uniqueReceiptLines(
        settings?.extraHeaderLines || [],
      ),
      footerTitle: settings?.footerTitle?.trim() || null,
      footerLines: this.uniqueReceiptLines(settings?.footerLines || []),
    };
  }

  private activeReceiptLetterhead(
    receipt: ReceiptPreviewData | null | undefined,
  ): ReceiptLetterheadSettings | null {
    const letterhead = receipt?.receiptLetterhead;
    return letterhead?.enabled === false ? null : letterhead || null;
  }

  private uniqueReceiptLines(
    lines: Array<string | null | undefined>,
  ): string[] {
    return lines.reduce<string[]>((result, line) => {
      const normalized = String(line || '').trim();
      if (
        normalized &&
        !result.some((item) => this.sameReceiptText(item, normalized))
      ) {
        result.push(normalized);
      }
      return result;
    }, []);
  }

  private sameReceiptText(first: string, second: string): boolean {
    return (
      String(first || '')
        .trim()
        .toLowerCase() ===
      String(second || '')
        .trim()
        .toLowerCase()
    );
  }

  private runShortcutAction(action: string): void {
    switch (action) {
      case 'focusSearch':
        this.focusProductSearch(true);
        return;
      case 'focusProducts':
        this.focusProductCard(this.selectedProductIndex || 0);
        return;
      case 'newSale':
        this.clearSale();
        this.focusProductSearch(true);
        return;
      case 'recentTransactions':
        this.openSaleHistory();
        return;
      case 'holdSale':
        this.saveHeldSale();
        return;
      case 'reports':
        this.openReports();
        return;
      case 'cashPayment':
        if (this.canCheckout) {
          this.checkoutWith('cash');
        } else {
          this.toastr.info(
            'Add bill items and open register before cash checkout.',
          );
        }
        return;
      case 'print':
        if (this.receiptPreviewOpen && this.receiptPreview) {
          this.printReceipt();
        } else {
          this.openCurrentBillPreview();
        }
        return;
      case 'preview':
        this.openCurrentBillPreview();
        return;
      case 'closeRegister':
        this.openCloseRegister();
        return;
      case 'shortcutInfo':
        this.openShortcutInfo();
        return;
    }
  }

  private handleKeyboardNavigation(event: KeyboardEvent): boolean {
    if (this.anyOverlayOpen()) {
      return false;
    }

    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      if (event.key === '1') {
        event.preventDefault();
        this.focusProductSearch(true);
        return true;
      }
      if (event.key === '2') {
        event.preventDefault();
        this.focusProductCard(this.selectedProductIndex || 0);
        return true;
      }
      if (event.key === '3') {
        event.preventDefault();
        this.focusCartRow(this.selectedCartIndex);
        return true;
      }
      if (event.key === '4') {
        event.preventDefault();
        this.focusActionDockButton(this.selectedDockIndex);
        return true;
      }
    }

    if (this.isSearchInputTarget(event.target)) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.focusProductCard(0);
          return true;
        case 'ArrowUp':
          event.preventDefault();
          this.focusProductCard(this.filteredProducts().length - 1);
          return true;
        case 'Tab':
          event.preventDefault();
          if (event.shiftKey) {
            const dockIndexes = this.availableActionDockIndexes();
            if (dockIndexes.length) {
              this.focusActionDockButton(dockIndexes.at(-1) || 0);
            }
          } else if (this.filteredProducts().length) {
            this.focusProductCard(0);
          } else if (this.billLines.length) {
            this.focusCartRow(this.selectedCartIndex);
          } else {
            this.focusActionDockButton(this.selectedDockIndex);
          }
          return true;
        default:
          return false;
      }
    }

    if (this.handleCartValueStepKeydown(event)) {
      return true;
    }

    if (
      this.isEditableTarget(event.target) &&
      !this.isCartKeyboardTarget(event.target)
    ) {
      return false;
    }

    switch (this.keyboardZone) {
      case 'products':
        return this.handleProductsZoneNavigation(event);
      case 'cart':
        return this.handleCartZoneNavigation(event);
      case 'actions':
        return this.handleActionsZoneNavigation(event);
      default:
        return false;
    }
  }

  private handleProductsZoneNavigation(event: KeyboardEvent): boolean {
    const products = this.filteredProducts();
    if (!products.length) {
      return false;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.focusProductCard(this.selectedProductIndex + 1);
        return true;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        if (this.selectedProductIndex > 0) {
          this.focusProductCard(this.selectedProductIndex - 1);
        } else {
          this.focusProductSearch(true);
        }
        return true;
      case 'Enter':
      case ' ':
        event.preventDefault();
        {
          const product = products[this.selectedProductIndex];
          if (product) {
            this.addProduct(product);
            this.focusProductCard(this.selectedProductIndex, false);
          }
        }
        return true;
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          this.focusProductSearch(true);
        } else if (this.billLines.length) {
          this.focusCartRow(this.selectedCartIndex);
        } else {
          this.focusActionDockButton(this.selectedDockIndex);
        }
        return true;
      default:
        return false;
    }
  }

  private handleCartZoneNavigation(event: KeyboardEvent): boolean {
    const cartIndexes = this.availableCartIndexes();
    if (!cartIndexes.length) {
      return false;
    }

    const currentPosition = Math.max(
      cartIndexes.indexOf(this.selectedCartIndex),
      0,
    );
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.focusCartCell(
          this.selectedCartIndex,
          this.selectedCartCellIndex + 1,
        );
        return true;
      case 'ArrowLeft':
        event.preventDefault();
        this.focusCartCell(
          this.selectedCartIndex,
          this.selectedCartCellIndex - 1,
        );
        return true;
      case 'ArrowDown':
        event.preventDefault();
        this.focusCartRow(
          cartIndexes[Math.min(currentPosition + 1, cartIndexes.length - 1)],
          true,
          this.selectedCartCellIndex,
        );
        return true;
      case 'ArrowUp':
        event.preventDefault();
        this.focusCartRow(
          cartIndexes[Math.max(currentPosition - 1, 0)],
          true,
          this.selectedCartCellIndex,
        );
        return true;
      case '+':
      case '=':
        event.preventDefault();
        this.incrementLineQty(this.selectedCartIndex);
        this.focusCartRow(
          this.selectedCartIndex,
          false,
          this.selectedCartCellIndex,
        );
        return true;
      case '-':
        event.preventDefault();
        this.decrementLineQty(this.selectedCartIndex);
        this.focusCartRow(
          this.selectedCartIndex,
          false,
          this.selectedCartCellIndex,
        );
        return true;
      case 'Delete':
        event.preventDefault();
        {
          const nextIndex =
            cartIndexes[
              Math.min(currentPosition + 1, cartIndexes.length - 1)
            ] ?? cartIndexes[currentPosition - 1];
          this.removeLine(this.selectedCartIndex);
          window.setTimeout(() => {
            const available = this.availableCartIndexes();
            if (available.length) {
              this.focusCartRow(
                available.includes(nextIndex) ? nextIndex : available[0],
                true,
                this.selectedCartCellIndex,
              );
            } else {
              this.focusProductCard(this.selectedProductIndex || 0);
            }
          });
        }
        return true;
      case 'Enter':
        event.preventDefault();
        this.focusCartCell(this.selectedCartIndex, this.selectedCartCellIndex);
        return true;
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          if (currentPosition > 0) {
            this.focusCartRow(
              cartIndexes[currentPosition - 1],
              true,
              this.selectedCartCellIndex,
            );
          } else {
            this.focusProductCard(this.selectedProductIndex || 0);
          }
        } else if (currentPosition < cartIndexes.length - 1) {
          this.focusCartRow(
            cartIndexes[currentPosition + 1],
            true,
            this.selectedCartCellIndex,
          );
        } else {
          this.focusActionDockButton(this.selectedDockIndex);
        }
        return true;
      default:
        return false;
    }
  }

  private handleActionsZoneNavigation(event: KeyboardEvent): boolean {
    const dockIndexes = this.availableActionDockIndexes();
    if (!dockIndexes.length) {
      return false;
    }

    const currentPosition = Math.max(
      dockIndexes.indexOf(this.selectedDockIndex),
      0,
    );
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.focusActionDockButton(
          dockIndexes[Math.min(currentPosition + 1, dockIndexes.length - 1)],
        );
        return true;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        if (currentPosition > 0) {
          this.focusActionDockButton(dockIndexes[currentPosition - 1]);
        } else {
          this.focusCartRow(this.selectedCartIndex);
        }
        return true;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.triggerActiveActionDockButton();
        return true;
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          if (currentPosition > 0) {
            this.focusActionDockButton(dockIndexes[currentPosition - 1]);
          } else {
            this.focusCartRow(this.selectedCartIndex);
          }
        } else if (currentPosition < dockIndexes.length - 1) {
          this.focusActionDockButton(dockIndexes[currentPosition + 1]);
        } else {
          this.focusProductSearch(true);
        }
        return true;
      default:
        return false;
    }
  }

  private focusElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement | null;
    element?.focus();
  }

  private focusProductSearch(selectText = false): void {
    this.keyboardZone = 'search';
    this.clampKeyboardNavigationState();
    window.setTimeout(() => {
      const input = document.querySelector(
        '.storepos-search-box input[type="search"]',
      ) as HTMLInputElement | null;
      input?.focus();
      if (selectText) {
        input?.select();
      }
    });
  }

  private schedulePrintSearchFocus(): void {
    this.pendingPrintSearchFocus = true;
    this.printSearchFocusAttempts = 0;
    this.flushPendingPrintSearchFocus();
  }

  private flushPendingPrintSearchFocus(): void {
    if (!this.pendingPrintSearchFocus) {
      return;
    }

    if (this.anyOverlayOpen()) {
      this.pendingPrintSearchFocus = false;
      this.printSearchFocusAttempts = 0;
      return;
    }

    const input = document.querySelector(
      '.storepos-search-box input[type="search"]',
    ) as HTMLInputElement | null;
    if (!input) {
      this.pendingPrintSearchFocus = false;
      this.printSearchFocusAttempts = 0;
      return;
    }

    this.printSearchFocusAttempts += 1;
    this.focusProductSearch();

    window.setTimeout(() => {
      if (document.activeElement === input) {
        this.pendingPrintSearchFocus = false;
        this.printSearchFocusAttempts = 0;
        return;
      }

      if (this.anyOverlayOpen()) {
        this.pendingPrintSearchFocus = false;
        this.printSearchFocusAttempts = 0;
        return;
      }

      if (this.printSearchFocusAttempts >= 8) {
        this.pendingPrintSearchFocus = false;
        this.printSearchFocusAttempts = 0;
        return;
      }

      if (!document.hidden) {
        this.flushPendingPrintSearchFocus();
      }
    }, 120);
  }

  private focusInitialProductSearch(): void {
    if (this.initialProductSearchFocused) {
      return;
    }

    if (!this.registerOpened && !this.registerClosed) {
      this.focusOverlayControl('[data-kb-opening-amount]', true);
      return;
    }

    this.initialProductSearchFocused = true;
    this.focusProductSearch();
  }

  private showReceiptPreview(receipt: ReceiptPreviewData): void {
    this.receiptPreview = receipt;
    this.receiptPreviewOpen = true;
    this.focusOverlayControl('[data-kb-receipt-print]');
  }

  private focusOverlayControl(
    selector: string,
    selectText = false,
    attempt = 0,
  ): void {
    window.setTimeout(
      () => {
        const element = document.querySelector(selector) as HTMLElement | null;
        if (!element) {
          if (attempt < 7) {
            this.focusOverlayControl(selector, selectText, attempt + 1);
          }
          return;
        }

        element.focus();
        if (selectText && element instanceof HTMLInputElement) {
          element.select();
        }
      },
      attempt === 0 ? 0 : 50,
    );
  }

  private restoreSearchFocusAfterOverlayClose(): void {
    window.setTimeout(() => {
      const overlay = this.activeOverlayModal();
      if (overlay) {
        this.overlayFocusableElements(overlay)[0]?.focus();
        return;
      }

      this.focusProductSearch(true);
    });
  }

  private focusProductCard(index: number, focus = true): void {
    const products = this.filteredProducts();
    if (!products.length) {
      this.focusProductSearch(true);
      return;
    }

    this.keyboardZone = 'products';
    this.selectedProductIndex = Math.min(
      Math.max(index, 0),
      products.length - 1,
    );
    const targetIndex = this.selectedProductIndex;
    this.clampKeyboardNavigationState();

    if (!focus) {
      return;
    }

    window.setTimeout(() => {
      const element = document.querySelector(
        `[data-kb-product-index="${targetIndex}"]`,
      ) as HTMLElement | null;
      element?.focus();
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  private focusCartRow(
    index: number,
    focus = true,
    preferredCellIndex = 0,
  ): void {
    const cartIndexes = this.availableCartIndexes();
    if (!cartIndexes.length) {
      this.focusProductCard(this.selectedProductIndex || 0);
      return;
    }

    const resolvedIndex = cartIndexes.includes(index) ? index : cartIndexes[0];
    this.keyboardZone = 'cart';
    this.selectedCartIndex = resolvedIndex;
    this.selectedCartCellIndex = Math.min(
      Math.max(preferredCellIndex, 0),
      Math.max(this.cartCellElements(resolvedIndex).length - 1, 0),
    );

    if (!focus) {
      return;
    }

    window.setTimeout(() => {
      const element =
        this.cartCellElements(resolvedIndex)[this.selectedCartCellIndex] ||
        (document.querySelector(
          `[data-kb-cart-index="${resolvedIndex}"]`,
        ) as HTMLElement | null);
      element?.focus();
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  private focusCartCell(index: number, cellIndex: number): void {
    const cells = this.cartCellElements(index);
    if (!cells.length) {
      this.focusCartRow(index);
      return;
    }

    this.keyboardZone = 'cart';
    this.selectedCartIndex = index;
    this.selectedCartCellIndex = Math.min(
      Math.max(cellIndex, 0),
      cells.length - 1,
    );

    window.setTimeout(() => {
      const element = this.cartCellElements(index)[this.selectedCartCellIndex];
      element?.focus();
      if (element instanceof HTMLInputElement) {
        element.select();
      }
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  private focusActionDockButton(index: number, focus = true): void {
    const dockIndexes = this.availableActionDockIndexes();
    if (!dockIndexes.length) {
      return;
    }

    const resolvedIndex = dockIndexes.includes(index) ? index : dockIndexes[0];
    this.keyboardZone = 'actions';
    this.selectedDockIndex = resolvedIndex;

    if (!focus) {
      return;
    }

    window.setTimeout(() => {
      const element = document.querySelector(
        `[data-kb-dock-index="${resolvedIndex}"]`,
      ) as HTMLElement | null;
      element?.focus();
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  setKeyboardZone(zone: PosKeyboardZone, index?: number): void {
    this.keyboardZone = zone;
    if (zone === 'products' && typeof index === 'number') {
      this.selectedProductIndex = index;
    }
    if (zone === 'cart' && typeof index === 'number') {
      this.selectedCartIndex = index;
    }
    if (zone === 'actions' && typeof index === 'number') {
      this.selectedDockIndex = index;
    }
    this.clampKeyboardNavigationState();
  }

  setCartCellFocus(index: number, cellIndex: number): void {
    this.keyboardZone = 'cart';
    this.selectedCartIndex = index;
    this.selectedCartCellIndex = cellIndex;
    this.clampKeyboardNavigationState();
  }

  private availableCartIndexes(): number[] {
    return this.billLines.map((_, index) => index);
  }

  private availableActionDockIndexes(): number[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>('[data-kb-dock-index]'),
    )
      .filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-disabled') !== 'true',
      )
      .map((element) => Number(element.dataset['kbDockIndex']))
      .filter((index) => Number.isFinite(index))
      .sort((first, second) => first - second);
  }

  private cartCellElements(index: number): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        `[data-kb-cart-index="${index}"] [data-kb-cart-cell]`,
      ),
    ).filter((element) => !element.hasAttribute('disabled'));
  }

  private clampKeyboardNavigationState(): void {
    const products = this.filteredProducts();
    this.selectedProductIndex = products.length
      ? Math.min(Math.max(this.selectedProductIndex, 0), products.length - 1)
      : 0;

    const cartIndexes = this.availableCartIndexes();
    if (cartIndexes.length) {
      if (!cartIndexes.includes(this.selectedCartIndex)) {
        this.selectedCartIndex = cartIndexes[0];
      }
      const cellCount = this.cartCellElements(this.selectedCartIndex).length;
      this.selectedCartCellIndex = Math.min(
        Math.max(this.selectedCartCellIndex, 0),
        Math.max(cellCount - 1, 0),
      );
    } else {
      this.selectedCartIndex = 0;
      this.selectedCartCellIndex = 0;
      if (this.keyboardZone === 'cart') {
        this.keyboardZone = products.length ? 'products' : 'search';
      }
    }

    const dockIndexes = this.availableActionDockIndexes();
    if (dockIndexes.length && !dockIndexes.includes(this.selectedDockIndex)) {
      this.selectedDockIndex = dockIndexes[0];
    }
  }

  private triggerActiveActionDockButton(): void {
    const element = document.querySelector(
      `[data-kb-dock-index="${this.selectedDockIndex}"]`,
    ) as HTMLElement | null;
    element?.click();
  }

  private handleOverlayTab(event: KeyboardEvent): boolean {
    if (event.key !== 'Tab' || !this.anyOverlayOpen()) {
      return false;
    }

    const overlay = this.activeOverlayModal();
    if (!overlay) {
      return false;
    }

    const focusable = this.overlayFocusableElements(overlay);
    if (!focusable.length) {
      event.preventDefault();
      return true;
    }

    const currentIndex = focusable.indexOf(
      document.activeElement as HTMLElement,
    );
    if (currentIndex < 0) {
      event.preventDefault();
      focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
      return true;
    }

    if (event.shiftKey && currentIndex === 0) {
      event.preventDefault();
      focusable[focusable.length - 1].focus();
      return true;
    }

    if (!event.shiftKey && currentIndex === focusable.length - 1) {
      event.preventDefault();
      focusable[0].focus();
      return true;
    }

    return false;
  }

  private activeOverlayModal(): HTMLElement | null {
    const overlays = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.modern-modal-backdrop .modern-register-modal',
      ),
    ).filter((element) => element.getClientRects().length > 0);

    return overlays[overlays.length - 1] || null;
  }

  private overlayFocusableElements(overlay: HTMLElement): HTMLElement[] {
    return Array.from(
      overlay.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        element.getClientRects().length > 0 &&
        element.getAttribute('aria-hidden') !== 'true',
    );
  }

  private handleOverlayEnter(event: KeyboardEvent): boolean {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    ) {
      return false;
    }

    if (!this.anyOverlayOpen()) {
      return false;
    }

    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName.toLowerCase();
    if (
      target?.isContentEditable ||
      tagName === 'textarea' ||
      tagName === 'button' ||
      tagName === 'a'
    ) {
      return false;
    }

    event.preventDefault();

    if (this.receiptPreviewOpen && this.receiptPreview) {
      this.printReceipt();
      return true;
    }
    if (this.saleReturnOpen) {
      this.submitSaleReturn();
      return true;
    }
    if (this.closeRegisterOpen) {
      void this.confirmCloseRegister();
      return true;
    }
    if (this.shortcutInfoOpen) {
      this.saveShortcutBindings();
      return true;
    }
    if (!this.registerOpened && !this.registerClosed) {
      this.openRegister();
      return true;
    }

    return false;
  }

  private anyOverlayOpen(): boolean {
    return (
      this.reportsOpen ||
      this.saleHistoryOpen ||
      this.saleReturnOpen ||
      this.receiptPreviewOpen ||
      this.closeRegisterOpen ||
      this.shortcutInfoOpen ||
      (!this.registerOpened && !this.registerClosed)
    );
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    return (
      element.isContentEditable ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (tagName === 'input' &&
        !['button', 'checkbox', 'radio', 'range', 'file', 'color'].includes(
          (element as HTMLInputElement).type,
        ))
    );
  }

  private isSearchInputTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return Boolean(
      element?.matches?.('.storepos-search-box input[type="search"]'),
    );
  }

  private isCartKeyboardTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return Boolean(element?.closest?.('[data-kb-cart-index]'));
  }

  private handleCartValueStepKeydown(event: KeyboardEvent): boolean {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return false;
    }

    const cartIndex = this.resolveCartIndexFromTarget(event.target);
    if (cartIndex < 0) {
      return false;
    }

    if (this.isQtyInputTarget(event.target)) {
      event.preventDefault();
      if (event.key === 'ArrowUp') {
        this.incrementLineQty(cartIndex);
      } else {
        this.decrementLineQty(cartIndex);
      }
      this.focusCartCell(cartIndex, this.selectedCartCellIndex);
      return true;
    }

    if (this.isDiscountInputTarget(event.target)) {
      event.preventDefault();
      this.stepLineDiscount(cartIndex, event.key === 'ArrowUp' ? 0.5 : -0.5);
      this.focusCartCell(cartIndex, this.selectedCartCellIndex);
      return true;
    }

    return false;
  }

  private resolveCartIndexFromTarget(target: EventTarget | null): number {
    const element = target as HTMLElement | null;
    const row = element?.closest?.(
      '[data-kb-cart-index]',
    ) as HTMLElement | null;
    if (!row) {
      return -1;
    }

    return Number(row.dataset['kbCartIndex'] ?? -1);
  }

  private isQtyInputTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return Boolean(element?.matches?.('input[aria-label="Line quantity"]'));
  }

  private isDiscountInputTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return Boolean(
      element?.matches?.('input[aria-label="Line discount value"]'),
    );
  }

  private eventShortcutCombo(event: KeyboardEvent): string {
    const segments: string[] = [];
    if (event.ctrlKey) segments.push('Ctrl');
    if (event.shiftKey) segments.push('Shift');
    if (event.altKey) segments.push('Alt');
    if (event.metaKey) segments.push('Meta');
    segments.push(this.normalizeShortcutKey(event.key));
    return segments.join('+');
  }

  private findShortcutAction(event: KeyboardEvent): string | undefined {
    const combo = this.eventShortcutCombo(event);
    return this.shortcutDefinitions.find(
      (definition) => this.shortcutBindings[definition.id] === combo,
    )?.id;
  }

  private defaultShortcutBindings(): Record<string, string> {
    return Object.fromEntries(
      this.shortcutDefinitions.map((definition) => [
        definition.id,
        this.normalizeShortcutCombo(definition.defaultCombo),
      ]),
    );
  }

  private loadShortcutBindings(): void {
    this.shortcutBindings = this.defaultShortcutBindings();

    try {
      const stored = JSON.parse(
        localStorage.getItem(this.shortcutBindingsStorageKey()) || 'null',
      ) as Record<string, unknown> | null;
      if (!stored) {
        return;
      }

      this.shortcutBindings = this.shortcutDefinitions.reduce<
        Record<string, string>
      >((bindings, definition) => {
        bindings[definition.id] = this.normalizeShortcutCombo(
          typeof stored[definition.id] === 'string'
            ? (stored[definition.id] as string)
            : definition.defaultCombo,
        );
        return bindings;
      }, {});
    } catch {
      this.shortcutBindings = this.defaultShortcutBindings();
      localStorage.removeItem(this.shortcutBindingsStorageKey());
    }
  }

  private findShortcutConflicts(bindings: Record<string, string>): string[] {
    const combos = new Map<string, string[]>();

    this.shortcutDefinitions.forEach((definition) => {
      const combo = bindings[definition.id];
      if (!combo) {
        return;
      }

      const labels = combos.get(combo) || [];
      labels.push(definition.label);
      combos.set(combo, labels);
    });

    return Array.from(combos.values())
      .filter((labels) => labels.length > 1)
      .flat();
  }

  private shortcutBindingsStorageKey(): string {
    return 'mooli-pharmacy-pos-shortcuts-v1';
  }

  private normalizeShortcutCombo(value: string): string {
    const raw = String(value || '')
      .trim()
      .replace(/\s+/g, '');
    if (!raw) {
      return '';
    }

    const segments = raw.split('+').filter(Boolean);
    const modifiers = new Set(
      segments.slice(0, -1).map((segment) => segment.toLowerCase()),
    );
    const key = (segments.at(-1) || '').toLowerCase();
    const ordered: string[] = [];

    if (modifiers.has('ctrl') || modifiers.has('control')) ordered.push('Ctrl');
    if (modifiers.has('shift')) ordered.push('Shift');
    if (modifiers.has('alt')) ordered.push('Alt');
    if (
      modifiers.has('meta') ||
      modifiers.has('cmd') ||
      modifiers.has('command')
    )
      ordered.push('Meta');

    ordered.push(this.normalizeShortcutKey(key));
    return ordered.filter(Boolean).join('+');
  }

  private normalizeShortcutKey(key: string): string {
    const normalized = String(key || '')
      .trim()
      .toLowerCase();
    if (!normalized) {
      return '';
    }

    const aliases: Record<string, string> = {
      esc: 'Escape',
      del: 'Delete',
      return: 'Enter',
      spacebar: 'Space',
      ' ': 'Space',
      slash: '/',
    };

    if (aliases[normalized]) {
      return aliases[normalized];
    }

    if (/^f\d{1,2}$/.test(normalized)) {
      return normalized.toUpperCase();
    }

    if (normalized.length === 1) {
      return normalized.toUpperCase();
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
      ].join(' '),
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
    return (
      this.selectedStoreId ||
      this.getStoredUser()?.storeId ||
      this.stores[0]?._id ||
      ''
    );
  }

  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }
}
