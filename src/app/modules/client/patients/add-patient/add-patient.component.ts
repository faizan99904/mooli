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
import { Doctor } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-add-patient',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-patient.component.html',
  styleUrl: './add-patient.component.scss',
})
export class AddPatientComponent implements OnInit {
  patientForm: FormGroup;
  doctors: Doctor[] = [];
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

    this.saving = true;
    this.backend
      .createPatient(payload)
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
}
