$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "[1/6] Check Node.js"
& node --version
if($LASTEXITCODE -ne 0){throw "Node.js check failed."}
Write-Host "[2/6] Install frontend dependencies"
& npm.cmd ci
if($LASTEXITCODE -ne 0){throw "npm ci failed."}
$python = $null
foreach($candidate in @((Get-Command py -ErrorAction SilentlyContinue).Source,(Get-Command python -ErrorAction SilentlyContinue).Source,"$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe")) {
  if(-not $candidate -or -not (Test-Path $candidate)){continue}
  try { & $candidate --version *> $null; if($LASTEXITCODE -eq 0){$python=$candidate;break} } catch {}
}
if (-not $python) { throw "Python 3.11+ was not found. Install Python and retry." }
Write-Host "[3/6] Create backend virtual environment"
if (-not (Test-Path "backend\.venv\Scripts\python.exe")) { & $python -m venv backend\.venv }
if($LASTEXITCODE -ne 0){throw "Python virtual environment creation failed."}
Write-Host "[4/6] Install pinned backend dependencies"
& backend\.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r backend\requirements.txt
if($LASTEXITCODE -ne 0){throw "Backend dependency installation failed."}
Write-Host "[5/6] Create data directory and run migrations"
New-Item -ItemType Directory -Path backend\data -Force | Out-Null
$env:NDG_DATA_DIR = (Resolve-Path backend\data).Path
Push-Location backend
try {
  & .\.venv\Scripts\python.exe -m scripts.migrate
  if($LASTEXITCODE -ne 0){throw "Database migration failed."}
} finally { Pop-Location }
Write-Host "[6/6] Create local safe defaults"
if (-not (Test-Path ".env.local")) {
  $defaults = @(
    "NEXT_PUBLIC_BUILD_PROFILE=local_integrated"
    "NEXT_PUBLIC_REAL_WORKSPACE_ENABLED=true"
    "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000"
  ) -join [Environment]::NewLine
  [System.IO.File]::WriteAllText((Join-Path $root ".env.local"), $defaults + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}
Write-Host "Setup complete. Start with: npm.cmd run dev:integrated"
