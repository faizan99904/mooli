import { LabComparisonRow } from '../../../shared/models/hospital.model';

export type LabComparisonColumn = {
  orderId: string;
  orderNo: string;
  date?: string;
  label: string;
  isCurrent: boolean;
};

export function formatComparisonColumnLabel(date?: string | null): string {
  if (!date) {
    return '—';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function buildLabComparisonColumns(
  rows: LabComparisonRow[],
  currentOrderId?: string,
  previousLimit = 4
): LabComparisonColumn[] {
  const orderMap = new Map<string, { orderId: string; orderNo: string; date?: string }>();

  rows.forEach((row) => {
    row.history.forEach((point) => {
      const orderId = String(point.orderId || '').trim();
      if (!orderId) {
        return;
      }

      const existing = orderMap.get(orderId);
      const pointTime = point.date ? new Date(point.date).getTime() : 0;
      const existingTime = existing?.date ? new Date(existing.date).getTime() : 0;

      if (!existing || pointTime >= existingTime) {
        orderMap.set(orderId, {
          orderId,
          orderNo: point.orderNo || orderId,
          date: point.date,
        });
      }
    });
  });

  const sorted = Array.from(orderMap.values()).sort(
    (left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime()
  );

  const currentId = String(currentOrderId || '').trim();
  const current = currentId ? sorted.find((entry) => entry.orderId === currentId) : undefined;
  const previous = sorted
    .filter((entry) => entry.orderId !== currentId)
    .slice(0, previousLimit)
    .reverse();
  const columns: LabComparisonColumn[] = [];

  previous.forEach((entry) => {
    columns.push({
      ...entry,
      label: formatComparisonColumnLabel(entry.date),
      isCurrent: false,
    });
  });

  if (current) {
    columns.push({
      ...current,
      label: formatComparisonColumnLabel(current.date),
      isCurrent: true,
    });
  }

  return columns;
}

export function findComparisonHistoryPoint(
  row: LabComparisonRow,
  orderId: string
): LabComparisonRow['history'][number] | undefined {
  return row.history.find((point) => String(point.orderId || '') === String(orderId || ''));
}

function normalizeComparisonText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export function findHistoryPointForReport(
  comparison: LabComparisonRow[],
  row: {
    testName: string;
    shortCode?: string;
    parameterName: string;
    subCategory?: string;
  },
  orderId: string
): LabComparisonRow['history'][number] | undefined {
  const targetOrderId = String(orderId || '').trim();
  if (!targetOrderId) {
    return undefined;
  }

  const parameterKey = normalizeComparisonText(row.parameterName);
  const testKey = normalizeComparisonText(row.testName);
  const shortKey = normalizeComparisonText(row.shortCode);
  const subCategoryKey = normalizeComparisonText(row.subCategory);
  const candidates = comparison.filter(
    (item) => normalizeComparisonText(item.parameterName) === parameterKey
  );

  const scoreCandidate = (item: LabComparisonRow): number => {
    const itemTest = normalizeComparisonText(item.testName);
    const itemSubCategory = normalizeComparisonText(item.subCategory);
    let score = 0;

    if (itemTest && (itemTest === testKey || (shortKey && itemTest === shortKey))) {
      score += 4;
    }

    if (subCategoryKey && itemSubCategory === subCategoryKey) {
      score += 2;
    } else if (!subCategoryKey || !itemSubCategory) {
      score += 1;
    }

    return score;
  };

  const ranked = [...candidates].sort((left, right) => scoreCandidate(right) - scoreCandidate(left));

  for (const item of ranked) {
    const point = findComparisonHistoryPoint(item, targetOrderId);
    if (String(point?.resultValue || '').trim()) {
      return point;
    }
  }

  return undefined;
}

export function buildPreviousComparisonOrders(
  comparison: LabComparisonRow[],
  currentOrderId?: string,
  previousLimit = 4
): Array<{ orderId: string; orderNo: string; date?: string }> {
  return buildLabComparisonColumns(comparison, currentOrderId, previousLimit)
    .filter((column) => !column.isCurrent)
    .map(({ orderId, orderNo, date }) => ({ orderId, orderNo, date }));
}
