# Design Tokens Reference - Student Management System

This document specifies the global design tokens defined in `src/styles.css` for consistent visual styling across all features.

---

## 1. Color Palette

### 1.1. Brand / Primary (Indigo)
Used for primary actions, active navigation items, key highlights, and focus states.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-primary-50` | `#eef2ff` | Subtle highlights, active row backgrounds |
| `--color-primary-100` | `#e0e7ff` | Focus rings, light badge backgrounds |
| `--color-primary-500` | `#6366f1` | Secondary brand accents |
| `--color-primary-600` / `--color-primary` | `#4f46e5` | **Default primary buttons, links, active borders** |
| `--color-primary-700` / `--color-primary-hover` | `#4338ca` | Hover state for primary buttons |
| `--color-primary-900` | `#312e81` | Deep contrast text |

### 1.2. Neutrals (Slate)
Used for backgrounds, borders, typography, and card surfaces.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-slate-50` / `--color-bg-page` | `#f8fafc` | Page background, table header background |
| `--color-slate-100` | `#f1f5f9` | Secondary button backgrounds, hover fills |
| `--color-slate-200` / `--color-border` | `#e2e8f0` | Standard card and table borders |
| `--color-slate-300` | `#cbd5e1` | Input borders, secondary button borders |
| `--color-slate-500` / `--color-text-muted` | `#64748b` | Subtitles, count text, empty state labels |
| `--color-slate-700` | `#334155` | Form labels, table cell text |
| `--color-slate-800` | `#1e293b` | Navigation header background, headings |
| `--color-slate-900` / `--color-text-main` | `#0f172a` | Primary page headings, strong text |

### 1.3. Semantic Feedback
- **Success (Emerald)**:
  - Token: `--color-success` (`#10b981`), Bg: `--color-success-bg` (`#ecfdf5`), Text: `--color-success-text` (`#065f46`).
  - Used for pass grades, success notifications, active statuses.
- **Danger (Rose/Red)**:
  - Token: `--color-danger` (`#ef4444`), Bg: `--color-danger-bg` (`#fef2f2`), Text: `--color-danger-text` (`#991b1b`).
  - Used for delete buttons, fail grades (< 5.0), error banners, form invalid hints.
- **Warning (Amber)**:
  - Token: `--color-warning` (`#f59e0b`), Bg: `--color-warning-bg` (`#fffbeb`), Text: `--color-warning-text` (`#92400e`).
  - Used for caution alerts, pending items.
- **Info (Sky)**:
  - Token: `--color-info` (`#0ea5e9`), Bg: `--color-info-bg` (`#f0f9ff`), Text: `--color-info-text` (`#0369a1`).

---

## 2. Typography

- **Font Family**:
  - Base: `var(--font-family-base)` (Inter, system-ui, -apple-system, Segoe UI, Roboto)
  - Monospace: `var(--font-family-mono)` (Code, IDs, student numbers)
- **Size Scale**:
  - `var(--font-size-xs)`: `0.75rem` (12px) - Badges, table headers, form errors
  - `var(--font-size-sm)`: `0.875rem` (14px) - Table cells, buttons, inputs, helper text
  - `var(--font-size-base)`: `1rem` (16px) - Body text, standard content
  - `var(--font-size-lg)`: `1.125rem` (18px) - Card titles, form section headings
  - `var(--font-size-xl)`: `1.25rem` (20px) - Sub-page titles
  - `var(--font-size-2xl)`: `1.5rem` (24px) - Page main headings (`h1`)
- **Weights**:
  - `var(--font-weight-normal)`: 400
  - `var(--font-weight-medium)`: 500
  - `var(--font-weight-semibold)`: 600
  - `var(--font-weight-bold)`: 700

---

## 3. Spacing, Elevation & Radii

- **Spacing Scale (4px Base Grid)**:
  - `var(--space-1)` = `4px`
  - `var(--space-2)` = `8px`
  - `var(--space-3)` = `12px`
  - `var(--space-4)` = `16px`
  - `var(--space-5)` = `20px`
  - `var(--space-6)` = `24px`
  - `var(--space-8)` = `32px`
- **Border Radii**:
  - `var(--radius-sm)`: `4px` (Inputs, tags)
  - `var(--radius-md)`: `6px` (Buttons, form fields)
  - `var(--radius-lg)`: `8px` (Cards, tables, modals)
  - `var(--radius-full)`: `9999px` (Pill badges, avatars)
- **Box Shadows**:
  - `var(--shadow-xs)`: Subtle card / button elevation.
  - `var(--shadow-sm)`: Standard card elevation.
  - `var(--shadow-md)`: Dropdown and dialog elevation.
