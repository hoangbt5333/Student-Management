#!/usr/bin/env node
// Hook PreToolUse (matcher: Bash). FAIL-CLOSED: mọi lỗi nội bộ đều chặn (exit 2),
// vì với Claude Code chỉ exit 2 mới chặn; các mã khác (kể cả crash = 1) sẽ cho lệnh chạy tiếp.
import { readFileSync } from 'node:fs';
import { evaluateBash } from './guard-policy.mjs';
import { findMainRoot } from './repo-root.mjs';
import { logDenied } from './hook-log.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof input?.tool_name !== 'string') throw new Error('payload thiếu tool_name');
  if (input.tool_name !== 'Bash') process.exit(0);
  const command = input.tool_input?.command;
  if (typeof command !== 'string') throw new Error('thiếu tool_input.command');
  const verdict = evaluateBash(command, { cwd: input.cwd ?? process.cwd() });
  if (!verdict.allow) {
    const cwd = input.cwd ?? process.cwd();
    let root = cwd;
    try { root = findMainRoot(cwd); } catch { /* log tạm vào cwd */ }
    logDenied(root, process.env.AGENT_EXEC_ID || 'none', { hook: 'guard-bash', tool: 'Bash', target: command, reason: verdict.reason, cwd });
    console.error(`[guard-bash] BỊ CHẶN: ${verdict.reason}`);
    process.exit(2);
  }
  process.exit(0);
} catch (e) {
  console.error(`[guard-bash] lỗi nội bộ, chặn để an toàn (fail-closed): ${e.message}`);
  process.exit(2);
}
