// Luật đường dẫn dùng chung: hook chặn sửa file (lúc sửa) và kiểm tra bàn giao (lúc nộp, theo git diff).
import { hasGlob, matchesAny, normalize } from './ownership.mjs';

export const REPORT_FILE = '.task-report.json'; // nằm ở gốc worktree, phải được .gitignore
export const REVIEW_FILE = '.task-review.json';
// Phần của khung / bằng chứng: Coder không bao giờ được sửa
export const FRAMEWORK_PATHS = ['.git', '.claude', 'orchestrator', 'state', 'logs', 'project.config.json'];
export const OWNERSHIP_GUIDE = 'Nếu thật sự cần sửa file này, hãy báo Orchestrator để Architect cập nhật owned_files hoặc tách Task; đừng tự vượt phạm vi.';

/** File của khung hoặc file nhạy cảm. Trả về lý do (chuỗi) hoặc null. */
export function pathViolation(relPath, config) {
  const rel = normalize(relPath);
  if (FRAMEWORK_PATHS.includes(rel.split('/')[0])) {
    return `"${rel}" thuộc khung/bằng chứng (${FRAMEWORK_PATHS.join(', ')}) — Coder không được sửa.`;
  }
  if (matchesAny(rel, config.security.deny_read)) return `"${rel}" khớp security.deny_read (file nhạy cảm) — không được sửa.`;
  return null;
}

/** File có thuộc owned_files của Task không (kể cả luật file dùng chung)? Trả về lý do hoặc null. */
export function ownedViolation(relPath, owned, config, actor) {
  const rel = normalize(relPath);
  if (!owned.length) return `${actor} chưa khai báo owned_files nên không có quyền sửa file nào. ${OWNERSHIP_GUIDE}`;
  const shared = config.ownership.shared_files ?? [];
  if (matchesAny(rel, shared) && !owned.some((p) => !hasGlob(p) && normalize(p) === rel)) {
    return `"${rel}" là file dùng chung: Task phải liệt kê tường minh trong owned_files (glob rộng như "src/**" không đủ). ${OWNERSHIP_GUIDE}`;
  }
  if (!matchesAny(rel, owned)) return `"${rel}" không thuộc owned_files của ${actor} [${owned.join(', ')}]. ${OWNERSHIP_GUIDE}`;
  return null;
}

export const ownershipViolation = (rel, owned, config, actor) => pathViolation(rel, config) ?? ownedViolation(rel, owned, config, actor);
