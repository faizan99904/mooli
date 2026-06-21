import {
  Doctor,
  Encounter,
  HospitalWard,
  LabOrder,
  Patient,
  PatientHistory,
  Prescription,
  Room,
  RoomAllotment,
  User,
  WardFloor,
} from '../../../../shared/models/hospital.model';
import { WardBedRecord, WardBedStatus, WardRoomRecord, WardRoomType, WardGalleryOption } from '../ward-bed-management.models';
import {
  WardBed,
  WardDashboardFilters,
  WardKpiCard,
  WardSection,
} from '../ward-dashboard.models';
import { WardModuleRow } from '../ward-module.models';
import { PatientStatus, WardPatient } from '../ward-patient-list.models';

export const ROOM_TYPE_WARD_LABELS: Record<string, string> = {
  general: 'General Ward',
  private: 'Private Ward',
  icu: 'ICU Ward',
  emergency: 'Emergency Ward',
  operation_theater: 'OT Ward',
};

export const UI_ROOM_TYPE_TO_API: Record<WardRoomType, Room['roomType']> = {
  general: 'general',
  private: 'private',
  icu: 'icu',
  isolation: 'general',
  recovery: 'private',
};

export const API_ROOM_TYPE_TO_UI: Record<Room['roomType'], WardRoomType> = {
  general: 'general',
  private: 'private',
  icu: 'icu',
  emergency: 'general',
  operation_theater: 'general',
};

export function wardNameFromRoom(room?: Room | null): string {
  if (room?.ward?.name) {
    return room.ward.name;
  }

  if (!room) {
    return 'General Ward';
  }

  return ROOM_TYPE_WARD_LABELS[room.roomType] || 'General Ward';
}

export function galleryLabelFromRoom(room?: Room | null): string {
  if (room?.floorRecord?.label) {
    return room.floorRecord.label;
  }

  if (room?.floorRecord?.name) {
    return room.floorRecord.name;
  }

  if (!room?.floor) {
    return 'Main Wing';
  }

  return `Floor ${room.floor}`;
}

export function patientFullName(patient?: Patient | null): string {
  if (!patient) {
    return 'Unknown Patient';
  }
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
}

