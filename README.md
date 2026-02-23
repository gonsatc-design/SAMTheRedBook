# 📜 S.A.M. - EL LIBRO ROJO

> *Un Sistema de Asistencia Táctica para vencer la Sombra de la procrastinación*

---

## 🎯 ¿QUÉ ES S.A.M.?

**S.A.M.** es una aplicación web de **gamificación de tareas** inspirada en El Señor de los Anillos. Convierte tu vida en una epopeya:

- **🎪 Crea gestas** escribiendo tareas en lenguaje natural
- **🧠 IA genera categorías** automáticamente (Gemini 2.5)
- **⚔️ Combate enemigos** (Exploradores, Orcos, Uruk-Hais)
- **🏆 Desbloquea logros** por categoría
- **💰 Gana oro y XP** al completar misiones
- **🔮 Palantir predice** tu rendimiento futuro
- **📱 PWA Instalable** (funciona sin conexión)

---

## ⚡ STACK TÉCNICO

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Vanilla JS + Tailwind CSS |
| **Backend** | Node.js + Express |
| **Base de Datos** | Supabase (PostgreSQL) |
| **Autenticación** | Supabase Auth (Magic Link) |
| **IA** | Google Gemini 2.5 Flash |
| **Real-Time** | Supabase WebSocket |
| **Hosting** | Vercel (frontend) + Render (backend) |

---

## 🚀 INICIO RÁPIDO (DESARROLLO LOCAL)

### 1. Clonar y preparar

```bash
git clone https://github.com/gonsatc-design/SAMTheRedBook.git
cd SAMTheRedBook
npm install
```

### 2. Configurar `.env`

```bash
cp .env.example .env
```

Completa con tus credenciales:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-clave-supabase
GEMINI_API_KEY=tu-clave-gemini
PORT=3000
```

### 3. Arrancar servidor

```bash
npm start
# Abre http://localhost:3000
```

### 4. Tests

```bash
npm test          # Todos los tests
npm run test:backend  # Solo backend
npm run test:frontend # Solo frontend
```

---

## 📱 CARACTERÍSTICAS PRINCIPALES

### 🎪 SISTEMA DE MISIONES
- Escribe tareas en lenguaje natural
- IA genera versiones épicas (títulos + categorías)
- Categorías: Trabajo, Salud, Hogar, Estudio, Ocio
- Estados: Pendiente → En Progreso → Completada/Fallida

### 👹 SISTEMA NEMESIS (HORDA)
- Cada tarea fallida genera enemigos
- Días transcurridos = escalada de enemigos:
  - 1 día → 1 Explorador
  - 3 días → 1 Orco
  - 6+ días → 1 Uruk-Hai

### 🎖️ LOGROS & PROGRESO
- 20 logros desbloqueables (5 por categoría + globales)
- Barra de progreso en tiempo real
- Títulos dinámicos según nivel

### 💰 SISTEMA DE RECOMPENSAS
- XP por tarea completada
- Oro para craftear items
- Forja: combina items para potencias (bufos de XP/Oro)
- Raid global: sacrifica oro para atacar el jefe mundial

### 🔮 PALANTIR (IA PREDICTIVA)
- Analiza últimos 7 días
- Predice probabilidad de fracaso
- Sugerencias tácticas basadas en patrones
- Caché de 1 hora (no quema tokens)

### 🏴 RAID WORLD-BOSS
- Todos los usuarios atacan al Balrog juntos
- Daño concurrente escalable (50+ usuarios)
- Sistema de rewards colectivos
- Recompensas: materiales raros + XP

### 📊 ANALYTICS
- Dashboard con gráficas de progreso
- Historial de últimos 7 días
- Índice de efectividad por categoría
- Estadísticas de sombra acumulada

---

## 🛡️ FUNCIONALIDADES PWA

✅ **Instalable como app nativa**
- Icono en pantalla de inicio
- Sin barra de navegador
- Experiencia fullscreen

✅ **Offline-first**
- Service Worker cachea activos críticos
- Funciona sin conexión
- Sincronización automática al reconectar

✅ **Meta Tags SEO**
- Open Graph para redes sociales
- Twitter Cards
- Descripción épica

---

## 🎮 CÓMO JUGAR

### Día 1: Combate Básico

1. **Login**: Magic Link vía Supabase
2. **Crear Gesta**: `"Necesito estudiar programación"`
3. **IA Responde**: Genera título épico + categoría
4. **Gandalf Juzga**: ¿Éxito o fracaso?
5. **Recompensas**: +XP, +Oro, debloquea logros

### Semana 1: Estrategia

- Completa al menos 3 gestas por día
- Desbloquea primeros logros (5 tareas por categoría)
- Observa patrones en el Palantir
- Participa en el Raid global

### Mes 1: Dominio

- Alcanza nivel 10+
- Desbloquea todos los logros
- Crea items épicos en la Forja
- Sé leyenda en el ranking

---

## 🔐 AUTENTICACIÓN & SEGURIDAD

- **Magic Link**: No requiere contraseña
- **JWT**: Tokens seguros
- **Row-Level Security (RLS)**: Cada usuario solo ve sus datos
- **CORS Restrictivo**: Protegido para producción

---

## 📚 DOCUMENTACIÓN COMPLETA

- [docs/tfm/README.md](./docs/tfm/README.md) - Documentación oficial de entrega TFM
- [README-DEPLOY.md](./README-DEPLOY.md) - Guía de deployment
- [docs/](./docs/) - Arquitectura y guías
- [tests/](./tests/) - Suite de tests completa
- [prompts/](./prompts/) - Documentación de cada "día"

---

## 🧪 TESTING

```bash
# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# Todos los tests
npm test
```

**Coverage:** ~85% de funcionalidad crítica

---

## 🎓 CRÉDITOS

**Forjado por:**
- Gonsatc Design
- S.A.M. System
- Trabajo Final de Máster - 2026

**Inspiración:**
- El Señor de los Anillos (Tolkien)
- Gamificación & Productividad
- Ingeniería de Prompts con IA

---

## 📝 LICENCIA

MIT - Libre para uso educativo y comercial

---

## 🤝 CONTRIBUIR

¿Quieres mejorar S.A.M.?

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-caracteristica`
3. Commit: `git commit -m "Añade nueva característica"`
4. Push: `git push origin feature/nueva-caracteristica`
5. Pull Request

