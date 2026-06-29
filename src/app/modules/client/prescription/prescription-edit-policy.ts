import { Prescription } from '../../../shared/models/hospital.model';

export function resolvePrescriptionOwnerUserId(prescription: Prescription | null | undefined): string {
  if (!prescription) {
    return '';
  }

  const rawDoctorId = prescription.doctorId as string | { _id?: string } | null | undefined;
  if (rawDoctorId && typeof rawDoctorId === 'object' && rawDoctorId._id) {
    return String(rawDoctorId._id).trim();
  }

  return String(rawDoctorId || prescription.doctor?._id || '').trim();
}

export function canEditPrescriptionInPlace(
  prescription: Prescription | null | undefined,
  currentUserId: string | null
): boolean {
  if (!prescription) {
    return true;
  }

  const currentId = String(currentUserId || '').trim();
  if (!currentId) {
    return false;
  }

  const ownerId = resolvePrescriptionOwnerUserId(prescription);
  if (!ownerId) {
    return true;
  }

  return ownerId === currentId;
}
