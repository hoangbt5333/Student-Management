import { describe, expect, it } from 'vitest';
import { formatDateVN } from './date.util';

describe('formatDateVN', () => {
  it('formats a date-only ISO value without shifting its calendar day', () => {
    expect(formatDateVN('2026-05-09')).toBe('09/05/2026');
  });

  it('formats Date values and timestamps in the Ho Chi Minh timezone', () => {
    expect(formatDateVN(new Date('2026-05-08T17:30:00.000Z'))).toBe('09/05/2026');
    expect(formatDateVN('2026-05-08T17:30:00.000Z')).toBe('09/05/2026');
    expect(formatDateVN('2026-05-09T00:30:00+07:00')).toBe('09/05/2026');
  });

  it('returns an empty string for missing or empty values', () => {
    expect(formatDateVN(null)).toBe('');
    expect(formatDateVN(undefined)).toBe('');
    expect(formatDateVN('')).toBe('');
  });

  it('returns an empty string for invalid date values', () => {
    expect(formatDateVN('not a date')).toBe('');
    expect(formatDateVN(new Date(Number.NaN))).toBe('');
    expect(formatDateVN('2026-02-30')).toBe('');
  });
});
