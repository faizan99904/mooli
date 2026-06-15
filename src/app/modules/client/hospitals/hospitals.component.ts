import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import { Hospital } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-hospitals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './hospitals.component.html',
  styleUrl: './hospitals.component.scss',
})
export class HospitalsComponent implements OnInit {
  hospitals: Hospital[] = [];
  search = '';
  loading = false;

  constructor(
    private backend: BackendService,
    private toast: ToastrService,
    private router: Router,
    private dialog: AppDialogService
  ) { }

  ngOnInit(): void {
    this.loadHospitals();
  }

  loadHospitals(): void {
    this.loading = true;

    this.backend.getHospitals().subscribe({
      next: (result) => {
        this.hospitals = result?.items || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.hospitals = [];
        this.toast.error(err?.error?.message || 'Hospitals load nahi ho sake');
      },
    });
  }

  filteredHospitals(): Hospital[] {
    const value = this.search.toLowerCase().trim();

    if (!value) {
      return this.hospitals;
    }

    return this.hospitals.filter((hospital) =>
      [
        hospital.name,
        hospital.code,
        hospital.email,
        hospital.phone,
        hospital.city,
        hospital.country,
        hospital.status,
        hospital.subscriptionPlan,
      ]
        .join(' ')
        .toLowerCase()
        .includes(value)
    );
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  editHospital(hospital: Hospital): void {
    if (!this.can('hospitals.update')) {
      return;
    }

    this.router.navigate(['/create-hospital'], {
      state: { hospital },
    });
  }

  async deleteHospital(id: string): Promise<void> {
    if (!this.can('hospitals.delete')) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Delete Hospital',
      message: 'Delete this hospital? This action cannot be undone.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.backend.deleteHospital(id).subscribe({
      next: (resp) => {
        this.toast.success(resp?.message || 'Hospital deleted successfully');
        this.loadHospitals();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Hospital delete nahi ho saka');
      },
    });
  }
}
