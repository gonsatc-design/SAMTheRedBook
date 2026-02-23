require('dotenv').config();
// --- INICIO DIAGNÓSTICO (AÑADIR ESTO) ---
console.log("🔍 DIAGNÓSTICO DE VARIABLES:");
console.log("   -> SUPABASE_URL:", process.env.SUPABASE_URL ? "✅ DETECTADA" : "❌ VACÍA (Culpable)");
console.log("   -> SUPABASE_KEY:", process.env.SUPABASE_KEY ? "✅ DETECTADA" : "❌ VACÍA");
console.log("   -> GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✅ DETECTADA" : "❌ VACÍA");
console.log("   -> PORT:", process.env.PORT || "3000 (por defecto)");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("🔥 ERROR CRÍTICO: El archivo .env no se está leyendo o faltan claves.");
    process.exit(1); // Matamos el servidor aquí para que no explote después
}
// --- FIN DIAGNÓSTICO ---

const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('@supabase/supabase-js');
const { calcularHorda } = require('./horda');
const { getHistoricalSnapshot } = require('./analytics');
const { getPalantirPrediction } = require('./palantir');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// --- CACHE DE ESTADO DE FURIA Y DEBUFF ---
let globalFuryActive = false;
let globalDebuffActive = false;

const TITULOS_EVOLUCION = {
    'Humano': {
        1: 'Granjero', 8: 'Aventurero', 18: 'Montaraz', 25: 'Soldado',
        42: 'Capitán', 60: 'Sargento', 75: 'General', 99: 'Rey'
    },
    'Elfo': {
        1: 'Novicio de Lórien', 8: 'Explorador del Bosque', 18: 'Guardián del Sendero',
        25: 'Arquero Maestro', 42: 'Señor de los Caballos', 60: 'Alto Consejero',
        75: 'Soberano Estelar', 99: 'Señor de Rivendel'
    },
    'Enano': {
        1: 'Minero de Moria', 8: 'Picapedrero', 18: 'Herrero de Erebor',
        25: 'Guardián del Tesoro', 42: 'Señor del Yunque', 60: 'Gran Escudo de Hierro',
        75: 'Rey bajo la Montaña', 99: 'Linaje de Durin'
    },
    'Hobbit': {
        1: 'Habitante del Agujero', 8: 'Cocinero de Bolsón', 18: 'Buscador de Setas',
        25: 'Aventurero Local', 42: 'Héroe de la Comarca', 60: 'Portador de la Esperanza',
        75: 'Alcalde de Cavada Grande', 99: 'Thain de la Comarca'
    }
};

function normalizeRace(race) {
    const map = {
        'Humanos': 'Humano',
        'Elfos': 'Elfo',
        'Enanos': 'Enano',
        'Hobbits': 'Hobbit',
        'Humano': 'Humano',
        'Elfo': 'Elfo',
        'Enano': 'Enano',
        'Hobbit': 'Hobbit'
    };
    return map[race] || null;
}

function calcularTitulo(raza, nivel) {
    const razaNormalizada = normalizeRace(raza);
    if (!razaNormalizada || !TITULOS_EVOLUCION[razaNormalizada]) return 'Aventurero';
    const hitos = Object.keys(TITULOS_EVOLUCION[razaNormalizada]).map(Number).sort((a, b) => b - a);
    const hitoAlcanzado = hitos.find(h => nivel >= h);
    return TITULOS_EVOLUCION[razaNormalizada][hitoAlcanzado] || TITULOS_EVOLUCION[razaNormalizada][1];
}

async function checkGlobalRaidState() {
    try {
        const { data, error } = await supabase.rpc('get_world_status');

        if (error) {
            // Si el RPC no existe o falla, usar valores por defecto
            globalFuryActive = false;
            globalDebuffActive = false;
            return;
        }

        if (data && data.active) {
            globalFuryActive = data.progress_percentage < 50;

            // Debuff Global: Si ha expirado y sigue con vida
            if (data.expires_at) {
                const expiry = new Date(data.expires_at).getTime();
                const now = new Date().getTime();
                globalDebuffActive = now > expiry && data.current_hp > 0;
            } else {
                globalDebuffActive = false;
            }

            if (globalDebuffActive) {
                console.log("⚠️ DEBUFF GLOBAL ACTIVO: La Sombra se extiende (-20% Oro).");
            }
        } else {
            globalFuryActive = false;
            globalDebuffActive = false;
        }
    } catch (e) {
        console.error("Error checking raid state:", e.message);
        // Valores por defecto en caso de error
        globalFuryActive = false;
        globalDebuffActive = false;
    }
}
async function checkGlobalFury() { await checkGlobalRaidState(); } // Alias para retrocompatibilidad

// --- CORS POLICY (PRODUCTION-READY) ---
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

