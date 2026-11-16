/**
 * Tiện ích phân tích và xếp loại học lực sinh viên.
 * Toàn bộ các hàm là pure function và xử lý an toàn mọi giá trị đầu vào.
 */

/**
 * Định nghĩa loại học lực theo thang điểm 4.0.
 */
export type AcademicRank = 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu';

/**
 * Xếp loại học lực của sinh viên theo thang điểm 4.0:
 * - 'Xuất sắc': 3.6 <= GPA <= 4.0 (và GPA > 4.0 khi có điểm thưởng vượt trần)
 * - 'Giỏi': 3.2 <= GPA < 3.6
 * - 'Khá': 2.5 <= GPA < 3.2
 * - 'Trung bình': 2.0 <= GPA < 2.5
 * - 'Yếu': GPA < 2.0 hoặc các giá trị không hợp lệ (số âm, NaN, vô cực, null, undefined)
 *
 * Lưu ý về GPA > 4.0: Được xử lý an toàn không throw exception, xếp loại là 'Xuất sắc' (vượt trần mức cao nhất).
 *
 * @param gpa Điểm trung bình tích lũy thang 4.0.
 * @returns Xếp loại học lực tương ứng.
 */
export function classifyAcademicRank(gpa: number | null | undefined): AcademicRank {
  if (typeof gpa !== 'number' || Number.isNaN(gpa) || !Number.isFinite(gpa) || gpa < 2.0) {
    return 'Yếu';
  }

  if (gpa >= 3.6) {
    return 'Xuất sắc';
  }

  if (gpa >= 3.2) {
    return 'Giỏi';
  }

  if (gpa >= 2.5) {
    return 'Khá';
  }

  return 'Trung bình';
}

/**
 * Đếm chính xác số lượng từng loại học lực từ danh sách sinh viên.
 *
 * @param students Danh sách sinh viên chứa thông tin gpa (có thể rỗng, null hoặc undefined).
 * @returns Object đếm phân bổ số lượng từng loại học lực: 'Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Yếu'.
 *
 * Xử lý an toàn mảng rỗng (mọi count = 0), null, undefined, phần tử thiếu gpa, GPA âm, GPA vượt trần mà không throw exception.
 */
export function calculateGradeDistribution(
  students: Array<{ gpa?: number | null }> | null | undefined
): Record<AcademicRank, number> {
  const distribution: Record<AcademicRank, number> = {
    'Xuất sắc': 0,
    'Giỏi': 0,
    'Khá': 0,
    'Trung bình': 0,
    'Yếu': 0,
  };

  if (!Array.isArray(students)) {
    return distribution;
  }

  for (const student of students) {
    const rank = classifyAcademicRank(student?.gpa);
    distribution[rank] += 1;
  }

  return distribution;
}
