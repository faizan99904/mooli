import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  Company: boolean = true;
  Localization!: boolean;
  Permissions!: boolean;
  Email!: boolean;
  Invoice!: boolean;
  Notifications!: boolean;
  Changepassword!: boolean;
  oldPassword: string = '';
  newPassword: string = '';
  constructor(
    private backend: BackendService,
    private toaster: ToastrService
  ) { }

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

  ngOnInit(): void { }

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
}
