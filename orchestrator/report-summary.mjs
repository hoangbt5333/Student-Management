// Tổng hợp báo cáo phiên thực thi (Execution Summary Report - giáo trình mục 8.3 & Observability).
// Đọc dữ liệu từ 2 nguồn:
// 1. Task State: state/<exec_id>.json
// 2. Hook Audit Log: logs/<exec_id>/hooks.jsonl
//
// Xuất báo cáo cấu trúc JSON hoặc Markdown, che giấu bí mật (redact),
// phân loại lỗi, đếm số vòng review, can thiệp thủ công và trạng thái Jira MCP.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadState, statePath } from './state.mjs';
import { redact, logFileFor, logHook } from './hooks/hook-log.mjs';

/**
 * Đọc và parse file logs/<exec_id>/hooks.jsonl
 */
export function parseHooksLog(root, execId) {
  const file = logFileFor(root, execId);
  if (!existsSync(file)) return [];
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // bỏ qua dòng hỏng
    }
  }
  return events;
}

/**
 * Ghi nhận sự kiện Jira bị bỏ qua (fail-open) khi không có MCP
 */
export function logJiraSkipped(root, execId, { ticketId = null, reason = 'Jira MCP not configured' } = {}) {
  logHook(root, execId, {
    event: 'jira_skipped',
    ticket_id: ticketId,
    reason: redact(reason),
    status: 'skipped_fail_open',
  });
}

/**
 * Trích xuất và tổng hợp toàn bộ dữ liệu chỉ số của phiên chạy
 */
export function generateExecutionSummary({ root = process.cwd(), execId }) {
  const mainRoot = resolve(root);
  const state = loadState(mainRoot, execId);
  const hookEvents = parseHooksLog(mainRoot, execId);

  // 1. Phân loại trạng thái Task
  const counts = {
    total: state.tasks.length,
    completed: 0,
    failed: 0,
    blocked: 0,
    in_progress: 0,
    pending: 0,
  };

  let totalAttempts = 0;
  let totalReviewRounds = 0;
  const failuresByKind = { code: 0, environment: 0, review: 0, other: 0 };

  for (const t of state.tasks) {
    if (counts[t.status] !== undefined) counts[t.status]++;
    totalAttempts += (t.attempts || 0);
    totalReviewRounds += (t.review_rounds || 0);
  }

  // Phân tích lịch sử chuyển trạng thái
  for (const h of state.history || []) {
    if (h.failure_kind) {
      if (failuresByKind[h.failure_kind] !== undefined) {
        failuresByKind[h.failure_kind]++;
      } else {
        failuresByKind.other++;
      }
    }
  }

  // 2. Phân tích sự kiện Hook & Bảo mật
  const guardDenials = [];
  let jiraSkippedCount = 0;
  let jiraSyncedCount = 0;

  for (const ev of hookEvents) {
    if (ev.event === 'guard_denied') {
      guardDenials.push({
        ts: ev.ts,
        task_id: ev.task_id,
        hook: ev.hook,
        tool: ev.tool,
        reason: redact(ev.reason || ''),
        target: redact(ev.target || ''),
      });
    } else if (ev.event === 'jira_skipped') {
      jiraSkippedCount++;
    } else if (ev.event === 'jira_synced') {
      jiraSyncedCount++;
    }
  }

  // 3. Thời gian và Tiến độ
  const createdAt = state.created_at || null;
  const updatedAt = state.updated_at || null;
  let durationSeconds = null;
  if (createdAt && updatedAt) {
    durationSeconds = Math.max(0, Math.round((new Date(updatedAt).getTime() - new Date(createdAt).getTime()) / 1000));
  }

  // Trạng thái tổng thể
  let overallStatus = 'IN_PROGRESS';
  if (counts.completed === counts.total && counts.total > 0) {
    overallStatus = 'COMPLETED';
  } else if (state.circuit_breaker_tripped) {
    overallStatus = 'CIRCUIT_BREAKER_TRIPPED';
  } else if (counts.blocked > 0) {
    overallStatus = 'NEEDS_HUMAN_ATTENTION';
  } else if (counts.failed > 0 && counts.in_progress === 0 && counts.pending === 0) {
    overallStatus = 'FAILED';
  }

  // Trạng thái Jira
  let jiraStatus = 'Không sử dụng';
  if (jiraSyncedCount > 0) {
    jiraStatus = `Đã đồng bộ (${jiraSyncedCount} lần)`;
  } else if (jiraSkippedCount > 0) {
    jiraStatus = `Bỏ qua (Jira MCP không cấu hình - fail-open, ${jiraSkippedCount} lần)`;
  }

  return {
    exec_id: execId,
    overall_status: overallStatus,
    created_at: createdAt,
    updated_at: updatedAt,
    duration_s: durationSeconds,
    circuit_breaker_tripped: !!state.circuit_breaker_tripped,
    consecutive_failures: state.consecutive_failures || 0,
    counts,
    completion_rate_pct: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
    quality_and_reviews: {
      total_attempts: totalAttempts,
      total_review_rounds: totalReviewRounds,
      failures_by_kind: failuresByKind,
    },
    manual_intervention: {
      blocked_count: counts.blocked,
      circuit_breaker_tripped: !!state.circuit_breaker_tripped,
      needs_human: counts.blocked > 0 || !!state.circuit_breaker_tripped,
    },
    audit_events: {
      total_hook_events: hookEvents.length,
      guard_denied_count: guardDenials.length,
      denials: guardDenials,
    },
    jira_integration: {
      status: jiraStatus,
      synced_count: jiraSyncedCount,
      skipped_count: jiraSkippedCount,
    },
    token_usage: 'Nguồn dữ liệu không khả dụng từ CLI',
    tasks: state.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assigned_to: t.assigned_to,
      attempts: t.attempts || 0,
      max_attempts: t.max_attempts || 3,
      review_rounds: t.review_rounds || 0,
      max_review_rounds: t.max_review_rounds || 2,
      last_failure_kind: t.last_failure_kind || null,
      started_at: t.started_at,
      finished_at: t.finished_at,
    })),
  };
}

