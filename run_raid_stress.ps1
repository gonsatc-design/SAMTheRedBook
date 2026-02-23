#!/usr/bin/env powershell
# 🧪 TEST RAID STRESS - BLOCK 4 ONLY

Write-Host "🔥 Iniciando Test de Estrés - Bloque 4" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Ejecutar SOLO el test de raid_stress
Write-Host "Ejecutando: jest tests/raid_stress.test.js" -ForegroundColor Yellow
Write-Host ""

npx jest tests/raid_stress.test.js --config jest.config.backend.js --verbose --no-coverage

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Host "✅ TEST PASÓ - BLOQUE 4 OPERATIVO" -ForegroundColor Green
} else {
    Write-Host "❌ TEST FALLÓ - Ver detalles arriba" -ForegroundColor Red
}

Write-Host ""
exit $exitCode
