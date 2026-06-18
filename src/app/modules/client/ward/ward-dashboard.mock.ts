import {
  MonitoringCard,
  NursingSummaryRow,
  TodaySummaryRow,
  WardKpiCard,
  WardSection,
} from './ward-dashboard.models';

/** TODO: Replace with API integration via WardDashboardService when backend endpoints are available. */
export const WARD_OPTIONS = ['Peads Ward', 'General Ward', 'ICU Ward', 'Private Ward'];

export const SHIFT_OPTIONS = [
  { value: 'day', label: 'Day Shift (08 AM - 02 PM)' },
  { value: 'evening', label: 'Evening Shift (02 PM - 08 PM)' },
  { value: 'night', label: 'Night Shift (08 PM - 08 AM)' },
];

export function getWardKpiCards(): WardKpiCard[] {
  return [
    { key: 'total', label: 'Total Beds', value: 60, icon: 'fa-bed', tone: 'blue' },
    { key: 'occupied', label: 'Occupied Beds', value: 42, percent: 70, icon: 'fa-user', tone: 'green' },
    { key: 'available', label: 'Available Beds', value: 14, percent: 23, icon: 'fa-check-circle', tone: 'blue' },
    { key: 'on_hold', label: 'On Hold', value: 2, percent: 3, icon: 'fa-pause-circle', tone: 'amber' },
    { key: 'cleaning', label: 'Cleaning', value: 1, percent: 2, icon: 'fa-shower', tone: 'purple' },
    { key: 'maintenance', label: 'Maintenance', value: 1, percent: 2, icon: 'fa-wrench', tone: 'red' },
    { key: 'nurses', label: 'Nurses On Duty', value: 12, icon: 'fa-user-md', tone: 'teal' },
    { key: 'alerts', label: 'Critical Alerts', value: 2, icon: 'fa-exclamation-triangle', tone: 'red' },
  ];
}

export function getWardBedSections(): WardSection[] {
  return [
    {
      sectionName: 'Gallery A',
      subtitle: 'General Ward - Male',
      beds: [
        { bedNo: 'A-1', patientName: 'Zahan Baig', age: 24, sex: 'M', nurseName: 'Ayesha', status: 'occupied', admissionId: 'adm-a1' },
        { bedNo: 'A-2', patientName: 'Ali Raza', age: 31, sex: 'M', nurseName: 'Imran', status: 'occupied', admissionId: 'adm-a2' },
        { bedNo: 'A-3', status: 'available' },
        { bedNo: 'A-4', patientName: 'Ahmed Khan', age: 45, sex: 'M', nurseName: 'Fahim', status: 'occupied', admissionId: 'adm-a4' },
        { bedNo: 'A-5', status: 'on_hold' },
        { bedNo: 'A-6', status: 'cleaning' },
      ],
    },
    {
      sectionName: 'Gallery B',
      subtitle: 'General Ward - Female',
      beds: [
        { bedNo: 'B-1', patientName: 'Sara Fatima', age: 28, sex: 'F', nurseName: 'Sana', status: 'occupied', admissionId: 'adm-b1' },
        { bedNo: 'B-2', patientName: 'Maria Bibi', age: 41, sex: 'F', nurseName: 'Hina', status: 'occupied', admissionId: 'adm-b2' },
        { bedNo: 'B-3', status: 'available' },
        { bedNo: 'B-4', status: 'available' },
        { bedNo: 'B-5', status: 'on_hold' },
        { bedNo: 'B-6', status: 'available' },
      ],
    },
    {
      sectionName: 'Private Rooms',
      subtitle: 'Private Ward',
      beds: [
        { bedNo: 'PR-201', patientName: 'Amina Noor', age: 50, sex: 'F', nurseName: 'Marwa', status: 'occupied', admissionId: 'adm-pr201' },
        { bedNo: 'PR-202', patientName: 'Nadeem Akhtar', age: 60, sex: 'M', nurseName: 'Imran', status: 'occupied', admissionId: 'adm-pr202' },
        { bedNo: 'PR-203', status: 'available' },
        { bedNo: 'PR-204', status: 'on_hold', alertType: 'warning' },
        { bedNo: 'PR-205', status: 'maintenance', alertType: 'critical' },
        { bedNo: 'PR-206', status: 'available' },
      ],
    },
    {
      sectionName: 'ICU',
      subtitle: 'Intensive Care Unit',
      beds: [
        { bedNo: 'ICU-1', patientName: 'Hamza Ali', age: 55, sex: 'M', nurseName: 'Sana', status: 'occupied', admissionId: 'adm-icu1' },
        { bedNo: 'ICU-2', patientName: 'Yasir Ahmed', age: 62, sex: 'M', nurseName: 'Fahim', status: 'occupied', admissionId: 'adm-icu2' },
        { bedNo: 'ICU-3', patientName: 'Rashid Khan', age: 68, sex: 'M', nurseName: 'Ayesha', status: 'occupied', admissionId: 'adm-icu3' },
        { bedNo: 'ICU-4', status: 'available' },
      ],
    },
  ];
}

export function getTodaySummaryRows(): TodaySummaryRow[] {
  return [
    { label: 'Admissions', value: 3 },
    { label: 'Discharges', value: 2 },
    { label: 'Pending Medications', value: 12, route: '/ward/mar' },
    { label: 'Vitals Due', value: 8, route: '/ward/vitals' },
    { label: 'Drips Running', value: 6, route: '/ward/drips-iv' },
    { label: 'Nursing Tasks Due', value: 10, route: '/ward/nursing-care' },
    { label: 'Critical Alerts', value: 2, route: '/ward/reports' },
  ];
}

export function getNursingSummaryRows(): NursingSummaryRow[] {
  return [
    { label: 'On Duty', value: 12, tone: 'green' },
    { label: 'On Break', value: 2, tone: 'amber' },
    { label: 'Off Duty', value: 2, tone: 'gray' },
  ];
}

export function getMonitoringCards(): MonitoringCard[] {
  return [
    { key: 'admissions', label: 'Today Admissions', value: 3, actionLabel: 'View List', route: '/ward/admissions', icon: 'fa-user-plus', tone: 'blue' },
    { key: 'medications', label: 'Pending Medications', value: 12, actionLabel: 'View MAR', route: '/ward/mar', icon: 'fa-medkit', tone: 'green' },
    { key: 'vitals', label: 'Vitals Due', value: 8, actionLabel: 'View List', route: '/ward/vitals', icon: 'fa-heartbeat', tone: 'teal' },
    { key: 'drips', label: 'Drips Running', value: 6, actionLabel: 'View List', route: '/ward/drips-iv', icon: 'fa-tint', tone: 'blue' },
    { key: 'tasks', label: 'Nursing Tasks Due', value: 10, actionLabel: 'View Tasks', route: '/ward/nursing-care', icon: 'fa-tasks', tone: 'amber' },
    { key: 'alerts', label: 'Critical Alerts', value: 2, actionLabel: 'View Alerts', route: '/ward/reports', icon: 'fa-exclamation-triangle', tone: 'red' },
  ];
}
