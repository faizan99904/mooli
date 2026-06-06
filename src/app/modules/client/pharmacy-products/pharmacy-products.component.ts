import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, map, Observable, of, switchMap, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  Category,
  ProductCatalogItem,
  Store,
  User,
} from '../../../shared/models/hospital.model';

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
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
}

@Component({
  selector: 'app-pharmacy-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-products.component.html',
  styleUrl: './pharmacy-products.component.scss',
})
export class PharmacyProductsComponent implements OnInit {
  products: ProductCatalogItem[] = [];
  categories: Category[] = [];
  stores: Store[] = [];
  productSearch = '';
  productsLoading = false;
  categoriesLoading = false;
  storesLoading = false;
  productModalOpen = false;
  savingProduct = false;
  editingProductId = '';
  editingOriginalStock = '';
  deletingProductId = '';
  productUnits = ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'ointment', 'inhaler', 'pcs'];
  strengthUnits = ['mg', 'ml', 'g', 'mcg', 'IU', '%', 'mg/ml', 'mg/5ml', 'mcg/ml'];
  productForm: ProductForm = this.getEmptyProductForm();

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('productModal') === '1') {
        setTimeout(() => this.openProductModal());
      }
    });

    this.refreshCurrentUser();
    this.loadStores();
    this.loadCategories();
    this.loadProducts();
  }

  get canViewProducts(): boolean {
    return this.backend.hasPermission('products.read') || this.hasPharmacyAccess();
  }

  get canCreateProducts(): boolean {
    return this.backend.hasPermission('products.create') || this.hasPharmacyAccess();
  }

  get canUpdateProducts(): boolean {
    return this.backend.hasPermission('products.update') || this.hasPharmacyAccess();
  }

  get canDeleteProducts(): boolean {
    return this.backend.hasPermission('products.delete') || this.hasPharmacyAccess();
  }

  get canCreateCategories(): boolean {
    return this.backend.hasPermission('categories.create') || this.hasPharmacyAccess();
  }

  get canAdjustInventory(): boolean {
    return this.backend.hasPermission('inventory.adjust') || this.hasPharmacyAccess();
  }

  get selectedStoreLabel(): string {
    const storeId = this.currentStoreId();
    const store = this.stores.find((item) => item._id === storeId);
    return store?.name || (storeId ? 'Assigned pharmacy store' : 'No store assigned');
  }

  get filteredProducts(): ProductCatalogItem[] {
    const query = this.normalizeText(this.productSearch);
    if (!query) {
      return this.products;
    }

    return this.products.filter((product) =>
      this.normalizeText([product.name, product.sku, product.barcode, product.brand, product.unit].join(' ')).includes(query)
    );
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
        // Use cached session data if profile refresh fails.
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
          this.toastr.error(err?.error?.message || 'Unable to load products.');
        },
      });
  }

  loadCategories(): void {
    if (!this.backend.hasPermission('categories.read') && !this.hasPharmacyAccess()) {
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
    if (!this.backend.hasPermission('stores.read') && !this.hasPharmacyAccess()) {
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

  onStoreChange(): void {
    this.loadProducts();
  }

  openProductModal(): void {
    if (!this.canCreateProducts) {
      this.toastr.error('This role needs products.create to add pharmacy medicines.');
      return;
    }

    const storeId = this.currentStoreId();
    this.editingProductId = '';
    this.editingOriginalStock = '';
    this.productForm = this.getEmptyProductForm();
    this.productForm.storeId = storeId;

    this.productModalOpen = true;
  }

  openEditProduct(product: ProductCatalogItem): void {
    if (!this.canUpdateProducts) {
      this.toastr.error('This role needs products.update to edit pharmacy medicines.');
      return;
    }

    const stock = this.productStock(product);
    this.editingProductId = product._id;
    this.editingOriginalStock = stock;
    this.productForm = {
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      brand: product.brand || '',
      categoryId: product.categoryId || '',
      categoryName: '',
      unit: product.unit || 'tablet',
      strengthValue: product.strengthValue || '',
      strengthUnit: product.strengthUnit || 'mg',
      costPrice: product.costPrice || '0',
      sellingPrice: product.sellingPrice || '0',
      openingStock: stock,
      storeId: product.storeId || this.currentStoreId(),
    };
    this.productModalOpen = true;
  }

  closeProductModal(): void {
    if (this.savingProduct) {
      return;
    }

    const storeId = this.currentStoreId();
    this.productModalOpen = false;
    this.editingProductId = '';
    this.editingOriginalStock = '';
    this.productForm = this.getEmptyProductForm();
    this.productForm.storeId = storeId;
  }

  saveProduct(): void {
    if (this.savingProduct) {
      return;
    }

    const name = this.productForm.name.trim();
    const sku = this.productForm.sku.trim();
    const sellingPrice = Number(this.productForm.sellingPrice);
    const openingStock = Number(this.productForm.openingStock || 0);
    const storeId = this.productForm.storeId || this.currentStoreId();
    const isEditing = Boolean(this.editingProductId);

    if (!name) {
      this.toastr.error('Medicine/product name is required.');
      return;
    }

    if (isEditing && !sku) {
      this.toastr.error('SKU is required when editing a product.');
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      this.toastr.error('Enter a valid selling price.');
      return;
    }

    if (!isEditing && !storeId) {
      this.toastr.error('No pharmacy store is assigned. Login again or assign a store to this pharmacy user.');
      return;
    }

    if (!isEditing && (!Number.isInteger(openingStock) || openingStock < 1)) {
      this.toastr.error('Opening stock must be at least 1 to add this product to the store.');
      return;
    }

    if (isEditing && (!Number.isInteger(openingStock) || openingStock < 0)) {
      this.toastr.error('Stock quantity must be 0 or greater.');
      return;
    }

    if (isEditing && !storeId) {
      this.toastr.error('No store is available for stock update.');
      return;
    }

    if (isEditing && this.hasStockChanged(openingStock) && !this.canAdjustInventory) {
      this.toastr.error('This role needs inventory.adjust to update stock quantity.');
      return;
    }

    this.savingProduct = true;
    const strengthDescription = [
      this.productForm.strengthValue.trim(),
      this.productForm.strengthUnit,
    ]
      .filter(Boolean)
      .join(' ');

    this.resolveProductCategoryId(!isEditing)
      .pipe(
        switchMap((categoryId) => {
          const payload = {
            ...(categoryId ? { categoryId } : {}),
            name,
            sku: sku || this.generateSku(name),
            barcode: this.productForm.barcode.trim() || undefined,
            brand: this.productForm.brand.trim() || undefined,
            unit: this.productForm.unit || 'pcs',
            strengthValue: this.productForm.strengthValue.trim() || undefined,
            strengthUnit: this.productForm.strengthUnit || undefined,
            description: strengthDescription || undefined,
            costPrice: this.productForm.costPrice || '0',
            sellingPrice: this.productForm.sellingPrice || '0',
            taxRate: '0',
            isActive: true,
          };

          return isEditing
            ? this.backend.updateProduct(this.editingProductId, payload)
            : this.backend.createProduct(payload);
        }),
        switchMap((response) => {
          if (!isEditing) {
            return this.setProductStock(
              response.data,
              storeId,
              openingStock,
              'OPENING_STOCK',
              'Opening stock from Mooli product management'
            );
          }

          return this.hasStockChanged(openingStock)
            ? this.setProductStock(
                response.data,
                storeId,
                openingStock,
                'MANUAL_ADJUSTMENT',
                'Stock update from Mooli product management'
              )
            : of(response.data);
        }),
        finalize(() => (this.savingProduct = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success(isEditing ? 'Medicine/product and stock updated.' : 'Medicine/product added to pharmacy store.');
          this.productModalOpen = false;
          this.editingProductId = '';
          this.editingOriginalStock = '';
          this.productForm = this.getEmptyProductForm();
          this.productForm.storeId = storeId;
          this.loadProducts();
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || err?.message || 'Unable to add medicine/product.');
        },
      });
  }

  deleteProduct(product: ProductCatalogItem): void {
    if (!this.canDeleteProducts) {
      this.toastr.error('This role needs products.delete to remove pharmacy medicines.');
      return;
    }

    const confirmed = window.confirm(`Delete ${product.name} from product management?`);
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

  productStrength(product: ProductCatalogItem): string {
    return [product.strengthValue, product.strengthUnit].filter(Boolean).join(' ') || '-';
  }

  productStock(product: ProductCatalogItem): string {
    return String(product.availableQuantity ?? product.stockQuantity ?? '0');
  }

  currentStoreId(): string {
    const user = this.getStoredUser();
    return user?.storeId || this.productForm.storeId || this.stores[0]?._id || '';
  }

  private resolveProductCategoryId(required: boolean): Observable<string> {
    if (this.productForm.categoryId) {
      return of(this.productForm.categoryId);
    }

    const categoryName = this.productForm.categoryName.trim();
    if (!required && !categoryName) {
      return of('');
    }

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

  private setProductStock(
    product: ProductCatalogItem,
    storeId: string,
    quantity: number,
    reason: 'OPENING_STOCK' | 'MANUAL_ADJUSTMENT',
    note: string
  ): Observable<ProductCatalogItem> {
    if (!Number.isFinite(quantity) || quantity < 0) {
      return of(product);
    }

    if (!this.canAdjustInventory) {
      this.toastr.warning('Product saved, but this role needs inventory.adjust to set stock.');
      return of(product);
    }

    return this.backend
      .adjustInventory({
        productId: product._id,
        locationType: 'store',
        locationId: storeId,
        adjustmentType: 'SET',
        quantity: String(Math.floor(quantity)),
        reason,
        note,
      })
      .pipe(map(() => product));
  }

  private hasStockChanged(nextStock: number): boolean {
    return String(Math.floor(nextStock)) !== String(this.editingOriginalStock || '0');
  }

  private hasPharmacyAccess(): boolean {
    const user = this.getStoredUser();
    const roleName = String(localStorage.getItem('role') || user?.role?.name || '')
      .trim()
      .replace(/[\s_-]/g, '')
      .toLowerCase();

    return this.backend.hasPermission('products.read') || roleName.includes('pharmacy');
  }

  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }

  private getEmptyProductForm(): ProductForm {
    return {
      name: '',
      sku: '',
      barcode: '',
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
    };
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private generateSku(name: string): string {
    const prefix = this.generateCode(name).slice(0, 18) || 'MED';
    const suffix = Date.now().toString(36).slice(-6).toUpperCase();
    return `${prefix}-${suffix}`;
  }

  private generateCode(value: string): string {
    return String(value || 'MED')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'MED';
  }
}
