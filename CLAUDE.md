# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Common commands

Run commands from the repository root:

- `npm start` — start the Angular dev server at `http://localhost:4200`.
- `npm run build` — production build, including the configured server/SSR output.
- `npm run watch` — rebuild continuously in development configuration.
- `npm test` — run the Angular CLI unit-test builder (Vitest). On Windows/CLI headless, ALWAYS append `--watch=false` to avoid hanging: `cmd /c "npm test -- --include='src/app/features/students/components/student-table/student-table.spec.ts' --watch=false"`.
- `npm run test:ci` — run all unit tests once without watch mode.
- `npm run serve:ssr:user-management` — serve the previously built SSR app (default port 4000; configurable with `PORT`).

There is no lint script or lint target configured in `package.json` or `angular.json`.

The app expects a mock REST API on port 3001. Services currently use hard-coded `http://localhost:3001` URLs. README documents starting json-server with `npx json-server --watch db.json --port 3001`, but its instructions refer to a `mock-api` directory that is not present in this repository; the checked-in `db.json` is at the root. `json-server` is not listed in this repository's dependencies, so confirm the intended API setup before relying on that command.

## Architecture

This is an Angular 22 standalone application. `src/main.ts` bootstraps the browser app; `src/app/app.config.ts` provides the router, `HttpClient`, hydration, and HTTP interceptors. `src/app/app.routes.ts` owns top-level routing and lazy-loads feature routes/components. Feature-specific child routes live alongside their feature under `src/app/features/`.

Business areas are grouped by feature (`students`, `classes`, `academics`, `dashboard`, `auth`). The main data-access pattern, used by students and classes, is `Component → Facade → NgRx Signal Store → Service → REST API`. Stores own feature state and asynchronous operations; computed signals derive view data such as filtering, sorting, and pagination. Facades expose state and operations to components. `academics` currently has an `AcademicService`, but does not follow the same facade/store pattern throughout, so inspect existing usage before extending it.

Cross-cutting concerns are in `src/app/core/`: auth, shared services, and HTTP interceptors. The loading interceptor drives `LoadingService`; the error interceptor displays HTTP errors through `NotificationService`. `client-header.interceptor.ts` exists but is not registered in `app.config.ts`.

Authentication is demo-only and client-side: `AuthService` fetches `/users` and compares credentials in the browser; `AuthStore` keeps the current user in `sessionStorage`; route guards check sign-in and role. These guards do not secure the REST API. Do not treat this design as production authentication or authorization. Role-to-permission mapping is in `AuthFacade`; route-level role checks use `roleGuard` and route `data.roles`.

SSR is provided by `src/server.ts`, `src/main.server.ts`, and `src/app/app.config.server.ts`. `src/app/app.routes.server.ts` configures prerender/client render modes. Auth state reads browser `sessionStorage`, so it is absent during server rendering. Consider SSR behavior when changing routes, authentication, or data fetching.

## Project-specific notes

- API data models and service calls are feature-local; for example, student files are under `src/app/features/students/data-access/`.
- Student state also reads `ClassStore` to resolve class names and provide class options (`student.store.ts`), so changes to class data may affect student list derivations.
- README documents the mock API, demo accounts, data relationships, and current limitations. The mock API stores plain-text demo passwords and client-side authorization is not secure; do not use these demo credentials or this setup in production.

## Hierarchical Subagent Orchestration

When handling complex tasks or Jira tickets, the primary Claude Code session operates as the **Lead Orchestrator** and coordinates the specialized subagents defined in `.claude/agents/`.

### Strict Orchestration Rules:
1. **Worktree Lifecycle & Integration:**
   - Claude Code runs background subagents in isolated git worktrees. Subagents are expected to work within their assigned worktree.
   - **Coder Commit Requirement:** `coder` MUST commit its changes (`git add . && git commit -m '...'`) in its worktree before finishing and report its branch name to Lead.
   - **Lead Merge Step:** Upon receiving Coder's completion report, `Lead Orchestrator` MUST immediately merge Coder's branch into the current working branch:
     `git merge <coder-branch> --no-edit` (hoặc cherry-pick).
   - This brings all changes cleanly into the primary workspace so `reviewer` can inspect `git diff HEAD~1` without any worktree permission or path issues.
2. **Strict Sequential State Machine:**
   - Execute strictly one step at a time: `Architect -> Human Gate -> Coder -> Lead Merge -> Reviewer -> Release-Agent`.
   - Never launch subagents in parallel or speculate (e.g. NEVER call `release-agent` before `reviewer` gives `VERDICT: APPROVED`).
   - If an issue occurs, pause and diagnose within the main session; do NOT spam multiple duplicate subagents.
3. **Deterministic Testing:** Always run unit tests with `--watch=false` and `cmd /c` on Windows:
   `cmd /c "npm test -- --include='<spec-file>' --watch=false"`.

### Subagents & Responsibilities:
1. **`architect`**: Analyzes the codebase, identifies root cause (for bugs), verifies architectural boundaries (Explicit Layering), and produces a concrete technical implementation spec with subtasks and test strategies.
2. **`coder`**: Implements code directly in the main working tree, writes Vitest unit tests (TDD for bugs), and verifies locally with `npm test -- ... --watch=false`.
3. **`reviewer`**: Independently inspects `git diff` against architecture standards, test coverage, and behavior preservation.
   - **Scope Boundary:** Focus strictly on the ticket requirements. Do NOT reject or scope-creep for unrelated pre-existing edge cases.
   - If `CHANGES_REQUESTED`: Lead sends specific action items back to `coder`.
   - If `APPROVED`: Lead proceeds to `release-agent`.
4. **`release-agent`**: Compiles final PR description, updates `docs/` if necessary, and syncs status/comments with Jira.

