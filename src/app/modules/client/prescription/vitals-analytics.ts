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

export const VITALS_MODAL_KNOWN_CUSTOM_KEYS = new Set([
  'height',
  'respiratoryRate',
  'respiratory_rate',
  'bloodSugar',
  'blood_sugar',
  'notes',
]);

export const isArbitraryCustomVitalKey = (key: string): boolean => {
  const normalized = String(key || '').trim();
  return Boolean(normalized) && !VITALS_MODAL_KNOWN_CUSTOM_KEYS.has(normalized);
};

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
    })
    .sort((first, second) => new Date(first.visitDate).getTime() - new Date(second.visitDate).getTime());
};

export type VitalsTrendRange = '7d' | '1m' | '3m' | '6m';

export interface SidebarVitalItem {
  key: string;
  label: string;
  icon: string;
  iconTone: string;
  value: string;
  displayValue: string;
  compactTrend?: string;
  trendClass: string;
  status: VitalStatus;
  statusLabel: string;
}

export interface VitalAlert {
  message: string;
  severity: VitalStatus;
}

export interface VitalHistoryRow {
  id: string;
  dateTime: string;
  weight: string;
  height: string;
  bp: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  notes: string;
  trends: Record<string, 'up' | 'down' | 'flat' | 'none'>;
}

export interface VitalChartPoint {
  label: string;
  value: number | null;
}

export interface VitalMiniChartData {
  key: string;
  title: string;
  unit: string;
  color: string;
  latestValue: string;
  compactTrend: string;
  trendClass: string;
  categories: string[];
  values: number[];
  hasData: boolean;
  apex: {
    series: Array<{ name: string; data: number[] }>;
    chart: {
      type: 'line';
      height: number;
      toolbar: { show: boolean };
      zoom: { enabled: boolean };
      sparkline: { enabled: boolean };
      fontFamily: string;
    };
    stroke: {
      curve: 'smooth';
      width: number;
      colors: string[];
    };
    markers: {
      size: number;
      colors: string[];
      strokeColors: string;
      strokeWidth: number;
      hover: { size: number };
    };
    xaxis: {
      categories: string[];
      labels: { style: { fontSize: string; colors: string } };
      axisBorder: { show: boolean };
      axisTicks: { show: boolean };
    };
    colors: string[];
  };
}

const VITAL_ICON_MAP: Record<string, { icon: string; tone: string }> = {
  weight: { icon: 'fa-balance-scale', tone: 'rose' },
  height: { icon: 'fa-ruler-vertical', tone: 'sky' },
  bmi: { icon: 'fa-chart-pie', tone: 'indigo' },
  bp: { icon: 'fa-heartbeat', tone: 'green' },
  pulse: { icon: 'fa-heart', tone: 'purple' },
  temperature: { icon: 'fa-thermometer-half', tone: 'amber' },
  spo2: { icon: 'fa-lungs', tone: 'blue' },
  respiratoryRate: { icon: 'fa-wind', tone: 'teal' },
};

const CHART_COLORS: Record<string, string> = {
  weight: '#ef4444',
  bp: '#22c55e',
  temperature: '#f59e0b',
  pulse: '#8b5cf6',
  spo2: '#3b82f6',
  respiratoryRate: '#14b8a6',
};

const CHART_TITLES: Record<string, string> = {
  weight: 'Weight (Kg)',
  bp: 'BP (mmHg)',
  temperature: 'Temperature (°F)',
  pulse: 'Pulse (/min)',
  spo2: 'SpO2 (%)',
  respiratoryRate: 'Resp. Rate (/min)',
};

const HISTORY_COLUMNS = [
  'weight',
  'height',
  'bp',
  'pulse',
  'temperature',
  'spo2',
  'respiratoryRate',
] as const;

const computeBmi = (weightRaw: string, heightRaw: string): number | null => {
  const weight = parseNumber(weightRaw);
  const height = parseNumber(heightRaw);
  if (weight === null || height === null || height <= 0) {
    return null;
  }

  const heightM = height > 3 ? height / 100 : height;
  if (heightM <= 0) {
    return null;
  }

  return weight / (heightM * heightM);
};

