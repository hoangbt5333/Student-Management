<#
.SYNOPSIS
    Pipeline tự động cho Claude Code kết hợp Jira MCP trên Windows (PowerShell):
    Jira Fetch -> Ticket Type Detection -> Planner -> Human Gate -> Analyst -> Coder (In Progress) -> Reviewer Loop -> Doc-writer (Comment PR lên Jira)
.EXAMPLE
    .\run-pipeline.ps1 SM-7
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TaskId,

    [int]$MaxFixRounds = 2
)

$ErrorActionPreference = "Stop"

$T = "tasks\$TaskId"
$TicketFile = Join-Path $T "00-ticket.md"
$AtlassianCloudId = "3fafc9a5-35a2-48ad-86c7-773befa3471f"

# 1. Nhận diện CLI binary (claudex hoặc claude)
$ClaudeBin = $null
if (Get-Command "claudex" -ErrorAction SilentlyContinue) {
    $ClaudeBin = "claudex"
} elseif (Get-Command "claude" -ErrorAction SilentlyContinue) {
    $ClaudeBin = "claude"
} else {
    Write-Host "[LỖI] Không tìm thấy lệnh 'claudex' hoặc 'claude' trong PATH." -ForegroundColor Red
    exit 1
}

Write-Host ">> Sử dụng CLI: $ClaudeBin" -ForegroundColor Cyan

# 2. Kiểm tra ticket đầu vào, tự động fetch từ Jira nếu chưa có
if (-not (Test-Path $TicketFile)) {
    Write-Host ">> Chưa có file ticket cục bộ: $TicketFile" -ForegroundColor Yellow
    Write-Host ">> Đang tự động kết nối Atlassian Jira MCP để tải issue $TaskId..." -ForegroundColor Cyan

    if (-not (Test-Path $T)) {
        New-Item -ItemType Directory -Path $T -Force | Out-Null
    }

    & $ClaudeBin -p "Dùng tool mcp__atlassian__getJiraIssue với cloudId '$AtlassianCloudId' để lấy thông tin issue '$TaskId' trên Jira. Hãy trích xuất: Issue Key, Summary, Issue Type, Description và ghi vào file $TicketFile với định dạng markdown chuẩn, có dòng 'Loại: feature | bug | refactor' ở đầu." --dangerously-skip-permissions

    if (-not (Test-Path $TicketFile)) {
        Write-Host "[LỖI] Không thể tải ticket $TaskId từ Jira." -ForegroundColor Red
        exit 1
    }
    Write-Host ">> [SUCCESS] Đã tải ticket thành công về $TicketFile!" -ForegroundColor Green
}

function Write-Step {
    param([string]$Title)
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "=== $Title" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
}

function Run-Agent {
    param(
        [string]$AgentName,
        [string]$Prompt
    )
    & $ClaudeBin --agent $AgentName -p $Prompt --dangerously-skip-permissions
}

# 2.1. Nhận diện loại ticket (feature | bug | refactor)
$TicketType = "feature"
if (Test-Path $TicketFile) {
    $TicketContent = Get-Content $TicketFile -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($TicketContent -match '(?im)^Loại:\s*(feature|bug|refactor)') {
        $TicketType = $matches[1].ToLower()
    } elseif ($TicketContent -match '(?im)^Loai:\s*(feature|bug|refactor)') {
        $TicketType = $matches[1].ToLower()
    } elseif ($TicketContent -match '(?im)^-\s*\*\*Issue Type:\*\*\s*(.+)$') {
        $rawType = $matches[1].ToLower()
        if ($rawType -match 'bug|defect|lỗi|loi') {
            $TicketType = "bug"
        } elseif ($rawType -match 'refactor|clean|debt|cải tiến|cai tien') {
            $TicketType = "refactor"
        }
    }
}
Write-Host ">> Loại ticket được phát hiện: $TicketType" -ForegroundColor Cyan

# --- STEP 1: Planner ---
$BreakdownFile = Join-Path $T "01-breakdown.md"
if (-not (Test-Path $BreakdownFile)) {
    Write-Step "1/5 Planner: Lập kế hoạch phân rã subtasks (Loại: $TicketType)"
    Run-Agent -AgentName "planner" -Prompt "Đọc $TicketFile. Xác định rõ loại ticket ($TicketType) và ghi 'Loại ticket: $TicketType' ở ngay đầu file. Phân rã thành các subtask rõ ràng theo chiến lược của loại ticket đó và ghi kết quả vào $BreakdownFile"
} else {
    Write-Host ">> [Đã có sẵn] Bỏ qua Planner, sử dụng $BreakdownFile" -ForegroundColor Cyan
}

# Cập nhật loại ticket từ breakdown nếu có
if (Test-Path $BreakdownFile) {
    $BreakdownContent = Get-Content $BreakdownFile -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($BreakdownContent -match '(?im)Loại\s*ticket:\s*(feature|bug|refactor)') {
        $TicketType = $matches[1].ToLower()
        Write-Host ">> Xác nhận loại ticket từ breakdown: $TicketType" -ForegroundColor Cyan
    } elseif ($BreakdownContent -match '(?im)Loai\s*ticket:\s*(feature|bug|refactor)') {
        $TicketType = $matches[1].ToLower()
        Write-Host ">> Xác nhận loại ticket từ breakdown: $TicketType" -ForegroundColor Cyan
    }
}

