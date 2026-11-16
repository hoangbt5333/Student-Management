<!-- framework:start -->
# Agent Framework Guidelines for Antigravity (v0.4.0)

> **Notice:** This section is managed by `agent-framework`. Do not edit directly; changes will be overwritten upon upgrade.

## Multi-Agent Workflow Rules
1. **Core vs Project Boundary:** Tuyệt đối không sửa file trong `core/`, `orchestrator/`, `state/`, `logs/`, `.agents/`, `.claude/`, hoặc `project.config.json` để phục vụ nhu cầu riêng của từng Task.
2. **Canonical Orchestration Commands:**
   - **Khởi tạo Execution:** `node orchestrator/cli.mjs init --exec <id> --tasks tasks.json`
   - **Tạo Task Worktree:** `node orchestrator/cli.mjs worktree <task_id> --exec <id>` *(tự động tạo worktree từ nhánh integration/<id>, liên kết node_modules và chuyển task sang in_progress)*
   - **Kiểm định Coder Gate:** `node orchestrator/validate.mjs <task_id> ../wt/<task_id> --exec <id> --base integration/<id>`
   - **Bàn giao Task:** Coder tạo `.task-report.json` trong worktree với `result: "READY_FOR_REVIEW"`.
   - **Ghi nhận Review:** `node orchestrator/cli.mjs review-record <task_id> --exec <id> --verdict APPROVED`
   - **Tích hợp Task:** `node orchestrator/cli.mjs integrate <task_id> --exec <id> --clean-worktree`
   - **Báo cáo Tổng kết:** `node orchestrator/cli.mjs report --exec <id> --format markdown`
   - **Tự động Phục hồi:** `node orchestrator/cli.mjs recover --exec <id>`
3. **Task Scope & Guardrails:**
   - Khi Coordinator ủy quyền cho Coder Subagent (`invoke_subagent`), Coder làm việc strictly trong worktree `../wt/<task_id>` và chỉ sửa các file thuộc `owned_files`.
   - Các hành vi sửa ngoài worktree hoặc chạy lệnh cấm (`git push`, `rm -rf`, v.v.) sẽ bị Hook `guard-edit` và `guard-bash` chặn ngay lập tức.
4. **Security & Permissions:**
   - Git push, xóa branch, và merge vào main cần người dùng phê duyệt trực tiếp.
   - Không được đọc các file nhạy cảm khớp `.env*` hoặc khóa bảo mật (`.pem`, `.key`).
<!-- framework:end -->

# Project Guidelines & Architecture

## Project Overview
- **Project Name:** user-management
- **Base Branch:** test/multi-agent-framework

## Code Conventions
- Follow standard project linting and formatting rules.
- Ensure all public APIs are typed and documented.
