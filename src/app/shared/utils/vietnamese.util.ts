/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm không phân biệt dấu và hoa thường.
 * - Phân rã ký tự Unicode NFD để bóc tách dấu tổ hợp (combining diacritical marks)
 * - Loại bỏ các dấu thanh, dấu mũ, dấu móc (U+0300 đến U+036F)
 * - Chuyển đổi 'đ' và 'Đ' thành 'd'
 * - Chuyển sang chữ thường với locale 'vi'
 * - Trim khoảng trắng thừa đầu cuối
 */
export function normalizeVietnamese(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi')
    .trim();
}

/**
 * Kiểm tra xem chuỗi nguồn có chứa từ khóa tìm kiếm tiếng Việt hay không
 * (Hỗ trợ tìm kiếm không dấu, có dấu, hoa thường linh hoạt).
 */
export function matchesVietnamese(
  source: string | null | undefined,
  keyword: string | null | undefined
): boolean {
  const normKeyword = normalizeVietnamese(keyword);
  if (!normKeyword) {
    return true;
  }
  return normalizeVietnamese(source).includes(normKeyword);
}
