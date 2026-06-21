import { User } from '../../shared/models/hospital.model';

export const formatCurrency = (value: number | string | null | undefined): string => {
  const numeric = Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `PKR ${safe.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const toDateInputValue = (value: string | Date | null | undefined): string => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeText = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const getStoredUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
  } catch {
    return null;
  }
};

export const readAssignedStoreId = (): string => getStoredUser()?.storeId || '';
