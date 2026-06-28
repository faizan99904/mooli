export interface PatientDocumentItem {
  name: string;
  type?: string;
  category?: string;
  notes?: string;
  uploadedOn?: string;
  uploadedBy?: string;
  url?: string;
}

export interface PatientDocumentRecord extends PatientDocumentItem {
  prescriptionId?: string;
  historyId?: string;
  sourceType: 'prescription' | 'history';
}

export interface PatientDocumentDisplayRow {
  id: string;
  name: string;
  type: string;
  category: string;
  notes: string;
  uploadedOn: string;
  uploadedBy: string;
  url: string;
  source: 'saved' | 'history' | 'form';
  formIndex?: number;
  prescriptionId?: string;
  historyId?: string;
}

export const DOCUMENT_TYPES = [
  'Prescription',
  'Lab Report',
  'Radiology',
  'Insurance',
  'ID Proof',
  'Other',
];

const formatUploadedOn = (value?: string): string => {
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

const buildDocumentRow = (
  id: string,
  item: PatientDocumentItem,
  source: 'saved' | 'history' | 'form',
  extras?: {
    formIndex?: number;
    prescriptionId?: string;
    historyId?: string;
    fallbackUploadedOn?: string;
    fallbackUploadedBy?: string;
  }
): PatientDocumentDisplayRow => ({
  id,
  name: String(item.name || '').trim(),
  type: String(item.type || 'Other').trim() || 'Other',
  category: String(item.category || '').trim(),
  notes: String(item.notes || '').trim(),
  uploadedOn: formatUploadedOn(item.uploadedOn || extras?.fallbackUploadedOn),
  uploadedBy: String(item.uploadedBy || extras?.fallbackUploadedBy || '—').trim() || '—',
  url: String(item.url || '').trim(),
  source,
  formIndex: extras?.formIndex,
  prescriptionId: extras?.prescriptionId,
  historyId: extras?.historyId,
});

export const buildPatientDocumentDisplayRows = (
  savedDocuments: PatientDocumentRecord[],
  formDocuments: PatientDocumentItem[]
): PatientDocumentDisplayRow[] => {
  const savedRows = savedDocuments.map((record, index) =>
    buildDocumentRow(
      `saved-${record.prescriptionId || record.historyId || 'doc'}-${index}-${record.name}`,
      record,
      record.sourceType === 'history' ? 'history' : 'saved',
      {
        prescriptionId: record.prescriptionId,
        historyId: record.historyId,
        fallbackUploadedOn: record.uploadedOn,
        fallbackUploadedBy: record.uploadedBy,
      }
    )
  );

  const formRows = formDocuments
    .map((item, index) => {
      const name = String(item.name || '').trim();
      if (!name) {
        return null;
      }

      return buildDocumentRow(`form-${index}-${name}`, item, 'form', { formIndex: index });
    })
    .filter((row): row is PatientDocumentDisplayRow => row !== null);

  return [...savedRows, ...formRows];
};

export const countPatientDocuments = (rows: PatientDocumentDisplayRow[]): number => rows.length;
