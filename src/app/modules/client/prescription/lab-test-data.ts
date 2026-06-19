import type { LabOrder, LabOrderItem, LabReportFile, LabResultParameter } from '../../../shared/models/hospital.model';

export type LabTestStatus = 'pending' | 'completed' | 'cancelled';
export type LabTestFilter = 'all' | LabTestStatus;
export type LabParameterStatus = 'normal' | 'high' | 'low' | 'abnormal' | 'critical';

export interface LabTestParameter {
  subCategory?: string;
  name: string;
  result: string;
  unit: string;
  referenceRange: string;
  status: LabParameterStatus;
}

export interface LabTestCatalogItem {
  name: string;
  fullName: string;
  category: string;
  parameters?: LabTestParameter[];
}

export interface PatientLabTestRecord {
  prescriptionId: string;
  orderedAt?: string;
  name: string;
  category?: string;
}

export interface LabTestDisplayRow {
  id: string;
  name: string;
  fullName: string;
  category: string;
  orderedOn: string;
  completedOn?: string;
  status: LabTestStatus;
  resultSummary: string;
  resultTrend?: string;
  resultClass: string;
  hasReport: boolean;
  parameters: LabTestParameter[];
  source: 'catalog' | 'custom' | 'saved' | 'lab-order';
  formIndex?: number;
  prescriptionId?: string;
  labOrderId?: string;
  labOrderNo?: string;
  shortCode?: string;
  sampleType?: string;
  tubeType?: string;
  resultMode?: string;
  remarks?: string;
  collectedAt?: string;
  resultEnteredAt?: string;
  verifiedAt?: string;
  reportFiles?: LabReportFile[];
}

export const LAB_TEST_CATALOG: LabTestCatalogItem[] = [
  {
    name: 'CBC',
    fullName: 'Complete Blood Count',
    category: 'Hematology',
    parameters: [
      { name: 'Hemoglobin (Hb)', result: '13.2', unit: 'g/dL', referenceRange: '11.5 - 15.5', status: 'normal' },
      { name: 'WBC (Total)', result: '7,800', unit: '/µL', referenceRange: '4,000 - 11,000', status: 'normal' },
      { name: 'RBC (Total)', result: '4.6', unit: 'million/µL', referenceRange: '4.0 - 5.5', status: 'normal' },
      { name: 'Platelets', result: '250', unit: 'x10³/µL', referenceRange: '150 - 450', status: 'normal' },
    ],
  },
  {
    name: 'ESR',
    fullName: 'Erythrocyte Sedimentation Rate',
    category: 'Hematology',
    parameters: [
      { name: 'ESR', result: '12', unit: 'mm/hr', referenceRange: '0 - 20', status: 'normal' },
    ],
  },
  {
    name: 'CRP',
    fullName: 'C-Reactive Protein',
    category: 'Serology',
    parameters: [
      { name: 'CRP', result: '12.5', unit: 'mg/L', referenceRange: '< 5.0', status: 'high' },
    ],
  },
  {
    name: 'Blood Sugar Fasting',
    fullName: 'Blood Sugar Fasting',
    category: 'Biochemistry',
    parameters: [
      { name: 'Fasting Glucose', result: '92', unit: 'mg/dL', referenceRange: '70 - 100', status: 'normal' },
    ],
  },
  {
    name: 'Chest X-Ray',
    fullName: 'Chest X-Ray',
    category: 'Radiology',
    parameters: [],
  },
  {
    name: 'Sputum Culture',
    fullName: 'Sputum Culture',
    category: 'Microbiology',
    parameters: [],
  },
];

const findCatalogItem = (name: string): LabTestCatalogItem | undefined =>
  LAB_TEST_CATALOG.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());

const formatOrderedOn = (value?: string | Date): string => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isCompletedLabItem = (item: LabOrderItem): boolean =>
  item.status === 'verified' || item.status === 'completed';

