export type WardBedStatus =
  | 'occupied'
  | 'available'
  | 'on_hold'
  | 'cleaning'
  | 'maintenance'
  | 'critical';

export type WardBedClinicalStatus = 'stable' | 'critical' | 'observation' | 'discharge_pending';

export type WardBedAlertType = 'none' | 'warning' | 'critical';

export interface WardKpiCard {
  key: string;
  label: string;
  value: number;
  percent?: number;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal';
  route?: string;
}

export interface WardBed {
  bedNo: string;
  roomId?: string;
  roomNo?: string;
  roomType?: string;
  patientId?: string;
  wardName?: string;
  galleryName?: string;
  patientName?: string;
  patientNo?: string;
  age?: number;
  sex?: 'M' | 'F';
  nurseName?: string;
  doctorName?: string;
  admittedAt?: string;
  diagnosis?: string;
  clinicalStatus?: WardBedClinicalStatus;
  vitalsSummary?: string;
  ivRunningLabel?: string;
  medicinesDue?: number;
  vitalsDue?: number;
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

export type WardRoomStatusFilter =
  | 'all'
  | 'available'
  | 'occupied'
  | 'cleaning'
  | 'maintenance'
  | 'critical'
  | 'icu'
  | 'private'
  | 'general'
  | 'discharge_pending';

export interface TodaySummaryRow {
  label: string;
  value: number;
  route?: string;
}

export interface WardAlertRow {
  label: string;
  value: number;
  route?: string;
  tone: 'green' | 'amber' | 'red' | 'gray' | 'purple';
}

export interface WardTaskRow {
  time: string;
  label: string;
  route?: string;
}

export interface NursingSummaryRow {
  label: string;
  value: number;
  tone: 'green' | 'amber' | 'gray' | 'red' | 'purple';
  route?: string;
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

export interface WardWorkflowTab {
  key: string;
  label: string;
  route: string;
  icon: string;
}
