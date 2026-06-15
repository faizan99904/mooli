import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppDialogService } from '../../../../core/services/app-dialog.service';
import { BackendService } from '../../../../core/services/backend.service';
import { RoomAllotment } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-alloted-rooms',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './alloted-rooms.component.html',
  styleUrl: './alloted-rooms.component.scss',
})
export class AllotedRoomsComponent implements OnInit {
  allotments: RoomAllotment[] = [];
  loading = false;
  status = '';
  page = 1;
  limit = 10;
  totalPages = 0;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private dialog: AppDialogService
  ) {}

  ngOnInit(): void {
    this.loadAllotments();
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  loadAllotments(): void {
    this.loading = true;
    this.backend
      .getRoomAllotments({
        page: this.page,
        limit: this.limit,
        status: this.status,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.allotments = result.items;
          this.totalPages = result.pagination.totalPages;
        },
        error: (err) => {
          this.allotments = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  async discharge(allotment: RoomAllotment): Promise<void> {
    if (!this.can('room_allotments.update')) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Discharge Patient',
      message: 'Discharge this patient from the room? You can still review the allotment record later.',
      confirmText: 'Discharge',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.backend
      .dischargeRoomAllotment(allotment._id, { dischargedAt: new Date().toISOString() })
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.loadAllotments();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Something went wrong'),
      });
  }

  patientName(allotment: RoomAllotment): string {
    const patient = allotment.patient;
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadAllotments();
  }
}
