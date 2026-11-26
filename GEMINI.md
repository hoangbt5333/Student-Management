<!-- framework:start -->
# Agent Framework Guidelines for Antigravity (v0.4.0)

> **Notice:** This section is managed by `agent-framework`. Do not edit directly; changes will be overwritten upon upgrade.

## Multi-Agent Workflow Rules
1. **Core vs Project Boundary:** Tuyệt đối không sửa file trong `core/`, `orchestrator/`, `state/`, `logs/`, `.agents/`, `.claude/`, hoặc `project.config.json` để phục vụ nhu cầu riêng của từng Task.
2. **Canonical Orchestration Commands:**
   - **Khởi tạo Execution:** `node orchestrator/cli.mjs init --exec <id> --tasks tasks.json`
   - **Tạo Task Worktree:** `node orchestrator/cli.mjs worktree <task_id> --exec <id>` *(tự động tạo worktree từ nhánh integration/<id>, cài đặt node_modules qua pnpm và chuyển task sang in_progress)*
   - **Kiểm định Coder Gate:** `node orchestrator/validate.mjs <task_id> ../wt/<task_id> --exec <id> --base integration/<id>`
   - **Bàn giao Task:** Coder tạo `.task-report.json` trong worktree với `result: "READY_FOR_REVIEW"`.
   - **Ghi nhận Review:** `node orchestrator/cli.mjs review-record <task_id> --exec <id> --verdict APPROVED`
   - **Tích hợp Task:** `node orchestrator/cli.mjs integrate <task_id> --exec <id> --clean-worktree`
   - **Báo cáo Tổng kết:** `node orchestrator/cli.mjs report --exec <id> --format markdown`
   - **Tự động Phục hồi:** `node orchestrator/cli.mjs recover --exec <id>`
3. **Nguyên tắc Điều phối Song song (Parallel Dispatching):**
   - Khi `node orchestrator/cli.mjs next --exec <id>` trả về nhiều task sẵn sàng trong mảng `ready` (không có dependency và không xung đột `owned_files`), Coordinator **BẮT BUỘC PHẢI KHỞI CHẠY SONG SONG**:
     1. Tạo worktree cho toàn bộ các task sẵn sàng.
     2. Gọi đồng thời (batch) các công cụ `invoke_subagent` cho từng Coder trong cùng 1 lượt xử lý.
     3. TUYỆT ĐỐI không chờ Task 1 hoàn tất tích hợp mới bắt đầu Task 2.
4. **Task Scope & Guardrails:**
   - Khi Coordinator ủy quyền cho Coder Subagent (`invoke_subagent`), Coder làm việc strictly trong worktree `../wt/<task_id>` và chỉ sửa các file thuộc `owned_files`.
   - Các hành vi sửa ngoài worktree hoặc chạy lệnh cấm (`git push`, `rm -rf`, v.v.) sẽ bị Hook `guard-edit` và `guard-bash` chặn ngay lập tức.
5. **Security & Permissions:**
   - Git push, xóa branch, và merge vào main cần người dùng phê duyệt trực tiếp.
   - Không được đọc các file nhạy cảm khớp `.env*` hoặc khóa bảo mật (`.pem`, `.key`).
<!-- framework:end -->

## Workflow Modes (Quy trình làm việc)

Agent linh hoạt hoạt động theo 2 chế độ:

### Chế độ 1: Trực tiếp / Single-Agent (MẶC ĐỊNH cho hầu hết các yêu cầu)
- **Áp dụng:** Bug fix, refactor, thêm tính năng vừa/nhỏ, viết test, căn chỉnh UI, hoặc bất kỳ task nào người dùng không yêu cầu dùng subagent/orchestrator.
- **Nguyên tắc hoạt động:**
  1. Agent tự đọc hiểu mã nguồn, chọn kỹ năng (skill) phù hợp trong `.agents/skills/` (như `feature-development`, `debugging`, `code-validation`, `refactoring`, `ui-standardization`, `test-execution`...).
  2. Triển khai trực tiếp trên workspace hiện tại (không tạo git worktree, không gọi lệnh `orchestrator/cli.mjs`).
  3. Tự chạy kiểm thử và xác minh (`pnpm run validate` hoặc `pnpm run verify`).
  4. **Git Commit chuẩn hóa:** Sau khi kiểm thử vượt qua, tự động stage các file liên quan và tạo local commit theo chuẩn Conventional Commits (tham chiếu skill `git-commit`). TUYỆT ĐỐI KHÔNG tự ý `git push`.
  5. Đảm bảo working tree sạch sẽ và báo cáo kết quả kèm bằng chứng kiểm thử cùng thông tin commit (hash + message).

### Chế độ 2: Multi-Agent Orchestrator (CHỈ KÍCH HOẠT KHI ĐƯỢC CHỈ ĐỊNH)
- **Điều kiện kích hoạt:**
  1. Người dùng yêu cầu rõ ràng (ví dụ: *"dùng orchestrator"*, *"chạy multi-agent"*, *"dùng subagent"*, *"quy trình 8 bước"*).
  2. HOẶC khi task quá phức tạp (ảnh hưởng > 5-10 files, thay đổi cross-cutting nhiều feature, cần chia task song song): Agent **chủ động ĐỀ XUẤT** dùng Multi-Agent; chỉ kích hoạt khi người dùng đồng ý.
- **Nguyên tắc hoạt động:** Khi ở chế độ này, Agent đóng vai trò Coordinator và tuân thủ các quy tắc trong `Multi-Agent Workflow Rules` và skill `orchestrator`.

# Project Guidelines & Architecture

## Project Overview
- **Project Name:** user-management
- **Base Branch:** test/multi-agent-framework

## Code Conventions
- Follow standard project linting and formatting rules.
- Ensure all public APIs are typed and documented.
