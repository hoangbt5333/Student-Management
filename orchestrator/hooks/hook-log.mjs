// Ghi sự kiện hook ra JSONL, có che secret và chống ghi trùng. Không ném lỗi ra ngoài (fail-open).
import { appendFileSync, mkdirSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SECRET_PATTERNS = [
  /((?:token|secret|password|passwd|api[_-]?key|authorization)["'\s:=]+(?:(?:bearer|basic)\s+)?)[^\s"']+/gi,
  /\b(sk|ghp|gho|xox[a-z])[-_][A-Za-z0-9_-]{10,}/g,
];

export function redact(text) {
  let out = String(text);
  out = out.replace(SECRET_PATTERNS[0], '$1[REDACTED]');
  out = out.replace(SECRET_PATTERNS[1], '[REDACTED]');
  return out;
}

export function buildEntry(input, { execId = 'none', now = new Date() } = {}) {
  const ti = input.tool_input ?? input.toolCall?.args ?? {};
  const cmd = ti.CommandLine ?? ti.command;
  const target = ti.Path ?? ti.path ?? ti.file_path ?? (typeof cmd === 'string' ? redact(cmd).slice(0, 200) : null);
  const cwd = input.cwd ?? (Array.isArray(input.workspacePaths) ? input.workspacePaths[0] : '');
  const taskId = process.env.AGENT_TASK_ID || cwd.match(/TASK-[\w-]+/)?.[0] || null;
  const entry = {
    ts: now.toISOString(),
    exec_id: execId,
    task_id: taskId,
    event: input.hook_event_name ?? (input.toolCall ? 'PostToolUse' : null),
    tool: input.tool_name ?? input.toolCall?.name ?? null,
    target,
    session_id: input.session_id ?? input.conversationId ?? null,
    cwd,
  };
  const dedupeKey = input.tool_use_id ?? (input.stepIdx !== undefined ? `step:${input.stepIdx}` : null);
  if (dedupeKey) entry.dedupe = `${entry.event}:${dedupeKey}`;
  return entry;
}

function tailText(file, bytes = 16384) {
  try {
    const size = statSync(file).size;
    const fd = openSync(file, 'r');
    try {
      const len = Math.min(size, bytes);
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, size - len);
      return buf.toString('utf8');
    } finally { closeSync(fd); }
  } catch { return ''; }
}

/** Idempotent: nếu cùng khóa dedupe đã có trong phần đuôi file thì bỏ qua. Trả về true nếu đã ghi. */
export function appendOnce(file, entry) {
  if (entry.dedupe && tailText(file).includes(JSON.stringify(entry.dedupe))) return false;
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(entry) + '\n');
  return true;
}

export const logFileFor = (root, execId) => join(root, 'logs', execId, 'hooks.jsonl');

/** Ghi lại một lần bị chặn (audit). Không bao giờ ném lỗi: ghi log hỏng không được đổi kết quả chặn. */
export function logDenied(root, execId, { hook, tool, target, reason, cwd, taskId }) {
  try {
    appendOnce(logFileFor(root, execId), {
      ts: new Date().toISOString(), exec_id: execId, task_id: taskId ?? null,
      event: 'guard_denied', hook, tool, target: redact(String(target ?? '')).slice(0, 200), reason, cwd: cwd ?? null,
    });
  } catch { /* bỏ qua */ }
}

/** Ghi một sự kiện hook; lỗi ghi log không được làm thay đổi kết quả hook. */
export function logHook(root, execId, event) {
  try {
    appendOnce(logFileFor(root, execId), {
      ts: new Date().toISOString(),
      exec_id: execId,
      ...event,
    });
  } catch { /* bỏ qua */ }
}
