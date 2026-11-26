# Project Instructions

## Project context

- This is an existing Angular Student Management application.
- Use the Angular version and dependencies defined in package.json.
- The project uses TypeScript, RxJS, Signals, Reactive Forms, and json-server.
- Students and Classes use:
  Component → Facade → Signal Store → Service → REST API.
- Academics currently uses AcademicService directly from components.
- Do not assume every feature follows the same architecture.

## Coding rules

- Inspect existing code before proposing changes.
- Follow the conventions of the target feature.
- Prefer incremental changes over full rewrites.
- Do not introduce new libraries without explaining the reason.
- Do not migrate Reactive Forms or state management unless requested.
- Avoid changing unrelated files.
- Keep types explicit and avoid unnecessary `any`.

## Assistance style

- Explain the implementation in Vietnamese.
- Give step-by-step instructions.
- Identify the files that need to change.
- Explain important code decisions.
- Include manual verification steps.
- Do not add automated tests unless requested.

## Workflow & Agent Modes

- **Mặc định (Direct Mode):** Đối với các yêu cầu thông thường, Agent tự đọc hiểu codebase, áp dụng skill chuyên môn phù hợp trong `.agents/skills/` (`feature-development`, `debugging`, `refactoring`, `code-validation`, `ui-standardization`, `test-execution`), trực tiếp chỉnh sửa mã nguồn, tự chạy kiểm thử xác minh (`npm run validate` hoặc `npm run verify`), sau đó tự động stage & tạo local commit theo chuẩn Conventional Commits (tham chiếu skill `git-commit`). Tuyệt đối không tự ý `git push`.
- **Khi nào đề xuất Multi-Agent / Orchestrator:**
  - Chỉ đề xuất khi task phức tạp: ảnh hưởng trên 3 feature, ước tính sửa > 8-10 files, hoặc có các luồng công việc độc lập lớn có thể chạy song song trên Git worktree.
  - Mẫu đề xuất: *"Task này có quy mô lớn (ảnh hưởng đến các module/files [...]). Bạn có muốn sử dụng quy trình **Multi-Agent Orchestrator** (chia worktree song song, có Architect lập kế hoạch, Coder thực hiện và Reviewer kiểm duyệt) không, hay muốn tôi **triển khai trực tiếp (Direct Mode)** trong phiên này?"*
  - Chỉ chuyển sang Orchestrator khi người dùng xác nhận đồng ý hoặc yêu cầu từ đầu.
