import { describe, expect, it } from 'vitest';
import { formatPhoneNumber } from './phone.util';

describe('formatPhoneNumber', () => {
  it('returns an empty string for null, undefined, or empty input', () => {
    expect(formatPhoneNumber(null)).toBe('');
    expect(formatPhoneNumber(undefined)).toBe('');
    expect(formatPhoneNumber('')).toBe('');
  });

  it('formats a 10-digit phone number in 4-3-3 groups', () => {
    expect(formatPhoneNumber('0912345678')).toBe('0912 345 678');
  });

  it('trims but otherwise preserves anomalous input', () => {
    expect(formatPhoneNumber('  123-456  ')).toBe('123-456');
  });
});
