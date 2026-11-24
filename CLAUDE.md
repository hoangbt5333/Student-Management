<!-- framework:start -->
# Agent Framework Guidelines (v0.4.0)

> **Notice:** This section is managed by `agent-framework`. Do not edit directly; changes will be overwritten upon upgrade.

## Multi-Agent Workflow Rules
1. **Core vs Project Boundary:** Never modify files under `orchestrator/`, `core/`, `state/`, `logs/`, `.claude/`, `.agents/`, or `project.config.json` to fit specific task requirements.
2. **Canonical Orchestration Commands:**
   - **Initialize Execution:** `node orchestrator/cli.mjs init --exec <id> --tasks tasks.json`
   - **Start Task & Worktree:** `node orchestrator/cli.mjs worktree <task_id> --exec <id>` *(tự động tạo worktree từ nhánh integration/<id>, liên kết node_modules qua Junction/Symlink, và chuyển task sang in_progress)*
   - **Validate Task (Coder Gate):** `node orchestrator/validate.mjs <task_id> ../wt/<task_id> --exec <id> --base integration/<id>` *(chạy build, typecheck, lint, test)*
   - **Task Handoff:** Coder tạo `.task-report.json` trong worktree với `result: "READY_FOR_REVIEW"`.
   - **Review Verdict:** `node orchestrator/cli.mjs review-record <task_id> --exec <id> --verdict APPROVED` *(nếu task ở in_progress sẽ tự động chuyển sang ready_for_review)*
   - **Integrate Task:** `node orchestrator/cli.mjs integrate <task_id> --exec <id> --clean-worktree` *(tự động autostash, merge vào integration/<id>, chạy Integration Gate, dọn dẹp worktree và khôi phục stash)*
   - **Execution Report:** `node orchestrator/cli.mjs report --exec <id> --format markdown`
   - **Auto-Recovery:** `node orchestrator/cli.mjs recover --exec <id>`
3. **Parallel Dispatching Principles:**
   - When `node orchestrator/cli.mjs next --exec <id>` returns multiple tasks in `ready` (no mutual dependencies and disjoint `owned_files`), Coordinator **MUST LAUNCH THEM CONCURRENTLY**:
     1. Create worktrees for all ready tasks: `node orchestrator/cli.mjs worktree <task_id> --exec <id>`.
     2. Spawn Coder subagents in parallel (batch) in the same turn.
     3. NEVER wait for Task 1 to integrate before starting Task 2.
4. **Task Scope & Guardrails:**
   - Coder works strictly inside worktree `../wt/<task_id>`, modifying only files declared in `owned_files`.
   - Modifying framework files (`orchestrator/`, `state/`, `logs/`, `.claude/`, `.agents/`, `project.config.json`) is strictly blocked.
5. **Security & Permissions:**
   - Git push, branch deletion, and merging to main require direct human approval.
   - Do NOT attempt to read protected files matching `.env*` or cryptographic keys.
<!-- framework:end -->

# CLAUDE.md - Student Management System

Tài liệu hướng dẫn ngữ cảnh, quy chuẩn kiến trúc và quy trình làm việc cho Claude Code trong dự án **Student Management System**.

---

## 1. Tổng quan dự án

- `npm start` — start the Angular dev server at `http://localhost:4200`.
- `npm run build` — production build, including the configured server/SSR output.
- `npm run watch` — rebuild continuously in development configuration.
- `npm run test:ci` — canonical test command; runs non-watch mode, outputs to console and writes JSON report to `artifacts/test-results.json`.
  - Specific file: `npm run test:ci -- --include='<path-to-spec>'`
- `npm run lint` — check code quality using ESLint & Angular-ESLint.
- `npm run check:arch` — check Explicit Layering architecture boundary violations.
- `npm run validate` — deterministic automated validation (check:arch + lint + typecheck + targeted test).
  - Specific file: `npm run validate -- --spec='<path-to-spec>'`
- `npm run verify` — run check:arch, lint, build, and full test suite.
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

### Chế độ 1: Trực tiếp (Mặc định cho các task nhỏ / độc lập)
- **Mục tiêu:** Tối ưu hóa chi phí token, phản hồi nhanh và giải quyết trực tiếp.
- **Áp dụng:** Các utility, bug fix nhỏ, chỉnh sửa style, refactor đơn giản, hoặc khi người dùng không yêu cầu subagents.
- **Nguyên tắc:**
  1. Claude tự đọc hiểu mã nguồn, lập luận và triển khai trực tiếp trong phiên hiện tại.
  2. Luôn tuân thủ kiến trúc Explicit Layering ở Mục 2.
  3. Chạy **Automated Validation** (`npm run validate -- --spec='<path-to-spec>'`) để kiểm chứng kết quả nhanh chóng.
  4. **Git Commit chuẩn hóa:** Sau khi validation pass, tự động stage và commit các thay đổi theo Conventional Commits (tham chiếu skill `git-commit`). Không tự ý `git push`.
  5. Đảm bảo working tree sạch sẽ và báo cáo kết quả kèm commit hash và bằng chứng nghiệm thu.

---

### Chế độ 2: Multi-Agent Workflow Chuẩn (Canonical 8-Step Enterprise Process)
- **Kích hoạt khi:** Prompt người dùng có yêu cầu gọi subagent (ví dụ: *"theo quy trình subagent"*, *"chạy quy trình 8 bước"*, *"dùng architect/coder/reviewer"*), hoặc khi triển khai các module/feature lớn cần kiểm soát chất lượng chặt chẽ.
- **Quy tắc bất khả xâm phạm của Main Agent (Lead Orchestrator):**
  - TUYỆT ĐỐI KHÔNG tự vào Plan Mode (`Entered plan mode`) ở phiên chính.
  - TUYỆT ĐỐI KHÔNG tự tìm kiếm/đọc nhiều file trong phiên chính để tự thiết kế giải pháp. Toàn bộ việc khảo sát codebase, phân tích patterns và thiết kế thuộc 100% trách nhiệm của `architect`.
  - HÀNH ĐỘNG ĐẦU TIÊN khi nhận lệnh: Spawn ngay lập tức subagent `architect`.

