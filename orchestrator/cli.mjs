#!/usr/bin/env node
// CLI mỏng để skill/Agent gọi, thay vì tự sửa file state.
//   node cli.mjs check  --tasks tasks.json                 (kiểm tra kế hoạch: trùng owned_files)
//   node cli.mjs init   --exec E1 --tasks tasks.json [--force] [--allow-conflicts]
//   node cli.mjs next   --exec E1
//   node cli.mjs move   <TASK> <status> --exec E1 [--agent coder-a] [--note "..."]
//   node cli.mjs status --exec E1
//   node cli.mjs brief  <TASK> --exec E1                   (sinh Task Brief JSON để giao cho Coder)
//   node cli.mjs report-check <TASK> --exec E1             (kiểm tra độc lập báo cáo bàn giao; exit 1 nếu không đạt)
//   node cli.mjs integrate <TASK> --exec E1 [--clean-worktree] (tích hợp Task vào nhánh integration/E1)
//   node cli.mjs review-record <TASK> --exec E1 --verdict <APPROVED|CHANGES_REQUESTED> [--findings <json>]
//   node cli.mjs recover [--task <TASK>] --exec E1         (tự động phục hồi Task hoặc toàn bộ execution)
//   node cli.mjs report  --exec E1 [--format markdown|json] [--output <path>] (xuất báo cáo tổng kết phiên)
// Exit code: 0 ok, 1 kế hoạch có xung đột / báo cáo không đạt / tích hợp thất bại, 2 lỗi sử dụng/cấu hình/state.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.mjs';
import {
  createState, saveState, loadState, updateState, transition, getTask,
  readyTasks, detectDeadlock, statePath,
} from './state.mjs';
import { planCheck } from './ownership.mjs';
import { buildBrief, checkHandoff, validateBriefShape, worktreePathFor, baseBranchFor, REPORT_FILE } from './report.mjs';
import { ensureNodeModules } from './paths-policy.mjs';
import { integrateTask } from './integrate.mjs';
import { recoverTask, recoverExecution, recordReview } from './recover.mjs';
import { saveExecutionReport, formatMarkdownReport, generateExecutionSummary } from './report-summary.mjs';

