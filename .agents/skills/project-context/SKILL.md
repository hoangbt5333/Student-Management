---
name: project-context
description: Authoritative architectural context, conventions, and operational pitfalls for the user-management (Student Management) Angular application. Use at the start of any project task to avoid incorrect assumptions.
---

# Project Context — Student Management System (`user-management`)

## 1. Core Purpose & Operating Rules

This skill provides an authoritative, codebase-verified working model of the `user-management` project.

### Core Directives:
1. **Match the actual codebase:** Do not impose theoretical or idealized conventions. Follow the architecture already implemented in the target feature.
2. **Never assume uniform architecture:** Different business modules in this project deliberately or historically follow different patterns.
3. **Make surgical changes:** Keep modifications minimal and focused on the requested scope. Do not silently refactor neighboring code or clean up architectural inconsistencies unless explicitly instructed.
4. **Preserve existing conventions:** Retain Vietnamese user-facing text, error messages, Reactive Form structures, and Signal-based data bindings.

---

## 2. Technology Stack & Runtime Configuration

- **Framework:** Angular `^22.2.0` (Core, Common, Forms, Router, Platform-Browser). 100% Standalone Components and modern control flows (`@if`, `@for`, `@empty`).
- **State Management:** `@ngrx/signals ^22.0.1` (`signalStore`, `withState`, `withComputed`, `withMethods`, `patchState`, and `rxMethod`).
- **Reactive & Async:** Angular Signals (`signal`, `computed`, `effect`, `input`, `output`) + RxJS `~7.8.0` (`switchMap`, `exhaustMap`, `tap`, `catchError`, `finalize`, `forkJoin`).
- **SSR & Server:** `@angular/ssr ^22.2.1`, `@angular/platform-server ^22.2.0`, Express `^5.1.0`. Hydration enabled via `provideClientHydration()`.
- **Language & Compiler:** TypeScript `~6.0.2` (`target: "ES2022"`, `module: "preserve"`). No path aliases (`paths`) configured in `tsconfig.json`—all imports are relative (`../../`).
- **Unit Testing:** Vitest `^5.0.0` integrated with `@angular/build:unit-test`.
- **UI & Styling:** 100% Plain Vanilla CSS. **No** Tailwind, Angular Material, Bootstrap, or component libraries.
- **Shared Folder:** `src/app/shared/` is **empty** (0 files).

### Common Commands:
- `npm start` — Run Angular dev server (`http://localhost:4200`).
- `npm run build` — Production build (browser + SSR server output to `dist/user-management`).
- `npm test` — Run Vitest suite (`ng test --watch=false`).
- `npm run serve:ssr:user-management` — Run SSR server on port 4000 (`node dist/user-management/server/server.mjs`).

---

## 3. High-Level Architecture & Feature Matrix

The project has **three distinct data-flow patterns**:

```text
1. Standard 4-Tier (Students & Classes):
   Component → Facade → SignalStore → Service → REST API

2. Direct 2-Tier (Academics: Teachers, Subjects, Grades):
   Component → AcademicService → REST API (No Store, No Facade)

3. Detail Views Bypass (All Entity Detail Pages):
   DetailComponent → Direct Services with forkJoin() → REST API (Bypasses Stores)
```

### Module Breakdown:

| Module | Components | Store & Facade | Data Access Service | Data Flow Pattern |
|---|---|---|---|---|
| **Students** | `StudentListComponent`, `StudentTable`, `StudentForm`, `StudentDetailComponent` | `StudentStore`, `StudentFacade` | `StudentService` (in `student.ts`) | 4-tier list/form flow; detail bypasses store |
| **Classes** | `ClassList`, `ClassForm`, `ClassDetailComponent` | `ClassStore`, `ClassFacade` | `ClassService` (`class.service.ts`) | 4-tier list/form flow; detail bypasses store |
| **Academics** | `SubjectListComponent`, `SubjectDetailComponent`, `TeacherListComponent`, `TeacherDetailComponent`, `GradeListComponent` | **None** | `AcademicService` (`academic.service.ts`) | Direct 2-tier; component manages local signals |
| **Dashboard** | `DashboardComponent` | **None** | Consumes `StudentFacade` & `ClassFacade` | Derives aggregates client-side via `computed()` |
| **Auth** | `LoginComponent`, `ForbiddenComponent`, `UsersComponent` | `AuthStore`, `AuthFacade` | `AuthService` (`auth.service.ts`) | Client-side demo auth + `sessionStorage` |

