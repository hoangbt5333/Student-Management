<#
.SYNOPSIS
    Pipeline tự động cho Claude Code trên Windows (PowerShell):
    Planner -> Analyst -> Coder -> Reviewer Loop -> Doc-writer
.EXAMPLE
    .\run-pipeline.ps1 TASK-001
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

# 1. Kiểm tra ticket đầu vào
if (-not (Test-Path $TicketFile)) {
    Write-Host "[LỖI] Thiếu file ticket: $TicketFile" -ForegroundColor Red
    Write-Host "Vui lòng tạo file ticket hoặc đồng bộ từ Jira trước khi chạy." -ForegroundColor Yellow
    exit 1
}

# 2. Nhận diện CLI binary (claudex hoặc claude)
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

function Write-Step {
    param([string]$Title)
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "=== $Title" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
}

function Invoke-ClaudeAgent {
    param(
        [string]$AgentName,
        [string]$Prompt
    )
    # Redirect $null vào stdin để tránh chờ stdin 3s
    $process = Start-Process -FilePath $ClaudeBin -ArgumentList @("--agent", $AgentName, "-p", $Prompt, "--dangerously-skip-permissions") -NoNewWindow -PassThru -Wait -RedirectStandardInput ([System.IO.Path]::Combine($env:TEMP, "null.txt"))
    if (-not (Test-Path ([System.IO.Path]::Combine($env:TEMP, "null.txt")))) {
        "" | Out-File ([System.IO.Path]::Combine($env:TEMP, "null.txt")) -Encoding utf8
    }
}

# Tạo file null rỗng cho stdin
$NullInputFile = [System.IO.Path]::Combine($env:TEMP, "claude-null-input.txt")
if (-not (Test-Path $NullInputFile)) {
    "" | Out-File $NullInputFile -Encoding utf8
}

function Run-Agent {
    param(
        [string]$AgentName,
        [string]$Prompt
    )
    & $ClaudeBin --agent $AgentName -p $Prompt --dangerously-skip-permissions
}

# --- STEP 1: Planner ---
Write-Step "1/5 Planner: Lập kế hoạch phân rã subtasks"
$BreakdownFile = Join-Path $T "01-breakdown.md"
Run-Agent -AgentName "planner" -Prompt "Đọc $TicketFile, phân rã thành các subtask rõ ràng theo thứ tự phụ thuộc kiến trúc và ghi kết quả vào $BreakdownFile"

# Human Gate: Điểm dừng phê duyệt kế hoạch
Write-Host ""
$Confirm = Read-Host ">> Đã ghi $BreakdownFile. Bạn có đồng ý tiếp tục? [y/N]"
if ($Confirm -notmatch '^[yY]$') {
    Write-Host ">> Đã dừng pipeline theo yêu cầu người dùng." -ForegroundColor Yellow
    exit 0
}

# --- STEP 2: Analyst ---
Write-Step "2/5 Analyst: Khảo sát codebase và ranh giới kiến trúc"
$AnalysisFile = Join-Path $T "02-analysis.md"
Run-Agent -AgentName "analyst" -Prompt "Dựa vào $TicketFile và $BreakdownFile, khảo sát codebase Angular và ghi phân tích kỹ thuật vào $AnalysisFile"

# --- STEP 3: Coder ---
Write-Step "3/5 Coder: Triển khai mã nguồn và kiểm thử"
$FeatureBranch = "feature/$TaskId"

# Chuyển nhánh feature
try {
    git checkout -b $FeatureBranch 2>$null
} catch {
    git checkout $FeatureBranch
}

Run-Agent -AgentName "coder" -Prompt "Dựa vào $BreakdownFile và $AnalysisFile, hãy implement code Angular, viết unit test (Vitest), chạy lệnh kiểm tra 'cmd /c npm run verify' đến khi pass hoàn toàn, sau đó commit code đã sửa (TUYỆT ĐỐI KHÔNG commit thư mục tasks/)."

# --- STEP 4: Reviewer Loop ---
$Approved = $false
for ($round = 1; $round -le ($MaxFixRounds + 1); $round++) {
    Write-Step "4/5 Reviewer: Đánh giá chất lượng mã nguồn (Vòng $round)"
    $RoundReviewFile = Join-Path $T "03-review-round-$round.md"
    $LatestReviewFile = Join-Path $T "03-review.md"

    Run-Agent -AgentName "reviewer" -Prompt "Review toàn bộ thay đổi code trên nhánh feature hiện tại bằng lệnh git diff main...HEAD. Đối chiếu với yêu cầu trong $TicketFile và các quy tắc kiến trúc. Ghi chi tiết nhận xét vào $RoundReviewFile. Dòng cuối cùng BẮT BUỘC là 'VERDICT: APPROVE' hoặc 'VERDICT: CHANGES_REQUESTED'."

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
Write-Step "5/5 Doc-writer: Tổng kết PR, Changelog và hướng dẫn test"
$DocsFile = Join-Path $T "04-docs.md"
Run-Agent -AgentName "doc-writer" -Prompt "Dựa trên $TicketFile, $BreakdownFile và git diff main...HEAD, hãy viết mô tả PR chi tiết, changelog và hướng dẫn kiểm thử vào $DocsFile"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host ">> Pipeline hoàn thành thành công!" -ForegroundColor Green
Write-Host ">> Tài liệu task: $T" -ForegroundColor Cyan
Write-Host ">> Nhánh feature: $FeatureBranch" -ForegroundColor Cyan
Write-Host ">> Hãy kiểm tra lại và tiến hành tạo Pull Request." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
