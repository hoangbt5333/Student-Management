---
name: orchestrator
description: >-
  Điều phối và thực thi các Task đa tác nhân (Multi-Agent Orchestrator) với Antigravity:
  khởi tạo execution, tạo worktree, ủy quyền Coder qua subagent, kiểm định chất lượng
  (Coder Gate), đánh giá (Reviewer Gate) và tích hợp tự động vào integration branch.
---

# Antigravity Orchestrator Skill

Skill này hướng dẫn **Antigravity Main Agent (Coordinator)** điều phối luồng làm việc đa tác nhân (Multi-Agent) thông qua công cụ dòng lệnh `orchestrator/cli.mjs` kết hợp với hệ thống **Subagents** của Antigravity.

---

## 1. Kiến trúc phân vai

* **Coordinator (Main Agent)**:
  * Quản trị State Machine (`state/<exec_id>.json`).
  * Chuẩn bị Git Worktree (`../wt/<TASK-ID>`).
  * Chạy Coder Gate (`validate.mjs`).
  * Thực hiện tích hợp (`integrate`) và dọn dẹp worktree.
  * Tự động phục hồi khi gặp sự cố (`recover`).
* **Coder (Subagent)**:
  * Được Coordinator kích hoạt bằng `invoke_subagent`.
  * Chỉ sửa code trong phạm vi thư mục worktree `../wt/<TASK-ID>` và danh sách `owned_files`.
  * Trước khi kết thúc, phải tạo file `.task-report.json` với `result: "READY_FOR_REVIEW"`.
* **Reviewer (Subagent)**:
  * Đánh giá độc lập `git diff` so với tiêu chí nghiệm thu (AC).
  * Trả về kết luận `APPROVED` hoặc `CHANGES_REQUESTED`.

---

## 2. Quy trình điều phối chuẩn từng bước (Step-by-Step Runbook)

### Bước 1: Kiểm tra & Khởi tạo phiên thực thi
1. Kiểm tra tính hợp lệ của file tasks:
   ```powershell
   node orchestrator/cli.mjs check --tasks tasks.json
   ```
2. Khởi tạo phiên điều phối (ví dụ `EXEC-001`):
   ```powershell
   node orchestrator/cli.mjs init --exec EXEC-001 --tasks tasks.json
   ```

### Bước 2: Lấy Task sẵn sàng kế tiếp
1. Truy vấn Task tiếp theo đủ điều kiện (DAG dependencies đã xong):
   ```powershell
   node orchestrator/cli.mjs next --exec EXEC-001
   ```
2. Tạo worktree độc lập cho Task và chuyển trạng thái sang `in_progress`:
   ```powershell
   node orchestrator/cli.mjs worktree <TASK-ID> --exec EXEC-001
   ```
3. Lấy nội dung bàn giao (Task Brief):
   ```powershell
   node orchestrator/cli.mjs brief <TASK-ID> --exec EXEC-001
   ```

### Bước 3: Ủy quyền cho Coder Subagent
Gọi công cụ `invoke_subagent`:
* **Role**: `Coder <TASK-ID>`
* **Model**: `inherit` (hoặc `flash` cho task đơn giản)
* **Prompt**: Chuyển toàn bộ nội dung Task Brief và yêu cầu rõ ràng:
  > "Bạn là Coder thực hiện <TASK-ID>.  
  > 1. Thư mục làm việc: `<đường_dẫn_tuyệt_đối_tới_worktree>/../wt/<TASK-ID>`.  
  > 2. Chỉ được phép sửa đổi các file trong danh sách `owned_files`.  
  > 3. Tuyệt đối không sửa `orchestrator/`, `state/`, `logs/`, `.claude/`, `.agents/`, `project.config.json`.  
  > 4. Sau khi viết code và test cục bộ, tạo commit git.  
  > 5. Tạo file `.task-report.json` tại gốc worktree theo schema với `result: "READY_FOR_REVIEW"`.  
  > 6. Thông báo lại kết quả khi hoàn thành."

*(Sau khi gọi `invoke_subagent`, Coordinator dừng gọi tool và chờ Reactive Wakeup từ hệ thống).*

### Bước 4: Kiểm định chất lượng (Coder Gate)
Khi Coder Subagent hoàn tất và thông báo lại:
1. Chạy cổng kiểm tra kỹ thuật (build, typecheck, lint, test):
   ```powershell
   node orchestrator/validate.mjs <TASK-ID> ../wt/<TASK-ID> --exec EXEC-001 --base integration/EXEC-001
   ```
2. Kiểm tra tính hợp lệ của báo cáo bàn giao:
   ```powershell
   node orchestrator/cli.mjs report-check <TASK-ID> --exec EXEC-001
   ```
   * Nếu **FAIL**: Gửi thông báo lỗi cho Coder qua `send_message` để Coder sửa.
   * Nếu **PASS**: Task sẵn sàng cho bước Review.

### Bước 5: Đánh giá độc lập (Reviewer Gate)
1. Gọi `invoke_subagent` cho vai trò Reviewer:
   * **Role**: `Reviewer <TASK-ID>`
   * **Prompt**: Yêu cầu đọc `git diff integration/EXEC-001...HEAD` tại worktree của Task, đối chiếu với Acceptance Criteria trong Brief và `.task-report.json`.
2. Nếu Reviewer đồng thuận:
   ```powershell
   node orchestrator/cli.mjs review-record <TASK-ID> --exec EXEC-001 --verdict APPROVED
   ```
   *(Nếu yêu cầu sửa: dùng `--verdict CHANGES_REQUESTED --feedback "<lý_do>"`)*.

### Bước 6: Tích hợp tự động (Integration Gate)
Tích hợp Task vào nhánh chung và dọn dẹp worktree:
```powershell
node orchestrator/cli.mjs integrate <TASK-ID> --exec EXEC-001 --clean-worktree
```
Lệnh này sẽ tự động merge vào `integration/EXEC-001`, chạy lại integration test, dọn dẹp worktree và giải phóng file ownership.

### Bước 7: Lặp lại hoặc Xuất báo cáo tổng kết
* Tiếp tục gọi `node orchestrator/cli.mjs next --exec EXEC-001` cho các task tiếp theo.
* Khi tất cả Task đã hoàn thành:
  ```powershell
  node orchestrator/cli.mjs report --exec EXEC-001 --format markdown
  ```

---

## 3. Xử lý sự cố & Phục hồi (Recovery)
Nếu quá trình điều phối bị ngắt quãng (mất mạng, subagent crash, người dùng tạm dừng):
1. Chạy lệnh phục hồi:
   ```powershell
   node orchestrator/cli.mjs recover --exec EXEC-001
   ```
2. Hệ thống sẽ tự động đối chiếu Git commit, uncommitted changes, validation evidence để khôi phục trạng thái chính xác.