const git = (cwd, args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    .replace(/\r/g, '')
    .trim();

function refExists(cwd, ref) {
  try {
    git(cwd, ['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}

function isAncestor(cwd, ancestor, descendant) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const [command, ...rest] = process.argv.slice(2);
const { values, positionals } = parseArgs({
  args: rest,
  allowPositionals: true,
  options: {
    exec: { type: 'string' }, root: { type: 'string', default: process.cwd() },
    tasks: { type: 'string' }, agent: { type: 'string' }, note: { type: 'string' },
    task: { type: 'string' }, verdict: { type: 'string' }, findings: { type: 'string' },
    reviewer: { type: 'string' },
    format: { type: 'string', default: 'markdown' },
    output: { type: 'string' },
    force: { type: 'boolean', default: false },
    'allow-conflicts': { type: 'boolean', default: false },
    'clean-worktree': { type: 'boolean', default: false },
    autostash: { type: 'boolean', default: true },
  },
});
const root = resolve(values.root);
const out = (obj) => console.log(JSON.stringify(obj, null, 2));
const readTasks = () => {
  if (!values.tasks) throw new Error('Thiếu --tasks <file>');
  const parsed = JSON.parse(readFileSync(resolve(values.tasks), 'utf8'));
  return parsed.tasks ?? parsed;
};

try {
  if (!['check', 'init', 'next', 'move', 'status', 'brief', 'report-check', 'integrate', 'recover', 'review-record', 'report', 'worktree'].includes(command)) {
    throw new Error('Lệnh: check | init | next | move | status | brief | report-check | integrate | recover | review-record | report | worktree');
  }
  if (command !== 'check' && !values.exec) throw new Error('Thiếu --exec <exec_id>');
  const config = loadConfig(root);

  if (command === 'check') {
    const result = planCheck(readTasks(), { sharedFiles: config.ownership.shared_files });
    out(result);
    process.exit(result.errors.length ? 1 : 0);
  } else if (command === 'init') {
    if (existsSync(statePath(root, values.exec)) && !values.force) throw new Error(`State ${values.exec} đã tồn tại (dùng --force để ghi đè)`);
    const tasks = readTasks();
    const plan = planCheck(tasks, { sharedFiles: config.ownership.shared_files });
    if (plan.errors.length && !values['allow-conflicts']) {
      throw new Error(`Kế hoạch có xung đột file:\n  - ${plan.errors.join('\n  - ')}`);
    }
    const state = createState({ execId: values.exec, tasks, maxAttempts: config.limits.max_attempts });
    saveState(root, state);

    // Đảm bảo nhánh tích hợp integration/<exec_id> được tạo sẵn từ base_branch
    const integrationBranch = baseBranchFor(config, values.exec);
    const rootBase = config.project.base_branch || 'main';
    if (!refExists(root, `refs/heads/${integrationBranch}`)) {
      try {
        git(root, ['branch', integrationBranch, rootBase]);
      } catch (_) {}
    }

    out({ ok: true, exec_id: state.exec_id, tasks: state.tasks.length, integration_branch: integrationBranch, warnings: plan.warnings, conflicts: plan.errors });
  } else if (command === 'next') {
    const state = loadState(root, values.exec);
    out({ ready: readyTasks(state, config.limits.max_parallel).map((t) => t.id), ...detectDeadlock(state) });
  } else if (command === 'move') {
    const [taskId, to] = positionals;
    if (!taskId || !to) throw new Error('Dùng: move <TASK> <status> --exec <id>');
    updateState(root, values.exec, (s) => transition(s, taskId, to, { agent: values.agent, note: values.note }));
    out({ ok: true, task_id: taskId, status: to });
  } else if (command === 'brief') {
    const [taskId] = positionals;
    if (!taskId) throw new Error('Dùng: brief <TASK> --exec <id>');
    const brief = buildBrief({ task: getTask(loadState(root, values.exec), taskId), config, root, execId: values.exec });
    const errors = validateBriefShape(brief);
    if (errors.length) throw new Error(`Task Brief không hợp lệ (Task thiếu owned_files/acceptance_criteria?):\n  - ${errors.join('\n  - ')}`);
    out(brief);
  } else if (command === 'report-check') {
    const [taskId] = positionals;
    if (!taskId) throw new Error('Dùng: report-check <TASK> --exec <id>');
    const task = getTask(loadState(root, values.exec), taskId);
    const worktree = worktreePathFor(root, config, taskId);
    const file = join(worktree, REPORT_FILE);
    if (!existsSync(file)) { out({ ok: false, problems: [`Không có ${file}`] }); process.exit(1); }
    let report;
    try { report = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { out({ ok: false, problems: [`${REPORT_FILE} không phải JSON hợp lệ: ${e.message}`] }); process.exit(1); }
    const { problems, notes } = checkHandoff({ report, task, execId: values.exec, config, mainRoot: root, worktree });
    out({ ok: problems.length === 0, problems, notes });
    process.exit(problems.length ? 1 : 0);
  } else if (command === 'integrate') {
    const [taskId] = positionals;
    if (!taskId) throw new Error('Dùng: integrate <TASK> --exec <id> [--clean-worktree] [--no-autostash]');
    const result = await integrateTask({
      root,
      execId: values.exec,
      taskId,
      cleanWorktree: values['clean-worktree'],
      autostash: values.autostash,
    });
    out(result);
    process.exit(result.ok ? 0 : 1);
  } else if (command === 'review-record') {
    const [posTaskId] = positionals;
    const taskId = posTaskId || values.task;
    if (!taskId) throw new Error('Dùng: review-record <TASK> --exec <id> --verdict <APPROVED|CHANGES_REQUESTED> [--findings <json>] [--reviewer <name>]');
    if (!values.verdict) throw new Error('Thiếu --verdict <APPROVED|CHANGES_REQUESTED>');
    let findings = [];
    if (values.findings) {
      try {
        if (existsSync(resolve(values.findings))) {
          findings = JSON.parse(readFileSync(resolve(values.findings), 'utf8'));
        } else {
          findings = JSON.parse(values.findings);
        }
      } catch {
        findings = [values.findings];
      }
    }
    const result = recordReview({
      root,
      execId: values.exec,
      taskId,
      verdict: values.verdict,
      findings,
      reviewer: values.reviewer || 'reviewer',
    });
    out(result);
    process.exit(result.ok ? 0 : 1);
  } else if (command === 'recover') {
    const [posTaskId] = positionals;
    const taskId = posTaskId || values.task;
    if (taskId) {
      const result = await recoverTask({ root, execId: values.exec, taskId });
      out(result);
      process.exit(result.ok ? 0 : 1);
    } else {
      const result = await recoverExecution({ root, execId: values.exec });
      out(result);
      process.exit(result.ok ? 0 : 1);
    }
  } else if (command === 'report') {
    const reportRes = saveExecutionReport({
      root,
      execId: values.exec,
      format: values.format,
      outputPath: values.output,
    });
    if (values.format === 'json') {
      out(reportRes.summary);
    } else {
      console.log(formatMarkdownReport(reportRes.summary));
    }
    process.exit(0);
  } else if (command === 'worktree') {
    const [taskId] = positionals;
    if (!taskId) throw new Error('Dùng: worktree <TASK> --exec <id> [--agent <name>]');
    let task = getTask(loadState(root, values.exec), taskId);
    const worktree = worktreePathFor(root, config, taskId);
    const taskBranch = `${config.git.task_branch_prefix}${taskId}`;
    const baseBranch = baseBranchFor(config, values.exec);

    // Đảm bảo nhánh tích hợp tồn tại
    if (!refExists(root, `refs/heads/${baseBranch}`)) {
      const rootBase = config.project.base_branch || 'main';
      try {
        git(root, ['branch', baseBranch, rootBase]);
      } catch (_) {}
    }

    if (!existsSync(worktree)) {
      let branchExists = false;
      try {
        git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${taskBranch}`]);
        branchExists = true;
      } catch {}

      if (branchExists) {
        if (!isAncestor(root, baseBranch, taskBranch)) {
          git(root, ['branch', '-f', taskBranch, baseBranch]);
        }
        git(root, ['worktree', 'add', worktree, taskBranch]);
      } else {
        git(root, ['worktree', 'add', worktree, '-b', taskBranch, baseBranch]);
      }
    }

    const nodeModulesResult = ensureNodeModules(root, worktree);

    // Tự động chuyển pending -> in_progress nếu task đang ở pending
    if (task.status === 'pending') {
      updateState(root, values.exec, (s) =>
        transition(s, taskId, 'in_progress', {
          agent: values.agent || 'coder',
          note: 'Worktree created via CLI',
        })
      );
      task = getTask(loadState(root, values.exec), taskId);
    }

    out({
      ok: true,
      task_id: taskId,
      status: task.status,
      worktree,
      branch: taskBranch,
      node_modules: nodeModulesResult,
      message: `Worktree ${worktree} đã sẵn sàng (trạng thái: ${task.status})${nodeModulesResult.linked ? ', đã tự động liên kết node_modules' : ''}.`,
    });
  } else {
    const state = loadState(root, values.exec);
    out({ exec_id: state.exec_id, tasks: state.tasks.map((t) => ({ id: t.id, status: t.status, attempts: t.attempts, assigned_to: t.assigned_to })), ...detectDeadlock(state) });
  }
} catch (e) {
  console.error(`Lỗi: ${e.message}`);
  process.exit(2);
}
