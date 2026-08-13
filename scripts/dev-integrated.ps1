$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Test-Path "backend\.venv\Scripts\python.exe")) { throw "Backend is not installed. Run npm.cmd run setup:integrated first." }
foreach ($port in 3000,8000) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Port $port is already in use. Stop the conflicting process and retry." }
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
  if (-not $healthy -or $backend.HasExited -or $frontend.HasExited) { throw "Integrated startup failed. Check ports and installed dependencies." }
  Write-Host "Real workflow: http://127.0.0.1:3000/real"
  Write-Host "Backend health: http://127.0.0.1:8000/api/v1/health"
  Write-Host "Press Ctrl+C to stop both services."
  while (-not $backend.HasExited -and -not $frontend.HasExited) { Start-Sleep -Seconds 1 }
  throw "One service exited unexpectedly; the integrated environment has stopped."
} finally {
  foreach($process in $backend,$frontend){if($process -and -not $process.HasExited){Stop-Process -Id $process.Id -Force}}
}
