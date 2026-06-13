export type AdmissionOrderPriority = 'normal' | 'high';
export type AdmissionOrderStatus = 'active' | 'planned' | 'completed';

export interface AdmissionOrderItem {
  order: string;
  category?: string;
  orderedOn?: string;
  priority?: AdmissionOrderPriority;
  status?: AdmissionOrderStatus;
}

export interface PatientAdmissionOrderRecord extends AdmissionOrderItem {
  prescriptionId: string;
}

export interface AdmissionOrderDisplayRow {
  id: string;
  order: string;
  category: string;
  orderedOn: string;
  priority: AdmissionOrderPriority;
  status: AdmissionOrderStatus;
  source: 'saved' | 'form';
  formIndex?: number;
  prescriptionId?: string;
}

export const ADMISSION_ORDER_CATEGORIES = ['Diet', 'Therapy', 'Nursing', 'Investigation', 'General'];

export const ADMISSION_ORDER_PRESETS: Array<{ order: string; category: string; priority: AdmissionOrderPriority; status: AdmissionOrderStatus }> = [
  { order: 'Regular Diet', category: 'Diet', priority: 'normal', status: 'active' },
  { order: 'NPO', category: 'Diet', priority: 'high', status: 'active' },
  { order: 'Physiotherapy', category: 'Therapy', priority: 'normal', status: 'active' },
  { order: 'Monitor Vitals (4 hourly)', category: 'Nursing', priority: 'high', status: 'active' },
  { order: 'Nebulization (SOS)', category: 'Nursing', priority: 'normal', status: 'active' },
  { order: 'Strict I/O Chart', category: 'Nursing', priority: 'high', status: 'active' },
  { order: 'CBC after 48 hours', category: 'Investigation', priority: 'normal', status: 'planned' },
];

const formatOrderedOn = (value?: string): string => {
  if (!value) {
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const legacyAdmissionOrdersToItems = (
  legacy?: {
    regularDiet?: boolean;
    npo?: boolean;
    consultation?: string;
    monitoring?: { bp?: boolean; pulse?: boolean; spo2?: boolean; rbs?: boolean };
    notes?: string;
  } | null,
  orderedAt?: string
): AdmissionOrderItem[] => {
  if (!legacy) {
    return [];
  }

  const items: AdmissionOrderItem[] = [];
  const orderedOn = formatOrderedOn(orderedAt);

  if (legacy.regularDiet) {
    items.push({ order: 'Regular Diet', category: 'Diet', priority: 'normal', status: 'active', orderedOn });
  }

  if (legacy.npo) {
    items.push({ order: 'NPO', category: 'Diet', priority: 'high', status: 'active', orderedOn });
  }

  const consultation = String(legacy.consultation || '').trim();
  if (consultation) {
    items.push({ order: consultation, category: 'Therapy', priority: 'normal', status: 'active', orderedOn });
  }

  const monitoring = legacy.monitoring || {};
  const enabled = Object.entries(monitoring)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key.toUpperCase());

  if (enabled.length > 0) {
    items.push({
      order: `Monitor Vitals (${enabled.join(', ')})`,
      category: 'Nursing',
      priority: 'high',
      status: 'active',
      orderedOn,
    });
  }

  const notes = String(legacy.notes || '').trim();
  if (notes) {
    items.push({ order: notes, category: 'Nursing', priority: 'normal', status: 'active', orderedOn });
  }

  return items;
};

const buildAdmissionRow = (
  id: string,
  item: AdmissionOrderItem,
  source: 'saved' | 'form',
  extras?: { formIndex?: number; prescriptionId?: string; fallbackOrderedOn?: string }
): AdmissionOrderDisplayRow => ({
  id,
  order: String(item.order || '').trim(),
  category: String(item.category || 'General').trim() || 'General',
  orderedOn: formatOrderedOn(item.orderedOn || extras?.fallbackOrderedOn),
  priority: (item.priority || 'normal') as AdmissionOrderPriority,
  status: (item.status || 'active') as AdmissionOrderStatus,
  source,
  formIndex: extras?.formIndex,
  prescriptionId: extras?.prescriptionId,
});

export const buildAdmissionOrderDisplayRows = (
  savedOrders: PatientAdmissionOrderRecord[],
  formOrders: AdmissionOrderItem[],
  legacyOrders: Array<{
    prescriptionId: string;
    orderedAt?: string;
    legacy?: {
      regularDiet?: boolean;
      npo?: boolean;
      consultation?: string;
      monitoring?: { bp?: boolean; pulse?: boolean; spo2?: boolean; rbs?: boolean };
      notes?: string;
    } | null;
  }>
): AdmissionOrderDisplayRow[] => {
  const savedRows = savedOrders.map((record, index) =>
    buildAdmissionRow(
      `saved-${record.prescriptionId}-${index}-${record.order}`,
      record,
      'saved',
      { prescriptionId: record.prescriptionId, fallbackOrderedOn: record.orderedOn }
    )
  );

  const legacyRows = legacyOrders.flatMap((entry) =>
    legacyAdmissionOrdersToItems(entry.legacy, entry.orderedAt).map((item, index) =>
      buildAdmissionRow(
        `legacy-${entry.prescriptionId}-${index}-${item.order}`,
        item,
        'saved',
        { prescriptionId: entry.prescriptionId, fallbackOrderedOn: entry.orderedAt }
      )
    )
  );

  const formRows = formOrders
    .map((item, index) => {
      const order = String(item.order || '').trim();
      if (!order) {
        return null;
      }

      return buildAdmissionRow(`form-${index}-${order}`, item, 'form', { formIndex: index });
    })
    .filter((row): row is AdmissionOrderDisplayRow => row !== null);

  return [...savedRows, ...legacyRows, ...formRows];
};

export const countActiveAdmissionOrders = (rows: AdmissionOrderDisplayRow[]): number =>
  rows.filter((row) => row.status === 'active').length;

export const admissionOrderPriorityLabel = (priority: AdmissionOrderPriority): string =>
  priority === 'high' ? 'High' : 'Normal';

export const admissionOrderStatusLabel = (status: AdmissionOrderStatus): string => {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'completed':
      return 'Completed';
    default:
      return 'Active';
  }
};
