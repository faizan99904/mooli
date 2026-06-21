import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { MooliOfflineService } from '../../../core/services/mooli-offline.service';
import {
  Doctor,
  Hospital,
  Patient,
  Prescription,
  PrescriptionPrintSettings,
  PrescriptionTemplate,
} from '../../../shared/models/hospital.model';
import { legacyAdmissionOrdersToItems } from './admission-order-data';
import {
  resolvePrintSpecialtyRows,
  resolvePrintSpecialtyTemplate,
  SpecialtyTemplateKey,
} from './prescription-specialty-print';
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
} from './prescription-print-urdu';

type PrescriptionDateGroup = {
  dateKey: string;
  dateLabel: string;
  items: Prescription[];
};

type CreatedPrescriptionPreviewData = {
  template: PrescriptionTemplate;
  patient: Patient;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientNo: string;
  patientPhone: string;
  patientAddress: string;
  doctorName: string;
  doctorNamePlain: string;
  doctorNameUrdu: string;
  doctorQualification: string;
  doctorQualificationUrdu: string;
  doctorTitleEnglish: string;
  doctorTitleUrdu: string;
  hospitalName: string;
  hospitalNameUrdu: string;
  hospitalAddress: string;
  hospitalAddressUrdu: string;
  hospitalLogoUrl: string;
  showHospitalLogo: boolean;
  prescriptionRevisionNote: string;
  prescriptionFollowUpLine: string;
  prescriptionFooterLines: string[];
  date: string;
  prescriptionNo: string;
  disease: string;
  vitals: Record<string, string>;
  vitalRows: Array<{ label: string; value: string }>;
  labTests: Array<{ name: string; category: string }>;
  ivFluids: Array<{ name: string; rate: string; quantity: string; route: string }>;
  medicines: Array<Record<string, unknown>>;
  specialtyTitle: string;
  specialtySection: SpecialtyTemplateKey | '';
  specialtyRows: Array<{ label: string; value: string; wide?: boolean }>;
  followUpDate: string;
  patientNote: string;
  consultation: string;
  admissionOrderLines: string[];
};

type DoseSlot = 'morning' | 'noon' | 'evening' | 'night';

