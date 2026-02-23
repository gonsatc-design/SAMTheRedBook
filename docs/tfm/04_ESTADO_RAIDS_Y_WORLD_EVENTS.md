# Estado Real De Raids Y World Events

## Resumen rapido

El modulo existe y funciona a nivel base (backend + realtime + HUD), pero su narrativa de "temporada completa" no esta cerrada como producto independiente.

## Lo que SI esta implementado

- Consulta de estado global (`get_world_status`).
- Registro de dano/sacrificio (RPCs asociados).
- Endpoint de sacrificio.
- Suscripcion realtime a cambios de `world_events` y `raid_logs`.
- HUD de progreso integrado en Diario.

## Lo que esta parcial / pendiente de pulido

- Capa narrativa semanal completa (inicio-cierre-premio global explicitos).
- Reglas de temporada visibles para usuario no tecnico.
- Tab/panel dedicado exclusivamente a raid.

## Decision recomendada para entrega TFM

- Mantener modulo estable sin refactor destructivo.
- Documentar alcance actual claramente (este archivo).
- Presentarlo como base funcional con roadmap de expansion.

## Mensaje sugerido para defensa

"Se implemento una base operativa de eventos globales con sincronizacion en tiempo real. Para evitar riesgo de regresion en fase final, se priorizo estabilidad y trazabilidad sobre expansion de reglas de temporada."