const evaluateBmiStatus = (bmi: number | null): { status: VitalStatus; statusLabel: string } => {
  if (bmi === null) {
    return { status: 'unknown', statusLabel: '—' };
  }

  if (bmi < 18.5) {
    return { status: 'watch', statusLabel: 'Low' };
  }

  if (bmi < 25) {
    return { status: 'normal', statusLabel: 'Normal' };
  }

  if (bmi < 30) {
    return { status: 'watch', statusLabel: 'Overweight' };
  }

  return { status: 'warning', statusLabel: 'High' };
};

const evaluateHeightStatus = (): { status: VitalStatus; statusLabel: string } => ({
  status: 'normal',
  statusLabel: 'Normal',
});

const formatCompactTrend = (
  key: string,
  currentRaw: string,
  previousRaw: string
): { compactTrend?: string; trendClass: string; difference?: number; percentageChange?: number } => {
  if (!currentRaw || !previousRaw) {
    return { trendClass: 'unknown' };
  }

  if (key === 'bp') {
    const current = parseBloodPressure(currentRaw);
    const previous = parseBloodPressure(previousRaw);
    if (current.systolic === null || previous.systolic === null) {
      return { trendClass: 'unknown' };
    }

    const systolicDiff = current.systolic - previous.systolic;
    const diastolicDiff = (current.diastolic || 0) - (previous.diastolic || 0);
    const arrow = systolicDiff > 0 ? '↑' : systolicDiff < 0 ? '↓' : '→';
    const trendClass = systolicDiff > 0 ? 'warning' : systolicDiff < 0 ? 'watch' : 'normal';

    return {
      difference: systolicDiff,
      compactTrend: `${arrow} ${formatSignedNumber(systolicDiff, 0)}/${formatSignedNumber(diastolicDiff, 0)}`,
      trendClass,
    };
  }

  const current = parseNumber(currentRaw);
  const previous = parseNumber(previousRaw);
  if (current === null || previous === null) {
    return { trendClass: 'unknown' };
  }

  const difference = current - previous;
  const percentageChange = previous !== 0 ? (difference / previous) * 100 : 0;
  const arrow = difference > 0 ? '↑' : difference < 0 ? '↓' : '→';
  const unit = vitalUnit(key);
  let valueText = `${formatSignedNumber(Math.abs(difference), key === 'temperature' ? 1 : 1)}`;
  if (key === 'weight') {
    valueText = `${Math.abs(difference).toFixed(1)} Kg`;
  } else if (key === 'temperature') {
    valueText = `${Math.abs(difference).toFixed(1)} °F`;
  } else if (key === 'pulse' || key === 'respiratoryRate') {
    valueText = `${Math.abs(difference).toFixed(0)} /min`;
  } else if (key === 'spo2') {
    valueText = `${Math.abs(difference).toFixed(0)}%`;
  } else if (unit) {
    valueText = `${Math.abs(difference).toFixed(1)} ${unit}`;
  }

  const pctSuffix =
    key === 'weight' || key === 'pulse' || key === 'respiratoryRate' || key === 'spo2'
      ? ` (${formatSignedNumber(percentageChange, 0)}%)`
      : '';

  let trendClass = 'normal';
  if (difference > 0) {
    trendClass = key === 'weight' ? 'normal' : 'warning';
  } else if (difference < 0) {
    trendClass = key === 'weight' ? 'warning' : 'watch';
  }

  return {
    difference,
    percentageChange,
    compactTrend: `${arrow} ${valueText}${pctSuffix}`,
    trendClass,
  };
};

const trendClassFromStatus = (status: VitalStatus, trendClass: string): string => {
  if (status === 'critical') {
    return 'critical';
  }

  if (status === 'warning') {
    return 'warning';
  }

  if (status === 'watch') {
    return 'watch';
  }

  return trendClass;
};

