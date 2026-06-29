import { resolveGynaePrintLayout } from './gynae-print-routing';
import { PrescriptionTemplate } from '../../../shared/models/hospital.model';
import { SpecialtyTemplateKey } from './prescription-specialty-print';

export interface ClinicalRxPrintPage {
  isFirstPage: boolean;
  isLastPage: boolean;
  pageNumber: number;
  totalPages: number;
  medicines: Array<Record<string, unknown>>;
  medicineOffset: number;
  gynaeExtendedRows: Array<{ label: string; value: string; wide?: boolean }>;
  showGynaeExtendedTitle: boolean;
}

export interface ClinicalRxPrintLayoutInput {
  medicines: Array<Record<string, unknown>>;
  specialtySection: string;
  prescriptionTemplate?: string;
  gynaeConsultationRows: Array<{ label: string; value: string }>;
  gynaeSidebarRows: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeExtendedRows: Array<{ label: string; value: string; wide?: boolean }>;
  ivFluids: Array<unknown>;
  labTests: Array<unknown>;
  patientNote: string;
}

function usesGynaeWomensHealthPagination(
  specialtySection: string,
  prescriptionTemplate?: string
): boolean {
  return (
    resolveGynaePrintLayout(
      specialtySection as SpecialtyTemplateKey,
      prescriptionTemplate as PrescriptionTemplate
    ) === 'gynae-womens-health'
  );
}

function usesGynaeClinicalPagination(
  specialtySection: string,
  prescriptionTemplate?: string
): boolean {
  return (
    resolveGynaePrintLayout(
      specialtySection as SpecialtyTemplateKey,
      prescriptionTemplate as PrescriptionTemplate
    ) === 'gynae-clinical'
  );
}

function usesGynaeModernPagination(
  specialtySection: string,
  prescriptionTemplate?: string
): boolean {
  return (
    resolveGynaePrintLayout(
      specialtySection as SpecialtyTemplateKey,
      prescriptionTemplate as PrescriptionTemplate
    ) === 'gynae-modern'
  );
}

function buildGynaeModernPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  return buildGynaeCompactPreviewPrintPages(medicines, extendedRows);
}

type GynaeExtendedChunk = {
  rows: Array<{ label: string; value: string; wide?: boolean }>;
  showTitle: boolean;
};

function firstPageMedicineCapacity(input: ClinicalRxPrintLayoutInput): number {
  const isGynae = input.specialtySection === 'gynae';
  let capacity = isGynae ? 5 : 7;

  if (input.gynaeConsultationRows.length > 0) {
    capacity -= 1;
  }

  if (input.gynaeSidebarRows.length > 10) {
    capacity -= 2;
  } else if (input.gynaeSidebarRows.length > 5) {
    capacity -= 1;
  }

  if (input.gynaeExtendedRows.length > 4) {
    capacity -= 1;
  }

  if (input.labTests.length > 6) {
    capacity -= 1;
  }

  if (input.ivFluids.length > 0) {
    capacity -= 2;
  }

  if ((input.patientNote || '').length > 120) {
    capacity -= 1;
  }

  return Math.max(3, capacity);
}

function lastPageMedicineCapacity(extendedRowCount: number): number {
  if (extendedRowCount > 10) {
    return 3;
  }

  if (extendedRowCount > 6) {
    return 5;
  }

  if (extendedRowCount > 3) {
    return 6;
  }

  return 8;
}

function extendedRowWeight(row: { label: string; value: string; wide?: boolean }): number {
  if (row.wide) {
    return 4;
  }

  const length = String(row.value || '').trim().length;
  if (length > 100) {
    return 4;
  }

  if (length > 50) {
    return 2;
  }

  return 1;
}

function chunkWeight(rows: Array<{ label: string; value: string; wide?: boolean }>): number {
  return rows.reduce((total, row) => total + extendedRowWeight(row), 0);
}

function chunkGynaeExtendedRows(
  rows: Array<{ label: string; value: string; wide?: boolean }>
): GynaeExtendedChunk[] {
  if (!rows.length) {
    return [];
  }

  const PAGE_WEIGHT = 10;
  const LAST_PAGE_WEIGHT = 7;
  const chunks: GynaeExtendedChunk[] = [];
  let current: Array<{ label: string; value: string; wide?: boolean }> = [];
  let weight = 0;

  const pushCurrent = () => {
    if (!current.length) {
      return;
    }

    chunks.push({
      rows: current,
      showTitle: chunks.length === 0,
    });
    current = [];
    weight = 0;
  };

  rows.forEach((row, rowIndex) => {
    const rowWeight = extendedRowWeight(row);
    const remaining = rows.slice(rowIndex);
    const remainingWeight = chunkWeight(remaining);
    const limit =
      remainingWeight === rowWeight && chunks.length > 0 ? LAST_PAGE_WEIGHT : PAGE_WEIGHT;

    if (current.length > 0 && weight + rowWeight > limit) {
      pushCurrent();
    }

    current.push(row);
    weight += rowWeight;
  });

  pushCurrent();

  while (chunks.length > 1) {
    const lastChunk = chunks[chunks.length - 1];
    if (chunkWeight(lastChunk.rows) <= LAST_PAGE_WEIGHT || lastChunk.rows.length <= 1) {
      break;
    }

    const previousChunk = chunks[chunks.length - 2];
    const movedRow = lastChunk.rows.shift();
    if (!movedRow) {
      break;
    }

    previousChunk.rows.push(movedRow);
  }

  return chunks;
}

