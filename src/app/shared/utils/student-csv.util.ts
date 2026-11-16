import type { Student } from '../../features/students/models/student.model';

const CSV_COLUMNS: ReadonlyArray<keyof Student> = [
  'id',
  'code',
  'name',
  'email',
  'phone',
  'classId',
  'className',
  'faculty',
  'status',
];

function escapeCsvValue(value: string | undefined): string {
  const normalizedValue = value ?? '';
  return /[",\r\n]/.test(normalizedValue)
    ? `"${normalizedValue.replace(/"/g, '""')}"`
    : normalizedValue;
}

/** Serializes students as CSV, using the Student property names as headers. */
export function studentsToCsv(students: readonly Student[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = students.map((student) =>
    CSV_COLUMNS.map((column) => escapeCsvValue(student[column])).join(','),
  );

  return [header, ...rows].join('\r\n');
}
