import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { readStoredPermissions } from '../../auth/access-control';
import { AuditLog, Hospital, User } from '../../../shared/models/hospital.model';

const MODULE_OPTIONS = [
  { value: '', label: 'All modules' },
  { value: 'bills', label: 'Bills' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'prescriptions', label: 'Prescriptions' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'encounters', label: 'Encounters' },
  { value: 'ledger', label: 'Ledger / Payments' },
  { value: 'room_allotments', label: 'Room Allotments' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'BILL_CREATED', label: 'Bill created' },
  { value: 'BILL_PAYMENT_UPDATED', label: 'Bill payment updated' },
  { value: 'DISCOUNT_APPLIED', label: 'Discount applied' },
  { value: 'LAB_TEST_CANCELLED', label: 'Lab test cancelled' },
  { value: 'LAB_REPORT_VERIFIED', label: 'Lab report verified' },
  { value: 'PRESCRIPTION_CREATED', label: 'Prescription created' },
  { value: 'PRESCRIPTION_UPDATED', label: 'Prescription updated' },
  { value: 'PRESCRIPTION_DELETED', label: 'Prescription deleted' },
  { value: 'APPOINTMENT_CREATED', label: 'Appointment created' },
  { value: 'APPOINTMENT_UPDATED', label: 'Appointment updated' },
  { value: 'APPOINTMENT_STATUS_UPDATED', label: 'Appointment status updated' },
  { value: 'APPOINTMENT_DELETED', label: 'Appointment deleted' },
  { value: 'PATIENT_DISCHARGED', label: 'Patient discharged' },
  { value: 'LEDGER_ITEM_CANCELLED', label: 'Ledger item cancelled' },
  { value: 'LEDGER_PAYMENT_RECORDED', label: 'Payment recorded' },
  { value: 'LEDGER_PAYMENT_DELETED', label: 'Payment deleted' },
];

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, JsonPipe],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
})
export class AuditLogsComponent implements OnInit {
  readonly moduleOptions = MODULE_OPTIONS;
  readonly actionOptions = ACTION_OPTIONS;
  readonly pageSize = 15;

  logs: AuditLog[] = [];
  users: User[] = [];
  hospitals: Hospital[] = [];
  loading = false;
  detailLoading = false;
  detailOpen = false;
  selectedLog: AuditLog | null = null;

  moduleFilter = '';
  actionFilter = '';
  userIdFilter = '';
  hospitalIdFilter = '';
  fromDate = '';
  toDate = '';
  page = 1;
  totalPages = 1;

  canFilterByHospital = false;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const permissions = readStoredPermissions();
    this.canFilterByHospital = permissions.includes('*');
    this.setDefaultDateRange();
    this.loadHospitals();
    this.loadUsers();
    this.loadLogs();
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);
    this.toDate = this.formatDateInput(today);
    this.fromDate = this.formatDateInput(from);
  }

  private formatDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  loadHospitals(): void {
    if (!this.canFilterByHospital) {
      return;
    }

    this.backend.getHospitals({ limit: 100 }).subscribe({
      next: (result) => {
        this.hospitals = result.items || [];
      },
      error: () => {
        this.hospitals = [];
      },
    });
  }

  loadUsers(): void {
    this.backend.getUsers({ limit: 200 }).subscribe({
      next: (users) => {
        this.users = users || [];
      },
      error: () => {
        this.users = [];
      },
    });
  }

  loadLogs(page = 1): void {
    this.loading = true;
    this.page = page;

    this.backend
      .getAuditLogs({
        page,
        limit: this.pageSize,
        module: this.moduleFilter || undefined,
        action: this.actionFilter || undefined,
        userId: this.userIdFilter || undefined,
        hospitalId: this.canFilterByHospital ? this.hospitalIdFilter || undefined : undefined,
        fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
        toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.logs = result.items || [];
          this.totalPages = result.pagination?.totalPages || 1;
        },
        error: (err) => {
          this.logs = [];
          this.toastr.error(err?.error?.message || 'Audit logs load nahi ho sake');
        },
      });
  }

  applyFilters(): void {
    this.loadLogs(1);
  }

  resetFilters(): void {
    this.moduleFilter = '';
    this.actionFilter = '';
    this.userIdFilter = '';
    this.hospitalIdFilter = '';
    this.setDefaultDateRange();
    this.loadLogs(1);
  }

  userName(log: AuditLog): string {
    return log.user?.name || this.users.find((user) => user._id === log.userId)?.name || log.userId || '—';
  }

  hospitalName(log: AuditLog): string {
    return log.hospital?.name || this.hospitals.find((hospital) => hospital._id === log.hospitalId)?.name || '—';
  }

  actionLabel(action: string): string {
    return this.actionOptions.find((option) => option.value === action)?.label || action;
  }

  moduleLabel(module: string): string {
    return this.moduleOptions.find((option) => option.value === module)?.label || module || '—';
  }

  actionBadgeClass(action: string): string {
    const normalized = String(action || '').toUpperCase();

    if (normalized.includes('DELETE') || normalized.includes('CANCEL')) {
      return 'badge-delete';
    }

    if (normalized.includes('DISCOUNT')) {
      return 'badge-discount';
    }

    if (normalized.includes('DISCHARGED')) {
      return 'badge-discharge';
    }

    if (normalized.includes('CREATED') || normalized.includes('RECORDED') || normalized.includes('VERIFIED')) {
      return 'badge-create';
    }

    if (normalized.includes('UPDATED') || normalized.includes('EDIT')) {
      return 'badge-update';
    }

    return 'badge-default';
  }

  openDetail(log: AuditLog): void {
    this.detailOpen = true;
    this.detailLoading = true;
    this.selectedLog = null;

    this.backend
      .getAuditLogById(log._id)
      .pipe(finalize(() => (this.detailLoading = false)))
      .subscribe({
        next: (detail) => {
          this.selectedLog = detail;
        },
        error: (err) => {
          this.detailOpen = false;
          this.toastr.error(err?.error?.message || 'Audit log detail load nahi ho saka');
        },
      });
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selectedLog = null;
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) {
      return;
    }

    this.loadLogs(nextPage);
  }
}
