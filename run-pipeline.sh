#!/usr/bin/env bash
# Pipeline tự động: Jira MCP Fetch -> Ticket Type -> Planner -> Analyst -> Coder -> Reviewer Loop -> Doc-writer
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
  "$CLAUDE_BIN" -p "Dùng tool mcp__atlassian__getJiraIssue để lấy thông tin issue '$TASK_ID' trên Jira. Hãy trích xuất: Issue Key, Summary, Issue Type, Description và ghi vào file $T/00-ticket.md với định dạng markdown chuẩn, có dòng 'Loại: feature | bug | refactor' ở đầu." \
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

# Phát hiện loại ticket (feature | bug | refactor)
TICKET_TYPE="feature"
if [[ -f "$T/00-ticket.md" ]]; then
  if grep -qiE "^Loại:\s*(feature|bug|refactor)" "$T/00-ticket.md"; then
    TICKET_TYPE=$(grep -iE "^Loại:\s*(feature|bug|refactor)" "$T/00-ticket.md" | head -n1 | sed -E 's/^Loại:\s*//I' | tr '[:upper:]' '[:lower:]' | tr -d '\r')
  elif grep -qiE "^Loai:\s*(feature|bug|refactor)" "$T/00-ticket.md"; then
    TICKET_TYPE=$(grep -iE "^Loai:\s*(feature|bug|refactor)" "$T/00-ticket.md" | head -n1 | sed -E 's/^Loai:\s*//I' | tr '[:upper:]' '[:lower:]' | tr -d '\r')
  elif grep -qiE "^-\s*\*\*Issue Type:\*\*" "$T/00-ticket.md"; then
    RAW_TYPE=$(grep -iE "^-\s*\*\*Issue Type:\*\*" "$T/00-ticket.md" | head -n1 | tr '[:upper:]' '[:lower:]')
    if [[ "$RAW_TYPE" =~ bug|defect|lỗi|loi ]]; then
      TICKET_TYPE="bug"
    elif [[ "$RAW_TYPE" =~ refactor|clean|debt|cải\ tiến|cai\ tien ]]; then
      TICKET_TYPE="refactor"
    fi
  fi
fi
echo ">> Loại ticket được phát hiện: $TICKET_TYPE"

# 1. Phân rã task (Planner)
step "1/5 Planner: Lập kế hoạch phân rã subtasks (Loại: $TICKET_TYPE)"
if [[ ! -f "$T/01-breakdown.md" ]]; then
  "$CLAUDE_BIN" --agent planner -p "Đọc $T/00-ticket.md. Xác định rõ loại ticket ($TICKET_TYPE) và ghi 'Loại ticket: $TICKET_TYPE' ở ngay đầu file. Phân rã thành các subtask rõ ràng theo chiến lược của loại ticket đó và ghi kết quả vào $T/01-breakdown.md" \
    --dangerously-skip-permissions < /dev/null
else
  echo ">> [Đã có sẵn] Bỏ qua Planner, sử dụng $T/01-breakdown.md"
fi

# Cập nhật loại ticket từ breakdown nếu có
if [[ -f "$T/01-breakdown.md" ]] && grep -qiE "Loại\s*ticket:\s*(feature|bug|refactor)" "$T/01-breakdown.md"; then
  TICKET_TYPE=$(grep -iE "Loại\s*ticket:\s*(feature|bug|refactor)" "$T/01-breakdown.md" | head -n1 | sed -E 's/.*Loại\s*ticket:\s*//I' | tr '[:upper:]' '[:lower:]' | tr -d '\r')
  echo ">> Xác nhận loại ticket từ breakdown: $TICKET_TYPE"
elif [[ -f "$T/01-breakdown.md" ]] && grep -qiE "Loai\s*ticket:\s*(feature|bug|refactor)" "$T/01-breakdown.md"; then
  TICKET_TYPE=$(grep -iE "Loai\s*ticket:\s*(feature|bug|refactor)" "$T/01-breakdown.md" | head -n1 | sed -E 's/.*Loai\s*ticket:\s*//I' | tr '[:upper:]' '[:lower:]' | tr -d '\r')
  echo ">> Xác nhận loại ticket từ breakdown: $TICKET_TYPE"
fi

# Điểm dừng cho người duyệt kế hoạch
echo
read -rp ">> Đã xem $T/01-breakdown.md. Bạn có đồng ý tiếp tục? [y/N]: " ok
if [[ ! "$ok" =~ ^[yY]$ ]]; then
  echo ">> Đã dừng pipeline theo yêu cầu người dùng."
  exit 0
fi