#### Bước 1: Tiếp nhận & Ủy quyền tức thì (Lead Orchestrator)
- Main Agent tiếp nhận yêu cầu từ người dùng và ủy quyền toàn quyền khảo sát cho subagent `architect`.

#### Bước 2: Kiến trúc, DAG & Task Brief (`architect`)
- `architect` độc lập khảo sát codebase, xác định phạm vi thay đổi và các tầng bị ảnh hưởng.
- **Lập Acceptance Criteria (AC)**: Tiêu chí nghiệm thu rõ ràng (`[ ] AC-1`, `[ ] AC-2...`) làm căn cứ cho Coder và Reviewer.
- **Phân rã DAG Task vào `tasks.json`**:
  - Mỗi Task phải có `owned_files` rõ ràng, không trùng lặp file giữa các task song song.
  - Đánh dấu `[PARALLEL]` cho các task độc lập (`depends_on: []`) và `[SEQUENTIAL]` cho các task phụ thuộc.
- Chạy lệnh kiểm tra tính hợp lệ của kế hoạch:
  ```bash
  node orchestrator/cli.mjs check --tasks tasks.json
  ```

#### Bước 3: Người dùng phê duyệt & Khởi tạo Execution
- Trình kế hoạch kỹ thuật, Acceptance Criteria và danh sách task cho người dùng duyệt.
- Sau khi được người dùng duyệt, Lead Orchestrator khởi tạo đợt thực thi:
  ```bash
  node orchestrator/cli.mjs init --exec <id> --tasks tasks.json
  ```
  *(Lệnh này tự động tạo file trạng thái `state/<id>.json` và nhánh tích hợp `integration/<id>`).*

#### Bước 4: Khởi chạy Coder & Worktree cô lập
- Main Agent kiểm tra các task sẵn sàng: `node orchestrator/cli.mjs next --exec <id>`.
- Khởi tạo worktree cho từng Coder bằng lệnh:
  ```bash
  node orchestrator/cli.mjs worktree <task_id> --exec <id> --agent <coder_name>
  ```
  *(Tự động tạo worktree `../wt/<task_id>`, liên kết node_modules qua NTFS Junction, và chuyển task sang trạng thái in_progress).*
- Coder làm việc strictly trong worktree `../wt/<task_id>` và CHỈ sửa các file thuộc `owned_files`. Không sao chép thủ công qua lại với thư mục gốc.

#### Bước 5: Coder Completion Gate & Bàn giao Handoff
- Sau khi viết mã, Coder BẮT BUỘC phải commit trên nhánh task và chạy bộ kiểm định chất lượng:
  ```bash
  node orchestrator/validate.mjs <task_id> ../wt/<task_id> --exec <id> --base integration/<id>
  ```
  *(Chạy tự động 4 chốt: git_clean, new_commit, build/typecheck, lint/unit_test và xuất file bằng chứng `logs/<exec_id>/<task_id>/<commit_short>/result.json`).*
- Khi kết quả validate báo `READY_FOR_REVIEW`, Coder tạo file `.task-report.json` tại gốc worktree:
  ```json
  {
    "task_id": "<task_id>",
    "agent": "coder",
    "result": "READY_FOR_REVIEW",
    "summary": "Mô tả ngắn gọn kết quả triển khai",
    "branch": "task/<task_id>",
    "commits": ["<commit_hash>"],
    "files_changed": ["<file_1>", "<file_2>"],
    "checks": { "build": "pass", "typecheck": "pass", "lint": "pass", "unit_test": "pass" },
    "evidence": ["logs/<exec_id>/<task_id>/<commit_short>/result.json"],
    "open_issues": [],
    "needs_human": false
  }
  ```

#### Bước 6: Thẩm định Độc lập (`reviewer`)
- Lead Orchestrator chạy kiểm tra độc lập báo cáo bàn giao:
  ```bash
  node orchestrator/cli.mjs report-check <task_id> --exec <id>
  ```
- Gọi subagent `reviewer` audit diff và đối chiếu với Acceptance Criteria.
- Sau khi kiểm toán, ghi nhận kết quả bằng lệnh:
  ```bash
  node orchestrator/cli.mjs review-record <task_id> --exec <id> --verdict APPROVED
  ```
  *(Nếu phát hiện lỗi, chọn `--verdict CHANGES_REQUESTED --findings '[...]'` để Coder sửa lại).*

#### Bước 7: Tích hợp Tự động (Integration Gate)
- Lead Orchestrator tích hợp Task vào nhánh tích hợp chung:
  ```bash
  node orchestrator/cli.mjs integrate <task_id> --exec <id> --clean-worktree
  ```
  *(Lệnh này tự động: autostash thay đổi tại root nếu có, merge task branch vào integration/<id>, chạy Integration Gate toàn cục, tự động rollback nếu đỏ gate, dọn dẹp worktree và cập nhật task sang completed).*

#### Bước 8: Báo cáo Tổng kết & Phát hành
- Sau khi toàn bộ các task hoàn thành, xuất báo cáo tổng kết đợt thực thi:
  ```bash
  node orchestrator/cli.mjs report --exec <id> --format markdown
  ```
- Trình báo cáo cho người dùng. Khi được con người phê duyệt, merge nhánh `integration/<id>` vào nhánh cơ sở (`main` hoặc `test/multi-agent-framework`).
