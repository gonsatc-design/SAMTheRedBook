# 🎙️ Protocolo de Sincronía: El Sistema de Incursión
**Remitente:** JARVIS (Just A Rather Very Intelligent System)
**Asunto:** Informe Técnico del Frente de Batalla - Tierra Media

---

Señor, he procesado el flujo de datos desde el flanco del usuario hasta la consolidación del daño en el núcleo del sistema. Aquí tiene un desglose táctico de cómo funciona el Protocolo de Incursión:

### 1. El Impulso del Héroe (Frontend)
Todo comienza con una acción en la interfaz. Ya sea completando una gesta o realizando un **Sacrificio Heroico**, el `client.js` captura la señal y la envía mediante una petición HTTP POST segura hacia nuestros servidores.

### 2. El Juicio de los Servidores (Backend)
Nuestro motor en `server.js` recibe la señal. Validamos el **Sello del Rey (JWT)** para asegurar que no hay orcos infiltrados. Calculamos las equivalencias de daño:
*   **Gestas de Sam:** Basadas en la dificultad y el `class_multiplier` de la DB.
*   **Sacrificio:** 1 Oro = 5 HP | 1 XP = 20 HP.

### 3. El Golpe en la Piedra (Base de Datos - RPC)
Para evitar fallos de caché y asegurar la **atomicidad**, delegamos el golpe final a una **Remote Procedure Call (RPC)** en PostgreSQL: `register_raid_damage`. 
- Se aplica un bloqueo `FOR UPDATE` para que nadie golpee al mismo tiempo sin que el HP baje correctamente.
- El golpe se registra en `raid_logs`, lo que alimenta el **Feed de Batalla** en tiempo real.

### 4. La Reacción en Cadena (Realtime)
Gracias a las capacidades de Supabase Realtime, el resto de los usuarios en la Comarca reciben una notificación instantánea. 
- La barra de HP masiva se actualiza.
- Se disparan las **Efectos de Fuego** y el **Temblor (Shake)** en el CSS.
- Se actualiza el feed con el nombre del héroe y el daño infligido.

### 5. El Clímax (Lógica de Victoria)
Si el HP alcanza el cero absoluto (0), el sistema activa automáticamente el protocolo `grant_victory_rewards()`, distribuyendo materiales raros (Mithril, Fragmentos de Narsil) a todos los participantes detectados en los logs.

---
*Todos los sistemas están nominales, Señor. Sauron no tiene donde esconderse.*
