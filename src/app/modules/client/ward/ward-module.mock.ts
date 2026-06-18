import {
  WardModuleHierarchyNode,
  WardModuleReportCard,
  WardModuleRow,
  WardModuleKey,
} from './ward-module.models';

/** TODO: Replace with WardModuleService API integration per module. */
export function getWardModuleRows(moduleKey: WardModuleKey, tab: string, search: string): WardModuleRow[] {
  const rows = MODULE_ROWS[moduleKey] || [];
  const normalizedSearch = search.trim().toLowerCase();

  return rows.filter((row) => {
    const tabValue = row.cells['_tab'] || 'all';
    if (tab !== 'all' && tabValue !== tab) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return Object.values(row.cells).join(' ').toLowerCase().includes(normalizedSearch);
  });
}

export function getWardReportCards(tab: string, search: string): WardModuleReportCard[] {
  const cards = REPORT_CARDS.filter((card) => tab === 'all' || card.category === tab);
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return cards;
  }

  return cards.filter((card) => `${card.title} ${card.description}`.toLowerCase().includes(normalizedSearch));
}

export function getWardHierarchyNodes(): WardModuleHierarchyNode[] {
  return HIERARCHY_NODES;
}

const HIERARCHY_NODES: WardModuleHierarchyNode[] = [
  { id: 'b1', label: 'Main Hospital Building', level: 1, icon: 'fa-hospital-o' },
  { id: 'f2', label: 'Floor 2 — Paediatrics', level: 2, icon: 'fa-building' },
  { id: 'w1', label: 'Peads Ward', level: 3, icon: 'fa-heartbeat' },
  { id: 'g1', label: 'Gallery A — Male', level: 4, icon: 'fa-th-large' },
  { id: 'r101', label: 'Room 101 (6 beds)', level: 5, icon: 'fa-bed' },
  { id: 'g2', label: 'Gallery B — Female', level: 4, icon: 'fa-th-large' },
  { id: 'r103', label: 'Room 103 (4 beds)', level: 5, icon: 'fa-bed' },
  { id: 'pw', label: 'Private Wing', level: 3, icon: 'fa-star' },
  { id: 'icu', label: 'ICU Wing', level: 3, icon: 'fa-plus-square' },
];

const REPORT_CARDS: Array<WardModuleReportCard & { category: string }> = [
  { id: 'r1', title: 'Ward Occupancy Summary', description: 'Bed occupancy by ward, gallery, and room', actionLabel: 'Open Report', category: 'occupancy' },
  { id: 'r2', title: 'Daily Census Report', description: 'Admissions, discharges, and transfers today', actionLabel: 'Open Report', category: 'occupancy' },
  { id: 'r3', title: 'Nursing Task Completion', description: 'Task completion rate by nurse and shift', actionLabel: 'Open Report', category: 'nursing' },
  { id: 'r4', title: 'Shift Handover Summary', description: 'Pending handover items by shift', actionLabel: 'Open Report', category: 'nursing' },
  { id: 'r5', title: 'MAR Compliance', description: 'Medication administration on-time rate', actionLabel: 'Open Report', category: 'medication' },
  { id: 'r6', title: 'Missed Doses Report', description: 'Missed or delayed medication doses', actionLabel: 'Open Report', category: 'medication' },
];

