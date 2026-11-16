/**
 * Tiện ích chuẩn hóa hiển thị thông tin sinh viên.
 * Toàn bộ các hàm là pure function và xử lý an toàn mọi giá trị đầu vào.
 */

/**
 * Định dạng mã sinh viên thành chuỗi có tiền tố 'SV-' cùng 5 chữ số đệm 0.
 *
 * @param code Số nguyên hoặc chuỗi số nguyên không âm.
 * @returns Chuỗi mã sinh viên chuẩn hóa (ví dụ: 'SV-00123') hoặc chuỗi rỗng nếu không hợp lệ.
 */
export function formatStudentCode(code: number | string | null | undefined): string {
  if (code === null || code === undefined) {
    return '';
  }

  if (typeof code === 'number') {
    if (!Number.isFinite(code) || !Number.isInteger(code) || code < 0) {
      return '';
    }
    return `SV-${String(code).padStart(5, '0')}`;
  }

  if (typeof code === 'string') {
    const trimmed = code.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      return '';
    }
    const num = Number(trimmed);
    if (!Number.isSafeInteger(num)) {
      return '';
    }
    return `SV-${String(num).padStart(5, '0')}`;
  }

  return '';
}

/**
 * Che các ký tự ở giữa username của email bằng dấu '*' để bảo mật thông tin.
 *
 * @param email Địa chỉ email cần che.
 * @returns Email đã được che hoặc chuỗi rỗng nếu email không hợp lệ.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const trimmed = email.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return '';
  }

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@') || atIndex === trimmed.length - 1) {
    return '';
  }

  const username = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts.some((part) => part.length === 0)) {
    return '';
  }

  if (username.length === 1) {
    return `${username}*@${domain}`;
  }

  const middleLength = Math.max(1, username.length - 2);
  const maskedUsername = `${username[0]}${'*'.repeat(middleLength)}${username[username.length - 1]}`;

  return `${maskedUsername}@${domain}`;
}

/**
 * Định dạng số điện thoại Việt Nam 10 số theo dạng xxxx.xxx.xxx.
 *
 * @param phone Chuỗi số điện thoại.
 * @returns Chuỗi định dạng xxxx.xxx.xxx hoặc chuỗi ban đầu/rỗng nếu không đủ 10 số.
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return '';
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
  }

  return trimmed;
}
