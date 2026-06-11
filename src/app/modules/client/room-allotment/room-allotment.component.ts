import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { Room } from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-room-allotment',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './room-allotment.component.html',
  styleUrl: './room-allotment.component.scss',
})
export class RoomAllotmentComponent implements OnInit {
  rooms: Room[] = [];
  roomForm: FormGroup;
  loading = false;
  saving = false;
  status = '';
  roomType = '';
  search = '';
  editingId: string | null = null;
  page = 1;
  limit = 10;
  totalPages = 0;
  roomTypes = ['general', 'private', 'icu', 'emergency', 'operation_theater'];

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService
  ) {
    this.roomForm = this.fb.group({
      roomNo: ['', Validators.required],
      roomType: ['private', Validators.required],
      floor: [''],
      chargesPerDay: [0],
      status: ['available', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadRooms();
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  get canManageRooms(): boolean {
    return this.can('rooms.create') || this.can('rooms.update');
  }

  loadRooms(): void {
    this.loading = true;
    this.backend
      .getRooms({
        page: this.page,
        limit: this.limit,
        search: this.search,
        roomType: this.roomType,
        status: this.status,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.rooms = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.rooms = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  submitRoom(): void {
    if (!this.editingId && !this.can('rooms.create')) {
      this.toastr.error('You do not have permission to create rooms.');
      return;
    }

    if (this.editingId && !this.can('rooms.update')) {
      this.toastr.error('You do not have permission to update rooms.');
      return;
    }

    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }

    const value = this.roomForm.value;
    const payload: Record<string, unknown> = {
      ...value,
      chargesPerDay: Number(value.chargesPerDay || 0),
    };

    this.saving = true;
    const request$ = this.editingId
      ? this.backend.updateRoom(this.editingId, payload)
      : this.backend.createRoom(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.resetForm();
        this.loadRooms();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  editRoom(room: Room): void {
    if (!this.can('rooms.update')) {
      return;
    }

    this.editingId = room._id;
    this.roomForm.patchValue(room);
  }

  deleteRoom(id: string): void {
    if (!this.can('rooms.delete')) {
      return;
    }

    if (!confirm('Delete this room?')) {
      return;
    }

    this.backend.deleteRoom(id).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.loadRooms();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.roomForm.reset({
      roomNo: '',
      roomType: 'private',
      floor: '',
      chargesPerDay: 0,
      status: 'available',
    });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadRooms();
  }
}
