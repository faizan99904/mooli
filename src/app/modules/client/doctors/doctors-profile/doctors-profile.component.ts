import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Appointment, Doctor, Patient } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-doctors-profile',
  imports: [CommonModule, RouterLink],
  templateUrl: './doctors-profile.component.html',
  styleUrl: './doctors-profile.component.scss'
})
export class DoctorsProfileComponent implements OnInit {
  readonly days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  basicTab: boolean = true;
  accountTab!: boolean;
  generalTab!: boolean;
  isFull!: boolean;
  isFull1!: boolean;
  isFull2!: boolean;
  loading = false;
  doctor: Doctor | null = null;
  patients: Patient[] = [];
  appointments: Appointment[] = [];

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDoctor(id);
    }
  }

  loadDoctor(id: string): void {
    this.loading = true;
    this.backend
      .getDoctor(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (doctor) => {
          this.doctor = doctor;
          this.loadRelated(id);
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  loadRelated(id: string): void {
    this.backend.getDoctorPatients(id, { limit: 100 }).subscribe({
      next: (result) => {
        this.patients = result.items;
      },
      error: () => {
        this.patients = [];
      },
    });

    this.backend.getDoctorAppointments(id, { limit: 100 }).subscribe({
      next: (result) => {
        this.appointments = result.items;
      },
      error: () => {
        this.appointments = [];
      },
    });
  }

  patientName(patient?: Patient | null): string {
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  availableDaysLabel(days?: string[] | null): string {
    const selected = new Set(days || []);
    const labels = this.days
      .filter((day) => selected.has(day))
      .map((day) => day.charAt(0).toUpperCase() + day.slice(1));

    return labels.length ? labels.join(', ') : '-';
  }

  fullScreenSection(number:any) {
    if (number == 1) {
      if (this.isFull) {
        this.isFull = false;
      }
      else {
        this.isFull = true;
      }
    }
    else if (number == 2) {
      if (this.isFull1) {
        this.isFull1 = false;
      }
      else {
        this.isFull1 = true;
      }
    }
    else if (number == 3) {
      if (this.isFull2) {
        this.isFull2 = false;
      }
      else {
        this.isFull2 = true;
      }
    }

  }

  onTab(number:any) {
    this.basicTab = false;
    this.accountTab = false;
    this.generalTab = false;

    if (number == '1') {
      this.basicTab = true;
    }
    else if (number == '2') {
      this.accountTab = true;
    }
    else if (number == '3') {
      this.generalTab = true;
    }
  }

}
