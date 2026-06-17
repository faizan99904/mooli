import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Appointment, Patient } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-addpayments',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './addpayments.component.html',
  styleUrl: './addpayments.component.scss',
})
export class AddpaymentsComponent implements OnInit {
  billForm: FormGroup;
  patients: Patient[] = [];
  appointments: Appointment[] = [];
  currentHospitalId: string | null = null;
  saving = false;
  paymentMethods = ['cash', 'card', 'bank', 'online', 'wallet', 'check'];

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.billForm = this.fb.group({
      patientId: ['', Validators.required],
      appointmentId: [''],
      items: this.fb.array([this.createItemGroup()]),
      discount: [0],
      tax: [0],
      paidAmount: [0],
      paymentMethod: ['cash'],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as { hospitalId?: string | null } | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.patients = result.items),
      error: () => (this.patients = []),
    });
    this.backend.getAppointments({ limit: 100 }).subscribe({
      next: (result) => (this.appointments = result.items),
      error: () => (this.appointments = []),
    });
  }

  get items(): FormArray {
    return this.billForm.get('items') as FormArray;
  }

  createItemGroup(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, Validators.required],
      unitPrice: [0, Validators.required],
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  subtotal(): number {
    return this.items.value.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
  }

  grandTotal(): number {
    const value = this.billForm.value;
    return Math.max(
      this.subtotal() - Number(value.discount || 0) + Number(value.tax || 0),
      0
    );
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  submitBill(): void {
    if (!this.backend.hasPermission('bills.create')) {
      return;
    }

    if (this.billForm.invalid) {
      this.billForm.markAllAsTouched();
      return;
    }

    const value = this.billForm.value;
    const payload: Record<string, unknown> = {
      patientId: value.patientId,
      appointmentId: value.appointmentId || undefined,
      items: value.items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      discount: Number(value.discount || 0),
      tax: Number(value.tax || 0),
      paidAmount: Number(value.paidAmount || 0),
      paymentMethod: value.paymentMethod || undefined,
    };

    if (this.currentHospitalId) {
      payload['hospitalId'] = this.currentHospitalId;
    }

    this.saving = true;
    this.backend
      .createBill(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.router.navigateByUrl('/payments/invoices');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
      });
  }
}
