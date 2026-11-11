export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text || maxLength <= 0) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength === 1) {
    return '…';
  }

  return `${text.slice(0, maxLength - 1)}…`;
}
