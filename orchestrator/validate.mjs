#!/usr/bin/env node
// Validation script = Coder Completion Gate bằng máy (giáo trình mục 6.3, 6.5).
// Dùng: node validate.mjs <task_id> <worktree> --exec <exec_id> [--root .] [--base <branch>]
// Exit code: 0 = READY_FOR_REVIEW, 1 = FAIL, 2 = lỗi cấu hình/sử dụng.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.mjs';
import { REPORT_FILE, REVIEW_FILE } from './paths-policy.mjs';

// Các kiểm tra thuộc cổng của Coder. e2e/install không nằm ở đây.
export const GATE_CHECKS = ['build', 'typecheck', 'lint', 'unit_test'];
const ENV_ERROR_PATTERN = /ENOTFOUND|ECONNREFUSED|ECONNRESET|EADDRINUSE|ETIMEDOUT|EAI_AGAIN|rate limit/i;
const COMMAND_NOT_FOUND_PATTERN = /is not recognized as an internal or external command/i;

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\r/g, '').trim();

/** Chạy một lệnh, lưu stdout/stderr ra file, có timeout. Không bao giờ ném lỗi. */
export function runCommand({ cmd, cwd, timeoutMs, stdoutFile, stderrFile }) {
  return new Promise((done) => {
    const started = Date.now();
    const outS = createWriteStream(stdoutFile);
    const errS = createWriteStream(stderrFile);
    let stderrTail = '';
    let timedOut = false;
    let spawnError = null;
    const child = spawn(cmd, { cwd, shell: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });

    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32' && child.pid !== undefined) {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
        killer.on('error', () => child.kill('SIGKILL'));
        killer.on('close', (code) => {
          if (code !== 0) child.kill('SIGKILL');
        });
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
    }, timeoutMs);

    child.stdout.on('data', (d) => outS.write(d));
    child.stderr.on('data', (d) => { errS.write(d); stderrTail = (stderrTail + d).slice(-4000); });
    child.on('error', (e) => { spawnError = e.message; });
    child.on('close', async (code, signal) => {
      clearTimeout(timer);
      await Promise.all([new Promise((r) => outS.end(r)), new Promise((r) => errS.end(r))]);
      done({ exit_code: code, signal, timed_out: timedOut, spawn_error: spawnError, stderr_tail: stderrTail, duration_ms: Date.now() - started });
    });
  });
}

/** Phân loại lỗi để quyết định retry (môi trường) hay trả lại Coder (code). Chỉ là heuristic. */
export function classifyFailure(r) {
  if (r.timed_out || r.spawn_error) return 'environment';
  if ([126, 127, 9009].includes(r.exit_code)) return 'environment';
  if (ENV_ERROR_PATTERN.test(r.stderr_tail ?? '') || COMMAND_NOT_FOUND_PATTERN.test(r.stderr_tail ?? '')) return 'environment';
  return 'code';
}

export async function runGate({ config, taskId, execId, worktree, root = process.cwd(), base = null }) {
  const cwd = resolve(worktree);
  const checks = GATE_CHECKS
    .filter((name) => config.commands[name]?.cmd)
    .map((name) => ({ name, ...config.commands[name] }));
  if (!checks.length) throw new Error('Không có lệnh kiểm tra nào trong "commands" (build/typecheck/lint/unit_test): cổng rỗng sẽ luôn PASS nên bị từ chối');

  const commit = git(cwd, ['rev-parse', 'HEAD']);
  const logDir = join(root, 'logs', execId, taskId, commit.slice(0, 7)); // evidence gắn với commit
  mkdirSync(logDir, { recursive: true });

  const results = [];
  const dirty = git(cwd, ['status', '--porcelain'])
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line.slice(3).trim() !== REPORT_FILE && line.slice(3).trim() !== REVIEW_FILE);
  const hasUncommittedChanges = dirty.length > 0;
  results.push({ name: 'git_clean', required: true, passed: !hasUncommittedChanges, detail: !hasUncommittedChanges ? 'không có thay đổi chưa commit' : dirty.slice(0, 20) });

  if (base) {
    const ahead = Number(git(cwd, ['rev-list', '--count', `${base}..HEAD`]));
    results.push({ name: 'new_commit', required: true, passed: ahead > 0, detail: `${ahead} commit mới so với ${base}` });
  }

  for (const c of checks) {
    const stdoutFile = join(logDir, `${c.name}.stdout.txt`);
    const stderrFile = join(logDir, `${c.name}.stderr.txt`);
    const r = await runCommand({ cmd: c.cmd, cwd, timeoutMs: (c.timeout_s ?? 300) * 1000, stdoutFile, stderrFile });
    const passed = r.exit_code === 0 && !r.timed_out;
    results.push({
      name: c.name,
      required: c.required !== false,
      passed,
      exit_code: r.exit_code,
      timed_out: r.timed_out,
      duration_ms: r.duration_ms,
      kind: passed ? null : classifyFailure(r),
      log_stdout: stdoutFile,
      log_stderr: stderrFile,
    });
  }

  const failedRequired = results.filter((r) => r.required && !r.passed);
  const status = failedRequired.length ? 'FAIL' : 'READY_FOR_REVIEW';
  const failure_kind = status === 'FAIL'
    ? (failedRequired.every((r) => r.kind === 'environment') ? 'environment' : 'code')
    : null;

  const result = { task_id: taskId, exec_id: execId, commit, status, failure_kind, checked_at: new Date().toISOString(), checks: results };
  writeFileSync(join(logDir, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { exec: { type: 'string' }, root: { type: 'string', default: process.cwd() }, base: { type: 'string' } },
  });
  const [taskId, worktree] = positionals;
  if (!taskId || !worktree || !values.exec) {
    console.error('Dùng: node validate.mjs <task_id> <worktree> --exec <exec_id> [--root .] [--base <branch>]');
    process.exit(2);
  }
  try {
    const config = loadConfig(resolve(values.root));
    const result = await runGate({ config, taskId, execId: values.exec, worktree, root: resolve(values.root), base: values.base ?? null });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'READY_FOR_REVIEW' ? 0 : 1);
  } catch (e) {
    console.error(`Lỗi: ${e.message}`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
