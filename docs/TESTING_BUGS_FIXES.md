# ✅ TESTING RÁPIDO - BUGS RESUELTOS

## 🚀 Pasos para Verificar

### Test 1: PERFIL (3 minutos)
```
1. Abre la app
   → Debe mostrar PERFIL sin datos (aún no logueado)

2. Inicia sesión
   → Abre pestaña PERFIL

3. Verifica que ves:
   ✅ Icono de raza (🗡️/🏹/⚒️/🍄)
   ✅ Email del usuario
   ✅ Nivel (número)
   ✅ ORO (cantidad con formato)
   ✅ Raza
   ✅ Barra XP con porcentaje
   ✅ "Próximo nivel: X XP restantes"
   ✅ Evolución/Título actual

4. Si falta algo:
   → Abre DevTools (F12) → Console
   → Busca errores de "profileLevel" o similares
   → Si dice "Cannot read properties of undefined" → Elemento falta en HTML
```

**✅ OK si**: Ves TODOS los datos del perfil cargados correctamente

---

### Test 2: MOCHILA (3 minutos)
```
1. Abre la app
2. Inicia sesión
3. Abre pestaña LA MOCHILA

4. Verifica que ves:
   ✅ Desaparece "Abriendo la mochila..."
   ✅ Se muestran los items disponibles
   ✅ Cada item muestra: Icono, Nombre, Rareza, Cantidad

5. Si se queda cargando:
   → DevTools → Console
   → Busca errores de "Inventario"
   → Si dice "column ... does not exist" → BD no tiene la columna
```

**✅ OK si**: Items cargan en menos de 2 segundos

---

### Test 3: FORJA (3 minutos)
```
1. Abre pestaña LA FORJA

2. Verifica que ves:
   ✅ Desaparece "Encendiendo los fuegos..."
   ✅ Se muestran las recetas disponibles
   ✅ Cada receta muestra: Nombre, Rareza, Materiales necesarios

3. Intenta forjar algo:
   ✅ Si tienes materiales → Aparece botón activo
   ✅ Si no tienes materiales → Botón gris "FALTAN MATERIALES"

5. Si se queda cargando:
   → DevTools → Console
   → Mismo error que Test 2 → Mismo fix
```

**✅ OK si**: Recetas cargan en menos de 2 segundos

---

### Test 4: BOTÓN GUÍA (1 minuto)
```
1. En el header arriba a la izquierda
2. Busca botón 📖 (libro)
3. Click en él

4. Verifica que ves:
   ✅ Se abre modal oscuro (backdrop)
   ✅ Aparece "📜 MANUAL DEL PORTADOR"
   ✅ Tiene secciones:
      - ⚔️ EL CAMINO
      - 💀 LA SOMBRA
      - ⚒️ LA FORJA
      - 🔮 EL PALANTÍR

5. Sección Palantír debe decir:
   "✅ Azul (0-30%): La sombra duerme..."
   "⚠️ Amarillo (30-70%): Ojo avizor..."
   "🔥 Rojo (70-100%): ¡CRÍTICO!..."

6. Click en X o fuera del modal para cerrar
```

**✅ OK si**: Modal abre, contiene guía mejorada, cierra

---

### Test 5: HEADER LIMPIO (1 minuto)
```
1. Mira el header (barra superior)

2. Verifica que NO ves:
   ✅ "frodo@comarca.com" (email)
   ✅ Barra de XP azul
   ✅ "LVL 1" badge
   ✅ "💰 0" oro

3. Verifica que SÍ ves:
   ✅ "S.A.M. v1.0" (nombre del sistema)
   ✅ Botón 📖 (guía)
   ✅ Palantír 🔮 (orbe)
```

**✅ OK si**: Header solo tiene S.A.M., Guía, Palantír

---

### Test 6: LOGROS SIN CONTADOR (1 minuto)
```
1. Abre pestaña 🏛️ LOGROS

2. Verifica que NO ves:
   ✅ "0/20" (contador grande en rojo)

3. Verifica que SÍ ves:
   ✅ Título "🏛️ LOGROS"
   ✅ Grid de logros (cuadros)
   ✅ Logros desbloqueados en color
```

**✅ OK si**: No hay contador de "X/Y" visible

---

## 🐛 Si Algo No Funciona

### "Error en Inventario: column ... does not exist"
```
Solución: Ya está arreglado en server.js línea 562
- Reinicia el servidor: npm run start
- Espera a que diga "✅ S.A.M. LISTO EN PUERTO 3000"
- Recarga el navegador: Ctrl+Shift+R (hard refresh)
```

### Perfil muestra "0" en todo
```
Causa: loadProfile() no se ejecutó
Solución:
1. Abre DevTools → Console
2. Escribe: await loadProfile()
3. Presiona Enter
4. Si aparece error, reporta qué dice
```

### Mochila/Forja se queda cargando
```
Causa: API devuelve error
Solución:
1. Abre DevTools → Network tab
2. Abre la mochila
3. Busca request a /api/inventory
4. Mira la respuesta (Response tab)
5. Si dice error → Copia el error y reporta
```

### Guía no abre
```
Causa: Modal existe pero algo lo bloquea
Solución:
1. DevTools → Console
2. Escribe: document.getElementById('guideModal').classList.remove('hidden')
3. Si abre → Problema en click handler
4. Si no abre → Modal no existe (muy raro)
```

---

## 📊 Checklist Final

```
Test 1 - PERFIL
[ ] Carga sin errores
[ ] Muestra nivel
[ ] Muestra oro
[ ] Muestra raza e evolución
[ ] Barra XP funciona

Test 2 - MOCHILA
[ ] Carga items
[ ] No se queda en "Abriendo..."
[ ] Items tienen icono y cantidad

Test 3 - FORJA
[ ] Carga recetas
[ ] No se queda en "Encendiendo..."
[ ] Muestra materiales necesarios

Test 4 - GUÍA
[ ] Botón 📖 abre modal
[ ] Guía del Palantír está mejorada
[ ] Modal cierra al hacer click en X

Test 5 - HEADER
[ ] No muestra email
[ ] No muestra XP bar
[ ] No muestra "LVL 1"
[ ] No muestra oro

Test 6 - LOGROS
[ ] No muestra contador "0/20"
[ ] Título visible
[ ] Logros se ven

Síntaxis
[ ] npm run start → No errors
```

---

## ✨ Comandos Rápidos

```bash
# Reiniciar servidor
npm run start

# Hard refresh en navegador
Ctrl+Shift+R

# Limpiar cache
localStorage.clear()

# Ver logs en tiempo real
# (Abre DevTools → Console mientras haces clic)
```

---

## 🎯 Resultado Esperado

Después de los tests:
- ✅ PERFIL cargado con datos
- ✅ MOCHILA mostrando items
- ✅ FORJA mostrando recetas
- ✅ GUÍA mejorada y accesible
- ✅ Header limpio y simple
- ✅ Logros sin contador

**Si TODO está ✅ → ¡LISTO PARA USAR!**

