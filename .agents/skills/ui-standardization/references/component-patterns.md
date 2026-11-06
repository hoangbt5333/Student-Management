# Component Patterns Reference - Student Management System

This document provides standardized HTML markup structures and CSS classes from `src/app/shared/styles/design-system.css` and shared primitives from `src/app/shared/` to be used across all screens.

---

## Pattern 1: Page Header with Actions

```html
<div class="page-container">
  <header class="page-header">
    <div>
      <h1>Quản lý sinh viên</h1>
      <p>Danh sách hồ sơ sinh viên, thông tin lớp học và trạng thái học tập.</p>
    </div>
    @if (authFacade.can('manage-students')) {
      <button type="button" class="btn btn-primary primary-button" (click)="openCreateModal()">
        + Thêm sinh viên
      </button>
    }
  </header>
</div>
```

> **Testing Rule**: Always include `primary-button` on primary action buttons so existing unit test selectors like `By.css('button.primary-button')` continue to pass without modification.

---

## Pattern 2: Search & Filter Toolbar

```html
<section class="toolbar">
  <div class="search-box">
    <input
      type="text"
      placeholder="Tìm kiếm theo tên hoặc mã sinh viên..."
      [value]="searchTerm()"
      (input)="onSearch($event)"
    />
  </div>

  <div class="filters">
    <label>
      <span>Lớp:</span>
      <select [value]="selectedClass()" (change)="onFilterChange($event)">
        <option value="">Tất cả các lớp</option>
        @for (item of classes(); track item.id) {
          <option [value]="item.id">{{ item.name }}</option>
        }
      </select>
    </label>
    <span class="count">Tổng cộng: {{ totalCount() }}</span>
  </div>
</section>
```

---

## Pattern 3: Data Table with Actions & Badges

```html
<div class="table-card">
  <table class="data-table">
    <thead>
      <tr>
        <th>Mã SV</th>
        <th>Họ và tên</th>
        <th>Lớp</th>
        <th>Điểm TB</th>
        <th>Trạng thái</th>
        <th>Thao tác</th>
      </tr>
    </thead>
    <tbody>
      @for (item of items(); track item.id) {
        <tr>
          <td><code>{{ item.code ?? item.id }}</code></td>
          <td><strong>{{ item.fullName }}</strong></td>
          <td>{{ item.className }}</td>
          <td><span class="score">{{ item.gpa }}</span></td>
          <td>
            <span class="badge" [class.badge-success]="item.status === 'active'" [class.badge-neutral]="item.status !== 'active'">
              {{ item.status === 'active' ? 'Đang học' : 'Nghỉ' }}
            </span>
          </td>
          <td class="actions">
            <a [routerLink]="['/students', item.id]" class="btn btn-secondary" appTooltip="Xem chi tiết">Chi tiết</a>
            @if (authFacade.can('manage-students')) {
              <button type="button" class="btn btn-secondary" (click)="edit(item)" appTooltip="Chỉnh sửa thông tin">Sửa</button>
              <button type="button" class="btn btn-danger" (click)="remove(item.id)" appTooltip="Xóa bản ghi">Xóa</button>
            }
          </td>
        </tr>
      } @empty {
        <tr>
          <td colspan="6" class="empty">Không có dữ liệu phù hợp.</td>
        </tr>
      }
    </tbody>
  </table>
</div>
```

---

## Pattern 4: Form Card / Modal Edit Form

```html
<div class="form-card">
  <h2>{{ isEditMode() ? 'Chỉnh sửa sinh viên' : 'Thêm sinh viên mới' }}</h2>
  
  <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid">
    <div class="form-group">
      <label for="code">Mã sinh viên *</label>
      <input id="code" type="text" formControlName="code" />
      @if (form.controls.code.touched && form.controls.code.invalid) {
        <small class="form-error">Mã sinh viên không hợp lệ.</small>
      }
    </div>

    <div class="form-group">
      <label for="fullName">Họ và tên *</label>
      <input id="fullName" type="text" formControlName="fullName" />
      @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
        <small class="form-error">Vui lòng nhập họ và tên.</small>
      }
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" (click)="onCancel()">Hủy</button>
      <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading()">
        {{ loading() ? 'Đang lưu...' : 'Lưu thông tin' }}
      </button>
    </div>
  </form>
</div>
```

---

## Pattern 5: Metric Summary Cards (Dashboard)

```html
<div class="metrics-grid">
  <div class="metric-card">
    <span class="metric-label">Tổng số sinh viên</span>
    <span class="metric-value">{{ studentCount() }}</span>
    <span class="metric-hint text-success">+5% so với học kỳ trước</span>
  </div>
</div>
```

---

## Pattern 6: Shared Pagination Component (`<app-pagination>`)

Use the shared, signal-based pagination component (`PaginationComponent` from `src/app/shared/components/pagination/`) across all data list tables.

### TypeScript Component Import:
```ts
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  standalone: true,
  imports: [PaginationComponent, ...],
  ...
})
```

### Template Usage:
```html
<app-pagination
  [currentPage]="userFacade.page()"
  [totalItems]="userFacade.totalFilteredCount()"
  [pageSize]="userFacade.pageSize()"
  [pageSizeOptions]="[5, 10, 20, 50]"
  itemLabel="tài khoản"
  (pageChange)="userFacade.setPage($event)"
  (pageSizeChange)="userFacade.setPageSize($event)"
/>
```

---

## Pattern 7: Shared Tooltip Directive (`[appTooltip]`)

Use `TooltipDirective` (`src/app/shared/directives/tooltip/tooltip.directive.ts`) to provide instant hover feedback on action buttons, disabled buttons, and icon buttons.

### TypeScript Component Import:
```ts
import { TooltipDirective } from '../../../../shared/directives/tooltip/tooltip.directive';

@Component({
  standalone: true,
  imports: [TooltipDirective, ...],
  ...
})
```

### Template Usage:
```html
<!-- Action buttons with clear text & tooltip -->
<button
  type="button"
  class="btn btn-secondary btn-sm"
  (click)="openDetail(item)"
  appTooltip="Xem thông tin chi tiết"
>
  Chi tiết
</button>

<!-- Disabled button explaining why the action is blocked -->
<button
  type="button"
  class="btn btn-sm btn-lock"
  [disabled]="isSelf(user)"
  [appTooltip]="isSelf(user) ? 'Không thể tự khóa tài khoản của chính bạn' : 'Khóa tài khoản'"
  (click)="toggleLock(user)"
>
  Khóa
</button>

<!-- Icon-only button with positioning -->
<div
  class="header-notifications"
  appTooltip="Thông báo hệ thống"
  tooltipPosition="bottom"
>
  <svg ...></svg>
</div>
```

---

## Pattern 8: App Shell Layout (2-Column Architecture)

The application shell uses a full-viewport, 2-column layout:
- **Left Column**: `<app-sidebar>` (`width: 240px`, background `#111e35`, full height).
- **Right Column**: `<div class="workspace-area">` containing `<app-header>` (`height: 70px`, background `#ffffff`) and `<main class="app-workspace">` (`<router-outlet>`).

```html
<div class="app-layout">
  @if (isLoggedIn()) {
    <app-sidebar class="app-sidebar-pane" />
  }
  <div class="workspace-area">
    <app-header />
    <main class="app-workspace">
      <router-outlet />
    </main>
  </div>
</div>
```
