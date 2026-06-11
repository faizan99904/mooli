import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';
import {
  CompanyProfile,
  ReceiptLetterheadSettings,
  UpdateCompanyProfilePayload,
} from '../../../shared/models/company.model';
import {
  Hospital,
  PrescriptionPrintSettings,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  showPassword = false;
  showCurrentPass = false;
  Company = false;
  Localization = false;
  Permissions = false;
  Email = false;
  Invoice = false;
  Notifications = false;
  Changepassword = false;
  HospitalSettings = true;
  oldPassword: string = '';
  newPassword: string = '';
  companyProfile: CompanyProfile | null = null;
  companyLoading = false;
  companySaving = false;
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
  companyName = '';
  companyPhone = '';
  companyEmail = '';
  companyAddress = '';
  companyCity = '';
  companyCountry = '';
  companyTaxNumber = '';
  companyLogoUrl = '';
  receiptLetterheadEnabled = true;
  receiptLetterheadShowLogo = false;
  receiptLetterheadLogoUrl = '';
  receiptLetterheadBrandTitle = '';
  receiptLetterheadBrandSubtitle = '';
  receiptLetterheadHeaderNote = '';
  receiptLetterheadContactLine = '';
  receiptLetterheadExtraHeaderLines = '';
  receiptLetterheadFooterTitle = '';
  receiptLetterheadFooterLines = '';
  role = localStorage.getItem('role') || 'ADMIN';
  permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
  constructor(
    private backend: BackendService,
    private toaster: ToastrService
  ) {}

  onTab(number: any) {
    this.Company = false;
    this.Localization = false;
    this.Permissions = false;
    this.Email = false;
    this.Invoice = false;
    this.Notifications = false;
    this.Changepassword = false;
    this.HospitalSettings = false;

    if (number == '1') {
      this.Company = true;
    } else if (number == '2') {
      this.Localization = true;
    } else if (number == '3') {
      this.Permissions = true;
    } else if (number == '4') {
      this.Email = true;
    } else if (number == '5') {
      this.Invoice = true;
    } else if (number == '6') {
      this.Notifications = true;
    } else if (number == '7') {
      this.Changepassword = true;
    } else if (number == '8') {
      this.HospitalSettings = true;
    }
  }

  ngOnInit(): void {
    this.loadHospitalFromStoredUser();
    if (this.canReadHospitalSettings && this.currentHospitalId) {
      this.loadHospitalSettings();
    }
  }

  toggleCurrentPass() {
    this.showCurrentPass = !this.showCurrentPass;
  }

  toggleNewPass() {
    this.showPassword = !this.showPassword;
  }

  changePass() {
    const payload = {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
    };

    this.backend.changePass(payload).subscribe({
      next: (resp: any) => {
        this.toaster.success(resp.message || 'Pasword changed!');
      },
    });
  }

  cancel() {
    this.oldPassword = '';
    this.newPassword = '';
  }

  get canManageReceiptLetterhead(): boolean {
    const normalizedRole = this.normalizeRole(this.role);
    return (
      normalizedRole === 'owner' ||
      normalizedRole === 'superadmin' ||
      this.permissions.includes('*') ||
      this.permissions.includes('company.manage')
    );
  }

  get canReadHospitalSettings(): boolean {
    return this.canManageHospitalSettings || this.permissions.includes('hospitals.read');
  }

  get canManageHospitalSettings(): boolean {
    return this.permissions.includes('*') || this.permissions.includes('hospitals.update');
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

  receiptPreview(): ReceiptLetterheadSettings {
    return {
      enabled: this.receiptLetterheadEnabled,
      showLogo: this.receiptLetterheadShowLogo,
      logoUrl: this.receiptLetterheadLogoUrl.trim() || this.companyLogoUrl.trim(),
      brandTitle: this.receiptLetterheadBrandTitle.trim() || this.companyName.trim() || 'Mooli Pharmacy',
      brandSubtitle: this.receiptLetterheadBrandSubtitle.trim() || this.companyAddress.trim(),
      headerNote: this.receiptLetterheadHeaderNote.trim(),
      contactLine: this.receiptLetterheadContactLine.trim() || this.companyPhone.trim(),
      extraHeaderLines: this.textareaToLines(this.receiptLetterheadExtraHeaderLines),
      footerTitle:
        this.receiptLetterheadFooterTitle.trim() ||
        `Thank you for trusting ${this.companyName.trim() || 'Mooli Pharmacy'}.`,
      footerLines:
        this.textareaToLines(this.receiptLetterheadFooterLines).length > 0
          ? this.textareaToLines(this.receiptLetterheadFooterLines)
          : ['Please check your items before leaving the pharmacy counter.'],
    };
  }

  saveReceiptLetterhead(): void {
    if (!this.canManageReceiptLetterhead) {
      this.toaster.error('Only super admin or owner can update receipt letterhead.');
      return;
    }

    const payload: UpdateCompanyProfilePayload = {
      name: this.companyName.trim(),
      phone: this.companyPhone.trim() || undefined,
      email: this.companyEmail.trim() || undefined,
      address: this.companyAddress.trim() || undefined,
      city: this.companyCity.trim() || undefined,
      country: this.companyCountry.trim() || undefined,
      taxNumber: this.companyTaxNumber.trim() || undefined,
      logoUrl: this.companyLogoUrl.trim() || undefined,
      receiptLetterhead: {
        enabled: this.receiptLetterheadEnabled,
        showLogo: this.receiptLetterheadShowLogo,
        logoUrl: this.receiptLetterheadLogoUrl.trim() || undefined,
        brandTitle: this.receiptLetterheadBrandTitle.trim() || undefined,
        brandSubtitle: this.receiptLetterheadBrandSubtitle.trim() || undefined,
        headerNote: this.receiptLetterheadHeaderNote.trim() || undefined,
        contactLine: this.receiptLetterheadContactLine.trim() || undefined,
        extraHeaderLines: this.textareaToLines(this.receiptLetterheadExtraHeaderLines),
        footerTitle: this.receiptLetterheadFooterTitle.trim() || undefined,
        footerLines: this.textareaToLines(this.receiptLetterheadFooterLines),
      },
    };

    this.companySaving = true;
    this.backend
      .updateMyCompany(payload)
      .pipe(finalize(() => (this.companySaving = false)))
      .subscribe({
        next: (response) => {
          this.applyCompanyProfile(response.data);
          this.toaster.success('Receipt letterhead updated successfully.');
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to update receipt letterhead.');
        },
      });
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
          this.toaster.success('Hospital prescription settings updated successfully.');
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

    if (file.size > 700 * 1024) {
      this.toaster.error('Logo image must be under 700 KB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.hospitalLogoUrl = String(reader.result || '');
      this.prescriptionShowLogo = true;
    };
    reader.onerror = () => this.toaster.error('Unable to read selected logo.');
    reader.readAsDataURL(file);
  }

  clearHospitalLogo(): void {
    this.hospitalLogoUrl = '';
  }

  private loadCompanyProfile(): void {
    this.companyLoading = true;
    this.backend
      .getMyCompany()
      .pipe(finalize(() => (this.companyLoading = false)))
      .subscribe({
        next: (company) => {
          this.applyCompanyProfile(company);
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to load company settings.');
        },
      });
  }

  private loadHospitalSettings(): void {
    this.hospitalLoading = true;
    this.backend
      .getHospital(this.currentHospitalId)
      .pipe(finalize(() => (this.hospitalLoading = false)))
      .subscribe({
        next: (hospital) => {
          this.applyHospitalProfile(hospital);
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to load hospital settings.');
        },
      });
  }

  private applyCompanyProfile(company: CompanyProfile | null): void {
    this.companyProfile = company;
    this.companyName = company?.name || '';
    this.companyPhone = company?.phone || '';
    this.companyEmail = company?.email || '';
    this.companyAddress = company?.address || '';
    this.companyCity = company?.city || '';
    this.companyCountry = company?.country || '';
    this.companyTaxNumber = company?.taxNumber || '';
    this.companyLogoUrl = company?.logoUrl || '';
    this.receiptLetterheadEnabled = company?.receiptLetterhead?.enabled !== false;
    this.receiptLetterheadShowLogo = Boolean(company?.receiptLetterhead?.showLogo);
    this.receiptLetterheadLogoUrl = company?.receiptLetterhead?.logoUrl || '';
    this.receiptLetterheadBrandTitle = company?.receiptLetterhead?.brandTitle || '';
    this.receiptLetterheadBrandSubtitle = company?.receiptLetterhead?.brandSubtitle || '';
    this.receiptLetterheadHeaderNote = company?.receiptLetterhead?.headerNote || '';
    this.receiptLetterheadContactLine = company?.receiptLetterhead?.contactLine || '';
    this.receiptLetterheadExtraHeaderLines = this.linesToTextarea(
      company?.receiptLetterhead?.extraHeaderLines
    );
    this.receiptLetterheadFooterTitle = company?.receiptLetterhead?.footerTitle || '';
    this.receiptLetterheadFooterLines = this.linesToTextarea(company?.receiptLetterhead?.footerLines);
  }

  private loadHospitalFromStoredUser(): void {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { hospitalId?: string | null; hospital?: Hospital | null }
      | null;

    this.currentHospitalId = storedUser?.hospitalId || storedUser?.hospital?._id || '';
    if (storedUser?.hospital) {
      this.applyHospitalProfile(storedUser.hospital);
    }
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

    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { hospital?: Hospital | null; hospitalId?: string | null }
      | null;

    if (!storedUser) {
      return;
    }

    localStorage.setItem(
      'user',
      JSON.stringify({
        ...storedUser,
        hospitalId: hospital._id,
        hospital,
      }),
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

  private normalizeRole(role: string | null | undefined): string {
    return String(role || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }
}
