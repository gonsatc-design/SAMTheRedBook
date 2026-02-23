# 🧙‍♂️ GUÍA DEL MODO DEVELOPER (Time Travel)

## ¿Cómo Activar el Modo Developer?

### Opción 1: Por URL (RECOMENDADO)
Añade `?dev=true` a tu URL:

```
http://localhost:3000/?dev=true
```

### Opción 2: Desde la consola (F12)
```javascript
// Abrir consola (F12) y ejecutar:
const dp = document.getElementById('devPanel');
if (dp) dp.classList.remove('hidden');
```

---

## ✅ Verificación de Funcionamiento

Cuando activas `?dev=true`, deberías ver:

1. **Panel de Máquina del Tiempo** (esquina inferior derecha, generalmente)
   - Etiqueta: "Máquina del Tiempo"
   - Campo de entrada: "Adelantar Días:" con número
   - Botón: "Viajar"

2. **Estructura HTML completa** en `index.html` líneas 673-679:
   ```html
   <div id="devPanel" class="hidden dev-panel">
       <h4 class="font-bold mb-2">Máquina del Tiempo</h4>
       <label for="daysOffset">Adelantar Días:</label>
       <input type="number" id="daysOffset" value="0" class="bg-slate-800 text-amber-400 w-16 text-center">
       <button id="timeTravelBtn" class="bg-amber-600 text-black px-2 py-1 rounded">Viajar</button>
   </div>
   ```

---

## 🚀 Cómo Usar (Paso a Paso)

### Paso 1: Activar Modo Developer
```
1. Ve a http://localhost:3000/?dev=true
2. Busca el panel "Máquina del Tiempo" en pantalla
```

### Paso 2: Ingresa Número de Días
```
3. En el campo "Adelantar Días", ingresa: 3
   (Para viajar 3 días al futuro)
```

### Paso 3: Viajar en el Tiempo
```
4. Haz clic en botón "Viajar"
5. Las misiones se recargarán mostrando el estado de hace/en +3 días
```

---

## 🔍 Cómo Funciona por Debajo

### Cliente (`client.js` líneas 915-933)

```javascript
// 1. Detecta si la URL tiene ?dev=true
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('dev') === 'true') {
    devPanel.classList.remove('hidden');  // Muestra el panel
}

// 2. Cuando haces clic en "Viajar"
timeTravelBtn.addEventListener('click', () => {
    const offset = parseInt(daysOffsetInput.value, 10);  // Obtiene los días
    const mockDate = new Date();
    mockDate.setDate(mockDate.getDate() + offset);  // Calcula la fecha

    console.log(`⏳ Viajando en el tiempo a: ${mockDate.toLocaleDateString()}`);
    cargarMisiones(mockDate);  // Recarga con fecha simulada
});
```

### Servidor (`server.js` líneas 231-234)

```javascript
app.get('/api/tasks', authMiddleware, async (req, res) => {
    const { mockDate } = req.query;  // Recibe la fecha del cliente
    const fechaReferencia = mockDate ? new Date(mockDate) : new Date();
    
    // Usa fechaReferencia para calcular:
    // - Inicio de semana (LUNES)
    // - Horda de enemigos (basada en failed_at vs fechaReferencia)
    // - Tareas visibles de esa "semana"
});
```

---

## 📝 Ejemplos de Uso

### Caso 1: Ver misiones de mañana
```
daysOffset: 1
Resultado: Verás qué misiones aparecerán mañana
```

### Caso 2: Retroceder a la semana pasada
```
daysOffset: -7
Resultado: Verás el estado hace 7 días (misiones completadas/fallidas de esa semana)
```

### Caso 3: Simular 2 semanas adelante
```
daysOffset: 14
Resultado: Verás:
  - Nuevas misiones generadas
  - Horda escalada (14 días de multiplicadores)
  - Cambios en buffs/debuffs
```

---

## ✨ Qué Puedes Testear

### ✅ Test 1: Escalada de Horda
1. Falla una misión (CAÍDA)
2. Anota los Orcos/Uruk-hai
3. Viaja +1 día (`daysOffset: 1`)
4. Verifica que la horda creció

### ✅ Test 2: Ciclo Semanal
1. Estamos en un lunes
2. Viaja +7 días (`daysOffset: 7`)
3. Deberías ver:
   - Semana anterior: historial de hazañas completadas
   - Semana nueva: misiones nuevas generadas

### ✅ Test 3: Recalcular Tareas Pendientes de Juicio
1. Completa una tarea hace 2 días
2. Viaja +2 días (`daysOffset: 2`)
3. Debería aparecer en "Juicio de Gandalf" (tareas pendientes de confirmar)

### ✅ Test 4: Recompensas Acumuladas
1. Completa 3 tareas hoy
2. Viaja +1 día (`daysOffset: 1`)
3. Las 3 tareas deberían estar en "Historial de Hazañas"
4. Verifica que los materiales se acumulan correctamente

---

## 🐛 Debugging

### Si el panel NO aparece:
```javascript
// Abre F12 y ejecuta esto:
const dp = document.getElementById('devPanel');
console.log('¿Existe devPanel?', dp);
console.log('¿Está visible?', dp.classList.contains('hidden'));
console.log('URL actual:', window.location.href);
console.log('¿dev=true en URL?', new URLSearchParams(window.location.search).get('dev'));
```

### Si el viaje no funciona:
```javascript
// Abre consola (F12) y verifica:
1. ¿Se ve el log "⏳ Viajando en el tiempo a:"?
2. ¿Se recargan las misiones?
3. ¿Qué fecha se envía al servidor? (F12 → Network → /api/tasks → Query String)
```

### Si las misiones no cambian:
```javascript
// Verifica en el servidor:
console.log(`📅 fechaReferencia recibida: ${fechaReferencia}`);
console.log(`📅 Inicio de semana calculado: ${inicioSemana}`);

// Las tareas se filtran por:
.gte('created_at', inicioSemana.toISOString())
// Si no hay tareas de esa semana, verás lista vacía
```

---

## 🎯 Status de Implementación

| Característica | Status | Línea |
|---|---|---|
| Detección `?dev=true` | ✅ | client.js 921 |
| Panel HTML | ✅ | index.html 673 |
| Input de días | ✅ | index.html 676 |
| Botón Viajar | ✅ | index.html 677 |
| Event Listener | ✅ | client.js 925 |
| Cálculo de fecha | ✅ | client.js 927-928 |
| Paso a servidor | ✅ | client.js 90 |
| Recepción en servidor | ✅ | server.js 233 |
| Uso en lógica | ✅ | server.js 234 |
| Recálculo de horda | ✅ | server.js 269 |

---

## 🚀 Conclusión

El modo developer **está completamente funcional**. Puedes:
- ✅ Viajar en el tiempo hacia adelante (+N días)
- ✅ Viajar hacia atrás (-N días)
- ✅ Ver cómo escala la horda
- ✅ Validar ciclos semanales
- ✅ Testear recompensas acumuladas
- ✅ Verificar cambios de buffs/debuffs

**Usa `/dev=true` para debuggear y testear resultados sin esperar a que pasen días reales.** 🧙‍♂️⏳
