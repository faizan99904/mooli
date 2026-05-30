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
import { Patient, Room } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-add-allotment',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-allotment.component.html',
  styleUrl: './add-allotment.component.scss',
})
export class AddAllotmentComponent implements OnInit {
  allotmentForm: FormGroup;
  patients: Patient[] = [];
  rooms: Room[] = [];
  currentHospitalId: string | null = null;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.allotmentForm = this.fb.group({
      patientId: ['', Validators.required],
      roomId: ['', Validators.required],
      admittedAt: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as { hospitalId?: string | null } | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.backend.getPatients({ limit: 100, status: 'active' }).subscribe({
      next: (result) => (this.patients = result.items),
      error: () => (this.patients = []),
    });
    this.backend.getRooms({ limit: 100, status: 'available' }).subscribe({
      next: (result) => (this.rooms = result.items),
      error: () => (this.rooms = []),
    });
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  submitAllotment(): void {
    if (this.allotmentForm.invalid) {
      this.allotmentForm.markAllAsTouched();
      return;
    }

    const value = this.allotmentForm.value;
    const payload: Record<string, unknown> = {
      patientId: value.patientId,
      roomId: value.roomId,
      admittedAt: value.admittedAt ? new Date(value.admittedAt).toISOString() : undefined,
      notes: value.notes || undefined,
    };

    if (this.currentHospitalId) {
      payload['hospitalId'] = this.currentHospitalId;
    }

    this.saving = true;
    this.backend
      .createRoomAllotment(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.router.navigateByUrl('/room-allotment/alloted-rooms');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
      });
  }
}