# Human Gate: Điểm dừng phê duyệt kế hoạch
Write-Host ""
$Confirm = Read-Host ">> Đã xem $BreakdownFile. Bạn có đồng ý tiếp tục? [y/N]"
if ($Confirm -notmatch '^[yY]') {
    Write-Host ">> Đã dừng pipeline theo yêu cầu người dùng." -ForegroundColor Yellow
    exit 0
}

# --- STEP 2: Analyst ---
$AnalysisFile = Join-Path $T "02-analysis.md"
if (-not (Test-Path $AnalysisFile)) {
    Write-Step "2/5 Analyst: Khảo sát codebase (Loại: $TicketType)"
    $analystPrompt = switch ($TicketType) {
        "bug" {
            "Dựa vào $TicketFile và $BreakdownFile, loại ticket là 'bug'. Kích hoạt skill 'debugging' để khảo sát codebase Angular, xác định chính xác Root Cause (nguyên nhân gốc rễ), kịch bản tái hiện lỗi và đề xuất sửa tối thiểu (minimal diff). Ghi phân tích vào $AnalysisFile"
        }
        "refactor" {
            "Dựa vào $TicketFile và $BreakdownFile, loại ticket là 'refactor'. Kích hoạt skill 'refactoring' để khảo sát codebase Angular, kiểm tra test suite hiện có và đề xuất pattern tái cấu trúc đảm bảo bảo toàn hành vi (behavior preservation). Ghi phân tích vào $AnalysisFile"
        }
        default {
            "Dựa vào $TicketFile và $BreakdownFile, loại ticket là 'feature'. Kích hoạt skill 'feature-development' để khảo sát codebase Angular, ranh giới kiến trúc (Component -> Facade -> SignalStore -> Service) và ghi phân tích kỹ thuật vào $AnalysisFile"
        }
    }
    Run-Agent -AgentName "analyst" -Prompt $analystPrompt
} else {
    Write-Host ">> [Đã có sẵn] Bỏ qua Analyst, sử dụng $AnalysisFile" -ForegroundColor Cyan
}

# --- STEP 3: Coder ---
$BranchPrefix = switch ($TicketType) {
    "bug"      { "fix" }
    "refactor" { "refactor" }
    default    { "feature" }
}
$TaskBranch = "$BranchPrefix/$TaskId"

# Tương thích ngược: nếu đã có nhánh feature/$TaskId từ trước
$legacyCheck = cmd.exe /c "git branch --list feature/$TaskId"
if ($legacyCheck -and ($legacyCheck.ToString().Trim())) {
    $TaskBranch = "feature/$TaskId"
}

Write-Step "3/5 Coder: Triển khai mã nguồn và kiểm thử ($TicketType trên nhánh $TaskBranch)"

# Chuyển nhánh feature/fix/refactor từ main an toàn (dùng cmd.exe để tránh lỗi NativeCommandError trên PowerShell)
$currentBranchRaw = cmd.exe /c "git branch --show-current"
$currentBranch = if ($currentBranchRaw) { $currentBranchRaw.ToString().Trim() } else { "" }

$branchCheck = cmd.exe /c "git branch --list $TaskBranch"
$hasBranch = if ($branchCheck) { $branchCheck.ToString().Trim() } else { "" }

if (-not $hasBranch) {
    if ($currentBranch -ne "main") {
        cmd.exe /c "git checkout main"
    }
    cmd.exe /c "git checkout -b $TaskBranch"
} else {
    if ($currentBranch -ne $TaskBranch) {
        cmd.exe /c "git checkout $TaskBranch"
    }
}

# Cập nhật Jira: chuyển sang In Progress & comment nhận task
if ($TaskId -match '^[A-Za-z]+-\d+$') {
    Write-Host ">> [Jira] Đang chuyển trạng thái $TaskId sang 'In Progress' và gửi thông báo..." -ForegroundColor Cyan
    try {
        & $ClaudeBin -p "Dùng tool mcp__atlassian__transitionJiraIssue với cloudId '$AtlassianCloudId', issueIdOrKey '$TaskId', transition id '21', và tool mcp__atlassian__addOrEditJiraIssueComment để thêm comment: '🤖 Subagent Coder đã nhận task và bắt đầu làm việc trên nhánh $TaskBranch (Loại: $TicketType).'" --dangerously-skip-permissions
    } catch {
        Write-Host ">> [Jira] Bỏ qua cập nhật Jira." -ForegroundColor Yellow
    }
}

