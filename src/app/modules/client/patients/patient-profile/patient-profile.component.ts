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
    this.backend.getPatientHistory(id, { limit: 100 }).subscribe({
      next: (result) => {
        this.history = result.items;
      },
      error: () => {
        this.history = [];
      },
    });

    this.backend.getPatientPrescriptions(id, { limit: 100 }).subscribe({
      next: (result) => {
        this.prescriptions = result.items;
      },
      error: () => {
        this.prescriptions = [];
      },
    });

    this.backend.getPatientBills(id, { limit: 100 }).subscribe({
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
}
