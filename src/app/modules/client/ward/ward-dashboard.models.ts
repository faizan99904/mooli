export type WardBedStatus =
  | 'occupied'
  | 'available'
  | 'on_hold'
  | 'cleaning'
  | 'maintenance'
  | 'critical';

export type WardBedAlertType = 'none' | 'warning' | 'critical';

export interface WardKpiCard {
  key: string;
  label: string;
  value: number;
  percent?: number;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal';
}

export interface WardBed {
  bedNo: string;
  roomId?: string;
  patientId?: string;
  wardName?: string;
  galleryName?: string;
  patientName?: string;
  age?: number;
  sex?: 'M' | 'F';
  nurseName?: string;
  status: WardBedStatus;
  admissionId?: string;
  alertType?: WardBedAlertType;
}

export interface WardBedMenuAction {
  key: string;
  label: string;
  icon: string;
}

export interface WardSection {
  sectionName: string;
  subtitle: string;
  beds: WardBed[];
}

export type WardRoomStatusFilter = 'all' | 'available' | 'occupied' | 'maintenance';

export interface TodaySummaryRow {
  label: string;
  value: number;
  route?: string;
}

export interface NursingSummaryRow {
  label: string;
  value: number;
  tone: 'green' | 'amber' | 'gray';
}

export interface MonitoringCard {
  key: string;
  label: string;
  value: number;
  actionLabel: string;
  route: string;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal';
}

export interface WardDashboardFilters {
  ward: string;
  date: string;
  shift: string;
}
