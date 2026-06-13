export type LabTestStatus = 'pending' | 'completed' | 'cancelled';
export type LabTestFilter = 'all' | LabTestStatus;
export type LabParameterStatus = 'normal' | 'high' | 'low' | 'abnormal';

export interface LabTestParameter {
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
  source: 'catalog' | 'custom';
}

const DEMO_COMPLETED_TESTS: Array<{
  name: string;
  orderedOn: string;
  completedOn: string;
  resultSummary: string;
  resultTrend?: string;
  resultClass: string;
}> = [
  {
    name: 'CBC',
    orderedOn: 'Jun 12, 2026 10:45 PM',
    completedOn: 'Jun 12, 2026 11:30 PM',
    resultSummary: 'Normal',
    resultClass: 'normal',
  },
  {
    name: 'ESR',
    orderedOn: 'Jun 12, 2026 10:45 PM',
    completedOn: 'Jun 12, 2026 11:15 PM',
    resultSummary: 'Normal',
    resultClass: 'normal',
  },
  {
    name: 'CRP',
    orderedOn: 'Jun 12, 2026 10:45 PM',
    completedOn: 'Jun 12, 2026 11:20 PM',
    resultSummary: '12.5 mg/L',
    resultTrend: '↑',
    resultClass: 'abnormal',
  },
  {
    name: 'Blood Sugar Fasting',
    orderedOn: 'Jun 12, 2026 10:45 PM',
    completedOn: 'Jun 12, 2026 11:10 PM',
    resultSummary: 'Normal',
    resultClass: 'normal',
  },
];

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

export const buildLabTestDisplayRows = (
  orderedTests: Array<{ name?: string; category?: string; selected?: boolean }>
): LabTestDisplayRow[] => {
  const rows: LabTestDisplayRow[] = DEMO_COMPLETED_TESTS.map((demo) => {
    const catalog = findCatalogItem(demo.name);
    return {
      id: `demo-${demo.name}`,
      name: demo.name,
      fullName: catalog?.fullName || demo.name,
      category: catalog?.category || 'General',
      orderedOn: demo.orderedOn,
      completedOn: demo.completedOn,
      status: 'completed',
      resultSummary: demo.resultSummary,
      resultTrend: demo.resultTrend,
      resultClass: demo.resultClass,
      hasReport: true,
      parameters: catalog?.parameters || [],
      source: 'catalog',
    };
  });

  const pendingTests = orderedTests
    .filter((test) => Boolean(test.selected) && String(test.name || '').trim())
    .filter((test) => !DEMO_COMPLETED_TESTS.some((demo) => demo.name.toLowerCase() === String(test.name).toLowerCase()))
    .map((test, index) => {
      const name = String(test.name || '').trim();
      const catalog = findCatalogItem(name);

      return {
        id: `pending-${name}-${index}`,
        name,
        fullName: catalog?.fullName || name,
        category: String(test.category || catalog?.category || 'Other').trim(),
        orderedOn: formatOrderedOn(),
        status: 'pending' as LabTestStatus,
        resultSummary: '—',
        resultClass: 'pending',
        hasReport: false,
        parameters: [],
        source: (catalog ? 'catalog' : 'custom') as 'catalog' | 'custom',
      };
    });

  return [...rows, ...pendingTests];
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
    case 'abnormal':
      return 'Abnormal';
    default:
      return 'Normal';
  }
};
