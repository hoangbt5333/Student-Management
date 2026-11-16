import { describe, expect, it } from 'vitest';
import {
  calculateGradeDistribution,
  classifyAcademicRank,
} from './student-analytics.util';

describe('student-analytics.util', () => {
  describe('classifyAcademicRank', () => {
    describe('Valid GPA ranges (AC-1)', () => {
      it('should classify GPA in range [3.6, 4.0] as "Xuất sắc"', () => {
        expect(classifyAcademicRank(3.6)).toBe('Xuất sắc');
        expect(classifyAcademicRank(3.75)).toBe('Xuất sắc');
        expect(classifyAcademicRank(4.0)).toBe('Xuất sắc');
      });

      it('should safely handle GPA > 4.0 (bonus points beyond scale) as "Xuất sắc"', () => {
        expect(classifyAcademicRank(4.01)).toBe('Xuất sắc');
        expect(classifyAcademicRank(4.5)).toBe('Xuất sắc');
        expect(classifyAcademicRank(10.0)).toBe('Xuất sắc');
      });

      it('should classify GPA in range [3.2, 3.6) as "Giỏi"', () => {
        expect(classifyAcademicRank(3.2)).toBe('Giỏi');
        expect(classifyAcademicRank(3.45)).toBe('Giỏi');
        expect(classifyAcademicRank(3.599)).toBe('Giỏi');
      });

      it('should classify GPA in range [2.5, 3.2) as "Khá"', () => {
        expect(classifyAcademicRank(2.5)).toBe('Khá');
        expect(classifyAcademicRank(2.8)).toBe('Khá');
        expect(classifyAcademicRank(3.199)).toBe('Khá');
      });

      it('should classify GPA in range [2.0, 2.5) as "Trung bình"', () => {
        expect(classifyAcademicRank(2.0)).toBe('Trung bình');
        expect(classifyAcademicRank(2.25)).toBe('Trung bình');
        expect(classifyAcademicRank(2.499)).toBe('Trung bình');
      });

      it('should classify GPA in range [0, 2.0) as "Yếu"', () => {
        expect(classifyAcademicRank(1.99)).toBe('Yếu');
        expect(classifyAcademicRank(1.5)).toBe('Yếu');
        expect(classifyAcademicRank(0.5)).toBe('Yếu');
        expect(classifyAcademicRank(0)).toBe('Yếu');
      });
    });

    describe('Invalid and Edge Cases (AC-1, AC-3)', () => {
      it('should return "Yếu" for negative GPA values', () => {
        expect(classifyAcademicRank(-0.01)).toBe('Yếu');
        expect(classifyAcademicRank(-1.0)).toBe('Yếu');
        expect(classifyAcademicRank(-4.0)).toBe('Yếu');
      });

      it('should return "Yếu" for null and undefined', () => {
        expect(classifyAcademicRank(null)).toBe('Yếu');
        expect(classifyAcademicRank(undefined)).toBe('Yếu');
      });

      it('should return "Yếu" for NaN and non-finite numbers', () => {
        expect(classifyAcademicRank(NaN)).toBe('Yếu');
        expect(classifyAcademicRank(Infinity)).toBe('Yếu');
        expect(classifyAcademicRank(-Infinity)).toBe('Yếu');
      });

      it('should return "Yếu" for non-number types at runtime', () => {
        expect(classifyAcademicRank('3.8' as unknown as number)).toBe('Yếu');
        expect(classifyAcademicRank({} as unknown as number)).toBe('Yếu');
        expect(classifyAcademicRank([] as unknown as number)).toBe('Yếu');
        expect(classifyAcademicRank(true as unknown as number)).toBe('Yếu');
      });
    });
  });

  describe('calculateGradeDistribution', () => {
    describe('Grade Counting and Distribution (AC-2)', () => {
      it('should correctly count students across all academic rank categories', () => {
        const students = [
          { gpa: 3.8 }, // Xuất sắc
          { gpa: 4.0 }, // Xuất sắc
          { gpa: 3.6 }, // Xuất sắc
          { gpa: 3.5 }, // Giỏi
          { gpa: 3.2 }, // Giỏi
          { gpa: 3.0 }, // Khá
          { gpa: 2.5 }, // Khá
          { gpa: 2.2 }, // Trung bình
          { gpa: 2.0 }, // Trung bình
          { gpa: 1.5 }, // Yếu
          { gpa: 0.8 }, // Yếu
        ];

        const distribution = calculateGradeDistribution(students);

        expect(distribution).toEqual({
          'Xuất sắc': 3,
          'Giỏi': 2,
          'Khá': 2,
          'Trung bình': 2,
          'Yếu': 2,
        });
      });

      it('should handle students with GPA > 4.0 in distribution calculation', () => {
        const students = [{ gpa: 4.2 }, { gpa: 4.8 }, { gpa: 3.7 }];

        const distribution = calculateGradeDistribution(students);

        expect(distribution).toEqual({
          'Xuất sắc': 3,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
        });
      });
    });

    describe('Empty and Invalid inputs (AC-3)', () => {
      it('should return all zeros for an empty array', () => {
        expect(calculateGradeDistribution([])).toEqual({
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
        });
      });

      it('should return all zeros for null or undefined input', () => {
        expect(calculateGradeDistribution(null)).toEqual({
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
        });
        expect(calculateGradeDistribution(undefined)).toEqual({
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
        });
      });

      it('should return all zeros for non-array inputs at runtime', () => {
        expect(calculateGradeDistribution(123 as unknown as [])).toEqual({
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
        });
        expect(calculateGradeDistribution('invalid' as unknown as [])).toEqual({
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
        });
        expect(calculateGradeDistribution({} as unknown as [])).toEqual({
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
        });
      });

      it('should handle students with missing, null, undefined, or invalid GPA by classifying as "Yếu"', () => {
        const students = [
          { gpa: null },
          { gpa: undefined },
          {},
          { gpa: -1.0 },
          { gpa: NaN },
        ];

        const distribution = calculateGradeDistribution(students);

        expect(distribution).toEqual({
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 5,
        });
      });

      it('should handle null or undefined elements within the students array safely', () => {
        const students = [
          null as unknown as { gpa?: number | null },
          undefined as unknown as { gpa?: number | null },
          { gpa: 3.8 },
        ];

        const distribution = calculateGradeDistribution(students);

        expect(distribution).toEqual({
          'Xuất sắc': 1,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 2,
        });
      });
    });

    describe('Purity and Immutability (AC-4)', () => {
      it('should not mutate the input array or its objects', () => {
        const students = [
          { gpa: 3.9 },
          { gpa: 2.7 },
          { gpa: null },
        ];
        const copy = JSON.parse(JSON.stringify(students));

        calculateGradeDistribution(students);

        expect(students).toEqual(copy);
      });

      it('should return identical results when called repeatedly with same inputs', () => {
        const students = [{ gpa: 3.5 }, { gpa: 2.1 }];

        const result1 = calculateGradeDistribution(students);
        const result2 = calculateGradeDistribution(students);

        expect(result1).toEqual(result2);
        expect(result1).not.toBe(result2); // distinct object instances
      });
    });
  });
});
