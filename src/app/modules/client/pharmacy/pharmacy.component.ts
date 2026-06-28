import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map, Observable, of, switchMap, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import {
  Category,
  Doctor,
  Hospital,
  Patient,
  Prescription,
  PrescriptionPrintSettings,
  PrescriptionTemplate,
  ProductDiscountType,
  ProductCatalogItem,
  Store,
  User,
} from '../../../shared/models/hospital.model';
import { legacyAdmissionOrdersToItems } from '../prescription/admission-order-data';
import { PrescriptionPrintPreviewData } from '../prescription/prescription-print-data.model';
import { PrescriptionPrintSheetComponent } from '../prescription/prescription-print-sheet.component';
import {
  formatEnglishAddress,
  formatEnglishDoctorName,
  formatEnglishDoctorTitle,
  formatEnglishOrganizationName,
  formatUrduAddress,
  formatUrduDoctorName,
  formatUrduDoctorTitle,
  formatUrduOrganizationName,
  formatUrduQualification,
  stripDoctorPrefix,
} from '../prescription/prescription-print-urdu';

interface PharmacyProductForm {
  name: string;
  sku: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  mfdDate: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  strengthValue: string;
  strengthUnit: string;
  costPrice: string;
  sellingPrice: string;
  openingStock: string;
  storeId: string;
  discountEligible: boolean;
  maxDiscountType: ProductDiscountType;
  maxDiscountValue: string;
}

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PrescriptionPrintSheetComponent],
  templateUrl: './pharmacy.component.html',
  styleUrl: './pharmacy.component.scss',
})
export class PharmacyComponent implements OnInit {
  @ViewChild(PrescriptionPrintSheetComponent, { static: false })
  printSheet?: PrescriptionPrintSheetComponent;

