import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CONFIG } from '../../../../../config';
import { BackendService } from '../../../core/services/backend.service';
import {
  Patient,
  Prescription,
  ProductCatalogItem,
  User,
} from '../../../shared/models/hospital.model';

interface PrintPreviewData {
  patient: Patient;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientNo: string;
  patientAddress: string;
  patientPhone: string;
  doctorName: string;
  doctorQualification: string;
  date: string;
  disease: string;
  vitals: Record<string, string>;
  labTests: Array<{ name: string; category: string }>;
  medicines: Prescription['medicines'];
  followUpDate: string;
}

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy.component.html',
  styleUrl: './pharmacy.component.scss',
})
export class PharmacyComponent implements OnInit {
  @ViewChild('printContent', { static: false }) printContent!: ElementRef;

  prescriptions: Prescription[] = [];
  products: ProductCatalogItem[] = [];
  patients: Patient[] = [];
  selectedPatientId = '';
  loading = false;
  productsLoading = false;
  printPreviewOpen = false;
  printPreviewLoading = false;
  previewPrescription: Prescription | null = null;
  printPreviewData: PrintPreviewData | null = null;
  page = 1;
  limit = 10;
  totalPages = 0;
  private readonly requiredPosPermissions = [
    'sales.create',
    'sales.read',
    'stores.read',
    'customers.read',
    'categories.read',
    'products.read',
    'inventory.read',
    'register_sessions.open',
    'register_sessions.read',
    'register_sessions.close',
  ];

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

  openPharmacyPos(prescription?: Prescription): void {
    const posUrl = this.buildPharmacyPosUrl(prescription);

    if (!posUrl) {
      return;
    }

    window.open(posUrl, '_blank', 'noopener');
  }

  openPrintPreview(prescription: Prescription): void {
    this.previewPrescription = prescription;
    this.printPreviewData = this.buildPrintPreviewData(prescription);
    this.printPreviewOpen = true;
    this.printPreviewLoading = true;

    this.backend
      .getPrescription(prescription._id)
      .pipe(finalize(() => (this.printPreviewLoading = false)))
      .subscribe({
        next: (result) => {
          this.previewPrescription = result;
          this.printPreviewData = this.buildPrintPreviewData(result);
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to load prescription preview.');
        },
      });
  }

  closePrintPreview(): void {
    this.printPreviewOpen = false;
    this.printPreviewLoading = false;
    this.previewPrescription = null;
    this.printPreviewData = null;
  }

  printPrescription(): void {
    if (!this.printContent?.nativeElement) {
      return;
    }

    html2canvas(this.printContent.nativeElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      (pdf as any).autoPrint?.();
      const printUrl = pdf.output('bloburl');
      window.open(printUrl, '_blank');
    });
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private buildPharmacyPosUrl(prescription?: Prescription): string {
    const token = localStorage.getItem('token');

    if (!token) {
      this.toastr.error('Please login again before opening POS.');
      return '';
    }

    if (!this.canOpenPharmacyPos) {
      this.toastr.error(this.pharmacyPosHint);
      return '';
    }

    const currentUser = this.getStoredUser();
    if (!currentUser?.storeId && !this.backend.hasPermission('*')) {
      this.toastr.warning('No store is assigned to this pharmacy user. POS may ask for a store or block checkout.');
    }

    const redirectParams = new URLSearchParams({
      source: 'mooli-pharmacy',
    });

    if (prescription?._id) {
      redirectParams.set('prescriptionId', prescription._id);
    }

    if (prescription?.patientId) {
      redirectParams.set('patientId', prescription.patientId);
    }

    const name = prescription?.patient ? this.patientName(prescription.patient) : '';
    if (name) {
      redirectParams.set('patientName', name);
    }

    const redirect = `/app/pos?${redirectParams.toString()}`;
    const fragment = new URLSearchParams({
      token,
      redirect,
    });
    const baseUrl = CONFIG.external.pharmacyPosUrl.replace(/\/+$/, '');

    return `${baseUrl}/sso#${fragment.toString()}`;
  }

  private hasEffectivePosPermission(permission: string): boolean {
    if (this.backend.hasPermission(permission)) {
      return true;
    }

    return this.hasPharmacyPosBaseAccess() && this.requiredPosPermissions.includes(permission);
  }

  private hasPharmacyPosBaseAccess(): boolean {
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

  private buildPrintPreviewData(prescription: Prescription): PrintPreviewData | null {
    const patient = this.resolvePrintPatient(prescription);
    if (!patient) {
      return null;
    }

    const labTests = (prescription.labTests || [])
      .filter((test) => Boolean(test.name))
      .map((test) => ({
        name: test.name,
        category: test.category || '',
      }));

    return {
      patient,
      patientName: this.patientName(patient),
      patientAge: this.ageLabel(patient),
      patientGender: this.genderShort(patient),
      patientNo: patient.patientNo || '-',
      patientAddress: patient.address || '-',
      patientPhone: patient.phone || '-',
      doctorName: prescription.doctor?.name || '-',
      doctorQualification: 'M.B.B.S., F.C.P.S.',
      date: this.formatPrintDate(prescription.createdAt || new Date()),
      disease: prescription.diagnosis || prescription.chiefComplaint || prescription.history || '-',
      vitals: prescription.vitals || {},
      labTests,
      medicines: prescription.medicines || [],
      followUpDate: this.shortDate(prescription.followUpDate),
    };
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
}
