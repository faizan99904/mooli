import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BackendService } from '../../../core/services/backend.service';
import {
  Appointment,
  Doctor,
  Patient,
  Prescription,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-prescription',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prescription.component.html',
  styleUrl: './prescription.component.scss',
})
export class PrescriptionComponent implements OnInit {
  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;

  prescriptions: Prescription[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  prescriptionForm: FormGroup;
  loading = false;
  saving = false;
  page = 1;
  limit = 10;
  totalPages = 0;
  selectedPatientId = '';
  editingId: string | null = null;
  currentHospitalId: string | null = null;
  currentUserId: string | null = null;
  currentRole = '';
  routePatientId = '';
  routeDoctorId = '';
  routeAppointmentId = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {
    this.prescriptionForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      appointmentId: [''],
      medicines: this.fb.array([this.createMedicineGroup()]),
      advice: [''],
      followUpDate: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { _id?: string; hospitalId?: string | null; role?: { name?: string | null } | null }
      | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.currentUserId = currentUser?._id || null;
    this.currentRole = String(localStorage.getItem('role') || currentUser?.role?.name || '');
    this.route.queryParamMap.subscribe((params) => {
      this.routePatientId = params.get('patientId') || '';
      this.routeDoctorId = params.get('doctorId') || '';
      this.routeAppointmentId = params.get('appointmentId') || '';
      this.selectedPatientId = this.routePatientId;
      this.applyRouteDefaults();
      this.page = 1;
      this.loadPrescriptions();
    });
    this.loadLookups();
    this.loadPrescriptions();
  }

  get medicines(): FormArray {
    return this.prescriptionForm.get('medicines') as FormArray;
  }

  createMedicineGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      dosage: [''],
      frequency: [''],
      duration: [''],
      instructions: [''],
    });
  }

  addMedicine(): void {
    this.medicines.push(this.createMedicineGroup());
  }

  removeMedicine(index: number): void {
    if (this.medicines.length > 1) {
      this.medicines.removeAt(index);
    }
  }

  loadLookups(): void {
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.patients = result.items;
        this.ensureDoctorPatientScope();
      },
      error: () => (this.patients = []),
    });
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.doctors = result.items),
      error: () => (this.doctors = []),
    });
    this.backend
      .getAppointments({
        limit: 100,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
      })
      .subscribe({
      next: (result) => (this.appointments = result.items),
      error: () => (this.appointments = []),
    });
  }

  loadPrescriptions(): void {
    this.loading = true;
    this.backend
      .getPrescriptions({
        page: this.page,
        limit: this.limit,
        patientId: this.selectedPatientId,
        doctorId: this.isDoctorUser() ? this.currentUserId || undefined : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.prescriptions = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.prescriptions = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  submitPrescription(): void {
    if (this.prescriptionForm.invalid) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    const value = this.prescriptionForm.value;
    const payload: Record<string, unknown> = {
      hospitalId: this.currentHospitalId || undefined,
      patientId: value.patientId,
      doctorId: value.doctorId,
      appointmentId: value.appointmentId || undefined,
      medicines: value.medicines,
      advice: value.advice || undefined,
      followUpDate: value.followUpDate || undefined,
    };

    this.saving = true;
    const request$ = this.editingId
      ? this.backend.updatePrescription(this.editingId, payload)
      : this.backend.createPrescription(payload);
    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.resetForm();
          this.loadPrescriptions();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
      });
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  deletePrescription(id: string): void {
    if (!confirm('Delete this prescription?')) {
      return;
    }

    this.backend.deletePrescription(id).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.loadPrescriptions();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadPrescriptions();
  }

  editPrescription(prescription: Prescription): void {
    this.editingId = prescription._id;
    this.prescriptionForm.patchValue({
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      appointmentId: prescription.appointmentId || '',
      advice: prescription.advice || '',
      followUpDate: prescription.followUpDate ? String(prescription.followUpDate).slice(0, 10) : '',
    });
    this.medicines.clear();
    (prescription.medicines || []).forEach((medicine) => {
      this.medicines.push(
        this.fb.group({
          name: [medicine.name || '', Validators.required],
          dosage: [medicine.dosage || ''],
          frequency: [medicine.frequency || ''],
          duration: [medicine.duration || ''],
          instructions: [medicine.instructions || ''],
        })
      );
    });
    if (this.medicines.length === 0) {
      this.addMedicine();
    }
  }

  resetForm(): void {
    this.editingId = null;
    this.prescriptionForm.reset();
    this.medicines.clear();
    this.addMedicine();
    this.applyRouteDefaults();
  }

  private applyRouteDefaults(): void {
    if (this.editingId) {
      return;
    }

    this.prescriptionForm.patchValue({
      patientId: this.routePatientId,
      doctorId: this.isDoctorUser() ? this.currentUserId || '' : this.routeDoctorId,
      appointmentId: this.routeAppointmentId,
    });

    if (this.isDoctorUser()) {
      this.prescriptionForm.get('doctorId')?.disable({ emitEvent: false });
    } else {
      this.prescriptionForm.get('doctorId')?.enable({ emitEvent: false });
    }
  }

  private ensureDoctorPatientScope(): void {
    if (!this.isDoctorUser()) {
      return;
    }

    const activePatientId = String(this.prescriptionForm.get('patientId')?.value || '');
    const allowedPatientIds = new Set(this.patients.map((patient) => patient._id));

    if (activePatientId && !allowedPatientIds.has(activePatientId)) {
      this.selectedPatientId = '';
      this.routePatientId = '';
      this.prescriptionForm.patchValue({ patientId: '', appointmentId: '' }, { emitEvent: false });
      this.toastr.warning('Only assigned patients can be prescribed by this doctor.');
    }
  }

  private isDoctorUser(): boolean {
    return this.currentRole.trim().replace(/[\s_-]/g, '').toLowerCase() === 'doctor';
  }

  downloadPDF() {
    const content = this.pdfContent.nativeElement;
    html2canvas(content, { scale: 1.2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = {
        width: pageWidth,
        height: (canvas.height * pageWidth) / canvas.width,
      };

      let position = 0;
      let heightLeft = imgProps.height;
      pdf.addImage(imgData, 'PNG', 0, position, imgProps.width, imgProps.height);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgProps.height;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgProps.width, imgProps.height);
        heightLeft -= pageHeight;
      }

      pdf.save('prescription.pdf');
    });
  }
}