  prescriptions: Prescription[] = [];
  products: ProductCatalogItem[] = [];
  categories: Category[] = [];
  stores: Store[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  currentHospital: Hospital | null = null;
  currentHospitalId: string | null = null;
  selectedPatientId = '';
  loading = false;
  productsLoading = false;
  categoriesLoading = false;
  storesLoading = false;
  productModalOpen = false;
  savingProduct = false;
  deletingProductId = '';
  printPreviewOpen = false;
  printPreviewLoading = false;
  previewPrescription: Prescription | null = null;
  printPreviewData: PrescriptionPrintPreviewData | null = null;
  readonly prescriptionTemplates: Array<{ id: PrescriptionTemplate; name: string }> = [
    { id: 'classic', name: 'Classic' },
    { id: 'clinical-blue', name: 'Clinical Blue' },
    { id: 'gynae-clinical', name: "Gynae Theme 1 · Clinical Teal" },
    { id: 'gynae-womens-health', name: "Gynae Theme 2 · Women's Health" },
    { id: 'minimal-teal', name: 'Structure B · Green' },
    { id: 'compact-mono', name: 'Structure C · Purple' },
  ];
  readonly defaultVitalKeys = new Set(['bp', 'pulse', 'weight', 'temperature', 'spo2']);
  readonly defaultVitalLabels: Record<string, string> = {
    bp: 'BP',
    pulse: 'Pulse',
    weight: 'Weight',
    temperature: 'Temperature',
    spo2: 'SpO2',
  };
  private viewRequestId = 0;
  page = 1;
  limit = 10;
  totalPages = 0;
  productUnits = ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'ointment', 'inhaler', 'pcs'];
  strengthUnits = ['mg', 'ml', 'g', 'mcg', 'IU', '%', 'mg/ml', 'mg/5ml', 'mcg/ml'];
  productForm: PharmacyProductForm = this.getEmptyProductForm();
  private readonly requiredPosPermissions = [
    'sales.create',
    'sales.read',
    'products.read',
    'register_sessions.open',
    'register_sessions.read',
    'register_sessions.close',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: BackendService,
    private toastr: ToastrService,
    private dialog: AppDialogService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedPatientId = params.get('patientId') || '';
      this.page = 1;
      this.loadPrescriptions();

      if (params.get('productModal') === '1') {
        setTimeout(() => this.openProductModal());
      }
    });

    this.loadPatients();
    this.loadDoctors();
    this.refreshCurrentHospital();
    this.refreshCurrentUser();
    this.loadStores();
    this.loadCategories();
    this.loadProducts();
  }

  get canViewProducts(): boolean {
    return this.backend.hasPermission('products.read');
  }

  get canCreateProducts(): boolean {
    return this.backend.hasPermission('products.create');
  }

  get canDeleteProducts(): boolean {
    return this.backend.hasPermission('products.delete');
  }

  get canCreateCategories(): boolean {
    return this.backend.hasPermission('categories.create');
  }

  get canAdjustInventory(): boolean {
    return this.backend.hasPermission('inventory.adjust');
  }

  get selectedStoreLabel(): string {
    const storeId = this.currentStoreId();
    const store = this.stores.find((item) => item._id === storeId);
    return store?.name || (storeId ? 'Assigned pharmacy store' : 'No store assigned');
  }

  get missingPosPermissions(): string[] {
    return this.requiredPosPermissions.filter((permission) => !this.hasEffectivePosPermission(permission));
  }

  get canOpenPharmacyPos(): boolean {
    return this.missingPosPermissions.length === 0;
  }

  get pharmacyPosHint(): string {
    if (this.canOpenPharmacyPos) {
      return 'POS is ready for this pharmacy user.';
    }

    return `Missing POS permissions: ${this.missingPosPermissions.join(', ')}`;
  }

  get viewTemplateLabel(): string {
    return (
      this.prescriptionTemplates.find((template) => template.id === this.printPreviewTemplate)?.name ||
      'Classic'
    );
  }

  get printPreviewTemplate(): PrescriptionTemplate {
    return this.printPreviewData?.template || 'classic';
  }

  loadDoctors(): void {
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
        this.prescriptions = this.prescriptions.map((item) => ({
          ...item,
          prescriptionTemplate: this.resolvePrescriptionTemplate(item),
        }));
        this.refreshOpenViewPreview();
      },
      error: () => {
        this.doctors = [];
      },
    });
  }

  refreshCurrentHospital(): void {
    this.backend.getMe().subscribe({
      next: (user) => {
        this.currentHospitalId = user.hospitalId || this.currentHospitalId;
        this.currentHospital = user.hospital || this.currentHospital;
        this.refreshOpenViewPreview();
      },
      error: () => undefined,
    });
  }

  loadPatients(): void {
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.patients = result.items),
      error: () => (this.patients = []),
    });
  }

  refreshCurrentUser(): void {
    this.backend.getMe().subscribe({
      next: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('role', user.role?.name || '');
        localStorage.setItem('permissions', JSON.stringify(user.role?.permissions || []));

        if (user.storeId && !this.productForm.storeId) {
          this.productForm.storeId = user.storeId;
        }

        this.loadStores();
        this.loadCategories();
        this.loadProducts();
      },
      error: () => {
        // The page can still show prescriptions with the existing session cache.
      },
    });
  }

  loadPrescriptions(): void {
    this.loading = true;
    this.backend
      .getPrescriptions({
        page: this.page,
        limit: this.limit,
        patientId: this.selectedPatientId || undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.prescriptions = result.items.map((item) => ({
            ...item,
            prescriptionTemplate: this.resolvePrescriptionTemplate(item),
          }));
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.prescriptions = [];
          this.toastr.error(err?.error?.message || 'Unable to load prescriptions.');
        },
      });
  }

  loadProducts(): void {
    if (!this.canViewProducts) {
      this.products = [];
      return;
    }

    this.productsLoading = true;
    this.backend
      .getProducts({ limit: 100, isActive: true, storeId: this.currentStoreId() || undefined })
      .pipe(finalize(() => (this.productsLoading = false)))
      .subscribe({
        next: (result) => {
          this.products = result.items;
        },
        error: (err) => {
          this.products = [];
          this.toastr.error(err?.error?.message || 'Unable to load POS medicines.');
        },
      });
  }

  loadCategories(): void {
    if (!this.backend.hasPermission('categories.read')) {
      this.categories = [];
      return;
    }

    this.categoriesLoading = true;
    this.backend
      .getCategories({ limit: 100, isActive: true })
      .pipe(finalize(() => (this.categoriesLoading = false)))
      .subscribe({
        next: (result) => {
          this.categories = result.items;
        },
        error: () => {
          this.categories = [];
        },
      });
  }

  loadStores(): void {
    const user = this.getStoredUser();
    if (!this.backend.hasPermission('stores.read')) {
      this.stores = [];
      if (user?.storeId && !this.productForm.storeId) {
        this.productForm.storeId = user.storeId;
      }
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
          this.stores = result.items;
          const assignedStoreId = user?.storeId || '';
          const fallbackStoreId = this.stores[0]?._id || '';

          if (!this.productForm.storeId) {
            this.productForm.storeId = assignedStoreId || fallbackStoreId;
          }
        },
        error: () => {
          this.stores = [];
        },
      });
  }

  openProductModal(): void {
    if (!this.canCreateProducts) {
      this.toastr.error('This role needs products.create to add pharmacy medicines.');
      return;
    }

    if (!this.productForm.storeId) {
      this.productForm.storeId = this.currentStoreId();
    }

    this.productModalOpen = true;
  }

  closeProductModal(): void {
    if (this.savingProduct) {
      return;
    }

    this.productModalOpen = false;
    this.productForm = this.getEmptyProductForm();
    this.productForm.storeId = this.currentStoreId();
  }

  saveProduct(): void {
    if (this.savingProduct) {
      return;
    }

    const name = this.productForm.name.trim();
    const sellingPrice = Number(this.productForm.sellingPrice);
    const openingStock = Number(this.productForm.openingStock || 0);
    const storeId = this.productForm.storeId || this.currentStoreId();

    if (!this.canCreateProducts) {
      this.toastr.error('This role needs products.create to add pharmacy medicines.');
      return;
    }

    if (!name) {
      this.toastr.error('Medicine/product name is required.');
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      this.toastr.error('Enter a valid selling price.');
      return;
    }

    if (this.productForm.discountEligible && !this.isValidDiscountSetup()) {
      this.toastr.error('Enable discount only after setting a valid maximum amount or percentage.');
      return;
    }

    if (this.productForm.discountEligible && !this.isHalfStepValue(this.productForm.maxDiscountValue)) {
      this.toastr.error('Discount must be in 0.5 steps like 1.5 or 5.0.');
      return;
    }

    if (!storeId) {
      this.toastr.error('No pharmacy store is assigned. Login again or assign a store to this pharmacy user.');
      return;
    }

    if (!Number.isInteger(openingStock) || openingStock < 1) {
      this.toastr.error('Opening stock must be at least 1 to add this product to the store.');
      return;
    }

    this.savingProduct = true;
    const strengthDescription = [
      this.productForm.strengthValue.trim(),
      this.productForm.strengthUnit,
    ]
      .filter(Boolean)
      .join(' ');

    this.resolveProductCategoryId()
      .pipe(
        switchMap((categoryId) =>
          this.backend.createProduct({
            categoryId,
            name,
            sku: this.productForm.sku.trim() || this.generateSku(name),
            barcode: this.productForm.barcode.trim() || undefined,
            batchNumber: this.productForm.batchNumber.trim() || undefined,
            expiryDate: this.normalizeDateForPayload(this.productForm.expiryDate) || undefined,
            mfdDate: this.normalizeDateForPayload(this.productForm.mfdDate) || undefined,
            brand: this.productForm.brand.trim() || undefined,
            unit: this.productForm.unit || 'pcs',
            description: strengthDescription || undefined,
            costPrice: this.productForm.costPrice || '0',
            sellingPrice: this.productForm.sellingPrice || '0',
            discountEligible: this.productForm.discountEligible,
            maxDiscountType: this.productForm.discountEligible ? this.productForm.maxDiscountType : undefined,
            maxDiscountValue:
              this.productForm.discountEligible && this.productForm.maxDiscountValue !== ''
                ? this.productForm.maxDiscountValue
                : undefined,
            taxRate: '0',
            isActive: true,
          })
        ),
        switchMap((response) => this.applyOpeningStock(response.data, storeId)),
        finalize(() => (this.savingProduct = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Medicine/product added to pharmacy store.');
          this.productModalOpen = false;
          this.productForm = this.getEmptyProductForm();
          this.productForm.storeId = storeId;
          this.loadProducts();
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || err?.message || 'Unable to add medicine/product.');
        },
      });
  }

  async deleteProduct(product: ProductCatalogItem): Promise<void> {
    if (!this.canDeleteProducts) {
      this.toastr.error('This role needs products.delete to remove pharmacy medicines.');
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Delete Product',
      message: `Delete ${product.name} from product management? This action cannot be undone.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.deletingProductId = product._id;
    this.backend
      .deleteProduct(product._id)
      .pipe(finalize(() => (this.deletingProductId = '')))
      .subscribe({
        next: () => {
          this.products = this.products.filter((item) => item._id !== product._id);
          this.toastr.success('Medicine/product deleted.');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to delete medicine/product.');
        },
      });
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  ageLabel(patient?: Patient | null): string {
    if (!patient?.dateOfBirth) {
      return '-';
    }

    const birthDate = new Date(patient.dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      return '-';
    }

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
      years -= 1;
    }

    return `${Math.max(years, 0)} Y`;
  }

  genderShort(patient?: Patient | null): string {
    return patient?.gender ? patient.gender.charAt(0).toUpperCase() : '-';
  }

  shortDate(value?: string | Date | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  readonly tableMedicinePreviewLimit = 2;

  tableMedicines(medicines: Prescription['medicines'] | null | undefined): Prescription['medicines'] {
    return (medicines || []).slice(0, this.tableMedicinePreviewLimit);
  }

  extraMedicineCount(medicines: Prescription['medicines'] | null | undefined): number {
    const total = (medicines || []).length;
    return total > this.tableMedicinePreviewLimit ? total - this.tableMedicinePreviewLimit : 0;
  }

  getMedicineMatches(medicineName: string): ProductCatalogItem[] {
    const normalizedMedicine = this.normalizeText(medicineName);
    if (!normalizedMedicine) {
      return [];
    }

    return this.products
      .filter((product) => {
        const haystack = this.normalizeText(
          [product.name, product.sku, product.barcode, product.batchNumber, product.brand].join(' ')
        );
        return (
          haystack.includes(normalizedMedicine) ||
          normalizedMedicine.includes(this.normalizeText(product.name))
        );
      })
      .slice(0, 3);
  }

  productStrength(product: ProductCatalogItem): string {
    return [product.strengthValue, product.strengthUnit].filter(Boolean).join(' ') || '-';
  }

  productStock(product: ProductCatalogItem): string {
    return String(product.availableQuantity ?? product.stockQuantity ?? '0');
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPrescriptions();
  }

  openPharmacyPos(prescription?: Prescription): void {
    if (!this.canOpenPharmacyPos) {
      return;
    }

    const queryParams: Record<string, string> = {};
    const storeId = this.currentStoreId();

    if (storeId) {
      queryParams['storeId'] = storeId;
    }

    if (prescription?._id) {
      queryParams['prescriptionId'] = prescription._id;
    }

    if (prescription?.patientId) {
      queryParams['patientId'] = prescription.patientId;
    }

    this.router.navigate(['/pharmacy/pos'], { queryParams });
  }

  openPrintPreview(prescription: Prescription): void {
    const requestId = ++this.viewRequestId;
    const fallbackTemplate = this.resolvePrescriptionTemplate(prescription);

    this.printPreviewOpen = true;
    this.printPreviewLoading = true;
    this.previewPrescription = {
      ...prescription,
      prescriptionTemplate: fallbackTemplate,
    };
    this.printPreviewData = this.buildPrintPreviewData(this.previewPrescription, fallbackTemplate);

    this.backend
      .getPrescription(prescription._id)
      .pipe(
        finalize(() => {
          if (requestId === this.viewRequestId) {
            this.printPreviewLoading = false;
          }
        })
      )
      .subscribe({
        next: (freshPrescription) => {
          if (requestId !== this.viewRequestId) {
            return;
          }

          const resolvedTemplate = this.resolvePrescriptionTemplate(freshPrescription, fallbackTemplate);
          const resolvedPrescription: Prescription = {
            ...freshPrescription,
            prescriptionTemplate: resolvedTemplate,
          };

          this.previewPrescription = resolvedPrescription;
          this.printPreviewData = this.buildPrintPreviewData(resolvedPrescription, resolvedTemplate);
          this.prescriptions = this.prescriptions.map((item) =>
            item._id === resolvedPrescription._id ? resolvedPrescription : item
          );
        },
        error: (err) => {
          if (requestId !== this.viewRequestId) {
            return;
          }

          if (!this.printPreviewData) {
            this.printPreviewOpen = false;
            this.toastr.error(err?.error?.message || 'Unable to load prescription view.');
          } else {
            this.toastr.info('Showing cached prescription view.');
          }
        },
      });
  }

  closePrintPreview(): void {
    this.viewRequestId += 1;
    this.printPreviewOpen = false;
    this.printPreviewLoading = false;
    this.previewPrescription = null;
    this.printPreviewData = null;
  }

  printPrescription(): void {
    const content = this.printSheet?.printContent?.nativeElement?.outerHTML;
    if (!content) {
      return;
    }

    this.openPrescriptionPrintWindow(content);
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private hasEffectivePosPermission(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }

  currentStoreId(): string {
    const user = this.getStoredUser();
    return user?.storeId || this.productForm.storeId || this.stores[0]?._id || '';
  }

  private getEmptyProductForm(): PharmacyProductForm {
    return {
      name: '',
      sku: '',
      barcode: '',
      batchNumber: '',
      expiryDate: '',
      mfdDate: '',
      brand: '',
      categoryId: '',
      categoryName: '',
      unit: 'tablet',
      strengthValue: '',
      strengthUnit: 'mg',
      costPrice: '0',
      sellingPrice: '0',
      openingStock: '1',
      storeId: this.getStoredUser()?.storeId || '',
      discountEligible: false,
      maxDiscountType: 'amount',
      maxDiscountValue: '',
    };
  }

  get discountEnabled(): boolean {
    return Boolean(this.productForm.discountEligible);
  }

  private resolveProductCategoryId(): Observable<string> {
    if (this.productForm.categoryId) {
      return of(this.productForm.categoryId);
    }

    const categoryName = this.productForm.categoryName.trim();
    if (!categoryName) {
      return throwError(() => new Error('Select category or enter a new category name.'));
    }

    if (!this.canCreateCategories) {
      return throwError(() => new Error('This role needs categories.create to add a new medicine category.'));
    }

    return this.backend
      .createCategory({
        name: categoryName,
        code: this.generateCode(categoryName),
        isActive: true,
      })
      .pipe(
        map((response) => {
          const category = response.data;
          this.categories = [category, ...this.categories];
          this.productForm.categoryId = category._id;
          return category._id;
        })
      );
  }

  private applyOpeningStock(product: ProductCatalogItem, storeId: string): Observable<ProductCatalogItem> {
    const quantity = Number(this.productForm.openingStock || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return of(product);
    }

    if (!this.canAdjustInventory) {
      this.toastr.warning('Product created, but this role needs inventory.adjust to set opening stock.');
      return of(product);
    }

    return this.backend
      .adjustInventory({
        productId: product._id,
        locationType: 'store',
        locationId: storeId,
        adjustmentType: 'SET',
        quantity: String(Math.floor(quantity)),
        reason: 'OPENING_STOCK',
        note: 'Opening stock from Mooli pharmacy',
      })
      .pipe(map(() => product));
  }

  private generateSku(name: string): string {
    const prefix = this.generateCode(name).slice(0, 18) || 'MED';
    const suffix = Date.now().toString(36).slice(-6).toUpperCase();
    return `${prefix}-${suffix}`;
  }

  private isValidDiscountSetup(): boolean {
    const value = Number(this.productForm.maxDiscountValue);
    if (
      (this.productForm.maxDiscountType !== 'amount' && this.productForm.maxDiscountType !== 'percentage') ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return false;
    }

    if (this.productForm.maxDiscountType === 'percentage' && value > 100) {
      return false;
    }

    return true;
  }

  private isHalfStepValue(value: number | string | null | undefined): boolean {
    const normalized = String(value ?? '').trim();
    if (!normalized.length) {
      return false;
    }

    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric > 0 && Math.abs(numeric * 2 - Math.round(numeric * 2)) < 0.000001;
  }

  private toDateInputValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDateForPayload(value?: string | null): string {
    return this.toDateInputValue(value);
  }

  private generateCode(value: string): string {
    return String(value || 'MED')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'MED';
  }

  private buildPrintPreviewData(
    prescription: Prescription,
    fallbackTemplate?: PrescriptionTemplate
  ): PrescriptionPrintPreviewData | null {
    const patient = this.resolvePrintPatient(prescription);
    if (!patient) {
      return null;
    }

    const doctor = this.resolveViewDoctor(prescription);
    const hospital = this.currentHospital;
    const settings = this.resolvePrescriptionSettings(hospital);
    const vitals = this.safeStringRecord(prescription.vitals);
    const hospitalName = hospital?.name || 'MediLink City Care Hospital';
    const hospitalAddress = this.hospitalAddressLine(hospital);
    const hospitalLogoUrl = this.safeHospitalLogoUrl(hospital?.logoUrl);
    const doctorDisplayName = prescription.doctor?.name || this.doctorName(doctor);
    const doctorQualification =
      doctor?.qualification ||
      (doctor?.specialization && !/consultant|physician/i.test(doctor.specialization)
        ? doctor.specialization
        : 'M.B.B.S., F.C.P.S.');

    return {
      template: this.resolvePrescriptionTemplate(prescription, fallbackTemplate),
      patient,
      patientName: this.patientName(patient),
      patientAge: this.ageLabel(patient),
      patientGender: this.genderShort(patient),
      patientNo: patient.patientNo || '-',
      patientPhone: patient.phone || '-',
      patientAddress: formatEnglishAddress(patient.address) || '-',
      doctorName: formatEnglishDoctorName(doctorDisplayName),
      doctorNamePlain: stripDoctorPrefix(doctorDisplayName),
      doctorNameUrdu: formatUrduDoctorName(doctorDisplayName, doctor?.nameUrdu),
      doctorQualification,
      doctorQualificationUrdu: formatUrduQualification(doctorQualification),
      doctorTitleEnglish: formatEnglishDoctorTitle(),
      doctorTitleUrdu: formatUrduDoctorTitle(),
      hospitalName: formatEnglishOrganizationName(hospitalName) || hospitalName,
      hospitalNameUrdu: formatUrduOrganizationName(hospitalName) || hospitalName,
      hospitalAddress: formatEnglishAddress(hospitalAddress),
      hospitalAddressUrdu: formatUrduAddress(hospitalAddress) || formatEnglishAddress(hospitalAddress),
      hospitalLogoUrl,
      showHospitalLogo: settings.showLogo !== false && Boolean(hospitalLogoUrl),
      prescriptionRevisionNote: settings.revisionNote || '* Rx to be revised after Reports.',
      prescriptionFollowUpLine:
        settings.followUpLine || `For appointment and follow up, contact ${hospitalName}.`,
      prescriptionFooterLines: this.prescriptionFooterLines(hospital, settings),
      date: this.formatPrintDate(prescription.createdAt || new Date()),
      prescriptionNo: this.formatPrescriptionNumber(prescription._id),
      disease: prescription.diagnosis || prescription.chiefComplaint || prescription.history || '-',
      vitals,
      vitalRows: this.vitalEntries(vitals),
      labTests: (prescription.labTests || [])
        .filter((test) => String(test.name || '').trim())
        .map((test) => ({
          name: String(test.name || '').trim(),
          category: String(test.category || '').trim(),
        })),
      ivFluids: (prescription.ivFluids || [])
        .filter((fluid) => String(fluid.name || '').trim())
        .map((fluid) => ({
          name: String(fluid.name || '').trim(),
          rate: String(fluid.rate || '').trim() || '-',
          quantity: String(fluid.duration || '').trim() || '-',
          route: String(fluid.route || 'IV').trim() || 'IV',
        })),
      medicines: (prescription.medicines || []).map((medicine) => ({ ...medicine })),
      followUpDate: prescription.followUpDate ? this.shortDate(prescription.followUpDate) : '-',
      patientNote: String(prescription.advice || '').trim(),
      consultation: String(prescription.admissionOrders?.consultation || '').trim(),
      admissionOrderLines: this.resolvePrintAdmissionOrderLines(prescription),
    };
  }

  private resolvePrintAdmissionOrderLines(prescription: Prescription): string[] {
    const lines: string[] = [];
    const consultation = String(prescription.admissionOrders?.consultation || '').trim();

    (prescription.admissionOrderItems || []).forEach((item) => {
      const order = String(item.order || '').trim();
      if (order && !lines.includes(order)) {
        lines.push(order);
      }
    });

    if (prescription.admissionOrders) {
      legacyAdmissionOrdersToItems(prescription.admissionOrders).forEach((item) => {
        const order = String(item.order || '').trim();
        if (order && order !== consultation && !lines.includes(order)) {
          lines.push(order);
        }
      });
    }

    return lines.slice(0, 12);
  }

  private resolvePrintPatient(prescription: Prescription): Patient | null {
    const patient =
      prescription.patient ||
      this.patients.find((item) => item._id === prescription.patientId) ||
      null;

    if (patient) {
      return patient;
    }

    if (!prescription.patientId) {
      return null;
    }

    return {
      _id: prescription.patientId,
      hospitalId: prescription.hospitalId,
      patientNo: '-',
      assignedDoctorId: '',
      firstName: 'Patient',
      lastName: '',
      phone: null,
      gender: 'other',
      dateOfBirth: null,
      address: null,
      bloodGroup: null,
      allergies: [],
      chronicDiseases: [],
      currentMedications: [],
      status: 'active',
    } as Patient;
  }

  private formatPrintDate(value: string | Date): string {
    const date = new Date(value);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

    return safeDate
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .replace(/ /g, '-')
      .toUpperCase();
  }

  private refreshOpenViewPreview(): void {
    if (!this.previewPrescription || !this.printPreviewData || !this.printPreviewOpen) {
      return;
    }

    const template = this.resolvePrescriptionTemplate(this.previewPrescription);
    this.previewPrescription = {
      ...this.previewPrescription,
      prescriptionTemplate: template,
    };
    this.printPreviewData = this.buildPrintPreviewData(this.previewPrescription, template);
  }

  private resolvePrescriptionTemplate(
    prescription: Prescription | null | undefined,
    fallbackTemplate?: PrescriptionTemplate
  ): PrescriptionTemplate {
    const savedTemplate = prescription?.prescriptionTemplate;
    const doctor = this.resolveViewDoctor(prescription);
    const doctorTemplate = doctor?.prescriptionTemplate;

    if (this.isPrescriptionTemplate(doctorTemplate) && doctorTemplate !== 'classic') {
      return doctorTemplate;
    }

    if (this.isPrescriptionTemplate(savedTemplate)) {
      return savedTemplate;
    }

    if (this.isPrescriptionTemplate(fallbackTemplate)) {
      return fallbackTemplate;
    }

    return 'classic';
  }

  private resolveViewDoctor(prescription: Prescription | null | undefined): Doctor | null {
    const ids = [prescription?.doctorId, prescription?.doctor?._id]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    return (
      this.doctors.find((doctor) => {
        const doctorProfileId = String(doctor._id || '').trim();
        const doctorUserId = String(doctor.userId || '').trim();
        return ids.includes(doctorProfileId) || ids.includes(doctorUserId);
      }) || null
    );
  }

  private doctorName(doctor?: Doctor | null): string {
    return doctor?.user?.name || doctor?.specialization || '-';
  }

  private isPrescriptionTemplate(value: unknown): value is PrescriptionTemplate {
    return this.prescriptionTemplates.some((template) => template.id === value);
  }

  private safeStringRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.entries(value as Record<string, unknown>).reduce((record, [key, entryValue]) => {
      const safeKey = String(key || '').trim();
      if (safeKey) {
        record[safeKey] = String(entryValue ?? '').trim();
      }
      return record;
    }, {} as Record<string, string>);
  }

  private vitalEntries(vitals: Record<string, string> | null | undefined): Array<{ label: string; value: string }> {
    const source = vitals || {};
    const orderedDefaultEntries = ['bp', 'weight', 'pulse', 'temperature', 'spo2']
      .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
      .map((key) => ({
        label: this.defaultVitalLabels[key] || key,
        value: String(source[key] || '').trim() || '-',
      }));

    const customEntries = Object.entries(source)
      .filter(([key]) => !this.defaultVitalKeys.has(key))
      .map(([key, value]) => ({
        label: this.formatVitalLabel(key),
        value: String(value || '').trim() || '-',
      }));

    return [...orderedDefaultEntries, ...customEntries];
  }

  private resolvePrescriptionSettings(hospital: Hospital | null): PrescriptionPrintSettings {
    return {
      showLogo: hospital?.prescriptionSettings?.showLogo !== false,
      revisionNote: hospital?.prescriptionSettings?.revisionNote || '* Rx to be revised after Reports.',
      followUpLine: hospital?.prescriptionSettings?.followUpLine || '',
      contactLine: hospital?.prescriptionSettings?.contactLine || '',
      footerLines: hospital?.prescriptionSettings?.footerLines || [],
    };
  }

  private hospitalAddressLine(hospital: Hospital | null): string {
    return [hospital?.address, hospital?.city, hospital?.country].filter(Boolean).join(', ');
  }

  private prescriptionFooterLines(hospital: Hospital | null, settings: PrescriptionPrintSettings): string[] {
    const configuredLines = (settings.footerLines || []).filter((line) => Boolean(line?.trim()));

    if (configuredLines.length > 0) {
      return configuredLines;
    }

    const contactLine = settings.contactLine || this.defaultHospitalContactLine(hospital);
    return contactLine ? [contactLine] : [];
  }

  private defaultHospitalContactLine(hospital: Hospital | null): string {
    const parts = [
      hospital?.email ? `Email: ${hospital.email}` : '',
      hospital?.phone ? `Phone: ${hospital.phone}` : '',
    ].filter(Boolean);

    return parts.join(' | ') || 'Email: info@medilink.local | Phone: 0300-0000000';
  }

  private safeHospitalLogoUrl(value: unknown): string {
    const logoUrl = String(value || '').trim();
    if (!logoUrl) {
      return '';
    }

    return logoUrl.startsWith('data:image/') && logoUrl.length > 1000000 ? '' : logoUrl;
  }

  private formatVitalLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  private formatPrescriptionNumber(value: unknown): string {
    const rawValue = String(value || '').trim();
    if (!rawValue) {
      return 'DRAFT';
    }

    const compactValue = rawValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `RX-${compactValue.slice(-6).padStart(6, '0')}`;
  }

  private openPrescriptionPrintWindow(content: string): void {
    const iframe = document.createElement('iframe');
    const baseHref = document.baseURI || window.location.href;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const printDocument = iframe.contentWindow?.document;
    const printWindow = iframe.contentWindow;
    if (!printDocument || !printWindow) {
      iframe.remove();
      return;
    }

    printDocument.open();
    printDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${baseHref}">
          <title>Prescription Print</title>
          ${Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map((node) => node.outerHTML)
            .join('')}
        </head>
        <body>${content}</body>
      </html>
    `);
    printDocument.close();

    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      window.setTimeout(() => iframe.remove(), 1000);
    }, 250);
  }
}