---

## 🆘 SOPORTE

¿Problemas? Revisa:
- [Documentación técnica](./docs/)
- [README-DEPLOY.md](./README-DEPLOY.md)
- [Issues en GitHub](https://github.com/gonsatc-design/SAMTheRedBook/issues)

---

## 🗺️ ROADMAP

### Phase 1 (ACTUAL) ✅
- ✅ Sistema core de tareas
- ✅ IA generativa (Gemini)
- ✅ Logros & XP
- ✅ PWA funcional
- ✅ Deploy production-ready

### Phase 2 (Futuro)
- 🔄 Competencia entre usuarios (Leaderboards)
- 🔄 Sistema de clanes
- 🔄 Eventos especiales
- 🔄 Temas personalizables

### Phase 3 (Largo plazo)
- 🔄 App nativa (React Native)
- 🔄 Notificaciones push
- 🔄 Integración Telegram/Discord
- 🔄 Sincronización Google Calendar

---

## 🎪 EASTER EGGS

Abre la consola (F12) y escribe:

```javascript
credits()  // Muestra créditos especiales
```

---

## 📊 ESTADÍSTICAS DEL PROYECTO

| Métrica | Valor |
|---------|-------|
| Endpoints API | 20+ |
| Logros Desbloqueables | 20 |
| Categorías | 5 |
| Test Suites | 10+ |
| Líneas de Código | 3000+ |
| Tiempo de Desarrollo | 8 días |

---

**Última actualización:** Febrero 2026

*"No todo lo que brilla es oro, pero toda gesta cuenta."* - Gandalf

---

## 🔗 ENLACES ÚTILES

- 🌐 [Vercel Deployment](https://vercel.com/)
- 🌐 [Render Backend Hosting](https://render.com/)
- 🗄️ [Supabase Documentation](https://supabase.com/docs)
- 🤖 [Gemini API](https://ai.google.dev/)
- 📖 [Node.js Docs](https://nodejs.org/docs/)

---

**¡Bienvenido, Viajero! Que tu jornada sea épica.** 🗡️