@Component({
  selector: 'app-created-prescriptions',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './created-prescriptions.component.html',
  styleUrl: './created-prescriptions.component.scss',
})
export class CreatedPrescriptionsComponent implements OnInit {
  @ViewChild('printContent', { static: false }) printContent?: ElementRef<HTMLElement>;

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
  currentHospitalId: string | null = null;
  currentHospital: Hospital | null = null;
  currentDoctorProfile: Doctor | null = null;
  routePatientId = '';
  viewModalOpen = false;
  viewLoading = false;
  viewPrescription: Prescription | null = null;
  viewPreviewData: CreatedPrescriptionPreviewData | null = null;
  readonly prescriptionTemplates: Array<{ id: PrescriptionTemplate; name: string }> = [
    { id: 'classic', name: 'Classic' },
    { id: 'clinical-blue', name: 'Clinical Blue' },
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
  private listRequestId = 0;
  private viewRequestId = 0;

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
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { _id?: string; hospitalId?: string | null; hospital?: Hospital | null }
      | null;
    this.currentUserId = currentUser?._id || null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.currentHospital = currentUser?.hospital || null;
    this.currentRole = String(localStorage.getItem('role') || '');
    this.refreshCurrentHospital();

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

  get viewTemplateLabel(): string {
    return (
      this.prescriptionTemplates.find((template) => template.id === this.viewPreviewData?.template)?.name ||
      'Classic'
    );
  }

  get printPreviewLoading(): boolean {
    return this.viewLoading;
  }

  get printPreviewData(): CreatedPrescriptionPreviewData | null {
    return this.viewPreviewData;
  }

  get printPreviewTemplate(): PrescriptionTemplate {
    return this.viewPreviewData?.template || 'classic';
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

    if (this.isDoctorUser()) {
      this.backend.getMyDoctorProfile().subscribe({
        next: (doctor) => {
          this.currentDoctorProfile = doctor;
          this.upsertViewDoctor(doctor);
          void this.offline.cacheValue(this.doctorsCacheKey(), this.doctors);
          this.refreshOpenViewPreview();
        },
        error: () => {
          void this.loadCachedDoctors();
        },
      });
    }

    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
        if (this.currentDoctorProfile) {
          this.upsertViewDoctor(this.currentDoctorProfile);
        }
        void this.offline.cacheValue(this.doctorsCacheKey(), this.doctors);
        this.prescriptions = this.prescriptions.map((item) => ({
          ...item,
          prescriptionTemplate: this.resolvePrescriptionTemplate(item),
        }));
        this.rebuildHistoryGroups();
        this.refreshOpenViewPreview();
      },
      error: () => {
        void this.loadCachedDoctors();
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
          this.prescriptions = result.items.map((item) => ({
            ...item,
            prescriptionTemplate: this.resolvePrescriptionTemplate(item),
          }));
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
    const requestId = ++this.viewRequestId;
    const fallbackTemplate = this.resolvePrescriptionTemplate(prescription);

    this.viewModalOpen = true;
    this.viewLoading = true;
    this.viewPrescription = {
      ...prescription,
      prescriptionTemplate: fallbackTemplate,
    };
    this.viewPreviewData = this.buildViewPreviewData(this.viewPrescription, fallbackTemplate);

    this.backend
      .getPrescription(prescription._id)
      .pipe(
        finalize(() => {
          if (requestId === this.viewRequestId) {
            this.viewLoading = false;
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

          this.viewPrescription = resolvedPrescription;
          this.viewPreviewData = this.buildViewPreviewData(resolvedPrescription, resolvedTemplate);
          this.prescriptions = this.prescriptions.map((item) =>
            item._id === resolvedPrescription._id ? resolvedPrescription : item
          );
          this.rebuildHistoryGroups();
        },
        error: (err) => {
          if (requestId !== this.viewRequestId) {
            return;
          }

          if (!this.viewPreviewData) {
            this.viewModalOpen = false;
            this.toastr.error(err?.error?.message || 'Unable to load prescription view.');
          } else {
            this.toastr.info('Showing cached prescription view.');
          }
        },
      });
  }

  closeViewModal(): void {
    this.viewRequestId += 1;
    this.viewModalOpen = false;
    this.viewLoading = false;
    this.viewPrescription = null;
    this.viewPreviewData = null;
  }

  printCreatedPrescription(): void {
    const content = this.printContent?.nativeElement?.outerHTML;
    if (!content) {
      return;
    }

    this.openPrescriptionPrintWindow(content);
  }

  slotDose(
    medicine: Record<string, unknown> | null | undefined,
    slot: DoseSlot
  ): string {
    const doseKey = `${slot}Dose` as 'morningDose' | 'noonDose' | 'eveningDose' | 'nightDose';
    const dose = String(medicine?.[doseKey] || '').trim();
    if (dose) {
      return dose;
    }

    return medicine?.[slot] ? '1' : '';
  }

  printMedicineDensityClass(medicineCount: number): string {
    if (medicineCount >= 18) {
      return 'print-medicine-density-compact';
    }

    if (medicineCount >= 12) {
      return 'print-medicine-density-tight';
    }

    return 'print-medicine-density-normal';
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

    const doctor = this.resolveViewDoctor(prescription);
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
    this.prescriptions = cached.items.map((item) => ({
      ...item,
      prescriptionTemplate: this.resolvePrescriptionTemplate(item),
    }));
    this.totalPages = cached.totalPages;
    this.rebuildHistoryGroups();

    if (!this.offline.shouldQueue(error) && cached.items.length === 0) {
      this.toastr.error((error as { error?: { message?: string } })?.error?.message || 'Something went wrong');
    }
  }

  private async loadCachedDoctors(): Promise<void> {
    this.doctors = await this.offline.readCachedValue<Doctor[]>(this.doctorsCacheKey(), []);
    if (this.isDoctorUser()) {
      this.currentDoctorProfile =
        this.doctors.find((doctor) => String(doctor.userId || '') === String(this.currentUserId || '')) ||
        this.currentDoctorProfile;
    }
    this.prescriptions = this.prescriptions.map((item) => ({
      ...item,
      prescriptionTemplate: this.resolvePrescriptionTemplate(item),
    }));
    this.rebuildHistoryGroups();
    this.refreshOpenViewPreview();
  }

  private upsertViewDoctor(doctor: Doctor | null | undefined): void {
    if (!doctor?._id) {
      return;
    }

    const index = this.doctors.findIndex(
      (item) => item._id === doctor._id || item.userId === doctor.userId
    );

    if (index >= 0) {
      this.doctors = this.doctors.map((item, itemIndex) => (itemIndex === index ? doctor : item));
      return;
    }

    this.doctors = [...this.doctors, doctor];
  }

  private buildViewPreviewData(
    prescription: Prescription,
    fallbackTemplate?: PrescriptionTemplate
  ): CreatedPrescriptionPreviewData {
    const patient = this.resolveViewPatient(prescription);
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
      ...this.resolveViewSpecialtyPreview(prescription, doctor),
      followUpDate: prescription.followUpDate ? this.shortDate(prescription.followUpDate) : '-',
      patientNote: String(prescription.advice || '').trim(),
      consultation: String(prescription.admissionOrders?.consultation || '').trim(),
      admissionOrderLines: this.resolvePrintAdmissionOrderLines(prescription),
    };
  }

  private resolveViewSpecialtyPreview(
    prescription: Prescription,
    doctor: Doctor | null
  ): Pick<CreatedPrescriptionPreviewData, 'specialtyTitle' | 'specialtySection' | 'specialtyRows'> {
    const source = {
      specialtySection: prescription.specialtySection,
      specialtyData: prescription.specialtyData,
    };
    const specialtyTemplate = resolvePrintSpecialtyTemplate(source, doctor);

    return {
      specialtyTitle: specialtyTemplate.title,
      specialtySection: specialtyTemplate.key,
      specialtyRows: resolvePrintSpecialtyRows(source, specialtyTemplate),
    };
  }

  private resolveViewPatient(prescription: Prescription): Patient {
    const patient =
      prescription.patient ||
      this.patients.find((item) => item._id === prescription.patientId) ||
      null;

    if (patient) {
      return patient;
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
    const ids = [
      prescription?.doctorId,
      prescription?.doctor?._id,
      this.isDoctorUser() ? this.currentUserId : null,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const matchedDoctor =
      this.doctors.find((doctor) => {
        const doctorProfileId = String(doctor._id || '').trim();
        const doctorUserId = String(doctor.userId || '').trim();
        return ids.includes(doctorProfileId) || ids.includes(doctorUserId);
      }) || null;

    if (matchedDoctor) {
      return matchedDoctor;
    }

    const currentProfileId = String(this.currentDoctorProfile?._id || '').trim();
    const currentProfileUserId = String(this.currentDoctorProfile?.userId || '').trim();
    if (ids.includes(currentProfileId) || ids.includes(currentProfileUserId)) {
      return this.currentDoctorProfile;
    }

    return null;
  }

  private refreshCurrentHospital(): void {
    this.backend.getMe().subscribe({
      next: (user) => {
        this.currentHospitalId = user.hospitalId || this.currentHospitalId;
        this.currentHospital = user.hospital || this.currentHospital;
        this.refreshOpenViewPreview();
      },
      error: () => undefined,
    });
  }

  private refreshOpenViewPreview(): void {
    if (!this.viewPrescription || !this.viewPreviewData) {
      return;
    }

    const template = this.resolvePrescriptionTemplate(this.viewPrescription);
    this.viewPrescription = {
      ...this.viewPrescription,
      prescriptionTemplate: template,
    };
    this.viewPreviewData = this.buildViewPreviewData(this.viewPrescription, template);
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

  private ageLabel(patient?: Patient | null): string {
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

  private genderShort(patient?: Patient | null): string {
    return patient?.gender ? patient.gender.charAt(0).toUpperCase() : '-';
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
      this.toastr.error('Unable to open prescription print view.');
      return;
    }

    const styles = this.collectDocumentStyles();
    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${baseHref}" />
          <title>Prescription Print</title>
          ${styles}
          <style>
            body { background: #ffffff; margin: 0; padding: 0; }
            @page { margin: 0; size: A4; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printDocument.close();
    printWindow.onafterprint = () => iframe.remove();

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 15000);
    }, 300);
  }

  private collectDocumentStyles(): string {
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map((style) => style.outerHTML)
      .join('\n');
    const linkedStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((style) => style.outerHTML)
      .join('\n');

    return `${linkedStyles}\n${inlineStyles}`;
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

  private doctorsCacheKey(): string {
    return this.offline.cacheKey('prescription-doctors');
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
