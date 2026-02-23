# 🚀 GUÍA DE DEPLOY - S.A.M. EL LIBRO ROJO

## 📋 PRERREQUISITOS

- ✅ Proyecto Supabase creado (con Auth + PostgreSQL)
- ✅ API Key de Gemini 2.5 Flash
- ✅ Cuenta en Render, Railway o Vercel
- ✅ Git + GitHub (código alojado)

---

## 🏗️ PASO 1: PREPARAR VARIABLES DE ENTORNO

### 1.1 Copiar `.env.example` a `.env` (SOLO DESARROLLO LOCAL)

```bash
cp .env.example .env
```

Llena los valores:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyD...
PORT=3000
ALLOWED_ORIGIN=http://localhost:3000
```

### 1.2 Obtener credenciales

**Supabase URL:**
- Dashboard → Settings → API → Project URL

**Supabase Key:**
- Dashboard → Settings → API → Project API Keys → `service_role` (NO public!)

**Gemini API:**
- https://ai.google.dev/ → Create API Key

---

## 🌐 PASO 2: DEPLOY BACKEND (Render o Railway)

### Opción A: RENDER (Recomendado para principiantes)

1. Ve a https://render.com/
2. Sign Up → Connect GitHub
3. New → Web Service
4. Selecciona tu repositorio `SAMTheRedBook`
5. Configurar:
   - **Name:** `sam-api`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (con límites)

6. Environment Variables:
   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=eyJhbGc...
   GEMINI_API_KEY=AIzaSyD...
   PORT=10000 (Render asigna automáticamente)
   ALLOWED_ORIGIN=https://tu-frontend.vercel.app
   ```

7. Click "Deploy"
8. Espera ~3 min. URL: `https://sam-api.onrender.com`

### Opción B: RAILWAY

1. Ve a https://railway.app/
2. New Project → Deploy from GitHub
3. Selecciona tu repo
4. Railway detecta `package.json` automáticamente
5. Variables de entorno en Dashboard → Variables
6. Deploy automático al hacer push a `main`

---

## 💻 PASO 3: DEPLOY FRONTEND (Vercel)

### 3.1 Vercel Deployment

1. Ve a https://vercel.com/
2. New Project → Import Git Repository
3. Selecciona `SAMTheRedBook`
4. Framework: Other (JavaScript)
5. Build Command: dejar en blanco (no necesita build)
6. Start Command: `npx http-server . -p $PORT`

7. Environment Variables:
   ```
   REACT_APP_API_BASE=https://sam-api.onrender.com
   ```

8. Deploy

### 3.2 Actualizar `client.js`

En `client.js` línea ~5:
```javascript
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";
```

---

## 🔒 PASO 4: CONFIGURAR SUPABASE PARA PRODUCCIÓN

### 4.1 Habilitar conexiones externas

Supabase Dashboard → Settings → Database → Connection Pooling:
- Enable: ✅ ON
- Mode: Transaction
- Max Client Connections: 100

### 4.2 Actualizar CORS en Supabase

Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://tu-frontend.vercel.app`
- Redirect URLs: `https://tu-frontend.vercel.app/auth/callback`

---

## 🧪 PASO 5: VERIFICAR DEPLOY

### Test Local Primero:
```bash
npm start
# Debe estar en http://localhost:3000
npm test:backend
# Todos los tests deben pasar ✅
```

### Test Backend Remoto:
```bash
curl https://sam-api.onrender.com/api/health
# Debe devolver 200 OK
```

### Test Frontend:
- Ve a tu URL de Vercel
- Login con Supabase Auth
- Crea una tarea
- Verifica que se sincroniza

---

## 🚨 TROUBLESHOOTING

### Error: "Cannot connect to Supabase"
- ✅ Verifica SUPABASE_URL y SUPABASE_KEY en variables de entorno
- ✅ Supabase debe tener habilitadas conexiones externas

### Error: "Gemini API quota exceeded"
- ✅ Verificar API key válida
- ✅ Aumentar cuota en Google Cloud Console

### Error: "CORS blocked"
- ✅ Actualizar ALLOWED_ORIGIN en server.js
- ✅ Asegúrate que frontend URL coincide exactamente

### Error: "Service Worker not registering"
- ✅ Verificar que `service-worker.js` está en raíz
- ✅ HTTPS es necesario en producción

---

## 🎯 RESUMEN URLs FINALES

Después de deploy:

```
Frontend:  https://sam.vercel.app (o tu URL)
Backend:   https://sam-api.onrender.com
Supabase:  https://tu-proyecto.supabase.co
```

Compartir link: `https://sam.vercel.app`

---

## ✅ CHECKLIST FINAL

- [ ] `.env.example` completado
- [ ] Backend deployado en Render/Railway
- [ ] Frontend deployado en Vercel
- [ ] Supabase con conexiones externas habilitadas
- [ ] Tests pasando ✅
- [ ] PWA instalable (Chrome: Instalar app)
- [ ] Service Worker registrado (DevTools: Application → Service Workers)
- [ ] Meta tags visibles al compartir
- [ ] Comando `credits()` en consola funciona

---

## 🏆 ¡MISIÓN CUMPLIDA!

Tu aplicación está lista para producción. 

**Para mantenerla:**
- Hacer push a `main` = deploy automático
- Monitorear logs en Render/Railway
- Actualizar variables de entorno si es necesario

---

*Forjado por Gonsatc Design & S.A.M. - 2026*