export const buildSidebarVitalItems = (
  current: Record<string, string>,
  previous: Record<string, string>,
  patientAgeYears: number | null
): SidebarVitalItem[] => {
  const height = String(current['height'] || '').trim();
  const previousHeight = String(previous['height'] || '').trim();
  const bmi = computeBmi(current['weight'] || '', height);
  const previousBmi = computeBmi(previous['weight'] || '', previousHeight);
  const bmiStatus = evaluateBmiStatus(bmi);
  const baseItems = buildVitalDisplayItems(current, previous, patientAgeYears);
  const baseMap = new Map(baseItems.map((item) => [item.key, item]));

  const orderedKeys: Array<{
    key: string;
    label: string;
    value: string;
    previous: string;
    status: VitalStatus;
    statusLabel: string;
  }> = [
    {
      key: 'weight',
      label: 'Weight',
      value: String(baseMap.get('weight')?.value || ''),
      previous: baseMap.get('weight')?.previousValue || '',
      status: baseMap.get('weight')?.status || 'unknown',
      statusLabel: baseMap.get('weight')?.statusLabel || '—',
    },
    {
      key: 'height',
      label: 'Height',
      value: height,
      previous: previousHeight,
      status: evaluateHeightStatus().status,
      statusLabel: evaluateHeightStatus().statusLabel,
    },
    {
      key: 'bmi',
      label: 'BMI',
      value: bmi !== null ? bmi.toFixed(1) : '',
      previous: previousBmi !== null ? previousBmi.toFixed(1) : '',
      status: bmiStatus.status,
      statusLabel: bmiStatus.statusLabel,
    },
    {
      key: 'bp',
      label: 'BP',
      value: String(baseMap.get('bp')?.value || ''),
      previous: baseMap.get('bp')?.previousValue || '',
      status: baseMap.get('bp')?.status || 'unknown',
      statusLabel: baseMap.get('bp')?.statusLabel || '—',
    },
    {
      key: 'pulse',
      label: 'Pulse',
      value: String(baseMap.get('pulse')?.value || ''),
      previous: baseMap.get('pulse')?.previousValue || '',
      status: baseMap.get('pulse')?.status || 'unknown',
      statusLabel: baseMap.get('pulse')?.statusLabel || '—',
    },
    {
      key: 'temperature',
      label: 'Temperature',
      value: String(baseMap.get('temperature')?.value || ''),
      previous: baseMap.get('temperature')?.previousValue || '',
      status: baseMap.get('temperature')?.status || 'unknown',
      statusLabel: baseMap.get('temperature')?.statusLabel || '—',
    },
    {
      key: 'spo2',
      label: 'SpO2',
      value: String(baseMap.get('spo2')?.value || ''),
      previous: baseMap.get('spo2')?.previousValue || '',
      status: baseMap.get('spo2')?.status || 'unknown',
      statusLabel: baseMap.get('spo2')?.statusLabel || '—',
    },
  ];

  const respiratoryRate = String(current['respiratoryRate'] || current['respiratory_rate'] || '').trim();
  const previousRespiratoryRate = String(previous['respiratoryRate'] || previous['respiratory_rate'] || '').trim();
  if (respiratoryRate) {
    const respStatus = evaluatePulseStatus(respiratoryRate, patientAgeYears);
    orderedKeys.push({
      key: 'respiratoryRate',
      label: 'Resp. Rate',
      value: respiratoryRate,
      previous: previousRespiratoryRate,
      status: respStatus.status,
      statusLabel: respStatus.statusLabel,
    });
  }

  return orderedKeys.map((item) => {
    const compact = formatCompactTrend(item.key, item.value, item.previous);
    const iconMeta = VITAL_ICON_MAP[item.key] || { icon: 'fa-notes-medical', tone: 'slate' };

    return {
      key: item.key,
      label: item.label,
      icon: iconMeta.icon,
      iconTone: iconMeta.tone,
      value: item.value,
      displayValue:
        item.key === 'height'
          ? item.value
            ? `${item.value} cm`
            : '—'
          : item.key === 'bmi'
            ? item.value || '—'
            : item.key === 'respiratoryRate'
              ? item.value
                ? `${item.value} /min`
                : '—'
              : formatDisplayValue(item.key, item.value),
      compactTrend: compact.compactTrend,
      trendClass: trendClassFromStatus(item.status, compact.trendClass),
      status: item.status,
      statusLabel: item.statusLabel,
    };
  });
};

