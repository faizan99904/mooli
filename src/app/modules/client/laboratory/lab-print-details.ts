import { Hospital, LabOrder, LaboratoryPrintSettings } from '../../../shared/models/hospital.model';

export interface LabPrintDetails {
  name: string;
  phone: string;
  email: string;
  addressLine: string;
  tagline: string;
  source: 'laboratory' | 'hospital';
}

const DEFAULT_LAB_TAGLINE = 'Pathology & Diagnostic Laboratory';

export function isLabOrderReportReady(order: LabOrder | null | undefined): boolean {
  const items = (order?.items || []).filter((item) => item.status !== 'cancelled');
  if (!items.length) {
    return false;
  }

  return items.every((item) => item.status === 'verified' || item.status === 'completed');
}

function hospitalPrintDetails(hospital: Hospital | null): LabPrintDetails {
  return {
    name: hospital?.name?.trim() || 'Laboratory',
    phone: hospital?.phone?.trim() || '',
    email: hospital?.email?.trim() || '',
    addressLine: [hospital?.address, hospital?.city].filter(Boolean).join(', '),
    tagline: DEFAULT_LAB_TAGLINE,
    source: 'hospital',
  };
}

function laboratoryPrintDetails(
  hospital: Hospital | null,
  settings: LaboratoryPrintSettings | null | undefined
): LabPrintDetails {
  const fallback = hospitalPrintDetails(hospital);

  return {
    name: settings?.name?.trim() || fallback.name,
    phone: settings?.phone?.trim() || fallback.phone,
    email: settings?.email?.trim() || fallback.email,
    addressLine:
      [settings?.address, settings?.city].filter(Boolean).join(', ') || fallback.addressLine,
    tagline: settings?.tagline?.trim() || fallback.tagline,
    source: 'laboratory',
  };
}

export function hasCustomLabPrintDetails(hospital: Hospital | null): boolean {
  return hospital?.laboratorySettings?.useCustomDetails === true;
}

export function resolveLabPrintDetails(
  hospital: Hospital | null,
  options: { mode: 'receipt' | 'report'; order?: LabOrder | null }
): LabPrintDetails {
  const labSettings = hospital?.laboratorySettings;

  if (!hasCustomLabPrintDetails(hospital)) {
    return hospitalPrintDetails(hospital);
  }

  if (options.mode === 'receipt') {
    return laboratoryPrintDetails(hospital, labSettings);
  }

  const orderReady = options.order ? isLabOrderReportReady(options.order) : false;
  if (orderReady) {
    return laboratoryPrintDetails(hospital, labSettings);
  }

  return hospitalPrintDetails(hospital);
}
