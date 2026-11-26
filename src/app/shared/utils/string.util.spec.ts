import { describe, expect, it } from 'vitest';
import { maskEmail, truncateText } from './string.util';

describe('truncateText', () => {
  it.each([null, undefined, ''])('returns an empty string for empty input %s', (text) => {
    expect(truncateText(text, 5)).toBe('');
  });

  it('returns text unchanged when it is shorter than or equal to the limit', () => {
    expect(truncateText('short', 6)).toBe('short');
    expect(truncateText('equal', 5)).toBe('equal');
  });

  it('truncates to the requested output length including an ellipsis', () => {
    const result = truncateText('abcdefgh', 5);
    expect(result).toBe('abcd…');
    expect(result.length).toBe(5);
  });

  it('returns only an ellipsis when truncating to a limit of one', () => {
    expect(truncateText('text', 1)).toBe('…');
  });

  it.each([0, -1])('returns empty for a non-positive limit (%s)', (maxLength) => {
    expect(truncateText('text', maxLength)).toBe('');
  });

  it('preserves whitespace when the text is within the limit', () => {
    expect(truncateText('  text  ', 8)).toBe('  text  ');
  });
});

describe('maskEmail', () => {
  it('masks the middle of a local part with 3 or more characters and keeps the domain', () => {
    expect(maskEmail('abc@example.com')).toBe('a***c@example.com');
    expect(maskEmail('alice@example.com')).toBe('a***e@example.com');
    expect(maskEmail('nguyen.van.a@sub.company.vn')).toBe('n***a@sub.company.vn');
  });

  it('masks local parts shorter than 3 characters as *** while keeping the domain', () => {
    expect(maskEmail('a@example.com')).toBe('***@example.com');
    expect(maskEmail('ab@example.com')).toBe('***@example.com');
  });

  it('returns empty or whitespace-only inputs unchanged', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail('   ')).toBe('   ');
  });

  it.each([
    'invalid-email',
    '@example.com',
    'alice@',
    'a@b@example.com',
    '   @example.com',
    'alice@   ',
  ])('returns invalid email input "%s" unchanged', (invalidEmail) => {
    expect(maskEmail(invalidEmail)).toBe(invalidEmail);
  });
});
