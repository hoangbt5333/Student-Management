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
- `npm run verify` — run check:arch, build, and full test suite.
- `npm run serve:ssr:user-management` — serve the previously built SSR app (default port 4000; configurable with `PORT`).

The app expects a mock REST API on port 3001. Services currently use hard-coded `http://localhost:3001` URLs.

This is an Angular 22 standalone application.
- Data-access pattern: `Component → Facade → NgRx Signal Store → Service → REST API`.
- Stores own feature state and asynchronous operations; computed signals derive view data.
- Facades expose state and operations to components.
- State management uses `@ngrx/signals`.
- UI uses Angular Standalone Components, Signal-based reactivity, and control flow (`@if`, `@for`).

---

## 2. Quy trình làm việc (Workflow Modes)

Claude Code linh hoạt chuyển đổi giữa 2 chế độ tùy theo độ phức tạp và yêu cầu của người dùng:

### Chế độ 1: Trực tiếp (Mặc định cho các task thông thường / task nhỏ)
- **Mục tiêu:** Tối ưu hóa chi phí token, phản hồi nhanh và giải quyết trực tiếp.
- **Áp dụng:** Các utility, bug fix nhỏ, chỉnh sửa style, refactor đơn giản, hoặc khi người dùng không yêu cầu subagents.
- **Nguyên tắc:**
  1. Claude tự đọc hiểu mã nguồn, lập luận và triển khai trực tiếp trong phiên hiện tại.
  2. Luôn tuân thủ kiến trúc Explicit Layering.
  3. Chỉ chạy **Targeted Test** cho file liên quan (`npm run test:ci -- --include='<path-to-spec>'`) để kiểm chứng kết quả; không chạy full test suite cho các sửa đổi nhỏ.
  4. Đảm bảo working tree sạch sẽ sau khi hoàn thành.

---

### Chế độ 2: Subagents Workflow (Khi người dùng yêu cầu trong prompt hoặc feature lớn)
- **Kích hoạt khi:** Prompt người dùng có yêu cầu gọi subagent (ví dụ: *"theo quy trình subagent"*, *"dùng architect/coder/reviewer"*, *"chạy theo mô hình điều phối"*, hoặc khi triển khai các module/feature lớn cần kiểm soát chặt chẽ).
- Khi kích hoạt chế độ này, phiên chính đóng vai trò là **Lead Orchestrator** điều phối các subagents trong `.claude/agents/`:

1. **`architect`**: Phân tích codebase và đề xuất kế hoạch kỹ thuật ngắn gọn cùng file spec cần test.
2. **User Confirmation**: Trình kế hoạch cho người dùng duyệt nhanh trước khi triển khai.
3. **`coder`**: Triển khai mã nguồn trên worktree riêng, chạy targeted test (`npm run test:ci -- --include='<spec>'`), xác nhận test pass và commit thay đổi lên nhánh riêng.
4. **Lead Merge & Verification**:
   - Lead không chạy lệnh test bên trong worktree của Coder.
   - Lead merge nhánh của Coder vào `main` (`git merge <branch> --no-edit`).
   - Trên `main`, Lead xác minh `artifacts/test-results.json` hoặc chạy lại targeted test 1 lần nếu cần.
5. **`reviewer`**: Soát commit vừa merge (`git diff HEAD~1`) và đối soát bằng chứng test report.
6. **`release-agent`**: Tổng hợp mô tả thay đổi (PR description) hoặc cập nhật Jira nếu có yêu cầu.
