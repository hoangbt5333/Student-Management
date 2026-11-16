#!/usr/bin/env node
// Hook PreToolUse (matcher: Edit|Write|MultiEdit|NotebookEdit|write_file|edit_file). FAIL-CLOSED: lỗi nội bộ => chặn.
import { readFileSync } from 'node:fs';
import { loadConfig } from '../config.mjs';
import { findMainRoot } from './repo-root.mjs';
import { evaluateEdit } from './guard-edit-policy.mjs';
import { logDenied } from './hook-log.mjs';
import { parseHookInput, respondPreTool } from './hook-adapter.mjs';

const EDIT_TOOLS = new Set([
  'Edit', 'Write', 'MultiEdit', 'NotebookEdit',
  'edit_file', 'write_file', 'append_file', 'create_or_update_file', 'create_file', 'delete_file',
]);

let isAntigravity = false;
let ctx = {};

try {
  const raw = readFileSync(0, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('JSON không hợp lệ');
  }

  const normalized = parseHookInput(parsed);
  isAntigravity = normalized.isAntigravity;

  if (!isAntigravity && typeof parsed?.tool_name !== 'string') {
    throw new Error('payload thiếu tool_name');
  }

  if (!EDIT_TOOLS.has(normalized.toolName)) {
    respondPreTool({ isAntigravity, allow: true });
  }

  const filePath = normalized.filePath;
  if (typeof filePath !== 'string' || !filePath) {
    throw new Error(isAntigravity ? 'thiếu đường dẫn file trong toolCall.args' : 'thiếu đường dẫn file trong tool_input');
  }

  const cwd = normalized.cwd ?? process.cwd();
  let mainRoot = normalized.root;
  try {
    mainRoot = mainRoot ? findMainRoot(mainRoot) : findMainRoot(cwd);
  } catch {
    mainRoot = findMainRoot(cwd);
  }

  ctx = { mainRoot, cwd, tool: normalized.toolName, target: filePath };
  const config = loadConfig(mainRoot);
  const verdict = evaluateEdit({ filePath, cwd, mainRoot, config });

  if (!verdict.allow) {
    logDenied(mainRoot, process.env.AGENT_EXEC_ID || verdict.execId || 'none', {
      hook: 'guard-edit',
      taskId: verdict.actor,
      reason: verdict.reason,
      ...ctx
    });
    respondPreTool({
      isAntigravity,
      allow: false,
      reason: `[guard-edit] BỊ CHẶN: ${verdict.reason}`
    });
  }

  respondPreTool({ isAntigravity, allow: true });
} catch (e) {
  respondPreTool({
    isAntigravity,
    allow: false,
    reason: `[guard-edit] lỗi nội bộ, chặn để an toàn (fail-closed): ${e.message}`
  });
}
