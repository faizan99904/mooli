import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { LabDashboardStats, LabOrder, LabOrderStatus, User } from '../../../shared/models/hospital.model';
import { canEditLabOrder } from './lab-order.utils';

type LabTab = 'all' | LabOrderStatus;

@Component({
  selector: 'app-lab-dashboard',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-dashboard.component.html',
  styleUrl: './lab-dashboard.component.scss',
})
export class LabDashboardComponent implements OnInit {
  orders: LabOrder[] = [];
  stats: LabDashboardStats = {
    pendingOrders: 0,
    sampleCollected: 0,
    resultPending: 0,
    readyToVerify: 0,
    completedToday: 0,
  };
  loading = false;
  search = '';
  activeTab: LabTab = 'all';
  page = 1;
  limit = 10;
  totalPages = 0;
  totalOrders = 0;
  lastLoadError = '';

  readonly tabs: Array<{ key: LabTab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'ordered', label: 'Pending' },
    { key: 'sample_collected', label: 'Sample Collected' },
    { key: 'processing', label: 'Processing' },
    { key: 'result_entered', label: 'Ready to Verify' },
    { key: 'verified', label: 'Verified' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.backend.getLabDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: () => {
        this.stats = {
          pendingOrders: 0,
          sampleCollected: 0,
          resultPending: 0,
          readyToVerify: 0,
          completedToday: 0,
        };
      },
    });
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.lastLoadError = '';
    const params: Record<string, unknown> = {
      page: this.page,
      limit: this.limit,
      search: this.search.trim() || undefined,
      status: this.activeTab === 'all' ? undefined : this.activeTab,
    };

    this.backend
      .getLabOrders(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.orders = Array.isArray(result?.items) ? result.items : [];
          this.totalPages = result?.pagination?.totalPages || 0;
          this.totalOrders = result?.pagination?.total || this.orders.length;
        },
        error: (err) => {
          this.orders = [];
          this.totalPages = 0;
          this.totalOrders = 0;
          this.lastLoadError = err?.error?.message || 'Unable to load lab orders.';
          this.toastr.error(err?.error?.message || 'Unable to load lab orders.');
        },
      });
  }

  setTab(tab: LabTab): void {
    this.activeTab = tab;
    this.page = 1;
    this.loadOrders();
  }

  applySearch(): void {
    this.page = 1;
    this.loadOrders();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadOrders();
  }

  patientName(order: LabOrder): string {
    const patient = order.patient;
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  testsSummary(order: LabOrder): string {
    return (order.items || []).map((item) => item.shortCode || item.testName).join(', ') || '-';
  }

  sourceLabel(source: string): string {
    return source.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  statusClass(status: string): string {
    return `status-${status.replace(/_/g, '-')}`;
  }

  trackByOrderId(index: number, order: LabOrder): string {
    const orderId = String(order?._id || '').trim();
    return orderId || `${order?.orderNo || 'lab-order'}-${index}`;
  }

  openOrder(order: LabOrder, event?: Event): void {
    event?.stopPropagation();
    const orderId = this.orderId(order);
    if (!orderId) {
      this.toastr.error('Unable to open lab order because its ID is missing. Refresh and try again.');
      return;
    }

    void this.router.navigate(['/laboratory/orders', orderId]);
  }

  canEditOrder(order: LabOrder): boolean {
    return canEditLabOrder(order);
  }

  editOrder(order: LabOrder, event: Event): void {
    event.stopPropagation();
    const orderId = this.orderId(order);
    if (!orderId) {
      this.toastr.error('Unable to edit lab order because its ID is missing.');
      return;
    }

    void this.router.navigate(['/laboratory/orders', orderId, 'edit']);
  }

  collectSample(order: LabOrder, event: Event): void {
    event.stopPropagation();
    const orderId = this.orderId(order);
    if (!orderId) {
      this.toastr.error('Unable to collect sample because the lab order ID is missing.');
      return;
    }

    this.backend.collectLabSample(orderId, {}).subscribe({
      next: () => {
        this.toastr.success('Sample marked as collected.');
        this.loadDashboard();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to collect sample.'),
    });
  }

  private orderId(order: LabOrder): string {
    return String(order?._id || '').trim();
  }

  currentHospitalLabel(): string {
    const user = this.currentUser();
    return user?.hospital?.name || user?.hospitalId || 'No hospital selected';
  }

  emptyStateMessage(): string {
    if (this.lastLoadError) {
      return this.lastLoadError;
    }

    const filters = [
      this.activeTab !== 'all' ? `status "${this.statusLabel(this.activeTab)}"` : '',
      this.search.trim() ? `search "${this.search.trim()}"` : '',
    ].filter(Boolean);

    return filters.length
      ? `No lab orders found for ${filters.join(' and ')}.`
      : `No lab orders found for ${this.currentHospitalLabel()}.`;
  }

  private currentUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }
}
