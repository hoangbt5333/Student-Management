import { describe, expect, it } from 'vitest';
import { matchesVietnamese, normalizeVietnamese } from './vietnamese.util';

describe('vietnamese.util', () => {
  describe('normalizeVietnamese', () => {
    it('should return empty string for null, undefined, or empty input', () => {
      expect(normalizeVietnamese(null)).toBe('');
      expect(normalizeVietnamese(undefined)).toBe('');
      expect(normalizeVietnamese('')).toBe('');
      expect(normalizeVietnamese('   ')).toBe('');
    });

    it('should strip all Vietnamese diacritics and convert to lowercase', () => {
      expect(normalizeVietnamese('Toán cao cấp')).toBe('toan cao cap');
      expect(normalizeVietnamese('Lập trình Web')).toBe('lap trinh web');
      expect(normalizeVietnamese('Cơ sở dữ liệu')).toBe('co so du lieu');
      expect(normalizeVietnamese('Kỹ thuật phần mềm')).toBe('ky thuat phan mem');
      expect(normalizeVietnamese('Giải tích & Đại số')).toBe('giai tich & dai so');
    });

    it('should convert both lowercase đ and uppercase Đ to d', () => {
      expect(normalizeVietnamese('Điện tử số')).toBe('dien tu so');
      expect(normalizeVietnamese('đại số tuyến tính')).toBe('dai so tuyen tinh');
      expect(normalizeVietnamese('ĐỒ HỌA MÁY TÍNH')).toBe('do hoa may tinh');
    });

    it('should trim surrounding whitespace', () => {
      expect(normalizeVietnamese('   Hệ điều hành   ')).toBe('he dieu hanh');
    });
  });

  describe('matchesVietnamese', () => {
    it('should return true when keyword is empty or whitespace', () => {
      expect(matchesVietnamese('Toán cao cấp', '')).toBe(true);
      expect(matchesVietnamese('Toán cao cấp', null)).toBe(true);
      expect(matchesVietnamese('Toán cao cấp', undefined)).toBe(true);
      expect(matchesVietnamese('Toán cao cấp', '   ')).toBe(true);
    });

    it('should match unaccented search keyword against accented source', () => {
      expect(matchesVietnamese('Toán cao cấp', 'toan')).toBe(true);
      expect(matchesVietnamese('Toán cao cấp', 'cao cap')).toBe(true);
      expect(matchesVietnamese('Lập trình Web nâng cao', 'lap trinh')).toBe(true);
      expect(matchesVietnamese('Cơ sở dữ liệu', 'co so')).toBe(true);
      expect(matchesVietnamese('Đại số tuyến tính', 'dai so')).toBe(true);
      expect(matchesVietnamese('Đồ họa máy tính', 'do hoa')).toBe(true);
    });

    it('should match accented search keyword against unaccented or accented source', () => {
      expect(matchesVietnamese('Toán cao cấp', 'Toán')).toBe(true);
      expect(matchesVietnamese('Toan cao cap', 'Toán')).toBe(true);
      expect(matchesVietnamese('Dai so tuyen tinh', 'Đại số')).toBe(true);
    });

    it('should return false when keyword is not contained in source', () => {
      expect(matchesVietnamese('Toán cao cấp', 'Vật lý')).toBe(false);
      expect(matchesVietnamese('Toán cao cấp', 'tin hoc')).toBe(false);
      expect(matchesVietnamese(null, 'toan')).toBe(false);
    });
  });
});
