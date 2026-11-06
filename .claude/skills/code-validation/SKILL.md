---
name: code-validation
description: >
  Comprehensive 4-tier validation framework for reviewing and validating code quality,
  architectural boundaries, TypeScript strictness, and business logic in the Student Management project.
---

# Code Validation Skill — Student Management System

This skill provides an automated and systematic 4-tier validation framework to review, verify, and guarantee code quality, architectural compliance, and domain integrity across all features in the Student Management project.

---

## 1. The 4-Tier Validation Matrix

| Tier | Focus | Method / Tool | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Architecture Boundaries** | `npm run check:arch` | 0 Component -> Service/Store imports; 0 Facade -> HttpClient imports; strict explicit layering directories. |
| **Tier 2** | **TypeScript & Angular** | `npm run build` | 0 TypeScript errors, 0 `any`, pure Signals, strictly typed reactive forms, SSR safety, 0 CSS budget warnings (< 4.0 kB). |
| **Tier 3** | **Domain Business Logic** | Code Review & Specs | Valid regex codes (CLS/GV/MH), grades 0–10, foreign key deletion safety, RBAC permissions. |
| **Tier 4** | **Automated Pipeline** | `npm run verify` | All gates pass sequentially (`check:arch` ➔ `build` ➔ `test:ci`) with 100% pass rate. |

---

## 2. Validation Execution Procedure

Follow this checklist whenever evaluating code changes:

### Phase 1: Automated Pipeline (`Tier 4`)
Execute the full automated verification suite:

```bash
cmd /c npm run verify
```

If any sub-step fails, diagnose and fix according to the **Failure Remediation Guide** below.

### Phase 2: Layer & Boundary Verification (`Tier 1`)
- [ ] Inspect modified components: Do they inject **only Facades**, `FormBuilder`, and `Router`?
- [ ] Inspect modified facades: Are they free from `HttpClient` imports?
- [ ] Verify feature directories contain only standard folders (`components`, `facades`, `models`, `services`, `store`, `<feature>.routes.ts`).

### Phase 3: Technical & Reactivity Check (`Tier 2`)
- [ ] Check for `any`: Zero occurrences allowed.
- [ ] Check reactivity: Signals (`signal()`, `computed()`) used for view state; no unmanaged subscriptions.
- [ ] Form submission safety: Uses `form.getRawValue()` when fields are disabled during editing.
- [ ] SSR safety: Browser objects (`sessionStorage`, `window`) checked with `typeof ... !== 'undefined'`.
- [ ] Styling: Component-scoped CSS is kept below 4.0 kB and reuses classes from `src/app/shared/styles/design-system.css`.

### Phase 4: Domain & Business Rules Check (`Tier 3`)
- [ ] Regex patterns match standard prefixes (`CLS`, `GV`, `MH`, academic year `YYYY-YYYY`).
- [ ] Grade inputs validated between `0` and `10`.
- [ ] Referential integrity verified before deletion (e.g. cannot delete a class that has enrolled students).
- [ ] Permission checks in templates use `@if (authFacade.can('...'))`.
- [ ] Unit tests provide mock `AuthFacade` returning `can: () => true` to render gated action controls.

---

## 3. Failure Remediation Guide

### 1. `npm run check:arch` Fails:
- **Cause**: A component directly imported a service or store, or a facade imported `HttpClient`.
- **Fix**: Expose the required data/action in the feature's Facade and update the Component to call the Facade instead.

### 2. `npm run build` Fails:
- **Cause**: TypeScript type mismatches, missing imports, or SSR compilation issues.
- **Fix**: Resolve typing discrepancies; ensure no direct browser API calls exist without `typeof ... !== 'undefined'` guard.

### 3. `npm run test:ci` Fails:
- **`ECONNREFUSED` / mock API error**: Components or stores fired real HTTP requests because services were not mocked in `TestBed`.
  - **Fix**: Provide mock service with `{ getAll: () => of([]) }` or mock Facade in test providers.
- **Element not found (`expected null not to be null`)**:
  - **Fix**: Check if the element is protected by `@if (authFacade.can(...))`. Provide `{ provide: AuthFacade, useValue: { can: () => true, currentUser: signal(...) } }` in the spec.

### 4. `npm run build` Warning: `Component style budget exceeded`:
- **Cause**: Scoped component `.css` exceeded the 4.00 kB budget.
- **Fix**: Prune duplicate CSS rules that are already provided by `design-system.css` (e.g. table styles, button colors, resets, badge definitions).

---

## 4. References

- Detailed rules & examples: [validation-rules.md](references/validation-rules.md)
- Architecture standard: `.agents/skills/project-architecture/SKILL.md`
- Coding conventions: `.agents/skills/project-architecture/references/coding-conventions.md`
