# CLAUDE.md - Student Management System

Tài liệu hướng dẫn ngữ cảnh, quy chuẩn kiến trúc và quy trình làm việc cho Claude Code trong dự án **Student Management System**.

---

## 1. Tổng quan dự án

- `npm start` — start the Angular dev server at `http://localhost:4200`.
- `npm run build` — production build, including the configured server/SSR output.
- `npm run watch` — rebuild continuously in development configuration.
- `npm run test:ci` — canonical test command; runs non-watch mode, outputs to console and writes JSON report to `artifacts/test-results.json`.
  - Specific file: `npm run test:ci -- --include='<path-to-spec>'`
- `npm run check:arch` — check Explicit Layering architecture boundary violations.
- `npm run validate` — deterministic automated validation (check:arch + typecheck + targeted test).
  - Specific file: `npm run validate -- --spec='<path-to-spec>'`
- `npm run verify` — run check:arch, build, and full test suite.
- `npm run serve:ssr:user-management` — serve the previously built SSR app (default port 4000; configurable with `PORT`).

The app expects a mock REST API on port 3001. Services currently use hard-coded `http://localhost:3001` URLs.
This is an Angular 22 standalone application with Server-Side Rendering (SSR), NgRx SignalStore (`@ngrx/signals`), and Vitest.

---

## 2. Kiến trúc dự án (Explicit Layering Standard)

Dự án áp dụng mô hình phân tầng đơn hướng nghiêm ngặt (được kiểm soát tự động bằng `npm run check:arch`):

```text
Component ──> Facade ──> Store (SignalStore) ──> Service (HttpClient) ──> REST API
```

### Cấu trúc thư mục chuẩn (`src/app/features/<feature>/`):
- `components/`: UI components (Standalone Components, Signal-based reactivity, control flow `@if`, `@for`).
- `facades/`: `<feature>.facade.ts` (điều phối nghiệp vụ, cung cấp Signals và action cho components).
- `models/`: `<feature>.model.ts` (TypeScript interfaces/types dữ liệu thuần túy).
- `services/`: `<feature>.service.ts` (thực hiện HTTP REST API calls qua Angular `HttpClient`).
- `store/`: `<feature>.store.ts` (quản lý feature state và side-effects bằng `@ngrx/signals`).
- `<feature>.routes.ts`: Cấu hình routing của feature.
- Shared code: Nằm trong `src/app/shared/` (`utils/` cho helper functions thuần túy, `components/` cho layout, modal, button...).

### Ranh giới kiến trúc bắt buộc (Strict Boundary Rules):
1. **Component**: CHỈ ĐƯỢC inject và gọi **Facade**. TUYỆT ĐỐI KHÔNG import hoặc gọi trực tiếp từ `services/`, `store/`, hoặc `HttpClient`.
2. **Facade**: Quản lý phối hợp giữa Store và Service. Không inject `HttpClient` trực tiếp.
3. **Store**: Dùng `signalStore`. Không depend vào Component hay Facade.
4. **Service**: Chỉ giao tiếp REST API. Không depend vào Component, Facade hay Store.

*(Chi tiết đầy đủ về các feature và ranh giới xem tại: `.claude/skills/project-architecture/SKILL.md`)*

---

## 3. Quy trình làm việc (Workflow Modes)

Claude Code linh hoạt chuyển đổi giữa 2 chế độ tùy theo độ phức tạp và yêu cầu của người dùng:

### Chế độ 1: Trực tiếp (Mặc định cho các task thông thường / task nhỏ)
- **Mục tiêu:** Tối ưu hóa chi phí token, phản hồi nhanh và giải quyết trực tiếp.
- **Áp dụng:** Các utility, bug fix nhỏ, chỉnh sửa style, refactor đơn giản, hoặc khi người dùng không yêu cầu subagents.
- **Nguyên tắc:**
  1. Claude tự đọc hiểu mã nguồn, lập luận và triển khai trực tiếp trong phiên hiện tại.
  2. Luôn tuân thủ kiến trúc Explicit Layering ở Mục 2.
  3. Chạy **Automated Validation** (`npm run validate -- --spec='<path-to-spec>'`) để kiểm chứng kết quả trong vài giây; không chạy full test suite cho các sửa đổi nhỏ.
  4. Đảm bảo working tree sạch sẽ sau khi hoàn thành.

---

### Chế độ 2: Subagents Workflow (Quy trình 8 bước Enterprise)
- **Kích hoạt khi:** Prompt người dùng có yêu cầu gọi subagent (ví dụ: *"theo quy trình subagent"*, *"chạy quy trình 8 bước"*, *"dùng architect/coder/reviewer"*), hoặc khi triển khai các module/feature lớn cần kiểm soát chất lượng chặt chẽ.
- **Quy tắc bất khả xâm phạm của Main Agent (Lead Orchestrator):**
  - TUYỆT ĐỐI KHÔNG tự vào Plan Mode (`Entered plan mode`) ở phiên chính.
  - TUYỆT ĐỐI KHÔNG tự tìm kiếm/đọc nhiều file trong phiên chính để tự thiết kế giải pháp. Toàn bộ việc khảo sát codebase, phân tích patterns và thiết kế thuộc 100% trách nhiệm của `architect`.
  - HÀNH ĐỘNG ĐẦU TIÊN khi nhận lệnh: Spawn ngay lập tức subagent `architect`.

