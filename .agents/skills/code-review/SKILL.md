---
name: code-review
description: Perform systematic, constructive code reviews for changes or existing code in the Student Management project. Trigger when reviewing code, checking pull requests, evaluating architectural compliance, or assessing code quality against project conventions.
---

# Code Review Skill — Student Management System

## 1. Purpose & Review Philosophy

Use this skill to perform thorough, context-aware code reviews on code changes or existing implementations in the `user-management` project.

### Core Review Principles:
- **Enforce actual project conventions:** Judge code against this project's verified conventions, not generic Angular defaults.
- **Respect feature-specific architecture:** Do not demand Facade/Store for `academics` (which uses direct services), and do not accept direct service calls in `students` or `classes` (which require `Component → Facade → Store → Service`).
- **Prioritize actionable, prioritized feedback:** Categorize findings by severity (**Critical / Blocker**, **Warning / Inconsistency**, **Suggestion / Minor**).
- **Verify before approving:** Ensure code does not break build, SSR prerender, or unit tests.

---

## 2. Review Checklist

### 2.1. Architecture & Layering Compliance
- [ ] **Students & Classes:** Does the change respect `Component → Facade → Store → Service → REST API`?
  - Components must only inject Facades (or child components), not direct services or stores.
  - Facades expose readonly Signals and wrap store methods.
  - Stores (`signalStore`) own state, computed projections, and `rxMethod` pipelines.
  - Services only perform HTTP calls via `HttpClient`.
- [ ] **Academics (Teachers, Subjects, Grades):** Does the change respect the direct `Component → AcademicService` pattern? (Do not introduce phantom stores or facades unless a full refactoring is explicitly requested).
- [ ] **Detail Screens:** Does the detail view follow the existing pattern of loading via `forkJoin` and `.find()` without introducing broken single-entity API assumptions?
- [ ] **File Naming & Placement:**
  - Placed in the correct feature folder under `src/app/features/<feature>/`.
  - Check existing file names (e.g. `student.ts` contains `StudentService`; do not inadvertently duplicate service files).
  - No new path aliases; all imports must remain relative (`../../`).

### 2.2. Angular Reactivity & Signals
- [ ] **Signal Usage:** Are `signal()`, `computed()`, `input()`, and `output()` used appropriately?
- [ ] **No Side Effects in `computed()`:** Ensure `computed()` is purely deterministic and does not call methods or set state.
- [ ] **`effect()` Safety:** If `effect()` is used (e.g., in forms to sync inputs), is it placed in an injection context (constructor) and protected against infinite loops?
- [ ] **RxJS & Signal Interop:**
  - Are async store operations wrapped in `rxMethod` with appropriate flattener (`exhaustMap` for saves/deletions, `switchMap` for searches/reads)?
  - Are subscriptions inside components avoided in favor of Signal state?

### 2.3. Reactive Forms & Data Binding
- [ ] **Strict Typing:** Uses `FormBuilder.nonNullable.group({...})`.
- [ ] **Validation Standards:**
  - IDs/Codes validated against project regex patterns (e.g. Class: `/^CLS\d{3,}$/`, Teacher: `/^GV\d{3,}$/`, Subject: `/^MH\d{3,}$/`, Academic Year: `/^\d{4}-\d{4}$/`, Phone: `/^[0-9]{10}$/`).
  - Score inputs restricted between `0` and `10` (`Validators.min(0)`, `Validators.max(10)`).
- [ ] **Disabled Form Controls:** If an ID field is disabled during editing, does submission use `form.getRawValue()` instead of `form.value` so the ID is not dropped?

### 2.4. Data Integrity & API Quirks
- [ ] **ID vs Code Handling:** Does the code handle json-server's auto-generated hash IDs using `item.code ?? item.id`?
- [ ] **Client-Side Constraint Verification:**
  - Deleting Class: verified that no student references `classId` or `className`.
  - Deleting Teacher: verified that no subject has `teacherId === teacher.id`.
  - Deleting Subject: verified that no grade has `subjectId === subject.id`.
  - Uniqueness: duplicate code/ID or duplicate `(studentId, subjectId)` checked client-side before POST/PUT.
- [ ] **HTTP Verbs:** Student/Teacher/Subject updates use `PUT`; Class update uses `PATCH`.

### 2.5. Authentication, Roles & SSR Safety
- [ ] **RBAC Enforcement:** Are sensitive UI elements guarded with `@if (authFacade.can('...'))`?
- [ ] **Route Protection:** Are sensitive routes guarded by `authGuard` and `roleGuard` with `data.roles`?
- [ ] **SSR & Node Safety:** Are browser globals (`sessionStorage`, `window`, `document`) guarded against execution on Node.js/Prerender (e.g. `typeof sessionStorage !== 'undefined'`)?
- [ ] **No False Security Claims:** Remember auth is client-side demo; do not rely on API security.

### 2.6. Testing & Build Integrity
- [ ] **Vitest Compatibility:** Does the change break existing specs?
- [ ] **AuthFacade Mocking in Tests:** If a component uses `authFacade.can(...)` in its template, does the corresponding `.spec.ts` provide a mock `AuthFacade` so UI elements render as expected?
- [ ] **Build Check:** Does `npm run build` pass without budget errors or template compile issues?

---

## 3. Review Response Format

When providing a code review, structure your response as follows:

1. **Review Summary:** High-level verdict (Approved / Needs Changes / Discussion Needed) with a 2-3 sentence overview.
2. **Architecture & Conventions Check:** Confirmation of whether local feature patterns are respected.
3. **Findings & Issues (Categorized):**
   - 🔴 **Critical / Blocker:** Bugs, broken contracts, missing required checks, SSR crashes, failing tests.
   - 🟡 **Warning / Inconsistency:** Code duplication, architectural divergence, missing error handling.
   - 🟢 **Suggestion / Polish:** Minor readability improvements, typing refinements, naming consistency.
4. **Concrete Recommendations / Code Snippets:** Provide precise, minimal code examples illustrating fixes.
5. **Verification Steps:** Instructions on how to test and verify the change (`npm test`, build check, manual browser steps).
