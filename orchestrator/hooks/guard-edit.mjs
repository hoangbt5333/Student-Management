#!/usr/bin/env node
// Hook PreToolUse (matcher: Edit|Write|MultiEdit|NotebookEdit). FAIL-CLOSED: lỗi nội bộ => exit 2.
// Giới hạn: Bash vẫn có thể ghi file (sed -i, echo >). Hook này chỉ kiểm soát các công cụ sửa file.
import { readFileSync } from 'node:fs';
import { loadConfig } from '../config.mjs';
import { findMainRoot } from './repo-root.mjs';
import { evaluateEdit } from './guard-edit-policy.mjs';
import { logDenied } from './hook-log.mjs';

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
let ctx = {};

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof input?.tool_name !== 'string') throw new Error('payload thiếu tool_name');
  if (!EDIT_TOOLS.has(input.tool_name)) process.exit(0);
  const ti = input.tool_input ?? {};
  const filePath = ti.file_path ?? ti.notebook_path ?? ti.path;
  if (typeof filePath !== 'string' || !filePath) throw new Error('thiếu đường dẫn file trong tool_input');
  const cwd = input.cwd ?? process.cwd();
  const mainRoot = findMainRoot(cwd);
  ctx = { mainRoot, cwd, tool: input.tool_name, target: filePath };
  const config = loadConfig(mainRoot);
  const verdict = evaluateEdit({ filePath, cwd, mainRoot, config });
  if (!verdict.allow) {
    logDenied(mainRoot, process.env.AGENT_EXEC_ID || verdict.execId || 'none', { hook: 'guard-edit', taskId: verdict.actor, reason: verdict.reason, ...ctx });
    console.error(`[guard-edit] BỊ CHẶN: ${verdict.reason}`);
    process.exit(2);
  }
  process.exit(0);
} catch (e) {
  console.error(`[guard-edit] lỗi nội bộ, chặn để an toàn (fail-closed): ${e.message}`);
  process.exit(2);
}
