# CLAUDE.md - Student Management System

Tài liệu hướng dẫn ngữ cảnh, quy chuẩn kiến trúc và quy trình làm việc cho Claude Code trong dự án **Student Management System**.

---

## 1. Tổng quan dự án

- **Dự án**: Student Management System (Hệ thống quản lý sinh viên).
- **Tech Stack**:
  - **Framework**: Angular 22 (Standalone Components, Signals, Reactive Forms, Router).
  - **State Management**: NgRx SignalStore (`@ngrx/signals`), RxJS.
  - **Rendering**: Angular SSR (Prerender & Client Hydration), Express server.
  - **Testing**: Vitest (`@angular/build:unit-test` builder).
  - **Mock Backend**: `json-server` (port 3001, dữ liệu tại `db.json`).
- **Các phân hệ chính (`src/app/features/`)**:
  - `students`: Quản lý sinh viên, tìm kiếm không dấu, phân trang, lọc theo lớp.
  - `classes`: Quản lý lớp học, kiểm tra niên khóa, ràng buộc sinh viên.
  - `teachers`: Quản lý giảng viên, liên kết khoa/bộ môn.
  - `subjects`: Quản lý môn học, số tín chỉ, phân công giảng viên.
  - `grades`: Bảng điểm, tính điểm trung bình (thang điểm 0 - 10), liên kết sinh viên/môn học.
  - `users`: Quản lý tài khoản, phân quyền RBAC (`admin`, `teacher`, `student`).
  - `dashboard`: Thống kê tổng quan số liệu sinh viên, lớp, môn học.
  - `auth`: Xác thực đăng nhập demo, route guards và phân quyền UI.

---

## 2. Các lệnh phát triển cốt lõi (Essential Commands)

Chạy các lệnh từ thư mục gốc của repository:

| Mục đích | Lệnh | Ghi chú |
| :--- | :--- | :--- |
| **Chạy Frontend Dev Server** | `npm start` | Chạy tại `http://localhost:4200` |
| **Chạy Mock API (json-server)** | `npx json-server --watch db.json --port 3001` | Chạy ở terminal riêng; API port `3001` |
| **Kiểm tra ranh giới kiến trúc** | `npm run check:arch` | Chạy `scripts/check-architecture.mjs` |
| **Build ứng dụng (AOT + SSR)** | `npm run build` | Build cả browser bundle và SSR server |
| **Chạy Unit Test (CI mode)** | `npm run test:ci` | Chạy Vitest không ở chế độ watch |
| **Chạy Unit Test (Interactive)** | `npm test` | Chạy Vitest ở chế độ theo dõi file |
| **Chạy 1 file test cụ thể** | `npm test -- --include='<path-to-spec>'` | Ví dụ: `npm test -- --include='src/app/features/students/store/student.store.spec.ts'` |
| **Chạy Verification Pipeline** | `npm run verify` | Chạy tuần tự `check:arch` -> `build` -> `test:ci` |
| **Chạy SSR Server sau build** | `npm run serve:ssr:user-management` | Lắng nghe cổng `4000` (hoặc biến `PORT`) |
| **Pipeline Jira/Claude Automation** | `.\run-pipeline.ps1 <TASK-ID>` | Pipeline tự động hóa từ ticket Jira |

> [!IMPORTANT]
> **Bắt buộc**: Trước khi hoàn thành bất kỳ task nào hoặc commit code, BẮT BUỘC chạy `npm run verify` (trên Windows có thể dùng `cmd /c npm run verify`). Dự án có Git Pre-commit Hook tự động chặn commit nếu chưa pass 100%.

---

## 3. Quy chuẩn kiến trúc: Explicit Layering

Dự án tuân thủ nghiêm ngặt mô hình luồng dữ liệu đơn hướng **Explicit Layering**:

```
Component (components/) ──> Facade (facades/) ──> Store (store/) ──> Service (services/) ──> REST API
```

### 3.1. Ranh giới giữa các tầng
1. **Component (`src/app/features/<feature>/components/`)**:
   - CHỈ inject và tương tác thông qua **Facade**, `Router`, hoặc `FormBuilder`.
   - **CẤM**: Import trực tiếp từ `../services/` hoặc `../store/`.
   - **CẤM**: Tự gọi trực tiếp `HttpClient`.
2. **Facade (`src/app/features/<feature>/facades/`)**:
   - Điều phối nghiệp vụ, expose Signals (readonly) từ Store cho Component tiêu thụ.
   - **CẤM**: Inject trực tiếp `HttpClient` (mọi network I/O phải giao cho Store/Service).
