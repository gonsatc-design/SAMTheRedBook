# ✅ TESTING GUIDE - NUEVAS MEJORAS

## 🔮 TEST 1: Palantír Mejorado

### Paso 1: Accede a una misión
1. Click en **"LA PRUEBA"** (cualquier misión)
2. Observa el **Palantír en el header** (arriba a la derecha)

### Paso 2: Verifica el estado del Palantír
- **Orbe grande** (10x10) con:
  - ✅ **Verde** si probabilidad < 30%
  - ⚠️ **Amarillo** si 30% ≤ probabilidad ≤ 70%
  - 🔥 **Rojo** si probabilidad > 70%

### Paso 3: Hover en el Mapa Táctico
1. Abre **"MAPA TÁCTICO"** (pestaña principal)
2. Busca la sección **"Equilibrio de la Luz"** (gráfico radar)
3. Hover sobre el **gráfico** para ver el tooltip
4. Deberías ver:
   ```
   🔮 PREDICCIÓN PALANTÍR
   ────────────────────
   Probabilidad de Peligro: [████░░░░] 45%
   ────────────────────
   Presagio:
   "RIESGO MODERADO - Procede con cautela"
   ```

### Paso 4: Verifica la barra visual
- La **barra debe cambiar de color**:
  - Azul (< 30%)
  - Gradiente azul→amarillo→rojo (30-70%)
  - Rojo (> 70%)
- El **porcentaje** debe actualizar en tiempo real
- El **texto presagio** debe cambiar según el nivel

### ✅ Palantír OK si:
- [ ] Orbe muestra emoji correcto
- [ ] Barra visual aparece en tooltip
- [ ] Porcentaje numérico es correcto
- [ ] Gradiente de color funciona
- [ ] Texto presagio es apropiado

---

## ⚒️ TEST 2: Sistema de Forja "COMPRADO"

### Paso 1: Accede a la Forja
1. Click en **"LA FORJA"** (pestaña principal)
2. Busca cualquier **receta** que puedas craftar

### Paso 2: Verifica estado sin forjar
- Tarjeta debe mostrar:
  - Nombre de artefacto
  - Rareza (color)
  - ⚡ **EFECTOS ESPECIALES** (en púrpura)
  - Materiales necesarios
  - Botón **"⚒️ FORJAR ARTEFACTO"** (activo)

### Paso 3: Forja un artefacto
1. Click en **"⚒️ FORJAR ARTEFACTO"**
2. Espera confirmación verde
3. El toast debe decir: *"¡Has forjado: [nombre]!..."*

### Paso 4: Verifica estado post-forja
1. La página debe recargar automáticamente
2. Abre la Forja de nuevo
3. Busca el **artefacto que acabas de forjar**
4. Debe mostrar:
   - Tarjeta con **opacidad al 70%** (más tenue)
   - **Borde verde** en lugar de ámbar
   - Texto: **"✓ COMPRADO"** en verde
   - Botón: **"✓ COMPRADO"** (deshabilitado)

### Paso 5: Intenta forjar de nuevo
- Click en **"✓ COMPRADO"** NO debe hacer nada
- Botón debe estar **visualmente deshabilitado**
- NO debes poder forjar el mismo artefacto 2 veces

### ✅ Forja OK si:
- [ ] Los efectos aparecen en púrpura
- [ ] Puedes forjar items nuevos
- [ ] Después de forjar, el estado cambia a "COMPRADO"
- [ ] No puedes re-forjar items "COMPRADO"
- [ ] El botón está deshabilitado visualmente

---

## ✨ TEST 3: Efectos Especiales Visibles

### Paso 1: Accede a la Forja
1. Click en **"LA FORJA"**

### Paso 2: Busca un artefacto sin efectos
- Si una receta NO tiene efectos, debe mostrar la descripción original
- Ejemplo: `"Lanza de Gondor - un arma legendaria..."`

