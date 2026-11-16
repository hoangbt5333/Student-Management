// Quản lý state Task ngoài hội thoại: ghi nguyên tử, khóa file, vòng đời Task, DAG.
import {
  mkdirSync, openSync, closeSync, writeSync, fsyncSync, renameSync,
  readFileSync, existsSync, unlinkSync, statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { ownedOverlap } from './ownership.mjs';

export const STATUSES = ['pending', 'blocked', 'in_progress', 'ready_for_review', 'completed', 'failed'];

// Theo vòng đời ở giáo trình (mục 3.4), cộng thêm in_progress -> pending
// để phục hồi sau khi phiên bị ngắt (mục 8.3: "đặt lại pending và tăng attempts").
export const TRANSITIONS = {
  pending: ['in_progress', 'blocked'],
  blocked: ['pending', 'in_progress'],
  in_progress: ['ready_for_review', 'failed', 'pending', 'blocked'],
  ready_for_review: ['completed', 'in_progress', 'blocked'],
  completed: [],
  failed: ['pending'],
};

export class StateError extends Error {
  constructor(message) { super(message); this.name = 'StateError'; }
}

export const statePath = (root, execId) => join(root, 'state', `${execId}.json`);

/** Ghi file tạm rồi đổi tên: bị ngắt giữa chừng thì file cũ vẫn nguyên vẹn. */
export function writeAtomic(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(tmp, 'w');
  try {
    writeSync(fd, JSON.stringify(data, null, 2) + '\n');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, file);
}

export function loadState(root, execId) {
  const file = statePath(root, execId);
  if (!existsSync(file)) throw new StateError(`Không có state cho ${execId} (${file})`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function saveState(root, state) {
  state.updated_at = new Date().toISOString();
  writeAtomic(statePath(root, state.exec_id), state);
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Khóa đơn giản bằng file (O_EXCL). Khóa cũ hơn staleMs coi là của tiến trình đã chết. */
export function withLock(file, fn, { retries = 50, delayMs = 100, staleMs = 60_000 } = {}) {
  const lock = `${file}.lock`;
  mkdirSync(dirname(lock), { recursive: true });
  let fd = null;
  for (let i = 0; i <= retries; i++) {
    try {
      fd = openSync(lock, 'wx');
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        if (Date.now() - statSync(lock).mtimeMs > staleMs) { unlinkSync(lock); continue; }
      } catch { /* khóa vừa được nhả, thử lại */ }
      sleep(delayMs);
    }
  }
  if (fd === null) throw new StateError(`Không lấy được khóa ${lock}`);
  try {
    writeSync(fd, String(process.pid));
    return fn();
  } finally {
    closeSync(fd);
    try { unlinkSync(lock); } catch { /* đã bị dọn */ }
  }
}

/** Đọc - sửa - ghi dưới khóa. mutator(state) sửa trực tiếp state. */
export function updateState(root, execId, mutator) {
  return withLock(statePath(root, execId), () => {
    const state = loadState(root, execId);
    mutator(state);
    saveState(root, state);
    return state;
  });
}

/** Kiểm tra DAG: id duy nhất, dependency tồn tại, không chu trình. Trả về { errors, order }. */
export function validateDag(tasks) {
  const errors = [];
  const ids = new Set();
  for (const t of tasks) {
    if (!t.id || typeof t.id !== 'string') { errors.push('Có Task thiếu id'); continue; }
    if (ids.has(t.id)) errors.push(`Trùng id: ${t.id}`);
    ids.add(t.id);
  }
  for (const t of tasks) {
    for (const d of t.depends_on ?? []) {
      if (d === t.id) errors.push(`${t.id} phụ thuộc chính nó`);
      else if (!ids.has(d)) errors.push(`${t.id} phụ thuộc Task không tồn tại: ${d}`);
    }
  }
  if (errors.length) return { errors, order: [] };

  // Kahn: topological sort, phần còn lại chưa xử lý được là chu trình
  const indeg = new Map(tasks.map((t) => [t.id, (t.depends_on ?? []).length]));
  const queue = tasks.filter((t) => indeg.get(t.id) === 0).map((t) => t.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const t of tasks) {
      if ((t.depends_on ?? []).includes(id)) {
        indeg.set(t.id, indeg.get(t.id) - 1);
        if (indeg.get(t.id) === 0) queue.push(t.id);
      }
    }
  }
  if (order.length !== tasks.length) {
    const stuck = tasks.filter((t) => !order.includes(t.id)).map((t) => t.id);
    errors.push(`Có chu trình giữa các Task: ${stuck.join(', ')}`);
  }
  return { errors, order };
}

/** Tạo state mới từ danh sách Task của Architect. Ném StateError nếu DAG sai. */
export function createState({ execId, tasks, maxAttempts = 3, maxReviewRounds = 2 }) {
  const { errors } = validateDag(tasks);
  if (errors.length) throw new StateError(`DAG không hợp lệ:\n  - ${errors.join('\n  - ')}`);
  const now = new Date().toISOString();
  return {
    exec_id: execId,
    created_at: now,
    updated_at: now,
    consecutive_failures: 0,
    circuit_breaker_tripped: false,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title ?? t.id,
      description: t.description ?? '',
      depends_on: t.depends_on ?? [],
      owned_files: t.owned_files ?? [],
      acceptance_criteria: t.acceptance_criteria ?? [],
      assigned_to: null,
      status: 'pending',
      attempts: 0,
      max_attempts: t.max_attempts ?? maxAttempts,
      review_rounds: 0,
      max_review_rounds: t.max_review_rounds ?? maxReviewRounds,
      last_failure_kind: null,
      started_at: null,
      finished_at: null,
    })),
    history: [],
  };
}