export const buildVitalAlerts = (items: SidebarVitalItem[]): VitalAlert[] => {
  const alerts: VitalAlert[] = [];

  items.forEach((item) => {
    if (item.key === 'weight' && (item.status === 'critical' || item.statusLabel.toLowerCase().includes('drop'))) {
      alerts.push({ message: 'Significant weight loss detected', severity: 'critical' });
    }

    if (item.key === 'temperature' && (item.status === 'warning' || item.status === 'critical')) {
      alerts.push({ message: 'Fever recorded', severity: 'warning' });
    }

    if (item.key === 'pulse' && item.status === 'warning' && item.statusLabel.toLowerCase().includes('high')) {
      alerts.push({ message: 'Elevated pulse for age', severity: 'warning' });
    }

    if (item.key === 'spo2' && (item.status === 'warning' || item.status === 'critical')) {
      alerts.push({ message: 'Low oxygen saturation', severity: 'critical' });
    }
  });

  return alerts.slice(0, 4);
};

export const getVitalsTrendRangeDays = (range: VitalsTrendRange): number => {
  switch (range) {
    case '7d':
      return 7;
    case '1m':
      return 30;
    case '3m':
      return 90;
    case '6m':
      return 180;
    default:
      return 30;
  }
};

export const filterVitalTrendVisitsByRange = (
  visits: VitalTrendVisit[],
  range: VitalsTrendRange
): VitalTrendVisit[] => {
  const days = getVitalsTrendRangeDays(range);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return visits.filter((visit) => new Date(visit.visitDate).getTime() >= cutoff.getTime());
};

const extractChartValue = (key: string, vitals: Record<string, string>): number | null => {
  const raw = String(vitals[key] || vitals[key === 'respiratoryRate' ? 'respiratory_rate' : key] || '').trim();
  if (!raw) {
    return null;
  }

  if (key === 'bp') {
    return parseBloodPressure(raw).systolic;
  }

  if (key === 'temperature') {
    return parseTemperatureF(raw);
  }

  return parseNumber(raw);
};

