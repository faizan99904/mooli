export type IvFluidStatus = 'running' | 'completed' | 'planned';

export interface IvFluidDisplayRow {
  id: string;
  name: string;
  rate: string;
  quantity: string;
  route: string;
  startDateTime: string;
  status: IvFluidStatus;
  source: 'saved' | 'form';
  formIndex?: number;
  prescriptionId?: string;
}

export interface PatientIvFluidRecord {
  prescriptionId: string;
  orderedAt?: string;
  name: string;
  rate?: string;
  duration?: string;
  route?: string;
  status?: IvFluidStatus;
  startDateTime?: string;
}

export const IV_FLUID_OPTIONS = ['DNS', 'RL', 'NS', 'D5-NS', 'D5W', 'DNS + KCl'];

const formatStartDateTime = (value?: string): string => {
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

const normalizeQuantity = (value?: string): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '—';
  }

  return /ml/i.test(raw) ? raw : `${raw} ml`;
};

const normalizeRate = (value?: string): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '—';
  }

  return /ml\/hr|ml\/h/i.test(raw) ? raw : `${raw} ml/hr`;
};

const buildIvFluidRow = (
  id: string,
  fluid: {
    name: string;
    rate?: string;
    duration?: string;
    route?: string;
    status?: IvFluidStatus;
    startDateTime?: string;
  },
  source: 'saved' | 'form',
  extras?: { formIndex?: number; prescriptionId?: string; fallbackStart?: string }
): IvFluidDisplayRow => ({
  id,
  name: fluid.name,
  rate: normalizeRate(fluid.rate),
  quantity: normalizeQuantity(fluid.duration),
  route: String(fluid.route || 'IV').trim() || 'IV',
  startDateTime: formatStartDateTime(fluid.startDateTime || extras?.fallbackStart),
  status: (fluid.status || 'planned') as IvFluidStatus,
  source,
  formIndex: extras?.formIndex,
  prescriptionId: extras?.prescriptionId,
});

export const buildIvFluidDisplayRows = (
  savedFluids: PatientIvFluidRecord[],
  formFluids: Array<{
    name?: string;
    rate?: string;
    duration?: string;
    route?: string;
    status?: IvFluidStatus;
    startDateTime?: string;
  }>
): IvFluidDisplayRow[] => {
  const savedRows = savedFluids.map((record, index) =>
    buildIvFluidRow(
      `saved-${record.prescriptionId}-${record.name}-${index}`,
      {
        name: record.name,
        rate: record.rate,
        duration: record.duration,
        route: record.route,
        status: record.status,
        startDateTime: record.startDateTime,
      },
      'saved',
      { prescriptionId: record.prescriptionId, fallbackStart: record.orderedAt }
    )
  );

  const formRows: IvFluidDisplayRow[] = formFluids
    .map((fluid, index) => {
      const name = String(fluid.name || '').trim();
      if (!name) {
        return null;
      }

      return buildIvFluidRow(
        `form-${index}-${name}`,
        {
          name,
          rate: fluid.rate,
          duration: fluid.duration,
          route: fluid.route,
          status: fluid.status,
          startDateTime: fluid.startDateTime,
        },
        'form',
        { formIndex: index }
      );
    })
    .filter((row): row is IvFluidDisplayRow => row !== null);

  return [...savedRows, ...formRows];
};

export const countActiveIvFluids = (rows: IvFluidDisplayRow[]): number =>
  rows.filter((row) => row.status === 'running').length;

export const ivFluidStatusLabel = (status: IvFluidStatus): string => {
  switch (status) {
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    default:
      return 'Planned';
  }
};