export function getTask(state, taskId) {
  const t = state.tasks.find((x) => x.id === taskId);
  if (!t) throw new StateError(`Không có Task ${taskId}`);
  return t;
}

/** Đổi trạng thái Task theo bảng TRANSITIONS. Chỉ Orchestrator nên gọi hàm này. */
export function transition(state, taskId, to, { agent, note, failure_kind, increment_attempts = true } = {}) {
  const task = getTask(state, taskId);
  const from = task.status;
  if (!STATUSES.includes(to)) throw new StateError(`Trạng thái không hợp lệ: ${to}`);
  if (!TRANSITIONS[from].includes(to)) {
    throw new StateError(`${taskId}: không được chuyển ${from} -> ${to} (cho phép: ${TRANSITIONS[from].join(', ') || 'không'})`);
  }
  const now = new Date().toISOString();

  if (failure_kind) task.last_failure_kind = failure_kind;

  if (to === 'in_progress') {
    const notDone = task.depends_on.filter((d) => getTask(state, d).status !== 'completed');
    if (notDone.length) throw new StateError(`${taskId}: dependency chưa completed: ${notDone.join(', ')}`);
    if (increment_attempts) {
      if (task.attempts >= task.max_attempts) throw new StateError(`${taskId}: đã hết ${task.max_attempts} lần thử, hãy đánh dấu failed`);
      task.attempts += 1;
    }
    task.started_at = now;
    task.finished_at = null;
    if (agent) task.assigned_to = agent;
  }
  if (to === 'pending') task.assigned_to = null;
  if (to === 'completed' || to === 'failed') task.finished_at = now;

  if (to === 'failed') {
    state.consecutive_failures = (state.consecutive_failures || 0) + 1;
    if (state.consecutive_failures >= 3) {
      state.circuit_breaker_tripped = true;
    }
  } else if (to === 'completed') {
    state.consecutive_failures = 0;
  }

  task.status = to;
  state.history.push({
    ts: now,
    task_id: taskId,
    from,
    to,
    agent: agent ?? null,
    note: note ?? null,
    failure_kind: failure_kind ?? null,
  });
  return task;
}

const depsDone = (state, task) => task.depends_on.every((d) => getTask(state, d).status === 'completed');

/**
 * Task pending đã đủ dependency, tối đa theo số chỗ trống (max_parallel - đang chạy).
 * Loại Task trùng owned_files với Task đang in_progress / ready_for_review (chưa completed)
 * hoặc với Task khác vừa được chọn trong cùng lượt.
 */
export function readyTasks(state, maxParallel) {
  if (state.circuit_breaker_tripped) return [];
  const running = state.tasks.filter((t) => t.status === 'in_progress').length;
  const slots = Math.max(0, maxParallel - running);
  const holding = state.tasks.filter((t) => t.status === 'in_progress' || t.status === 'ready_for_review');
  const chosen = [];
  for (const t of state.tasks) {
    if (chosen.length >= slots) break;
    if (t.status !== 'pending' || !depsDone(state, t)) continue;
    const clash = [...holding, ...chosen].some((o) => ownedOverlap(t.owned_files, o.owned_files).length);
    if (!clash) chosen.push(t);
  }
  return chosen;
}

/**
 * Deadlock: còn Task chưa xong nhưng không Task nào sẵn sàng, không Task nào đang chạy
 * hay chờ review. Trả về { deadlock, stuck: [{id, reason}] }.
 */
export function detectDeadlock(state) {
  if (state.circuit_breaker_tripped) {
    return {
      deadlock: true,
      circuit_breaker: true,
      stuck: [{ id: 'CIRCUIT_BREAKER', reason: `Circuit breaker ngắt do ${state.consecutive_failures || 3} lỗi liên tiếp` }],
    };
  }
  const open = state.tasks.filter((t) => t.status === 'pending' || t.status === 'blocked');
  if (!open.length) return { deadlock: false, stuck: [] };
  const active = state.tasks.some((t) => t.status === 'in_progress' || t.status === 'ready_for_review');
  const anyReady = open.some((t) => t.status === 'pending' && depsDone(state, t));
  if (active || anyReady) return { deadlock: false, stuck: [] };
  const stuck = open.map((t) => {
    const waiting = t.depends_on.filter((d) => getTask(state, d).status !== 'completed');
    const reason = t.status === 'blocked'
      ? 'đang blocked, cần can thiệp'
      : `chờ ${waiting.map((d) => `${d}(${getTask(state, d).status})`).join(', ')}`;
    return { id: t.id, reason };
  });
  return { deadlock: true, stuck };
}
