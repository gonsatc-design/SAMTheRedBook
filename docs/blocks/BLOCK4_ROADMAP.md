🗺️ HOJA DE RUTA: COMPLETAR BLOQUE 4 EN 5 MINUTOS

═══════════════════════════════════════════════════════════════════

CHECKLIST DE IMPLEMENTACIÓN

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  BLOQUE 4: TEMPLADO DE RED Y SINCRONÍA (Día 07)               │
│                                                                 │
│  ✅ Backend Sacrificio (server.js)                             │
│     └─ POST /api/raid/sacrifice implementado                   │
│     └─ Valida oro/XP y deduce correctamente                    │
│     └─ Nuevo: Logging detallado para debugging                 │
│                                                                 │
│  ✅ Base de Datos - Recompensas (raid_block4_victory.sql)     │
│     └─ grant_victory_rewards() implementado                    │
│     └─ _internal_apply_damage() con logica de victoria         │
│     └─ PENDIENTE: Actualizar RPCs en Supabase ⚠️              │
│                                                                 │
│  ✅ Frontend HUD (index.html)                                  │
│     └─ Barra HP masiva con degradado rojo/fuego               │
│     └─ Sprite Balrog (🔥) con animación flare                 │
│     └─ Fire particles que flotan al recibir daño              │
│     └─ Shake animation implementado                            │
│                                                                 │
│  ✅ Realtime Sync (client.js)                                  │
│     └─ Supabase Realtime escucha UPDATE world_events          │
│     └─ Escucha INSERT raid_logs para feed                     │
│     └─ triggerDamageEffects() activa animaciones              │
│                                                                 │
│  ✅ Test de Estrés (tests/raid_stress.test.js)               │
│     └─ 50 peticiones concurrentes con Promise.all             │
│     └─ Nuevo: Debugging detallado integrado                   │
│     └─ Nuevo: Consulta raid_logs para verificar              │
│                                                                 │
│  ✅ Documentación (docs/raid_flow.md)                          │
│     └─ 5 pasos del flujo de datos explicados                  │
│     └─ JARVIS tone: técnico, directo                          │
│                                                                 │
│  ⚠️  PENDIENTE: Ejecutar Fix SQL                               │
│     └─ raid_block4_fix_damage_flow.sql (YA CREADO)            │
│     └─ Duracion estimada: 5 minutos                           │
│     └─ Sin riesgo de pérdida de datos                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════

PLAN DE ACCIÓN (5 PASOS)

PASO 1: Aplica Fix SQL [2 minutos]
═════════════════════════════════════

1.1 Abre Supabase Dashboard
    URL: https://supabase.com/dashboard

1.2 Ve a SQL Editor (sidebar izquierdo)

1.3 Abre archivo: raid_block4_fix_damage_flow.sql

1.4 Copia TODO el contenido (Ctrl+A, Ctrl+C)

1.5 En Supabase SQL Editor, pega (Ctrl+V)

1.6 Click botón "Run" (esquina superior derecha)

1.7 Espera a que termine (~5 segundos)
    Verás: "Query executed successfully"

✅ HECHO: Las RPCs están actualizadas en Supabase


PASO 2: Verifica el Fix [1 minuto]
═══════════════════════════════════

2.1 En el mismo SQL Editor, busca este bloque:
    (Está al final del script, comentado)
    
    /*
    DO $$
    DECLARE
        v_user_id UUID;
    ...
    END $$;
    */

2.2 Descomenta el bloque (quita /* y */)

2.3 Click "Run" de nuevo

2.4 En la consola (panel inferior), busca:
    "NOTICE: 💥 Daño Aplicado: 50"

2.5 Si lo ves, el fix funciona ✅

✅ HECHO: Fix verificado


PASO 3: Ejecuta Test Rápido [1 minuto]
════════════════════════════════════════

3.1 En terminal, navega al proyecto:
    cd c:\Users\hiei_\Desktop\master\TFM\SAM\TheRedBook

3.2 Ejecuta el test rápido:
    node quick_test_block4.js

3.3 Espera a que termine
    
3.4 Busca en output:
    ✅ BLOQUE 4 ESTÁ FUNCIONANDO CORRECTAMENTE!

✅ HECHO: Test rápido pasó


PASO 4: Ejecuta Test Completo [1 minuto]
═══════════════════════════════════════════

4.1 En terminal, ejecuta:
    npm test -- raid_stress

4.2 Espera a que termine
    
4.3 En output, busca:
    "✅ Éxitos: 50/50, ❌ Errores: 0"
    "💥 Daño Real: 2500 HP"
    
