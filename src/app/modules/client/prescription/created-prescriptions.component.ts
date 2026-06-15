import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { MooliOfflineService } from '../../../core/services/mooli-offline.service';
import { Doctor, Patient, Prescription } from '../../../shared/models/hospital.model';

type PrescriptionDateGroup = {
  dateKey: string;
  dateLabel: string;
  items: Prescription[];
};

@Component({
  selector: 'app-created-prescriptions',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './created-prescriptions.component.html',
  styleUrl: './created-prescriptions.component.scss',
})
export class CreatedPrescriptionsComponent implements OnInit {
  prescriptions: Prescription[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  historyGroups: PrescriptionDateGroup[] = [];
  loading = false;
  readonly pageSize = 10;
  page = 1;
  totalPages = 0;
  historySearch = '';
  historyDateFrom = '';
  historyDateTo = '';
  currentUserId: string | null = null;
  currentRole = '';
  routePatientId = '';
  private listRequestId = 0;

  constructor(
    private backend: BackendService,
    private offline: MooliOfflineService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.historyDateFrom = this.defaultHistoryDateFrom();
    this.historyDateTo = this.todayValue();
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as { _id?: string } | null;
    this.currentUserId = currentUser?._id || null;
    this.currentRole = String(localStorage.getItem('role') || '');

    this.route.queryParamMap.subscribe((params) => {
      this.routePatientId = params.get('patientId') || '';
      this.page = 1;
      this.loadPrescriptions();
    });

    this.loadLookups();
  }

  get canUpdatePrescriptions(): boolean {
    return this.backend.hasPermission('prescriptions.update');
  }

  loadLookups(): void {
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.patients = result.items;
      },
      error: () => {
        this.patients = [];
      },
    });

    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
      },
      error: () => {
        this.doctors = [];
      },
    });
  }

  loadPrescriptions(): void {
    const requestId = ++this.listRequestId;
    this.loading = true;

    const params: Record<string, unknown> = {
      page: this.page,
      limit: this.pageSize,
      doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
    };

    const search = this.historySearch.trim();
    if (search) {
      params['search'] = search;
    }

    if (this.historyDateFrom) {
      params['dateFrom'] = this.historyDateFrom;
    }

    if (this.historyDateTo) {
      params['dateTo'] = this.historyDateTo;
    }

    if (this.routePatientId) {
      params['patientId'] = this.routePatientId;
    }

    this.backend
      .getPrescriptions(params)
      .pipe(
        finalize(() => {
          if (requestId === this.listRequestId) {
            this.loading = false;
          }
        })
      )
      .subscribe({
        next: (result) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          void this.offline.cacheValue(this.prescriptionsCacheKey(), {
            items: result.items,
            totalPages: result.pagination.totalPages,
          });
          this.prescriptions = result.items;
          this.totalPages = result.pagination.totalPages;
          this.rebuildHistoryGroups();
        },
        error: (err) => {
          if (requestId !== this.listRequestId) {
            return;
          }

          void this.loadCachedPrescriptions(err);
        },
      });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPrescriptions();
  }

  applyHistoryFilters(): void {
    this.page = 1;
    this.loadPrescriptions();
  }

  clearHistoryFilters(): void {
    this.historySearch = '';
    this.historyDateFrom = this.defaultHistoryDateFrom();
    this.historyDateTo = this.todayValue();
    this.page = 1;
    this.loadPrescriptions();
  }

  historyHasCustomFilters(): boolean {
    return Boolean(
      this.historySearch.trim() ||
        this.historyDateFrom !== this.defaultHistoryDateFrom() ||
        this.historyDateTo !== this.todayValue()
    );
  }

  openEdit(prescription: Prescription): void {
    if (!this.canUpdatePrescriptions) {
      return;
    }

    void this.router.navigate(['/prescriptions'], {
      queryParams: {
        prescriptionId: prescription._id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        appointmentId: prescription.appointmentId || undefined,
        mode: 'edit',
      },
    });
  }

  openView(prescription: Prescription): void {
    void this.router.navigate(['/prescriptions'], {
      queryParams: {
        prescriptionId: prescription._id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        appointmentId: prescription.appointmentId || undefined,
        mode: 'view',
      },
    });
  }

  trackHistoryGroup(_index: number, group: { dateKey: string }): string {
    return group.dateKey;
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  doctorName(doctor?: Doctor | null): string {
    return doctor?.user?.name || doctor?.specialization || '-';
  }

  initials(value?: string | null): string {
    const words = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return words.length
      ? words
          .slice(0, 2)
          .map((word) => word[0])
          .join('')
          .toUpperCase()
      : 'NA';
  }

  prescriptionPatientName(prescription: Prescription): string {
    const patient = prescription.patient || this.patients.find((item) => item._id === prescription.patientId);
    return this.patientName(patient || null);
  }

  prescriptionDoctorName(prescription: Prescription): string {
    if (prescription.doctor?.name) {
      return prescription.doctor.name;
    }

    const doctor = this.doctors.find((item) => item.userId === prescription.doctorId);
    return this.doctorName(doctor);
  }

  prescriptionAppointmentNo(prescription: Prescription): string {
    return prescription.appointment?.appointmentNo || '';
  }

  prescriptionDate(prescription: Prescription): string {
    return this.shortDate(prescription.createdAt || prescription.followUpDate || new Date());
  }

  prescriptionMedicineCount(prescription: Prescription): number {
    return prescription.medicines?.length || 0;
  }

  prescriptionIvFluidCount(prescription: Prescription): number {
    return (prescription.ivFluids || []).filter((fluid) => String(fluid.name || '').trim()).length;
  }

  prescriptionIvFluidSummary(prescription: Prescription): string {
    return (prescription.ivFluids || [])
      .map((fluid) => String(fluid.name || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  private async loadCachedPrescriptions(error: unknown): Promise<void> {
    const cached = await this.offline.readCachedValue<{ items: Prescription[]; totalPages: number }>(
      this.prescriptionsCacheKey(),
      { items: [], totalPages: 0 }
    );
    this.prescriptions = cached.items;
    this.totalPages = cached.totalPages;
    this.rebuildHistoryGroups();

    if (!this.offline.shouldQueue(error) && cached.items.length === 0) {
      this.toastr.error((error as { error?: { message?: string } })?.error?.message || 'Something went wrong');
    }
  }

  private rebuildHistoryGroups(): void {
    const groups = new Map<string, Prescription[]>();

    this.prescriptions.forEach((prescription) => {
      const dateKey = this.prescriptionDateKey(prescription);
      const bucket = groups.get(dateKey) || [];
      bucket.push(prescription);
      groups.set(dateKey, bucket);
    });

    this.historyGroups = Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      dateLabel: this.formatHistoryDateLabel(dateKey),
      items,
    }));
  }

  private prescriptionDateKey(prescription: Prescription): string {
    const createdAt = prescription.createdAt ? new Date(prescription.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return 'unknown';
    }

    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');
    const day = String(createdAt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatHistoryDateLabel(dateKey: string): string {
    if (dateKey === 'unknown') {
      return 'Unknown Date';
    }

    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateKey;
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private shortDate(value: string | Date): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private prescriptionsCacheKey(): string {
    return this.offline.cacheKey(
      'created-prescriptions',
      this.page,
      this.pageSize,
      this.historySearch.trim() || 'all',
      this.historyDateFrom || 'from',
      this.historyDateTo || 'to',
      this.isDoctorUser() ? this.currentUserId || 'doctor' : 'all'
    );
  }

  private todayValue(): string {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private defaultHistoryDateFrom(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return this.dateOnly(date);
  }

  private dateOnly(value: Date): string {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private isDoctorUser(): boolean {
    return this.currentRole.trim().replace(/[\s_-]/g, '').toLowerCase() === 'doctor';
  }
}