#### Bước 1: Tiếp nhận & Ủy quyền tức thì (Main Agent)
- Main Agent tiếp nhận yêu cầu và kết nối Jira MCP nếu được yêu cầu.
- Ngay lập tức gọi `architect` với đầy đủ yêu cầu của User mà không tự phân tích hay đọc file trước.

#### Bước 2: Kiến trúc & Đặc tả kỹ thuật (`architect`)
- `architect` độc lập khảo sát codebase, phân tích kiến trúc chi tiết, xác định phạm vi thay đổi và các tầng bị ảnh hưởng.
- **Tạo Acceptance Criteria (AC)**: Checklist tiêu chí nghiệm thu rõ ràng (`[ ] AC-1`, `[ ] AC-2...`) làm căn cứ cho Reviewer đối soát.
- **Phân rã task & Lập kế hoạch song song**: Chia nhỏ task, xác định dependencies. Đánh dấu `[PARALLEL]` cho các task độc lập (nghiêm ngặt áp dụng quy tắc *"Một file - Một Coder"* để triệt tiêu xung đột Git) hoặc `[SEQUENTIAL]` cho các task phụ thuộc.

#### Bước 3: Người dùng phê duyệt (User Approval)
- Trình kế hoạch kỹ thuật, Acceptance Criteria và phương án phân rã task cho User duyệt.
- Nếu User không đạt: `architect` điều chỉnh lại kế hoạch cho đến khi thống nhất.

#### Bước 4: Điều phối thực thi đa Coder (Main Agent Orchestrator)
- Main Agent phân công task cho các subagent Coder làm việc trên các worktree độc lập:
  - Coder A làm việc trên Worktree A.
  - Coder B làm việc trên Worktree B.
  - Các task độc lập (`[PARALLEL]`) được kích hoạt chạy đồng thời; các task phụ thuộc (`[SEQUENTIAL]`) chờ đợt trước hoàn thành.

#### Bước 5: Automated Validation (Chốt chặn tự động - Scripts & Hooks)
- Mỗi Coder chạy validation tự động trực tiếp trên worktree bằng lệnh:
  ```bash
  npm run validate -- --spec='<path-to-spec>'
  ```
  *(Chuỗi lệnh tự động: Prettier format hook $\rightarrow$ Kiểm tra kiến trúc `check:arch` $\rightarrow$ TypeScript type check `tsc --noEmit` $\rightarrow$ Targeted Unit Test $\rightarrow$ Xuất report `artifacts/test-results.json`).*
- Coder tự sửa mọi lỗi phát sinh trên worktree. Chỉ commit khi toàn bộ kiểm tra tự động báo xanh 100%.

#### Bước 6: Thẩm định chất lượng (`reviewer`)
- `reviewer` tiến hành audit độc lập trên nhánh của Coder trước khi merge (`git diff main...<branch>`).
- Đối chiếu 100% với checklist **Acceptance Criteria (AC)** của Bước 2.
- Kiểm tra kiến trúc phân tầng, logic nghiệp vụ, bảo mật và đối soát bằng chứng testing.
- Đưa ra kết luận:
  - `CHANGES_REQUESTED`: Chuyển feedback cho Coder sửa lại trên worktree (tối đa 2 vòng lặp; nếu vượt quá thì báo cáo User can thiệp).
  - `APPROVED`: Xác nhận đạt chuẩn để chuyển sang bước Tích hợp.

#### Bước 7: Tích hợp hệ thống (Integration - Main Agent)
- Main Agent nhận các nhánh/commit đã được `reviewer` duyệt `APPROVED` và merge vào nhánh tích hợp (`main`): `git merge <branch> --no-edit`.
- **Xử lý xung đột (nếu có)**: Main Agent yêu cầu Coder rebase (`git fetch origin main && git rebase main`), tự giải quyết conflict trên worktree, chạy lại `npm run validate` rồi nộp lại. Main Agent không trực tiếp sửa mã nguồn.
- Chạy kiểm tra tích hợp / regression test nếu cần.

#### Bước 8: Tài liệu & Báo cáo phát hành (`documentation-agent` / `release-agent`)
- Đối chiếu code đã tích hợp với tài liệu hiện hành.
- Cập nhật `README.md` hoặc tài liệu API trong `docs/` nếu có thay đổi interface/cấu hình.
- Tổng hợp PR description, release notes và đồng bộ cập nhật ticket trên Jira.
- Báo cáo hoàn tất cho User.
