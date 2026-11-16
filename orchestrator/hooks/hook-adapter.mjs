// Adapter chuẩn hóa giao tiếp giữa Claude Code CLI và Google Antigravity (AGY).
// Cho phép các hook (guard-bash, guard-edit, guard-handoff, log-event) chạy song song trên cả 2 nền tảng.

export function parseHookInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('payload không phải object hợp lệ');
  }

  // Nhận diện Antigravity qua các trường đặc thù
  const isAntigravity = Boolean(
    rawInput.toolCall ||
    rawInput.workspacePaths ||
    rawInput.conversationId ||
    rawInput.terminationReason
  );

  let toolName = null;
  let command = null;
  let filePath = null;
  let cwd = rawInput.cwd || process.cwd();
  let root = process.env.CLAUDE_PROJECT_DIR || null;
  let agentType = rawInput.agent_type || null;
  let eventName = rawInput.hook_event_name || null;
  let toolUseId = rawInput.tool_use_id || null;
  let sessionId = rawInput.session_id || rawInput.conversationId || null;
  let stopHookActive = Boolean(rawInput.stop_hook_active);

  if (isAntigravity) {
    if (Array.isArray(rawInput.workspacePaths) && rawInput.workspacePaths.length > 0) {
      root = rawInput.workspacePaths[0];
    }
    if (rawInput.toolCall) {
      toolName = rawInput.toolCall.name;
      const args = rawInput.toolCall.args || {};
      command = typeof args.CommandLine === 'string' ? args.CommandLine : (typeof args.command === 'string' ? args.command : null);
      filePath = args.Path ?? args.path ?? args.file_path ?? null;
    }
    if (rawInput.terminationReason) {
      eventName = 'Stop';
    }
  } else {
    toolName = rawInput.tool_name ?? null;
    const ti = rawInput.tool_input || {};
    command = typeof ti.command === 'string' ? ti.command : null;
    filePath = ti.file_path ?? ti.notebook_path ?? ti.path ?? null;
  }

  return {
    isAntigravity,
    rawInput,
    toolName,
    command,
    filePath,
    cwd,
    root,
    agentType,
    eventName,
    toolUseId,
    sessionId,
    stopHookActive,
  };
}

/** Phản hồi kết quả cho PreToolUse */
export function respondPreTool({ isAntigravity, allow, reason }) {
  if (isAntigravity) {
    if (allow) {
      console.log(JSON.stringify({ decision: 'allow' }));
    } else {
      console.log(JSON.stringify({ decision: 'deny', reason: reason || 'Bị chặn bởi hook bảo vệ' }));
    }
    process.exit(0);
  } else {
    if (allow) {
      process.exit(0);
    } else {
      console.error(reason || 'Bị chặn bởi hook bảo vệ');
      process.exit(2);
    }
  }
}

/** Phản hồi kết quả cho Stop */
export function respondStop({ isAntigravity, allow, reason, retryExhausted = false }) {
  if (isAntigravity) {
    if (allow || retryExhausted) {
      console.log(JSON.stringify({}));
    } else {
      console.log(JSON.stringify({ decision: 'continue', reason: reason || 'Chưa thể kết thúc.' }));
    }
    process.exit(0);
  } else {
    if (allow || retryExhausted) {
      process.exit(0);
    } else {
      console.error(reason || 'Chưa thể kết thúc.');
      process.exit(2);
    }
  }
}

/** Phản hồi kết quả cho PostToolUse */
export function respondPostTool({ isAntigravity }) {
  if (isAntigravity) {
    console.log(JSON.stringify({}));
  }
  process.exit(0);
}
