export type IvFluidStatus = 'running' | 'completed' | 'planned';

export interface IvFluidDisplayRow {
  id: string;
  name: string;
  rate: string;
  quantity: string;
  route: string;
  startDateTime: string;
  status: IvFluidStatus;
  source: 'demo' | 'form';
  formIndex?: number;
}

const DEMO_IV_FLUIDS: Array<Omit<IvFluidDisplayRow, 'id' | 'source'>> = [
  {
    name: 'DNS',
    rate: '80 ml/hr',
    quantity: '500 ml',
    route: 'IV',
    startDateTime: 'Jun 12, 2026 11:00 PM',
    status: 'running',
  },
  {
    name: 'RL',
    rate: '100 ml/hr',
    quantity: '500 ml',
    route: 'IV',
    startDateTime: 'Jun 13, 2026 09:00 AM',
    status: 'running',
  },
  {
    name: 'NS',
    rate: '60 ml/hr',
    quantity: '500 ml',
    route: 'IV',
    startDateTime: 'Jun 14, 2026 08:00 AM',
    status: 'completed',
  },
  {
    name: 'D5-NS',
    rate: '75 ml/hr',
    quantity: '500 ml',
    route: 'IV',
    startDateTime: 'Jun 15, 2026 08:00 AM',
    status: 'planned',
  },
];

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

export const buildIvFluidDisplayRows = (
  formFluids: Array<{
    name?: string;
    rate?: string;
    duration?: string;
    route?: string;
    status?: IvFluidStatus;
    startDateTime?: string;
  }>
): IvFluidDisplayRow[] => {
  const demoRows: IvFluidDisplayRow[] = DEMO_IV_FLUIDS.map((row) => ({
    ...row,
    id: `demo-${row.name}`,
    source: 'demo',
  }));

  const demoNames = new Set(demoRows.map((row) => row.name.toLowerCase()));

  const formRows: IvFluidDisplayRow[] = formFluids
    .map((fluid, index) => {
      const name = String(fluid.name || '').trim();
      if (!name || demoNames.has(name.toLowerCase())) {
        return null;
      }

      return {
        id: `form-${index}-${name}`,
        name,
        rate: normalizeRate(fluid.rate),
        quantity: normalizeQuantity(fluid.duration),
        route: String(fluid.route || 'IV').trim() || 'IV',
        startDateTime: formatStartDateTime(fluid.startDateTime),
        status: (fluid.status || 'planned') as IvFluidStatus,
        source: 'form' as const,
        formIndex: index,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return [...demoRows, ...formRows];
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
