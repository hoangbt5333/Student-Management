// Tìm thư mục gốc của checkout chính (kể cả khi cwd là một git worktree) và resolve đường dẫn thật.
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

/** Như path.resolve nhưng đi qua symlink; file chưa tồn tại thì resolve phần tổ tiên đã có. */
export function realResolve(p) {
  let cur = resolve(p);
  const rest = [];
  while (!existsSync(cur)) {
    const parent = dirname(cur);
    if (parent === cur) break;
    rest.unshift(basename(cur));
    cur = parent;
  }
  let real = cur;
  try { real = realpathSync(cur); } catch { /* giữ nguyên */ }
  return join(real, ...rest);
}

/** Từ trong worktree, `git rev-parse --git-common-dir` trỏ về .git của checkout chính. */
export function findMainRoot(cwd, env = process.env) {
  try {
    const out = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const common = realResolve(resolve(cwd, out));
    if (basename(common) === '.git') return dirname(common);
  } catch { /* rơi xuống fallback */ }
  if (env.CLAUDE_PROJECT_DIR) return realResolve(env.CLAUDE_PROJECT_DIR);
  throw new Error(`không xác định được thư mục gốc dự án từ ${cwd}`);
}
