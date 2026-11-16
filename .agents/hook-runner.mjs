#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const hookName = process.argv[2];
if (!hookName) {
  console.error('[hook-runner] Thiếu tên hook');
  process.exit(1);
}

// Tìm script hook theo thứ tự ưu tiên:
// 1. ../orchestrator/hooks/<hook>.mjs (khi đã cài vào dự án)
// 2. ../core/orchestrator/hooks/<hook>.mjs (trong repo nguồn framework)
// 3. ./orchestrator/hooks/<hook>.mjs
const candidates = [
  resolve(import.meta.dirname, '..', 'orchestrator', 'hooks', `${hookName}.mjs`),
  resolve(import.meta.dirname, '..', 'core', 'orchestrator', 'hooks', `${hookName}.mjs`),
  resolve(import.meta.dirname, 'orchestrator', 'hooks', `${hookName}.mjs`),
];

const target = candidates.find((p) => existsSync(p));
if (!target) {
  console.error(`[hook-runner] Không tìm thấy script hook cho "${hookName}". Đã tìm trong:\n${candidates.join('\n')}`);
  process.exit(1);
}

await import(pathToFileURL(target).href);
