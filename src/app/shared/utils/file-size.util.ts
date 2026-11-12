const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatFileSize(bytes: number): string {
  if (bytes == null || bytes <= 0) {
    return '0 B';
  }

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const formattedValue = Number(value.toFixed(1));

  return `${formattedValue} ${UNITS[unitIndex]}`;
}