### Paso 3: Busca un artefacto CON efectos
- Debe mostrar una caja **púrpura** con:
  - Título: **"⚡ EFECTOS ESPECIALES:"**
  - Lista de efectos con formato:
    ```
    • DAMAGE_BONUS: +100%
    • XP_MULTIPLIER: +50%
    • COOLDOWN_REDUCTION: -30%
    ```

### Paso 4: Verifica los valores
- Multiplicadores (ej: `1.5`) deben mostrar como **"+50%"**
- Divisores (ej: `0.7`) deben mostrar como **"-30%"**
- Valores fijos deben mostrarse tal cual

### ✅ Efectos OK si:
- [ ] Los efectos aparecen en una caja púrpura
- [ ] El título es "⚡ EFECTOS ESPECIALES:"
- [ ] Los valores están en negrita dorada/púrpura
- [ ] Los porcentajes se calculan correctamente
- [ ] Sin efectos = muestra descripción antigua

---

## 🔧 TEST 4: Integración Completa

### Paso 1: Full Flow - Palantír
1. Abre cualquier misión
2. Verifica que el **Palantír en header** muestra riesgo
3. Abre Mapa Táctico
4. Verifica que el **tooltip** muestra barra y porcentaje

### Paso 2: Full Flow - Forja
1. Abre Forja
2. Verifica que ves **efectos** en artefactos
3. Forja un artefacto
4. Verifica que marca como **"COMPRADO"**
5. Intenta forjar de nuevo → NO debe funcionar

### Paso 3: Verificar Base de Datos
En Supabase → `inventory`:
- Busca items forjados
- Deben tener `soulbound: true`
- Items normales pueden tener `soulbound: null` o `false`

### ✅ Integración OK si:
- [ ] Todo funciona en conjunto
- [ ] No hay conflictos entre sistemas
- [ ] Palantír + Mapa Táctico sincronizan
- [ ] Forja persiste estado "COMPRADO"
- [ ] BD refleja los cambios

---

## 📋 CHECKLIST FINAL

```
Palantír Mejorado
├─ ✅ Orbe muestra emoji (✅/⚠️/🔥)
├─ ✅ Tooltip muestra barra de riesgo
├─ ✅ Porcentaje dinámico (0-100%)
├─ ✅ Categorización de riesgo (Bajo/Moderado/Alto)
└─ ✅ Sincroniza en Header + Mapa

Forja "COMPRADO"
├─ ✅ Items forjados reciben flag soulbound
├─ ✅ UI muestra "COMPRADO" post-forja
├─ ✅ Botón se deshabilita
├─ ✅ No permite re-crafting
└─ ✅ BD persiste el estado

Efectos Especiales
├─ ✅ Caja púrpura con efectos
├─ ✅ Título "⚡ EFECTOS ESPECIALES:"
├─ ✅ Cálculo correcto de porcentajes
├─ ✅ Fallback a descripción si sin efectos
└─ ✅ Valores en negrita dorada/púrpura
```

---

## 🐛 Si Algo Falla

### Palantír no muestra barra
1. Verifica que `palantirRiskFill` existe en HTML
2. Comprueba que `actualizarPalantir()` se llama
3. Abre DevTools → Console → Busca errores

### Forja permite re-crafting
1. Verifica que `soulbound: true` se guardó en BD
2. Comprueba que `renderForge()` valida `i.soulbound === true`
3. Limpia cache del navegador (Ctrl+Shift+Del)

### Efectos no aparecen
1. Verifica que `receta.resultado.effects` existe
2. Comprueba que `Object.entries()` itera correctamente
3. Abre DevTools → Console → Inspecciona receta

---

## 💾 Comandos Útiles

```bash
# Ver logs del servidor
tail -f server.log

# Verificar BD (Supabase CLI)
supabase db pull
supabase db inspect

# Recargar datos en navegador
Ctrl+Shift+R (hard refresh)

# Ver estado actual
localStorage.getItem('supabase.auth.token')
```