/**
 * Định dạng dữ liệu tổng kết thành báo cáo Markdown chuẩn GitHub Flavored
 */
export function formatMarkdownReport(summary) {
  const lines = [];

  lines.push(`# Báo cáo Tổng kết Phiên Thực thi: ${summary.exec_id}`);
  lines.push('');
  lines.push(`- **Trạng thái tổng thể:** \`${summary.overall_status}\``);
  lines.push(`- **Thời điểm khởi tạo:** ${summary.created_at || 'N/A'}`);
  lines.push(`- **Thời điểm cập nhật:** ${summary.updated_at || 'N/A'}`);
  lines.push(`- **Thời gian thực thi:** ${summary.duration_s !== null ? `${summary.duration_s} giây` : 'N/A'}`);
  lines.push('');

  lines.push('## 1. Tổng quan Tiến độ (Progress Overview)');
  lines.push('');
  lines.push('| Chỉ số | Giá trị |');
  lines.push('| :--- | :--- |');
  lines.push(`| Tổng số Task | ${summary.counts.total} |`);
  lines.push(`| Hoàn thành (\`completed\`) | ${summary.counts.completed} |`);
  lines.push(`| Thất bại (\`failed\`) | ${summary.counts.failed} |`);
  lines.push(`| Đang bị chặn (\`blocked\`) | ${summary.counts.blocked} |`);
  lines.push(`| Đang thực thi (\`in_progress\`) | ${summary.counts.in_progress} |`);
  lines.push(`| Chờ thực thi (\`pending\`) | ${summary.counts.pending} |`);
  lines.push(`| Tỷ lệ hoàn thành | **${summary.completion_rate_pct}%** |`);
  lines.push('');

  lines.push('## 2. Chi tiết từng Task');
  lines.push('');
  lines.push('| Task ID | Tiêu đề | Trạng thái | Lần thử (Attempts) | Vòng Review | Giao cho | Lỗi gần nhất |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const t of summary.tasks) {
    lines.push(
      `| \`${t.id}\` | ${t.title} | \`${t.status}\` | ${t.attempts}/${t.max_attempts} | ${t.review_rounds}/${t.max_review_rounds} | ${t.assigned_to || '-'} | ${t.last_failure_kind || '-'} |`
    );
  }
  lines.push('');

  lines.push('## 3. Chất lượng & Độ tin cậy (Quality & Reliability)');
  lines.push('');
  lines.push(`- **Tổng số vòng Review:** ${summary.quality_and_reviews.total_review_rounds}`);
  lines.push(`- **Tổng số lượt thử (Attempts):** ${summary.quality_and_reviews.total_attempts}`);
  lines.push('- **Phân loại thất bại:**');
  lines.push(`  - Lỗi Code / Unit Test (\`code\`): ${summary.quality_and_reviews.failures_by_kind.code}`);
  lines.push(`  - Lỗi Môi trường / Timeout (\`environment\`): ${summary.quality_and_reviews.failures_by_kind.environment}`);
  lines.push(`  - Yêu cầu sửa đổi từ Review (\`review\`): ${summary.quality_and_reviews.failures_by_kind.review}`);
  lines.push(`- **Circuit Breaker:** ${summary.circuit_breaker_tripped ? '⚠️ **TRIPPED** (Đã ngắt do nhiều lỗi liên tiếp)' : '✅ NORMAL (Bình thường)'}`);
  lines.push(`- **Can thiệp thủ công (Needs Human):** ${summary.manual_intervention.needs_human ? `⚠️ **CẦN CAN THIỆP** (${summary.manual_intervention.blocked_count} task blocked)` : '✅ Không cần'}`);
  lines.push('');

  lines.push('## 4. Nhật ký Giám sát & An toàn (Audit & Security)');
  lines.push('');
  lines.push(`- **Tổng số sự kiện Hook đã ghi nhận:** ${summary.audit_events.total_hook_events}`);
  lines.push(`- **Số lần vi phạm bị chặn (\`guard_denied\`):** ${summary.audit_events.guard_denied_count}`);
  if (summary.audit_events.denials.length > 0) {
    lines.push('');
    lines.push('| Thời gian | Task | Hook | Công cụ | Mục tiêu | Lý do chặn |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const d of summary.audit_events.denials.slice(0, 15)) {
      lines.push(`| ${d.ts} | ${d.task_id || '-'} | \`${d.hook}\` | \`${d.tool}\` | \`${d.target}\` | ${d.reason} |`);
    }
    if (summary.audit_events.denials.length > 15) {
      lines.push(`| ... | ... | ... | ... | ... | Còn ${summary.audit_events.denials.length - 15} sự kiện nữa... |`);
    }
  }
  lines.push('');

  lines.push('## 5. Tích hợp Ngoại vi & Tài nguyên');
  lines.push('');
  lines.push(`- **Jira MCP:** ${summary.jira_integration.status}`);
  lines.push(`- **Token Usage / Chi phí:** ${summary.token_usage}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Lưu hoặc hiển thị báo cáo
 */
export function saveExecutionReport({
  root = process.cwd(),
  execId,
  format = 'markdown',
  outputPath = null,
}) {
  const summary = generateExecutionSummary({ root, execId });
  const content = format === 'json' ? JSON.stringify(summary, null, 2) : formatMarkdownReport(summary);

  const dest = outputPath || join(root, 'logs', execId, format === 'json' ? 'summary.json' : 'summary.md');
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, content + '\n', 'utf8');

  return {
    ok: true,
    exec_id: execId,
    format,
    path: dest,
    summary,
  };
}

// CLI runner
async function main() {
  const { values } = parseArgs({
    options: {
      exec: { type: 'string' },
      root: { type: 'string', default: process.cwd() },
      format: { type: 'string', default: 'markdown' },
      output: { type: 'string' },
    },
  });

  if (!values.exec) {
    console.error('Dùng: node report-summary.mjs --exec <exec_id> [--format markdown|json] [--output <path>]');
    process.exit(2);
  }

  try {
    const res = saveExecutionReport({
      root: values.root,
      execId: values.exec,
      format: values.format,
      outputPath: values.output,
    });
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(`Lỗi: ${err.message}`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
