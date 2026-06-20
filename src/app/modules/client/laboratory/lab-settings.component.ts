import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { LabSettingsResponse, LaboratoryPrintSettings } from '../../../shared/models/hospital.model';
import { resolveLabPrintDetails } from './lab-print-details';

@Component({
  selector: 'app-lab-settings',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-settings.component.html',
  styleUrl: './lab-settings.component.scss',
})
export class LabSettingsComponent implements OnInit {
  loading = false;
  saving = false;
  settingsResponse: LabSettingsResponse | null = null;
  form: LaboratoryPrintSettings = this.emptyForm();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.backend
      .getLabSettings()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.settingsResponse = response;
          this.form = {
            useCustomDetails: response.laboratorySettings?.useCustomDetails === true,
            name: response.laboratorySettings?.name || '',
            phone: response.laboratorySettings?.phone || '',
            email: response.laboratorySettings?.email || '',
            address: response.laboratorySettings?.address || '',
            city: response.laboratorySettings?.city || '',
            tagline: response.laboratorySettings?.tagline || 'Pathology & Diagnostic Laboratory',
          };
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load laboratory settings.'),
      });
  }

  saveSettings(): void {
    this.saving = true;
    this.backend
      .updateLabSettings({
        useCustomDetails: this.form.useCustomDetails === true,
        name: this.form.name?.trim() || '',
        phone: this.form.phone?.trim() || '',
        email: this.form.email?.trim() || '',
        address: this.form.address?.trim() || '',
        city: this.form.city?.trim() || '',
        tagline: this.form.tagline?.trim() || 'Pathology & Diagnostic Laboratory',
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.settingsResponse = response.data || this.settingsResponse;
          this.toastr.success(response.message || 'Laboratory settings saved.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save laboratory settings.'),
      });
  }

  hospitalPreviewLine(): string {
    const hospital = this.settingsResponse?.hospital;
    if (!hospital) {
      return 'Hospital details not loaded.';
    }

    return [hospital.name, hospital.phone, [hospital.address, hospital.city].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' · ');
  }

  reportPreviewName(): string {
    if (!this.settingsResponse) {
      return 'Laboratory';
    }

    const hospital = {
      _id: '',
      name: this.settingsResponse.hospital.name,
      code: '',
      status: 'active' as const,
      phone: this.settingsResponse.hospital.phone,
      email: this.settingsResponse.hospital.email,
      address: this.settingsResponse.hospital.address,
      city: this.settingsResponse.hospital.city,
      laboratorySettings: this.form,
    };

    return resolveLabPrintDetails(hospital, { mode: 'report', order: { _id: '', hospitalId: '', orderNo: '', patientId: '', source: 'walk-in', status: 'verified', priority: 'normal', totalAmount: 0, paidAmount: 0, balanceAmount: 0, items: [{ _id: '1', testName: 'CBC', status: 'verified', resultMode: 'structured', parameters: [], reportFiles: [], price: 0 }] } }).name;
  }

  receiptUsesHospitalDetails(): boolean {
    return true;
  }

  reportUsesLabDetails(): boolean {
    return this.form.useCustomDetails === true;
  }

  private emptyForm(): LaboratoryPrintSettings {
    return {
      useCustomDetails: false,
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      tagline: 'Pathology & Diagnostic Laboratory',
    };
  }
}
