import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';
import { User } from '../../../shared/models/hospital.model';

type SettingsTab = 'profile' | 'password';

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

  constructor(
    private backend: BackendService,
    private toaster: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadStoredUser();
    this.refreshCurrentUser();
  }

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
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
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('role', user.role?.name || '');
    localStorage.setItem('roleId', user.role?._id || '');
    localStorage.setItem('permissions', JSON.stringify(user.role?.permissions || []));
  }
}
