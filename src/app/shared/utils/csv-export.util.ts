export const UTF8_BOM = '\uFEFF';

export type CsvCellValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  readonly header: string;
  readonly accessor: keyof T | ((row: T) => CsvCellValue);
}

/** Escapes a single CSV cell value per RFC 4180 (quoting values containing `,`, `"`, `\r`, or `\n`). */
export function escapeCsvCell(value: CsvCellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const normalizedValue = String(value);
  return /[",\r\n]/.test(normalizedValue)
    ? `"${normalizedValue.replace(/"/g, '""')}"`
    : normalizedValue;
}

function resolveCellValue<T extends object>(
  row: T,
  accessor: CsvColumn<T>['accessor'],
): CsvCellValue {
  const rawValue: unknown = typeof accessor === 'function' ? accessor(row) : row[accessor];

  if (rawValue === null || rawValue === undefined) {
    return rawValue;
  }

  if (
    typeof rawValue === 'string' ||
    typeof rawValue === 'number' ||
    typeof rawValue === 'boolean'
  ) {
    return rawValue;
  }

  return String(rawValue);
}

/**
 * Serializes an array of objects to a UTF-8 BOM prefixed CSV string using CRLF (`\r\n`) line endings.
 */
export function objectsToCsv<T extends object>(
  rows: readonly T[],
  columns?: readonly CsvColumn<T>[],
): string {
  const resolvedColumns: readonly CsvColumn<T>[] =
    columns ??
    (rows.length > 0
      ? (Object.keys(rows[0]) as Array<keyof T>).map((key) => ({
          header: String(key),
          accessor: key,
        }))
      : []);

  if (resolvedColumns.length === 0) {
    return UTF8_BOM;
  }

  const headerLine = resolvedColumns.map((column) => escapeCsvCell(column.header)).join(',');
  const dataLines = rows.map((row) =>
    resolvedColumns
      .map((column) => escapeCsvCell(resolveCellValue(row, column.accessor)))
      .join(','),
  );

  return UTF8_BOM + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Triggers a browser download for the given CSV content while ensuring a single UTF-8 BOM.
 * Returns `false` in SSR or environments without DOM/URL support.
 */
export function downloadCsv(csvContent: string, filename: string): boolean {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  const contentWithBom = csvContent.startsWith(UTF8_BOM)
    ? csvContent
    : `${UTF8_BOM}${csvContent}`;
  const blob = new Blob([contentWithBom], { type: 'text/csv;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = filename;
    downloadLink.click();
    return true;
  } finally {
    if (typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
