import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Patient, Room } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-add-allotment',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './add-allotment.component.html',
  styleUrl: './add-allotment.component.scss',
})
export class AddAllotmentComponent implements OnInit {
  allotmentForm: FormGroup;
  rooms: Room[] = [];
  selectedRoom: Room | null = null;
  prefilledWardName = '';
  currentHospitalId: string | null = null;
  saving = false;
  roomsLoading = false;
  patientSearchQuery = '';
  patientLookupLoading = false;
  patientLookupPerformed = false;
  matchedPatients: Patient[] = [];
  selectedPatient: Patient | null = null;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.allotmentForm = this.fb.group({
      roomId: ['', Validators.required],
      bedLabel: [''],
      admittedAt: [this.currentDateTimeLocalValue()],
      notes: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as { hospitalId?: string | null } | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.prefilledWardName = String(this.route.snapshot.queryParamMap.get('wardName') || '').trim();

    const bedNo = String(this.route.snapshot.queryParamMap.get('bedNo') || '').trim();
    if (bedNo) {
      this.allotmentForm.patchValue({ bedLabel: bedNo });
    }

    this.allotmentForm.get('roomId')?.valueChanges.subscribe((roomId) => {
      this.selectedRoom = this.rooms.find((room) => room._id === roomId) || this.selectedRoom;
    });

    this.loadRooms();
  }

  private currentDateTimeLocalValue(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  get addPatientQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};

    if (this.selectedRoom?._id) {
      params['roomId'] = this.selectedRoom._id;
    }

    if (this.patientSearchQuery.trim()) {
      params['phone'] = this.patientSearchQuery.trim();
    }

    return params;
  }

  get selectableRooms(): Room[] {
    return [...this.rooms].sort((left, right) => {
      if (left.status === 'available' && right.status !== 'available') {
        return -1;
      }

      if (right.status === 'available' && left.status !== 'available') {
        return 1;
      }

      return left.roomNo.localeCompare(right.roomNo, undefined, { numeric: true });
    });
  }

  private loadRooms(): void {
    const preselectedRoomId = String(this.route.snapshot.queryParamMap.get('roomId') || '').trim();

    this.roomsLoading = true;
    this.backend
      .getRooms({ limit: 100 })
      .pipe(finalize(() => (this.roomsLoading = false)))
      .subscribe({
        next: (result) => {
          this.rooms = result.items || [];

          if (preselectedRoomId) {
            this.ensurePreselectedRoom(preselectedRoomId);
            return;
          }

          const firstAvailable = this.rooms.find((room) => room.status === 'available');
          if (firstAvailable) {
            this.setSelectedRoom(firstAvailable);
          }
        },
        error: (err) => {
          this.rooms = [];
          this.toastr.error(err?.error?.message || 'Unable to load rooms.');
        },
      });
  }

  private ensurePreselectedRoom(roomId: string): void {
    const existing = this.rooms.find((room) => room._id === roomId);
    if (existing) {
      this.setSelectedRoom(existing);
      return;
    }

    this.backend.getRoom(roomId).subscribe({
      next: (room) => {
        if (!this.rooms.some((item) => item._id === room._id)) {
          this.rooms = [room, ...this.rooms];
        }
        this.setSelectedRoom(room);
      },
      error: () => this.toastr.error('Unable to load selected room.'),
    });
  }

  private setSelectedRoom(room: Room): void {
    this.selectedRoom = room;
    this.allotmentForm.patchValue({ roomId: room._id }, { emitEvent: false });

    if (!this.allotmentForm.get('bedLabel')?.value) {
      this.allotmentForm.patchValue({ bedLabel: room.roomNo });
    }
  }

  onRoomChange(roomId: string): void {
    this.selectedRoom = this.rooms.find((room) => room._id === roomId) || null;
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  patientSummary(patient: Patient): string {
    const parts = [patient.patientNo || '', patient.phone || ''].filter(Boolean);
    return parts.join(' · ');
  }

  roomTypeLabel(roomType?: string | null): string {
    return String(roomType || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  roomStatusLabel(status?: string | null): string {
    return String(status || 'available')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  roomWardName(room?: Room | null): string {
    if (!room) {
      return this.prefilledWardName || '-';
    }

    return this.prefilledWardName || room.ward?.name || '-';
  }

  roomFloorLabel(room?: Room | null): string {
    if (!room) {
      return '-';
    }

    return room.floorRecord?.label || room.floorRecord?.name || room.floor || '-';
  }

  roomOptionLabel(room: Room): string {
    return `${room.roomNo} - ${this.roomTypeLabel(room.roomType)} - ${this.roomStatusLabel(room.status)} - ${room.chargesPerDay}/day`;
  }

  canSearchPatients(): boolean {
    return this.patientSearchQuery.trim().length >= 2 && !this.patientLookupLoading;
  }

  lookupPatients(): void {
    const query = this.patientSearchQuery.trim();

    if (query.length < 2) {
      this.toastr.error('Enter at least 2 characters to search by name, patient number, or phone.');
      return;
    }

    this.patientLookupLoading = true;
    this.patientLookupPerformed = false;
    this.matchedPatients = [];
    this.selectedPatient = null;

    this.backend
      .getPatients({ limit: 100, status: 'active', search: query })
      .pipe(finalize(() => (this.patientLookupLoading = false)))
      .subscribe({
        next: (result) => {
          this.matchedPatients = result.items || [];
          this.patientLookupPerformed = true;

          if (this.matchedPatients.length === 0) {
            this.toastr.info('No patient found for this search.');
          }
        },
        error: (err) => {
          this.patientLookupPerformed = true;
          this.toastr.error(err?.error?.message || 'Unable to search patients.');
        },
      });
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    (document.activeElement as HTMLElement | null)?.blur();
  }

  clearSelectedPatient(): void {
    this.selectedPatient = null;
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  submitAllotment(): void {
    if (!this.can('room_allotments.create')) {
      this.toastr.error('You do not have permission to create room allotments.');
      return;
    }

    if (!this.selectedPatient?._id) {
      this.toastr.error('Please search and select a patient.');
      return;
    }

    if (this.allotmentForm.invalid) {
      this.allotmentForm.markAllAsTouched();
      this.toastr.error('Please select a room before saving.');
      return;
    }

    const value = this.allotmentForm.getRawValue();
    const payload: Record<string, unknown> = {
      patientId: this.selectedPatient._id,
      roomId: value.roomId,
      admittedAt: value.admittedAt ? new Date(value.admittedAt).toISOString() : undefined,
      notes: value.notes || undefined,
      bedLabel: String(value.bedLabel || '').trim() || undefined,
    };

    if (this.currentHospitalId) {
      payload['hospitalId'] = this.currentHospitalId;
    }

    this.saving = true;
    this.backend
      .createRoomAllotment(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.router.navigateByUrl('/room-allotment/alloted-rooms');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save room allotment.'),
      });
  }
}
