$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "[1/5] 检查 Node.js"
& node --version
Write-Host "[2/5] 安装前端依赖"
& npm.cmd ci
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command py -ErrorAction SilentlyContinue).Source }
if (-not $python) { throw "未找到 Python 3.11+。请安装Python并重新运行。" }
Write-Host "[3/5] 创建后端虚拟环境"
if (-not (Test-Path "backend\.venv\Scripts\python.exe")) { & $python -m venv backend\.venv }
Write-Host "[4/5] 安装锁定的后端依赖"
& backend\.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r backend\requirements.txt
Write-Host "[5/5] 创建数据目录并执行迁移"
New-Item -ItemType Directory -Path backend\data -Force | Out-Null
$env:NDG_DATA_DIR = (Resolve-Path backend\data).Path
Push-Location backend
try { & .\.venv\Scripts\python.exe scripts\migrate.py } finally { Pop-Location }
Write-Host "安装完成。日常启动：npm.cmd run dev:integrated"

