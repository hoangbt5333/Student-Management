import { describe, expect, it } from 'vitest';
import { slugify } from './slug.util';

describe('slugify', () => {
  it.each([null, undefined, ''])('returns an empty string for empty input %s', (text) => {
    expect(slugify(text)).toBe('');
  });

  it('lowercases text and removes Vietnamese diacritics', () => {
    expect(slugify('Nguyễn Văn A')).toBe('nguyen-van-a');
    expect(slugify('ĐẶNG Thị Ánh')).toBe('dang-thi-anh');
  });

  it('replaces consecutive whitespace and special characters with one hyphen', () => {
    expect(slugify('  Hello,   world!!!  ')).toBe('hello-world');
    expect(slugify('one___two---three')).toBe('one-two-three');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('---Hello world---')).toBe('hello-world');
  });
});
