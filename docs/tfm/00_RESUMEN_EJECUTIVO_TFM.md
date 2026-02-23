# S.A.M. El Libro Rojo - Resumen Ejecutivo (TFM)

Contexto academico: BigSchool + MoureDev (Master en Desarrollo con IA).

## 1) Problema que resuelve

La app aborda un problema real de productividad personal: planificar no basta, porque sin feedback emocional, narrativa y seguimiento continuo, el usuario abandona rapido.

S.A.M. transforma tareas en una experiencia de rol con IA para aumentar adherencia diaria:

- Traduce tareas comunes a gestas epicas.
- Convierte progreso en avance narrativo visible.
- Penaliza el abandono con mecanicas de oscuridad/horda.
- Refuerza comportamiento positivo con recompensas, logros y progreso.

## 2) Propuesta de valor

S.A.M. combina en una sola experiencia:

- Productividad real (captura, seguimiento, cierre de tareas).
- IA aplicada (clasificacion y narrativa contextual).
- Gamificacion profunda (raza, progreso, logros, inventario, forja).
- Telemetria y visualizacion semanal por razas.
- UX inmersiva LOTR para mantener motivacion.

Ademas, incorpora un experimento social medible: las graficas por raza y por dia permiten comparar patrones reales de comportamiento (completadas/fallidas y media semanal) para extraer conclusiones accionables, por ejemplo:

- "Los usuarios Enano anaden una media de +3 tareas/dia frente a Elfo".
- "Humano concentra mas fallos en mitad de semana".
- "Hobbit mantiene mayor consistencia de cierre semanal".

## 3) Resultado funcional actual

El sistema esta operativo end-to-end:

- Autenticacion y perfiles por usuario.
- Creacion y juicio de misiones.
- Progreso y recompensas.
- Guia de onboarding.
- Prediccion IA (Palantir).
- UI reactiva y PWA.
- Login simplificado: admite acceso rapido sin exigir `@` y sin verificacion adicional.
- Microdetalles de experiencia: popup de botin, icono de raza en barra de viaje, cambio de nickname, XP/nivel con barra visible, forja conectada a materiales en BBDD y sistema de logros detallado.

## 4) Impacto para el usuario

- Mayor claridad sobre que hacer hoy.
- Mayor constancia por feedback inmediato.
- Mejor percepcion de avance (barra de viaje al Monte del Destino).
- Reduccion del olvido/abandono por recordatorios visuales y penalizaciones progresivas.
- Sensacion de objetivo compartido MMO-like: la comunidad colabora para acercar el viaje al Monte del Destino y frenar la oscuridad.

## 5) Diferencial academico (IA + producto)

No es solo un chatbot ni una app de tareas:

- Integra IA como motor de experiencia, no como extra.
- Presenta una arquitectura completa de producto con backend, auth, persistencia, analitica y realtime.
- Permite medir valor por uso diario y evolucion semanal.
- Convierte una app de tareas en un sistema narrativo vivo con capas de motivacion, telemetria social y feedback conductual.
- El Palantir aporta valor predictivo accionable: detecta patron de riesgo y propone ajustes concretos de ejecucion (ejemplo: dividir una gesta nocturna en bloques cortos y adelantar inicio para aumentar cierre).

## 6) Mensaje del autor

Este proyecto empezo como una idea base y crecio iteracion tras iteracion hasta convertirse en una app muy por encima del alcance inicial. El valor no esta solo en "gestionar tareas", sino en lograr que el usuario quiera volver cada dia, complete mas y abandone menos.

La mejor forma de entender S.A.M. es probarlo: crear gestas, ver el progreso con tu raza en la barra, recibir botin en tiempo real, ajustar tu identidad de jugador y descubrir como la IA y la narrativa convierten disciplina en experiencia. Con usuarios de distintas razas aparece un componente social fuerte (comparacion, farmeo, grindeo y objetivo colectivo).

## 7) Estado de madurez para entrega

- Funcionalidades nucleares: completadas.
- Documentacion tecnica: consolidada en `docs/tfm/`.
- Riesgo de ultima hora: bajo si se evita refactor destructivo del modulo de raids.
- Roadmap ambicioso: raids mensuales y objetivos anuales de comunidad. Para alcance TFM, el ciclo diario/semanal ya esta en estado defendible.