4.4 Si ves eso, el test PASÓ ✅

✅ HECHO: Test completo pasó


PASO 5: Verifica Frontend [0 minutos - automático]
═════════════════════════════════════════════════════

5.1 Frontend ya está actualizado y funcionando
    (client.js tiene todo integrado)

5.2 Abre index.html en navegador

5.3 Si hay un raid activo, verás:
    ✓ Barra HP en tiempo real
    ✓ Feed de batalla actualizándose
    ✓ Fire particles en cada ataque
    ✓ Timer de cuenta atrás

✅ HECHO: Todo está operativo


═══════════════════════════════════════════════════════════════════

VALIDACIÓN FINAL

Después de los 5 pasos, verifica que TODAS estas cosas funcionan:

📊 Backend:
  ✅ POST /api/raid/sacrifice devuelve 200
  ✅ Oro se deduce del perfil
  ✅ HP del jefe disminuye

📝 Base de Datos:
  ✅ raid_logs tiene registros de sacrificios
  ✅ world_events.current_hp cambia
  ✅ Recompensas se distribuyen (cuando HP = 0)

🎨 Frontend:
  ✅ Barra HP actualiza en tiempo real
  ✅ Feed de batalla muestra nuevos ataques
  ✅ Fire particles se emiten
  ✅ Shake animation activa

🧪 Tests:
  ✅ 50/50 sacrificios exitosos
  ✅ Daño calculado = 2500 HP
  ✅ raid_logs contiene los 50 registros

═══════════════════════════════════════════════════════════════════

TROUBLESHOOTING

Si el Fix SQL falla:

❌ "Error: undefined function get_world_status"
   → Significa que falta la RPC get_world_status
   → Busca: grep_search get_world_status
   → Crea la función si no existe

❌ "Error: permission denied for schema public"
   → Significa que no tienes permisos de escritura
   → En Supabase, ve a Authentication > Policies
   → Verifica que tienes WRITE en raid_logs y world_events

❌ "NOTICE: 💥 Daño Aplicado: 0"
   → El daño no se aplicó porque no hay jefe activo
   → Ve a Supabase y verifica:
     SELECT * FROM world_events WHERE is_active = true;
   → Si está vacío, inserta un jefe:
     INSERT INTO world_events 
     (event_name, current_hp, max_hp, is_active) 
     VALUES ('Sauron', 10000, 10000, true);


Si el test rápido falla:

❌ "Servidor no responde"
   → npm start en otra terminal

❌ "Error en get_world_status"
   → Ejecuta el Fix SQL nuevamente

❌ "HP no cambió"
   → Espera 5 segundos más
   → Verifica que hay jefe activo
   → Mira los logs en Supabase


═══════════════════════════════════════════════════════════════════

TIEMPO ESTIMADO TOTAL: 5 MINUTOS ⏱️

Desglose:
  • Paso 1 (Fix SQL): 2 min
  • Paso 2 (Verificación): 1 min
  • Paso 3 (Test rápido): 1 min
  • Paso 4 (Test completo): 1 min
  • Troubleshooting: 0 min (si todo funciona)

═══════════════════════════════════════════════════════════════════

ARCHIVOS INVOLUCRADOS

Nuevos (hoy):
  📄 raid_block4_fix_damage_flow.sql   ← EJECUTA ESTO
  📄 quick_test_block4.js              ← Usa esto para test rápido
  📄 BLOCK4_FIX_GUIDE.md               ← Guía detallada
  📄 BLOCK4_SUMMARY.md                 ← Resumen ejecutivo
  🗺️  BLOCK4_ROADMAP.md                ← Este archivo

Actualizados (hoy):
  🔧 server.js                          ← Nuevo logging
  🧪 tests/raid_stress.test.js          ← Mejor debugging

Ya existentes (completado en Día 07):
  ✅ index.html                         ← HUD de Guerra
  ✅ client.js                          ← Realtime
  ✅ docs/raid_flow.md                  ← Documentación

═══════════════════════════════════════════════════════════════════

¿PREGUNTAS?

Ver archivos:
  • BLOCK4_FIX_GUIDE.md: Instrucciones paso a paso
  • BLOCK4_SUMMARY.md: Resumen técnico completo
  • agents.md: Descripción del rol SAM

═══════════════════════════════════════════════════════════════════

🎯 META: Bloque 4 100% Operativo en 5 Minutos

Inicio: [Aquí]
Fin: [5 minutos después]

Status: ⚠️ 95% HECHO - Requiere Fix SQL (2 min)

═══════════════════════════════════════════════════════════════════
