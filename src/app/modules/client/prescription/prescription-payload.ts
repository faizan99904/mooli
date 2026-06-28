const MEDICINE_KEYS = [
  'name',
  'type',
  'route',
  'eye',
  'dosage',
  'frequency',
  'duration',
  'afterMeal',
  'beforeMeal',
  'morning',
  'morningDose',
  'noon',
  'noonDose',
  'evening',
  'eveningDose',
  'night',
  'nightDose',
  'instructions',
] as const;

const PRESCRIPTION_BODY_KEYS = new Set([
  'hospitalId',
  'patientId',
  'doctorId',
  'appointmentId',
  'medicines',
  'chiefComplaint',
  'history',
  'examination',
  'diagnosis',
  'visitType',
  'labTests',
  'ivFluids',
  'admissionOrders',
  'admissionOrderItems',
  'patientDocuments',
  'vitals',
  'specialtySection',
  'specialtyData',
  'advice',
  'followUpDate',
  'prescriptionTemplate',
]);

const SPECIALTY_VALUE_MAX = 10000;
const DOCUMENT_URL_MAX = 12_000_000;

function pickRecord(
  source: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  keys.forEach((key) => {
    if (key in source) {
      result[key] = source[key];
    }
  });

  return result;
}

function sanitizeMedicines(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => item && String((item as Record<string, unknown>)['name'] || '').trim())
    .map((item) => pickRecord(item as Record<string, unknown>, MEDICINE_KEYS));
}

function sanitizeLabTests(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record['name'] || '').trim(),
        category: String(record['category'] || '').trim() || undefined,
      };
    })
    .filter((item) => item.name);
}

function sanitizeSpecialtyData(raw: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(value ?? '').trim();
    if (!normalizedKey || !normalizedValue) {
      return;
    }

    result[normalizedKey] =
      normalizedValue.length > SPECIALTY_VALUE_MAX
        ? normalizedValue.slice(0, SPECIALTY_VALUE_MAX)
        : normalizedValue;
  });

  return result;
}

function sanitizePatientDocuments(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const record = item as Record<string, unknown>;
      const url = String(record['url'] || '').trim();
      return {
        name: String(record['name'] || '').trim(),
        type: String(record['type'] || 'Other').trim() || 'Other',
        category: String(record['category'] || '').trim() || undefined,
        notes: String(record['notes'] || '').trim() || undefined,
        uploadedOn: String(record['uploadedOn'] || '').trim() || undefined,
        uploadedBy: String(record['uploadedBy'] || '').trim() || undefined,
        url: url.length > DOCUMENT_URL_MAX ? '' : url,
      };
    })
    .filter((item) => item.name);
}

function sanitizeVisitType(value: unknown): 'opd' | 'follow_up' | undefined {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'opd') {
    return 'opd';
  }

  if (normalized === 'follow_up' || normalized === 'follow up' || normalized === 'followup') {
    return 'follow_up';
  }

  return undefined;
}

export function sanitizePrescriptionPayload(
  payload: Record<string, unknown>,
  options: { includeHospitalId?: boolean } = {}
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (!PRESCRIPTION_BODY_KEYS.has(key)) {
      return;
    }

    if (key === 'hospitalId' && !options.includeHospitalId) {
      return;
    }

    if (value === undefined || value === null || value === '') {
      return;
    }

    sanitized[key] = value;
  });

  if ('medicines' in sanitized) {
    sanitized['medicines'] = sanitizeMedicines(sanitized['medicines']);
  }

  if ('labTests' in sanitized) {
    sanitized['labTests'] = sanitizeLabTests(sanitized['labTests']);
  }

  if ('specialtyData' in sanitized) {
    sanitized['specialtyData'] = sanitizeSpecialtyData(sanitized['specialtyData']);
  }

  if ('patientDocuments' in sanitized) {
    sanitized['patientDocuments'] = sanitizePatientDocuments(sanitized['patientDocuments']);
  }

  if ('visitType' in sanitized) {
    const visitType = sanitizeVisitType(sanitized['visitType']);
    if (visitType) {
      sanitized['visitType'] = visitType;
    } else {
      delete sanitized['visitType'];
    }
  }

  return sanitized;
}

export function formatApiValidationError(error: unknown): string {
  const body = (error as { error?: Record<string, unknown> } | null)?.error;
  const baseMessage = String(body?.['message'] || 'Request validation failed');
  const details = body?.['details'];

  if (!Array.isArray(details) || details.length === 0) {
    return baseMessage;
  }

  const fieldMessages = details
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return '';
      }

      const path = String((item as Record<string, unknown>)['path'] || 'field');
      const message = String((item as Record<string, unknown>)['message'] || 'Invalid value');
      return `${path}: ${message}`;
    })
    .filter(Boolean)
    .slice(0, 3);

  if (!fieldMessages.length) {
    return baseMessage;
  }

  return `${baseMessage} — ${fieldMessages.join('; ')}`;
}
