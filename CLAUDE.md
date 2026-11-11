# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Common commands

Run commands from the repository root:

- `npm start` — start the Angular dev server at `http://localhost:4200`.
- `npm run build` — production build, including the configured server/SSR output.
- `npm run watch` — rebuild continuously in development configuration.
- `npm test` — run the Angular CLI unit-test builder (Vitest). On Windows, ALWAYS append `--watch=false` to exit cleanly: `cmd /c "npm test -- --include='<path-to-spec>' --watch=false"`.
- `npm run test:ci` — run all unit tests once without watch mode.
- `npm run serve:ssr:user-management` — serve the previously built SSR app (default port 4000; configurable with `PORT`).

The app expects a mock REST API on port 3001. Services currently use hard-coded `http://localhost:3001` URLs.

## Architecture

This is an Angular 22 standalone application.
- Data-access pattern: `Component → Facade → NgRx Signal Store → Service → REST API`.
- Stores own feature state and asynchronous operations; computed signals derive view data.
- Facades expose state and operations to components.
- State management uses `@ngrx/signals`.
- UI uses Angular Standalone Components, Signal-based reactivity, and control flow (`@if`, `@for`).

## Subagents Workflow

When handling tickets or features, the primary Claude Code session operates as the **Lead Orchestrator**:

1. **`architect`**: Analyzes the codebase and proposes a concise technical implementation plan.
2. **User Confirmation**: Present the plan to the user for quick approval before implementing.
3. **`coder`**: Implements code in its worktree, runs tests (`--watch=false`), commits changes, and reports branch name.
4. **Lead Merge & Verify**: Lead merges Coder's branch (`git merge <branch> --no-edit`). If Coder could not run tests due to subagent environment limits, Lead runs the test on the merged workspace.
5. **`reviewer`**: Inspects the merged commit (`git diff HEAD~1`) for architectural compliance and test validity.
6. **`release-agent`**: Compiles the PR description and updates Jira if applicable.
