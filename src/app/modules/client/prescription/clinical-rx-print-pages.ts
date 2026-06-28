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
  gynaeConsultationRows: Array<{ label: string; value: string }>;
  gynaeSidebarRows: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeExtendedRows: Array<{ label: string; value: string; wide?: boolean }>;
  ivFluids: Array<unknown>;
  labTests: Array<unknown>;
  patientNote: string;
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

export function buildClinicalRxPrintPages(input: ClinicalRxPrintLayoutInput): ClinicalRxPrintPage[] {
  const medicines = input.medicines || [];
  const extendedRows = input.gynaeExtendedRows || [];
  const isGynae = input.specialtySection === 'gynae';
  const firstCap = firstPageMedicineCapacity(input);
  const continuationCap = 10;
  const lastCap = lastPageMedicineCapacity(extendedRows.length);

  const gynaeNeedsDetailsPage =
    isGynae &&
    (extendedRows.length > 0 || (input.patientNote || '').trim().length > 40);

  if (gynaeNeedsDetailsPage) {
    const pages = buildMedicinePages(medicines, firstCap, continuationCap, 12);
    appendExtendedPages(pages, extendedRows, medicines.length);
    return finalizePages(pages);
  }

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
