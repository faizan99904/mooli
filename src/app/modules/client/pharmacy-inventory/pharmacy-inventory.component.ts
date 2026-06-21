import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { BackendService } from '../../../core/services/backend.service';
import { ProductCatalogItem, Store } from '../../../shared/models/hospital.model';
import { formatCurrency, normalizeText, readAssignedStoreId } from '../pharmacy-admin.utils';

@Component({
  selector: 'app-pharmacy-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-inventory.component.html',
  styleUrl: './pharmacy-inventory.component.scss',
})
export class PharmacyInventoryComponent implements OnInit {
  stores: Store[] = [];
  products: ProductCatalogItem[] = [];
  filteredProducts: ProductCatalogItem[] = [];
  loading = false;
  search = '';
  storeId = readAssignedStoreId();
  lowStockOnly = false;

  constructor(private backend: BackendService) {}

  ngOnInit(): void {
    this.loadStores();
    this.loadInventory();
  }

  get totalUnits(): number {
    return this.filteredProducts.reduce((sum, product) => sum + this.qty(product), 0);
  }

  get totalRetailValue(): number {
    return this.filteredProducts.reduce((sum, product) => sum + this.qty(product) * this.price(product), 0);
  }

  get totalCostValue(): number {
    return this.filteredProducts.reduce((sum, product) => sum + this.qty(product) * this.cost(product), 0);
  }

  get lowStockCount(): number {
    return this.filteredProducts.filter((product) => this.qty(product) <= this.reorder(product)).length;
  }

  loadStores(): void {
    if (!this.backend.hasPermission('stores.read')) {
      return;
    }

    this.backend.getStores({ limit: 100, isActive: true }).subscribe({
      next: (result) => (this.stores = result.items),
      error: () => (this.stores = []),
    });
  }

  loadInventory(): void {
    this.loading = true;
    this.backend.getProducts({
      limit: 200,
      isActive: true,
      storeId: this.storeId || undefined,
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.products = result.items;
          this.applyFilters();
        },
        error: () => {
          this.products = [];
          this.filteredProducts = [];
        },
      });
  }

  applyFilters(): void {
    const query = normalizeText(this.search);
    this.filteredProducts = this.products.filter((product) => {
      const matchesSearch =
        !query ||
        normalizeText([
          product.name,
          product.sku,
          product.barcode,
          product.batchNumber,
          product.brand,
        ].join(' ')).includes(query);
      const matchesStock = !this.lowStockOnly || this.qty(product) <= this.reorder(product);
      return matchesSearch && matchesStock;
    });
  }

  qty(product: ProductCatalogItem): number {
    return Number(product.availableQuantity ?? product.stockQuantity ?? 0) || 0;
  }

  reorder(product: ProductCatalogItem): number {
    return Number(product.reorderLevel ?? 0) || 0;
  }

  price(product: ProductCatalogItem): number {
    return Number(product.sellingPrice ?? 0) || 0;
  }

  cost(product: ProductCatalogItem): number {
    return Number(product.costPrice ?? 0) || 0;
  }

  currency(value: number | string | null | undefined): string {
    return formatCurrency(value);
  }
}
