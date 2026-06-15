import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { AppComponent } from '../../../app.component';
import { trigger, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { readStoredPermissions } from '../../auth/access-control';
@Component({
  selector: 'app-leftmenu',
  animations: [
    trigger('collapseExpand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './leftmenu.component.html',
  styleUrl: './leftmenu.component.scss',
})
export class LeftmenuComponent implements OnInit, AfterViewInit {
  isCollapsed = true;
  Pagecollapse = true;
  PaymentCollapsed = true;
  RoomCollapsed = true;
  PatientCollapsed = true;
  PharmacyCollapsed = true;
  PrescriptionCollapsed = true;
  LaboratoryCollapsed = true;
  changePasswordModalOpen = false;
  changePasswordLoading = false;
  showCurrentPassword = false;
  showNewPassword = false;
  currentPassword = '';
  newPassword = '';
  private router = inject(Router);
  private app = inject(AppComponent);
  private backend = inject(BackendService);
  private toaster = inject(ToastrService);
  role = localStorage.getItem('role') || '';
  permissions = readStoredPermissions();

  get isDoctor(): boolean {
    return this.normalizeRole(this.role) === 'doctor';
  }

  get isOwner(): boolean {
    return this.normalizeRole(this.role) === 'owner';
  }

  get isSuperAdmin(): boolean {
    return this.normalizeRole(this.role) === 'superadmin';
  }

  get canViewAllRoutes(): boolean {
    return this.hasWildcardPermission;
  }

  get canViewUsers(): boolean {
    return this.canViewAllRoutes || this.hasPermission('users.read');
  }

  get canViewHospitals(): boolean {
    return this.canViewAllRoutes || this.hasPermission('hospitals.read');
  }

  get canViewRoles(): boolean {
    return this.canViewAllRoutes || this.hasPermission('roles.read');
  }

  get canViewDashboard(): boolean {
    return this.canViewAllRoutes || this.hasPermission('hospital_dashboard.read');
  }

  get canViewDoctors(): boolean {
    return this.canViewAllRoutes || this.hasPermission('doctors.read');
  }

  get canManageDoctors(): boolean {
    return this.canViewAllRoutes || this.hasPermission('doctors.create') || this.hasPermission('doctors.update');
  }

  get canViewAppointments(): boolean {
    if (this.isDoctor) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('appointments.read');
  }

  get canViewClinicalRecords(): boolean {
    return this.canViewAllRoutes || this.hasPermission('patients_history.read');
  }

  get canManageClinicalRecords(): boolean {
    return this.canViewAllRoutes || this.hasPermission('patients_history.create') || this.hasPermission('patients_history.update');
  }

  get canViewPrescriptions(): boolean {
    return this.canViewAllRoutes || this.hasPermission('prescriptions.read');
  }

  get canManagePrescriptions(): boolean {
    return this.canViewAllRoutes || this.hasPermission('prescriptions.create') || this.hasPermission('prescriptions.update');
  }

  get canViewPharmacy(): boolean {
    return this.canViewAllRoutes || this.hasPermission('products.read');
  }

  get canOpenPharmacyPos(): boolean {
    return (
      this.canViewAllRoutes ||
      (this.hasPermission('sales.create') &&
        this.hasPermission('sales.read') &&
        this.hasPermission('products.read') &&
        this.hasPermission('register_sessions.open') &&
        this.hasPermission('register_sessions.read') &&
        this.hasPermission('register_sessions.close'))
    );
  }

  get canViewPosReports(): boolean {
    return (
      this.canViewAllRoutes ||
      this.hasPermission('reports.read') ||
      this.hasPermission('sales.read') ||
      this.hasPermission('products.read') ||
      this.hasPermission('register_sessions.read')
    );
  }

  get canViewLaboratory(): boolean {
    return (
      this.canViewAllRoutes ||
      this.hasPermission('lab_orders.read') ||
      this.hasPermission('lab_tests.read') ||
      this.hasPermission('patients_history.read')
    );
  }

  get canManageLaboratory(): boolean {
    return (
      this.canViewAllRoutes ||
      this.hasPermission('lab_orders.create') ||
      this.hasPermission('lab_orders.update') ||
      this.hasPermission('patients_history.create')
    );
  }

  get canViewWardAdmin(): boolean {
    return this.canViewAllRoutes || this.hasPermission('patients_history.read');
  }

  get canViewPatients(): boolean {
    return this.canViewAllRoutes || this.hasPermission('patients.read');
  }

  get canManagePatients(): boolean {
    return this.canViewAllRoutes || this.hasPermission('patients.create') || this.hasPermission('patients.update');
  }

  get canViewRooms(): boolean {
    return this.canViewAllRoutes || this.hasPermission('rooms.read');
  }

  get canManageRooms(): boolean {
    return this.canViewAllRoutes || this.hasPermission('rooms.create') || this.hasPermission('rooms.update');
  }

  get canViewRoomAllotments(): boolean {
    return this.canViewAllRoutes || this.hasPermission('room_allotments.read');
  }

  get canManageRoomAllotments(): boolean {
    return (
      this.canViewAllRoutes ||
      (this.hasPermission('room_allotments.create') &&
        this.hasPermission('rooms.read') &&
        this.hasPermission('patients.read'))
    );
  }

  get canViewDepartments(): boolean {
    return this.canViewAllRoutes || this.hasPermission('departments.read');
  }

  get canViewBilling(): boolean {
    return this.canViewAllRoutes || this.hasPermission('bills.read');
  }

  get canViewSettings(): boolean {
    return true;
  }

  get canManageBilling(): boolean {
    return this.canViewAllRoutes || this.hasPermission('bills.create') || this.hasPermission('bills.update_payment');
  }

  get canViewHospitalAdministration(): boolean {
    return this.canViewHospitals || this.canViewUsers || this.canViewRoles || this.canViewSettings;
  }

  get hasWildcardPermission(): boolean {
    return this.permissions.includes('*');
  }

  constructor() {
    this.initializeCollapsedStates();
  }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.role = localStorage.getItem('role') || '';
        this.permissions = readStoredPermissions();
        this.closeSidebarOnMobile();
      }
    });
  }

  ngAfterViewInit() {
    this.applyThemeAndStyles();
  }

  private initializeCollapsedStates(): void {
    const url = this.router.url;
    this.isCollapsed = !url.includes('doctors');
    this.Pagecollapse = !url.includes('pages');
    this.PaymentCollapsed = !url.includes('payments');
    this.RoomCollapsed = !url.includes('room-allotment');
    this.PatientCollapsed = !url.includes('patients');
    this.PharmacyCollapsed = !(url.includes('pharmacy') || url.includes('pos-reports'));
  }

  private normalizeRole(role: string): string {
    return role.trim().replace(/[\s_-]/g, '').toLowerCase();
  }

  private hasPermission(permission: string): boolean {
    return this.hasWildcardPermission || this.permissions.includes(permission);
  }

  private applyThemeAndStyles(): void {
    setTimeout(() => {
      this.setThemeColor();
      this.applySidebarClass();
      this.applyGradientClasses();
    });
  }

  private setThemeColor(): void {
    const url = this.router.url;
    if (url.includes('cryptocurrency')) {
      this.app.themeColor('o');
    } else if (url.includes('campaign')) {
      this.app.themeColor('b');
    } else if (url.includes('ecommerce')) {
      this.app.themeColor('a');
    } else {
      this.app.themeColor('g');
    }
  }

  private applySidebarClass(): void {
    const sidebar = document.getElementById('left-sidebar');
    const sidebarPref = sessionStorage.getItem('Sidebar');

    if (sidebarPref) {
      sidebar?.classList.add(sidebarPref);
    } else {
      sidebar?.classList.remove('light_active');
    }
  }

  private applyGradientClasses(): void {
    const colorElements = document.getElementsByClassName('theme-bg');
    const gradientPref = sessionStorage.getItem('GradientColor');

    Array.from(colorElements).forEach((element) => {
      if (gradientPref) {
        element.classList.add('gradient');
      } else {
        element.classList.remove('gradient');
      }
    });
  }

  showDropDown(): void {
    document.getElementById('drp')?.classList.toggle('ShowDiv');
  }

  openChangePasswordModal(): void {
    this.resetChangePasswordForm();
    this.changePasswordModalOpen = true;
    document.getElementById('drp')?.classList.remove('ShowDiv');
  }

  closeChangePasswordModal(): void {
    if (this.changePasswordLoading) {
      return;
    }

    this.changePasswordModalOpen = false;
    this.resetChangePasswordForm();
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  changePassword(): void {
    if (!this.currentPassword || !this.newPassword) {
      this.toaster.error('Current password and new password are required.');
      return;
    }

    if (this.currentPassword.length < 8 || this.newPassword.length < 8) {
      this.toaster.error('Passwords must be at least 8 characters.');
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.toaster.error('New password must be different from current password.');
      return;
    }

    this.changePasswordLoading = true;
    this.backend
      .changePass({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .pipe(finalize(() => (this.changePasswordLoading = false)))
      .subscribe({
        next: (response) => {
          this.toaster.success(response.message || 'Password changed successfully.');
          this.changePasswordModalOpen = false;
          this.resetChangePasswordForm();
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to change password.');
        },
      });
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.changePasswordModalOpen) {
      this.closeChangePasswordModal();
    }
  }

  toggleMenu(): void {
    document.body.classList.toggle('toggle_menu_active');
  }

  cToggoleMenu(): void {
    document.body.classList.remove('offcanvas-active');
    document.querySelector('.overlay')?.classList.toggle('open');
  }

  private closeSidebarOnMobile(): void {
    const width = window.innerWidth;
    if (width < 768) {
      document.body.classList.remove('offcanvas-active');
      const getCalss = document.querySelector('.offcanvas-active');
      if (document.body.contains(getCalss)) {
        document.querySelector('.overlay')?.classList.toggle('open');
      }
    }
  }

  private resetChangePasswordForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
  }
}
