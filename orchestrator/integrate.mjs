// Tích hợp (Integration): script tự động merge task branch vào nhánh tích hợp (giáo trình mục 5.5).
// Nguyên tắc:
// 1. Chỉ nhận Task khi báo cáo bàn giao đạt (report-check) và Reviewer APPROVED (nếu có review).
// 2. Merge thử (dry-run) để phát hiện xung đột; nếu xung đột thì abort, chuyển in_progress và yêu cầu Coder rebase.
// 3. Merge thật theo git.merge_strategy (squash, merge, rebase) vào nhánh integration/<exec_id>.
// 4. Chạy Integration Gate (build, typecheck, lint, test) trên nhánh tích hợp. Nếu đỏ => rollback về commit tốt trước đó.
// 5. Idempotent: chạy lại trên Task đã tích hợp thì không merge đôi.
// 6. KHÔNG tự ý merge vào main hoặc push remote (cần người duyệt).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.mjs';
import { loadState, updateState, transition, getTask } from './state.mjs';
import { runGate } from './validate.mjs';
import { worktreePathFor, checkHandoff, baseBranchFor, REPORT_FILE, REVIEW_FILE } from './report.mjs';
import { unlinkNodeModules } from './paths-policy.mjs';

export class IntegrateError extends Error {
  constructor(message, { code = 2, detail = null } = {}) {
    super(message);
    this.name = 'IntegrateError';
    this.code = code;
    this.detail = detail;
  }
}

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

/**
 * Tích hợp Task vào nhánh tích hợp integration/<exec_id>.
 * Trả về { ok, task_id, status, ... }
 */
