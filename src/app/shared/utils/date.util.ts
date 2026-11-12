const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDateVN(value: Date | string | null | undefined): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    const dateOnly = DATE_ONLY_PATTERN.exec(value);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const calendarDate = new Date(0);
      calendarDate.setUTCFullYear(year, month - 1, day);

      if (
        calendarDate.getUTCFullYear() !== year ||
        calendarDate.getUTCMonth() !== month - 1 ||
        calendarDate.getUTCDate() !== day
      ) {
        return '';
      }

      return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return DATE_FORMATTER.format(date);
}
