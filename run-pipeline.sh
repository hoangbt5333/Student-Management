#!/usr/bin/env bash
# Pipeline tự động: Jira MCP Fetch -> Planner -> Analyst -> Coder -> Reviewer Loop -> Doc-writer
# Cách dùng: ./run-pipeline.sh SM-5
set -euo pipefail

TASK_ID="${1:?Cách dùng: ./run-pipeline.sh TASK-ID}"
T="tasks/$TASK_ID"
MAX_FIX_ROUNDS=2

# Tự động nhận diện lệnh Claude CLI (claudex hoặc claude)
if command -v claudex >/dev/null 2>&1; then
  CLAUDE_BIN="claudex"
elif command -v claude >/dev/null 2>&1; then
  CLAUDE_BIN="claude"
else
  echo "[LỖI] Không tìm thấy lệnh 'claudex' hoặc 'claude' trong PATH."
  exit 1
fi

echo ">> Sử dụng CLI: $CLAUDE_BIN"

# Tự động tạo thư mục và tải từ Jira nếu chưa có ticket cục bộ
if [[ ! -f "$T/00-ticket.md" ]]; then
  echo ">> Chưa có file $T/00-ticket.md cục bộ."
  echo ">> Đang tự động kết nối Atlassian Jira MCP để tải issue $TASK_ID..."
  mkdir -p "$T"
  "$CLAUDE_BIN" -p "Dùng tool mcp__atlassian__getJiraIssue để lấy thông tin issue '$TASK_ID' trên Jira. Hãy trích xuất: Issue Key, Summary, Issue Type, Description và ghi vào file $T/00-ticket.md với định dạng markdown chuẩn." \
    --dangerously-skip-permissions < /dev/null

  if [[ ! -f "$T/00-ticket.md" ]]; then
    echo "[LỖI] Không thể tải ticket $TASK_ID từ Jira."
    exit 1
  fi
  echo ">> [SUCCESS] Đã tải ticket thành công về $T/00-ticket.md!"
fi

step() {
  echo
  echo "=================================================="
  echo "=== $1"
  echo "=================================================="
}

# 1. Phân rã task (Planner)
step "1/5 Planner: Lập kế hoạch phân rã subtasks"
"$CLAUDE_BIN" --agent planner -p "Đọc $T/00-ticket.md, phân rã thành các subtask rõ ràng theo thứ tự phụ thuộc kiến trúc và ghi kết quả vào $T/01-breakdown.md" \
  --dangerously-skip-permissions < /dev/null

# Điểm dừng cho người duyệt kế hoạch
echo
read -rp ">> Đã ghi $T/01-breakdown.md. Bạn có đồng ý tiếp tục? [y/N]: " ok
if [[ ! "$ok" =~ ^[yY]$ ]]; then
  echo ">> Đã dừng pipeline theo yêu cầu người dùng."
  exit 0
fi

# 2. Phân tích codebase (Analyst)
step "2/5 Analyst: Khảo sát codebase và ranh giới kiến trúc"
"$CLAUDE_BIN" --agent analyst -p "Dựa vào $T/00-ticket.md và $T/01-breakdown.md, khảo sát codebase Angular và ghi phân tích kỹ thuật vào $T/02-analysis.md" \
  --dangerously-skip-permissions < /dev/null

# 3. Code (trên nhánh feature riêng)
step "3/5 Coder: Triển khai mã nguồn và kiểm thử"
FEATURE_BRANCH="feature/$TASK_ID"
if ! git branch --list "$FEATURE_BRANCH" | grep -q "$FEATURE_BRANCH"; then
  git checkout main 2>/dev/null || true
  git checkout -b "$FEATURE_BRANCH"
else
  git checkout "$FEATURE_BRANCH"
fi

"$CLAUDE_BIN" --agent coder -p "Dựa vào $T/01-breakdown.md và $T/02-analysis.md, hãy implement code Angular, viết unit test (Vitest), chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)." \
  --dangerously-skip-permissions < /dev/null

# 4. Review & Vòng lặp sửa lỗi (Reviewer & Coder)
for round in $(seq 1 $((MAX_FIX_ROUNDS + 1))); do
  step "4/5 Reviewer: Đánh giá chất lượng mã nguồn (Vòng $round)"
  ROUND_REVIEW="$T/03-review-round-$round.md"

  "$CLAUDE_BIN" --agent reviewer -p "Review toàn bộ thay đổi code trên nhánh feature hiện tại bằng lệnh git diff main...HEAD. Đối chiếu với yêu cầu trong $T/00-ticket.md và các quy tắc kiến trúc. Ghi chi tiết nhận xét vào $ROUND_REVIEW. Dòng cuối cùng BẮT BUỘC là 'VERDICT: APPROVE' hoặc 'VERDICT: CHANGES_REQUESTED'." \
    --dangerously-skip-permissions < /dev/null

  # Cập nhật review mới nhất sang 03-review.md
  cp "$ROUND_REVIEW" "$T/03-review.md" 2>/dev/null || copy "$ROUND_REVIEW" "$T/03-review.md"

  # Kiểm tra kết quả review
  if grep -qiE "VERDICT:\s*APPROVE" "$ROUND_REVIEW"; then
    echo ">> [SUCCESS] Reviewer đã APPROVE ở vòng $round!"
    break
  fi

  if [[ "$round" -gt "$MAX_FIX_ROUNDS" ]]; then
    echo ">> [STOP] Đã hết $MAX_FIX_ROUNDS vòng sửa mà chưa được approve."
    echo ">> Chi tiết phản hồi xem tại: $ROUND_REVIEW"
    exit 2
  fi

  step "Coder: Sửa lỗi theo phản hồi của Reviewer (Vòng $round)"
  "$CLAUDE_BIN" --agent coder -p "Đọc nhận xét trong $ROUND_REVIEW, tiến hành sửa các điểm cần khắc phục, chạy lại kiểm tra 'cmd /c npm run verify' đến khi pass và git commit các thay đổi." \
    --dangerously-skip-permissions < /dev/null
done

# 5. Viết tài liệu (Doc-writer)
step "5/5 Doc-writer: Tổng kết PR, Changelog và hướng dẫn test"
"$CLAUDE_BIN" --agent doc-writer -p "Dựa trên $T/00-ticket.md, $T/01-breakdown.md và git diff main...HEAD, hãy viết mô tả PR chi tiết, changelog và hướng dẫn kiểm thử vào $T/04-docs.md" \
  --dangerously-skip-permissions < /dev/null

echo
echo "=================================================="
echo ">> Pipeline hoàn thành thành công!"
echo ">> Tài liệu task: $T/"
echo ">> Nhánh feature: feature/$TASK_ID"
echo ">> Hãy kiểm tra lại và tiến hành tạo Pull Request."
echo "=================================================="
