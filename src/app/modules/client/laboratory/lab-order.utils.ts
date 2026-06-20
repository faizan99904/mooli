import { LabOrder, LabSample } from '../../../shared/models/hospital.model';

export function canEditLabOrder(order: LabOrder | null | undefined): boolean {
  if (!order) {
    return false;
  }

  if (['verified', 'completed', 'cancelled'].includes(order.status)) {
    return false;
  }

  return (order.items || []).every(
    (item) =>
      item.status === 'cancelled' ||
      item.status === 'ordered' ||
      item.status === 'sample_collected'
  );
}

export function hasPendingSampleCollection(order: LabOrder | null | undefined): boolean {
  return (order?.items || []).some((item) => item.status === 'ordered');
}

export function activeLabSamples(order: LabOrder | null | undefined): LabSample[] {
  return (order?.samples || []).filter((sample) => sample.status !== 'rejected');
}

export function sampleStatusLabel(status?: string): string {
  return String(status || 'collected').replace(/_/g, ' ');
}