const formatReferenceRange = (parameter: LabResultParameter): string => {
  const referenceText = String(parameter.referenceText || '').trim();
  if (referenceText) {
    return referenceText;
  }

  const min = parameter.referenceMin;
  const max = parameter.referenceMax;
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${min} - ${max}`;
  }

  if (min !== null && min !== undefined) {
    return `>= ${min}`;
  }

  if (max !== null && max !== undefined) {
    return `<= ${max}`;
  }

  return '-';
};

const normalizeParameterStatus = (status?: string): LabParameterStatus => {
  if (status === 'low' || status === 'high' || status === 'normal' || status === 'critical') {
    return status;
  }

  return status ? 'abnormal' : 'normal';
};

const normalizeLabParameter = (parameter: LabResultParameter): LabTestParameter | null => {
  const name = String(parameter.parameterName || '').trim();
  const result = String(parameter.resultValue || '').trim();
  if (!name && !result) {
    return null;
  }

  return {
    subCategory: String(parameter.subCategory || '').trim(),
    name: name || 'Result',
    result: result || '-',
    unit: String(parameter.unit || '').trim() || '-',
    referenceRange: formatReferenceRange(parameter),
    status: normalizeParameterStatus(parameter.status),
  };
};

const labResultClass = (parameters: LabTestParameter[]): string =>
  parameters.some((parameter) => ['critical', 'high', 'low', 'abnormal'].includes(parameter.status))
    ? 'abnormal'
    : 'normal';

const labResultSummary = (item: LabOrderItem, parameters: LabTestParameter[]): string => {
  const priorityParameter =
    parameters.find((parameter) => parameter.status === 'critical') ||
    parameters.find((parameter) => ['high', 'low', 'abnormal'].includes(parameter.status)) ||
    parameters[0];

  if (priorityParameter) {
    const unit = priorityParameter.unit !== '-' ? ` ${priorityParameter.unit}` : '';
    return `${priorityParameter.name}: ${priorityParameter.result}${unit}`;
  }

  const remarks = String(item.remarks || '').trim();
  if (remarks) {
    return remarks;
  }

  return item.reportFiles?.length ? 'Report ready' : 'Completed';
};

export const buildCompletedLabOrderRows = (orders: LabOrder[]): LabTestDisplayRow[] =>
  orders.flatMap((order) =>
    (order.items || [])
      .filter(isCompletedLabItem)
      .map((item, index) => {
        const parameters = (item.parameters || [])
          .map((parameter) => normalizeLabParameter(parameter))
          .filter((parameter): parameter is LabTestParameter => Boolean(parameter));
        const catalog = findCatalogItem(item.testName || item.shortCode || '');
        const testName = item.testName || item.shortCode || 'Lab Test';
        const testCode = item.shortCode || catalog?.name || '';

        return {
          id: `lab-${order._id}-${item._id || index}`,
          name: testName,
          fullName: testCode && testCode !== testName ? testCode : catalog?.fullName || testName,
          category: item.department || catalog?.category || 'Laboratory',
          orderedOn: formatOrderedOn(order.createdAt),
          completedOn: formatOrderedOn(item.verifiedAt || item.resultEnteredAt || order.updatedAt || order.createdAt),
          status: 'completed',
          resultSummary: labResultSummary(item, parameters),
          resultClass: labResultClass(parameters),
          hasReport: Boolean(item.reportFiles?.length),
          parameters,
          source: 'lab-order',
          prescriptionId: order.prescriptionId || undefined,
          labOrderId: order._id,
          labOrderNo: order.orderNo,
          shortCode: testCode,
          sampleType: item.sampleType || '',
          tubeType: item.tubeType || '',
          resultMode: item.resultMode || '',
          remarks: item.remarks || '',
          collectedAt: item.collectedAt ? formatOrderedOn(item.collectedAt) : '',
          resultEnteredAt: item.resultEnteredAt ? formatOrderedOn(item.resultEnteredAt) : '',
          verifiedAt: item.verifiedAt ? formatOrderedOn(item.verifiedAt) : '',
          reportFiles: item.reportFiles || [],
        };
      })
  );

const buildPendingLabRow = (
  name: string,
  category: string,
  orderedOn: string,
  id: string,
  source: 'catalog' | 'custom' | 'saved',
  extras?: { formIndex?: number; prescriptionId?: string }
): LabTestDisplayRow => {
  const catalog = findCatalogItem(name);

  return {
    id,
    name,
    fullName: catalog?.fullName || name,
    category: category.trim() || catalog?.category || 'Other',
    orderedOn,
    status: 'pending',
    resultSummary: '—',
    resultClass: 'pending',
    hasReport: false,
    parameters: [],
    source,
    formIndex: extras?.formIndex,
    prescriptionId: extras?.prescriptionId,
  };
};

export const buildLabTestDisplayRows = (
  savedTests: PatientLabTestRecord[],
  orderedTests: Array<{ name?: string; category?: string; selected?: boolean }>,
  completedLabOrders: LabOrder[] = []
): LabTestDisplayRow[] => {
  const labOrderRows = buildCompletedLabOrderRows(completedLabOrders);
  const completedPrescriptionTestKeys = new Set(
    labOrderRows
      .filter((row) => row.prescriptionId)
      .flatMap((row) => [
        `${row.prescriptionId}:${row.name.trim().toLowerCase()}`,
        `${row.prescriptionId}:${row.fullName.trim().toLowerCase()}`,
      ])
  );
  const savedRows = savedTests
    .filter(
      (record) =>
        !completedPrescriptionTestKeys.has(`${record.prescriptionId}:${record.name.trim().toLowerCase()}`)
    )
    .map((record, index) =>
      buildPendingLabRow(
        record.name,
        String(record.category || ''),
        formatOrderedOn(record.orderedAt),
        `saved-${record.prescriptionId}-${record.name}-${index}`,
        'saved',
        { prescriptionId: record.prescriptionId }
      )
    );

  const pendingTests = orderedTests
    .map((test, index) => ({ test, index }))
    .filter(({ test }) => Boolean(test.selected) && String(test.name || '').trim())
    .map(({ test, index }) => {
      const name = String(test.name || '').trim();
      const catalog = findCatalogItem(name);

      return buildPendingLabRow(
        name,
        String(test.category || catalog?.category || 'Other'),
        formatOrderedOn(),
        `form-${index}-${name}`,
        catalog ? 'catalog' : 'custom',
        { formIndex: index }
      );
    });

  return [...labOrderRows, ...savedRows, ...pendingTests];
};

export const filterLabTestRows = (rows: LabTestDisplayRow[], filter: LabTestFilter): LabTestDisplayRow[] => {
  if (filter === 'all') {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
};

export const labStatusLabel = (status: LabTestStatus): string => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Pending';
  }
};

export const labParameterStatusLabel = (status: LabParameterStatus): string => {
  switch (status) {
    case 'high':
      return 'High';
    case 'low':
      return 'Low';
    case 'critical':
      return 'Critical';
    case 'abnormal':
      return 'Abnormal';
    default:
      return 'Normal';
  }
};
