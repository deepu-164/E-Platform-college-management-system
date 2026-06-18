param(
  [int]$FrontendPort = 8080,
  [int]$BackendPort = 4000,
  [int]$DbPort = 5432,
  [string]$PgBin = "C:\Program Files\PostgreSQL\13\bin",
  [string]$PgData = "$PSScriptRoot\backend\.postgres\data"
)

$ErrorActionPreference = "Stop"

function Test-PostgresReady {
  param(
    [string]$PgIsReadyPath,
    [int]$Port
  )

  & $PgIsReadyPath -h localhost -p $Port | Out-Null
  return $LASTEXITCODE -eq 0
}

$pgCtl = Join-Path $PgBin "pg_ctl.exe"
$pgIsReady = Join-Path $PgBin "pg_isready.exe"

if (-not (Test-Path $pgCtl)) {
  throw "pg_ctl.exe not found at '$pgCtl'. Update -PgBin."
}

if (-not (Test-Path $pgIsReady)) {
  throw "pg_isready.exe not found at '$pgIsReady'. Update -PgBin."
}

if (-not (Test-Path $PgData)) {
  throw "PostgreSQL data directory not found at '$PgData'."
}

if (-not (Test-PostgresReady -PgIsReadyPath $pgIsReady -Port $DbPort)) {
  $logPath = Join-Path $PSScriptRoot "backend\.postgres\postgres.log"
  Write-Host "Starting PostgreSQL on localhost:$DbPort ..."
  & $pgCtl -D $PgData -l $logPath -o "-p $DbPort" start | Out-Host
  Start-Sleep -Seconds 2
}

if (-not (Test-PostgresReady -PgIsReadyPath $pgIsReady -Port $DbPort)) {
  throw "PostgreSQL did not start correctly. Check backend\.postgres\postgres.log"
}

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

Write-Host "Opening backend terminal..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$backendDir'; npm run dev"
)

Write-Host "Opening frontend terminal..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$frontendDir'; npm run dev -- --port $FrontendPort"
)

Write-Host ""
Write-Host "Backend expected at:  http://localhost:$BackendPort"
Write-Host "Frontend expected at: http://localhost:$FrontendPort"
Write-Host "Health check:          http://localhost:$BackendPort/api/health"
