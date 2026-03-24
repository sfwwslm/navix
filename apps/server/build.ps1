$ErrorActionPreference = "Stop"

$FrontendDir = "frontend"
$BackendDir  = "backend"

# 检查是否在项目根目录
if (-not (Test-Path $FrontendDir -PathType Container) -or -not (Test-Path $BackendDir -PathType Container)) {
    Write-Host "❌ 请在项目根目录下运行此脚本 (缺少 frontend/ 或 backend/ 目录)" -ForegroundColor Red
    exit 1
}

# 检查 pnpm 是否存在
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    Write-Host "❌ 未找到 pnpm，请先安装：" -ForegroundColor Red
    Write-Host "   Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 编译前端..." -ForegroundColor Cyan
Set-Location $FrontendDir
pnpm install
pnpm build
Set-Location ..

Write-Host "⚙️ 编译后端..." -ForegroundColor Cyan
Set-Location $BackendDir
cargo build --release
Set-Location ..

Write-Host "✅ 构建完成！" -ForegroundColor Green
