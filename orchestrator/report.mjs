// Task Brief (giao việc) và kiểm tra báo cáo bàn giao (nhận việc). Nguyên tắc: tin bằng chứng, không tin lời Agent.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './schema-lite.mjs';
import { REPORT_FILE, REVIEW_FILE, FRAMEWORK_PATHS, ownershipViolation } from './paths-policy.mjs';

export { REPORT_FILE, REVIEW_FILE };
const here = dirname(fileURLToPath(import.meta.url));
export const REPORT_SCHEMA_PATH = join(here, '..', 'schemas', 'report.schema.json');
export const BRIEF_SCHEMA_PATH = join(here, '..', 'schemas', 'task-brief.schema.json');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

export const validateReportShape = (report) => validate(report, readJson(REPORT_SCHEMA_PATH));
export const validateBriefShape = (brief) => validate(brief, readJson(BRIEF_SCHEMA_PATH));
export const baseBranchFor = (config, execId) => `${config.git.integration_branch_prefix}${execId}`;
export const worktreePathFor = (root, config, taskId) => resolve(root, config.git.worktree_dir, taskId);

export function validationCommand({ root, execId, taskId, worktree, base }) {
  const script = join(here, 'validate.mjs');
  return `node "${script}" ${taskId} "${worktree}" --exec ${execId} --root "${root}" --base ${base}`;
}

/** Sinh Task Brief từ Task trong state + cấu hình dự án. */
export function buildBrief({ task, config, root, execId }) {
  const worktree = worktreePathFor(root, config, task.id);
  const base = baseBranchFor(config, execId);
  return {
    task_id: task.id,
    title: task.title,
    goal: task.description || task.title,
    depends_on: task.depends_on,
    owned_files: task.owned_files,
    acceptance_criteria: task.acceptance_criteria,
    worktree,
    branch: `${config.git.task_branch_prefix}${task.id}`,
    base_branch: base,
    validation_command: validationCommand({ root, execId, taskId: task.id, worktree, base }),
    report_file: join(worktree, REPORT_FILE),
    report_schema: REPORT_SCHEMA_PATH,
    forbidden: [
      'git push và mọi lệnh git phá hủy (reset --hard, clean -f, xóa nhánh)',
      'sửa file ngoài owned_files, hoặc .claude/ orchestrator/ state/ logs/ project.config.json',
      'tự đổi trạng thái Task (chỉ Orchestrator làm việc này)',
      `kết thúc khi chưa commit hết, chưa chạy validation_command và chưa ghi ${REPORT_FILE} đúng schema`,
    ],
  };
}

function gitIn(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\r/g, '').trim();
}
function refExists(cwd, ref) {
  try { gitIn(cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${ref}`]); return true; } catch { return false; }
}

/**
 * Kiểm tra báo cáo bàn giao của Coder. Trả về { problems, notes }.
 * problems rỗng nghĩa là hợp lệ. Mọi kết luận dựa trên git và log của validate.mjs, không dựa trên lời khai.
 */
export function checkHandoff({ report, task, execId, config, mainRoot, worktree }) {
  const problems = [];
  const notes = [];

  const shape = validateReportShape(report);
  if (shape.length) return { problems: shape.map((e) => `Sai schema báo cáo: ${e}`), notes };

  if (report.task_id !== task.id) problems.push(`task_id trong báo cáo ("${report.task_id}") khác Task đang làm (${task.id}).`);

  const head = gitIn(worktree, ['rev-parse', 'HEAD']);
  const short = head.slice(0, 7);

  const dirty = gitIn(worktree, ['status', '--porcelain'])
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.endsWith(REPORT_FILE) && !l.endsWith(REVIEW_FILE));
  if (dirty.length) problems.push(`Còn thay đổi chưa commit: ${dirty.slice(0, 5).join('; ')}. Hãy commit hết (hoặc bỏ thay đổi không cần).`);

  if (report.result === 'READY_FOR_REVIEW') {
    if (!report.commits.some((c) => head.startsWith(c))) problems.push(`"commits" chưa gồm commit HEAD hiện tại (${short}).`);
    if (report.needs_human) problems.push('result là READY_FOR_REVIEW nhưng needs_human = true: mâu thuẫn.');

    const evFile = join(mainRoot, 'logs', execId, task.id, short, 'result.json');
    if (!existsSync(evFile)) {
      const cmd = validationCommand({ root: mainRoot, execId, taskId: task.id, worktree, base: baseBranchFor(config, execId) });
      problems.push(`Chưa có bằng chứng validation cho commit ${short}. Chạy: ${cmd}`);
    } else {
      const ev = readJson(evFile);
      if (ev.commit !== head) problems.push(`Bằng chứng validation thuộc commit khác (${String(ev.commit).slice(0, 7)}), không phải HEAD (${short}).`);
      if (ev.status !== 'READY_FOR_REVIEW') problems.push(`Validation của commit ${short} là ${ev.status}: không thể báo READY_FOR_REVIEW. Sửa lỗi rồi chạy lại validation.`);
      for (const c of ev.checks ?? []) {
        if (report.checks[c.name] === 'pass' && !c.passed) problems.push(`Báo cáo khai ${c.name}=pass nhưng bằng chứng cho thấy ${c.name} không đạt.`);
      }
    }
  } else if (!report.open_issues.length) {
    problems.push(`result là ${report.result} nên cần "open_issues" mô tả lý do/vướng mắc cụ thể.`);
  }

  // Đối chiếu git diff thật với owned_files: bắt cả file ghi bằng Bash (hook sửa file không thấy)
  const base = [baseBranchFor(config, execId), config.project.base_branch].find((b) => refExists(worktree, b));
  if (!base) {
    notes.push('Không tìm thấy nhánh base nên bỏ qua đối chiếu git diff.');
  } else {
    const changed = gitIn(worktree, ['diff', '--name-only', `${base}...HEAD`])
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const outside = changed.map((f) => [f, ownershipViolation(f, task.owned_files ?? [], config, task.id)]).filter(([, why]) => why);
    if (outside.length) problems.push(`Commit có file ngoài phạm vi: ${outside.slice(0, 5).map(([f]) => f).join(', ')}${outside.length > 5 ? ', ...' : ''}. Hãy revert các file này (phạm vi cho phép: ${(task.owned_files ?? []).join(', ') || 'không có'}).`);
    const unlisted = changed.filter((f) => !report.files_changed.includes(f));
    if (unlisted.length) problems.push(`"files_changed" thiếu file thực sự đã đổi: ${unlisted.slice(0, 5).join(', ')}${unlisted.length > 5 ? ', ...' : ''}.`);
  }
  return { problems, notes };
}

export { FRAMEWORK_PATHS };