app.use((req, res, next) => {
    const origin = req.headers.origin;

    // En desarrollo local, permitir localhost
    // En producción, verificar ALLOWED_ORIGIN
    if (!origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production') {
        res.header("Access-Control-Allow-Origin", origin || "*");
    }

    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// --- CONFIGURACIÓN ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY);

// Inicializar chequeo de furia global una vez que supabase existe
setInterval(checkGlobalFury, 10 * 60 * 1000);
checkGlobalFury();

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
    if (!catIA) {
        console.log(`[Normalizer] AI category is null/undefined. Defaulting to '${categoriaPorDefecto}'.`);
        return categoriaPorDefecto;
    }

    const limpia = catIA.toLowerCase().trim();
    const encontrada = categoriasSupabase.find(c => c.toLowerCase() === limpia);

    if (encontrada) {
        return encontrada;
    } else {
        console.log(`[Normalizer] AI category "${catIA}" (cleaned: "${limpia}") not found. Defaulting to '${categoriaPorDefecto}'.`);
        return categoriaPorDefecto;
    }
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
        console.log(`🔑 Token validado para: ${user.email} (${user.id})`);
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
        El portador te dice: "${userInput}".

        TU MISIÓN:
        1. Separa las intenciones del usuario en tareas distintas. Si el usuario dice algo simple como "dormir", NO lo dividas artificialmente, crea una única gesta significativa (ej: "El Descanso del Guerrero").
        2. ASIGNA A CADA UNA:
           - Un "Título Épico" (Medieval/Fantasía). 
           - Una "Descripción Inmersiva": Breve frase (max 10 palabras) que traduzca la acción al mundo de la Tierra Media (ej: "Dormir 6h" -> "Reposar en el Valle del Silencio bajo las estrellas").
           - Una "Categoría" exacta: "trabajo", "salud", "estudio", "hogar", "ocio".
           - Una "Frase de Sam" (Reply): Cálida, leal y rústica.

        ⛔ REGLAS DE ORO (Estilo):
        - PROHIBIDO usar palabras en inglés.
        - PROHIBIDO lenguaje técnico.
        - USA lenguaje de HOBBIT.

        Responde SOLO este Array JSON:
        [{"mision": "...", "descripcion_inmersiva": "...", "categoria": "...", "reply": "..."}]`;

        const result = await model.generateContent(promptUnificado);
        const gestas = JSON.parse(extraerJSON(result.response.text()));

        console.log(`✅ IA OK: ${gestas.length} gestas detectadas.`);

        // --- PREPARAR PARA SUPABASE ---
        const tareasInsertar = gestas.map(g => {
            const catSegura = normalizarCategoria(g.categoria);
            return {
                user_id: req.user.id,
                titulo_original: userInput,
                titulo_epico: g.mision,
                descripcion: g.descripcion_inmersiva || "Una gesta misteriosa...", // Guardamos la descripción inmersiva
                categoria: catSegura,
                estado_enemigo: 'explorador',
                sam_phrase: g.reply // NUEVO: Guardamos la frase de Sam por tarea
            };
        });

        const { error: insertError } = await supabase.from('tasks').insert(tareasInsertar);

        if (insertError) {
            console.error("❌ ERROR SUPABASE:", insertError.message);
            throw new Error("Fallo DB: " + insertError.message);
        }

        // --- RESPUESTA UNIFICADA PARA EL CHAT ---
        const saludoGlobal = gestas.length > 1
            ? `He anotado estas ${gestas.length} gestas en el Libro Rojo. El camino avanza.`
            : `Gesta registrada. ${gestas[0].reply}`;

        res.json({ success: true, emisor: "Sam", mensajes: [{ reply: saludoGlobal }] });

    } catch (error) {
        console.error("⚠️ MODO OFFLINE ACTIVADO:", error.message);

        const separador = /[,.]|\b y \b|\b e \b/i;
        const tareasSimples = userInput.split(separador)
            .map(t => t.trim())
            .filter(t => t.length > 2);

        const fallback = (tareasSimples.length > 0 ? tareasSimples : [userInput]).map(t => ({
            mision: t + " (Gesta Manual)",
            descripcion_inmersiva: "Avanzar paso a paso hacia el Monte del Destino.",
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`📜 El Libro Rojo se ha abierto en el puerto ${PORT}`);
    console.log(`   -> MODO: ${process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN (Cloud)' : 'DESARROLLO (Local)'}`);
});


// --- RUTA PARA LEER EL LIBRO (Obtener Misiones) ---
app.get('/api/tasks', authMiddleware, async (req, res) => {
    // El frontend puede enviar una fecha 'mock' para viajar en el tiempo
    const { mockDate } = req.query;
    const fechaReferencia = mockDate ? new Date(mockDate) : new Date();

    // Calcular inicio de semana (LUNES)
    const inicioSemana = new Date(fechaReferencia);
    const day = inicioSemana.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Ajuste para que Lunes sea 1
    inicioSemana.setDate(inicioSemana.getDate() + diff);
    inicioSemana.setHours(0, 0, 0, 0);

    try {
        // Pedimos a Supabase las tareas del usuario autenticado de la SEMANA ACTUAL
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', req.user.id)
            // REMOVED: .eq('is_completed', false) - Ahora devolvemos TODAS las tareas para mostrar historial
            .gte('created_at', inicioSemana.toISOString()) // Solo desde el Lunes
            .order('created_at', { ascending: false });

        if (error) throw error;

        // --- BLOQUE 4: OBTENER BUFFS ACTIVOS ---
        const activeBuffs = await obtenerModificadores(req.user.id);

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
                console.log(`📦 [HORDA] Tarea: ${task.titulo_epico} | Fallida: ${task.fallo_confirmado} | FechaFallo: ${fechaFallo} | Horda: ${JSON.stringify(horda)}`);
                return { ...task, horda };
            }

            // Si la tarea NO está fallida, no hay horda
            return { ...task, horda: { exploradores: 0, orcos: 0, urukhai: 0 } };
        });

        res.json({ success: true, tasks: tasksConHorda, activeBuffs });

    } catch (error) {
        console.error("❌ Error leyendo el libro:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});



// --- RUTA DEL JUICIO DE GANDALF (FIN DE CICLO) ---
app.post('/api/gandalf/judge', authMiddleware, async (req, res) => {
    const { successIds = [], failureIds = [] } = req.body;
    const userId = req.user.id;
    const recompensasOtorgadas = [];
    let xpFinal = 0;
    let updatedXP = 0;
    let updatedLevel = 0;

    try {
        // Lógica para las gestas exitosas (Loot + XP Modifiers)
        if (successIds.length > 0) {
            // 🧠 CALCULAR BUFFS DE XP
            const modifiers = await obtenerModificadores(userId);
            const baseXP = 10;
            xpFinal = baseXP * (modifiers.buff_xp || 1);

            // 🎁 OBTENER DETALLES DE TAREAS PARA GENERAR RECOMPENSAS ANTES
            const { data: completedTasks } = await supabase
                .from('tasks')
                .select('id, categoria')
                .in('id', successIds);

            // Generar recompensas EN PARALELO para todas las tareas
            if (completedTasks && completedTasks.length > 0) {
                const recompensasPromises = completedTasks.map(task =>
                    generarRecompensa(userId, task.categoria)
                );
                const recompensas = await Promise.all(recompensasPromises);
                recompensasOtorgadas.push(...recompensas);
                console.log(`🎁 RECOMPENSAS GENERADAS: ${recompensasOtorgadas.length} items`, recompensasOtorgadas);
            }

            // Actualizar tareas en BD
            const { error: successError } = await supabase
                .from('tasks')
                .update({
                    is_completed: true,
                    fallo_confirmado: false,
                    experience_reward: xpFinal,
                    completed_at: new Date().toISOString()
                })
                .in('id', successIds)
                .eq('user_id', userId);

            if (successError) {
                console.error("Error al procesar el éxito:", successError.message);
                throw new Error(`Fallo al registrar el éxito: ${successError.message}`);
            }
            console.log(`✨ XP GENERADA: ${xpFinal} (Mult: ${modifiers.buff_xp.toFixed(2)}) para ${successIds.length} tareas.`);
        }

        // Lógica para las gestas fracasadas (Semilla de la Horda)
        if (failureIds.length > 0) {
            const { error: failureError } = await supabase
                .from('tasks')
                .update({
                    is_completed: false,
                    fallo_confirmado: true,
                    failed_at: new Date().toISOString()
                })
                .in('id', failureIds)
                .eq('user_id', userId);

            if (failureError) {
                console.error("Error al procesar el fracaso:", failureError.message);
                throw new Error(`Fallo al registrar el fracaso: ${failureError.message}`);
            }

            // 🌑 PENALIZACIÓN A LA SALUD DEL MUNDO (BARRA DE LUZ)
            setImmediate(async () => {
                try {
                    const penalty = failureIds.length * 1000; // 1000 HP por cada fallo
                    await supabase.rpc('penalize_world_health', { p_damage: penalty });
                    console.log(`🌑 SALUD DEL MUNDO REDUCIDA: -${penalty} HP por fallos de ${userId}`);
                } catch (e) {
                    console.error("❌ Error al penalizar salud mundial:", e.message);
                }
            });
        }

        // � SUMAR XP AL PERFIL DEL USUARIO
        if (successIds.length > 0) {
            const totalXP = successIds.length * xpFinal;
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('experience, level')
                    .eq('id', userId)
                    .single();

                if (profile) {
                    const newExp = (profile.experience || 0) + totalXP;
                    const newLevel = Math.floor(newExp / 1000) + 1;

                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                            experience: newExp,
                            level: newLevel
                        })
                        .eq('id', userId);

                    if (updateError) {
                        console.error("❌ Error al actualizar XP del perfil:", updateError.message);
                    } else {
                        console.log(`📈 XP SUMADO AL PERFIL: +${totalXP} XP (Total: ${newExp}, Nivel: ${newLevel})`);
                    }
                }
            } catch (e) {
                console.error("❌ Error al procesar XP:", e.message);
            }
        }

        // �🛡️ PROTOCOLO DE INCURSIÓN: PROCESAR DAÑO GLOBAL
        if (successIds.length > 0) {
            setImmediate(async () => {
                try {
                    await procesarDanioGlobal(userId, successIds);
                    checkGlobalFury();
                    // 🏆 Verificar logros después de completar gestas
                    await checkAchievements(userId);
                } catch (e) {
                    console.error("❌ Error en Protocolo de Incursión:", e.message);
                }
            });
        }

        // ✅ RESPUESTA CON RECOMPENSAS INCLUIDAS
        res.json({
            success: true,
            message: "El juicio de Mithrandir ha concluido. El destino de las gestas ha sido sellado.",
            rewards: recompensasOtorgadas,  // Lista de materiales ganados
            updatedXP: updatedXP,
            updatedLevel: updatedLevel
        });

        console.log(`✅ GANDALF JUDGE ENDPOINT COMPLETADO - XP: ${updatedXP}, Level: ${updatedLevel}`);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO en /api/gandalf/judge:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- PROTOCOLO DE INCURSIÓN: DAÑO GLOBAL (ROBUSTO) ---
async function procesarDanioGlobal(userId, taskIds) {
    console.log(`⚔️ REGISTRANDO DAÑO GLOBAL [User: ${userId}, Tasks: ${taskIds.length}]`);

    // NOTA: El RPC register_raid_damage requiere schema específico.
    // En versiones futuras se habilitará cuando el schema esté completo.
    // Por ahora, el Raid está en beta y el daño se registra manualmente en otros endpoints.

    try {
        // Intentar llamar al RPC si está disponible
        const { data: totalDamage, error } = await supabase.rpc('register_raid_damage', {
            p_user_id: userId,
            p_task_ids: taskIds
        });

        if (error) {
            console.log(`⚠️ Raid logging en beta (RPC no disponible aún): ${error.message}`);
            console.log(`✅ XP y Oro del usuario se aplicaron correctamente`);
            return;
        }

        console.log(`💥 DAÑO TOTAL INFLIGIDO A SAURON: ${totalDamage} HP`);
    } catch (e) {
        console.log(`⚠️ Raid system en development: ${e.message}`);
    }
}

// --- MOTOR DE BOTÍN (ERÉBOR FORGE) ---
async function generarRecompensa(userId, categoria) {
    const roll = Math.random() * 100;
    let rarity, items;

    // 1. Determinar Rareza
    if (roll < 80) {
        rarity = 'Común';
        items = ['Hierro', 'Cuero', 'Madera'];
    } else if (roll < 95) {
        rarity = 'Raro';
        items = ['Acero de Gondor', 'Telas Élficas'];
    } else {
        rarity = 'Legendario';
        items = ['Mithril', 'Fragmento de Narsil'];
    }

    // 2. Influencia de Categoría (Drops específicos)
    if (categoria === 'estudio' && Math.random() < 0.3) {
        items = rarity === 'Común' ? ['Pergamino', 'Pluma'] : ['Tinta de Isildur', 'Libro Antiguo'];
    } else if (categoria === 'salud' && Math.random() < 0.3) {
        items = rarity === 'Común' ? ['Hierbas', 'Ungüento'] : ['Athelas', 'Vial de Galadriel'];
    }

    const itemName = items[Math.floor(Math.random() * items.length)];

    // 3. Recompensa de Oro (Con Debuff Global)
    let goldBase = Math.floor(Math.random() * 50) + 50; // 50-100 Oro
    if (globalDebuffActive) {
        goldBase = Math.round(goldBase * 0.8);
        console.log(`📉 Debuff Global aplicado a ${userId}: ${goldBase} Oro (vs original)`);
    }

    // 4. Actualizar Inventario y Oro
    const { error: invError } = await supabase
        .from('inventory')
        .insert([{
            user_id: userId,
            item_name: itemName,
            rarity: rarity,
            category_context: categoria
        }]);

    const { error: goldError } = await supabase.rpc('increment_gold', { p_user_id: userId, p_amount: goldBase });

    if (invError) console.error("❌ Error al guardar botín:", invError.message);
    if (goldError) console.error("❌ Error al otorgar oro:", goldError.message);

    // IMPORTANTE: Retornar el objeto de recompensa para mostrar en UI
    return {
        item_name: itemName,
        rarity: rarity,
        gold: goldBase
    };
}

// --- HELPER: OBTENER MODIFICADORES DEL INVENTARIO ---
async function obtenerModificadores(userId) {
    const { data, error } = await supabase
        .from('inventory')
        .select('item_name, effects')
        .eq('user_id', userId);

    if (error) {
        console.error("❌ Error fetch modifiers:", error.message);
        return { buff_xp: 1, reduccion_horda: 0, sources: [] };
    }

    const modifiers = { buff_xp: 1, reduccion_horda: 0, sources: [] };

    data.forEach(item => {
        if (item.effects) {
            let hasEffect = false;
            if (item.effects.buff_xp) {
                modifiers.buff_xp *= item.effects.buff_xp;
                hasEffect = true;
            }
            if (item.effects.reduccion_horda) {
                modifiers.reduccion_horda += item.effects.reduccion_horda;
                hasEffect = true;
            }

            if (hasEffect) {
                modifiers.sources.push({
                    name: item.item_name,
                    buff_xp: item.effects.buff_xp,
                    reduccion_horda: item.effects.reduccion_horda
                });
            }
        }
    });

    // Limitar reducción de horda al 90% para no romper el juego
    modifiers.reduccion_horda = Math.min(modifiers.reduccion_horda, 0.9);

    return modifiers;
}

// --- RUTA DEL ORÁCULO (PREDICCIÓN IA) ---
app.get('/api/palantir/predict', authMiddleware, async (req, res) => {
    try {
        // 1. Recopilar datos históricos para el usuario
        const historicalData = await getHistoricalSnapshot(req.user.id);

        const hasAnyActivity = (historicalData || []).some(day =>
            (day.totalTasks || 0) > 0 || (day.totalSuccess || 0) > 0 || (day.totalFailed || 0) > 0
        );

        // Usuario nuevo o sin historial: predicción neutral, no alarmista
        if (!hasAnyActivity) {
            return res.json({
                success: true,
                prediction: {
                    probabilidad_fallo: 18,
                    alerta: "Comienzo en calma. El camino está abierto.",
                    sugerencia: "Empieza con una gesta breve para despertar el ritmo del Portador."
                }
            });
        }

        // 2. Enviar los datos al Oráculo para obtener la predicción
        const prediction = await getPalantirPrediction(historicalData);

        res.json({ success: true, prediction });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- RUTA DEL TESORO (INVENTARIO) ---
app.get('/api/inventory', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Consultamos todos los items del usuario (resiliente a columnas faltantes)
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        // Agrupar por nombre de objeto
        const inventoryMap = data.reduce((acc, item) => {
            // Items forjados tienen category_context = 'forge'
            const isForged = item.category_context === 'forge' || item.is_unique === true;

            if (isForged) {
                // Items forjados se tratan como individuales (no agrupan)
                const key = `${item.item_name}_forge_${Object.keys(acc).length}`;
                acc[key] = {
                    item_name: item.item_name,
                    name: item.item_name,
                    rarity: item.rarity,
                    total: 1,
                    is_unique: true
                };
            } else {
                // Items normales se agrupan por cantidad
                if (!acc[item.item_name]) {
                    acc[item.item_name] = {
                        item_name: item.item_name,
                        name: item.item_name,
                        rarity: item.rarity,
                        total: 0,
                        is_unique: false
                    };
                }
                acc[item.item_name].total += item.quantity || 1;
            }
            return acc;
        }, {});

        res.json({ success: true, inventory: Object.values(inventoryMap) });

    } catch (error) {
        console.error("❌ Error en Inventario:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- RUTA DE SALUD MUNDIAL ---
// --- EL YUNQUE DE DURIN (CRAFTEO) ---
const RECETAS = {
    'Amuleto de Enfoque': {
        materiales: { 'Hierro': 5, 'Cuero': 2 },
        resultado: { rarity: 'Común', description: 'Un talismán que agudiza los sentidos.', effects: { buff_xp: 1.1 } }
    },
    'Escudo de Gondor': {
        materiales: { 'Acero de Gondor': 3, 'Madera': 1 },
        resultado: { rarity: 'Raro', description: 'Protección pesada contra la horda.', effects: { reduccion_horda: 0.3 } }
    },
    'Dardo (Sting)': {
        materiales: { 'Mithril': 1, 'Hierro': 2 },
        resultado: { rarity: 'Legendario', description: 'Brilla con una luz azul cuando hay orcos cerca.', effects: { damage_bonus: 2.0 } }
    },
    'Glamdring': {
        materiales: { 'Acero de Gondor': 5, 'Fragmento de Narsil': 1 },
        resultado: { rarity: 'Legendario', description: 'La Martilladora de Enemigos, forjada en Gondolin.', effects: { damage_bonus: 2.5 } }
    },
    'Andúril': {
        materiales: { 'Fragmento de Narsil': 3, 'Acero de Gondor': 10 },
        resultado: { rarity: 'Legendario', description: 'La Llama del Oeste, reforjada de los fragmentos de Narsil.', effects: { damage_bonus: 5.0, buff_xp: 1.5 } }
    },
    'Cota de Mithril': {
        materiales: { 'Mithril': 10 },
        resultado: { rarity: 'Legendario', description: 'Ligera como una pluma y dura como escamas de dragón.', effects: { reduccion_horda: 0.9 } }
    },
    'Vial de Galadriel': {
        materiales: { 'Telas Élficas': 2, 'Luz de Eärendil': 1 },
        resultado: { rarity: 'Legendario', description: 'Una luz para los lugares oscuros, cuando todas las demás se apagan.', effects: { world_light_bonus: 500 } }
    },
    'Anillo de Barahir': {
        materiales: { 'Oro': 500, 'Esmeralda': 1 },
        resultado: { rarity: 'Raro', description: 'Símbolo de la herencia de los Reyes de los Hombres.', effects: { gold_bonus: 1.2 } }
    },
    'Orcrist': {
        materiales: { 'Acero de Gondor': 4, 'Hueso de Dragón': 1 },
        resultado: { rarity: 'Legendario', description: 'La Hendidora de Trasgos.', effects: { damage_bonus: 2.2 } }
    },
    'Yelmo de Hador': {
        materiales: { 'Acero de Gondor': 6, 'Oro': 100 },
        resultado: { rarity: 'Legendario', description: 'El Yelmo Dragón de Dor-lómin.', effects: { reduccion_horda: 0.4 } }
    },
    'Estrella de Elendil': {
        materiales: { 'Cristal Blanco': 1, 'Plata': 5 },
        resultado: { rarity: 'Legendario', description: 'Símbolo de la realeza del Reino del Norte.', effects: { buff_xp: 1.3 } }
    },
    'Cuerno de Gondor': {
        materiales: { 'Plata': 3, 'Marfil': 1 },
        resultado: { rarity: 'Raro', description: 'Su sonido infunde valor en los aliados.', effects: { damage_bonus: 1.5 } }
    },
    'Elessar': {
        materiales: { 'Gema Verde': 1, 'Plata': 2 },
        resultado: { rarity: 'Legendario', description: 'La Piedra de Elfo, que trae sanación y paz.', effects: { world_light_bonus: 1000 } }
    },
    'Palantír de Orthanc': {
        materiales: { 'Obsidiana': 5, 'Esencia de la Sombra': 1 },
        resultado: { rarity: 'Legendario', description: 'Una piedra que todo lo ve, pero a un gran coste.', effects: { vision_bonus: 1.0 } }
    },
    'Herugrim': {
        materiales: { 'Acero de Rohan': 4, 'Oro': 50 },
        resultado: { rarity: 'Raro', description: 'La espada de los Reyes de la Marca.', effects: { damage_bonus: 1.8 } }
    },
    'Grond': {
        materiales: { 'Hierro Negro': 20, 'Fuego del Destino': 1 },
        resultado: { rarity: 'Legendario', description: 'El Martillo del Inframundo.', effects: { damage_bonus: 10.0 } }
    },
    'Aeglos': {
        materiales: { 'Acero de Gondolin': 5, 'Plata': 2 },
        resultado: { rarity: 'Legendario', description: 'La lanza de Gil-galad.', effects: { damage_bonus: 2.8 } }
    },
    'Anglachel': {
        materiales: { 'Hierro Meteórico': 3 },
        resultado: { rarity: 'Legendario', description: 'Forjada por Eöl el Elfo Oscuro.', effects: { damage_bonus: 3.5 } }
    },
    'Anillo de Thrór': {
        materiales: { 'Oro': 1000, 'Gema de la Montaña': 1 },
        resultado: { rarity: 'Legendario', description: 'Uno de los siete anillos de los Enanos.', effects: { gold_bonus: 2.0 } }
    },
    'Llave de Erebor': {
        materiales: { 'Hierro': 1, 'Plata': 1 },
        resultado: { rarity: 'Común', description: 'La llave de la Puerta Secreta.', effects: { luck_bonus: 1.1 } }
    },
    'Libro Rojo de la Frontera del Oeste': {
        materiales: { 'Cuero': 5, 'Papel Antiguo': 10 },
        resultado: { rarity: 'Legendario', description: 'La crónica de Bilbo y Frodo.', effects: { buff_xp: 2.0 } }
    },
    'Piedra del Arca (Arkenstone)': {
        materiales: { 'Gema de la Montaña': 1, 'Diamante': 1 },
        resultado: { rarity: 'Legendario', description: 'El Corazón de la Montaña.', effects: { gold_bonus: 3.0 } }
    }
};

app.get('/api/forge/recipes', authMiddleware, async (req, res) => {
    // Devolvemos las recetas disponibles para que el UI pueda ser dinámico
    res.json({ success: true, recipes: RECETAS });
});

app.post('/api/forge/craft', authMiddleware, async (req, res) => {
    try {
        const { recetaNombre } = req.body;
        const userId = req.user.id;
        const receta = RECETAS[recetaNombre];

        if (!receta) {
            return res.status(400).json({ success: false, error: "La receta no existe en los anales de Erebor." });
        }

        // 1. Verificar Materiales
        const { data: userInventory, error: fetchError } = await supabase
            .from('inventory')
            .select('id, item_name, quantity')
            .eq('user_id', userId);

        if (fetchError) throw fetchError;

        // Agrupar items disponibles
        const available = userInventory.reduce((acc, item) => {
            acc[item.item_name] = (acc[item.item_name] || 0) + (item.quantity || 1);
            return acc;
        }, {});

        // Comprobar si falta algo
        for (const [mat, cantidad] of Object.entries(receta.materiales)) {
            if ((available[mat] || 0) < cantidad) {
                return res.status(400).json({
                    success: false,
                    error: `Recursos insuficientes. Necesitas ${cantidad} de ${mat}.`
                });
            }
        }

        // 2. Consumir Materiales (Eliminar/Actualizar)
        // Por simplicidad en este MVP, eliminaremos items individuales hasta cubrir la cantidad
        for (const [mat, cantidad] of Object.entries(receta.materiales)) {
            const itemsAMatar = userInventory
                .filter(i => i.item_name === mat)
                .slice(0, cantidad)
                .map(i => i.id);

            const { error: deleteError } = await supabase
                .from('inventory')
                .delete()
                .in('id', itemsAMatar);

            if (deleteError) throw deleteError;
        }

        // 3. Crear Artefacto (Marcado como SOULBOUND = no se puede forjar de nuevo)
        const { error: insertError } = await supabase
            .from('inventory')
            .insert([{
                user_id: userId,
                item_name: recetaNombre,
                rarity: receta.resultado.rarity,
                effects: receta.resultado.effects,
                category_context: 'forge',
                soulbound: true  // IMPORTANTE: Marca este item como único/forjado
            }]);

        if (insertError) throw insertError;

        res.json({
            success: true,
            message: `¡Has forjado el ${recetaNombre}! El martillo de Durin canta con tu éxito.`,
            artifact: recetaNombre
        });

    } catch (error) {
        console.error("❌ Error en la Forja:", error.message, error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
});


// --- EL SACRIFICIO DE ISILDUR (BLOQUE 2) ---
app.post('/api/raid/sacrifice', authMiddleware, async (req, res) => {
    try {
        const { type, amount } = req.body; // 'xp' or 'gold'
        const userId = req.user.id;

        if (!type || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: "Debes especificar un recurso y una cantidad válida." });
        }

        // Equivalencias de daño (Nivel HEROICO)
        // 1 Oro = 5 HP, 1 XP = 20 HP
        const damagePerUnit = type === 'xp' ? 20 : 5;
        const totalDamage = amount * damagePerUnit;

        // Llamar a la función atómica en la base de datos
        const { data, error } = await supabase.rpc('process_sacrifice', {
            p_user_id: userId,
            p_type: type,
            p_amount: parseInt(amount),
            p_damage: Math.round(totalDamage)
        });

        if (error) throw error;

        if (!data.success) {
            return res.status(400).json({ success: false, error: data.error });
        }

        console.log(`✨ SACRIFICIO HEROICO [User: ${userId}]: ${amount} ${type} -> ${totalDamage} DAÑO`);
        console.log(`📡 RPC Response:`, JSON.stringify(data, null, 2));

        // Disparar chequeo de furia por si acaso
        checkGlobalFury();

        res.json({
            success: true,
            message: data.message,
            damage_dealt: totalDamage,
            rpc_response: data
        });

    } catch (error) {
        console.error("❌ Error en Sacrificio:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- RUTA DE LA SALA DE GUERRA (ANALYTICS) ---
app.get('/api/stats/personal', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Calcular el rango de los últimos 7 días
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // 2. Traer TODAS las tareas relevantes de la semana
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('id, is_completed, fallo_confirmado, created_at, completed_at, failed_at')
            .eq('user_id', userId)
            .or(`created_at.gte.${sevenDaysAgo.toISOString()},completed_at.gte.${sevenDaysAgo.toISOString()},failed_at.gte.${sevenDaysAgo.toISOString()}`);

        if (error) throw error;

        // 3. Agrupar por día
        const history = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(sevenDaysAgo);
            date.setDate(sevenDaysAgo.getDate() + i);
            const dateString = date.toISOString().split('T')[0];

            // Éxitos: Tareas cuyo 'completed_at' es hoy
            const exitosHoy = tasks.filter(t => t.completed_at && t.completed_at.startsWith(dateString));

            // Fallos: Tareas que se marcaron como fallo este día
            const fallosHoy = tasks.filter(t => t.failed_at && t.failed_at.startsWith(dateString));

            history.push({
                date: dateString,
                totalSuccess: exitosHoy.length,
                totalFailed: fallosHoy.length
            });
        }

        res.json({
            success: true,
            stats: {
                history: history // Array cronológico (de hace 6 días hasta hoy)
            }
        });

    } catch (error) {
        console.error("❌ Error en Analytics Real-time:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- RUTA DEL MAPA TÁCTICO POR RAZA (SEMANA L-D) ---
app.get('/api/stats/races-weekly', authMiddleware, async (req, res) => {
    try {
        const today = new Date();
        const monday = new Date(today);
        const day = monday.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        monday.setDate(monday.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 7);

        const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        const races = {
            Humano: { completed: [0, 0, 0, 0, 0, 0, 0], failed: [0, 0, 0, 0, 0, 0, 0] },
            Elfo: { completed: [0, 0, 0, 0, 0, 0, 0], failed: [0, 0, 0, 0, 0, 0, 0] },
            Enano: { completed: [0, 0, 0, 0, 0, 0, 0], failed: [0, 0, 0, 0, 0, 0, 0] },
            Hobbit: { completed: [0, 0, 0, 0, 0, 0, 0], failed: [0, 0, 0, 0, 0, 0, 0] }
        };

        // 1) Tareas de la semana (contaremos por completed_at / failed_at)
        const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('user_id, completed_at, failed_at')
            .or(`completed_at.gte.${monday.toISOString()},failed_at.gte.${monday.toISOString()}`);

        if (tasksError) throw tasksError;

        if (!tasks || tasks.length === 0) {
            return res.json({ success: true, stats: { labels, races } });
        }

        // 2) Mapa user -> raza
        const userIds = [...new Set(tasks.map(t => t.user_id).filter(Boolean))];
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, race')
            .in('id', userIds);

        if (profilesError) throw profilesError;

        const raceByUser = {};
        (profiles || []).forEach(p => {
            const normalized = normalizeRace(p.race);
            if (normalized) raceByUser[p.id] = normalized;
        });

        const getDayIndex = (isoDate) => {
            if (!isoDate) return -1;
            const d = new Date(isoDate);
            if (Number.isNaN(d.getTime())) return -1;
            if (d < monday || d >= sunday) return -1;
            const jsDay = d.getDay(); // 0=Dom .. 6=Sáb
            return jsDay === 0 ? 6 : jsDay - 1; // L=0 .. D=6
        };

        // 3) Agregar por raza y día
        tasks.forEach(t => {
            const race = raceByUser[t.user_id];
            if (!race || !races[race]) return;

            const completedIdx = getDayIndex(t.completed_at);
            if (completedIdx >= 0) races[race].completed[completedIdx] += 1;

            const failedIdx = getDayIndex(t.failed_at);
            if (failedIdx >= 0) races[race].failed[failedIdx] += 1;
        });

        res.json({
            success: true,
            stats: { labels, races }
        });
    } catch (error) {
        console.error("❌ Error en /api/stats/races-weekly:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// --- RUTA DEL FRENTE GLOBAL (World Boss HP) ---
app.get('/api/stats/global', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('get_world_status');

        if (error) throw error;

        res.json({ success: true, world_status: data });

    } catch (error) {
        console.error("❌ Error en Frente Global:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// --- RUTA DEL PERFIL DEL USUARIO ---
app.get('/api/profile/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`🔍 Buscando perfil para usuario: ${userId}`);

        // 1. Obtener datos del perfil (con SELECT * para ser flexible)
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // Si no existe el perfil, crear uno por defecto
        if (profileError && profileError.code === 'PGRST116') {  // No rows found
            console.log(`📝 Creando perfil para usuario ${userId}...`);
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    id: userId,
                    level: 1,
                    experience: 0,
                    gold: 0,
                    race: null,             // Sin raza: el cliente mostrará el modal de selección
                    race_title: 'Aventurero'
                }])
                .select()
                .single();

            if (insertError) {
                console.error("❌ Error al insertar perfil:", insertError.message);
                throw insertError;
            }
            profile = newProfile;
            console.log("✅ Perfil creado exitosamente (sin raza: esperando selección del usuario)");
        } else if (profileError) {
            console.error("❌ Error al obtener perfil:", profileError.message);
            return res.status(404).json({ success: false, error: "Perfil no encontrado" });
        }

        // 2. Verificar logros retroactivos
        const updatedAchievements = await checkAchievements(userId);
        profile.achievements = updatedAchievements;

        // 3. Retornar con valores seguros
        res.json({
            success: true,
            profile: {
                id: profile.id,
                email: req.user.email || "usuario@ejemplo.com",
                nickname: profile.nickname || null,
                level: profile.level || 1,
                experience: profile.experience || 0,
                gold: profile.gold || 0,
                race: normalizeRace(profile.race) || null,
                race_title: profile.race_title || 'Aventurero',
                achievements: profile.achievements || []
            }
        });

    } catch (error) {
        console.error("❌ Error crítico en /api/profile/me:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para seleccionar raza (onboarding)
app.post('/api/profile/select-race', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const allowedRaces = ['Humano', 'Elfo', 'Enano', 'Hobbit'];
        const selectedRaceRaw = (req.body?.race || '').trim();
        const selectedRace = normalizeRace(selectedRaceRaw);

        if (!allowedRaces.includes(selectedRace)) {
            return res.status(400).json({ success: false, error: 'Raza inválida' });
        }

        const { data: currentProfile, error: profileError } = await supabase
            .from('profiles')
            .select('level')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error("❌ Error al obtener perfil para seleccionar raza:", profileError.message);
            return res.status(404).json({ success: false, error: 'Perfil no encontrado' });
        }

        const raceTitle = calcularTitulo(selectedRace, currentProfile?.level || 1);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                race: selectedRace,
                race_title: raceTitle
            })
            .eq('id', userId);

        if (updateError) {
            console.error("❌ Error al actualizar raza:", updateError.message);
            return res.status(500).json({ success: false, error: 'No se pudo guardar la raza' });
        }

        res.json({
            success: true,
            race: selectedRace,
            race_title: raceTitle,
            message: `Destino sellado: ${selectedRace}.`
        });
    } catch (error) {
        console.error("❌ Error en /api/profile/select-race:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para cambiar raza (costo alto)
app.post('/api/profile/change-race', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const allowedRaces = ['Humano', 'Elfo', 'Enano', 'Hobbit'];
        const selectedRaceRaw = (req.body?.race || '').trim();
        const selectedRace = normalizeRace(selectedRaceRaw);
        const RACE_CHANGE_COST = 1000000;

        if (!allowedRaces.includes(selectedRace)) {
            return res.status(400).json({ success: false, error: 'Raza inválida' });
        }

        const { data: currentProfile, error: profileError } = await supabase
            .from('profiles')
            .select('level, gold, race')
            .eq('id', userId)
            .single();

        if (profileError || !currentProfile) {
            console.error("❌ Error al obtener perfil para cambiar raza:", profileError?.message);
            return res.status(404).json({ success: false, error: 'Perfil no encontrado' });
        }

        const currentRace = normalizeRace(currentProfile.race);
        if (!currentRace) {
            return res.status(400).json({ success: false, error: 'Primero debes elegir tu raza inicial.' });
        }

        if (currentRace === selectedRace) {
            return res.status(400).json({ success: false, error: 'Ya perteneces a esa raza.' });
        }

        const currentGold = Number(currentProfile.gold || 0);
        if (currentGold < RACE_CHANGE_COST) {
            return res.status(400).json({
                success: false,
                error: `Necesitas ${RACE_CHANGE_COST.toLocaleString()} de oro para cambiar de raza.`,
                required_gold: RACE_CHANGE_COST,
                current_gold: currentGold
            });
        }

        const newGold = currentGold - RACE_CHANGE_COST;
        const raceTitle = calcularTitulo(selectedRace, currentProfile.level || 1);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                race: selectedRace,
                race_title: raceTitle,
                gold: newGold
            })
            .eq('id', userId);

        if (updateError) {
            console.error("❌ Error al cambiar raza:", updateError.message);
            return res.status(500).json({ success: false, error: 'No se pudo completar el cambio de raza' });
        }

        res.json({
            success: true,
            race: selectedRace,
            race_title: raceTitle,
            gold: newGold,
            message: `Raza cambiada a ${selectedRace}. Coste: ${RACE_CHANGE_COST.toLocaleString()} de oro.`
        });
    } catch (error) {
        console.error("❌ Error en /api/profile/change-race:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para guardar nickname del usuario
app.post('/api/profile/nickname', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nickname } = req.body;

        if (!nickname || nickname.trim().length === 0) {
            return res.status(400).json({ success: false, error: "El apodo no puede estar vacío" });
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ nickname: nickname.trim() })
            .eq('id', userId);

        if (updateError) {
            console.error("❌ Error al actualizar nickname:", updateError.message);
            return res.status(500).json({ success: false, error: "Error al guardar el apodo" });
        }

        console.log(`📝 Nickname actualizado para ${userId}: ${nickname}`);
        res.json({ success: true, nickname: nickname.trim() });
    } catch (error) {
        console.error("❌ Error en /api/profile/nickname:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener progreso de logros del usuario
app.get('/api/achievements/progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Fetch all completed tasks for the user (only the category is needed)
        const { data: completedTasks, error: tasksError } = await supabase
            .from('tasks')
            .select('categoria')
            .eq('user_id', userId)
            .eq('is_completed', true);

        if (tasksError) {
            console.error(`Error fetching completed tasks for user ${userId}:`, tasksError.message);
            throw new Error(tasksError.message);
        }

        // 2. Count tasks by category in JavaScript
        const categoryCounts = (completedTasks || []).reduce((acc, task) => {
            if (task.categoria) {
                const category = task.categoria.toLowerCase();
                acc[category] = (acc[category] || 0) + 1;
            }
            return acc;
        }, {});

        const totalTasks = completedTasks.length;

        // 3. Define all achievements and their requirements
        const achievements = {
            tasks_1: { current: Math.min(totalTasks, 1), target: 1 },
            tasks_10: { current: Math.min(totalTasks, 10), target: 10 },
            tasks_25: { current: Math.min(totalTasks, 25), target: 25 },
            salud_5: { current: Math.min(categoryCounts['salud'] ?? 0, 5), target: 5 },
            estudio_10: { current: Math.min(categoryCounts['estudio'] ?? 0, 10), target: 10 },
            trabajo_5: { current: Math.min(categoryCounts['trabajo'] ?? 0, 5), target: 5 },
            hogar_5: { current: Math.min(categoryCounts['hogar'] ?? 0, 5), target: 5 },
            ocio_5: { current: Math.min(categoryCounts['ocio'] ?? 0, 5), target: 5 }
        };

        console.log(`[Achievements Progress] User: ${userId}`, { total: totalTasks, ...categoryCounts });

        res.json({
            success: true,
            achievements: {
                progress: achievements
            }
        });
    } catch (error) {
        console.error("❌ Error en /api/achievements/progress:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function checkAchievements(userId) {
    // Verificar y desbloquear logros basados en progreso del usuario
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('achievements, level, gold, experience')
            .eq('id', userId)
            .single();

        if (!profile) return;

        let newAchievements = Array.isArray(profile.achievements) ? [...profile.achievements] : [];
        const oldLength = newAchievements.length;

        // LOGRO: tasks_1 (INICIADO) - Completa tu primera misión
        const { count: tasksCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: 0 })
            .eq('user_id', userId)
            .eq('is_completed', true);

        if (tasksCount >= 1 && !newAchievements.includes('tasks_1')) {
            newAchievements.push('tasks_1');
            console.log(`🏆 LOGRO DESBLOQUEADO: tasks_1 (INICIADO) para ${userId}`);
        }
        if (tasksCount >= 10 && !newAchievements.includes('tasks_10')) {
            newAchievements.push('tasks_10');
            console.log(`🏆 LOGRO DESBLOQUEADO: tasks_10 (AVENTURERO LOCAL) para ${userId}`);
        }
        if (tasksCount >= 25 && !newAchievements.includes('tasks_25')) {
            newAchievements.push('tasks_25');
            console.log(`🏆 LOGRO DESBLOQUEADO: tasks_25 (HÉROE DE LA COMARCA) para ${userId}`);
        }

        // LOGROS POR CATEGORÍA - Salud
        const { count: saludCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('categoria', 'salud').eq('is_completed', true);
        if (saludCount >= 5 && !newAchievements.includes('salud_5')) {
            newAchievements.push('salud_5');
            console.log(`🏆 LOGRO DESBLOQUEADO: salud_5 (VIGÍA DE LA SALUD) para ${userId}`);
        }

        // LOGROS POR CATEGORÍA - Estudio
        const { count: estudioCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('categoria', 'estudio').eq('is_completed', true);
        if (estudioCount >= 10 && !newAchievements.includes('estudio_10')) {
            newAchievements.push('estudio_10');
            console.log(`🏆 LOGRO DESBLOQUEADO: estudio_10 (ESCRIBA DE MINAS TIRITH) para ${userId}`);
        }

        // --- AÑADIR VERIFICACIÓN PARA LAS CATEGORÍAS RESTANTES ---
        const { count: trabajoCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('categoria', 'trabajo').eq('is_completed', true);
        if (trabajoCount >= 5 && !newAchievements.includes('trabajo_5')) {
            newAchievements.push('trabajo_5');
            console.log(`🏆 LOGRO DESBLOQUEADO: trabajo_5 (MAESTRO LABORAL) para ${userId}`);
        }

        const { count: hogarCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('categoria', 'hogar').eq('is_completed', true);
        if (hogarCount >= 5 && !newAchievements.includes('hogar_5')) {
            newAchievements.push('hogar_5');
            console.log(`🏆 LOGRO DESBLOQUEADO: hogar_5 (GUARDIÁN DEL HOGAR) para ${userId}`);
        }

        const { count: ocioCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('categoria', 'ocio').eq('is_completed', true);
        if (ocioCount >= 5 && !newAchievements.includes('ocio_5')) {
            newAchievements.push('ocio_5');
            console.log(`🏆 LOGRO DESBLOQUEADO: ocio_5 (BUSCADOR DE ALEGRÍA) para ${userId}`);
        }

        // LOGRO: gold_100 (BOLSA DE MONEDAS)
        if (profile.gold >= 100 && !newAchievements.includes('gold_100')) {
            newAchievements.push('gold_100');
            console.log(`🏆 LOGRO DESBLOQUEADO: gold_100 (BOLSA DE MONEDAS) para ${userId}`);
        }
        if (profile.gold >= 500 && !newAchievements.includes('gold_500')) {
            newAchievements.push('gold_500');
            console.log(`🏆 LOGRO DESBLOQUEADO: gold_500 (TESORERO) para ${userId}`);
        }

        // LOGRO: level_10
        if (profile.level >= 10 && !newAchievements.includes('level_10')) {
            newAchievements.push('level_10');
            console.log(`🏆 LOGRO DESBLOQUEADO: level_10 (VETERANO) para ${userId}`);
        }
        if (profile.level >= 50 && !newAchievements.includes('level_50')) {
            newAchievements.push('level_50');
            console.log(`🏆 LOGRO DESBLOQUEADO: level_50 (SAGRADO) para ${userId}`);
        }

        // Actualizar si hay cambios
        if (newAchievements.length > oldLength) {
            await supabase
                .from('profiles')
                .update({ achievements: newAchievements })
                .eq('id', userId);
        }

        return newAchievements;

    } catch (error) {
        console.error("❌ Error al verificar logros:", error.message);
        return [];
    }
}

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
