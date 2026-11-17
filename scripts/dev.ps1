# Starts the HireFlow development stack in separate terminals:
#   API (php artisan serve :8000), queue worker, scheduler, and the Vite dev server (:5173).
# Usage (from the repository root):  .\scripts\dev.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

if (-not (Test-Path (Join-Path $backend 'vendor'))) {
    Write-Error "backend\vendor is missing. Run 'composer install' in backend first (see docs\SETUP.md)."
}
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Error "frontend\node_modules is missing. Run 'npm install' in frontend first (see docs\SETUP.md)."
}

Start-Process powershell -WorkingDirectory $backend -ArgumentList '-NoExit', '-Command', 'php artisan serve --port=8000'
Start-Process powershell -WorkingDirectory $backend -ArgumentList '-NoExit', '-Command', 'php artisan queue:work --tries=3'
Start-Process powershell -WorkingDirectory $backend -ArgumentList '-NoExit', '-Command', 'php artisan schedule:work'
Start-Process powershell -WorkingDirectory $frontend -ArgumentList '-NoExit', '-Command', 'npm run dev'

Write-Host ''
Write-Host 'HireFlow is starting:' -ForegroundColor Cyan
Write-Host '  App     http://localhost:5173/status'
Write-Host '  API     http://localhost:8000/api/v1/health'
Write-Host '  API docs http://localhost:8000/api/documentation'
