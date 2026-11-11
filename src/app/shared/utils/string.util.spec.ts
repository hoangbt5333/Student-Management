import { describe, expect, it } from 'vitest';
import { truncateText } from './string.util';

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
