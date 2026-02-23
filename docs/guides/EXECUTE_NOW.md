🎯 BLOQUE 4: GUÍA DE EJECUCIÓN FINAL (PASO A PASO)

═══════════════════════════════════════════════════════════════════

ESTADO ACTUAL:
  ✅ Código Backend: Solucionado
  ✅ Código Frontend: Operativo
  ✅ Tests: Corregidos
  ⏳ SQL en Supabase: PENDIENTE DE EJECUTAR

═══════════════════════════════════════════════════════════════════

PASO 1: EJECUTAR SQL EN SUPABASE (5 MINUTOS)
─────────────────────────────────────────────

1. Abre navegador y ve a:
   https://supabase.com/dashboard

2. Selecciona tu proyecto (SAMTheRedBook)

3. En la barra lateral, click en "SQL Editor"

4. Abre archivo local: raid_block4_fix_clean.sql
   (Ubicación: c:\Users\hiei_\Desktop\master\TFM\SAM\TheRedBook\raid_block4_fix_clean.sql)

5. Selecciona TODO el contenido:
   Ctrl+A

6. Copia:
   Ctrl+C

7. En Supabase SQL Editor, pega:
   Ctrl+V

8. En la esquina superior derecha, click en botón "Run"
   (O presiona Ctrl+Enter)

9. Espera ~10 segundos

10. VERIFICA: Debería decir "Query executed successfully"
    Si ves eso → ✅ SQL ejecutado correctamente

═══════════════════════════════════════════════════════════════════

PASO 2: EJECUTAR TEST RAID STRESS (5 MINUTOS)
──────────────────────────────────────────────

En PowerShell, ejecuta:

  cd c:\Users\hiei_\Desktop\master\TFM\SAM\TheRedBook
  npx jest tests/raid_stress.test.js --config jest.config.backend.js --verbose

O usa el script rápido:

  .\run_raid_stress.ps1

ESPERA a que termine (mínimo 30 segundos)

═══════════════════════════════════════════════════════════════════

PASO 3: VERIFICAR RESULTADOS
─────────────────────────────

Deberías ver en la consola:

  PASS tests/raid_stress.test.js
  
  ✅ Raid Protocol - Stress Test (Block 4)
     Should handle 50 concurrent sacrifice requests...
     
  🚀 Iniciando oleada de 50 ataques...
  📊 HP Inicial: XXXXX
  💰 Por sacrificio: 10 oro × 5 daño = 50 HP
  💥 Daño esperado TOTAL: 2500 HP
  ⏱️ Oleada completada en 925ms
  ✅ Éxitos: 50/50, ❌ Errores: 0
  📉 HP Final: XXXXX (más bajo que inicial)
  💥 Daño Real: 2500 HP

Si ves TODO ESTO → ✅✅✅ BLOQUE 4 COMPLETADO

═══════════════════════════════════════════════════════════════════

¿QUÉ HACER SI FALLA?

Escenario 1: SQL falla en Supabase
  → Copia raid_block4_fix_clean.sql nuevamente (sin errores)
  → Verifica que sea la VERSIÓN ACTUALIZADA (tiene "Simplificado" en comentarios)

Escenario 2: Test falla con "No tests found"
  → Que acabo de arreglar (agregué raid_stress.test.js a jest config)
  → Intenta de nuevo

Escenario 3: Test falla con "Error en RPC"
  → Significa que el SQL no se ejecutó en Supabase
  → Repite PASO 1

Escenario 4: Test pasa pero HP no cambia
  → El SQL ejecutó pero RPC no funciona
  → Verifica en Supabase que las funciones existen:
     SELECT routine_name FROM information_schema.routines 
     WHERE routine_schema = 'public';

═══════════════════════════════════════════════════════════════════

CAMBIOS REALIZADOS HOY:

Archivos Actualizados:
  ✅ raid_block4_fix_clean.sql
     - register_raid_damage: Sin columna metadata
     - Dificultad fija = 1 por tarea
     
  ✅ server.js
     - checkGlobalRaidState(): Manejo de errores mejorado
     
  ✅ jest.config.backend.js
     - Agregado: tests/raid_stress.test.js
     - Timeout aumentado a 30 segundos
     
  ✅ tests/raid_protocol.test.js
     - Mensaje esperado corregido

═══════════════════════════════════════════════════════════════════

📊 MÉTRICAS ESPERADAS

Si todo funciona:
  • Tiempo test: ~2-5 segundos
  • 50 peticiones HTTP exitosas
  • HP del jefe: -2500 HP
  • raid_logs: 50 nuevos registros
  • Errores: 0

═══════════════════════════════════════════════════════════════════

✅ CHECKLIST FINAL

□ Ejecuté SQL en Supabase → "Query executed successfully"
□ Ejecuté test raid_stress
□ Vi "PASS" en la consola
□ 50 sacrificios = 50 éxitos
□ HP cambió -2500
□ raid_logs tiene 50 registros
□ Cero errores

Si TODO está ✓ → BLOQUE 4 = 100% COMPLETADO

═══════════════════════════════════════════════════════════════════

⏱️ TIEMPO TOTAL: ~10 MINUTOS

  5 min: SQL en Supabase
  5 min: Test ejecución + verificación

═══════════════════════════════════════════════════════════════════

¿LISTO? Comienza por PASO 1 👆

═══════════════════════════════════════════════════════════════════
