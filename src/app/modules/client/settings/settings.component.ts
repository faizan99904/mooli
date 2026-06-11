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
  Company: boolean = true;
  Localization!: boolean;
  Permissions!: boolean;
  Email!: boolean;
  Invoice!: boolean;
  Notifications!: boolean;
  Changepassword!: boolean;
  oldPassword: string = '';
  newPassword: string = '';
  companyProfile: CompanyProfile | null = null;
  companyLoading = false;
  companySaving = false;
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
    }
  }

  ngOnInit(): void {
    if (this.canManageReceiptLetterhead) {
      this.loadCompanyProfile();
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
