#!/usr/bin/env node
// Hook Stop / SubagentStop: Coder muốn kết thúc thì kiểm tra báo cáo bàn giao (.task-report.json).
// Hỗ trợ cả Claude Code (exit 2, stderr) và Antigravity (JSON decision: 'continue' | '{}').
//
// FAIL-OPEN có chủ đích: đây là cổng chất lượng, không phải hàng rào bảo mật.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config.mjs';
import { findMainRoot, realResolve } from './repo-root.mjs';
import { findActiveTask, taskFromPath, worktreeBase } from './guard-edit-policy.mjs';
import { REPORT_FILE, checkHandoff } from '../report.mjs';
import { logHook } from './hook-log.mjs';
import { parseHookInput, respondStop } from './hook-adapter.mjs';

let isAntigravity = false;

try {
  const raw = readFileSync(0, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // FAIL-OPEN với dữ liệu hỏng
    respondStop({ isAntigravity: false, allow: true });
  }

  const normalized = parseHookInput(parsed);
  isAntigravity = normalized.isAntigravity;

  const cwd = normalized.cwd ?? process.cwd();
  let mainRoot = normalized.root;
  try {
    mainRoot = mainRoot ? findMainRoot(mainRoot) : findMainRoot(cwd);
  } catch {
    mainRoot = findMainRoot(cwd);
  }

  const config = loadConfig(mainRoot);
  const wtBase = worktreeBase(mainRoot, config);
  const actor = process.env.AGENT_TASK_ID || taskFromPath(realResolve(cwd), wtBase)?.taskId || null;

  // Áp dụng khi có AGENT_TASK_ID, hoặc agent_type là coder, hoặc agent trong Antigravity đang đứng trong worktree của Task
  const applies = Boolean(process.env.AGENT_TASK_ID) ||
    (normalized.agentType && config.handoff.agent_types.includes(normalized.agentType)) ||
    (isAntigravity && Boolean(actor));

  if (!actor || !applies) {
    respondStop({ isAntigravity, allow: true });
  }

  const found = findActiveTask(mainRoot, actor, process.env.AGENT_EXEC_ID || undefined);
  if (!found) {
    respondStop({ isAntigravity, allow: true }); // Task không in_progress
  }

  const execId = found.execId;
  const worktree = join(wtBase, actor);
  const reportPath = join(worktree, REPORT_FILE);

  let problems = [];
  if (!existsSync(reportPath)) {
    problems = [`Chưa có báo cáo bàn giao: hãy ghi ${reportPath} theo schema (xem \`orchestrator/cli.mjs brief ${actor} --exec ${execId}\`).`];
  } else {
    let report = null;
    try {
      report = JSON.parse(readFileSync(reportPath, 'utf8'));
    } catch (e) {
      problems = [`${REPORT_FILE} không phải JSON hợp lệ: ${e.message}`];
    }
    if (report) {
      problems = checkHandoff({ report, task: found.task, execId, config, mainRoot, worktree }).problems;
    }
  }

  if (!problems.length) {
    logHook(mainRoot, execId, {
      event: 'handoff_ok',
      hook: 'guard-handoff',
      task_id: actor,
      agent_type: normalized.agentType ?? (isAntigravity ? 'coder' : null)
    });
    respondStop({ isAntigravity, allow: true });
  }

  logHook(mainRoot, execId, {
    event: 'handoff_invalid',
    hook: 'guard-handoff',
    task_id: actor,
    agent_type: normalized.agentType ?? (isAntigravity ? 'coder' : null),
    problems,
    retry_exhausted: normalized.stopHookActive
  });

  if (normalized.stopHookActive) {
    // Đã nhắc một lần: không giữ Agent mãi
    respondStop({ isAntigravity, allow: true, retryExhausted: true });
  }

  const reason = `[guard-handoff] Chưa thể kết thúc ${actor}. Sửa các điểm sau rồi kết thúc lại:\n${problems.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}`;
  respondStop({ isAntigravity, allow: false, reason });
} catch (e) {
  console.error(`[guard-handoff] lỗi nội bộ, bỏ qua (fail-open): ${e.message}`);
  respondStop({ isAntigravity, allow: true });
}
