import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Doctor, Patient, User } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-add-patient',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-patient.component.html',
  styleUrl: './add-patient.component.scss',
})
export class AddPatientComponent implements OnInit {
  patientForm: FormGroup;
  doctors: Doctor[] = [];
  editingPatient: Patient | null = null;
  currentUser: User | null = null;
  currentHospitalId: string | null = null;
  saving = false;
  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.patientForm = this.fb.group({
      assignedDoctorId: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      gender: ['male', Validators.required],
      dateOfBirth: [''],
      bloodGroup: [''],
      address: [''],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      allergies: [''],
      chronicDiseases: [''],
      currentMedications: [''],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.editingPatient = history.state?.patient || null;
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    this.currentHospitalId = this.currentUser?.hospitalId || null;
    this.applyEditingState();
    this.backend.getDoctors({ limit: 100, status: 'active' }).subscribe({
      next: (result) => {
        this.doctors = result.items;
      },
      error: () => {
        this.doctors = [];
      },
    });
  }

  toArray(value: string): string[] {
    return value
      ? value.split(',').map((item) => item.trim()).filter(Boolean)
      : [];
  }

  submitPatient(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    const value = this.patientForm.value;
    const payload: Record<string, unknown> = {
      assignedDoctorId: value.assignedDoctorId,
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email || undefined,
      phone: value.phone || undefined,
      gender: value.gender,
      dateOfBirth: value.dateOfBirth || undefined,
      bloodGroup: value.bloodGroup || undefined,
      address: value.address || undefined,
      emergencyContactName: value.emergencyContactName || undefined,
      emergencyContactPhone: value.emergencyContactPhone || undefined,
      allergies: this.toArray(value.allergies),
      chronicDiseases: this.toArray(value.chronicDiseases),
      currentMedications: this.toArray(value.currentMedications),
      status: value.status,
    };

    if (!this.editingPatient && this.currentHospitalId) {
      payload['hospitalId'] = this.currentHospitalId;
    }

    this.saving = true;
    const request$ = this.editingPatient
      ? this.backend.updatePatient(this.editingPatient._id, payload)
      : this.backend.createPatient(payload);

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.router.navigateByUrl('/patients/all-patients');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  private applyEditingState(): void {
    if (!this.editingPatient) {
      return;
    }

    this.patientForm.patchValue({
      assignedDoctorId: this.editingPatient.assignedDoctorId,
      firstName: this.editingPatient.firstName,
      lastName: this.editingPatient.lastName,
      email: this.editingPatient.email || '',
      phone: this.editingPatient.phone || '',
      gender: this.editingPatient.gender,
      dateOfBirth: this.editingPatient.dateOfBirth ? String(this.editingPatient.dateOfBirth).slice(0, 10) : '',
      bloodGroup: this.editingPatient.bloodGroup || '',
      address: this.editingPatient.address || '',
      emergencyContactName: this.editingPatient.emergencyContactName || '',
      emergencyContactPhone: this.editingPatient.emergencyContactPhone || '',
      allergies: (this.editingPatient.allergies || []).join(', '),
      chronicDiseases: (this.editingPatient.chronicDiseases || []).join(', '),
      currentMedications: (this.editingPatient.currentMedications || []).join(', '),
      status: this.editingPatient.status || 'active',
    });
  }
}
