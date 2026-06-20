import { LabOrder } from '../../../shared/models/hospital.model';

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
