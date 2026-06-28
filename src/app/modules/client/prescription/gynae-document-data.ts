import { PatientDocumentDisplayRow, PatientDocumentItem } from './patient-document-data';

export type GynaeDocumentCategoryKey =
  | 'ultrasound'
  | 'prescription'
  | 'lab'
  | 'consent'
  | 'discharge'
  | 'identity';

export interface GynaeDocumentCategory {
  key: GynaeDocumentCategoryKey;
  title: string;
  description: string;
  icon: string;
  defaultType: string;
}

export interface GynaeDocumentCategoryView {
  category: GynaeDocumentCategory;
  documents: PatientDocumentDisplayRow[];
  fileCount: number;
  latestDocument: PatientDocumentDisplayRow | null;
  previewDocuments: PatientDocumentDisplayRow[];
  extraPreviewCount: number;
}

export const GYNAE_DOCUMENT_CATEGORIES: GynaeDocumentCategory[] = [
  {
    key: 'ultrasound',
    title: 'Ultrasound Reports',
    description: 'Contains obstetric ultrasound reports.',
    icon: 'fa-picture-o',
    defaultType: 'Radiology',
  },
  {
    key: 'prescription',
    title: 'Previous Prescriptions',
    description: 'Contains prescriptions from previous visits.',
    icon: 'fa-file-text-o',
    defaultType: 'Prescription',
  },
  {
    key: 'lab',
    title: 'Lab Reports',
    description: 'Contains blood, urine and other lab results.',
    icon: 'fa-flask',
    defaultType: 'Lab Report',
  },
  {
    key: 'consent',
    title: 'Consent Forms',
    description: 'Contains signed consent and declaration forms.',
    icon: 'fa-check-square-o',
    defaultType: 'Other',
  },
  {
    key: 'discharge',
    title: 'Discharge Papers',
    description: 'Contains discharge summaries and follow-up papers.',
    icon: 'fa-sign-out',
    defaultType: 'Other',
  },
  {
    key: 'identity',
    title: 'Identity / Insurance Documents',
    description: 'Contains ID cards and insurance coverage proof.',
    icon: 'fa-id-card-o',
    defaultType: 'Insurance',
  },
];

const parseUploadedOn = (value: string): number => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const resolveGynaeDocumentCategory = (
  document: Pick<PatientDocumentDisplayRow, 'category' | 'type' | 'name'>
): GynaeDocumentCategoryKey => {
  const explicit = String(document.category || '').trim() as GynaeDocumentCategoryKey;
  if (GYNAE_DOCUMENT_CATEGORIES.some((item) => item.key === explicit)) {
    return explicit;
  }

  const type = String(document.type || '').trim().toLowerCase();
  const name = String(document.name || '').trim().toLowerCase();

  if (/usg|ultra|sonograph|obstetric|tvs|doppler|scan/.test(name) || type === 'radiology') {
    return 'ultrasound';
  }

  if (type === 'prescription' || /prescription|rx/.test(name)) {
    return 'prescription';
  }

  if (type === 'lab report' || /lab|cbc|urine|blood|hvs|pap/.test(name)) {
    return 'lab';
  }

  if (/consent|declaration|chaperone/.test(name)) {
    return 'consent';
  }

  if (/discharge|summary|follow[- ]?up paper/.test(name)) {
    return 'discharge';
  }

  if (type === 'insurance' || type === 'id proof' || /insurance|identity|id card|cnic|passport/.test(name)) {
    return 'identity';
  }

  return 'prescription';
};

export const buildGynaeDocumentCategoryViews = (
  rows: PatientDocumentDisplayRow[]
): GynaeDocumentCategoryView[] =>
  GYNAE_DOCUMENT_CATEGORIES.map((category) => {
    const documents = rows
      .filter((row) => resolveGynaeDocumentCategory(row) === category.key)
      .sort((left, right) => parseUploadedOn(right.uploadedOn) - parseUploadedOn(left.uploadedOn));

    const previewDocuments = documents.slice(0, 2);
    const extraPreviewCount = Math.max(documents.length - previewDocuments.length, 0);

    return {
      category,
      documents,
      fileCount: documents.length,
      latestDocument: documents[0] || null,
      previewDocuments,
      extraPreviewCount,
    };
  });

export const isImageDocumentUrl = (url: string): boolean =>
  /^(blob:|data:image\/|https?:\/\/.*\.(png|jpe?g|gif|webp|bmp)(\?|$))/i.test(String(url || '').trim());

export const documentPreviewLabel = (name: string): string => {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return 'DOC';
  }

  const parts = trimmed.split('.');
  if (parts.length > 1) {
    return parts.pop()?.slice(0, 4).toUpperCase() || 'DOC';
  }

  return trimmed.slice(0, 4).toUpperCase();
};

export const formatGynaeDocumentTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || '—';
  }

  const date = parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${date} • ${time}`;
};

export const findGynaeDocumentCategory = (
  key: GynaeDocumentCategoryKey | null | undefined
): GynaeDocumentCategory | undefined =>
  GYNAE_DOCUMENT_CATEGORIES.find((item) => item.key === key);

export const normalizeGynaeDocumentPayload = (
  value: PatientDocumentItem,
  categoryKey?: GynaeDocumentCategoryKey | null
): PatientDocumentItem => {
  const category = categoryKey || (value.category as GynaeDocumentCategoryKey | undefined);
  const meta = findGynaeDocumentCategory(category);

  return {
    ...value,
    category: category || value.category || '',
    type: value.type || meta?.defaultType || 'Other',
    notes: String(value.notes || '').trim(),
  };
};
