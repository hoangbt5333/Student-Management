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

/**
 * Masks the local part of an email address while preserving the `@domain` suffix.
 *
 * Keeps the first and last character of the local part with `***` in between when the
 * local part has at least 3 characters, masks shorter local parts as `***`, and returns
 * the original input unchanged if it is empty or lacks a single valid `@` separator.
 */
export function maskEmail(email: string): string {
  if (!email) {
    return email;
  }

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex === email.length - 1 || email.indexOf('@', atIndex + 1) !== -1) {
    return email;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex);

  if (!localPart.trim() || !domainPart.slice(1).trim()) {
    return email;
  }

  const maskedLocal =
    localPart.length >= 3 ? `${localPart[0]}***${localPart[localPart.length - 1]}` : '***';

  return `${maskedLocal}${domainPart}`;
}
