export interface ChartPoint {
  label: string;
  value: number;
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function parseNumericValue(value: unknown): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildLineChartModel(
  points: ChartPoint[],
  width = 260,
  height = 120,
  padding = 16
): {
  path: string;
  dots: Array<{ x: number; y: number; label: string; value: number }>;
  labels: Array<{ x: number; label: string }>;
  hasData: boolean;
} {
  const valid = points.filter((point) => Number.isFinite(point.value));
  if (!valid.length) {
    return { path: '', dots: [], labels: [], hasData: false };
  }

  const max = Math.max(...valid.map((point) => point.value), 1);
  const min = Math.min(...valid.map((point) => point.value), 0);
  const range = max - min || 1;
  const step = valid.length > 1 ? (width - padding * 2) / (valid.length - 1) : 0;

  const dots = valid.map((point, index) => {
    const x = padding + index * step;
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { x, y, label: point.label, value: point.value };
  });

  const path = dots.map((dot, index) => `${index === 0 ? 'M' : 'L'}${dot.x},${dot.y}`).join(' ');
  const labels = dots.map((dot) => ({ x: dot.x, label: dot.label }));

  return { path, dots, labels, hasData: dots.length > 0 };
}

export function buildDonutSegments(segments: DonutSegment[]): Array<DonutSegment & { dash: string; offset: number }> {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  if (!total) {
    return [];
  }

  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  return segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const length = (segment.value / total) * circumference;
      const item = {
        ...segment,
        dash: `${length} ${circumference - length}`,
        offset: -offset,
      };
      offset += length;
      return item;
    });
}
