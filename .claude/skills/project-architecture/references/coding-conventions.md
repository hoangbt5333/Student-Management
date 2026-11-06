# Coding Conventions - Student Management

## 1. Directory Structure per Feature (Explicit Layering)

Every domain feature under `src/app/features/<feature>/` strictly contains:

```text
src/app/features/<feature>/
├── components/          <-- Presentational / container components
│   └── <name>/
│       ├── <name>.ts
│       ├── <name>.html
│       ├── <name>.css
│       └── <name>.spec.ts
├── facades/             <-- Facade service coordinating feature logic
│   └── <feature>.facade.ts
├── models/              <-- Type definitions and DTOs
│   └── <feature>.model.ts
├── services/            <-- HTTP client services
│   └── <feature>.service.ts
├── store/               <-- NgRx SignalStore
│   ├── <feature>.store.ts
│   └── <feature>.store.spec.ts
└── <feature>.routes.ts  <-- Feature routes definition
```

## 2. File Naming Conventions

- Components: `<feature>-<name>.ts` or `<name>.ts` inside its component folder.
- Facades: `<feature>.facade.ts`
- Stores: `<feature>.store.ts` (specs: `<feature>.store.spec.ts`)
- Services: `<feature>.service.ts` (specs: `<feature>.service.spec.ts`)
- Models: `<feature>.model.ts`
- Routes: `<feature>.routes.ts`

## 3. TypeScript & Angular Rules

- **Type Safety**:
  - Do not use `any` unless absolutely necessary (and justified with a comment).
  - Do not use type assertions (`as unknown as Foo`) to mask type mismatches.
  - Keep return types explicit on public methods.

- **Reactivity & State Management**:
  - Use Angular Signals (`signal`, `computed`, `effect`).
  - Stores must use NgRx `signalStore` with `{ providedIn: 'root' }`.
  - Use `rxMethod` for asynchronous actions within the Store.
  - Avoid subscribing manually in components with `.subscribe()`; let signals or async pipes drive view updates.

- **Forms**:
  - Use Reactive Forms with `nonNullable` form builders (`this.fb.nonNullable.group(...)`).
  - Validate all user inputs with Angular validators (`Validators.required`, `Validators.pattern`, etc.).

## 4. Verification & Quality Gates

Run the automated verification suite before submitting any changes:

```bash
# Architecture boundary check
npm run check:arch

# Full quality gate (Architecture + Build + Tests)
npm run verify
```
