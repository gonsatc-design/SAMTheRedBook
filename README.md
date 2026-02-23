# S.A.M. (Social Achievement Manager) - El Libro Rojo

Aplicación web de productividad con narrativa RPG e IA.
Proyecto de TFM (Máster en Desarrollo con IA - BigSchool + MoureDev).

## Qué hace la app

- Convierte tareas escritas en lenguaje natural en misiones.
- Permite marcar éxito o fracaso y aplicar consecuencias de juego.
- Usa IA para generar texto útil y para sugerencias predictivas (Palantír).
- Incluye progreso (XP, nivel), logros, inventario/mochila y forja.
- Muestra analítica semanal por razas.
- Se puede instalar como PWA.

## Stack técnico

- Frontend: HTML, CSS, JavaScript + Tailwind
- Backend: Node.js + Express
- BD/Auth/Realtime: Supabase
- IA: Google Gemini

## Ejecución local

1. Instalar dependencias:
```bash
npm install
```

2. Crear variables de entorno:
```bash
cp .env.example .env
```

3. Arrancar servidor:
```bash
npm start
```

4. Ejecutar tests:
```bash
npm test
npm run test:backend
npm run test:frontend
```

## Uso real (sin humo)

1. Inicia sesión.
2. Escribe una tarea.
3. La app la convierte en misión.
4. Marca resultado (cumplida o fallida).
5. Revisa progreso, inventario, forja y mapa táctico.

No hay ranking global activo en esta versión.

## Estructura SQL

Los scripts SQL están organizados en:

- `sql/00_schema/`
- `sql/01_migrations/`
- `sql/02_fixes/`
- `sql/03_raid/`
- `sql/04_maintenance/`

## Documentación

- `docs/tfm/README.md` (documentación de entrega TFM)
- `README-DEPLOY.md` (despliegue)
- `tfm-showcase.html` (documentación visual web)

## Autor

Javier González Olivera
TFM 2026
