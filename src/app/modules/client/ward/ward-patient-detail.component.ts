import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WardDataService } from './services/ward-data.service';
import { WardPatient } from './ward-patient-list.models';
import { WARD_PATIENT_SHIFT_OPTIONS } from './ward-patient-list.mock';

interface PatientDetailTab {
  key: string;
  label: string;
}

@Component({
  selector: 'app-ward-patient-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ward-patient-detail.component.html',
  styleUrl: './ward-patient-detail.component.scss',
})
export class WardPatientDetailComponent implements OnInit {
  loading = false;
  patient: WardPatient | null = null;
  activeTab = 'overview';

  wardOptions: string[] = [];
  readonly shiftOptions = WARD_PATIENT_SHIFT_OPTIONS;
  readonly tabs: PatientDetailTab[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'vitals', label: 'Vitals' },
    { key: 'mar', label: 'MAR' },
    { key: 'drips', label: 'Drips / IV' },
    { key: 'nursing', label: 'Nursing Notes' },
    { key: 'orders', label: 'Orders' },
  ];

  ward = '';
  date = new Date().toISOString().slice(0, 10);
  shift = 'Day Shift';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private wardData: WardDataService
  ) {}

  ngOnInit(): void {
    const admissionId = this.route.snapshot.paramMap.get('admissionId') || '';
    this.loading = true;
    this.wardData.loadPatientByAdmission(admissionId).subscribe({
      next: (patient) => {
        this.patient = patient;
        if (patient) {
          this.ward = patient.wardName;
          this.wardOptions = [patient.wardName];
        }
        this.loading = false;
        if (!patient) {
          this.toastr.warning('Patient admission not found.', 'Patient Detail');
        }
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Failed to load patient details.', 'Patient Detail');
      },
    });
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  statusLabel(status: WardPatient['status']): string {
    const labels: Record<WardPatient['status'], string> = {
      stable: 'Stable',
      watch: 'Watch',
      critical: 'Critical',
      dischargePlanned: 'Discharge Planned',
      pendingAssignment: 'Pending Assignment',
    };
    return labels[status];
  }

  statusClass(status: WardPatient['status']): string {
    return `ward-badge ward-badge--${status}`;
  }

  navigate(path: string): void {
    if (!this.patient) {
      return;
    }

    void this.router.navigate([path], {
      queryParams: {
        admissionId: this.patient.admissionId,
        patientId: this.patient.patientId,
        patientName: this.patient.patientName,
        wardName: this.patient.wardName,
      },
    });
  }
}
