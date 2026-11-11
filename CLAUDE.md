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

## Subagents Workflow

When handling tickets or new features, the primary Claude Code session operates as the **Lead Orchestrator**:

1. **`architect`**: Delegate to investigate the codebase, find relevant files, and propose a concise technical implementation plan.
2. **User Confirmation**: Present the plan to the user for quick approval before implementing.
3. **`coder`**: Delegate to implement the Angular code and write Vitest unit tests.
4. **`reviewer`**: Delegate to inspect changes, ensuring architectural compliance and passing unit tests.
5. **Completion**: Lead summarizes the changes, presents the PR description, or updates Jira directly.

### Windows Test Guideline
Always run unit tests with `--watch=false` and `cmd /c` on Windows:
`cmd /c "npm test -- --include='<spec-file>' --watch=false"`.

