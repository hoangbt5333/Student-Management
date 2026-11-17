import { describe, expect, it } from 'vitest';
import {
  formatPhoneNumber,
  formatStudentCode,
  maskEmail,
} from './student-formatter.util';

describe('student-formatter.util', () => {
  describe('formatStudentCode', () => {
    it('should format a valid positive integer number with prefix SV- and 5 digits padded with zeros', () => {
      expect(formatStudentCode(1)).toBe('SV-00001');
      expect(formatStudentCode(123)).toBe('SV-00123');
      expect(formatStudentCode(12345)).toBe('SV-12345');
    });

    it('should handle zero as a valid code', () => {
      expect(formatStudentCode(0)).toBe('SV-00000');
    });

    it('should handle codes with more than 5 digits without truncation', () => {
      expect(formatStudentCode(123456)).toBe('SV-123456');
    });

    it('should format numeric strings correctly and trim spaces', () => {
      expect(formatStudentCode('1')).toBe('SV-00001');
      expect(formatStudentCode('123')).toBe('SV-00123');
      expect(formatStudentCode('00123')).toBe('SV-00123');
      expect(formatStudentCode('0')).toBe('SV-00000');
      expect(formatStudentCode('  45  ')).toBe('SV-00045');
      expect(formatStudentCode('123456')).toBe('SV-123456');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatStudentCode(null)).toBe('');
      expect(formatStudentCode(undefined)).toBe('');
    });

    it('should return empty string for invalid numbers (negative, NaN, float, Infinity)', () => {
      expect(formatStudentCode(-1)).toBe('');
      expect(formatStudentCode(-123)).toBe('');
      expect(formatStudentCode(NaN)).toBe('');
      expect(formatStudentCode(12.34)).toBe('');
      expect(formatStudentCode(Infinity)).toBe('');
      expect(formatStudentCode(-Infinity)).toBe('');
    });

    it('should return empty string for invalid strings (empty, whitespace, non-numeric, floats, negative)', () => {
      expect(formatStudentCode('')).toBe('');
      expect(formatStudentCode('   ')).toBe('');
      expect(formatStudentCode('-123')).toBe('');
      expect(formatStudentCode('12.34')).toBe('');
      expect(formatStudentCode('abc')).toBe('');
      expect(formatStudentCode('SV-123')).toBe('');
      expect(formatStudentCode('12a')).toBe('');
      expect(formatStudentCode('999999999999999999999999999999')).toBe('');
    });

    it('should return empty string for non-number and non-string inputs', () => {
      expect(formatStudentCode({} as any)).toBe('');
      expect(formatStudentCode(true as any)).toBe('');
    });
  });

  describe('maskEmail', () => {
    it('should mask username middle characters with asterisks for valid emails', () => {
      expect(maskEmail('hoang@gmail.com')).toBe('h***g@gmail.com');
      expect(maskEmail('abcd@domain.com')).toBe('a**d@domain.com');
      expect(maskEmail('student.dev@university.edu.vn')).toBe('s*********v@university.edu.vn');
    });

    it('should handle single character username by appending an asterisk', () => {
      expect(maskEmail('a@domain.com')).toBe('a*@domain.com');
    });

    it('should handle two-character username by keeping first and last characters with asterisk in between', () => {
      expect(maskEmail('ab@domain.com')).toBe('a*b@domain.com');
    });

    it('should handle three-character username by keeping first and last characters with asterisk in between', () => {
      expect(maskEmail('abc@domain.com')).toBe('a*c@domain.com');
    });

    it('should trim surrounding whitespace from email', () => {
      expect(maskEmail('  hoang@gmail.com  ')).toBe('h***g@gmail.com');
    });

    it('should return empty string for null, undefined, or empty/whitespace string', () => {
      expect(maskEmail(null)).toBe('');
      expect(maskEmail(undefined)).toBe('');
      expect(maskEmail('')).toBe('');
      expect(maskEmail('   ')).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(maskEmail(123 as any)).toBe('');
      expect(maskEmail({} as any)).toBe('');
    });

    it('should return empty string if email contains internal whitespace', () => {
      expect(maskEmail('hoang dev@gmail.com')).toBe('');
      expect(maskEmail('hoang@ gmail.com')).toBe('');
    });

    it('should return empty string if missing @ or has multiple @ symbols', () => {
      expect(maskEmail('plainaddress')).toBe('');
      expect(maskEmail('user@@gmail.com')).toBe('');
      expect(maskEmail('user@sub@gmail.com')).toBe('');
    });

    it('should return empty string if username or domain is missing', () => {
      expect(maskEmail('@gmail.com')).toBe('');
      expect(maskEmail('user@')).toBe('');
    });

    it('should return empty string if domain has invalid structure or missing dot', () => {
      expect(maskEmail('user@localhost')).toBe('');
      expect(maskEmail('user@.domain.com')).toBe('');
      expect(maskEmail('user@domain..com')).toBe('');
      expect(maskEmail('user@domain.com.')).toBe('');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit Vietnamese phone numbers as xxxx.xxx.xxx', () => {
      expect(formatPhoneNumber('0912345678')).toBe('0912.345.678');
    });

    it('should strip non-digit characters and format if resulting digits are 10', () => {
      expect(formatPhoneNumber('0912 345 678')).toBe('0912.345.678');
      expect(formatPhoneNumber('0912-345-678')).toBe('0912.345.678');
      expect(formatPhoneNumber('(091) 234-5678')).toBe('0912.345.678');
      expect(formatPhoneNumber('  0912.345.678  ')).toBe('0912.345.678');
    });

    it('should return empty string for null, undefined, empty, or whitespace string', () => {
      expect(formatPhoneNumber(null)).toBe('');
      expect(formatPhoneNumber(undefined)).toBe('');
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber('   ')).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(formatPhoneNumber(1234567890 as any)).toBe('');
      expect(formatPhoneNumber({} as any)).toBe('');
    });

    it('should return trimmed original string when digits count is not 10', () => {
      expect(formatPhoneNumber('12345')).toBe('12345');
      expect(formatPhoneNumber('  123-456  ')).toBe('123-456');
      expect(formatPhoneNumber('091234567890')).toBe('091234567890');
      expect(formatPhoneNumber('invalid-phone')).toBe('invalid-phone');
    });
  });
});
