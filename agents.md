# 📜 MANIFIESTO: S.A.M. (The Red Book)
> *Un sistema de gestión de gestas para el Máster de Desarrollo con IA *

---

## 🛡️ LA TRÍADA DE AGENTES

| Agente | Arquetipo | Función Principal | Tono |
| :--- | :--- | :--- | :--- |
| **Sam** | El Guía Ferviente | Traducción de tareas a "Lore Épico" | Dramático, Leal, Intenso |
| **El Senescal** | El Guardián del Equilibrio | Filtro de calidad y salud mental | Justo, Protector, Firme |
| **Gandalf** | El Juez del Destino | Evaluación nocturna y balance global | Místico, Sabio, Trascendental |

---

## ⚔️ EL SISTEMA NÉMESIS
Las tareas no completadas evolucionan según el paso del tiempo ($t$ en días):

- **[0-1d] Explorador:** Una amenaza menor. Icono de saco.
- **[2-3d] Orco:** Empieza a drenar la **Moral**. Icono de espada.
- **[4d+] Uruk-hai:** Amenaza crítica. Afecta al **HP Global de la Alianza**.

---

## 🧠 REGLAS DE ORO DEL SENESCAL (Refined)
1. **Autocuidado = Gesta:** La meditación, el ejercicio y el sueño son "Mantenimiento del Guerrero". No se bloquean.
2. **Descanso Merecido:** Si una tarea incluye un esfuerzo previo seguido de descanso, se acepta como "Recuperación en el Campamento".
3. **Bloqueo Selectivo:** Solo se detiene la *procrastinación vacía* (ej: "mirar redes sociales sin fin").

---

## 🛠️ STACK TÉCNICO
- **Engine:** Gemini 2.5 Flash
- **Persistence:** Supabase (Auth + PostgreSQL)
- **UI:** React + Tailwind + Framer Motion