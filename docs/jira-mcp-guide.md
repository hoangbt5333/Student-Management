# Hướng dẫn Kết nối Jira MCP & Tự động hóa Pipeline

Tài liệu này hướng dẫn cách kết nối Jira với Claude Code qua MCP (Model Context Protocol) và cách sử dụng quy trình tự động hóa pipeline.

---

## 1. Lấy API Token từ Atlassian Jira

1. Đăng nhập vào tài khoản Atlassian của bạn.
2. Truy cập: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Nhấn **Create API token**.
4. Đặt tên (ví dụ: `claude-code-jira`) và sao chép mã token được tạo.

---

## 2. Cấu hình Jira MCP Server

Dự án đã chuẩn bị sẵn file `.mcp.json`. Hãy cập nhật thông tin thực tế của bạn vào `.mcp.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@modelcontextprotocol/server-jira"
      ],
      "env": {
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-jira-api-token"
      }
    }
  }
}
```

Kiểm tra danh sách MCP server trong Claude Code:
```bash
claudex mcp list
```

---

## 3. Cách sử dụng Pipeline

### Lựa chọn 1: Chạy trực tiếp trên Windows PowerShell
```powershell
.\run-pipeline.ps1 TASK-001
```

### Lựa chọn 2: Chạy trên Git Bash / WSL
```bash
./run-pipeline.sh TASK-001
```

### Quy trình 5 bước tự động:
1. **Planner (`--agent planner`)**: Đọc `00-ticket.md` $\rightarrow$ sinh kế hoạch chia nhỏ `01-breakdown.md`.
2. **Human Approval Gate**: Dừng hỏi ý kiến kỹ sư để duyệt kế hoạch (`[y/N]`).
3. **Analyst (`--agent analyst`)**: Khảo sát kiến trúc codebase Angular $\rightarrow$ sinh phân tích `02-analysis.md`.
4. **Coder (`--agent coder`)**: Tự động checkout nhánh `feature/<TASK-ID>`, code tính năng, viết test Vitest, chạy `cmd /c npm run verify` đến khi pass, rồi git commit.
5. **Reviewer Loop (`--agent reviewer`)**: Review thay đổi qua `git diff main...HEAD`. Nếu cần sửa, Coder tự sửa và lặp lại tối đa 2 vòng cho đến khi đạt `VERDICT: APPROVE`.
6. **Doc-writer (`--agent doc-writer`)**: Sinh mô tả Pull Request và changelog tại `04-docs.md`.
