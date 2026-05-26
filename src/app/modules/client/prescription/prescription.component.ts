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

  constructor(
    private fb: FormBuilder,
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
      next: (result) => (this.patients = result.items),
      error: () => (this.patients = []),
    });
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.doctors = result.items),
      error: () => (this.doctors = []),
    });
    this.backend.getAppointments({ limit: 100 }).subscribe({
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
      patientId: value.patientId,
      doctorId: value.doctorId,
      appointmentId: value.appointmentId || undefined,
      medicines: value.medicines,
      advice: value.advice || undefined,
      followUpDate: value.followUpDate || undefined,
    };

    this.saving = true;
    this.backend
      .createPrescription(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.prescriptionForm.reset();
          this.medicines.clear();
          this.addMedicine();
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
