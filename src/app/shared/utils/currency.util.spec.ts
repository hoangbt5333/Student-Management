import { describe, expect, it } from 'vitest';
import { formatCurrency } from './currency.util';

describe('formatCurrency', () => {
  it('formats VND using Vietnamese grouping and a regular space', () => {
    expect(formatCurrency(1_000_000)).toBe('1.000.000 ₫');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0 ₫');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-1_000)).toBe('-1.000 ₫');
  });

  it('rounds fractional amounts to whole VND', () => {
    expect(formatCurrency(1_000.5)).toBe('1.001 ₫');
  });
});
