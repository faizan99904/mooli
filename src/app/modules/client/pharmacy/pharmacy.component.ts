import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import {
  Patient,
  Prescription,
  ProductCatalogItem,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy.component.html',
  styleUrl: './pharmacy.component.scss',
})
export class PharmacyComponent implements OnInit {
  prescriptions: Prescription[] = [];
  products: ProductCatalogItem[] = [];
  patients: Patient[] = [];
  selectedPatientId = '';
  loading = false;
  productsLoading = false;
  page = 1;
  limit = 10;
  totalPages = 0;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedPatientId = params.get('patientId') || '';
      this.page = 1;
      this.loadPrescriptions();
    });

    this.loadPatients();
    this.loadProducts();
  }

  get canViewProducts(): boolean {
    return this.backend.hasPermission('products.read');
  }

  loadPatients(): void {
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.patients = result.items),
      error: () => (this.patients = []),
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
          this.prescriptions = result.items;
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
      .getProducts({ limit: 100, isActive: true })
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

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  getMedicineMatches(medicineName: string): ProductCatalogItem[] {
    const normalizedMedicine = this.normalizeText(medicineName);
    if (!normalizedMedicine) {
      return [];
    }

    return this.products
      .filter((product) => {
        const haystack = this.normalizeText(
          [product.name, product.sku, product.barcode, product.brand].join(' ')
        );
        return (
          haystack.includes(normalizedMedicine) ||
          normalizedMedicine.includes(this.normalizeText(product.name))
        );
      })
      .slice(0, 3);
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPrescriptions();
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