const MODULE_ROWS: Record<WardModuleKey, WardModuleRow[]> = {
  admissions: [
    row('a1', { patient: 'Zahan Bakhat', mrn: 'PPS-2024-0001', bed: 'A-1', doctor: 'Dr Aoun', admittedOn: '10 Jun 2026', status: 'Active', _tab: 'active' }, { status: 'active' }, '/ward/patient-detail/adm-001'),
    row('a2', { patient: 'Ali Raza', mrn: 'PPS-2024-0002', bed: 'A-2', doctor: 'Dr Aoun', admittedOn: '11 Jun 2026', status: 'Active', _tab: 'active' }, { status: 'active' }, '/ward/patient-detail/adm-002'),
    row('a3', { patient: 'Hassan Ali', mrn: 'PPS-2024-0008', bed: '—', doctor: 'Dr Aoun', admittedOn: '—', status: 'Pending', _tab: 'pending' }, { status: 'pending' }),
    row('a4', { patient: 'Nadeem Akhtar', mrn: 'PPS-2024-0007', bed: 'PR-202', doctor: 'Dr Irfan', admittedOn: '06 Jun 2026', status: 'Discharge Planned', _tab: 'discharge' }, { status: 'dischargePlanned' }, '/ward/patient-detail/adm-007'),
  ],
  'nursing-care': [
    row('n1', { patient: 'Ahmed Khan', task: 'Wound dressing', priority: 'High', nurse: 'Ayesha', dueAt: '10:30', status: 'Due', _tab: 'due' }, { priority: 'critical', status: 'pending' }, '/ward/patient-detail/adm-003'),
    row('n2', { patient: 'Sara Fatima', task: 'Ambulation assist', priority: 'Medium', nurse: 'Fatima', dueAt: '11:00', status: 'Completed', _tab: 'completed' }, { priority: 'medium', status: 'completed' }),
    row('n3', { patient: 'Yasir Ahmed', task: 'SpO2 monitoring', priority: 'High', nurse: 'Fahim', dueAt: '09:15', status: 'Overdue', _tab: 'overdue' }, { priority: 'critical', status: 'overdue' }),
  ],
  mar: [
    row('m1', { patient: 'Zahan Bakhat', medicine: 'Amoxicillin', dose: '250 mg', route: 'PO', dueTime: '10:00', status: 'Due', _tab: 'due' }, { status: 'pending' }, '/ward/patient-detail/adm-001'),
    row('m2', { patient: 'Ali Raza', medicine: 'Paracetamol', dose: '500 mg', route: 'PO', dueTime: '09:00', status: 'Given', _tab: 'given' }, { status: 'completed' }),
    row('m3', { patient: 'Ahmed Khan', medicine: 'Ceftriaxone', dose: '1 g', route: 'IV', dueTime: '08:00', status: 'Missed', _tab: 'missed' }, { status: 'overdue' }),
  ],
  'drips-iv': [
    row('d1', { patient: 'Yasir Ahmed', fluid: 'Normal Saline', rate: '80 ml/hr', startedAt: '08:30', nurse: 'Fahim', status: 'Running', _tab: 'running' }, { status: 'running' }),
    row('d2', { patient: 'Ali Raza', fluid: 'Ringer Lactate', rate: '60 ml/hr', startedAt: '07:45', nurse: 'Imran', status: 'Running', _tab: 'running' }, { status: 'running' }),
    row('d3', { patient: 'Maria Bibi', fluid: 'D5W', rate: '—', startedAt: '06:00', nurse: 'Imran', status: 'Completed', _tab: 'completed' }, { status: 'completed' }),
  ],
  vitals: [
    row('v1', { patient: 'Zahan Bakhat', bed: 'A-1', bp: '—', temp: '—', spo2: '—', status: 'Due', _tab: 'due' }, { status: 'pending' }),
    row('v2', { patient: 'Ahmed Khan', bed: 'A-4', bp: '118/76', temp: '38.2 C', spo2: '94%', status: 'Critical', _tab: 'critical' }, { status: 'critical' }),
    row('v3', { patient: 'Sara Fatima', bed: 'B-1', bp: '110/70', temp: '37.0 C', spo2: '98%', status: 'Recorded', _tab: 'recorded' }, { status: 'completed' }),
  ],
  'io-chart': [
    row('io1', { patient: 'Yasir Ahmed', intake: '1200', output: '900', balance: '+300', shift: 'Day', status: 'Stable', _tab: 'shift' }, { status: 'stable' }),
    row('io2', { patient: 'Ahmed Khan', intake: '800', output: '1100', balance: '-300', shift: 'Day', status: 'Alert', _tab: 'alerts' }, { status: 'watch' }),
    row('io3', { patient: 'Ali Raza', intake: '1500', output: '1000', balance: '+500', shift: 'Day', status: 'Stable', _tab: 'shift' }, { status: 'stable' }),
  ],
  'orders-services': [
    row('o1', { patient: 'Ahmed Khan', order: 'Chest X-Ray', type: 'Radiology', doctor: 'Dr Aoun', time: '09:30', status: 'Pending', _tab: 'pending' }, { status: 'pending' }),
    row('o2', { patient: 'Zahan Bakhat', order: 'CBC', type: 'Lab', doctor: 'Dr Aoun', time: '08:15', status: 'In Progress', _tab: 'progress' }, { status: 'running' }),
    row('o3', { patient: 'Sara Fatima', order: 'Physiotherapy', type: 'Service', doctor: 'Dr Sana', time: '07:45', status: 'Completed', _tab: 'completed' }, { status: 'completed' }),
  ],
  'shift-handover': [
    row('s1', { shift: 'Day Shift', nurse: 'Ayesha', patients: '8', pending: '3', updatedAt: '14:00', status: 'In Progress', _tab: 'day' }, { status: 'running' }),
    row('s2', { shift: 'Evening Shift', nurse: 'Imran', patients: '7', pending: '5', updatedAt: '—', status: 'Pending', _tab: 'evening' }, { status: 'pending' }),
    row('s3', { shift: 'Night Shift', nurse: 'Fahim', patients: '6', pending: '0', updatedAt: '06:00', status: 'Completed', _tab: 'night' }, { status: 'completed' }),
  ],
  inventory: [
    row('i1', { item: 'IV Cannula 22G', category: 'Consumables', stock: '45', reorder: '20', location: 'Store A', status: 'Available', _tab: 'all' }, { status: 'available' }),
    row('i2', { item: 'Syringe 5ml', category: 'Consumables', stock: '12', reorder: '25', location: 'Store A', status: 'Low Stock', _tab: 'low' }, { status: 'low' }),
    row('i3', { item: 'Nebulizer Mask', category: 'Equipment', stock: '0', reorder: '5', location: 'Store B', status: 'Out of Stock', _tab: 'out' }, { status: 'out' }),
  ],
  reports: [],
};

function row(
  id: string,
  cells: Record<string, string>,
  badgeTone: Record<string, string> = {},
  linkRoute?: string
): WardModuleRow {
  return { id, cells, badgeTone, linkRoute };
}
