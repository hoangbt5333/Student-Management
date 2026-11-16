// Nạp và kiểm tra project.config.json. Đây là NƠI DUY NHẤT đọc file cấu hình dự án.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './schema-lite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const CONFIG_FILE = 'project.config.json';
export const SCHEMA_PATH = join(here, '..', 'schemas', 'project.config.schema.json');

export const DEFAULTS = {
  git: {
    task_branch_prefix: 'task/',
    integration_branch_prefix: 'integration/',
    worktree_dir: '../wt',
    merge_strategy: 'squash',
  },
  limits: {
    max_parallel: 3,
    max_attempts: 3,
    max_review_rounds: 2,
    agent_timeout_min: 30,
    circuit_breaker_failures: 3,
  },
  ownership: { shared_files: [] },
  security: { deny_read: [], require_human_approval: ['push', 'merge_to_base', 'delete_branch'] },
  models: {},
  // agent_type của các Agent phải nộp báo cáo bàn giao khi kết thúc (SubagentStop)
  handoff: { agent_types: ['coder', 'coding-agent'] },
};

export class ConfigError extends Error {
  constructor(message, errors = []) {
    super(errors.length ? `${message}\n  - ${errors.join('\n  - ')}` : message);
    this.name = 'ConfigError';
    this.errors = errors;
  }
}

/** Đọc + validate + áp mặc định. Sai schema thì ném ConfigError (dừng, không chạy tiếp). */
export function loadConfig(root = process.cwd()) {
  const file = join(root, CONFIG_FILE);
  if (!existsSync(file)) throw new ConfigError(`Không thấy ${file}`);
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new ConfigError(`${file} không phải JSON hợp lệ: ${e.message}`);
  }
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const errors = validate(raw, schema);
  if (errors.length) throw new ConfigError(`${CONFIG_FILE} sai schema:`, errors);

  const config = { ...raw };
  for (const [section, defaults] of Object.entries(DEFAULTS)) {
    config[section] = { ...defaults, ...(raw[section] ?? {}) };
  }
  return config;
}
