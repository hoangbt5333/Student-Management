// Phục hồi và độ tin cậy (Failure Handling & Recovery - giáo trình mục 8.2, 8.3).
// Dựa trên 5 nguồn sự thật:
// 1. Task State (state/<exec_id>.json)
// 2. git status của worktree
// 3. git log của task branch
// 4. Validation Evidence (logs/<exec_id>/<task_id>/<commit_short>/result.json)
// 5. Execution log & Hook audit log (logs/<exec_id>/hooks.jsonl)
//
// Tính năng:
// - Phục hồi tự động khi khởi động lại sau crash (recoverTask / recoverExecution).
// - Quản lý số vòng review (review_rounds) và giới hạn max_review_rounds -> blocked (needs_human).
// - Circuit breaker khi lỗi liên tiếp.
// - Phát hiện agent_timeout_min.
// - Retry có backoff đối với lỗi môi trường (không tính vào attempts của Coder).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.mjs';
import { loadState, updateState, transition, getTask } from './state.mjs';
import { runGate } from './validate.mjs';
import { worktreePathFor, baseBranchFor, REPORT_FILE, REVIEW_FILE } from './report.mjs';
import { ensureNodeModules } from './paths-policy.mjs';

export class RecoverError extends Error {
  constructor(message, { code = 2, detail = null } = {}) {
    super(message);
    this.name = 'RecoverError';
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

/**
 * Ghi nhận kết quả review từ Reviewer.
 * Nếu CHANGES_REQUESTED: tăng review_rounds.
 * Vượt max_review_rounds => chuyển blocked, needs_human: true.
 */
export function recordReview({
  root = process.cwd(),
  execId,
  taskId,
  verdict,
  findings = [],
  reviewer = 'reviewer',
  commit = null,
}) {
  const mainRoot = resolve(root);
  const config = loadConfig(mainRoot);

  if (!['APPROVED', 'CHANGES_REQUESTED'].includes(verdict)) {
    throw new RecoverError(`Verdict không hợp lệ: "${verdict}". Cho phép: APPROVED | CHANGES_REQUESTED`, { code: 2 });
  }

  const worktree = worktreePathFor(mainRoot, config, taskId);
  const headCommit = existsSync(worktree) ? git(worktree, ['rev-parse', 'HEAD']) : null;
  const reviewCommit = commit || headCommit;

  let result;
  updateState(mainRoot, execId, (state) => {
    const task = getTask(state, taskId);
    if (!['ready_for_review', 'in_progress'].includes(task.status)) {
      throw new RecoverError(`Không thể ghi nhận review cho ${taskId} khi ở trạng thái "${task.status}".`, { code: 1 });
    }

    const reviewLogDir = join(mainRoot, 'logs', execId, taskId, 'reviews');
    mkdirSync(reviewLogDir, { recursive: true });

    if (verdict === 'APPROVED') {
      const reviewData = {
        task_id: taskId,
        verdict: 'APPROVED',
        reviewer,
        commit: reviewCommit,
        findings,
        reviewed_at: new Date().toISOString(),
      };
      writeFileSync(join(mainRoot, 'logs', execId, taskId, 'review.json'), JSON.stringify(reviewData, null, 2) + '\n');
      if (existsSync(worktree)) {
        writeFileSync(join(worktree, REVIEW_FILE), JSON.stringify(reviewData, null, 2) + '\n');
      }
      result = {
        ok: true,
        task_id: taskId,
        verdict: 'APPROVED',
        status: task.status,
        message: `Reviewer APPROVED cho ${taskId}. Sẵn sàng tích hợp.`,
      };
    } else {
      task.review_rounds = (task.review_rounds || 0) + 1;
      const maxRounds = task.max_review_rounds || config.limits.max_review_rounds || 2;
      const roundFile = join(reviewLogDir, `round-${task.review_rounds}.json`);

      const reviewData = {
        task_id: taskId,
        verdict: 'CHANGES_REQUESTED',
        reviewer,
        commit: reviewCommit,
        round: task.review_rounds,
        max_rounds: maxRounds,
        findings,
        reviewed_at: new Date().toISOString(),
      };
      writeFileSync(roundFile, JSON.stringify(reviewData, null, 2) + '\n');
      writeFileSync(join(mainRoot, 'logs', execId, taskId, 'review.json'), JSON.stringify(reviewData, null, 2) + '\n');
      if (existsSync(worktree)) {
        writeFileSync(join(worktree, REVIEW_FILE), JSON.stringify(reviewData, null, 2) + '\n');
      }

      if (task.review_rounds >= maxRounds) {
        transition(state, taskId, 'blocked', {
          agent: reviewer,
          note: `Vượt quá ${maxRounds} vòng review (vòng ${task.review_rounds}). Cần người can thiệp.`,
          failure_kind: 'review',
        });
        result = {
          ok: true,
          task_id: taskId,
          verdict: 'CHANGES_REQUESTED',
          status: 'blocked',
          review_rounds: task.review_rounds,
          max_review_rounds: maxRounds,
          needs_human: true,
          findings,
          message: `Task ${taskId} đã vượt quá giới hạn ${maxRounds} vòng review. Chuyển sang blocked để người dùng can thiệp.`,
        };
      } else {
        transition(state, taskId, 'in_progress', {
          agent: reviewer,
          note: `Reviewer yêu cầu chỉnh sửa (vòng ${task.review_rounds}/${maxRounds}).`,
          failure_kind: 'review',
          increment_attempts: false,
        });
        result = {
          ok: true,
          task_id: taskId,
          verdict: 'CHANGES_REQUESTED',
          status: 'in_progress',
          review_rounds: task.review_rounds,
          max_review_rounds: maxRounds,
          needs_human: false,
          findings,
          message: `Reviewer yêu cầu chỉnh sửa (vòng ${task.review_rounds}/${maxRounds}). Đã chuyển về in_progress cho Coder sửa.`,
        };
      }
    }
  });

  return result;
}

/**
 * Phục hồi 1 Task đang in_progress dựa trên 5 nguồn sự thật.
 */
export async function recoverTask({ root = process.cwd(), execId, taskId }) {
  const mainRoot = resolve(root);
  const config = loadConfig(mainRoot);
  const state = loadState(mainRoot, execId);
  const task = getTask(state, taskId);

  if (task.status !== 'in_progress') {
    return {
      ok: true,
      task_id: taskId,
      status: task.status,
      action: 'none',
      message: `Task ${taskId} đang ở trạng thái "${task.status}", không cần phục hồi.`,
    };
  }

  const worktree = worktreePathFor(mainRoot, config, taskId);
  const taskBranch = `${config.git.task_branch_prefix}${taskId}`;
  const baseBranch = baseBranchFor(config, execId);

  // Nguồn 1 & 2: Kiểm tra sự tồn tại của worktree
  let worktreeRecreated = false;
  if (!existsSync(worktree)) {
    if (!refExists(mainRoot, `refs/heads/${taskBranch}`)) {
      if (!refExists(mainRoot, `refs/heads/${baseBranch}`)) {
        git(mainRoot, ['branch', baseBranch, config.project.base_branch || 'main']);
      }
      git(mainRoot, ['branch', taskBranch, baseBranch]);
    }
    git(mainRoot, ['worktree', 'add', worktree, taskBranch]);
    worktreeRecreated = true;
  }
  ensureNodeModules(mainRoot, worktree);

  // Nguồn 3: Kiểm tra uncommitted changes trong worktree
  const dirty = git(worktree, ['status', '--porcelain'])
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.endsWith(REPORT_FILE) && !l.endsWith(REVIEW_FILE));

  if (dirty.length > 0) {
    // Coder đang làm dở dang chưa commit!
    return {
      ok: true,
      task_id: taskId,
      status: 'in_progress',
      action: 'resume_in_progress',
      worktree_recreated: worktreeRecreated,
      dirty_files: dirty,
      message: `Task ${taskId} có ${dirty.length} file dở dang chưa commit trong worktree. Giữ nguyên in_progress để tiếp tục.`,
    };
  }

  // Nguồn 4: Kiểm tra commit mới so với base
  const ahead = Number(git(worktree, ['rev-list', '--count', `${baseBranch}..HEAD`]));
  if (ahead === 0) {
    // Không có thay đổi nào được tạo ra
    let resAction;
    updateState(mainRoot, execId, (s) => {
      const t = getTask(s, taskId);
      t.attempts = (t.attempts || 0) + 1;
      if (t.attempts >= (t.max_attempts || 3)) {
        transition(s, taskId, 'failed', {
          agent: 'orchestrator',
          note: `Hết lượt thử (${t.attempts}/${t.max_attempts}). Phiên dừng mà không có thay đổi nào.`,
          failure_kind: 'code',
        });
        resAction = {
          ok: false,
          task_id: taskId,
          status: 'failed',
          action: 'marked_failed',
          attempts: t.attempts,
          message: `Task ${taskId} đã hết lượt thử (${t.attempts}/${t.max_attempts}). Đánh dấu failed.`,
        };
      } else {
        transition(s, taskId, 'pending', {
          agent: 'orchestrator',
          note: `Đặt lại pending để giao lại (lượt ${t.attempts}/${t.max_attempts}) do phiên dừng không có commit.`,
        });
        resAction = {
          ok: true,
          task_id: taskId,
          status: 'pending',
          action: 'reset_to_pending',
          attempts: t.attempts,
          message: `Task ${taskId} không có commit mới. Đã đặt lại pending để giao lại (lượt ${t.attempts}/${t.max_attempts}).`,
        };
      }
    });
    return resAction;
  }

  // Nguồn 5: Có commit mới! Kiểm tra evidence của HEAD commit
  const head = git(worktree, ['rev-parse', 'HEAD']);
  const short = head.slice(0, 7);
  const evFile = join(mainRoot, 'logs', execId, taskId, short, 'result.json');

  if (existsSync(evFile)) {
    try {
      const ev = JSON.parse(readFileSync(evFile, 'utf8'));
      if (ev.status === 'READY_FOR_REVIEW' && ev.commit === head) {
        updateState(mainRoot, execId, (s) => {
          transition(s, taskId, 'ready_for_review', {
            agent: 'orchestrator',
            note: `Khôi phục từ commit ${short} có evidence hợp lệ.`,
          });
        });
        return {
          ok: true,
          task_id: taskId,
          status: 'ready_for_review',
          action: 'promoted_to_ready_for_review',
          commit: head,
          message: `Task ${taskId} có commit ${short} đã vượt qua validation. Chuyển sang ready_for_review.`,
        };
      }
    } catch {
      /* parse error, chạy lại gate */
    }
  }

  // Chưa có evidence hoặc evidence cũ => Chạy lại validation gate
  let gateResult;
  try {
    gateResult = await runGate({
      config,
      taskId,
      execId,
      worktree,
      root: mainRoot,
      base: baseBranch,
    });
  } catch (err) {
    return {
      ok: false,
      task_id: taskId,
      status: 'in_progress',
      action: 'gate_error',
      error: `Lỗi khi chạy lại validation: ${err.message}`,
    };
  }

  if (gateResult.status === 'READY_FOR_REVIEW') {
    updateState(mainRoot, execId, (s) => {
      transition(s, taskId, 'ready_for_review', {
        agent: 'orchestrator',
        note: `Chạy lại validation đạt chuẩn cho commit ${short}.`,
      });
    });
    return {
      ok: true,
      task_id: taskId,
      status: 'ready_for_review',
      action: 'validated_and_promoted',
      commit: head,
      message: `Chạy lại validation cho ${taskId} thành công. Chuyển sang ready_for_review.`,
    };
  }

  // Gate thất bại
  if (gateResult.failure_kind === 'environment') {
    // Lỗi môi trường: không phạt attempts của Coder, cho phép retry
    return {
      ok: false,
      task_id: taskId,
      status: 'in_progress',
      action: 'retry_environment',
      failure_kind: 'environment',
      message: `Task ${taskId} gặp lỗi môi trường khi chạy gate. Giữ nguyên in_progress để thử lại có backoff.`,
    };
  }

  // Lỗi do code
  let codeFailAction;
  updateState(mainRoot, execId, (s) => {
    const t = getTask(s, taskId);
    t.attempts = (t.attempts || 0) + 1;
    if (t.attempts >= (t.max_attempts || 3)) {
      transition(s, taskId, 'failed', {
        agent: 'orchestrator',
        note: `Validation thất bại (${t.attempts}/${t.max_attempts}).`,
        failure_kind: 'code',
      });
      codeFailAction = {
        ok: false,
        task_id: taskId,
        status: 'failed',
        action: 'marked_failed',
        attempts: t.attempts,
        error: `Task ${taskId} thất bại sau ${t.attempts} lần thử.`,
      };
    } else {
      transition(s, taskId, 'in_progress', {
        agent: 'orchestrator',
        note: `Validation thất bại cho commit ${short} (lượt ${t.attempts}/${t.max_attempts}).`,
        failure_kind: 'code',
        increment_attempts: false,
      });
      codeFailAction = {
        ok: false,
        task_id: taskId,
        status: 'in_progress',
        action: 'reassigned_with_failure_log',
        attempts: t.attempts,
        message: `Validation thất bại. Trả lại Coder kèm log để sửa tiếp (lượt ${t.attempts}/${t.max_attempts}).`,
      };
    }
  });

  return codeFailAction;
}

/**
 * Phục hồi toàn bộ execution sau khi Orchestrator khởi động lại.
 */
export async function recoverExecution({ root = process.cwd(), execId }) {
  const mainRoot = resolve(root);
  const config = loadConfig(mainRoot);
  const state = loadState(mainRoot, execId);

  // 1. Kiểm tra Circuit Breaker
  if (state.circuit_breaker_tripped) {
    return {
      ok: false,
      exec_id: execId,
      circuit_breaker: 'TRIPPED',
      consecutive_failures: state.consecutive_failures || 3,
      message: `Circuit breaker đang ngắt do ${state.consecutive_failures} lỗi liên tiếp. Dừng điều phối tự động.`,
    };
  }

  // 2. Thu thập các Task cần phục hồi
  const inProgress = state.tasks.filter((t) => t.status === 'in_progress');
  const results = [];

  for (const t of inProgress) {
    // Kiểm tra timeout
    if (t.started_at && config.limits.agent_timeout_min) {
      const elapsedMin = (Date.now() - new Date(t.started_at).getTime()) / (60 * 1000);
      if (elapsedMin > config.limits.agent_timeout_min) {
        // Quá thời hạn
        updateState(mainRoot, execId, (s) => {
          transition(s, t.id, 'in_progress', {
            agent: 'orchestrator',
            note: `Agent chạy quá thời hạn (${Math.round(elapsedMin)}m > ${config.limits.agent_timeout_min}m).`,
            failure_kind: 'environment',
            increment_attempts: false,
          });
        });
      }
    }

    const res = await recoverTask({ root: mainRoot, execId, taskId: t.id });
    results.push(res);
  }

  return {
    ok: true,
    exec_id: execId,
    recovered_count: results.length,
    tasks: results,
  };
}

// CLI runner
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      exec: { type: 'string' },
      root: { type: 'string', default: process.cwd() },
      task: { type: 'string' },
    },
  });

  if (!values.exec) {
    console.error('Dùng: node recover.mjs --exec <exec_id> [--task <task_id>] [--root .]');
    process.exit(2);
  }

  try {
    if (values.task) {
      const res = await recoverTask({ root: values.root, execId: values.exec, taskId: values.task });
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.ok ? 0 : 1);
    } else {
      const res = await recoverExecution({ root: values.root, execId: values.exec });
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.ok ? 0 : 1);
    }
  } catch (err) {
    console.error(`Lỗi: ${err.message}`);
    process.exit(err.code || 2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
