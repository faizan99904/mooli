export type VitalStatus = 'normal' | 'watch' | 'warning' | 'critical' | 'unknown';

export interface VitalDisplayItem {
  key: string;
  label: string;
  value: string;
  displayValue: string;
  previousValue?: string;
  difference?: number;
  percentageChange?: number;
  status: VitalStatus;
  statusLabel: string;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'flat' | 'none';
}

export interface VitalTrendVisit {
  visitDate: string;
  label: string;
  vitals: Record<string, string>;
}

const DEFAULT_VITAL_KEYS = ['bp', 'pulse', 'weight', 'temperature', 'spo2'] as const;

const DEFAULT_VITAL_LABELS: Record<string, string> = {
  bp: 'BP',
  pulse: 'Pulse',
  weight: 'Weight',
  temperature: 'Temperature',
  spo2: 'SpO2',
};

export const getPatientAgeYears = (dateOfBirth?: string | null): number | null => {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    years -= 1;
  }

  return Math.max(years, 0);
};

const parseNumber = (value: string): number | null => {
  const match = String(value || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBloodPressure = (value: string): { systolic: number | null; diastolic: number | null } => {
  const match = String(value || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    return { systolic: null, diastolic: null };
  }

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
};

const parseTemperatureF = (value: string): number | null => {
  const raw = String(value || '').trim().toLowerCase();
  const number = parseNumber(raw);
  if (number === null) {
    return null;
  }

  if (raw.includes('c')) {
    return (number * 9) / 5 + 32;
  }

  return number;
};

const formatSignedNumber = (value: number, digits = 1): string => {
  const rounded = Number(value.toFixed(digits));
  if (rounded > 0) {
    return `+${rounded}`;
  }

  return String(rounded);
};

const formatPercent = (value: number): string => `${Math.abs(Math.round(value))}%`;

const buildTrend = (
  key: string,
  currentRaw: string,
  previousRaw: string,
  unit: string
): Pick<VitalDisplayItem, 'difference' | 'percentageChange' | 'trendText' | 'trendDirection'> => {
  if (!currentRaw || !previousRaw) {
    return { trendDirection: 'none' };
  }

  if (key === 'bp') {
    const current = parseBloodPressure(currentRaw);
    const previous = parseBloodPressure(previousRaw);
    if (current.systolic === null || previous.systolic === null) {
      return { trendDirection: 'none' };
    }

    const difference = current.systolic - previous.systolic;
    const arrow = difference > 0 ? '↑' : difference < 0 ? '↓' : '→';
    return {
      difference,
      trendDirection: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat',
      trendText: `${arrow} ${formatSignedNumber(difference, 0)} systolic from last visit`,
    };
  }

  const current = parseNumber(currentRaw);
  const previous = parseNumber(previousRaw);
  if (current === null || previous === null) {
    return { trendDirection: 'none' };
  }

  const difference = current - previous;
  const percentageChange = previous !== 0 ? (difference / previous) * 100 : 0;
  const arrow = difference > 0 ? '↑' : difference < 0 ? '↓' : '→';
  const unitSuffix = unit ? ` ${unit}` : '';

  return {
    difference,
    percentageChange,
    trendDirection: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat',
    trendText: `${arrow} ${formatSignedNumber(difference)}${unitSuffix} from last visit`,
  };
};

const evaluateWeightStatus = (
  difference: number | undefined,
  percentageChange: number | undefined
): { status: VitalStatus; statusLabel: string } => {
  if (difference === undefined || percentageChange === undefined) {
    return { status: 'unknown', statusLabel: 'No previous record' };
  }

  const absPct = Math.abs(percentageChange);

  if (difference < 0 && absPct > 10) {
    return { status: 'critical', statusLabel: 'Significant drop' };
  }

  if (absPct > 10) {
    return { status: 'warning', statusLabel: 'Major change' };
  }

  if (absPct >= 5) {
    return { status: 'watch', statusLabel: 'Watch' };
  }

  return { status: 'normal', statusLabel: 'Normal' };
};

const evaluateTemperatureStatus = (value: string): { status: VitalStatus; statusLabel: string } => {
  const tempF = parseTemperatureF(value);
  if (tempF === null) {
    return { status: 'unknown', statusLabel: '—' };
  }

  if (tempF >= 103) {
    return { status: 'critical', statusLabel: 'High fever' };
  }

  if (tempF >= 100.4) {
    return { status: 'warning', statusLabel: 'Fever' };
  }

  if (tempF >= 99.1) {
    return { status: 'watch', statusLabel: 'Mild fever' };
  }

  if (tempF >= 97 && tempF <= 99) {
    return { status: 'normal', statusLabel: 'Normal' };
  }

  return { status: 'watch', statusLabel: 'Review' };
};

const getPulseRange = (ageYears: number | null): { min: number; max: number } => {
  if (ageYears === null) {
    return { min: 60, max: 100 };
  }

  if (ageYears < 1) {
    return { min: 90, max: 150 };
  }

  if (ageYears < 3) {
    return { min: 80, max: 140 };
  }

  if (ageYears < 12) {
    return { min: 70, max: 120 };
  }

  return { min: 60, max: 100 };
};

const evaluatePulseStatus = (
  value: string,
  ageYears: number | null
): { status: VitalStatus; statusLabel: string } => {
  const pulse = parseNumber(value);
  if (pulse === null) {
    return { status: 'unknown', statusLabel: '—' };
  }

  const range = getPulseRange(ageYears);
  if (pulse < range.min) {
    return { status: 'warning', statusLabel: 'Low for age' };
  }

  if (pulse > range.max) {
    return { status: 'warning', statusLabel: 'High for age' };
  }

  return { status: 'normal', statusLabel: 'Normal' };
};

const evaluateBloodPressureStatus = (
  value: string,
  ageYears: number | null
): { status: VitalStatus; statusLabel: string } => {
  const { systolic, diastolic } = parseBloodPressure(value);
  if (systolic === null || diastolic === null) {
    return { status: 'unknown', statusLabel: '—' };
  }

  if (ageYears !== null && ageYears < 12) {
    return { status: 'watch', statusLabel: 'Age-based review' };
  }

  if (systolic >= 130 || diastolic >= 85) {
    return { status: 'warning', statusLabel: 'High' };
  }

  if (systolic < 90 || diastolic < 60) {
    return { status: 'warning', statusLabel: 'Low' };
  }

  return { status: 'normal', statusLabel: 'Normal' };
};

const evaluateSpO2Status = (value: string): { status: VitalStatus; statusLabel: string } => {
  const spo2 = parseNumber(value);
  if (spo2 === null) {
    return { status: 'unknown', statusLabel: '—' };
  }

  if (spo2 < 90) {
    return { status: 'critical', statusLabel: 'Critical' };
  }

  if (spo2 < 95) {
    return { status: 'warning', statusLabel: 'Low oxygen' };
  }

  return { status: 'normal', statusLabel: 'Normal' };
};

const evaluateVitalStatus = (
  key: string,
  value: string,
  trend: Pick<VitalDisplayItem, 'difference' | 'percentageChange'>,
  ageYears: number | null
): { status: VitalStatus; statusLabel: string } => {
  if (!value) {
    return { status: 'unknown', statusLabel: 'Not recorded' };
  }

  if (key === 'weight' && trend.difference === undefined) {
    return { status: 'unknown', statusLabel: 'Recorded' };
  }

  switch (key) {
    case 'weight':
      return evaluateWeightStatus(trend.difference, trend.percentageChange);
    case 'temperature':
      return evaluateTemperatureStatus(value);
    case 'pulse':
      return evaluatePulseStatus(value, ageYears);
    case 'bp':
      return evaluateBloodPressureStatus(value, ageYears);
    case 'spo2':
      return evaluateSpO2Status(value);
    default:
      return { status: 'unknown', statusLabel: 'Recorded' };
  }
};

const formatDisplayValue = (key: string, value: string): string => {
  if (!value) {
    return '—';
  }

  if (key === 'bp' && !/mmhg/i.test(value)) {
    return `${value} mmHg`;
  }

  if (key === 'pulse' && !/\/min/i.test(value)) {
    return `${value} /min`;
  }

  if (key === 'weight' && !/kg/i.test(value)) {
    return `${value} Kg`;
  }

  if (key === 'temperature' && !/[fc°]/i.test(value)) {
    return `${value} F`;
  }

  if (key === 'spo2' && !/%/.test(value)) {
    return `${value}%`;
  }

  return value;
};

const vitalUnit = (key: string): string => {
  switch (key) {
    case 'weight':
      return 'kg';
    case 'temperature':
      return 'F';
    case 'pulse':
      return '/min';
    case 'spo2':
      return '%';
    default:
      return '';
  }
};

export const buildVitalDisplayItems = (
  current: Record<string, string>,
  previous: Record<string, string>,
  patientAgeYears: number | null
): VitalDisplayItem[] => {
  return DEFAULT_VITAL_KEYS.map((key) => {
    const currentValue = String(current[key] || '').trim();
    const previousValue = String(previous[key] || '').trim();
    const trend = buildTrend(key, currentValue, previousValue, vitalUnit(key));
    const status = evaluateVitalStatus(key, currentValue, trend, patientAgeYears);
    const percentageSuffix =
      trend.percentageChange !== undefined && key === 'weight'
        ? ` (${formatSignedNumber(trend.percentageChange, 0)}%)`
        : '';

    return {
      key,
      label: DEFAULT_VITAL_LABELS[key] || key,
      value: currentValue,
      displayValue: formatDisplayValue(key, currentValue),
      previousValue: previousValue || undefined,
      difference: trend.difference,
      percentageChange: trend.percentageChange,
      status: status.status,
      statusLabel: status.statusLabel,
      trendText: trend.trendText ? `${trend.trendText}${percentageSuffix}` : undefined,
      trendDirection: trend.trendDirection,
    };
  });
};

export const buildVitalTrendVisits = (
  visits: Array<{ createdAt?: string; vitals?: Record<string, string> | null; diagnosis?: string | null }>
): VitalTrendVisit[] => {
  return visits
    .filter((visit) => visit.vitals && Object.values(visit.vitals).some((value) => String(value || '').trim()))
    .map((visit) => {
      const date = visit.createdAt ? new Date(visit.createdAt) : new Date();
      return {
        visitDate: date.toISOString(),
        label: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        vitals: visit.vitals || {},
      };
    });
};
