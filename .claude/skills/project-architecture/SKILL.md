---
name: project-architecture
description: >
  Authoritative architectural guide, layer responsibilities, folder structures,
  and dependency boundary rules for the Student Management Angular application.
  Use this skill when designing, reviewing, or exploring application architecture.
---

# Project Architecture Skill

## 1. Project Context

The Student Management application is an Angular 22 application with Server-Side Rendering (SSR), NgRx SignalStore (`@ngrx/signals`), and Vitest.

### Active Features
- `students`: Student profiles, pagination, diacritic-insensitive search, class filtering.
- `classes`: Classes management, academic year validation, student association checks.
- `teachers`: Teacher profiles and faculty association.
- `subjects`: Academic subjects, credit requirements, teacher assignment.
- `grades`: Student grade records, grade points (0–10 scale), subject/student relations.
- `users`: User accounts management, RBAC (`admin`, `teacher`, `student`), linked profiles, and lock/deactivate states.
- `dashboard`: High-level summary metrics.
- `auth`: Role-based access control (`admin`, `teacher`, `student`).

## 2. Architecture Rules (Explicit Layering)

Every feature follows the strict unidirectional dependency flow:

```
Component ──> Facade ──> Store ──> Service ──> REST API
```

### Layer Constraints
1. **Component (`components/`)**:
   - MUST ONLY inject and call **Facades**.
   - **NEVER** import directly from `services/` or `store/`.
   - **NEVER** make direct HTTP calls.
2. **Facade (`facades/`)**:
   - Coordinates business logic and exposes reactive Signals to components.
   - **NEVER** inject `HttpClient` directly; delegates network I/O to Store and Service.
3. **Store (`store/`)**:
   - Uses NgRx SignalStore (`signalStore`).
   - Manages state, loading/error flags, computed queries.
   - Triggers network I/O via Service calls.
4. **Service (`services/`)**:
   - Handles REST API communication using Angular `HttpClient`.
   - **NEVER** depends on Component, Facade, or Store.
5. **Model (`models/`)**:
   - Contains pure TypeScript interfaces and types.

## 3. Directory Layout Standard

### Feature Modules
```text
src/app/features/<feature>/
├── components/          <-- Feature UI components
├── facades/             <-- <feature>.facade.ts
├── models/              <-- <feature>.model.ts
├── services/            <-- <feature>.service.ts
├── store/               <-- <feature>.store.ts (& .spec.ts)
└── <feature>.routes.ts  <-- Feature route definition
```

### Shared Primitives (`src/app/shared/`)
Shared reusable UI elements and utilities reside in `src/app/shared/`:
```text
src/app/shared/
├── components/
│   ├── layout/          <-- App Shell: sidebar/ and header/
│   ├── modal/           <-- Standalone Modal host
│   └── pagination/      <-- Signals-based PaginationComponent
├── directives/
│   └── tooltip/         <-- [appTooltip] Directive
├── styles/
│   └── design-system.css <-- Global UI design system & CSS variables
└── utils/
    └── vietnamese.util.ts <-- Diacritic stripping & text utilities
```

## 4. Automated Architecture Verification

Always run the architecture validation script to ensure boundary compliance:

```bash
npm run check:arch
```

If the script fails:
1. Check the offending file reported in output.
2. Replace any direct Service/Store imports with Facade calls.
3. Re-run `npm run check:arch` until all checks pass.

## 5. References

For detailed guidelines, consult:
- [architecture.md](references/architecture.md): Layer responsibilities, dependency flow, and cross-feature patterns.
- [coding-conventions.md](references/coding-conventions.md): File naming, TypeScript rules, and quality gates.
