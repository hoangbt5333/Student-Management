#!/usr/bin/env node
// Hook ghi log (PostToolUse, SubagentStop...). FAIL-OPEN: lỗi gì cũng exit 0, không làm hỏng công việc.
// Biến môi trường tùy chọn: AGENT_EXEC_ID (mặc định "none"), AGENT_TASK_ID (mặc định suy ra từ cwd).
import { readFileSync } from 'node:fs';
import { buildEntry, appendOnce, logFileFor } from './hook-log.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const execId = process.env.AGENT_EXEC_ID || 'none';
  appendOnce(logFileFor(root, execId), buildEntry(input, { execId }));
} catch { /* fail-open */ }
process.exit(0);
