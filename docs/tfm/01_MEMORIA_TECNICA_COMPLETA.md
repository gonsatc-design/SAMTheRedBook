# Memoria Tecnica Completa - S.A.M. El Libro Rojo

## 1) Stack tecnologico

### Frontend

- HTML5, CSS3, JavaScript Vanilla.
- Tailwind CSS (utilidades de layout y estilos rapidos).
- Chart.js (graficas semanales por razas).
- PWA (manifest + service worker).

### Backend

- Node.js + Express.
- API REST para tareas, perfil, inventario, logros, analitica y eventos globales.
- Integracion IA con Google Gemini.

### Datos y autenticacion

- Supabase:
  - PostgreSQL como datastore principal.
  - Supabase Auth (JWT y middleware de proteccion).
  - Realtime para sincronizacion de eventos globales.

## 2) Arquitectura funcional

### Modulo de identidad

- Login y sesion via Supabase Auth.
- Perfil autocreado al primer acceso.
- Seleccion de raza inicial y cambio de raza de alto coste (oro).

### Modulo de misiones

- Entrada libre del usuario.
- IA transforma input en tareas estructuradas y narrativas.
- Juicio de estado (exito/fracaso).
- Persistencia completa de tiempos (`created_at`, `completed_at`, `failed_at`).

### Modulo de progreso

- XP, nivel, oro.
- Titulo evolutivo por raza.
- Logros por hitos.

### Modulo de economia e inventario

- Loot por completado.
- Inventario agrupado por item.
- Badges NEW por usuario (clave local separada por `userId`).
- Forja para convertir recursos en artefactos con efectos.

### Modulo IA (Palantir)

- Prediccion en base a historial.
- Cache por usuario para evitar mezclar sesiones.
- Fallback neutral para cuentas nuevas sin actividad.

### Modulo de visualizacion

- Diario de misiones.
- Mapa tactico semanal por raza (Humano, Elfo, Enano, Hobbit).
- Reinicio semanal indicado (domingo 23:59).

### Modulo de ambiente dinamico

- Sistema de oscuridad progresiva por fallos acumulados:
  - Nivel 1, 2 y 3 con degradacion visual.
  - Vignette/sensacion de presion en niveles altos.

## 3) Flujo principal de uso

1. Usuario inicia sesion.
2. Si es nuevo:
   - Guia obligatoria.
   - Seleccion de raza.
3. Escribe tarea en diario.
4. IA crea gesta.
5. Usuario marca exito o fracaso.
6. Sistema actualiza:
   - Misiones
   - XP/nivel/oro
   - Loot/logros
   - Barra de avance de viaje

## 4) Seguridad y control

- Endpoints protegidos por middleware JWT.
- Separacion por usuario en consultas de datos personales.
- CORS y gestion de variables de entorno.
- Operaciones criticas de estado en backend (no solo en cliente).

## 5) Rendimiento y UX

- Actualizacion de barra en modo burst tras acciones de juicio para feedback inmediato.
- Realtime para eventos globales.
- Toasts y modales no bloqueantes.
- Input de diario mejorado con `textarea` autoajustable.

## 6) Estado de modulo raids/world events

El proyecto incluye base funcional de eventos globales:

- estado global consultable
- logs de raid
- sacrificios de recursos
- sincronizacion realtime

No se recomienda desmontar este bloque en fase final de entrega por riesgo de regresion.
La estrategia recomendada es: mantener estable y documentar alcance actual.
