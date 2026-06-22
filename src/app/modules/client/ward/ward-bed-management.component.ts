import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  WardBedManagementFilters,
  WardBedRecord,
  WardBedStatus,
  WardBedType,
  WardGalleryOption,
  WardRoomRecord,
  WardRoomType,
} from './ward-bed-management.models';
import { HospitalWard, WardFloor } from '../../../shared/models/hospital.model';
import { WardDataService } from './services/ward-data.service';

type ActiveModal = 'ward' | 'floor' | 'room' | 'bed' | 'status' | 'viewBed' | null;

@Component({
  selector: 'app-ward-bed-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ward-bed-management.component.html',
  styleUrl: './ward-bed-management.component.scss',
})
export class WardBedManagementComponent implements OnInit {
  loading = false;
  rooms: WardRoomRecord[] = [];
  beds: WardBedRecord[] = [];
  selectedRoomId = '';
  activeModal: ActiveModal = null;
  roomModalMode: 'add' | 'edit' = 'add';
  bedModalMode: 'add' | 'edit' = 'add';
  selectedBed: WardBedRecord | null = null;
  statusReason = '';

  wardOptions: string[] = [];
  galleryOptions: WardGalleryOption[] = [];
  hospitalWards: HospitalWard[] = [];
  wardFloors: WardFloor[] = [];
  readonly roomTypeOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Room Types' },
    { value: 'general', label: 'General Ward' },
    { value: 'private', label: 'Private Room' },
    { value: 'icu', label: 'ICU' },
    { value: 'isolation', label: 'Isolation' },
    { value: 'recovery', label: 'Recovery' },
  ];
  readonly bedStatusOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Bed Status' },
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'blocked', label: 'Blocked' },
  ];
  readonly bedTypeOptions: WardBedType[] = ['standard', 'pediatric', 'icu', 'isolation', 'attendant', 'emergency'];
  readonly changeStatusOptions: WardBedStatus[] = ['available', 'on_hold', 'cleaning', 'maintenance', 'blocked'];

  filters: WardBedManagementFilters = {
    ward: '',
    gallery: '',
    roomType: '',
    bedStatus: '',
    search: '',
    date: new Date().toISOString().slice(0, 10),
  };

  roomForm: FormGroup;
  bedForm: FormGroup;
  statusForm: FormGroup;
  wardForm: FormGroup;
  floorForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private wardData: WardDataService
  ) {
    this.roomForm = this.fb.group({
      wardId: ['', Validators.required],
      floorId: ['', Validators.required],
      roomName: ['', Validators.required],
      roomType: ['general', Validators.required],
      capacity: [1, [Validators.required, Validators.min(1)]],
      dailyCharge: [0, [Validators.required, Validators.min(0)]],
      description: [''],
    });

    this.bedForm = this.fb.group({
      wardId: ['', Validators.required],
      floorId: ['', Validators.required],
      roomId: ['', Validators.required],
      bedNo: ['', Validators.required],
      bedType: ['standard', Validators.required],
      status: ['available', Validators.required],
      dailyCharge: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
    });

    this.wardForm = this.fb.group({
      name: ['', Validators.required],
      code: [''],
      description: [''],
    });

    this.floorForm = this.fb.group({
      wardId: ['', Validators.required],
      name: ['', Validators.required],
      label: [''],
    });

    this.statusForm = this.fb.group({
      status: ['available', Validators.required],
      reason: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  get filteredRooms(): WardRoomRecord[] {
    const query = this.filters.search.trim().toLowerCase();
    return this.rooms.filter((room) => {
      const matchesWard = !this.filters.ward || room.wardName === this.filters.ward;
      const matchesGallery = !this.filters.gallery || room.galleryId === this.filters.gallery;
      const matchesRoomType = !this.filters.roomType || room.roomType === this.filters.roomType;
      const matchesSearch =
        !query ||
        [room.roomName, room.galleryName, room.floor, room.description].join(' ').toLowerCase().includes(query);
      return matchesWard && matchesGallery && matchesRoomType && matchesSearch;
    });
  }

  get roomsForBedForm(): WardRoomRecord[] {
    const wardId = String(this.bedForm.get('wardId')?.value || '');
    const floorId = String(this.bedForm.get('floorId')?.value || '');
    return this.rooms.filter((room) => {
      const matchesWard = !wardId || room.wardId === wardId;
      const matchesFloor = !floorId || room.galleryId === floorId;
      return matchesWard && matchesFloor;
    });
  }

  get floorsForSelectedWard(): WardFloor[] {
    const wardId = String(this.selectedWardId || '');
    return this.wardFloors.filter((floor) => !wardId || floor.wardId === wardId);
  }

  get selectedWardId(): string {
    return this.hospitalWards.find((ward) => ward.name === this.filters.ward)?._id || this.hospitalWards[0]?._id || '';
  }

  get selectedRoom(): WardRoomRecord | null {
    return this.rooms.find((room) => room.id === this.selectedRoomId) || this.filteredRooms[0] || null;
  }

  get roomBeds(): WardBedRecord[] {
    if (!this.selectedRoom) {
      return [];
    }

    const query = this.filters.search.trim().toLowerCase();
    return this.beds
      .filter((bed) => bed.roomId === this.selectedRoom?.id)
      .filter((bed) => !this.filters.bedStatus || bed.status === this.filters.bedStatus)
      .filter((bed) => {
        if (!query) {
          return true;
        }

        return [bed.bedNo, bed.patientName, bed.nurseName, bed.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      });
  }

  get canDeleteSelectedRoom(): boolean {
    return Boolean(this.selectedRoom && this.selectedRoom.occupiedBeds === 0);
  }

  loadData(): void {
    this.loading = true;
    this.wardData.loadBedManagement(this.filters.ward).subscribe({
      next: (data) => {
        this.wardOptions = data.wardOptions;
        this.hospitalWards = data.hospitalWards;
        this.wardFloors = data.wardFloors;
        if (!this.filters.ward && this.wardOptions.length) {
          this.filters.ward = this.wardOptions[0];
        }

        this.rooms = data.rooms;
        this.beds = data.beds;
        this.galleryOptions = data.floorOptions.length ? data.floorOptions : this.buildGalleryOptions(this.rooms);
        if (!this.filters.gallery && this.galleryOptions.length) {
          this.filters.gallery = this.galleryOptions[0].id;
        }

        this.recalculateRoomCounts();
        this.selectedRoomId = this.filteredRooms[0]?.id || '';
        this.loading = false;
      },
      error: () => {
        this.rooms = [];
        this.beds = [];
        this.loading = false;
        this.toastr.error('Failed to load bed management data.');
      },
    });
  }

  onWardFilterChange(): void {
    this.loadData();
  }

  refresh(): void {
    this.loadData();
    this.toastr.success('Bed management data refreshed.');
  }

  selectRoom(roomId: string): void {
    this.selectedRoomId = roomId;
  }

  openAddWard(): void {
    this.wardForm.reset({ name: '', code: '', description: '' });
    this.activeModal = 'ward';
  }

  saveWard(): void {
    if (this.wardForm.invalid) {
      this.wardForm.markAllAsTouched();
      return;
    }

    const value = this.wardForm.getRawValue();
    this.wardData.createHospitalWard({
      name: value.name,
      code: value.code || undefined,
      description: value.description || undefined,
    }).subscribe({
      next: (response) => {
        const createdName = String(response?.data?.name || value.name || '').trim();
        if (createdName) {
          this.filters.ward = createdName;
        }
        this.toastr.success('Ward created successfully.');
        this.closeModal();
        this.loadData();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Failed to create ward.'),
    });
  }

  openAddFloor(): void {
    this.floorForm.reset({
      wardId: this.selectedWardId,
      name: '',
      label: '',
    });
    this.activeModal = 'floor';
  }

  saveFloor(): void {
    if (this.floorForm.invalid) {
      this.floorForm.markAllAsTouched();
      return;
    }

    const value = this.floorForm.getRawValue();
    this.wardData.createWardFloor(String(value.wardId), {
      name: value.name,
      label: value.label || undefined,
    }).subscribe({
      next: (response) => {
        const ward = this.hospitalWards.find((item) => item._id === value.wardId);
        if (ward?.name) {
          this.filters.ward = ward.name;
        }
        const floorId = String(response?.data?._id || '');
        if (floorId) {
          this.filters.gallery = floorId;
        }
        this.toastr.success('Floor created successfully.');
        this.closeModal();
        this.loadData();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Failed to create floor.'),
    });
  }

  openAddRoom(): void {
    const wardId = this.selectedWardId;
    const floors = this.floorsForWardId(wardId);
    const floorId = floors[0]?._id || this.filters.gallery || this.galleryOptions[0]?.id || '';
    this.roomModalMode = 'add';
    this.roomForm.reset({
      wardId,
      floorId,
      roomName: '',
      roomType: 'general',
      capacity: 1,
      dailyCharge: 2500,
      description: '',
    });
    this.activeModal = 'room';
  }

  openEditRoom(): void {
    const room = this.selectedRoom;
    if (!room) {
      return;
    }

    this.roomModalMode = 'edit';
    this.roomForm.reset({
      wardId: room.wardId,
      floorId: room.galleryId,
      roomName: room.roomName,
      roomType: room.roomType,
      capacity: room.capacity,
      dailyCharge: room.dailyCharge,
      description: room.description,
    });
    this.activeModal = 'room';
  }

  openAddBed(): void {
    const wardId = this.selectedWardId;
    const floorId = this.filters.gallery || this.galleryOptions[0]?.id || '';
    this.bedModalMode = 'add';
    this.bedForm.reset({
      wardId,
      floorId,
      roomId: this.selectedRoom?.id || '',
      bedNo: '',
      bedType: 'standard',
      status: 'available',
      dailyCharge: this.selectedRoom?.dailyCharge || 2500,
      notes: '',
    });
    this.syncBedFormRoomSelection();
    this.activeModal = 'bed';
  }

  openEditBed(bed: WardBedRecord): void {
    this.bedModalMode = 'edit';
    this.selectedBed = bed;
    const room = this.rooms.find((item) => item.id === bed.roomId);
    this.bedForm.reset({
      wardId: room?.wardId || this.selectedWardId,
      floorId: room?.galleryId || this.filters.gallery,
      roomId: bed.roomId,
      bedNo: bed.bedNo,
      bedType: bed.bedType,
      status: bed.status,
      dailyCharge: bed.dailyCharge,
      notes: bed.notes || '',
    });
    this.syncBedFormRoomSelection();
    this.activeModal = 'bed';
  }

  onBedFormPlacementChange(): void {
    this.syncBedFormRoomSelection();
  }

  onRoomFormWardChange(): void {
    const floors = this.floorsForRoomForm();
    this.roomForm.patchValue({ floorId: floors[0]?._id || '' });
  }

  onBedFormWardChange(): void {
    const wardId = String(this.bedForm.get('wardId')?.value || '');
    const floors = this.floorsForWardId(wardId);
    this.bedForm.patchValue({ floorId: floors[0]?._id || '' });
    this.syncBedFormRoomSelection();
  }

  floorsForWardId(wardId: string): WardFloor[] {
    return this.wardFloors.filter((floor) => floor.wardId === wardId);
  }

  floorsForRoomForm(): WardFloor[] {
    return this.floorsForWardId(String(this.roomForm.get('wardId')?.value || ''));
  }

  floorsForBedForm(): WardFloor[] {
    return this.floorsForWardId(String(this.bedForm.get('wardId')?.value || ''));
  }

  private syncBedFormRoomSelection(): void {
    const rooms = this.roomsForBedForm;
    const currentRoomId = String(this.bedForm.get('roomId')?.value || '');
    const stillValid = rooms.some((room) => room.id === currentRoomId);
    if (!stillValid) {
      this.bedForm.patchValue({ roomId: rooms[0]?.id || '' });
    }
  }

  openChangeStatus(bed: WardBedRecord): void {
    this.selectedBed = bed;
    this.statusForm.reset({
      status: bed.status === 'occupied' ? 'on_hold' : bed.status,
      reason: '',
    });
    this.activeModal = 'status';
  }

  openViewBed(bed: WardBedRecord): void {
    if (bed.status === 'occupied' && bed.admissionId) {
      void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
      return;
    }

    this.selectedBed = bed;
    this.activeModal = 'viewBed';
  }

  closeModal(): void {
    this.activeModal = null;
    this.selectedBed = null;
    this.statusReason = '';
  }

  saveRoom(): void {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }

    const value = this.roomForm.getRawValue();
    if (!this.floorsForRoomForm().length) {
      this.toastr.error('Pehle is ward ke liye floor add karein.');
      return;
    }

    const payload = this.wardData.buildRoomPayload({
      roomName: value.roomName,
      roomType: value.roomType,
      wardId: value.wardId,
      floorId: value.floorId,
      dailyCharge: Number(value.dailyCharge),
    });

    if (this.roomModalMode === 'add') {
      this.wardData.createRoom(payload).subscribe({
        next: () => {
          this.toastr.success('Room added successfully.');
          this.closeModal();
          this.loadData();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Failed to create room.'),
      });
      return;
    }

    const room = this.selectedRoom;
    if (!room) {
      return;
    }

    this.wardData.updateRoom(room.id, payload).subscribe({
      next: () => {
        this.toastr.success('Room updated successfully.');
        this.closeModal();
        this.loadData();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Failed to update room.'),
    });
  }

  saveBed(): void {
    if (this.bedForm.invalid) {
      this.bedForm.markAllAsTouched();
      return;
    }

    const value = this.bedForm.getRawValue();
    const room = this.rooms.find((item) => item.id === value.roomId);
    if (!room) {
      this.toastr.error('Select a valid room.');
      return;
    }

    const payload: Record<string, unknown> = {
      roomId: value.roomId,
      bedNo: value.bedNo,
      bedType: value.bedType,
      status: value.status,
      dailyCharge: Number(value.dailyCharge),
      notes: value.notes || '',
    };

    const request$ =
      this.bedModalMode === 'add'
        ? this.wardData.createWardBed(payload)
        : this.wardData.updateWardBed(this.selectedBed?.id || '', payload);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.bedModalMode === 'add' ? 'Bed added successfully.' : 'Bed updated successfully.');
        this.closeModal();
        this.loadData();
      },
      error: () => this.toastr.error('Failed to save bed.'),
    });
  }

  saveBedStatus(): void {
    if (!this.selectedBed || this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      return;
    }

    const nextStatus = this.statusForm.get('status')?.value as WardBedStatus;

    if (this.selectedBed.status === 'occupied') {
      this.toastr.error('Occupied beds cannot be changed from this modal.');
      return;
    }

    this.wardData.updateWardBed(this.selectedBed.id, { status: nextStatus, notes: this.statusForm.get('reason')?.value || '' }).subscribe({
      next: () => {
        this.toastr.success('Bed status updated.');
        this.closeModal();
        this.loadData();
      },
      error: () => this.toastr.error('Failed to update bed status.'),
    });
  }

  deleteRoom(): void {
    const room = this.selectedRoom;
    if (!room) {
      return;
    }

    if (room.occupiedBeds > 0) {
      this.toastr.error('This room has occupied beds and cannot be deleted.');
      return;
    }

    this.wardData.deleteRoom(room.id).subscribe({
      next: () => {
        this.toastr.success('Room deleted successfully.');
        this.loadData();
      },
      error: () => this.toastr.error('Failed to delete room.'),
    });
  }

  private buildGalleryOptions(rooms: WardRoomRecord[]): WardGalleryOption[] {
    const galleries = new Map<string, string>();
    rooms.forEach((room) => {
      galleries.set(room.galleryId, room.galleryName);
    });
    return Array.from(galleries.entries()).map(([id, label]) => ({ id, label }));
  }

  assignPatient(bed: WardBedRecord): void {
    void this.router.navigate(['/ward/admissions'], { queryParams: { bedId: bed.id, roomId: bed.roomId } });
  }

  transferPatient(bed: WardBedRecord): void {
    void this.router.navigate(['/ward/bed-management'], { queryParams: { transferBedId: bed.id } });
    this.toastr.info(`Transfer flow for ${bed.patientName} will open in the next phase.`);
  }

  roomTypeLabel(type: WardRoomType): string {
    return this.roomTypeOptions.find((item) => item.value === type)?.label || type;
  }

  bedStatusLabel(status: WardBedStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  bedStatusClass(status: WardBedStatus): string {
    return `bed-badge--${status}`;
  }

  roomCardClass(room: WardRoomRecord): string {
    if (room.id === this.selectedRoom?.id) {
      return 'room-card--selected';
    }

    if (room.maintenanceBeds > 0) {
      return 'room-card--warning';
    }

    if (room.onHoldBeds > 0 || room.cleaningBeds > 0) {
      return 'room-card--amber';
    }

    if (room.availableBeds > room.occupiedBeds) {
      return 'room-card--green';
    }

    return '';
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatCurrency(value: number): string {
    return `Rs. ${value.toLocaleString('en-PK')}/day`;
  }

  fieldError(form: FormGroup, controlName: string, label: string): string {
    const control = form.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return `${label} is required.`;
    }

    if (control.errors['min']) {
      return `${label} must be at least ${control.errors['min'].min}.`;
    }

    return `Enter a valid ${label.toLowerCase()}.`;
  }

  isFieldInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return Boolean(control && control.invalid && control.touched);
  }

  displayValue(value?: string | number): string {
    if (value === undefined || value === null || value === '') {
      return '—';
    }

    return String(value);
  }

  private recalculateRoomCounts(): void {
    this.rooms = this.rooms.map((room) => {
      const roomBeds = this.beds.filter((bed) => bed.roomId === room.id);
      return {
        ...room,
        occupiedBeds: roomBeds.filter((bed) => bed.status === 'occupied').length,
        availableBeds: roomBeds.filter((bed) => bed.status === 'available').length,
        cleaningBeds: roomBeds.filter((bed) => bed.status === 'cleaning').length,
        maintenanceBeds: roomBeds.filter((bed) => bed.status === 'maintenance' || bed.status === 'blocked').length,
        onHoldBeds: roomBeds.filter((bed) => bed.status === 'on_hold').length,
        capacity: Math.max(room.capacity, roomBeds.length),
      };
    });
  }
}
