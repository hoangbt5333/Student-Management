# Project Instructions: Student Management

## 1. Project Context & Stack
- **Framework**: Angular 22 with Server-Side Rendering (SSR).
- **State Management**: NgRx SignalStore (`@ngrx/signals`) with Angular Signals (`signal`, `computed`, `effect`, `rxMethod`).
- **Unit Testing**: Vitest (`@angular/build:unit-test`).
- **REST Mock API**: json-server on port 3001.

## 2. Architecture Standard (Explicit Layering)
All domain features under `src/app/features/` (`students`, `classes`, `teachers`, `subjects`, `grades`) MUST follow:

```text
src/app/features/<feature>/
├── components/          <-- Render UI, capture events, call Facades
├── facades/             <-- Coordinate state, expose signals and actions
├── models/              <-- Type definitions and DTO interfaces
├── services/            <-- Pure HTTP data access using HttpClient
├── store/               <-- NgRx signalStore state and computed queries
└── <feature>.routes.ts  <-- Route configurations
```

## 3. Strict Boundary Rules
- **Component**:
  - ONLY interact with **Facades**.
  - **NEVER** import from `services/` or `store/`.
  - **NEVER** inject `HttpClient` or make direct HTTP calls.
  - Do NOT subscribe to observables manually; use Signals.
- **Facade**:
  - Coordinates between Store and Component.
  - **NEVER** inject `HttpClient` directly (delegate network I/O to Store/Service).
- **Store**:
  - Encapsulates state mutation via `patchState`.
  - Orchestrates async flows with `rxMethod`.
- **Service**:
  - Pure HTTP data access methods returning `Observable<T>`.
  - **NEVER** import Component, Facade, or Store.

## 4. Verification Requirements
Before reporting any implementation as complete, you MUST execute the project's quality gates:
```bash
npm run verify
```
This runs:
1. `npm run check:arch` (Architecture boundary verification)
2. `npm run build` (Client + SSR bundle compilation)
3. `npm run test:ci` (Vitest test suites)
