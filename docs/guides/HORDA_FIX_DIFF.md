# 📝 DIFF: Cambio en server.js

## Líneas 259-272

### ❌ ANTES
```javascript
        // --- MOTOR DE ASEDIO ---
        // Para cada tarea, calculamos la horda basándonos en su `failed_at`
        const tasksConHorda = data.map(task => {
            // Si la tarea nunca ha fallado (failed_at es null), no hay horda.
            if (!task.failed_at) {
                return { ...task, horda: { exploradores: 0, orcos: 0, urukhai: 0 } };
            }
            // Aplicamos el multiplicador de reducción de horda del inventario
            // Y el multiplicador de FURIA GLOBAL si el boss está < 50% HP
            const furyMultiplier = globalFuryActive ? 1.5 : 1.0;
            const horda = calcularHorda(task.failed_at, fechaReferencia, activeBuffs.reduccion_horda, furyMultiplier);
            return { ...task, horda };
        });
```

**Problema:** 
- Solo calcula horda si `failed_at` existe
- Tareas antiguas sin `failed_at` devuelven horda vacía
- Resultado: "Aunque no hay enemigos visibles aún..."

---

### ✅ DESPUÉS
```javascript
        // --- MOTOR DE ASEDIO ---
        // Para cada tarea, calculamos la horda basándonos en su `failed_at`
        const tasksConHorda = data.map(task => {
            // Si la tarea está fallida (fallo_confirmado = true), calcular horda
            if (task.fallo_confirmado) {
                // Si failed_at existe, usarlo. Si no, usar created_at como fallback
                // (para tareas antiguas que fueron falladas antes de que se implementara failed_at)
                const fechaFallo = task.failed_at || task.created_at;
                
                const furyMultiplier = globalFuryActive ? 1.5 : 1.0;
                const horda = calcularHorda(fechaFallo, fechaReferencia, activeBuffs.reduccion_horda, furyMultiplier);
                return { ...task, horda };
            }
            
            // Si la tarea NO está fallida, no hay horda
            return { ...task, horda: { exploradores: 0, orcos: 0, urukhai: 0 } };
        });
```

**Beneficios:**
- ✅ Busca `fallo_confirmado` (indicador fiable)
- ✅ Usa `failed_at` si existe
- ✅ Fallback a `created_at` si `failed_at` es NULL
- ✅ Resultado: Muestra enemigos correctamente

---

## 🔑 Cambios Clave

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Condición** | `if (!task.failed_at)` | `if (task.fallo_confirmado)` |
| **Fallback** | None | `failed_at \|\| created_at` |
| **Tareas antiguas** | Sin horda | Con horda calculada |
| **Consistencia** | Dependía de BD limpia | Robusta |

---

## 📊 Impacto Visual

### Ejemplo: Tarea fallida hace 10 días

**Antes:**
```
✗ Meditar bajo el árbol (Fallida)
   created_at: 2026-02-09
   failed_at: NULL
   horda: { exploradores: 0, orcos: 0, urukhai: 0 }  ← ❌ Sin enemigos
```

**Después:**
```
✗ Meditar bajo el árbol (Fallida)
   created_at: 2026-02-09
   failed_at: NULL (pero usa created_at)
   horda: { exploradores: 10, orcos: 3, urukhai: 2 }  ← ✅ Con enemigos
```

---

## 🔍 Lógica

### Decisión por Tipo de Tarea

```
┌─ ¿fallo_confirmado = true?
│  ├─ SÍ → Calcular horda
│  │  ├─ ¿failed_at existe?
│  │  │  ├─ SÍ → usar failed_at
│  │  │  └─ NO → usar created_at (FALLBACK)
│  │  └─ horda = calcularHorda(fechaFallo, ahora)
│  │
│  └─ NO → horda vacía
```

---

## ✅ Cobertura

| Caso | Antes | Después |
|------|-------|---------|
| Tarea activa | ✅ Sin horda | ✅ Sin horda |
| Tarea completada | ✅ Sin horda | ✅ Sin horda |
| Tarea fallida CON `failed_at` | ✅ Con horda | ✅ Con horda |
| Tarea fallida SIN `failed_at` | ❌ Sin horda | ✅ Con horda |

**Mejora: +1 caso cubierto**

