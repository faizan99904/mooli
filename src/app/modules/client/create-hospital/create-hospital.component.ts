import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { BackendService } from '../../../core/services/backend.service';
import { Hospital } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-create-hospital',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-hospital.component.html',
  styleUrl: './create-hospital.component.scss',
})
export class CreateHospitalComponent implements OnInit {
  hospitalForm!: FormGroup;
  saving = false;
  editingHospital: Hospital | null = null;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toast: ToastrService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.editingHospital = history.state?.hospital || null;
    this.initForm();
  }

  initForm(): void {
    this.hospitalForm = this.fb.group({
      name: [this.editingHospital?.name || '', Validators.required],
      code: [this.editingHospital?.code || '', Validators.required],
      email: [
        this.editingHospital?.email || '',
        [Validators.email],
      ],
      phone: [this.editingHospital?.phone || ''],
      address: [this.editingHospital?.address || ''],
      city: [this.editingHospital?.city || ''],
      country: [this.editingHospital?.country || 'Pakistan'],
      logoUrl: [this.editingHospital?.logoUrl || ''],
      subscriptionPlan: [this.editingHospital?.subscriptionPlan || 'basic'],
      status: [this.editingHospital?.status || 'active', Validators.required],
    });
  }

  submitForm(): void {
    if (this.hospitalForm.invalid) {
      this.hospitalForm.markAllAsTouched();
      return;
    }

    const value = this.hospitalForm.value;

    const payload: Record<string, unknown> = {
      name: value.name,
      code: value.code,
      email: value.email || undefined,
      phone: value.phone || undefined,
      address: value.address || undefined,
      city: value.city || undefined,
      country: value.country || undefined,
      logoUrl: value.logoUrl || undefined,
      subscriptionPlan: value.subscriptionPlan || undefined,
      status: value.status,
    };

    this.saving = true;

    const request$ = this.editingHospital
      ? this.backend.updateHospital(this.editingHospital._id, payload)
      : this.backend.createHospital(payload);

    request$.subscribe({
      next: (resp:any) => {
        this.saving = false;
        this.toast.success(
          resp?.message ||
          (this.editingHospital
            ? 'Hospital updated successfully'
            : 'Hospital created successfully')
        );
        this.router.navigateByUrl('/hospitals');
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Hospital save nahi ho saka');
      },
    });
  }
}