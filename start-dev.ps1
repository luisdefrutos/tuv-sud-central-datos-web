# start-dev.ps1: Lanza la API .NET 10 y el Frontend React de forma simultánea
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Iniciando TÜV SÜD Central Datos (Fullstack Dev)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
$apiDir = Join-Path $root "src\CentralDatos.Api"
$webDir = Join-Path $root "src\central-datos-web"

Write-Host "1. Lanzando Backend API (.NET 10 en http://localhost:5113)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiDir'; Write-Host '--- API .NET 10 (CentralDatos.Api) ---' -ForegroundColor Cyan; dotnet run --launch-profile http"

Write-Host "2. Lanzando Frontend React (Vite en http://localhost:5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webDir'; Write-Host '--- Frontend React (TÜV SÜD Algorithm DS) ---' -ForegroundColor Cyan; npm run dev"

Write-Host "3. Esperando 3 segundos y abriendo el navegador..." -ForegroundColor Green
Start-Sleep -Seconds 3

# Abre la Aplicación Web en el navegador
Start-Process "http://localhost:5173"

# Abre Swagger UI en el navegador
Start-Process "http://localhost:5113/swagger"

Write-Host "`nAmbos servicios están en ejecución." -ForegroundColor Yellow
Write-Host "Frontend Web: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Swagger UI:   http://localhost:5113/swagger" -ForegroundColor Cyan
