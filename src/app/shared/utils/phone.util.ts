export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }

  const trimmedPhone = phone.trim();
  if (/^\d{10}$/.test(trimmedPhone)) {
    return `${trimmedPhone.slice(0, 4)} ${trimmedPhone.slice(4, 7)} ${trimmedPhone.slice(7)}`;
  }

  return trimmedPhone;
}
