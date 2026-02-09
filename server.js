require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('@supabase/supabase-js');

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

app.post('/api/briefing', async (req, res) => {
    const { userInput } = req.body;
    console.log("------------------------------------------------");
    console.log("📩 INPUT:", userInput);

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
                user_id: null,
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
app.get('/api/tasks', async (req, res) => {
    try {
        // Pedimos a Supabase todas las tareas que NO estén completadas
        // Ordenadas por las más recientes primero
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('is_completed', false) 
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, tasks: data });

    } catch (error) {
        console.error("❌ Error leyendo el libro:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});




app.listen(PORT, () => console.log(`🚀 S.A.M. Listo en http://localhost:${PORT}`));