$coderPrompt = switch ($TicketType) {
    "bug" {
        "Dựa vào $BreakdownFile và $AnalysisFile, loại ticket là 'bug'. Hãy dùng skill 'debugging': viết unit test bằng Vitest tái hiện lỗi trước (TDD), sửa đúng Root Cause theo minimal diff, chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa với commit message 'fix($TaskId): ...' (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)."
    }
    "refactor" {
        "Dựa vào $BreakdownFile và $AnalysisFile, loại ticket là 'refactor'. Hãy dùng skill 'refactoring': tái cấu trúc code nhưng tuyệt đối BẢO TOÀN HÀNH VI (behavior preservation), giữ nguyên interface, chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa với commit message 'refactor($TaskId): ...' (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)."
    }
    default {
        "Dựa vào $BreakdownFile và $AnalysisFile, loại ticket là 'feature'. Hãy dùng skill 'feature-development': implement code Angular tuân thủ ranh giới Explicit Layering (Component -> Facade -> SignalStore -> Service), viết unit test bằng Vitest, chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa với commit message 'feat($TaskId): ...' (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)."
    }
}

Run-Agent -AgentName "coder" -Prompt $coderPrompt

# --- STEP 4: Reviewer Loop ---
$Approved = $false
for ($round = 1; $round -le ($MaxFixRounds + 1); $round++) {
    Write-Step "4/5 Reviewer: Đánh giá chất lượng mã nguồn (Vòng $round - Loại: $TicketType)"
    $RoundReviewFile = Join-Path $T "03-review-round-$round.md"
    $LatestReviewFile = Join-Path $T "03-review.md"

    Run-Agent -AgentName "reviewer" -Prompt "Review toàn bộ thay đổi code trên nhánh hiện tại ($TaskBranch) bằng lệnh git diff main...HEAD. Đối chiếu với yêu cầu trong $TicketFile, $BreakdownFile (loại ticket: $TicketType) và các quy tắc kiến trúc. Ghi chi tiết nhận xét vào $RoundReviewFile. Dòng cuối cùng BẮT BUỘC là 'VERDICT: APPROVE' hoặc 'VERDICT: CHANGES_REQUESTED'."

    # Copy thành file review chính
    Copy-Item $RoundReviewFile $LatestReviewFile -Force

    # Kiểm tra kết luận verdict
    $ReviewContent = Get-Content $RoundReviewFile -Raw -ErrorAction SilentlyContinue
    if ($ReviewContent -match "(?i)VERDICT:\s*APPROVE") {
        Write-Host ">> [SUCCESS] Reviewer đã APPROVE ở vòng $round!" -ForegroundColor Green
        $Approved = $true
        break
    }

    if ($round -gt $MaxFixRounds) {
        Write-Host ">> [STOP] Đã hết $MaxFixRounds vòng sửa mà chưa được approve." -ForegroundColor Red
        Write-Host ">> Chi tiết phản hồi xem tại: $RoundReviewFile" -ForegroundColor Yellow
        exit 2
    }

    Write-Step "Coder: Sửa lỗi theo phản hồi của Reviewer (Vòng $round)"
    Run-Agent -AgentName "coder" -Prompt "Đọc nhận xét trong $RoundReviewFile, tiến hành sửa các điểm cần khắc phục, chạy lại kiểm tra 'cmd /c npm run verify' đến khi pass và git commit các thay đổi."
}

# --- STEP 5: Doc-writer ---
Write-Step "5/5 Doc-writer: Tổng kết PR, Changelog và cập nhật Jira"
$DocsFile = Join-Path $T "04-docs.md"
Run-Agent -AgentName "doc-writer" -Prompt "Dựa trên $TicketFile, $BreakdownFile (loại ticket: $TicketType) và git diff main...HEAD, hãy viết mô tả PR chi tiết, changelog và hướng dẫn kiểm thử vào $DocsFile"

# Đăng comment PR lên Jira
if (($TaskId -match '^[A-Za-z]+-\d+$') -and (Test-Path $DocsFile)) {
    Write-Host ">> [Jira] Đang đăng mẫu mô tả PR lên ticket $TaskId..." -ForegroundColor Cyan
    try {
        & $ClaudeBin -p "Đọc file $DocsFile, sau đó dùng tool mcp__atlassian__addOrEditJiraIssueComment với cloudId '$AtlassianCloudId' và issueIdOrKey '$TaskId' để đăng nội dung mô tả Pull Request và changelog từ file đó lên Jira." --dangerously-skip-permissions
        Write-Host ">> [Jira] Đã cập nhật mô tả PR lên ticket Jira thành công!" -ForegroundColor Green
    } catch {
        Write-Host ">> [Jira] Không thể đăng comment lên Jira (bỏ qua)." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host ">> Pipeline hoàn thành thành công!" -ForegroundColor Green
Write-Host ">> Tài liệu task: $T" -ForegroundColor Cyan
Write-Host ">> Nhánh làm việc: $TaskBranch" -ForegroundColor Cyan
Write-Host ">> Loại ticket: $TicketType" -ForegroundColor Cyan
Write-Host ">> Ticket Jira: $TaskId đã được cập nhật In Progress & mô tả PR" -ForegroundColor Cyan
Write-Host ">> Hãy kiểm tra lại và tiến hành tạo Pull Request." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
