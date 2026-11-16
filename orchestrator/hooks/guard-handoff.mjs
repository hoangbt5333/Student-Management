#!/usr/bin/env node
// Hook Stop / SubagentStop: Coder muốn kết thúc thì kiểm tra báo cáo bàn giao (.task-report.json).
// Chặn kết thúc bằng exit 2 (stderr gửi lại cho Agent kèm danh sách lỗi đánh số).
//
// FAIL-OPEN có chủ đích: đây là cổng chất lượng, không phải hàng rào bảo mật. Hook lỗi hoặc đã nhắc một lần
// (stop_hook_active) mà Agent vẫn chưa sửa thì cho dừng, để Agent không kẹt vô hạn. Orchestrator vẫn kiểm tra độc lập
// bằng `cli.mjs report-check` và coi báo cáo thiếu/sai là FAIL.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config.mjs';
import { findMainRoot, realResolve } from './repo-root.mjs';
import { findActiveTask, taskFromPath, worktreeBase } from './guard-edit-policy.mjs';
import { REPORT_FILE, checkHandoff } from '../report.mjs';
import { logHook } from './hook-log.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const cwd = input.cwd ?? process.cwd();
  const mainRoot = findMainRoot(cwd);
  const config = loadConfig(mainRoot);
  const wtBase = worktreeBase(mainRoot, config);
  const actor = process.env.AGENT_TASK_ID || taskFromPath(realResolve(cwd), wtBase)?.taskId || null;

  // Chỉ áp dụng cho Agent thuộc vai trò Coder (agent_type) hoặc tiến trình chạy riêng một Task (AGENT_TASK_ID)
  const applies = (input.agent_type && config.handoff.agent_types.includes(input.agent_type)) || Boolean(process.env.AGENT_TASK_ID);
  if (!actor || !applies) process.exit(0);

  const found = findActiveTask(mainRoot, actor, process.env.AGENT_EXEC_ID || undefined);
  if (!found) process.exit(0); // Task không in_progress: không có gì để bắt buộc
  const execId = found.execId;
  const worktree = join(wtBase, actor);
  const reportPath = join(worktree, REPORT_FILE);

  let problems;
  if (!existsSync(reportPath)) {
    problems = [`Chưa có báo cáo bàn giao: hãy ghi ${reportPath} theo schema (xem \`orchestrator/cli.mjs brief ${actor} --exec ${execId}\`).`];
  } else {
    let report = null;
    try { report = JSON.parse(readFileSync(reportPath, 'utf8')); } catch (e) { problems = [`${REPORT_FILE} không phải JSON hợp lệ: ${e.message}`]; }
    if (report) problems = checkHandoff({ report, task: found.task, execId, config, mainRoot, worktree }).problems;
  }

  if (!problems.length) {
    logHook(mainRoot, execId, { event: 'handoff_ok', hook: 'guard-handoff', task_id: actor, agent_type: input.agent_type ?? null });
    process.exit(0);
  }
  logHook(mainRoot, execId, { event: 'handoff_invalid', hook: 'guard-handoff', task_id: actor, agent_type: input.agent_type ?? null, problems, retry_exhausted: Boolean(input.stop_hook_active) });
  if (input.stop_hook_active) process.exit(0); // đã nhắc một lần rồi: không giữ Agent mãi
  console.error(`[guard-handoff] Chưa thể kết thúc ${actor}. Sửa các điểm sau rồi kết thúc lại:\n${problems.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}`);
  process.exit(2);
} catch (e) {
  console.error(`[guard-handoff] lỗi nội bộ, bỏ qua (fail-open): ${e.message}`);
  process.exit(0);
}
