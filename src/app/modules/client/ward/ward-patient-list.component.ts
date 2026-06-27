import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  PatientStatus,
  PatientStatusTab,
  WardPatient,
  WardPatientKpi,
  WardPatientListFilters,
} from './ward-patient-list.models';
import { WARD_PATIENT_SHIFT_OPTIONS } from './ward-patient-list.mock';
import { WardDataService } from './services/ward-data.service';
import { getWardOptionsFromRooms, mapAllotmentToWardPatient } from './services/ward-api.mapper';

@Component({
  selector: 'app-ward-patient-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './ward-patient-list.component.html',
  styleUrl: './ward-patient-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardPatientListComponent implements OnInit, OnDestroy {
  loading = false;
  patients: WardPatient[] = [];
  wardPatientsList: WardPatient[] = [];
  filteredPatientsList: WardPatient[] = [];
  paginatedPatientsList: WardPatient[] = [];
  kpiCardsList: WardPatientKpi[] = [];
  doctorOptionsList: string[] = [];
  nurseOptionsList: string[] = [];
  roomOptionsList: string[] = [];
  pageNumbersList: number[] = [];

  openMenuAdmissionId: string | null = null;
  previewPatient: WardPatient | null = null;
  isMobileView = false;
  pageSize = 10;
  currentPage = 1;

  wardOptions: string[] = [];
  readonly shiftOptions = WARD_PATIENT_SHIFT_OPTIONS;
  readonly statusTabs: Array<{ key: PatientStatusTab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'stable', label: 'Stable' },
    { key: 'watch', label: 'Watch' },
    { key: 'critical', label: 'Critical' },
    { key: 'dischargePlanned', label: 'Discharge Planned' },
  ];

  filters: WardPatientListFilters = {
    ward: '',
    date: new Date().toISOString().slice(0, 10),
    shift: 'Day Shift',
    statusTab: 'all',
    search: '',
    doctor: '',
    nurse: '',
    room: '',
    unassignedNurseOnly: false,
  };

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private wardData: WardDataService
  ) {}

  ngOnInit(): void {
    this.syncViewportMode();
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.closePreview();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportMode();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openMenuAdmissionId) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.table-actions__menu')) {
      return;
    }

    this.openMenuAdmissionId = null;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.previewPatient) {
      this.closePreview();
    }

    if (this.openMenuAdmissionId) {
      this.openMenuAdmissionId = null;
      this.cdr.markForCheck();
    }
  }

  loadPatients(): void {
    this.loading = true;
    this.wardData.loadClinicalBundle().subscribe({
      next: (bundle) => {
        this.wardOptions = getWardOptionsFromRooms(bundle.rooms, bundle.hospitalWards);
        const roomById = new Map(bundle.rooms.map((room) => [String(room._id), room]));

        this.patients = bundle.allotments
          .filter((allotment) => allotment.status === 'admitted')
          .map((allotment) => {
            const room = roomById.get(String(allotment.roomId)) || allotment.room || null;
            return {
              ...allotment,
              room,
            };
          })
          .map((allotment) =>
            mapAllotmentToWardPatient(
              allotment,
              bundle.doctors,
              bundle.history,
              bundle.prescriptions,
              bundle.encounters,
              bundle.hospitalWards
            )
          );
        this.currentPage = 1;
        this.loading = false;
        this.recomputeViewState();
      },
      error: () => {
        this.patients = [];
        this.loading = false;
        this.toastr.error('Failed to load ward patients.', 'Patient List');
        this.recomputeViewState();
      },
    });
  }

  refresh(): void {
    this.loadPatients();
    this.toastr.success('Patient list refreshed.', 'Ward Patients');
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPatientsList.length / this.pageSize));
  }

  get paginationStart(): number {
    if (!this.filteredPatientsList.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredPatientsList.length);
  }

  get selectedWardLabel(): string {
    return this.filters.ward || 'All Wards';
  }

  statusTabCount(tab: PatientStatusTab): number {
    if (tab === 'all') {
      return this.wardPatientsList.length;
    }
    return this.wardPatientsList.filter((patient) => patient.status === tab).length;
  }

  setStatusTab(tab: PatientStatusTab): void {
    this.filters.statusTab = tab;
    this.filters.unassignedNurseOnly = false;
    this.currentPage = 1;
    this.recomputeViewState();
  }

  applyKpiFilter(card: WardPatientKpi): void {
    if (card.unassignedOnly) {
      this.filters.statusTab = 'all';
      this.filters.nurse = '';
      this.filters.unassignedNurseOnly = true;
      this.filters.search = '';
      this.currentPage = 1;
      this.recomputeViewState();
      return;
    }

    this.filters.unassignedNurseOnly = false;

    if (card.filterTab) {
      this.setStatusTab(card.filterTab);
    }
  }

  resetFilters(): void {
    this.filters = {
      ward: '',
      date: new Date().toISOString().slice(0, 10),
      shift: 'Day Shift',
      statusTab: 'all',
      search: '',
      doctor: '',
      nurse: '',
      room: '',
      unassignedNurseOnly: false,
    };
    this.currentPage = 1;
    this.recomputeViewState();
  }

  onFilterChange(): void {
    this.filters.unassignedNurseOnly = false;
    this.currentPage = 1;
    this.recomputeViewState();
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
    this.recomputeViewState();
  }

  trackByAdmissionId(_index: number, patient: WardPatient): string {
    return patient.admissionId;
  }

  statusLabel(status: PatientStatus): string {
    const labels: Record<PatientStatus, string> = {
      stable: 'Stable',
      watch: 'Watch',
      critical: 'Critical',
      dischargePlanned: 'Discharge Planned',
      pendingAssignment: 'Pending Assignment',
    };
    return labels[status];
  }

  statusClass(status: PatientStatus): string {
    return `patient-badge--${status}`;
  }

  ageSex(patient: WardPatient): string {
    return `${patient.age} Y / ${patient.sex}`;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${this.formatDate(value)} · 09:30`;
  }

  displayValue(value?: string): string {
    return value?.trim() ? value : '—';
  }

  openPreview(patient: WardPatient, event?: Event): void {
    event?.stopPropagation();
    this.previewPatient = patient;
    this.openMenuAdmissionId = null;
    this.cdr.markForCheck();
  }

  closePreview(): void {
    this.previewPatient = null;
    this.cdr.markForCheck();
  }

  toggleMoreMenu(admissionId: string, event: Event): void {
    event.stopPropagation();
    this.openMenuAdmissionId = this.openMenuAdmissionId === admissionId ? null : admissionId;
    this.cdr.markForCheck();
  }

  isMenuOpen(admissionId: string): boolean {
    return this.openMenuAdmissionId === admissionId;
  }

  viewPatient(patient: WardPatient): void {
    void this.router.navigate(['/ward/patient-detail', patient.admissionId]);
  }

  assignNurse(patient: WardPatient): void {
    void this.router.navigate(['/ward/nurses-staff'], {
      queryParams: { admissionId: patient.admissionId, patientId: patient.patientId },
    });
  }

  transferBed(patient: WardPatient): void {
    void this.router.navigate(['/ward/bed-management'], {
      queryParams: {
        admissionId: patient.admissionId,
        patientId: patient.patientId,
        patientName: patient.patientName,
        wardName: patient.wardName,
        bedNo: patient.bedNo,
      },
    });
  }

  navigateWithAdmission(path: string, patient: WardPatient): void {
    this.openMenuAdmissionId = null;
    void this.router.navigate([path], {
      queryParams: {
        admissionId: patient.admissionId,
        patientId: patient.patientId,
        patientName: patient.patientName,
        wardName: patient.wardName,
      },
    });
  }

  exportCsv(): void {
    const rows = this.filteredPatientsList;
    if (!rows.length) {
      this.toastr.info('No patients to export for current filters.', 'Export');
      return;
    }

    const header = ['Bed', 'Patient', 'MRN', 'Age/Sex', 'Diagnosis', 'Doctor', 'Nurse', 'Admitted On', 'Status'];
    const lines = rows.map((patient) =>
      [
        patient.bedNo,
        patient.patientName,
        patient.mrn,
        this.ageSex(patient),
        patient.diagnosis,
        patient.doctorName,
        patient.nurseName || '',
        this.formatDate(patient.admittedOn),
        this.statusLabel(patient.status),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ward-patients-${this.selectedWardLabel.toLowerCase().replace(/\s+/g, '-')}-${this.filters.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastr.success('Patient list exported.', 'Export');
  }

  private syncViewportMode(): void {
    this.isMobileView = window.innerWidth <= 768;
    this.cdr.markForCheck();
  }

  private recomputeViewState(): void {
    const selectedWard = this.filters.ward.trim().toLowerCase();
    this.wardPatientsList = selectedWard
      ? this.patients.filter((patient) => patient.wardName.trim().toLowerCase() === selectedWard)
      : [...this.patients];

    const search = this.filters.search.trim().toLowerCase();
    this.filteredPatientsList = this.wardPatientsList.filter((patient) => {
      if (this.filters.statusTab !== 'all' && patient.status !== this.filters.statusTab) {
        return false;
      }

      if (this.filters.doctor && patient.doctorName !== this.filters.doctor) {
        return false;
      }

      if (this.filters.nurse && patient.nurseName !== this.filters.nurse) {
        return false;
      }

      if (this.filters.room && patient.roomName !== this.filters.room) {
        return false;
      }

      if (this.filters.unassignedNurseOnly && patient.nurseName) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        patient.patientName,
        patient.bedNo,
        patient.mrn,
        patient.diagnosis,
        patient.doctorName,
        patient.nurseName || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });

    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedPatientsList = this.filteredPatientsList.slice(start, start + this.pageSize);
    this.pageNumbersList = Array.from({ length: this.totalPages }, (_, index) => index + 1);

    const doctors = new Set(this.patients.map((patient) => patient.doctorName));
    this.doctorOptionsList = Array.from(doctors).sort();

    const nurses = new Set(
      this.patients.map((patient) => patient.nurseName).filter((name): name is string => Boolean(name))
    );
    this.nurseOptionsList = Array.from(nurses).sort();

    const rooms = new Set(this.patients.map((patient) => patient.roomName));
    this.roomOptionsList = Array.from(rooms).sort();

    const list = this.wardPatientsList;
    this.kpiCardsList = [
      {
        key: 'total',
        label: 'Total Patients',
        count: list.length,
        icon: 'fa-users',
        tone: 'blue',
        filterTab: 'all',
      },
      {
        key: 'stable',
        label: 'Stable',
        count: list.filter((patient) => patient.status === 'stable').length,
        icon: 'fa-check-circle',
        tone: 'green',
        filterTab: 'stable',
      },
      {
        key: 'watch',
        label: 'Watch',
        count: list.filter((patient) => patient.status === 'watch').length,
        icon: 'fa-exclamation-circle',
        tone: 'orange',
        filterTab: 'watch',
      },
      {
        key: 'critical',
        label: 'Critical',
        count: list.filter((patient) => patient.status === 'critical').length,
        icon: 'fa-heartbeat',
        tone: 'red',
        filterTab: 'critical',
      },
      {
        key: 'discharge',
        label: 'Discharge Planned',
        count: list.filter((patient) => patient.status === 'dischargePlanned').length,
        icon: 'fa-sign-out',
        tone: 'purple',
        filterTab: 'dischargePlanned',
      },
      {
        key: 'unassigned',
        label: 'Unassigned Nurse',
        count: list.filter((patient) => !patient.nurseName).length,
        icon: 'fa-user-times',
        tone: 'amber',
        unassignedOnly: true,
      },
    ];

    this.cdr.markForCheck();
  }
}