3. **Store (`src/app/features/<feature>/store/`)**:
   - Sử dụng NgRx SignalStore (`signalStore`).
   - Quản lý trạng thái, signals dẫn xuất (`withComputed`), và các luồng bất đồng bộ bằng `rxMethod`.
   - Sử dụng `switchMap` cho các thao tác đọc (read/query) và `exhaustMap` / `concatMap` cho các thao tác ghi (create/update/delete).
4. **Service (`src/app/features/<feature>/services/`)**:
   - Giao tiếp REST API sử dụng Angular `HttpClient`.
   - **CẤM**: Phụ thuộc ngược lại Component, Facade, hoặc Store.
5. **Model (`src/app/features/<feature>/models/`)**:
   - Chứa pure TypeScript interfaces, types, enums, và DTOs (`Create<Entity>Dto`, `Update<Entity>Dto`).

### 3.2. Cấu trúc thư mục chuẩn của một Feature
```text
src/app/features/<feature>/
├── components/          # UI Components (List, Form, Detail, Card, ...)
├── facades/             # <feature>.facade.ts & <feature>.facade.spec.ts
├── models/              # <feature>.model.ts
├── services/            # <feature>.service.ts & <feature>.service.spec.ts
├── store/               # <feature>.store.ts & <feature>.store.spec.ts
└── <feature>.routes.ts  # Route configurations lazy-loaded
```

Thư mục dùng chung:
- `src/app/core/`: Authentication, HTTP interceptors, Guards, Global Notification/Toast service.
- `src/app/shared/`: Shared components (`layout`, `pagination`, `modal`), directives (`tooltip`), utilities (`vietnamese.util.ts`), và style hệ thống.

---

## 4. Chuẩn mực lập trình (Coding Conventions)

### 4.1. TypeScript & Angular 22
- **Zero `any` Policy**: Tuyệt đối không dùng kiểu `any`. Luôn định nghĩa rõ interface hoặc dùng generic / `unknown` kèm type guard.
- **Standalone Components**: 100% components là `standalone: true`.
- **Modern Reactivity (Signals)**:
  - Dùng `signal()`, `computed()` để quản lý state nội bộ.
  - Hàm trong `computed()` phải là pure function, tuyệt đối không gây side-effect.
  - Sử dụng hàm `inject(...)` thay vì constructor parameter injection.
- **Angular Control Flow**: Dùng cú pháp `@if`, `@switch`, `@for (item of items(); track item.id)`. Luôn khai báo `track` rõ ràng.
- **Reactive Forms**:
  - Khai báo typed forms với `FormBuilder.nonNullable.group({...})`.
  - Khi submit form chứa field bị disable (ví dụ mã entity/ID), dùng `form.getRawValue()` thay vì `form.value` để tránh bị mất dữ liệu field đó.
- **SSR & Node.js Safety**:
  - Không truy cập trực tiếp `window`, `document`, `sessionStorage`, `localStorage` mà không kiểm tra môi trường:
    ```typescript
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.getItem('key');
    }
    ```

### 4.2. UI & Design Tokens
- Các trang danh sách và form chuẩn hóa giao diện theo design token của dự án.
- Import style dùng chung từ `shared/styles/catalog.css` hoặc `shared/styles/design-system.css`.
- Đảm bảo hiển thị nhất quán về badge trạng thái, nút hành động, thanh tìm kiếm/bộ lọc và phân trang.

---

## 5. Quy tắc nghiệp vụ (Domain & Integrity Rules)

### 5.1. Định dạng mã & Validate dữ liệu
- **Mã lớp học**: Định dạng `/^CLS\d{3,}$/` (ví dụ: `CLS001`, `CLS102`).
- **Mã giảng viên**: Định dạng `/^GV\d{3,}$/` (ví dụ: `GV001`).
- **Mã môn học**: Định dạng `/^MH\d{3,}$/` (ví dụ: `MH001`).
- **Niên khóa**: Định dạng `/^\d{4}-\d{4}$/` (ví dụ: `2025-2026`).
- **Số điện thoại**: `/^[0-9]{10}$/` (10 chữ số).
- **Thang điểm**: Điểm số từ `0` đến `10` (`Validators.min(0)`, `Validators.max(10)`).
- **Tính duy nhất điểm số**: Một sinh viên chỉ có tối đa 1 bản ghi điểm cho một môn học cụ thể `(studentId, subjectId)`.