export async function integrateTask({
  root = process.cwd(),
  execId,
  taskId,
  cleanWorktree = false,
  autostash = true,
}) {
  const mainRoot = resolve(root);
  const config = loadConfig(mainRoot);
  const state = loadState(mainRoot, execId);
  let task = getTask(state, taskId);

  const integrationBranch = baseBranchFor(config, execId); // e.g. integration/EXEC-001
  const taskBranch = `${config.git.task_branch_prefix}${taskId}`; // e.g. task/TASK-001
  const baseBranch = config.project.base_branch || 'main';
  const worktree = worktreePathFor(mainRoot, config, taskId);

  // 1. Kiểm tra idempotency: Task đã hoàn thành
  if (task.status === 'completed') {
    if (refExists(mainRoot, `refs/heads/${integrationBranch}`) && refExists(mainRoot, `refs/heads/${taskBranch}`)) {
      if (isAncestor(mainRoot, taskBranch, integrationBranch)) {
        return {
          ok: true,
          task_id: taskId,
          status: 'completed',
          already_integrated: true,
          message: `Task ${taskId} đã hoàn thành và tích hợp trước đó vào ${integrationBranch}.`,
        };
      }
    }
    return {
      ok: true,
      task_id: taskId,
      status: 'completed',
      already_integrated: true,
      message: `Task ${taskId} đã ở trạng thái completed.`,
    };
  }

  // 2. Điều kiện trạng thái Task
  if (!['ready_for_review', 'in_progress'].includes(task.status)) {
    throw new IntegrateError(
      `Task ${taskId} đang ở trạng thái "${task.status}". Chỉ có thể tích hợp khi ở "ready_for_review" (hoặc "in_progress" có báo cáo bàn giao đạt).`,
      { code: 1 }
    );
  }

  // 3. Kiểm tra báo cáo bàn giao của Coder (report-check)
  const reportPath = join(worktree, REPORT_FILE);
  if (!existsSync(reportPath)) {
    throw new IntegrateError(`Không tìm thấy báo cáo bàn giao ${REPORT_FILE} tại ${worktree}.`, { code: 1 });
  }
  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch (e) {
    throw new IntegrateError(`${REPORT_FILE} không phải JSON hợp lệ: ${e.message}`, { code: 1 });
  }
  const handoff = checkHandoff({
    report,
    task,
    execId,
    config,
    mainRoot,
    worktree,
  });
  if (handoff.problems.length) {
    throw new IntegrateError(
      `Báo cáo bàn giao của ${taskId} không đạt yêu cầu:\n  - ${handoff.problems.join('\n  - ')}`,
      { code: 1, detail: handoff.problems }
    );
  }

  // Tự động chuyển in_progress -> ready_for_review nếu handoff report hợp lệ
  if (task.status === 'in_progress') {
    updateState(mainRoot, execId, (s) =>
      transition(s, taskId, 'ready_for_review', {
        agent: 'orchestrator',
        note: 'Tự động chuyển ready_for_review khi tích hợp (báo cáo bàn giao đạt)',
      })
    );
    task = getTask(loadState(mainRoot, execId), taskId);
  }

  // 3. Kiểm tra Review Gate nếu có file review
  const reviewFiles = [
    join(worktree, '.task-review.json'),
    join(mainRoot, 'logs', execId, taskId, 'review.json'),
  ];
  for (const rf of reviewFiles) {
    if (existsSync(rf)) {
      try {
        const rev = JSON.parse(readFileSync(rf, 'utf8'));
        if (rev.verdict === 'CHANGES_REQUESTED') {
          throw new IntegrateError(
            `Reviewer yêu cầu chỉnh sửa (CHANGES_REQUESTED), không thể tích hợp ${taskId}.`,
            { code: 1, detail: rev.findings || [] }
          );
        }
      } catch (e) {
        if (e instanceof IntegrateError) throw e;
      }
    }
  }

  // 4. Chuẩn bị Git trong mainRoot
  if (!refExists(mainRoot, `refs/heads/${taskBranch}`)) {
    throw new IntegrateError(`Nhánh ${taskBranch} của Task không tồn tại.`, { code: 2 });
  }

  const rootDirty = git(mainRoot, ['status', '--porcelain'])
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      const file = l.slice(3).trim();
      return (
        file !== REPORT_FILE &&
        file !== REVIEW_FILE &&
        file !== 'tasks.json' &&
        file !== 'agent-framework.lock.json' &&
        !file.startsWith('logs/') &&
        !file.startsWith('logs\\') &&
        !file.startsWith('state/') &&
        !file.startsWith('state\\') &&
        !file.startsWith('.claude/worktrees/') &&
        !file.startsWith('.claude\\worktrees\\') &&
        file !== 'logs' &&
        file !== 'state'
      );
    });

  let didStash = false;
  if (rootDirty.length > 0) {
    if (autostash) {
      try {
        git(mainRoot, ['stash', 'push', '-u', '-m', `agent-autostash-${execId}-${taskId}`]);
        didStash = true;
      } catch (err) {
        throw new IntegrateError(`Không thể autostash thay đổi trong thư mục gốc: ${err.message}`, { code: 2 });
      }
    } else {
      throw new IntegrateError(
        `Thư mục gốc ${mainRoot} còn thay đổi chưa commit, không thể chuyển nhánh để tích hợp:\n  ${rootDirty.join('\n  ')}`,
        { code: 2 }
      );
    }
  }

  try {
    // Tạo nhánh tích hợp từ base_branch nếu chưa có
    if (!refExists(mainRoot, `refs/heads/${integrationBranch}`)) {
      git(mainRoot, ['branch', integrationBranch, baseBranch]);
    }

    // Chuyển sang nhánh tích hợp
    git(mainRoot, ['checkout', integrationBranch]);
    const lastGoodCommit = git(mainRoot, ['rev-parse', 'HEAD']);

    // 5. Merge thử (Dry-run) để phát hiện xung đột
    try {
      git(mainRoot, ['merge', '--no-commit', '--no-ff', taskBranch]);
      // Thành công => abort dry-run để merge thật đúng chiến lược
      git(mainRoot, ['merge', '--abort']);
    } catch (err) {
      // Có xung đột merge!
      try {
        git(mainRoot, ['merge', '--abort']);
      } catch {
        /* bỏ qua */
      }
      const conflictMsg = `Xung đột merge giữa ${taskBranch} và ${integrationBranch}. Coder cần fetch và rebase trên worktree của mình rồi chạy lại validation.`;
      updateState(mainRoot, execId, (s) => {
        transition(s, taskId, 'in_progress', {
          agent: 'orchestrator',
          note: `Xung đột merge khi tích hợp vào ${integrationBranch}. Cần rebase.`,
        });
      });
      return {
        ok: false,
        conflict: true,
        task_id: taskId,
        status: 'in_progress',
        error: conflictMsg,
      };
    }

    // 6. Merge thật theo git.merge_strategy
    const strategy = config.git.merge_strategy || 'squash';
    try {
      if (strategy === 'squash') {
        git(mainRoot, ['merge', '--squash', taskBranch]);
        git(mainRoot, ['commit', '-m', `integrate(${taskId}): merge into ${integrationBranch}`]);
      } else if (strategy === 'merge') {
        git(mainRoot, ['merge', '--no-ff', taskBranch, '-m', `integrate(${taskId}): merge into ${integrationBranch}`]);
      } else if (strategy === 'rebase') {
        git(mainRoot, ['merge', '--ff-only', taskBranch]);
      } else {
        throw new Error(`merge_strategy không hỗ trợ: ${strategy}`);
      }
    } catch (mergeErr) {
      // Merge thật thất bại
      try {
        git(mainRoot, ['reset', '--hard', lastGoodCommit]);
      } catch {
        /* bỏ qua */
      }
      throw new IntegrateError(`Lỗi khi thực hiện merge thật: ${mergeErr.message}`, { code: 2 });
    }

    const mergedCommit = git(mainRoot, ['rev-parse', 'HEAD']);

    // 7. Chạy Integration Gate trên nhánh tích hợp
    let gateResult;
    try {
      gateResult = await runGate({
        config,
        taskId,
        execId,
        worktree: mainRoot,
        root: mainRoot,
        base: lastGoodCommit,
      });
    } catch (gateErr) {
      // Lỗi khi chạy lệnh gate => rollback
      git(mainRoot, ['reset', '--hard', lastGoodCommit]);
      throw new IntegrateError(`Không thể chạy Integration Gate: ${gateErr.message}`, { code: 2 });
    }

    // Nếu Integration Gate thất bại: Rollback về lastGoodCommit!
    if (gateResult.status !== 'READY_FOR_REVIEW') {
      git(mainRoot, ['reset', '--hard', lastGoodCommit]);
      const failedChecks = (gateResult.checks || [])
        .filter((c) => c.required && !c.passed)
        .map((c) => `${c.name} (exit ${c.exit_code})`)
        .join(', ');

      updateState(mainRoot, execId, (s) => {
        transition(s, taskId, 'in_progress', {
          agent: 'orchestrator',
          note: `Integration Gate thất bại (${failedChecks}). Đã rollback về ${lastGoodCommit.slice(0, 7)}.`,
        });
      });

      return {
        ok: false,
        gate_failed: true,
        task_id: taskId,
        status: 'in_progress',
        rollback_to: lastGoodCommit,
        checks: gateResult.checks,
        error: `Integration Gate thất bại trên ${integrationBranch} (${failedChecks}). Đã rollback về ${lastGoodCommit.slice(0, 7)}.`,
      };
    }

    // 8. Integration Gate thành công => Cập nhật Task sang completed!
    updateState(mainRoot, execId, (s) => {
      transition(s, taskId, 'completed', {
        agent: 'orchestrator',
        note: `Tích hợp thành công vào ${integrationBranch} (${mergedCommit.slice(0, 7)})`,
      });
    });

    // 9. Dọn dẹp worktree nếu được yêu cầu
    if (cleanWorktree && existsSync(worktree)) {
      try {
        unlinkNodeModules(worktree);
        git(mainRoot, ['worktree', 'remove', '--force', worktree]);
      } catch {
        try {
          git(mainRoot, ['worktree', 'prune']);
        } catch {}
      }
    }

    return {
      ok: true,
      task_id: taskId,
      status: 'completed',
      integration_branch: integrationBranch,
      merge_commit: mergedCommit,
      rollback_target: lastGoodCommit,
      strategy,
      checks: gateResult.checks,
    };
  } finally {
    if (didStash) {
      try {
        git(mainRoot, ['stash', 'pop']);
      } catch (err) {
        console.warn(`[integrate] Cảnh báo: không thể pop stash tự động: ${err.message}`);
      }
    }
  }
}

// CLI runner khi gọi trực tiếp
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      exec: { type: 'string' },
      root: { type: 'string', default: process.cwd() },
      'clean-worktree': { type: 'boolean', default: false },
      autostash: { type: 'boolean', default: true },
    },
  });

  const [taskId] = positionals;
  if (!taskId || !values.exec) {
    console.error('Dùng: node integrate.mjs <TASK> --exec <exec_id> [--root .] [--clean-worktree] [--no-autostash]');
    process.exit(2);
  }

  try {
    const result = await integrateTask({
      root: values.root,
      execId: values.exec,
      taskId,
      cleanWorktree: values['clean-worktree'],
      autostash: values.autostash,
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.error(`Lỗi: ${err.message}`);
    process.exit(err.code || 2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