# 2. Phân tích codebase (Analyst)
step "2/5 Analyst: Khảo sát codebase (Loại: $TICKET_TYPE)"
if [[ ! -f "$T/02-analysis.md" ]]; then
  case "$TICKET_TYPE" in
    bug)
      ANALYST_PROMPT="Dựa vào $T/00-ticket.md và $T/01-breakdown.md, loại ticket là 'bug'. Kích hoạt skill 'debugging' để khảo sát codebase Angular, xác định chính xác Root Cause (nguyên nhân gốc rễ), kịch bản tái hiện lỗi và đề xuất sửa tối thiểu (minimal diff). Ghi phân tích vào $T/02-analysis.md"
      ;;
    refactor)
      ANALYST_PROMPT="Dựa vào $T/00-ticket.md và $T/01-breakdown.md, loại ticket là 'refactor'. Kích hoạt skill 'refactoring' để khảo sát codebase Angular, kiểm tra test suite hiện có và đề xuất pattern tái cấu trúc đảm bảo bảo toàn hành vi (behavior preservation). Ghi phân tích vào $T/02-analysis.md"
      ;;
    *)
      ANALYST_PROMPT="Dựa vào $T/00-ticket.md và $T/01-breakdown.md, loại ticket là 'feature'. Kích hoạt skill 'feature-development' để khảo sát codebase Angular, ranh giới kiến trúc (Component -> Facade -> SignalStore -> Service) và ghi phân tích kỹ thuật vào $T/02-analysis.md"
      ;;
  esac
  "$CLAUDE_BIN" --agent analyst -p "$ANALYST_PROMPT" \
    --dangerously-skip-permissions < /dev/null
else
  echo ">> [Đã có sẵn] Bỏ qua Analyst, sử dụng $T/02-analysis.md"
fi

# 3. Code (trên nhánh tương ứng)
case "$TICKET_TYPE" in
  bug)      BRANCH_PREFIX="fix" ;;
  refactor) BRANCH_PREFIX="refactor" ;;
  *)        BRANCH_PREFIX="feature" ;;
esac
TASK_BRANCH="$BRANCH_PREFIX/$TASK_ID"

if git branch --list "feature/$TASK_ID" | grep -q "feature/$TASK_ID"; then
  TASK_BRANCH="feature/$TASK_ID"
fi

step "3/5 Coder: Triển khai mã nguồn và kiểm thử ($TICKET_TYPE trên nhánh $TASK_BRANCH)"
if ! git branch --list "$TASK_BRANCH" | grep -q "$TASK_BRANCH"; then
  git checkout main 2>/dev/null || true
  git checkout -b "$TASK_BRANCH"
else
  git checkout "$TASK_BRANCH"
fi

case "$TICKET_TYPE" in
  bug)
    CODER_PROMPT="Dựa vào $T/01-breakdown.md và $T/02-analysis.md, loại ticket là 'bug'. Hãy dùng skill 'debugging': viết unit test bằng Vitest tái hiện lỗi trước (TDD), sửa đúng Root Cause theo minimal diff, chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa với commit message 'fix($TASK_ID): ...' (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)."
    ;;
  refactor)
    CODER_PROMPT="Dựa vào $T/01-breakdown.md và $T/02-analysis.md, loại ticket là 'refactor'. Hãy dùng skill 'refactoring': tái cấu trúc code nhưng tuyệt đối BẢO TOÀN HÀNH VI (behavior preservation), giữ nguyên interface, chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa với commit message 'refactor($TASK_ID): ...' (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)."
    ;;
  *)
    CODER_PROMPT="Dựa vào $T/01-breakdown.md và $T/02-analysis.md, loại ticket là 'feature'. Hãy dùng skill 'feature-development': implement code Angular tuân thủ ranh giới Explicit Layering (Component -> Facade -> SignalStore -> Service), viết unit test bằng Vitest, chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa với commit message 'feat($TASK_ID): ...' (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)."
    ;;
esac

"$CLAUDE_BIN" --agent coder -p "$CODER_PROMPT" \
  --dangerously-skip-permissions < /dev/null

# 4. Review & Vòng lặp sửa lỗi (Reviewer & Coder)
for round in $(seq 1 $((MAX_FIX_ROUNDS + 1))); do
  step "4/5 Reviewer: Đánh giá chất lượng mã nguồn (Vòng $round - Loại: $TICKET_TYPE)"
  ROUND_REVIEW="$T/03-review-round-$round.md"

  "$CLAUDE_BIN" --agent reviewer -p "Review toàn bộ thay đổi code trên nhánh hiện tại ($TASK_BRANCH) bằng lệnh git diff main...HEAD. Đối chiếu với yêu cầu trong $T/00-ticket.md, $T/01-breakdown.md (loại ticket: $TICKET_TYPE) và các quy tắc kiến trúc. Ghi chi tiết nhận xét vào $ROUND_REVIEW. Dòng cuối cùng BẮT BUỘC là 'VERDICT: APPROVE' hoặc 'VERDICT: CHANGES_REQUESTED'." \
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
"$CLAUDE_BIN" --agent doc-writer -p "Dựa trên $T/00-ticket.md, $T/01-breakdown.md (loại ticket: $TICKET_TYPE) và git diff main...HEAD, hãy viết mô tả PR chi tiết, changelog và hướng dẫn kiểm thử vào $T/04-docs.md" \
  --dangerously-skip-permissions < /dev/null

echo
echo "=================================================="
echo ">> Pipeline hoàn thành thành công!"
echo ">> Tài liệu task: $T/"
echo ">> Nhánh làm việc: $TASK_BRANCH"
echo ">> Loại ticket: $TICKET_TYPE"
echo ">> Hãy kiểm tra lại và tiến hành tạo Pull Request."
echo "=================================================="
