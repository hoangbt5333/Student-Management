# Component Patterns Reference - Student Management System

This document provides standardized HTML markup structures and CSS classes from `src/app/shared/styles/design-system.css` to be used across all screens.

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
            <a [routerLink]="['/students', item.id]" class="btn btn-secondary">Chi tiết</a>
            @if (authFacade.can('manage-students')) {
              <button type="button" class="btn btn-secondary" (click)="edit(item)">Sửa</button>
              <button type="button" class="btn btn-danger" (click)="remove(item.id)">Xóa</button>
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
