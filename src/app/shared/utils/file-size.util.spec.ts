import { describe, expect, it } from 'vitest';
import { formatFileSize } from './file-size.util';

describe('formatFileSize', () => {
  it('returns zero for zero, negative, null, and undefined values', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(-1)).toBe('0 B');
    expect(formatFileSize(null as unknown as number)).toBe('0 B');
    expect(formatFileSize(undefined as unknown as number)).toBe('0 B');
  });

  it('formats byte values', () => {
    expect(formatFileSize(1)).toBe('1 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats binary unit thresholds', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 ** 2)).toBe('1 MB');
    expect(formatFileSize(1024 ** 3)).toBe('1 GB');
    expect(formatFileSize(1024 ** 4)).toBe('1 TB');
  });

  it('uses at most one decimal place when needed', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2560)).toBe('2.5 KB');
    expect(formatFileSize(2048)).toBe('2 KB');
  });

  it('rounds values to one decimal place', () => {
    expect(formatFileSize(1024 + 100)).toBe('1.1 KB');
    expect(formatFileSize(1024 + 500)).toBe('1.5 KB');
  });

  it('caps values at TB for larger sizes', () => {
    expect(formatFileSize(1024 ** 5)).toBe('1024 TB');
  });
});
