// Luật đường dẫn dùng chung: hook chặn sửa file (lúc sửa) và kiểm tra bàn giao (lúc nộp, theo git diff).
import { symlinkSync, unlinkSync, rmdirSync, rmSync, existsSync, lstatSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
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

/**
 * Tự động chuẩn bị node_modules cho worktree:
 * - Nếu worktree có pnpm-lock.yaml: chạy `pnpm install --frozen-lockfile --prefer-offline`
 *   (hardlink trực tiếp từ pnpm store, an toàn khi chạy nhiều worktree song song).
 * - Ngược lại: fallback liên kết junction (Windows) hoặc symlink (macOS/Linux) từ root.
 */
export function ensureNodeModules(root, worktree) {
  const rootModules = join(root, 'node_modules');
  const wtModules = join(worktree, 'node_modules');
  if (existsSync(wtModules)) {
    return { linked: false, already_exists: true };
  }

  if (existsSync(join(worktree, 'pnpm-lock.yaml'))) {
    try {
      execSync('pnpm install --frozen-lockfile --prefer-offline', {
        cwd: worktree,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      return { linked: true, type: 'pnpm', path: wtModules };
    } catch (err) {
      return { linked: false, error: err.stderr?.trim() || err.message };
    }
  }

  if (existsSync(rootModules)) {
    try {
      const type = process.platform === 'win32' ? 'junction' : 'dir';
      symlinkSync(rootModules, wtModules, type);
      return { linked: true, type, path: wtModules };
    } catch (err) {
      return { linked: false, error: err.message };
    }
  }
  return { linked: false, already_exists: false };
}

/**
 * Tháo gỡ node_modules (junction/symlink hoặc thư mục pnpm) trước khi dọn dẹp worktree.
 */
export function unlinkNodeModules(worktree) {
  const wtModules = join(worktree, 'node_modules');
  try {
    if (existsSync(wtModules)) {
      const stat = lstatSync(wtModules);
      if (stat.isSymbolicLink()) {
        try {
          unlinkSync(wtModules);
          return true;
        } catch (_) {
          rmdirSync(wtModules);
          return true;
        }
      }
      if (stat.isDirectory()) {
        rmSync(wtModules, { recursive: true, force: true });
        return true;
      }
    }
  } catch (_) {
    // Bỏ qua lỗi nếu không phải symlink/junction hoặc đã bị xóa
  }
  return false;
}