---

## 4. Module Specifications & Key Quirks

### 4.1. Students (`src/app/features/students/`)
- **Service anomaly:** Defined in [student.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/students/data-access/student.ts), **not** `student.service.ts`.
- **Cross-Store Dependency:** `StudentStore` directly injects `ClassStore` inside `withComputed` to resolve `className` and build `classOptions`.
- **Search & Pagination:** `StudentStore` normalizes Vietnamese diacritics and `đ/Đ` (`normalizeText`), maintains client-side pagination (`page`, `pageSize`, `totalPages`, `currentPage`, `pageStudents`), and sort options.
- **Save Operation:** Uses `rxMethod` with `exhaustMap` in `saveStudent`, checks duplicate code client-side, calls `POST` (add) or `PUT` (update), then re-fetches the list.
- **Form:** `StudentForm` injects `ClassFacade` directly to fetch class choices, and uses an `effect()` in constructor to reset/disable `id` control when editing.

### 4.2. Classes (`src/app/features/classes/`)
- **Service:** [class.service.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/classes/data-access/class.service.ts). Uses `PATCH` for updates (`update(id, data)`), unlike other services which use `PUT`.
- **Store & Facade:** `ClassStore` provides search and sorting via `rxMethod` (`saveClass`, `deleteClass`). Has **no** pagination.
- **Delete Constraint:** `ClassList` injects `StudentFacade` to check if students still belong to the class before allowing deletion.
- **Typo in Code:** [class-list.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/classes/components/class-list/class-list.ts#L17) contains a property named `studentFacede`.
- **Form Validation:** Validates ID pattern `/^CLS\d{3,}$/` and academic year `/^\d{4}-\d{4}$/`.

### 4.3. Academics: Subjects, Teachers, Grades (`src/app/features/academics/`)
- **No Store or Facade:** All components directly inject [academic.service.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/academics/data-access/academic.service.ts) and manage local `signal()` states. **Do not create stores/facades unless explicitly requested.**
- **Route Prefix:** Routes are mounted at root `path: ''` in [app.routes.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/app.routes.ts#L48). Actual URLs are `/teachers`, `/subjects`, `/grades` (not `/academics/...`).
- **Deletion Rules (Client-side enforced):**
  - Cannot delete a Teacher if assigned to any Subject (`subjects.some(s => s.teacherId === teacher.id)`).
  - Cannot delete a Subject if referenced by any Grade (`grades.some(g => g.subjectId === subject.id)`).
- **Missing Method:** `AcademicService` has **no `deleteGrade()` method**.
- **Grade Business Rules:** Scores validated between `0` and `10`. `GradeListComponent` verifies duplicate `(studentId, subjectId)` in memory before saving.
- **Shared Styles:** Components share the relative stylesheet [../catalog.css](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/academics/components/catalog.css).

### 4.4. Detail Pages
- `StudentDetailComponent`, `ClassDetailComponent`, `TeacherDetailComponent`, `SubjectDetailComponent`:
  - Bypass feature stores entirely.
  - Call multiple HTTP services concurrently using `forkJoin` (e.g. `students`, `classes`, `grades`, `subjects`).
  - Perform client-side `.find()` in array results rather than calling dedicated single-entity endpoints.

### 4.5. Dashboard (`src/app/features/dashboard/`)
- Standalone component [dashboard.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/dashboard/components/dashboard/dashboard.ts).
- Injects `StudentFacade` and `ClassFacade`, invokes `loadStudents()` / `loadClasses()`, and computes stats (`totalStudents`, `totalClasses`, `averageStudentsPerClass`, `classStats`, `inactiveClasses`) dynamically via `computed()`.

---

## 5. Routing, Authentication & Security

### 5.1. Routing & SSR Rendering Modes
- Root routing in [src/app/app.routes.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/app.routes.ts).
- Server render strategy in [src/app/app.routes.server.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/app.routes.server.ts):
  - `RenderMode.Client` for parameterized routes: `students/:id`, `classes/:id`, `teachers/:id`, `subjects/:id`.
  - `RenderMode.Prerender` for static routes (`**`).

### 5.2. Client-Side Demo Authentication
- **Warning:** Authentication is purely client-side simulation. `json-server` REST endpoints are completely unauthenticated.
- **Login Flow:** `AuthService.login()` fetches `GET http://localhost:3001/users`, plaintext-compares credentials in memory, and returns `AuthUser`.
- **Session:** Stored in `sessionStorage` (`demo-auth-user`). `AuthStore` guards with `typeof sessionStorage !== 'undefined'` to avoid SSR Node.js crashes.
- **Known Redirect Flaw:** In [login.component.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/auth/components/login/login.component.ts#L37-L44), reading `returnUrl` is commented out; login always redirects to `/dashboard`.

### 5.3. RBAC Permissions Matrix
Roles: `'admin' | 'teacher' | 'student'`. Permissions evaluated via `authFacade.can(permission)`:
- `admin`: Full access to all features (`manage-students`, `manage-classes`, `manage-teachers`, `manage-subjects`, `manage-grades`, `manage-users`).
- `teacher`: View all entities; manage permissions restricted to `manage-grades`.
- `student`: View permissions only (`view-students`, `view-classes`, `view-subjects`, `view-teachers`). No access to general grade list.
- **Guards:** [auth.guard.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/core/auth/guards/auth.guard.ts) redirects unauthenticated to `/login?returnUrl=...`; [role.guard.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/core/auth/guards/role.guard.ts) redirects unauthorized roles to `/forbidden`.

---

## 6. Mock API & Data Access Quirks

- **Base URL:** Hardcoded `http://localhost:3001` across all services. No Angular `environment.ts` configured.
- **Auto-generated IDs in json-server:**
  - POST requests for students and classes omit `id` (or pass it as `code`), causing json-server to generate a random hash `id` (e.g., `"R2J5VkW"`).
  - Code consistently uses `item.code ?? item.id` to handle this dual-identity behavior.
- **Orphan Data:** `db.json` contains a `courses` collection (lines 202-258) that is completely unused by the Angular app.
- **Auxiliary MCP Server:** The `student-mcp/` root folder contains a Model Context Protocol server exposing tools to inspect data from port 3001 for AI assistants.

---

## 7. Interceptors & Global Services

Configured in [src/app/app.config.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/app.config.ts):
- **`loadingInterceptor`:** Intercepts requests, increments/decrements `LoadingService.activeRequests`, drives global spinner in `App`.
- **`errorInterceptor`:** Catches `HttpErrorResponse`, maps status (0, 400, 401, 403, 404, 500+) to Vietnamese error messages, pushes to `NotificationService.showError()`.
- **`clientHeaderInterceptor`:** Exists in `core/interceptors/` but is **commented out** in `app.config.ts`.

---

## 8. Critical Pitfalls for AI Coding Agents

When working on this repository, **DO NOT**:
1. **DO NOT invent Stores or Facades for Academics:** Keep `Teacher`, `Subject`, and `Grade` features using direct `AcademicService` calls unless specifically asked to refactor them.
2. **DO NOT rename `student.ts` to `student.service.ts`:** Multiple files import from `./student`. Leave the filename intact unless executing a documented renaming task.
3. **DO NOT rely on `src/app/shared/`:** The folder is empty. Do not expect common UI components, dialogs, or pipes there.
4. **DO NOT assume server-side data integrity:** All foreign-key validations (preventing class/subject/teacher deletion) and uniqueness checks are executed on the client.
5. **DO NOT use path aliases:** Use relative paths (e.g. `../../core/...`).
6. **BE AWARE OF FAILING TEST:** [student-list.spec.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/features/students/components/student-list/student-list.spec.ts) currently fails (`AssertionError: expected null not to be null`) because `AuthFacade` is unmocked in the test bed, hiding the `+ Thêm sinh viên` button.
7. **BE AWARE OF CIRCULAR IMPORT RISK:** [auth.facade.ts](file:///c:/Users/hoang/Desktop/VSCode/user-management/src/app/core/auth/facades/auth.facade.ts#L6) has an unused import `import { App } from '../../../app';`. Do not replicate this pattern.
