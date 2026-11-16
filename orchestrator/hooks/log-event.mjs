#!/usr/bin/env node
// Hook ghi log (PostToolUse, SubagentStop...). FAIL-OPEN: lỗi gì cũng exit 0, không làm hỏng công việc.
// Hỗ trợ cả Claude Code và Antigravity.
import { readFileSync } from 'node:fs';
import { buildEntry, appendOnce, logFileFor } from './hook-log.mjs';
import { parseHookInput, respondPostTool } from './hook-adapter.mjs';

let isAntigravity = false;
try {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  const normalized = parseHookInput(input);
  isAntigravity = normalized.isAntigravity;
  const root = process.env.CLAUDE_PROJECT_DIR || normalized.root || normalized.cwd || process.cwd();
  const execId = process.env.AGENT_EXEC_ID || 'none';
  appendOnce(logFileFor(root, execId), buildEntry(input, { execId }));
} catch { /* fail-open */ }

respondPostTool({ isAntigravity });
