---
name: debugging
description: Systematic debugging workflows and troubleshooting procedures for the Student Management application. Trigger when diagnosing errors, fixing broken unit tests, resolving build or SSR failures, troubleshooting SignalStore state issues, or debugging API communication problems.
---

# Debugging Skill — Student Management System

## 1. Troubleshooting Philosophy & Rules

When debugging issues in `user-management`:
1. **Reproduce with evidence:** Collect exact error messages, stack traces, and HTTP status codes before making changes.
2. **Isolate the specific layer:** Pinpoint whether the bug originates in:
   - **Template / Component UI** (bindings, signal reads, `@if` / `@for` control flow)
   - **Facade / Store** (state mutations, computed derivations, `rxMethod` operators)
   - **Service / Interceptor** (HTTP headers, URL construction, error catching)
   - **API / Mock Data** (`json-server` port 3001, `db.json` schema)
   - **SSR / Hydration** (Node.js runtime vs Browser environment)
   - **Test Bed** (missing mocks or providers in Vitest specs)
3. **Apply the minimal surgical fix:** Do not rewrite or refactor unrelated files when fixing a bug.
4. **Verify through automated checks:** Run `npm test` or `npm run build` to confirm resolution without regressions.

---

## 2. Common Project Failure Modes & Solutions

### 2.1. Vitest Test Failures
- **Symptom:** `AssertionError: expected null not to be null` when querying elements in tests (e.g. [student-list.spec.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/students/components/student-list/student-list.spec.ts)).
  - **Root Cause:** The template guards elements with `@if (authFacade.can(...))` or `@if (authFacade.role() === ...)`, but the test bed did not mock `AuthFacade`. By default, unauthenticated state returns `false`, causing the element not to be rendered.
  - **Solution:** Provide a mock `AuthFacade` in `TestBed.configureTestingModule({ providers: [...] })` with methods like `can: () => true` or the required role/permissions.
- **Symptom:** `Http failure response for http://localhost:3001/...: 500 Internal Server Error` in specs.
  - **Root Cause:** Testing stores with `HttpTestingController` where unexpected requests were emitted or not properly flushed.
  - **Solution:** Verify `httpMock.expectOne(...)` and call `httpMock.verify()` in `afterEach()`.

### 2.2. SSR & Hydration Crashes
- **Symptom:** `ReferenceError: sessionStorage is not defined` or `window is not defined` during `npm run build` or SSR runtime (`npm run serve:ssr:user-management`).
  - **Root Cause:** Accessing browser-only APIs during prerender or server execution without checking runtime environment.
  - **Solution:** Guard browser APIs with `if (typeof sessionStorage !== 'undefined')` or use `isPlatformBrowser(inject(PLATFORM_ID))`.
  - **Check Server Routes:** Inspect [src/app/app.routes.server.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/app.routes.server.ts). Parameterized routes (`:id`) must have `renderMode: RenderMode.Client` to avoid executing dynamic data fetching on Node.js at build time.

### 2.3. SignalStore & Reactivity Issues
- **Symptom:** UI does not update after adding, editing, or deleting an entity.
  - **Root Cause 1:** Missing `patchState(store, ...)` inside `tap()` or `finalize()` in `rxMethod`.
  - **Root Cause 2:** Using `exhaustMap` vs `switchMap`: if an action is fired while another request is active, `exhaustMap` ignores subsequent triggers.
  - **Root Cause 3:** Store reloading data but replacing state with an array reference that failed to trigger downstream derivations. Check `computed()` selectors.
- **Symptom:** Maximum call stack size exceeded or infinite loop in components.
  - **Root Cause:** Modifying a Signal inside an `effect()` that directly or indirectly reads the same Signal, triggering cyclic updates.
  - **Solution:** Remove circular Signal dependency or use `untracked()` to read values without subscribing.

### 2.4. Reactive Form Quirks
- **Symptom:** Submitting an update loses the entity ID (`undefined` or empty string).
  - **Root Cause:** The ID control is disabled (`this.form.controls.id.disable()`) and the submission reads `this.form.value` instead of `this.form.getRawValue()`.
  - **Solution:** Always use `this.form.getRawValue()` when controls may be disabled.
- **Symptom:** Form values do not sync when selecting an item to edit.
  - **Root Cause:** `effect()` in constructor not triggering or not referencing the input signal (`this.student()`, `this.classItem()`).
  - **Solution:** Verify that the signal is called inside the `effect()` body (`const item = this.item()`) so Angular registers the dependency.

### 2.5. Mock API & json-server Communication
- **Symptom:** HTTP Status 0 (`Không thể kết nối đến máy chủ. Hãy kiểm tra API`).
  - **Root Cause:** The json-server backend is not running on port 3001.
  - **Verification:** Run `npx json-server --watch db.json --port 3001` or check if port 3001 is listening.
- **Symptom:** Entity ID becomes a random alphanumeric string (e.g. `"R2J5VkW"`).
  - **Root Cause:** `StudentService.addStudent` or `ClassService.create` strips `id` before `POST`, causing json-server to generate a random ID and save the original code under `code`.
  - **Solution:** When displaying, filtering, or checking uniqueness, always check both: `item.code ?? item.id`.
- **Symptom:** HTTP 404 on Update/Delete.
  - **Root Cause 1:** Missing `encodeURIComponent(id)` when passing IDs containing special characters.
  - **Root Cause 2:** Wrong HTTP method used (e.g. using `PUT` for `classes` instead of `PATCH`, or calling `AcademicService` which lacks `deleteGrade()`).

### 2.6. Routing & Auth Flow Bugs
- **Symptom:** User is redirected to `/dashboard` instead of the original page after logging in.
  - **Root Cause:** [login.component.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/auth/components/login/login.component.ts#L37-L44) has the `returnUrl` parsing commented out.
  - **Solution:** Restore query param extraction (`this.route.snapshot.queryParamMap.get('returnUrl')`) and validate against open-redirect before navigating.
- **Symptom:** Immediate redirect to `/forbidden` upon navigating to a route.
  - **Root Cause:** `roleGuard` in [role.guard.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/core/auth/guards/role.guard.ts) checks `route.data['roles']`. Verify the logged-in user's role (`authFacade.role()`) matches the allowed roles.

---

## 3. Step-by-Step Diagnostic Protocol

When tasked with debugging an issue:

1. **Phase 1: Triage & Reproduction**
   - Run the relevant command (`npm test`, `npm run build`, or check dev server logs).
   - Locate the exact file and line number from the stack trace.
2. **Phase 2: Trace the Data Path**
   - Trace backwards: UI event -> Facade -> Store -> Service -> Interceptor -> API.
   - For UI issues: check `@if`, `can(...)`, signals, form controls.
   - For async issues: check RxJS pipes, error interceptor mapping, network response.
3. **Phase 3: Formulate & Apply Hypothesis**
   - Identify the single root cause.
   - Make the smallest surgical code edit addressing that cause.
4. **Phase 4: Verification**
   - Re-run the failing test or build to confirm the fix works.
   - Run the full test suite (`npm test`) to guarantee no regressions.

---

## 4. Debugging Response Format

When helping debug an issue, provide:

1. **Problem Summary:** Clear explanation of what failed and why.
2. **Root Cause Analysis:** Specific file paths, line references, and the underlying mechanism of the bug.
3. **Proposed Fix:** The exact code changes needed (file-by-file diffs or replacements).
4. **Verification Evidence:** Results of running tests, build commands, or manual verification steps.
5. **Regression Risk Assessment:** Note if any related features or edge cases could be affected.
