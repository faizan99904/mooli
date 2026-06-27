import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { User } from '../../../shared/models/hospital.model';
import { WardDataService } from '../ward/services/ward-data.service';
import { WardPatient } from '../ward/ward-patient-list.models';

@Component({
  selector: 'app-our-staff',
  imports: [CommonModule, FormsModule],
  templateUrl: './our-staff.component.html',
  styleUrl: './our-staff.component.scss'
})
export class OurStaffComponent implements OnInit {
  loading = false;
  assigning = false;
  users: User[] = [];
  patients: WardPatient[] = [];
  search = '';
  selectedNurseId = '';
  contextAdmissionId = '';
  contextPatientId = '';
  contextPatient: WardPatient | null = null;

  constructor(
    private backend: BackendService,
    private wardData: WardDataService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.contextAdmissionId = params.get('admissionId') || '';
      this.contextPatientId = params.get('patientId') || '';
      this.syncContextPatient();
    });
    this.loadData();
  }

  get isWardAssignmentMode(): boolean {
    return Boolean(this.contextAdmissionId || this.contextPatientId);
  }

  get activeUsers(): User[] {
    return this.users.filter((user) => user.status !== 'inactive');
  }

  get nurseUsers(): User[] {
    const nurses = this.activeUsers.filter((user) => this.isNurse(user));
    return nurses.length ? nurses : this.activeUsers;
  }

  get filteredUsers(): User[] {
    const query = this.search.trim().toLowerCase();
    const list = this.isWardAssignmentMode ? this.nurseUsers : this.activeUsers;
    if (!query) {
      return list;
    }
    return list.filter((user) =>
      [user.name, user.email, user.phone || '', user.role?.name || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }

  get assignedCount(): number {
    return this.patients.filter((patient) => patient.nurseName).length;
  }

  get unassignedCount(): number {
    return this.patients.filter((patient) => !patient.nurseName).length;
  }

  loadData(): void {
    this.loading = true;
    this.backend.getUsers({ context: 'hospital' }).subscribe({
      next: (users) => {
        this.users = users || [];
        this.loadPatients();
      },
      error: () => {
        this.users = [];
        this.loading = false;
        this.toastr.error('Failed to load staff.');
      },
    });
  }

  loadPatients(): void {
    this.wardData.loadAdmittedPatients('').subscribe({
      next: (patients) => {
        this.patients = patients;
        this.syncContextPatient();
        this.loading = false;
      },
      error: () => {
        this.patients = [];
        this.loading = false;
      },
    });
  }

  selectNurse(user: User): void {
    this.selectedNurseId = user._id;
  }

  assignSelectedNurse(): void {
    if (!this.contextAdmissionId) {
      this.toastr.warning('No active admission selected for nurse assignment.');
      return;
    }

    if (!this.selectedNurseId) {
      this.toastr.warning('Select a nurse first.');
      return;
    }

    this.assigning = true;
    this.wardData.assignNurse(this.contextAdmissionId, this.selectedNurseId).subscribe({
      next: () => {
        this.assigning = false;
        this.toastr.success('Nurse assigned successfully.');
        void this.router.navigate(['/ward/patient-list']);
      },
      error: (err) => {
        this.assigning = false;
        this.toastr.error(err?.error?.message || 'Failed to assign nurse.');
      },
    });
  }

  roleLabel(user: User): string {
    return user.role?.name || 'Staff';
  }

  isNurse(user: User): boolean {
    return /nurse|nursing/i.test(user.role?.name || user.name || '');
  }

  trackUser(_index: number, user: User): string {
    return user._id;
  }

  private syncContextPatient(): void {
    if (!this.patients.length) {
      return;
    }
    this.contextPatient =
      this.patients.find((patient) => patient.admissionId === this.contextAdmissionId) ||
      this.patients.find((patient) => patient.patientId === this.contextPatientId) ||
      null;
    this.selectedNurseId = this.contextPatient?.nurseId || this.selectedNurseId;
  }
}
