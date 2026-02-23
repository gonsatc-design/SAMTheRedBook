# Guia De Defensa Y Demo (10-15 min)

## 1) Estructura recomendada de presentacion

1. Problema (1 min)
2. Solucion y propuesta de valor (2 min)
3. Arquitectura y tecnologias (3 min)
4. Demo guiada (5-7 min)
5. Conclusiones y evolucion futura (2 min)

## 2) Guion corto para abrir

"S.A.M. El Libro Rojo es una app de productividad gamificada con IA que transforma tareas cotidianas en gestas, para aumentar adherencia y reducir procrastinacion de forma medible."

## 3) Demo recomendada paso a paso

### Escena 1: Onboarding

- Login.
- Guia inicial.
- Seleccion de raza.

Mensaje clave: experiencia cuidada desde primer minuto.

### Escena 2: Crear mision

- Escribir una tarea.
- Mostrar conversion IA a gesta.

Mensaje clave: IA util y accionable, no decorativa.

### Escena 3: Cerrar mision en exito

- Ver recompensa, progreso y actualizacion visual.
- Mostrar inventario y badge NEW.

Mensaje clave: feedback inmediato que refuerza conducta.

### Escena 4: Cerrar mision en fracaso

- Mostrar como sube presion narrativo-visual.
- Explicar oscuridad progresiva por fallos.

Mensaje clave: mecanica de coste visible para evitar abandono.

### Escena 5: Perfil y progresion

- Nivel, titulo evolutivo y cambio de raza premium.

Mensaje clave: progresion de largo plazo.

### Escena 6: Mapa tactico

- Graficas por raza.
- Explicar reinicio semanal (domingo 23:59).

Mensaje clave: analitica comprensible para decisiones semanales.

## 4) Preguntas tipicas del tribunal y respuesta breve

### "Donde esta la IA exactamente?"

- En generacion de gestas y en prediccion del Palantir.
- Integrada en flujos core, no como modulo accesorio.

### "Como garantizas separacion de datos?"

- JWT + middleware + consultas por `user_id` y politicas de acceso.

### "Que aporta frente a una app de tareas clasica?"

- Diseño conductual + narrativa + economia + prediccion + visualizacion semanal.

### "Que haria en una fase 2?"

- Misiones colaborativas, ranking por temporada, mas modelos IA, segmentacion por perfil conductual.

## 5) Riesgos que NO tocar antes de entrega

- Refactor profundo de raids/world events.
- Cambios estructurales de BD sin test de regresion.

## 6) Checklist final de defensa

- [ ] Login funcional
- [ ] Crear/cerrar mision
- [ ] Recompensa visible
- [ ] Barra y perfil actualizan
- [ ] Inventario NEW por usuario
- [ ] Mapa tactico por raza
- [ ] Guia con mecanica de oscuridad explicada
