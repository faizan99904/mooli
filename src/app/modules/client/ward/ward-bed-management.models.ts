export type WardBedStatus =
  | 'available'
  | 'occupied'
  | 'on_hold'
  | 'cleaning'
  | 'maintenance'
  | 'blocked';

export type WardRoomType =
  | 'general'
  | 'private'
  | 'icu'
  | 'isolation'
  | 'recovery';

export type WardBedType = 'standard' | 'pediatric' | 'icu' | 'isolation' | 'attendant' | 'emergency';

export interface WardGalleryOption {
  id: string;
  label: string;
}

export interface WardRoomRecord {
  id: string;
  wardId: string;
  wardName: string;
  galleryId: string;
  galleryName: string;
  roomName: string;
  roomType: WardRoomType;
  capacity: number;
  dailyCharge: number;
  floor: string;
  description: string;
  occupiedBeds: number;
  availableBeds: number;
  cleaningBeds: number;
  maintenanceBeds: number;
  onHoldBeds: number;
  status: 'active' | 'maintenance';
}

export interface WardBedRecord {
  id: string;
  roomId: string;
  bedNo: string;
  bedType: WardBedType;
  status: WardBedStatus;
  patientId?: string;
  admissionId?: string;
  patientName?: string;
  age?: number;
  sex?: 'M' | 'F';
  nurseId?: string;
  nurseName?: string;
  occupiedSince?: string;
  dailyCharge: number;
  notes?: string;
}

export interface WardBedManagementFilters {
  ward: string;
  gallery: string;
  roomType: string;
  bedStatus: string;
  search: string;
  date: string;
}

export type WardBedModalMode = 'add' | 'edit';
export type WardRoomModalMode = 'add' | 'edit';
