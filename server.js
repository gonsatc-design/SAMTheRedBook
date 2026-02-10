require('dotenv').config();
// --- INICIO DIAGNÓSTICO (AÑADIR ESTO) ---
console.log("🔍 DIAGNÓSTICO DE VARIABLES:");
console.log("   -> SUPABASE_URL:", process.env.SUPABASE_URL ? "✅ DETECTADA" : "❌ VACÍA (Culpable)");
console.log("   -> SUPABASE_KEY:", process.env.SUPABASE_KEY ? "✅ DETECTADA" : "❌ VACÍA");
console.log("   -> GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✅ DETECTADA" : "❌ VACÍA");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("🔥 ERROR CRÍTICO: El archivo .env no se está leyendo o faltan claves.");
    process.exit(1); // Matamos el servidor aquí para que no explote después
}
// --- FIN DIAGNÓSTICO ---

const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('@supabase/supabase-js');
const { calcularHorda } = require('./horda');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// --- CONFIGURACIÓN ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" }
});

// ---------------------------------------------------------
// 🚨 ZONA DE SEGURIDAD DE CATEGORÍAS 🚨
// Escribe aquí EXACTAMENTE cómo se llaman tus categorías en Supabase.
// Si en Supabase es "Trabajo", ponlo con mayúscula aquí.
const categoriasSupabase = ["hogar", "trabajo", "salud", "estudio", "ocio"]; 
const categoriaPorDefecto = "hogar"; // Si falla, usará esta.
// ---------------------------------------------------------

function extraerJSON(texto) {
    try {
        const inicio = texto.indexOf('[');
        const fin = texto.lastIndexOf(']') + 1;
        if (inicio !== -1 && fin !== -1) return texto.substring(inicio, fin);
        return texto;
    } catch (e) { return texto; }
}

function normalizarCategoria(catIA) {
    if (!catIA) return categoriaPorDefecto;
    
    const limpia = catIA.toLowerCase().trim();

    // Buscamos si alguna de nuestras categorías de Supabase coincide
    // (ignorando mayúsculas para la búsqueda, pero devolviendo la exacta)
    const encontrada = categoriasSupabase.find(c => c.toLowerCase() === limpia);

    return encontrada ? encontrada : categoriaPorDefecto;
}


// --- MIDDLEWARE DE AUTENTICACIÓN ---
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Se requiere un Sello del Rey (JWT).' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Sello del Rey (JWT) inválido o expirado. Acceso denegado.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error interno al validar el Sello del Rey.' });
    }
};

app.post('/api/briefing', authMiddleware, async (req, res) => {
    const { userInput } = req.body;
    console.log("------------------------------------------------");
    console.log("📩 INPUT:", userInput);
    console.log("👤 USER:", req.user.id);

    try {
        // --- PROMPT DE FANTASÍA PURA ---
        const promptUnificado = `
        Actúa como Samwise Gamgee (El Señor de los Anillos).
        Tu Señor Frodo te dice: "${userInput}".

        TU MISIÓN:
        1. Separa las intenciones del usuario en tareas distintas.
        2. ASIGNA A CADA UNA:
           - Un "Título Épico" (Medieval/Fantasía). Nada de ciencia ficción.
           - Una "Categoría" exacta: "trabajo", "salud", "estudio", "hogar", "ocio".
           - Una "Frase de Sam" (Reply): Cálida, leal y rústica.

        ⛔ REGLAS DE ORO (Estilo):
        - PROHIBIDO usar palabras en inglés (nada de 'burnout', 'deadline', 'meeting').
        - PROHIBIDO lenguaje técnico/científico (nada de 'protocolos', 'ingesta', 'optimizar', 'sistema').
        - USA lenguaje de HOBBIT: "pan", "camino", "carga", "fuego", "sombra", "descanso", "bondad".
        - Si es comida: habla de "llenar la barriga" o "víveres", no de "nutrientes".
        - Si es descanso: habla de "recuperar el aliento" o "fumar en pipa", no de "descompresión".

        Responde SOLO este Array JSON:
        [{"mision": "...", "categoria": "...", "reply": "..."}]`;

        const result = await model.generateContent(promptUnificado);
        const gestas = JSON.parse(extraerJSON(result.response.text()));

        console.log(`✅ IA OK: ${gestas.length} gestas detectadas.`);

        // --- PREPARAR PARA SUPABASE ---
        const tareasInsertar = gestas.map(g => {
            const catSegura = normalizarCategoria(g.categoria);
            console.log(`🔍 Categoria IA: "${g.categoria}" -> Supabase: "${catSegura}"`);
            
            return {
                user_id: req.user.id,
                titulo_original: userInput,
                titulo_epico: g.mision,
                categoria: catSegura, // Usamos la versión blindada
                estado_enemigo: 'explorador'
            };
        });

        const { error } = await supabase.from('tasks').insert(tareasInsertar);
        
        if (error) {
            console.error("❌ ERROR SUPABASE:", error.message);
            throw new Error("Fallo DB: " + error.message);
        }

        res.json({ success: true, emisor: "Sam", mensajes: gestas });

    } catch (error) {
        console.error("⚠️ MODO OFFLINE ACTIVADO:", error.message);

        // Fallback mejorado para no cortar palabras como "voy"
        const separador = /[,.]|\b y \b|\b e \b/i; 
        const tareasSimples = userInput.split(separador)
            .map(t => t.trim())
            .filter(t => t.length > 2);

        const fallback = (tareasSimples.length > 0 ? tareasSimples : [userInput]).map(t => ({
            mision: t + " (Gesta Manual)",
            reply: "¡Anotado! Aunque la niebla cubra el camino, seguiremos.",
            categoria: categoriaPorDefecto
        }));

        res.json({
            success: false,
            emisor: "Sam (Modo Offline)",
            mensajes: fallback
        });
    }
});