function chunkMedicines(
  medicines: Array<Record<string, unknown>>,
  firstCap: number,
  continuationCap: number,
  lastCap: number
): Array<Record<string, unknown>[]> {
  if (!medicines.length) {
    return [[]];
  }

  const chunks: Array<Record<string, unknown>[]> = [];
  let index = 0;

  chunks.push(medicines.slice(0, firstCap));
  index = firstCap;

  while (index < medicines.length) {
    const remaining = medicines.length - index;

    if (remaining <= lastCap) {
      chunks.push(medicines.slice(index));
      break;
    }

    if (remaining <= lastCap + continuationCap) {
      const middleSize = remaining - lastCap;
      if (middleSize > 0) {
        chunks.push(medicines.slice(index, index + middleSize));
        index += middleSize;
      }

      chunks.push(medicines.slice(index));
      break;
    }

    chunks.push(medicines.slice(index, index + continuationCap));
    index += continuationCap;
  }

  return chunks;
}

function medicineOffsetForChunk(chunks: Array<Record<string, unknown>[]>, chunkIndex: number): number {
  return chunks.slice(0, chunkIndex).reduce((total, chunk) => total + chunk.length, 0);
}

function finalizePages(pages: ClinicalRxPrintPage[]): ClinicalRxPrintPage[] {
  const totalPages = pages.length;
  pages.forEach((page, index) => {
    page.pageNumber = index + 1;
    page.totalPages = totalPages;
    page.isLastPage = index === totalPages - 1;
  });

  return pages;
}

function buildMedicinePages(
  medicines: Array<Record<string, unknown>>,
  firstCap: number,
  continuationCap: number,
  lastCap: number
): ClinicalRxPrintPage[] {
  const medicineChunks =
    medicines.length > 0 ? chunkMedicines(medicines, firstCap, continuationCap, lastCap) : [];

  if (!medicineChunks.length) {
    return [
      {
        isFirstPage: true,
        isLastPage: false,
        pageNumber: 1,
        totalPages: 0,
        medicines: [],
        medicineOffset: 0,
        gynaeExtendedRows: [],
        showGynaeExtendedTitle: false,
      },
    ];
  }

  return medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: [],
    showGynaeExtendedTitle: false,
  }));
}

function distributeGynaeExtendedRows(
  pages: ClinicalRxPrintPage[],
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>,
  medicineCount: number
): ClinicalRxPrintPage[] {
  const extendedChunks = chunkGynaeExtendedRows(extendedRows);

  if (!extendedChunks.length) {
    return pages;
  }

  if (!pages.length) {
    pages.push({
      isFirstPage: true,
      isLastPage: false,
      pageNumber: 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: 0,
      gynaeExtendedRows: [],
      showGynaeExtendedTitle: false,
    });
  }

  const [firstChunk, ...remainingChunks] = extendedChunks;
  pages[0].gynaeExtendedRows = firstChunk.rows;
  pages[0].showGynaeExtendedTitle = firstChunk.showTitle;

  remainingChunks.forEach((chunk) => {
    pages.push({
      isFirstPage: false,
      isLastPage: false,
      pageNumber: pages.length + 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: medicineCount,
      gynaeExtendedRows: chunk.rows,
      showGynaeExtendedTitle: chunk.showTitle,
    });
  });

  return pages;
}

function appendExtendedPages(
  pages: ClinicalRxPrintPage[],
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>,
  medicineCount: number
): ClinicalRxPrintPage[] {
  const extendedChunks = chunkGynaeExtendedRows(extendedRows);

  if (!extendedChunks.length) {
    pages.push({
      isFirstPage: false,
      isLastPage: true,
      pageNumber: pages.length + 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: medicineCount,
      gynaeExtendedRows: [],
      showGynaeExtendedTitle: false,
    });

    return pages;
  }

  extendedChunks.forEach((chunk) => {
    pages.push({
      isFirstPage: false,
      isLastPage: false,
      pageNumber: pages.length + 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: medicineCount,
      gynaeExtendedRows: chunk.rows,
      showGynaeExtendedTitle: chunk.showTitle,
    });
  });

  return pages;
}

function buildGynaeCompactPreviewPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  const medicineCap = 12;

  if (medicines.length <= medicineCap) {
    return finalizePages([
      {
        isFirstPage: true,
        isLastPage: true,
        pageNumber: 1,
        totalPages: 1,
        medicines,
        medicineOffset: 0,
        gynaeExtendedRows: extendedRows,
        showGynaeExtendedTitle: extendedRows.length > 0,
      },
    ]);
  }

  const medicineChunks = chunkMedicines(medicines, medicineCap, 10, 12);
  const pages: ClinicalRxPrintPage[] = medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: index === 0 ? extendedRows : [],
    showGynaeExtendedTitle: index === 0 && extendedRows.length > 0,
  }));

  return finalizePages(pages);
}

function buildGynaeWomensHealthPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  return buildGynaeCompactPreviewPrintPages(medicines, extendedRows);
}

function buildGynaeClinicalPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  return buildGynaeCompactPreviewPrintPages(medicines, extendedRows);
}

function buildGynaePrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  const firstMedicineCap = 5;
  const extendedWeight = extendedRows.reduce((total, row) => total + extendedRowWeight(row), 0);
  const fitsSinglePage =
    medicines.length <= 6 && extendedRows.length <= 16 && extendedWeight <= 20;

  if (fitsSinglePage) {
    return finalizePages([
      {
        isFirstPage: true,
        isLastPage: true,
        pageNumber: 1,
        totalPages: 1,
        medicines,
        medicineOffset: 0,
        gynaeExtendedRows: extendedRows,
        showGynaeExtendedTitle: extendedRows.length > 0,
      },
    ]);
  }

  const medicineChunks =
    medicines.length > firstMedicineCap
      ? chunkMedicines(medicines, firstMedicineCap, 8, 10)
      : [medicines];

  const pages: ClinicalRxPrintPage[] = medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: [],
    showGynaeExtendedTitle: false,
  }));

  if (!pages.length) {
    pages.push({
      isFirstPage: true,
      isLastPage: false,
      pageNumber: 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: 0,
      gynaeExtendedRows: [],
      showGynaeExtendedTitle: false,
    });
  }

  return finalizePages(distributeGynaeExtendedRows(pages, extendedRows, medicines.length));
}

export function buildClinicalRxPrintPages(input: ClinicalRxPrintLayoutInput): ClinicalRxPrintPage[] {
  const medicines = input.medicines || [];
  const extendedRows = input.gynaeExtendedRows || [];
  const isGynae = input.specialtySection === 'gynae';

  if (isGynae) {
    if (usesGynaeWomensHealthPagination(input.specialtySection, input.prescriptionTemplate)) {
      return buildGynaeWomensHealthPrintPages(medicines, extendedRows);
    }

    if (usesGynaeClinicalPagination(input.specialtySection, input.prescriptionTemplate)) {
      return buildGynaeClinicalPrintPages(medicines, extendedRows);
    }

    if (usesGynaeModernPagination(input.specialtySection, input.prescriptionTemplate)) {
      return buildGynaeModernPrintPages(medicines, extendedRows);
    }

    return buildGynaePrintPages(medicines, extendedRows);
  }

  const firstCap = firstPageMedicineCapacity(input);
  const continuationCap = 10;
  const lastCap = lastPageMedicineCapacity(extendedRows.length);
  const medicineChunks = chunkMedicines(medicines, firstCap, continuationCap, lastCap);

  const extendedOverflow = extendedRows.length > 6;
  const fitsSinglePage =
    medicineChunks.length === 1 &&
    !extendedOverflow &&
    medicines.length <= firstCap &&
    extendedRows.length === 0;

  if (fitsSinglePage) {
    return [
      {
        isFirstPage: true,
        isLastPage: true,
        pageNumber: 1,
        totalPages: 1,
        medicines,
        medicineOffset: 0,
        gynaeExtendedRows: extendedRows,
        showGynaeExtendedTitle: extendedRows.length > 0,
      },
    ];
  }

  const pages: ClinicalRxPrintPage[] = medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: [],
    showGynaeExtendedTitle: false,
  }));

  if (extendedOverflow) {
    appendExtendedPages(pages, extendedRows, medicines.length);
  } else if (pages.length > 0) {
    pages[pages.length - 1].gynaeExtendedRows = extendedRows;
    pages[pages.length - 1].showGynaeExtendedTitle = extendedRows.length > 0;
  } else {
    pages.push({
      isFirstPage: true,
      isLastPage: true,
      pageNumber: 1,
      totalPages: 1,
      medicines: [],
      medicineOffset: 0,
      gynaeExtendedRows: extendedRows,
      showGynaeExtendedTitle: extendedRows.length > 0,
    });
  }

  return finalizePages(pages);
}
