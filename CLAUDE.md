# CLAUDE.md - Student Management System

Tài liệu hướng dẫn ngữ cảnh, quy chuẩn kiến trúc và quy trình làm việc cho Claude Code trong dự án **Student Management System**.

---

## 1. Tổng quan dự án

- `npm start` — start the Angular dev server at `http://localhost:4200`.
- `npm run build` — production build, including the configured server/SSR output.
- `npm run watch` — rebuild continuously in development configuration.
- `npm run test:ci` — canonical test command; runs non-watch mode, outputs to console and writes JSON report to `artifacts/test-results.json`.
  - Specific file: `npm run test:ci -- --include='<path-to-spec>'`
- `npm run serve:ssr:user-management` — serve the previously built SSR app (default port 4000; configurable with `PORT`).

The app expects a mock REST API on port 3001. Services currently use hard-coded `http://localhost:3001` URLs.

Chạy các lệnh từ thư mục gốc của repository:

This is an Angular 22 standalone application.
- Data-access pattern: `Component → Facade → NgRx Signal Store → Service → REST API`.
- Stores own feature state and asynchronous operations; computed signals derive view data.
- Facades expose state and operations to components.
- State management uses `@ngrx/signals`.
- UI uses Angular Standalone Components, Signal-based reactivity, and control flow (`@if`, `@for`).

## Subagents Workflow (MANDATORY)

The primary Claude Code session operates EXCLUSIVELY as the **Lead Orchestrator**:
- **STRICT PROHIBITION**: The Lead Orchestrator MUST NEVER create, edit, or modify source code directly in the primary session.
- ALL implementation tasks, feature requests, bug fixes, and utility creations—regardless of size—MUST be delegated to the specialized subagents in `.claude/agents/`:

1. **`architect`**: Analyzes the codebase and proposes a concise technical implementation plan including the targeted test spec file.
2. **User Confirmation**: Present the plan to the user for quick approval before implementing.
3. **`coder`**: Implements code in its worktree, runs the TARGETED test (`npm run test:ci -- --include='<spec-file>'`), confirms `artifacts/test-results.json` passes, commits changes, and reports branch name. Coder must NEVER run the full project test suite.
4. **Lead Merge & Verification**:
   - Lead MUST NOT run test commands inside Coder's worktree.
   - Lead immediately merges Coder's branch into main (`git merge <branch> --no-edit`).
   - On main, Lead verifies `artifacts/test-results.json` or runs `npm run test:ci -- --include='...'` once if needed.
5. **`reviewer`**: Inspects the merged commit (`git diff HEAD~1`) and verifies `artifacts/test-results.json` as objective evidence.
6. **`release-agent`**: Compiles the PR description and updates Jira if applicable.
