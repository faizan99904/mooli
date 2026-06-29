import { PrescriptionTemplate } from '../../../shared/models/hospital.model';
import { SpecialtyTemplateKey } from './prescription-specialty-print';

export type GynaePrintLayout = 'gynae-clinical' | 'gynae-womens-health' | 'gynae-modern' | 'clinical-blue';

const GYNAE_PRINT_TEMPLATES = new Set<PrescriptionTemplate>([
  'gynae-clinical',
  'gynae-womens-health',
  'gynae-modern',
  'clinical-blue',
]);

export function isGynaeSpecialty(specialtySection: SpecialtyTemplateKey | '' | null | undefined): boolean {
  return specialtySection === 'gynae';
}

export function normalizeGynaePrescriptionTemplate(
  template: PrescriptionTemplate | null | undefined,
  specialtySection: SpecialtyTemplateKey | '' | null | undefined
): PrescriptionTemplate {
  if (!isGynaeSpecialty(specialtySection)) {
    if (template === 'gynae-clinical' || template === 'gynae-womens-health' || template === 'gynae-modern') {
      return 'clinical-blue';
    }

    return template || 'classic';
  }

  if (template && GYNAE_PRINT_TEMPLATES.has(template)) {
    return template;
  }

  return 'gynae-womens-health';
}

export function resolveGynaePrintLayout(
  specialtySection: SpecialtyTemplateKey | '' | null | undefined,
  template: PrescriptionTemplate | null | undefined
): GynaePrintLayout | null {
  if (!isGynaeSpecialty(specialtySection)) {
    return null;
  }

  const normalized = normalizeGynaePrescriptionTemplate(template, specialtySection);
  if (normalized === 'clinical-blue') {
    return 'gynae-womens-health';
  }

  return normalized as GynaePrintLayout;
}

export function usesGynaeClinicalPrint(
  specialtySection: SpecialtyTemplateKey | '' | null | undefined,
  template: PrescriptionTemplate | null | undefined
): boolean {
  return resolveGynaePrintLayout(specialtySection, template) === 'gynae-clinical';
}

export function usesGynaeWomensHealthPrint(
  specialtySection: SpecialtyTemplateKey | '' | null | undefined,
  template: PrescriptionTemplate | null | undefined
): boolean {
  return resolveGynaePrintLayout(specialtySection, template) === 'gynae-womens-health';
}

export function usesGynaeModernPrint(
  specialtySection: SpecialtyTemplateKey | '' | null | undefined,
  template: PrescriptionTemplate | null | undefined
): boolean {
  return resolveGynaePrintLayout(specialtySection, template) === 'gynae-modern';
}

export function usesGynaeClinicalBluePrint(
  specialtySection: SpecialtyTemplateKey | '' | null | undefined,
  template: PrescriptionTemplate | null | undefined
): boolean {
  return resolveGynaePrintLayout(specialtySection, template) === 'clinical-blue';
}
