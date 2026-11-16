#!/usr/bin/env node
// Hook PreToolUse (matcher: Bash / run_command). FAIL-CLOSED: mọi lỗi nội bộ đều chặn.
// Hỗ trợ cả Claude Code (exit 2, stderr) và Antigravity (JSON decision: 'allow' | 'deny').
import { readFileSync } from 'node:fs';
import { evaluateBash } from './guard-policy.mjs';
import { findMainRoot } from './repo-root.mjs';
import { logDenied } from './hook-log.mjs';
import { parseHookInput, respondPreTool } from './hook-adapter.mjs';

let isAntigravity = false;
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

  // Nếu là Claude Code mà không có tool_name -> báo lỗi thiếu tool_name
  if (!isAntigravity && typeof parsed?.tool_name !== 'string') {
    throw new Error('payload thiếu tool_name');
  }

  const SHELL_TOOLS = new Set(['Bash', 'run_command']);
  if (!SHELL_TOOLS.has(normalized.toolName)) {
    respondPreTool({ isAntigravity, allow: true });
  }

  if (typeof normalized.command !== 'string') {
    throw new Error(isAntigravity ? 'thiếu CommandLine trong toolCall.args' : 'thiếu tool_input.command');
  }

  const cwd = normalized.cwd ?? process.cwd();
  const verdict = evaluateBash(normalized.command, { cwd });
  if (!verdict.allow) {
    let root = normalized.root || cwd;
    try { root = findMainRoot(cwd); } catch { /* log tạm vào cwd */ }
    logDenied(root, process.env.AGENT_EXEC_ID || 'none', {
      hook: 'guard-bash',
      tool: normalized.toolName,
      target: normalized.command,
      reason: verdict.reason,
      cwd
    });
    respondPreTool({
      isAntigravity,
      allow: false,
      reason: `[guard-bash] BỊ CHẶN: ${verdict.reason}`
    });
  }

  respondPreTool({ isAntigravity, allow: true });
} catch (e) {
  respondPreTool({
    isAntigravity,
    allow: false,
    reason: `[guard-bash] lỗi nội bộ, chặn để an toàn (fail-closed): ${e.message}`
  });
}
