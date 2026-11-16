---
name: orchestrator
description: >-
  Điều phối và thực thi các Task đa tác nhân (Multi-Agent Orchestrator) với Antigravity:
  khởi tạo execution, tạo worktree song song, ủy quyền đồng thời Coder qua subagent,
  kiểm định chất lượng (Coder Gate), đánh giá (Reviewer Gate) và tích hợp tự động vào integration branch.
---

# Antigravity Orchestrator Skill

Skill này hướng dẫn **Antigravity Main Agent (Coordinator)** điều phối luồng làm việc đa tác nhân (Multi-Agent) **SONG SONG TỐI ĐA (PARALLEL EXECUTION)** thông qua công cụ dòng lệnh `orchestrator/cli.mjs` kết hợp với hệ thống **Subagents** của Antigravity.

---

## 1. Kiến trúc phân vai

* **Coordinator (Main Agent)**:
  * Quản trị State Machine (`state/<exec_id>.json`).
  * Chuẩn bị Git Worktree (`../wt/<TASK-ID>`).
  * **Phát lệnh song song**: Khởi chạy đồng thời nhiều Coder Subagents khi có nhiều task độc lập sẵn sàng.
  * Chạy Coder Gate (`validate.mjs`) và Reviewer độc lập cho từng task khi hoàn thành.
  * Thực hiện tích hợp (`integrate`) từng task vào nhánh chung và dọn dẹp worktree.
  * Tự động phục hồi khi gặp sự cố (`recover`).
* **Coder (Subagent)**:
  * Được Coordinator kích hoạt bằng `invoke_subagent`.
  * Chỉ sửa code trong phạm vi thư mục worktree `../wt/<TASK-ID>` và danh sách `owned_files`.
  * Trước khi kết thúc, phải tạo file `.task-report.json` với `result: "READY_FOR_REVIEW"`.
* **Reviewer (Subagent)**:
  * Đánh giá độc lập `git diff` so với tiêu chí nghiệm thu (AC).
  * Trả về kết luận `APPROVED` hoặc `CHANGES_REQUESTED`.

---

## 2. Nguyên tắc Song song hóa (Parallel Dispatching) - BẮT BUỘC

> [!IMPORTANT]
> **Tuyệt đối KHÔNG chạy tuần tự từng task nếu có nhiều task độc lập sẵn sàng!**
> Hệ thống hỗ trợ chạy song song tối đa theo `limits.max_parallel` (mặc định 3 task cùng lúc).

Khi lệnh `node orchestrator/cli.mjs next --exec <id>` trả về mảng `ready`:
```json
{
  "ready": ["TASK-001", "TASK-002"],
  "deadlock": false
}
```

Nếu mảng `ready` có từ 2 Task trở lên:
1. **Khởi tạo Worktree hàng loạt**:
   Chạy lệnh tạo worktree cho **TẤT CẢ** các task trong `ready`:
   ```powershell
   node orchestrator/cli.mjs worktree TASK-001 --exec <id>
   node orchestrator/cli.mjs brief TASK-001 --exec <id>
   node orchestrator/cli.mjs worktree TASK-002 --exec <id>
   node orchestrator/cli.mjs brief TASK-002 --exec <id>
   ```
2. **Kích hoạt Subagents ĐỒNG THỜI (Batch Tool Calling)**:
   Gọi công cụ `invoke_subagent` cho `TASK-001` VÀ gọi tiếp `invoke_subagent` cho `TASK-002` trong cùng một lượt xử lý.
   * **KHÔNG ĐƯỢC CHỜ** Task 1 hoàn thành mới khởi tạo Task 2!
   * Sau khi đã phát lệnh `invoke_subagent` cho tất cả task trong `ready`, Coordinator dừng gọi tool và kết thúc lượt để chờ tin nhắn hoàn thành từ các Subagents (Reactive Wakeup).

---

## 3. Quy trình điều phối chi tiết từng bước

### Bước 1: Kiểm tra & Khởi tạo phiên thực thi
1. Kiểm tra tính hợp lệ của file tasks:
   ```powershell
   node orchestrator/cli.mjs check --tasks tasks.json
   ```
2. Khởi tạo phiên điều phối (ví dụ `EXEC-001`):
   ```powershell
   node orchestrator/cli.mjs init --exec EXEC-001 --tasks tasks.json
   ```

### Bước 2: Lấy toàn bộ Task sẵn sàng & Khởi chạy song song
1. Lấy danh sách task sẵn sàng:
   ```powershell
   node orchestrator/cli.mjs next --exec EXEC-001
   ```
2. Với **mỗi task** trong mảng `ready`:
   * Tạo worktree: `node orchestrator/cli.mjs worktree <TASK-ID> --exec EXEC-001`
   * Lấy task brief: `node orchestrator/cli.mjs brief <TASK-ID> --exec EXEC-001`
   * Gọi `invoke_subagent`:
     * **Role**: `Coder <TASK-ID>`
     * **Model**: `inherit` hoặc `flash`
     * **Prompt**: Chuyển toàn bộ Task Brief, chỉ định rõ đường dẫn worktree `../wt/<TASK-ID>`, danh sách `owned_files`, và yêu cầu tạo `.task-report.json`.
3. Dừng lượt gọi tool và chờ các Subagents làm việc song song trong nền.

### Bước 3: Xử lý bất đồng bộ khi từng Task hoàn thành
Khi nhận được tin nhắn báo hoàn thành từ bất kỳ Coder Subagent nào:
1. **Chạy Coder Gate cho Task đó**:
   ```powershell
   node orchestrator/validate.mjs <TASK-ID> ../wt/<TASK-ID> --exec EXEC-001 --base integration/EXEC-001
   node orchestrator/cli.mjs report-check <TASK-ID> --exec EXEC-001
   ```
   * Nếu FAIL: Gửi `send_message` cho Subagent đó yêu cầu sửa lại.
2. **Reviewer Gate cho Task đó**:
   Gọi `invoke_subagent` cho vai trò Reviewer (`Role: "Reviewer <TASK-ID>"`). Khi Reviewer kết luận `APPROVED`:
   ```powershell
   node orchestrator/cli.mjs review-record <TASK-ID> --exec EXEC-001 --verdict APPROVED
   ```
3. **Tích hợp Task đó vào nhánh integration**:
   ```powershell
   node orchestrator/cli.mjs integrate <TASK-ID> --exec EXEC-001 --clean-worktree
   ```
4. **Lấp đầy slot trống ngay lập tức**:
   Sau khi tích hợp xong 1 task, gọi lại:
   ```powershell
   node orchestrator/cli.mjs next --exec EXEC-001
   ```
   Nếu có Task mới đủ điều kiện (do dependency đã hoàn thành hoặc còn slot trống): Lập tức tạo worktree và gọi Coder Subagent cho task mới đó!

### Bước 4: Hoàn tất & Xuất báo cáo tổng kết
Khi tất cả Task đã `completed`:
```powershell
node orchestrator/cli.mjs report --exec EXEC-001 --format markdown
```

---

## 4. Xử lý sự cố & Phục hồi (Recovery)
Nếu quá trình điều phối bị ngắt quãng:
```powershell
node orchestrator/cli.mjs recover --exec EXEC-001
```
Hệ thống sẽ đối chiếu 5 nguồn sự thật để phục hồi trạng thái chính xác cho từng task độc lập.
