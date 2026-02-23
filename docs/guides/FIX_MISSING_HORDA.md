# 🐛 FIX: Tareas Fallidas Sin Horda Visible

## Problema
Tienes gestas fallidas de días anteriores pero **no se muestran enemigos**:
```
⚠️ Frente salud
Has abandonado 6 gestas en este frente.
Aunque no hay enemigos visibles aún, la sombra se extiende...
```

## Causa Raíz
Las tareas **fallidas antiguas no tienen `failed_at` grabado**.

### ¿Por qué?
1. El campo `failed_at` se implementó **después** de que algunas tareas fueron fallidas
2. Las tareas antiguas tienen `fallo_confirmado = true` pero `failed_at = NULL`
3. Sin `failed_at`, no se puede calcular cuánto tiempo ha pasado, por lo que `calcularHorda()` devuelve 0 enemigos

## Solución

### Paso 1: Fix en Backend (`server.js` líneas 259-272)

**Antes:**
```javascript
if (!task.failed_at) {
    return { ...task, horda: { exploradores: 0, orcos: 0, urukhai: 0 } };
}
const horda = calcularHorda(task.failed_at, ...);
```

**Después:**
```javascript
if (task.fallo_confirmado) {
    // Si failed_at existe, usarlo. Si no, usar created_at como fallback
    const fechaFallo = task.failed_at || task.created_at;
    const horda = calcularHorda(fechaFallo, ...);
    return { ...task, horda };
}
return { ...task, horda: { exploradores: 0, orcos: 0, urukhai: 0 } };
```

**Lógica:**
- ✅ Ahora busca `fallo_confirmado` (verdadero indicador de si fue fallada)
- ✅ Si tiene `failed_at`, lo usa
- ✅ Si NO tiene `failed_at` pero está fallida, usa `created_at` como fallback
- ✅ Esto permite calcular horda para tareas antiguas

### Paso 2: Ejecutar SQL en Supabase (OPCIONAL pero RECOMENDADO)

Para "reparar" las tareas antiguas en la BD:

```sql
UPDATE tasks
SET failed_at = created_at
WHERE fallo_confirmado = true AND failed_at IS NULL;
```

**¿Qué hace?**
- Busca tareas con `fallo_confirmado = true` pero `failed_at = NULL`
- Asigna `failed_at = created_at` (asume que fallaron el día que se crearon)
- Así, la BD será más consistente y las hordas se calcularán correctamente

## Resultado Esperado

**Después del fix:**
```
⚠️ Frente salud
Has abandonado 6 gestas en este frente.

Las fuerzas de la oscuridad han crecido: 
30 Exploradores, 10 Orcos, 6 Uruk-hai 
han atravesado las brechas en tu defensa.
```

## 🧪 Verificar el Fix

### En Cliente (Consola F12)
```javascript
// Abrir consola (F12) y ejecutar:
const tasks = await fetch('/api/tasks', {
    headers: { 'Authorization': `Bearer ${await obtenerToken()}` }
}).then(r => r.json());

const fallidas = tasks.tasks.filter(t => t.fallo_confirmado);
console.log('Tareas fallidas:', fallidas);
console.log('¿Tienen horda?', fallidas.map(t => ({
    titulo: t.titulo_epico,
    horda: t.horda
})));
```

### En BD (Supabase)
```sql
-- Ver tareas fallidas
SELECT 
    id, titulo_epico, fallo_confirmado, 
    created_at, failed_at
FROM tasks
WHERE fallo_confirmado = true
LIMIT 5;
```

Deberías ver `failed_at` con un valor (no NULL).

## 📊 Timeline de Implementación

| Acción | Archivo | Línea | Status |
|--------|---------|-------|--------|
| Cambiar lógica de cálculo | server.js | 259-272 | ✅ HECHO |
| Crear SQL para repair | fix_failed_at_missing.sql | - | ✅ CREADO |
| Ejecutar SQL en Supabase | MANUAL | - | ⏳ PENDIENTE |

## 🚀 Pasos Finales

1. ✅ Backend ya está corregido (`server.js`)
2. ⏳ **OPCIONAL**: Ejecuta `fix_failed_at_missing.sql` en Supabase para reparar la BD
3. 🔄 Recarga el navegador
4. 🎉 Ahora verás la horda en tus gestas fallidas

## 💡 Notas

- El fix en `server.js` es **automático** - no requiere acción manual
- El SQL es **opcional** pero hace la BD más consistente
- Si NO ejecutas el SQL, igual funcionará (usará `created_at` como fallback)
- Si SÍ ejecutas el SQL, `failed_at` estará correctamente grabado para futuros cálculos

---

**¿Qué prefieres?**
1. Solo el fix en backend (funciona al 100% sin SQL)
2. También ejecutar el SQL en Supabase para consistency
3. Ambos