### 5.2. Ràng buộc toàn vẹn khi xóa (Referential Integrity)
Trước khi xóa dữ liệu từ API mock:
- **Xóa lớp**: Kiểm tra không có sinh viên nào thuộc lớp đó (`student.classId === class.id`).
- **Xóa giảng viên**: Kiểm tra giảng viên không phụ trách môn học nào (`subject.teacherId === teacher.id`).
- **Xóa môn học**: Kiểm tra không có bản ghi điểm nào liên quan (`grade.subjectId === subject.id`).
- **Xóa sinh viên**: Kiểm tra và cảnh báo các bản ghi điểm gắn với sinh viên.

### 5.3. Phân quyền (RBAC) & Testing
- Các hành động trong UI được bảo vệ qua `@if (authFacade.can('permission-name'))`.
- **Lưu ý khi viết Unit Test**: Cần provide mock `AuthFacade` với `{ can: () => true }` trong `TestBed` để các nút/form được render đầy đủ khi kiểm thử.

---

## 6. Quy trình làm việc theo loại Ticket (Bug / Refactor / Feature)

Khi nhận task hoặc chạy trong pipeline, xử lý theo đúng phân loại ticket:

### 6.1. Nếu là `bug` (Áp dụng skill `debugging`)
1. **TDD / Regression Test First**: Viết unit test (Vitest) tái hiện chính xác lỗi trước khi sửa mã nguồn.
2. **Root Cause Analysis**: Xác định chính xác lỗi thuộc tầng nào (Store, Service, Facade, Component).
3. **Minimal Diff**: Chỉ sửa chính xác nguyên nhân gốc rễ, giữ git diff gọn gàng, tránh sửa lan man.
4. **Verification**: Sau khi sửa, test case tái hiện lỗi phải PASS và toàn bộ test suite cũ không bị ảnh hưởng.

### 6.2. Nếu là `refactor` (Áp dụng skill `refactoring`)
1. **Bảo toàn hành vi (Behavior Preservation)**: Giữ nguyên 100% logic nghiệp vụ và contract của interface/public API.
2. **Test Safety**: Toàn bộ unit tests hiện có phải PASS mà không cần sửa đổi assertions.
3. Không thêm bớt tính năng ngoài phạm vi refactor.

### 6.3. Nếu là `feature` (Áp dụng skill `feature-development`)
1. Phân rã theo thứ tự phụ thuộc kiến trúc: `Model -> Service/Store -> Facade -> Component -> Route`.
2. Viết unit test bao phủ cho Store, Facade và Component.
3. Sử dụng đúng design system và chuẩn UI component.

---

## 7. Quy định Git & Commit

- **Quy chuẩn commit message**:
  - `feat(scope): <mô tả ngắn>`: Tính năng mới.
  - `fix(scope): <mô tả ngắn>`: Sửa lỗi.
  - `refactor(scope): <mô tả ngắn>`: Tái cấu trúc code.
  - `test(scope): <mô tả ngắn>`: Bổ sung hoặc chỉnh sửa unit test.
- **Thư mục tạm & Bí mật**:
  - **TUYỆT ĐỐI KHÔNG** commit thư mục `tasks/` (chứa ticket và phân tích tạm thời).
  - **TUYỆT ĐỐI KHÔNG** commit file `.env` hoặc các credentials nhạy cảm.
- Luôn kiểm tra `git status` và `git diff` trước khi commit.

---

## 8. Cấu trúc Subagents & Skills trong `.claude/`

Trong thư mục `.claude/` đã cấu hình sẵn:
- **Agents (`.claude/agents/`)**:
  - `planner.md`: Phân rã ticket thành subtasks theo loại ticket (Chỉ lên kế hoạch, không sửa code).
  - `analyst.md`: Khảo sát codebase, tìm root cause hoặc giải pháp kỹ thuật (Chỉ đọc code).
  - `coder.md`: Triển khai code Angular, viết unit test, chạy verify và commit.
  - `reviewer.md`: Review `git diff main...HEAD` theo tiêu chuẩn kỹ thuật và trả về kết luận `VERDICT`.
  - `doc-writer.md`: Soạn thảo PR description chuẩn mẫu và changelog.
- **Skills (`.claude/skills/`)**:
  - `project-architecture`: Hướng dẫn ranh giới phân tầng và quy ước thư mục.
  - `code-validation`: Bộ quy tắc kiểm tra 4-tier code quality.
  - `feature-development`: Quy trình phát triển tính năng mới.
  - `debugging`: Quy trình chẩn đoán lỗi và TDD.
  - `refactoring`: Các mẫu tái cấu trúc code an toàn.
  - `ui-standardization`: Chuẩn hóa giao diện theo design system.