const PORT = 3000;


// --- RUTA PARA LEER EL LIBRO (Obtener Misiones) ---
app.get('/api/tasks', authMiddleware, async (req, res) => {
    // El frontend puede enviar una fecha 'mock' para viajar en el tiempo
    const { mockDate } = req.query;
    const fechaReferencia = mockDate ? new Date(mockDate) : new Date();

    try {
        // Pedimos a Supabase las tareas del usuario autenticado que NO estén completadas
        // Ordenadas por las más recientes primero
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('is_completed', false) 
            .order('created_at', { ascending: false });

        if (error) throw error;

        // --- MOTOR DE ASEDIO ---
        // Para cada tarea, calculamos la horda basándonos en su `failed_at`
        const tasksConHorda = data.map(task => {
            // Si la tarea nunca ha fallado (failed_at es null), no hay horda.
            if (!task.failed_at) {
                return { ...task, horda: { exploradores: 0, orcos: 0, urukhai: 0 } };
            }
            const horda = calcularHorda(task.failed_at, fechaReferencia);
            return { ...task, horda };
        });

        res.json({ success: true, tasks: tasksConHorda });

    } catch (error) {
        console.error("❌ Error leyendo el libro:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});




// --- RUTA DEL JUICIO DE GANDALF (FIN DE CICLO) ---
app.post('/api/gandalf/judge', authMiddleware, async (req, res) => {
    const { successIds = [], failureIds = [] } = req.body;
    const userId = req.user.id;

    try {
        // Lógica para las gestas exitosas (Loot)
        if (successIds.length > 0) {
            const { error: successError } = await supabase
                .from('tasks')
                .update({ is_completed: true, fallo_confirmado: false }) // Se completa la misión
                .in('id', successIds)
                .eq('user_id', userId);

            if (successError) {
                console.error("Error al procesar el éxito:", successError.message);
                throw new Error(`Fallo al registrar el éxito: ${successError.message}`);
            }
        }

        // Lógica para las gestas fracasadas (Semilla de la Horda)
        if (failureIds.length > 0) {
            const { error: failureError } = await supabase
                .from('tasks')
                .update({ 
                    is_completed: false, 
                    fallo_confirmado: true,
                    failed_at: new Date().toISOString() // ¡La Horda comienza a crecer desde AHORA!
                })
                .in('id', failureIds)
                .eq('user_id', userId);
            
            if (failureError) {
                console.error("Error al procesar el fracaso:", failureError.message);
                throw new Error(`Fallo al registrar el fracaso: ${failureError.message}`);
            }
        }

        res.json({ 
            success: true, 
            message: "El juicio de Mithrandir ha concluido. El destino de las gestas ha sido sellado." 
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ---------------------------------------------------------
// 🚀 ARRANQUE BLINDADO
// ---------------------------------------------------------
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`\n🚀 S.A.M. OPERATIVO Y VIGILANDO EN PUERTO ${PORT}`);
        console.log("📝 Esperando órdenes... (Presiona Ctrl + C para detener)\n");
    });

    // 🚨 DETECTAR ERRORES DE PUERTO (EADDRINUSE)
    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`\n❌ ERROR CRÍTICO: El puerto ${PORT} está ocupado.`);
            console.error("💡 SOLUCIÓN: Ejecuta 'taskkill /F /IM node.exe' en la terminal para matar procesos viejos.\n");
        } else {
            console.error("❌ ERROR DEL SERVIDOR:", e);
        }
        process.exit(1);
    });
}

module.exports = { app, authMiddleware };