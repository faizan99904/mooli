import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';
import { Hospital, PrescriptionPrintSettings, User } from '../../../shared/models/hospital.model';

type SettingsTab = 'profile' | 'password' | 'hospital';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  activeTab: SettingsTab = 'profile';
  showPassword = false;
  showCurrentPass = false;
  currentUser: User | null = null;
  profileLoading = false;
  profileSaving = false;
  passwordSaving = false;
  oldPassword = '';
  newPassword = '';
  profileName = '';
  profileEmail = '';
  profilePhone = '';
  role = localStorage.getItem('role') || 'ADMIN';
  permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];

  hospitalProfile: Hospital | null = null;
  hospitalLoading = false;
  hospitalSaving = false;
  currentHospitalId = '';
  hospitalName = '';
  hospitalPhone = '';
  hospitalEmail = '';
  hospitalAddress = '';
  hospitalCity = '';
  hospitalCountry = '';
  hospitalLogoUrl = '';
  prescriptionShowLogo = true;
  prescriptionRevisionNote = '* Rx to be revised after Reports.';
  prescriptionFollowUpLine = '';
  prescriptionContactLine = '';
  prescriptionFooterLines = '';

  constructor(
    private backend: BackendService,
    private toaster: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadStoredUser();
    this.refreshCurrentUser();
    this.loadHospitalFromStoredUser();
    if (this.canReadHospitalSettings && this.currentHospitalId) {
      this.loadHospitalSettings();
    }
  }

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
  }

  get canReadHospitalSettings(): boolean {
    return this.canManageHospitalSettings || this.permissions.includes('hospitals.read');
  }

  get canManageHospitalSettings(): boolean {
    return this.permissions.includes('*') || this.permissions.includes('hospitals.update');
  }

  toggleCurrentPass(): void {
    this.showCurrentPass = !this.showCurrentPass;
  }

  toggleNewPass(): void {
    this.showPassword = !this.showPassword;
  }

  saveProfile(): void {
    if (!this.profileName.trim()) {
      this.toaster.error('Name is required.');
      return;
    }

    if (!this.profileEmail.trim()) {
      this.toaster.error('Email is required.');
      return;
    }

    const payload = {
      name: this.profileName.trim(),
      email: this.profileEmail.trim(),
      phone: this.profilePhone.trim() || undefined,
    };

    this.profileSaving = true;
    this.backend
      .updateMe(payload)
      .pipe(finalize(() => (this.profileSaving = false)))
      .subscribe({
        next: (response) => {
          this.applyCurrentUser(response.data);
          this.toaster.success(response.message || 'Profile updated successfully.');
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to update profile.');
        },
      });
  }

  changePass(): void {
    if (!this.oldPassword || !this.newPassword) {
      this.toaster.error('Current password and new password are required.');
      return;
    }

    if (this.oldPassword.length < 8 || this.newPassword.length < 8) {
      this.toaster.error('Passwords must be at least 8 characters.');
      return;
    }

    if (this.oldPassword === this.newPassword) {
      this.toaster.error('New password must be different from current password.');
      return;
    }

    this.passwordSaving = true;
    this.backend
      .changePass({
        currentPassword: this.oldPassword,
        newPassword: this.newPassword,
      })
      .pipe(finalize(() => (this.passwordSaving = false)))
      .subscribe({
        next: (response) => {
          this.toaster.success(response.message || 'Password changed successfully.');
          this.cancelPasswordChange();
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to change password.');
        },
      });
  }

  cancelPasswordChange(): void {
    this.oldPassword = '';
    this.newPassword = '';
    this.showCurrentPass = false;
    this.showPassword = false;
  }

  hospitalPrescriptionPreview(): PrescriptionPrintSettings & {
    hospitalName: string;
    hospitalAddress: string;
    hospitalContactLine: string;
    logoUrl: string;
  } {
    return {
      showLogo: this.prescriptionShowLogo,
      revisionNote: this.prescriptionRevisionNote.trim() || '* Rx to be revised after Reports.',
      followUpLine: this.prescriptionFollowUpLine.trim() || this.defaultPrescriptionFollowUpLine(),
      contactLine: this.prescriptionContactLine.trim() || this.defaultHospitalContactLine(),
      footerLines: this.textareaToLines(this.prescriptionFooterLines),
      hospitalName: this.hospitalName.trim() || 'MediLink City Care Hospital',
      hospitalAddress: this.hospitalAddressLine(),
      hospitalContactLine: this.prescriptionContactLine.trim() || this.defaultHospitalContactLine(),
      logoUrl: this.hospitalLogoUrl.trim(),
    };
  }

  saveHospitalSettings(): void {
    if (!this.canManageHospitalSettings) {
      this.toaster.error('You do not have permission to update hospital settings.');
      return;
    }

    if (!this.currentHospitalId) {
      this.toaster.error('No hospital is assigned to this user.');
      return;
    }

    if (!this.hospitalName.trim()) {
      this.toaster.error('Hospital name is required.');
      return;
    }

    const payload: Record<string, unknown> = {
      name: this.hospitalName.trim(),
      phone: this.hospitalPhone.trim(),
      email: this.hospitalEmail.trim(),
      address: this.hospitalAddress.trim(),
      city: this.hospitalCity.trim(),
      country: this.hospitalCountry.trim(),
      logoUrl: this.hospitalLogoUrl.trim(),
      prescriptionSettings: {
        showLogo: this.prescriptionShowLogo,
        revisionNote: this.prescriptionRevisionNote.trim(),
        followUpLine: this.prescriptionFollowUpLine.trim(),
        contactLine: this.prescriptionContactLine.trim(),
        footerLines: this.textareaToLines(this.prescriptionFooterLines),
      },
    };

    this.hospitalSaving = true;
    this.backend
      .updateHospital(this.currentHospitalId, payload)
      .pipe(finalize(() => (this.hospitalSaving = false)))
      .subscribe({
        next: (response) => {
          this.applyHospitalProfile(response.data);
          this.toaster.success('Hospital settings updated successfully.');
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to update hospital settings.');
        },
      });
  }

  onHospitalLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toaster.error('Please select an image file.');
      input.value = '';
      return;
    }

    void this.prepareHospitalLogo(file)
      .then((dataUrl) => {
        this.hospitalLogoUrl = dataUrl;
        this.prescriptionShowLogo = true;
      })
      .catch(() => this.toaster.error('Unable to read selected logo.'))
      .finally(() => {
        input.value = '';
      });
  }

  clearHospitalLogo(): void {
    this.hospitalLogoUrl = '';
  }

  private loadStoredUser(): void {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    this.applyCurrentUser(storedUser);
  }

  private refreshCurrentUser(): void {
    this.profileLoading = true;
    this.backend
      .getMe()
      .pipe(finalize(() => (this.profileLoading = false)))
      .subscribe({
        next: (user) => this.applyCurrentUser(user),
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to load profile.');
        },
      });
  }

  private applyCurrentUser(user: User | null): void {
    if (!user) {
      return;
    }

    this.currentUser = user;
    this.profileName = user.name || '';
    this.profileEmail = user.email || '';
    this.profilePhone = user.phone || '';
    this.role = user.role?.name || this.role;
    this.permissions = user.role?.permissions || this.permissions;
    this.currentHospitalId = user.hospitalId || user.hospital?._id || this.currentHospitalId;

    if (user.hospital) {
      this.applyHospitalProfile(user.hospital);
    }

    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('role', user.role?.name || '');
    localStorage.setItem('roleId', user.role?._id || '');
    localStorage.setItem('permissions', JSON.stringify(user.role?.permissions || []));
  }

  private loadHospitalFromStoredUser(): void {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    this.currentHospitalId = storedUser?.hospitalId || storedUser?.hospital?._id || '';
    if (storedUser?.hospital) {
      this.applyHospitalProfile(storedUser.hospital);
    }
  }

  private loadHospitalSettings(): void {
    this.hospitalLoading = true;
    this.backend
      .getHospital(this.currentHospitalId)
      .pipe(finalize(() => (this.hospitalLoading = false)))
      .subscribe({
        next: (hospital) => this.applyHospitalProfile(hospital),
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to load hospital settings.');
        },
      });
  }

  private applyHospitalProfile(hospital: Hospital | null): void {
    this.hospitalProfile = hospital;
    this.currentHospitalId = hospital?._id || this.currentHospitalId;
    this.hospitalName = hospital?.name || '';
    this.hospitalPhone = hospital?.phone || '';
    this.hospitalEmail = hospital?.email || '';
    this.hospitalAddress = hospital?.address || '';
    this.hospitalCity = hospital?.city || '';
    this.hospitalCountry = hospital?.country || '';
    this.hospitalLogoUrl = hospital?.logoUrl || '';

    const settings = hospital?.prescriptionSettings;
    this.prescriptionShowLogo = settings?.showLogo !== false;
    this.prescriptionRevisionNote = settings?.revisionNote || '* Rx to be revised after Reports.';
    this.prescriptionFollowUpLine = settings?.followUpLine || this.defaultPrescriptionFollowUpLine();
    this.prescriptionContactLine = settings?.contactLine || this.defaultHospitalContactLine();
    this.prescriptionFooterLines = this.linesToTextarea(settings?.footerLines);
    this.updateStoredUserHospital(hospital);
  }

  private updateStoredUserHospital(hospital: Hospital | null): void {
    if (!hospital) {
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    if (!storedUser) {
      return;
    }

    localStorage.setItem(
      'user',
      JSON.stringify({
        ...storedUser,
        hospitalId: hospital._id,
        hospital,
      })
    );
  }

  private defaultPrescriptionFollowUpLine(): string {
    return `For appointment and follow up, contact ${this.hospitalName.trim() || 'MediLink City Care Hospital'}.`;
  }

  private defaultHospitalContactLine(): string {
    const parts = [
      this.hospitalEmail.trim() ? `Email: ${this.hospitalEmail.trim()}` : '',
      this.hospitalPhone.trim() ? `Phone: ${this.hospitalPhone.trim()}` : '',
    ].filter(Boolean);

    return parts.join(' | ') || 'Email: info@medilink.local | Phone: 0300-0000000';
  }

  private hospitalAddressLine(): string {
    return [this.hospitalAddress, this.hospitalCity, this.hospitalCountry]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  private textareaToLines(value: string | null | undefined): string[] {
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private linesToTextarea(lines: string[] | null | undefined): string {
    return Array.isArray(lines) ? lines.join('\n') : '';
  }

  private async prepareHospitalLogo(file: File): Promise<string> {
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height, 1));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        bitmap.close();
        return this.readFileAsDataUrl(file);
      }

      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      return canvas.toDataURL('image/jpeg', 0.92);
    } catch {
      return this.readFileAsDataUrl(file);
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }
}
