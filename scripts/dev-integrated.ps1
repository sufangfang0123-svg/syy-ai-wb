$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Test-Path "backend\.venv\Scripts\python.exe")) { throw "尚未安装后端。请先运行 npm.cmd run setup:integrated" }
foreach ($port in 3000,8000) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "端口 $port 已被占用，请关闭冲突程序后重试。" }
}
$env:NDG_DATA_DIR = (Resolve-Path backend\data).Path
$backend = Start-Process -FilePath "$root\backend\.venv\Scripts\python.exe" -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000" -WorkingDirectory "$root\backend" -PassThru -WindowStyle Hidden
$env:NEXT_PUBLIC_BUILD_PROFILE = "local_integrated"
$env:NEXT_PUBLIC_REAL_WORKSPACE_ENABLED = "true"
$env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000"
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev:local","--","--hostname","127.0.0.1","--port","3000" -WorkingDirectory $root -PassThru -WindowStyle Hidden
try {
  $healthy = $false
  1..40 | ForEach-Object { try { $response=Invoke-RestMethod http://127.0.0.1:8000/api/v1/health -TimeoutSec 1; if($response.status -eq "ok"){$healthy=$true;return} } catch {}; Start-Sleep -Milliseconds 500 }
  if (-not $healthy -or $backend.HasExited -or $frontend.HasExited) { throw "服务启动失败；请检查端口和依赖安装。" }
  Write-Host "真实闭环前端：http://127.0.0.1:3000/real"
  Write-Host "后端健康检查：http://127.0.0.1:8000/api/v1/health"
  Write-Host "按 Ctrl+C 同时停止前后端。"
  while (-not $backend.HasExited -and -not $frontend.HasExited) { Start-Sleep -Seconds 1 }
  throw "其中一个服务意外退出，集成环境已停止。"
} finally {
  foreach($process in $backend,$frontend){if($process -and -not $process.HasExited){Stop-Process -Id $process.Id -Force}}
}