export function patientAge(patient?: Patient | null): number {
  if (!patient?.dateOfBirth) {
    return 0;
  }
  const dob = new Date(patient.dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return 0;
  }
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

export function patientSex(patient?: Patient | null): 'M' | 'F' {
  return patient?.gender === 'female' ? 'F' : 'M';
}

export function doctorName(doctorId?: string | null, doctors: Doctor[] = []): string {
  if (!doctorId) {
    return '—';
  }
  const doctor = doctors.find((item) => item._id === doctorId);
  return doctor?.user?.name || doctor?.specialization || 'Assigned Doctor';
}

export function formatDisplayDate(value?: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function derivePatientStatus(
  allotment: RoomAllotment,
  encounter?: Encounter | null,
  history: PatientHistory[] = []
): PatientStatus {
  if (encounter?.status === 'ready_for_discharge') {
    return 'dischargePlanned';
  }

  const patientHistory = history.filter((item) => item.patientId === allotment.patientId);
  const hasCritical = patientHistory.some((item) =>
    /critical|sepsis|emergency/i.test(`${item.title || ''} ${item.diagnosis || ''} ${item.notes || ''}`)
  );
  if (hasCritical) {
    return 'critical';
  }

  const hasWatch = patientHistory.some((item) =>
    /watch|alert|fever|drip/i.test(`${item.title || ''} ${item.notes || ''}`)
  );
  if (hasWatch) {
    return 'watch';
  }

  return 'stable';
}

export function countMedicationsDue(prescriptions: Prescription[], patientId: string): number {
  return prescriptions
    .filter((item) => item.patientId === patientId)
    .reduce((total, prescription) => total + (prescription.medicines?.length || 0), 0);
}

export function countDripsRunning(prescriptions: Prescription[], patientId: string): number {
  return prescriptions
    .filter((item) => item.patientId === patientId)
    .flatMap((item) => item.ivFluids || [])
    .filter((fluid) => fluid.status === 'running').length;
}

export function countVitalsDue(history: PatientHistory[], patientId: string): number {
  const today = new Date().toDateString();
  const hasTodayVitals = history.some(
    (item) => item.patientId === patientId && item.vitals && new Date(item.createdAt || '').toDateString() === today
  );
  return hasTodayVitals ? 0 : 1;
}

export function mapAllotmentToWardPatient(
  allotment: RoomAllotment,
  doctors: Doctor[] = [],
  history: PatientHistory[] = [],
  prescriptions: Prescription[] = [],
  encounters: Encounter[] = []
): WardPatient {
  const patient = allotment.patient;
  const room = allotment.room;
  const encounter = encounters.find((item) => item._id === allotment.encounterId);

  return {
    admissionId: allotment._id,
    patientId: allotment.patientId,
    patientName: patientFullName(patient),
    mrn: patient?.patientNo || '—',
    bedNo: allotment.bedLabel || room?.roomNo || '—',
    wardName: wardNameFromRoom(room),
    roomName: room?.roomNo ? `Room ${room.roomNo}` : '—',
    galleryName: galleryLabelFromRoom(room),
    age: patientAge(patient),
    sex: patientSex(patient),
    diagnosis: allotment.admissionReason || encounter?.admissionReason || patient?.chronicDiseases?.[0] || 'Under care',
    doctorId: allotment.consultantDoctorId || patient?.assignedDoctorId || '',
    doctorName: doctorName(allotment.consultantDoctorId || patient?.assignedDoctorId, doctors),
    nurseName: undefined,
    admittedOn: allotment.admittedAt,
    status: derivePatientStatus(allotment, encounter, history),
    medicationsDue: countMedicationsDue(prescriptions, allotment.patientId),
    vitalsDue: countVitalsDue(history, allotment.patientId),
    dripsRunning: countDripsRunning(prescriptions, allotment.patientId),
    nursingTasksDue: history.filter((item) => item.patientId === allotment.patientId && item.recordType === 'ward').length,
    criticalAlerts: derivePatientStatus(allotment, encounter, history) === 'critical' ? 1 : 0,
  };
}

export function mapRoomToWardRoom(room: Room, allotment?: RoomAllotment | null): WardRoomRecord {
  const occupied = room.status === 'occupied' || allotment?.status === 'admitted' ? 1 : 0;
  const maintenance = room.status === 'maintenance' ? 1 : 0;
  const available = occupied || maintenance ? 0 : 1;

  return {
    id: room._id,
    wardId: room.wardId || room.ward?._id || room.roomType,
    wardName: wardNameFromRoom(room),
    galleryId: room.floorId || room.floorRecord?._id || `floor-${room.floor || 'main'}`,
    galleryName: galleryLabelFromRoom(room),
    roomName: room.roomNo,
    roomType: API_ROOM_TYPE_TO_UI[room.roomType] || 'general',
    capacity: 1,
    dailyCharge: room.chargesPerDay || 0,
    floor: room.floor || '',
    description: allotment?.notes || '',
    occupiedBeds: occupied,
    availableBeds: available,
    cleaningBeds: 0,
    maintenanceBeds: maintenance,
    onHoldBeds: 0,
    status: room.status === 'maintenance' ? 'maintenance' : 'active',
  };
}

export function mapRoomToWardBed(room: Room, allotment?: RoomAllotment | null): WardBedRecord {
  const patient = allotment?.patient;
  const status: WardBedStatus =
    room.status === 'maintenance'
      ? 'maintenance'
      : allotment?.status === 'admitted'
        ? 'occupied'
        : 'available';

  return {
    id: `${room._id}-bed`,
    roomId: room._id,
    bedNo: allotment?.bedLabel || room.roomNo,
    bedType: room.roomType === 'icu' ? 'icu' : 'standard',
    status,
    patientId: patient?._id,
    admissionId: allotment?._id,
    patientName: patient ? patientFullName(patient) : undefined,
    age: patient ? patientAge(patient) : undefined,
    sex: patient ? patientSex(patient) : undefined,
    nurseName: undefined,
    occupiedSince: allotment?.admittedAt,
    dailyCharge: room.chargesPerDay || 0,
    notes: allotment?.notes || '',
  };
}

export function mapRoomToDashboardBed(room: Room, allotment?: RoomAllotment | null): WardBed {
  const patient = allotment?.patient;
  const status =
    room.status === 'maintenance'
      ? 'maintenance'
      : allotment?.status === 'admitted'
        ? 'occupied'
        : 'available';

  return {
    bedNo: allotment?.bedLabel || room.roomNo,
    status,
    patientName: patient ? patientFullName(patient) : undefined,
    age: patient ? patientAge(patient) : undefined,
    sex: patient ? patientSex(patient) : undefined,
    nurseName: undefined,
    admissionId: allotment?._id,
    alertType: status === 'occupied' ? 'warning' : undefined,
  };
}

export function buildDashboardSections(rooms: Room[], allotments: RoomAllotment[]): WardSection[] {
  const grouped = new Map<string, WardBed[]>();

  rooms.forEach((room) => {
    const allotment = allotments.find((item) => item.roomId === room._id && item.status === 'admitted');
    const sectionName = wardNameFromRoom(room);
    const beds = grouped.get(sectionName) || [];
    beds.push(mapRoomToDashboardBed(room, allotment));
    grouped.set(sectionName, beds);
  });

  return Array.from(grouped.entries()).map(([sectionName, beds]) => ({
    sectionName,
    subtitle: galleryLabelFromRoom(rooms.find((room) => wardNameFromRoom(room) === sectionName)),
    beds,
  }));
}

export function buildDashboardKpis(rooms: Room[], allotments: RoomAllotment[]): WardKpiCard[] {
  const admitted = allotments.filter((item) => item.status === 'admitted').length;
  const total = rooms.length;
  const available = rooms.filter((room) => room.status === 'available').length;
  const maintenance = rooms.filter((room) => room.status === 'maintenance').length;
  const occupied = rooms.filter((room) => room.status === 'occupied').length;

  return [
    { key: 'total', label: 'Total Beds', value: total, icon: 'fa-bed', tone: 'blue' },
    { key: 'occupied', label: 'Occupied Beds', value: occupied || admitted, percent: total ? Math.round(((occupied || admitted) / total) * 100) : 0, icon: 'fa-user', tone: 'green' },
    { key: 'available', label: 'Available Beds', value: available, percent: total ? Math.round((available / total) * 100) : 0, icon: 'fa-check-circle', tone: 'blue' },
    { key: 'maintenance', label: 'Maintenance', value: maintenance, percent: total ? Math.round((maintenance / total) * 100) : 0, icon: 'fa-wrench', tone: 'red' },
    { key: 'admitted', label: 'Admitted Patients', value: admitted, icon: 'fa-users', tone: 'teal' },
    { key: 'alerts', label: 'Ward Records', value: admitted, icon: 'fa-file-text-o', tone: 'purple' },
    { key: 'nurses', label: 'Rooms Occupied', value: occupied, icon: 'fa-hospital-o', tone: 'teal' },
    { key: 'critical', label: 'Critical Alerts', value: 0, icon: 'fa-exclamation-triangle', tone: 'red' },
  ];
}

export function wardRoomPayloadFromForm(value: {
  roomName: string;
  roomType: WardRoomType;
  wardId?: string;
  floorId?: string;
  floor?: string;
  dailyCharge: number;
  status?: Room['status'];
}): Record<string, unknown> {
  return {
    roomNo: value.roomName,
    roomType: UI_ROOM_TYPE_TO_API[value.roomType] || 'general',
    wardId: value.wardId || undefined,
    floorId: value.floorId || undefined,
    floor: value.floor || undefined,
    chargesPerDay: Number(value.dailyCharge) || 0,
    status: value.status || 'available',
  };
}

export function getWardOptionsFromCatalog(wards: HospitalWard[]): string[] {
  return wards.map((ward) => ward.name).sort((a, b) => a.localeCompare(b));
}

export function getWardOptionsFromRooms(rooms: Room[], wards: HospitalWard[] = []): string[] {
  const labels = new Set<string>([
    ...wards.map((ward) => ward.name),
    ...rooms.map((room) => wardNameFromRoom(room)),
  ]);
  return Array.from(labels).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function buildFloorOptions(floors: WardFloor[], wardId = ''): WardGalleryOption[] {
  return floors
    .filter((floor) => !wardId || floor.wardId === wardId)
    .map((floor) => ({
      id: floor._id,
      label: floor.label || floor.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function mapAdmissionRows(allotments: RoomAllotment[], doctors: Doctor[] = []): WardModuleRow[] {
  return allotments.map((item) => ({
    id: item._id,
    cells: {
      patient: patientFullName(item.patient),
      mrn: item.patient?.patientNo || '—',
      bed: item.bedLabel || item.room?.roomNo || '—',
      doctor: doctorName(item.consultantDoctorId, doctors),
      admittedOn: formatDisplayDate(item.admittedAt),
      status: item.status === 'admitted' ? 'Active' : 'Discharged',
      _tab: item.status === 'admitted' ? 'active' : item.dischargedAt ? 'discharge' : 'pending',
    },
    badgeTone: {
      status: item.status === 'admitted' ? 'active' : 'completed',
    },
    linkRoute: `/ward/patient-detail/${item._id}`,
  }));
}

export function mapNursingRows(history: PatientHistory[]): WardModuleRow[] {
  return history.map((item) => ({
    id: item._id,
    cells: {
      patient: patientFullName(item.patient),
      task: item.title || 'Ward Note',
      priority: /critical|urgent/i.test(item.notes || '') ? 'High' : 'Medium',
      nurse: item.doctor?.name || '—',
      dueAt: formatDisplayDate(item.createdAt),
      status: item.notes ? 'Completed' : 'Due',
      _tab: item.notes ? 'completed' : 'due',
    },
    badgeTone: {
      priority: /critical|urgent/i.test(item.notes || '') ? 'critical' : 'medium',
      status: item.notes ? 'completed' : 'pending',
    },
    linkRoute: item.patientId ? `/ward/patient-detail/${item.patientId}` : undefined,
  }));
}

export function mapMarRows(prescriptions: Prescription[]): WardModuleRow[] {
  const rows: WardModuleRow[] = [];
  prescriptions.forEach((prescription) => {
    (prescription.medicines || []).forEach((medicine, index) => {
      rows.push({
        id: `${prescription._id}-${index}`,
        cells: {
          patient: patientFullName(prescription.patient),
          medicine: medicine.name,
          dose: medicine.dosage || medicine.frequency || '—',
          route: 'PO',
          dueTime: medicine.morning ? '08:00' : medicine.noon ? '13:00' : medicine.evening ? '18:00' : '21:00',
          status: 'Due',
          _tab: 'due',
        },
        badgeTone: { status: 'pending' },
        linkRoute: `/ward/patient-detail/${prescription.patientId}`,
      });
    });
  });
  return rows;
}

export function mapDripRows(prescriptions: Prescription[]): WardModuleRow[] {
  const rows: WardModuleRow[] = [];
  prescriptions.forEach((prescription) => {
    (prescription.ivFluids || []).forEach((fluid, index) => {
      rows.push({
        id: `${prescription._id}-iv-${index}`,
        cells: {
          patient: patientFullName(prescription.patient),
          fluid: fluid.name,
          rate: fluid.rate || '—',
          startedAt: formatDisplayDate(fluid.startDateTime),
          nurse: prescription.doctor?.name || '—',
          status: fluid.status === 'running' ? 'Running' : fluid.status === 'completed' ? 'Completed' : 'Planned',
          _tab: fluid.status === 'running' ? 'running' : fluid.status === 'completed' ? 'completed' : 'all',
        },
        badgeTone: {
          status: fluid.status === 'running' ? 'running' : fluid.status === 'completed' ? 'completed' : 'pending',
        },
        linkRoute: `/ward/patient-detail/${prescription.patientId}`,
      });
    });
  });
  return rows;
}

export function mapVitalsRows(history: PatientHistory[]): WardModuleRow[] {
  return history
    .filter((item) => item.vitals && Object.keys(item.vitals).length)
    .map((item) => ({
      id: item._id,
      cells: {
        patient: patientFullName(item.patient),
        bed: '—',
        bp: item.vitals?.['bloodPressure'] || '—',
        temp: item.vitals?.['temperature'] || '—',
        spo2: item.vitals?.['pulse'] || '—',
        status: 'Recorded',
        _tab: 'recorded',
      },
      badgeTone: { status: 'completed' },
      linkRoute: `/ward/patient-detail/${item.patientId}`,
    }));
}

export function mapOrderRows(labOrders: LabOrder[], prescriptions: Prescription[]): WardModuleRow[] {
  const labRows = labOrders.map((order) => ({
    id: order._id,
    cells: {
      patient: patientFullName(order.patient),
      order: order.items?.map((test) => test.testName).join(', ') || 'Lab Order',
      type: 'Lab',
      doctor: order.doctor?.name || '—',
      time: formatDisplayDate(order.createdAt),
      status: order.status || 'Pending',
      _tab: ['verified', 'result_entered'].includes(order.status) ? 'completed' : ['processing', 'sample_collected'].includes(order.status) ? 'progress' : 'pending',
    },
    badgeTone: {
      status: ['verified', 'result_entered'].includes(order.status) ? 'completed' : ['processing', 'sample_collected'].includes(order.status) ? 'running' : 'pending',
    },
    linkRoute: `/ward/patient-detail/${order.patientId}`,
  }));

  const admissionRows = prescriptions.flatMap((prescription) =>
    (prescription.admissionOrderItems || []).map((order, index) => ({
      id: `${prescription._id}-order-${index}`,
      cells: {
        patient: patientFullName(prescription.patient),
        order: order.order,
        type: order.category || 'Service',
        doctor: prescription.doctor?.name || '—',
        time: formatDisplayDate(order.orderedOn),
        status: order.status === 'completed' ? 'Completed' : 'Pending',
        _tab: order.status === 'completed' ? 'completed' : 'pending',
      },
      badgeTone: {
        status: order.status === 'completed' ? 'completed' : 'pending',
      },
      linkRoute: `/ward/patient-detail/${prescription.patientId}`,
    }))
  );

  return [...labRows, ...admissionRows];
}

export interface WardActivityRecord {
  _id: string;
  activityType: string;
  patient?: { firstName?: string; lastName?: string } | null;
  patientId?: string;
  admissionId?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  shift?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export function mapWardActivityRows(activities: WardActivityRecord[], type?: string): WardModuleRow[] {
  return activities
    .filter((item) => !type || item.activityType === type)
    .map((item) => {
      const patientName = item.patient
        ? `${item.patient.firstName || ''} ${item.patient.lastName || ''}`.trim()
        : '—';
      const status = item.status || 'pending';
      const tab =
        status === 'completed'
          ? item.activityType === 'handover'
            ? item.shift || 'day'
            : 'completed'
          : status === 'due' || status === 'pending'
            ? item.activityType === 'handover'
              ? item.shift || 'day'
              : item.activityType === 'inventory'
                ? 'low'
                : 'due'
            : status;

      if (item.activityType === 'io_entry') {
        return {
          id: item._id,
          cells: {
            patient: patientName,
            intake: String(item.metadata?.['intake'] || '—'),
            output: String(item.metadata?.['output'] || '—'),
            balance: String(item.metadata?.['balance'] || '—'),
            shift: item.shift || 'day',
            status: status === 'completed' ? 'Recorded' : 'Pending',
            _tab: item.shift || 'day',
          },
          badgeTone: { status: status === 'completed' ? 'completed' : 'pending' },
          linkRoute: item.admissionId ? `/ward/patient-detail/${item.admissionId}` : undefined,
        };
      }

      if (item.activityType === 'handover') {
        return {
          id: item._id,
          cells: {
            shift: item.shift === 'night' ? 'Night Shift' : item.shift === 'evening' ? 'Evening Shift' : 'Day Shift',
            nurse: String(item.metadata?.['nurseName'] || '—'),
            patients: String(item.metadata?.['patients'] || '—'),
            pending: String(item.metadata?.['pending'] || '0'),
            updatedAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '—',
            status: status === 'completed' ? 'Completed' : 'Pending',
            _tab: item.shift || 'day',
          },
          badgeTone: { status: status === 'completed' ? 'completed' : 'pending' },
        };
      }

      if (item.activityType === 'inventory') {
        return {
          id: item._id,
          cells: {
            item: item.title || '—',
            category: String(item.metadata?.['category'] || 'Consumable'),
            stock: String(item.metadata?.['quantity'] || '0'),
            reorder: String(item.metadata?.['reorderLevel'] || '—'),
            location: String(item.metadata?.['location'] || 'Ward Store'),
            status: status === 'completed' ? 'Available' : 'Low',
            _tab: status === 'completed' ? 'available' : 'low',
          },
          badgeTone: { status: status === 'completed' ? 'completed' : 'critical' },
        };
      }

      if (item.activityType === 'mar_dose') {
        return {
          id: item._id,
          cells: {
            patient: patientName,
            medicine: String(item.metadata?.['medicineName'] || item.title || '—'),
            dose: String(item.metadata?.['dose'] || '—'),
            route: String(item.metadata?.['route'] || 'PO'),
            dueTime: item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : '—',
            status: 'Given',
            _tab: 'given',
          },
          badgeTone: { status: 'completed' },
          linkRoute: item.admissionId ? `/ward/patient-detail/${item.admissionId}` : undefined,
        };
      }

      if (item.activityType === 'nursing_task') {
        return {
          id: item._id,
          cells: {
            patient: patientName,
            task: item.title || 'Nursing Task',
            priority: item.priority === 'high' || item.priority === 'critical' ? 'High' : 'Medium',
            nurse: String(item.metadata?.['nurseName'] || '—'),
            dueAt: item.createdAt ? formatDisplayDate(item.createdAt) : '—',
            status: status === 'completed' ? 'Completed' : 'Due',
            _tab: status === 'completed' ? 'completed' : 'due',
          },
          badgeTone: {
            priority: item.priority === 'critical' ? 'critical' : item.priority === 'high' ? 'critical' : 'medium',
            status: status === 'completed' ? 'completed' : 'pending',
          },
          linkRoute: item.admissionId ? `/ward/patient-detail/${item.admissionId}` : undefined,
        };
      }

      if (item.activityType === 'admission_request') {
        return {
          id: item._id,
          cells: {
            patient: patientName,
            mrn: String(item.metadata?.['mrn'] || '—'),
            bed: String(item.metadata?.['bedLabel'] || '—'),
            doctor: String(item.metadata?.['doctorName'] || '—'),
            admittedOn: '—',
            status: 'Pending',
            _tab: 'pending',
          },
          badgeTone: { status: 'pending' },
        };
      }

      return {
        id: item._id,
        cells: {
          patient: patientName,
          task: item.title || item.activityType,
          priority: item.priority || 'normal',
          nurse: '—',
          dueAt: formatDisplayDate(item.createdAt),
          status: status,
          _tab: tab,
        },
        badgeTone: { status: status === 'completed' ? 'completed' : 'pending' },
        linkRoute: item.admissionId ? `/ward/patient-detail/${item.admissionId}` : undefined,
      };
    }) as unknown as WardModuleRow[];
}

export function mapWardApiBedToRecord(
  bed: Record<string, unknown>,
  allotment?: RoomAllotment | null
): WardBedRecord {
  const patient = allotment?.patient;
  const status = (bed['status'] as WardBedRecord['status']) || 'available';
  return {
    id: String(bed['_id']),
    roomId: String(bed['roomId']),
    bedNo: String(bed['bedNo'] || ''),
    bedType: (bed['bedType'] as WardBedRecord['bedType']) || 'standard',
    status,
    patientId: patient?._id,
    admissionId: allotment?._id,
    patientName: patient ? patientFullName(patient) : undefined,
    age: patient ? patientAge(patient) : undefined,
    sex: patient ? patientSex(patient) : undefined,
    nurseName: undefined,
    occupiedSince: allotment?.admittedAt,
    dailyCharge: Number(bed['dailyCharge'] || 0),
    notes: String(bed['notes'] || ''),
  };
}

export function matchesWardFilter(room: Room | null | undefined, wardFilter: string): boolean {
  if (!wardFilter) {
    return true;
  }
  return wardNameFromRoom(room) === wardFilter;
}
