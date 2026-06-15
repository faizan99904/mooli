import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import {
  Bill,
  Patient,
  PatientHistory,
  Prescription,
} from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-patient-profile',
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.scss',
})
export class PatientProfileComponent implements OnInit {
  patient: Patient | null = null;
  history: PatientHistory[] = [];
  prescriptions: Prescription[] = [];
  bills: Bill[] = [];
  loading = false;
  historyLoading = false;
  prescriptionsLoading = false;
  billsLoading = false;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPatient(id);
    }
  }

  loadPatient(id: string): void {
    this.loading = true;
    this.backend
      .getPatientProfile(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (patient) => {
          this.patient = patient;
          this.loadRelated(id);
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  loadRelated(id: string): void {
    this.historyLoading = true;
    this.backend
      .getPatientHistory(id, { limit: 100 })
      .pipe(finalize(() => (this.historyLoading = false)))
      .subscribe({
        next: (result) => {
          this.history = result.items;
        },
        error: () => {
          this.history = [];
        },
      });

    this.prescriptionsLoading = true;
    this.backend
      .getPatientPrescriptions(id, { limit: 100 })
      .pipe(finalize(() => (this.prescriptionsLoading = false)))
      .subscribe({
        next: (result) => {
          this.prescriptions = result.items;
        },
        error: () => {
          this.prescriptions = [];
        },
      });

    this.billsLoading = true;
    this.backend
      .getPatientBills(id, { limit: 100 })
      .pipe(finalize(() => (this.billsLoading = false)))
      .subscribe({
        next: (result) => {
          this.bills = result.items;
        },
        error: () => {
          this.bills = [];
        },
      });
  }

  patientName(): string {
    return this.patient
      ? `${this.patient.firstName} ${this.patient.lastName}`.trim()
      : '-';
  }

  canOpenClinicalRecords(): boolean {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
    return permissions.includes('*') || permissions.includes('patients_history.read');
  }

  canOpenPrescriptions(): boolean {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
    return (
      permissions.includes('*') ||
      permissions.includes('prescriptions.read') ||
      permissions.includes('prescriptions.create')
    );
  }

  canViewBills(): boolean {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
    return permissions.includes('*') || permissions.includes('bills.read');
  }

  ageLabel(): string {
    if (!this.patient?.dateOfBirth) {
      return '-';
    }

    const dob = new Date(this.patient.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return '-';
    }

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }

    return `${age} years`;
  }

  primaryMedicine(prescription: Prescription): string {
    if (!prescription.medicines?.length) {
      return '-';
    }

    const names = prescription.medicines
      .map((medicine) => medicine.name?.trim())
      .filter((name): name is string => Boolean(name));

    if (names.length === 0) {
      return '-';
    }

    if (names.length === 1) {
      return names[0];
    }

    return `${names[0]} +${names.length - 1} more`;
  }

  historySummary(item: PatientHistory): string {
    return item.notes || item.symptoms || item.diagnosis || '-';
  }
}