export const buildVitalMiniCharts = (
  visits: VitalTrendVisit[],
  current: Record<string, string>,
  previous: Record<string, string>
): VitalMiniChartData[] => {
  const chartKeys = ['weight', 'bp', 'temperature', 'pulse', 'spo2', 'respiratoryRate'] as const;

  return chartKeys.map((key) => {
    const points: VitalChartPoint[] = visits.map((visit) => ({
      label: visit.label,
      value: extractChartValue(key, visit.vitals),
    }));

    const currentValue = extractChartValue(key, current);
    if (currentValue !== null) {
      const todayLabel = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const lastPoint = points[points.length - 1];
      if (!lastPoint || lastPoint.label !== todayLabel) {
        points.push({ label: todayLabel, value: currentValue });
      } else {
        lastPoint.value = currentValue;
      }
    }

    const filteredPoints = points.filter((point) => point.value !== null) as Array<{ label: string; value: number }>;
    const currentRaw = String(current[key] || current[key === 'respiratoryRate' ? 'respiratory_rate' : key] || '').trim();
    const previousRaw = String(previous[key] || previous[key === 'respiratoryRate' ? 'respiratory_rate' : key] || '').trim();
    const compact = formatCompactTrend(key, currentRaw, previousRaw);

    let latestValue = '—';
    if (key === 'bp' && currentRaw) {
      latestValue = currentRaw.includes('/') ? currentRaw : `${currentRaw} mmHg`;
    } else if (currentRaw) {
      latestValue = formatDisplayValue(key, currentRaw);
    } else if (filteredPoints.length > 0) {
      const last = filteredPoints[filteredPoints.length - 1];
      latestValue = key === 'bp' ? `${last.value} mmHg` : `${last.value}`;
    }

    const color = CHART_COLORS[key] || '#64748b';
    const categories = filteredPoints.map((point) => point.label);
    const values = filteredPoints.map((point) => point.value);

    return {
      key,
      title: CHART_TITLES[key] || key,
      unit: vitalUnit(key),
      color,
      latestValue,
      compactTrend: compact.compactTrend || '',
      trendClass: compact.trendClass,
      categories,
      values,
      hasData: values.length > 0,
      apex: {
        series: [{ name: CHART_TITLES[key] || key, data: values }],
        chart: {
          type: 'line',
          height: 150,
          toolbar: { show: false },
          zoom: { enabled: false },
          sparkline: { enabled: false },
          fontFamily: 'inherit',
        },
        stroke: {
          curve: 'smooth',
          width: 2.5,
          colors: [color],
        },
        markers: {
          size: 4,
          colors: ['#fff'],
          strokeColors: color,
          strokeWidth: 2,
          hover: { size: 5 },
        },
        xaxis: {
          categories,
          labels: {
            style: { fontSize: '10px', colors: '#94a3b8' },
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        colors: [color],
      },
    };
  });
};

const historyCellValue = (key: string, vitals: Record<string, string>): string => {
  const raw = String(vitals[key] || vitals[key === 'respiratoryRate' ? 'respiratory_rate' : key] || '').trim();
  if (!raw) {
    return '—';
  }

  if (key === 'height') {
    return /cm/i.test(raw) ? raw : `${raw} cm`;
  }

  if (key === 'weight' && !/kg/i.test(raw)) {
    return `${raw} Kg`;
  }

  if (key === 'temperature' && !/[fc°]/i.test(raw)) {
    return `${raw} °F`;
  }

  if (key === 'pulse' && !/\/min/i.test(raw)) {
    return `${raw} /min`;
  }

  if (key === 'spo2' && !/%/.test(raw)) {
    return `${raw}%`;
  }

  if (key === 'respiratoryRate' && !/\/min/i.test(raw)) {
    return `${raw} /min`;
  }

  return raw;
};

const compareTrend = (currentRaw: string, previousRaw: string): 'up' | 'down' | 'flat' | 'none' => {
  if (!currentRaw || !previousRaw || currentRaw === '—' || previousRaw === '—') {
    return 'none';
  }

  if (currentRaw.includes('/')) {
    const current = parseBloodPressure(currentRaw);
    const previous = parseBloodPressure(previousRaw);
    if (current.systolic === null || previous.systolic === null) {
      return 'none';
    }

    if (current.systolic > previous.systolic) {
      return 'up';
    }

    if (current.systolic < previous.systolic) {
      return 'down';
    }

    return 'flat';
  }

  const current = parseNumber(currentRaw);
  const previous = parseNumber(previousRaw);
  if (current === null || previous === null) {
    return 'none';
  }

  if (current > previous) {
    return 'up';
  }

  if (current < previous) {
    return 'down';
  }

  return 'flat';
};

export const buildVitalHistoryRows = (
  visits: VitalTrendVisit[],
  current?: Record<string, string>
): VitalHistoryRow[] => {
  const rows: VitalHistoryRow[] = visits
    .slice()
    .reverse()
    .map((visit, index) => {
      const vitals = visit.vitals;
      return {
        id: `${visit.visitDate}-${index}`,
        dateTime: new Date(visit.visitDate).toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        weight: historyCellValue('weight', vitals),
        height: historyCellValue('height', vitals),
        bp: historyCellValue('bp', vitals),
        pulse: historyCellValue('pulse', vitals),
        temperature: historyCellValue('temperature', vitals),
        spo2: historyCellValue('spo2', vitals),
        respiratoryRate: historyCellValue('respiratoryRate', vitals),
        notes: String(vitals['notes'] || '').trim() || '—',
        trends: {} as Record<string, 'up' | 'down' | 'flat' | 'none'>,
      };
    });

  if (current && Object.values(current).some((value) => String(value || '').trim())) {
    rows.unshift({
      id: 'current',
      dateTime: new Date().toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      weight: historyCellValue('weight', current),
      height: historyCellValue('height', current),
      bp: historyCellValue('bp', current),
      pulse: historyCellValue('pulse', current),
      temperature: historyCellValue('temperature', current),
      spo2: historyCellValue('spo2', current),
      respiratoryRate: historyCellValue('respiratoryRate', current),
      notes: String(current['notes'] || '').trim() || '—',
      trends: {} as Record<string, 'up' | 'down' | 'flat' | 'none'>,
    });
  }

  rows.forEach((row, index) => {
    const previous = rows[index + 1];
    if (!previous) {
      HISTORY_COLUMNS.forEach((key) => {
        row.trends[key] = 'none';
      });
      return;
    }

    HISTORY_COLUMNS.forEach((key) => {
      row.trends[key] = compareTrend(String(row[key as keyof VitalHistoryRow] || ''), String(previous[key as keyof VitalHistoryRow] || ''));
    });
  });

  return rows;
};
