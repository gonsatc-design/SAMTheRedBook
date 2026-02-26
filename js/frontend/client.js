// --- CONFIGURACIÓN DE ACCESO ---
const SUPABASE_URL = 'https://alehttakkwirudssxaru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZWh0dGFra3dpcnVkc3N4YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTc1OTMsImV4cCI6MjA4NTY5MzU5M30.zLi9AqD1JkIGGLLUmb7bTg5a9ZAK2mFh3Mr_dslcDww';

// --- CONFIGURACIÓN DE RED (AUTO-DETECT) ---
// Si estamos en archivo local (file://), apuntamos a localhost:3000
// Si estamos en servidor (http://), usamos ruta relativa
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

// Inicialización del Cliente
const { createClient } = window.supabase;
const samClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Función Global para Cerrar Sesión (disponible de inmediato)
window.logoutUser = async function (btn) {
    if (!btn) btn = { textContent: '', disabled: false };
    const originalText = btn.textContent;
    btn.textContent = '🚪 Saliendo...';
    btn.disabled = true;
    try {
        await samClient.auth.signOut();
        window.location.href = 'login.html';
    } catch (err) {
        console.error("❌ Error al cerrar sesión:", err);
        btn.disabled = false;
        btn.textContent = originalText;
        alert("No se pudo cerrar la sesión: " + err.message);
    }
};

// Elementos del DOM
const chatInput = document.getElementById('chatInput');
const taskContainer = document.getElementById('taskContainer');
const userStatus = document.getElementById('userStatus') || null;  // Removido del header
const samReplyContainer = document.getElementById('samReplyContainer');
const gandalfModal = document.getElementById('gandalfModal');
const gandalfTaskList = document.getElementById('gandalfTaskList');
const sellarJuicioBtn = document.getElementById('sellarJuicioBtn');
const cerrarJuicioBtn = document.getElementById('cerrarJuicioBtn');
// Elementos del Palantír
const palantirOrb = document.getElementById('palantirOrb');
const palantirAlerta = document.getElementById('palantirAlerta');
const palantirSugerencia = document.getElementById('palantirSugerencia');

// --- RPG HUD ELEMENTS (BLOQUE 0) ---
// NOTA: playerLevel, playerTitle, playerGold fueron movidos del header al PERFIL
const playerLevel = document.getElementById('playerLevel');  // Podría ser null
const playerTitle = document.getElementById('playerTitle');  // Podría ser null
const playerRace = document.getElementById('playerRace');
const raceSelectionModal = document.getElementById('raceSelectionModal');
const raceModalTitle = document.getElementById('raceModalTitle');
const raceModalSubtitle = document.getElementById('raceModalSubtitle');
const changeRaceBtn = document.getElementById('changeRaceBtn');

// === SISTEMA DE XP: MISMA CURVA QUE EL BACKEND ===
function getXPThresholdForLevel(level) {
    if (level <= 5)  return 80;
    if (level <= 15) return 120;
    if (level <= 30) return 160;
    if (level <= 50) return 200;
    if (level <= 70) return 230;
    return 260;
}
function getXPInCurrentLevel(totalXP, currentLevel) {
    let accumulated = 0;
    for (let l = 1; l < currentLevel; l++) accumulated += getXPThresholdForLevel(l);
    return totalXP - accumulated;
}
function getLevelFromXP(totalXP) {
    let level = 1, accumulated = 0;
    while (level < 99) {
        const threshold = getXPThresholdForLevel(level);
        if (accumulated + threshold > totalXP) break;
        accumulated += threshold;
        level++;
    }
    return level;
}
// ==================================================

// --- CONTROL GLOBAL ---
let raceModalShownOnce = false;  // Bandera para mostrar modal solo una vez
let cachedAchievements = null;   // Cache local para evitar re-query con datos viejos

function normalizeRaceClient(race) {
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
    return map[race] || race || null;
}
function displayRace(race) {
    const map = { 'Humano': 'Humanos', 'Elfo': 'Elfos', 'Enano': 'Enanos', 'Hobbit': 'Hobbits' };
    return map[normalizeRaceClient(race)] || race || null;
}

// --- RAID HUD ELEMENTS ---
const raidWidget = document.getElementById('sauronHPContainer');
const sauronHPBar = document.getElementById('sauronHPBar');
const sauronHPText = document.getElementById('sauronHPText');
const bossName = document.getElementById('bossName');
const bossIcon = document.getElementById('bossIcon');
const journeyRaceIcon = document.getElementById('journeyRaceIcon');
const journeyProgressMarker = document.getElementById('journeyProgressMarker');
const battleFeed = document.getElementById('battleFeed');
const fireEventsContainer = document.getElementById('fireEvents');
const playerGold = document.getElementById('playerGold');  // Podría ser null

function getRaceIcon(race) {
    const raceIcons = { 'Humano': '🗡️', 'Elfo': '🏹', 'Enano': '⚒️', 'Hobbit': '🍄' };
    return raceIcons[normalizeRaceClient(race)] || '👤';
}

// --- NAVEGACIÓN Y TABS ---
const navBtns = document.querySelectorAll('.nav-btn');
const chatFooter = document.getElementById('chatFooter');
const profileEmail = document.getElementById('profileEmail');

const containers = {
    journal: document.getElementById('taskContainer'),
    warRoom: document.getElementById('warRoomContainer'),
    profile: document.getElementById('profileContainer'),
    backpack: document.getElementById('backpackContainer'),
    forge: document.getElementById('forgeContainer'),
    achievementsTab: document.getElementById('achievementsTab')
};

// Elementos de la Mochila
const inventoryGrid = document.getElementById('inventoryGrid');
const emptyInventory = document.getElementById('emptyInventory');
const itemDetailModal = document.getElementById('itemDetailModal');
const sendGestaBtn = document.getElementById('sendGestaBtn');

let previousSauronHP = null;
let realtimeChannel = null;
let pendingRaceModalAfterGuide = false;
let pendingGuideStorageKey = null;
let raceSelectionMode = 'onboarding';
const RACE_CHANGE_COST = 1000000;
let journeyEventActive = false;

function autoResizeChatInput() {
    if (!chatInput) return;
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 160)}px`;
}

// --- GESTIÓN DE TOKEN ---
async function obtenerToken() {
    const { data: { session } } = await samClient.auth.getSession();
    if (!session) {
        // userStatus fue removido del header - ahora solo en PERFIL
        return null;
    }
    // userStatus ya no existe - feedback ahora en PERFIL
    return session.access_token;
}

// --- FUNCIÓN DE LOGIN MANUAL ---
window.login = async (email, password) => {
    console.log("🔐 Intentando acceder a la fortaleza...");
    const { data, error } = await samClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) {
        console.error("❌ Error Login:", error.message);
        alert("Error: " + error.message);
    } else {
        console.log("✅ Login correcto. Bienvenido, Comandante.");
        cargarMisiones();
    }
};

// --- FRASES ALEATORIAS MIENTRAS SAM PIENSA ---
const FRASES_SAM = [
    "Afilando la pluma para el Libro Rojo...",
    "Consultando las Memorias de Elrond...",
    "Buscando en los Anales de la Tierra Media...",
    "El destino toma forma en las manos del sabio...",
    "Escudriñando los secretos del futuro...",
    "El Palantír revela su verdad...",
    "Tejiendo el hilo de tu destino...",
    "Las antiguas palabras se despiertan...",
    "El poder del Anillo hace su voluntad...",
    "Compilando tus gestas en el Libro...",
    "Pidiendo consejo a Gandalf...",
    "Los Valar escuchan tu llamada...",
    "La Tierra Media espera tu respuesta...",
];

const FRASES_SIN_MISIONES_ACTIVAS = [
    "Has despejado el frente por ahora. Si aún te queda energía, escribe una gesta pequeña y avanza un paso más hacia el Monte del Destino.",
    "Buen trabajo: no quedan misiones activas en este momento. ¿Quieres cerrar el día aquí o dejar una nueva gesta lista para mañana?",
    "El camino está tranquilo, pero la travesía continúa. Una misión breve ahora puede evitar que la sombra gane terreno después.",
    "Hoy has sostenido la línea con firmeza. Si tienes algo pendiente, conviértelo en gesta y déjalo sellado en el Libro Rojo."
];

function obtenerFraseSamAleatoria() {
    return FRASES_SAM[Math.floor(Math.random() * FRASES_SAM.length)];
}
async function cargarMisiones(mockDate = null) {
    try {
        // Show loading state immediately so we never flash stale "No hay misiones activas"
        taskContainer.innerHTML = `
            <div class="flex items-center justify-center gap-3 text-xs text-amber-500/50 italic p-8 mt-8">
                <svg class="animate-spin h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Consultando el Libro Rojo...</span>
            </div>
        `;
        const token = await obtenerToken();
        if (!token) {
            taskContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center p-6">
                    <div class="text-4xl mb-4">🛡️</div>
                    <h2 class="text-xl text-red-400 mb-2">Acceso Denegado</h2>
                    <p class="text-sm text-slate-400 mb-4">Necesitas el Sello del Rey para leer el libro.</p>
                </div>
            `;
            return;
        }

        const url = mockDate ? `${API_BASE}/api/tasks?mockDate=${mockDate.toISOString()}` : `${API_BASE}/api/tasks`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

        if (res.status === 401) {
            console.error("401: Token vencido");
            return;
        }

        const data = await res.json();

        if (data.success) {
            const nivelSombra = actualizarNivelSombra(data.tasks || []);
            const { tareasPendientesDeJuicio, tareasDeHoy } = separarTareas(data.tasks || []);

            if (tareasPendientesDeJuicio.length > 0) {
                activarJuicioGandalf(tareasPendientesDeJuicio);
            } else {
                chatInput.disabled = false;
                gandalfModal.classList.add('hidden');
                // Saludo dinámico de Sam
                const saludoInicial = nivelSombra > 1
                    ? { reply: "La oscuridad es densa hoy. Debemos actuar." }
                    : { reply: "Listo para la aventura. ¿Qué hazañas nos aguardan hoy?" };
                mostrarRespuestaSam([saludoInicial], true);
            }

            renderizarTareas(tareasDeHoy);
            if (data.activeBuffs) renderActiveBuffs(data.activeBuffs);
        }
    } catch (e) {
        console.error("Error carrgando misiones:", e);
        taskContainer.innerHTML = '<p class="text-red-500 text-center">⚠️ Error de conexión con SAM Server</p>';
    }
}

function esAnteriorAHoy(fecha) {
    const fechaTarea = new Date(fecha);
    const hoy = new Date();
    // Ignoramos la hora, comparamos solo el día
    hoy.setHours(0, 0, 0, 0);
    return fechaTarea < hoy;
}

function separarTareas(tareas) {
    const tareasPendientesDeJuicio = [];
    const tareasDeHoy = [];

    tareas.forEach(tarea => {
        // Una tarea está pendiente de juicio si NO está completada, NO ha sido confirmada como fallida, Y es de un día anterior.
        if (!tarea.is_completed && !tarea.fallo_confirmado && esAnteriorAHoy(tarea.created_at)) {
            tareasPendientesDeJuicio.push(tarea);
        } else {
            tareasDeHoy.push(tarea);
        }
    });
    return { tareasPendientesDeJuicio, tareasDeHoy };
}

// --- NOTIFICACIONES (TOAST) ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'sam-toast';

    let icon = 'ℹ️';
    if (type === 'success') icon = '✨';
    if (type === 'error') icon = '💀';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 🎁 MOSTRAR RECOMPENSAS AL COMPLETAR TAREAS
function mostrarRecompensas(rewards) {
    if (!rewards || rewards.length === 0) return;

    const container = document.getElementById('toastContainer');
    const rewardsDiv = document.createElement('div');
    rewardsDiv.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-0 translate-y-3 transition-all duration-300';

    const rarityColors = {
        'Común': 'from-slate-700/90 to-slate-800/90 border-slate-500/60',
        'Raro': 'from-blue-700/90 to-blue-900/90 border-blue-400/60',
        'Legendario': 'from-amber-700/90 to-orange-900/90 border-amber-300/70'
    };

    const rarityIcons = {
        'Común': '⚪',
        'Raro': '🔷',
        'Legendario': '✨'
    };

    let html = `
    <div class="bg-slate-950/90 backdrop-blur-xl rounded-xl border border-amber-700/50 p-3 w-[290px] shadow-2xl pointer-events-auto">
        <h2 class="text-sm font-black text-amber-300 tracking-wide mb-2">BOTÍN RECIBIDO</h2>
        <div class="space-y-2">
    `;

    rewards.forEach((reward, i) => {
        // Validación: si no tiene rarity, asignar 'Común' por defecto
        const rarity = reward.rarity || 'Común';
        const colorGradient = rarityColors[rarity] || rarityColors['Común'];
        const rarityIcon = rarityIcons[rarity] || '⚪';
        const itemName = reward.item_name || 'Misterio Desconocido';

        html += `
        <div class="bg-gradient-to-r ${colorGradient} rounded-lg p-2 border">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-base">${rarityIcon}</span>
                    <div>
                        <p class="font-bold text-white text-xs leading-tight">${itemName}</p>
                        <p class="text-[10px] text-white/70">${rarity}</p>
                    </div>
                </div>
                <span class="text-xs font-bold text-white/90">+1</span>
            </div>
        </div>
        `;
    });

    // Añadir oro si existe
    const totalGold = rewards.reduce((sum, r) => sum + (r.gold || 0), 0);
    if (totalGold > 0) {
        html += `
        <div class="bg-gradient-to-r from-yellow-800/90 to-amber-900/90 rounded-lg p-2 border border-yellow-500/60">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-base">💰</span>
                    <div>
                        <p class="font-bold text-yellow-100 text-xs">Oro</p>
                        <p class="text-[10px] text-yellow-200/70">Recompensa</p>
                    </div>
                </div>
                <span class="text-xs font-bold text-yellow-300">+${totalGold}</span>
            </div>
        </div>
        `;
    }

    html += `
        </div>
    </div>
    `;

    rewardsDiv.innerHTML = html;
    container.appendChild(rewardsDiv);

    requestAnimationFrame(() => {
        rewardsDiv.classList.remove('opacity-0', 'translate-y-2');
    });

    // Mostrar breve y desaparecer rápido
    setTimeout(() => {
        rewardsDiv.classList.add('opacity-0', 'translate-y-3');
        setTimeout(() => rewardsDiv.remove(), 300);
    }, 1800);
}

function actualizarNivelSombra(tareas) {
    const totalEnemigos = tareas.reduce((sum, tarea) => {
        const horda = tarea.horda || { exploradores: 0, orcos: 0, urukhai: 0 };
        return sum + horda.exploradores + horda.orcos + horda.urukhai;
    }, 0);

    const body = document.body;
    body.classList.remove('shadow-level-1', 'shadow-level-2', 'shadow-level-3', 'shadow-vignette');

    let nivelSombra = 0;
    if (totalEnemigos >= 1 && totalEnemigos <= 5) {
        body.classList.add('shadow-level-1');
        body.classList.remove('warm-mode'); // Se enfría el ambiente
        nivelSombra = 1;
    } else if (totalEnemigos >= 6 && totalEnemigos <= 15) {
        body.classList.add('shadow-level-2');
        body.classList.remove('warm-mode');
        nivelSombra = 2;
    } else if (totalEnemigos > 15) {
        body.classList.add('shadow-level-3');
        body.classList.add('shadow-vignette');
        body.classList.remove('warm-mode');
        nivelSombra = 3;
    } else {
        // Estado Sano: Ambiente Cálido
        body.classList.add('warm-mode');
    }
    return nivelSombra; // Devolvemos el nivel para el saludo de Sam
}

function renderizarTareas(tareas) {
    taskContainer.innerHTML = '';

    if (!tareas || tareas.length === 0) {
        taskContainer.innerHTML += `
            <div class="text-center mt-20 opacity-50">
                <p class="text-4xl mb-2">📜</p>
                <p class="italic">"El camino está despejado por ahora..."</p>
            </div>`;
        return;
    }

    const activas = tareas.filter(t => !t.fallo_confirmado && !t.is_completed);
    const completadas = tareas.filter(t => t.is_completed);
    const fallidas = tareas.filter(t => t.fallo_confirmado);

    console.log('📋 SEPARACIÓN DE TAREAS:');
    console.log('Activas:', activas.length);
    console.log('Completadas:', completadas.length);
    console.log('Fallidas:', fallidas.length);

    // 2. RENDERIZAR ACTIVAS (LISTA LIMPIA, SIN TARJETAS ANIDADAS)
    if (activas.length > 0) {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = "px-1 pb-2";
        sectionTitle.innerHTML = `<p class="text-[11px] uppercase tracking-[0.18em] text-amber-500/70 font-bold">Misiones activas (${activas.length})</p>`;
        taskContainer.appendChild(sectionTitle);

        activas.forEach(tarea => {
            taskContainer.appendChild(crearTarjeta(tarea));
        });
    }

    if (activas.length === 0) {
        const noActiveMsg = document.createElement('div');
        const frase = FRASES_SIN_MISIONES_ACTIVAS[Math.floor(Math.random() * FRASES_SIN_MISIONES_ACTIVAS.length)];
        noActiveMsg.className = "mx-1 mb-4 rounded-lg border border-amber-800/40 bg-amber-950/20 p-4";
        noActiveMsg.innerHTML = `
            <p class="text-[11px] uppercase tracking-[0.16em] text-amber-400 font-bold mb-2">No hay misiones activas</p>
            <p class="text-sm text-amber-100/85 leading-relaxed">${frase}</p>
        `;
        taskContainer.appendChild(noActiveMsg);
    }

    // 3. RENDERIZAR HISTORIAL DE HAZAÑAS (COMPLETADAS)
    if (completadas.length > 0) {
        const historial = document.createElement('div');
        historial.className = "mt-8 mb-4 mx-2";
        historial.innerHTML = `
            <div class="p-3 bg-green-950/30 rounded border border-green-900/50 cursor-pointer hover:bg-green-900/20 transition-colors flex justify-between items-center" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <div class="flex items-center gap-2 text-green-400">
                    <span>⚔️</span> <span class="font-bold tracking-widest text-xs">HISTORIAL DE HAZAÑAS (${completadas.length})</span>
                </div>
                <span class="text-[10px] text-green-500">▼</span>
            </div>
            <div class="historial-content hidden pl-2 border-l-2 border-green-900/20 mt-2 space-y-2">
            </div>
        `;

        const content = historial.querySelector('.historial-content');

        // Agrupar completadas por categoría
        const categorias = {};
        completadas.forEach(t => {
            const cat = t.categoria || 'otros';
            if (!categorias[cat]) categorias[cat] = [];
            categorias[cat].push(t);
        });

        // Renderizar por categoría con desplegables
        Object.keys(categorias).forEach(cat => {
            const catSection = document.createElement('div');
            catSection.className = "mb-3";
            catSection.innerHTML = `
                <div class="p-2 bg-green-900/20 rounded border border-green-900/30 cursor-pointer hover:bg-green-900/30 transition-colors flex justify-between items-center" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <span class="text-green-300 font-bold uppercase text-xs tracking-wide">${cat}</span>
                    <span class="text-[10px] text-green-400 bg-green-900/50 px-2 py-0.5 rounded-full">${categorias[cat].length}</span>
                </div>
                <div class="cat-tasks-list hidden mt-2 space-y-1 pl-3">
                </div>
            `;

            const catContent = catSection.querySelector('.cat-tasks-list');

            // Renderizar tareas como lista simple
            categorias[cat].forEach(tarea => {
                const horda = tarea.horda || { exploradores: 0, orcos: 0, urukhai: 0 };
                const item = document.createElement('div');
                item.className = "text-sm text-green-200/80 py-1 border-l-2 border-green-800/30 pl-2 mb-2";

                // Construir información de enemigos derrotados
                const enemiesInfo = [];
                if (horda.exploradores > 0) enemiesInfo.push(`🏹 ${horda.exploradores} Exploradores`);
                if (horda.orcos > 0) enemiesInfo.push(`🗡️ ${horda.orcos} Orcos`);
                if (horda.urukhai > 0) enemiesInfo.push(`⚫ ${horda.urukhai} Uruk-hai`);

                item.innerHTML = `
                    <div class="font-semibold text-green-100">✓ ${tarea.titulo_epico}</div>
                    ${tarea.descripcion ? `<div class="text-xs text-green-300/60 italic mt-0.5">"${tarea.descripcion}"</div>` : ''}
                    ${enemiesInfo.length > 0 ? `<div class="text-xs text-green-400/70 mt-1">${enemiesInfo.join(' • ')}</div>` : ''}
                `;
                catContent.appendChild(item);
            });

            content.appendChild(catSection);
        });

        taskContainer.appendChild(historial);
    }

    // 4. RENDERIZAR CEMENTERIO (FALLIDAS AGRUPADAS CON NARRATIVA)
    if (fallidas.length > 0) {
        const graveyard = document.createElement('div');
        graveyard.className = "mt-8 mb-4 mx-2";
        graveyard.innerHTML = `
            <div class="p-3 bg-red-950/30 rounded border border-red-900/50 cursor-pointer hover:bg-red-900/20 transition-colors flex justify-between items-center" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <div class="flex items-center gap-2 text-red-400">
                        <span>💀</span> <span class="font-bold tracking-widest text-xs">CEMENTERIO DE GESTAS (${fallidas.length})</span>
                </div>
                <span class="text-[10px] text-red-500">▼</span>
            </div>
            <div class="graveyard-content hidden pl-2 border-l-2 border-red-900/20 mt-2 space-y-2">
            </div>
        `;

        const content = graveyard.querySelector('.graveyard-content');

        // Agrupar fallidas para narrativa por categoría
        const resumenFallos = {}; // cat -> {count, tareas: [], enemies}

        fallidas.forEach(tarea => {
            const cat = tarea.categoria || 'otros';
            if (!resumenFallos[cat]) resumenFallos[cat] = { count: 0, tareas: [], exploradores: 0, orcos: 0, urukhai: 0 };
            resumenFallos[cat].count++;
            resumenFallos[cat].tareas.push(tarea);
            const h = tarea.horda || { exploradores: 0, orcos: 0, urukhai: 0 };
            resumenFallos[cat].exploradores += h.exploradores;
            resumenFallos[cat].orcos += h.orcos;
            resumenFallos[cat].urukhai += h.urukhai;
        });

        // Crear mensajes narrativos por categoría (SIN tarjetas individuales)
        Object.keys(resumenFallos).forEach(cat => {
            const data = resumenFallos[cat];
            const enemiesText = [];
            if (data.exploradores > 0) enemiesText.push(`<span class="text-green-400 font-bold">${data.exploradores} Exploradores</span>`);
            if (data.orcos > 0) enemiesText.push(`<span class="text-orange-400 font-bold">${data.orcos} Orcos</span>`);
            if (data.urukhai > 0) enemiesText.push(`<span class="text-red-400 font-bold">${data.urukhai} Uruk-hai</span>`);

            // Crear mensaje narrativo detallado
            const narrative = document.createElement('div');
            narrative.className = "text-sm text-red-300 mb-3 bg-black/40 p-3 rounded border-l-4 border-red-900";

            let mensaje = `<div class="flex items-center gap-2 mb-2"><span class="text-red-500 text-lg">⚠️</span><strong class="text-red-400 uppercase tracking-wide">Frente ${cat}</strong></div>`;
            mensaje += `<p class="text-xs text-red-200/80 mb-2">Has abandonado <strong>${data.count}</strong> ${data.count === 1 ? 'gesta' : 'gestas'} en este frente.</p>`;

            if (enemiesText.length > 0) {
                mensaje += `<p class="text-xs italic text-red-300/70">Las fuerzas de la oscuridad han crecido: ${enemiesText.join(', ')} han atravesado las brechas en tu defensa.</p>`;
            } else {
                mensaje += `<p class="text-xs italic text-red-300/70">Aunque no hay enemigos visibles aún, la sombra se extiende...</p>`;
            }

            narrative.innerHTML = mensaje;
            content.appendChild(narrative);
        });

        taskContainer.appendChild(graveyard);
    }
}

function crearTarjeta(tarea, ocultarBotones = false) {
    const card = document.createElement('div');
    const esFallida = tarea.fallo_confirmado === true;

    card.className = `bg-slate-900/90 px-4 py-3 rounded-lg border shadow-lg task-card mb-3 ${esFallida ? 'task-card-failed opacity-60 grayscale-[0.3] border-red-900/60' : 'border-slate-700 hover:bg-slate-800/80 transition-colors'}`;
    card.dataset.taskId = tarea.id;

    const descripcion = tarea.descripcion || "Una gesta que requiere valor...";
    const categoria = (tarea.categoria || 'otros').toUpperCase();

    card.innerHTML = `
        <div class="flex items-start justify-between gap-2 mb-2">
            <h3 class="task-title text-amber-100 ${esFallida ? 'line-through text-slate-500' : ''}">${tarea.titulo_epico}</h3>
            <span class="text-[9px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold tracking-wide shrink-0">${categoria}</span>
        </div>

        <p class="task-desc text-amber-200/85 mb-2">${descripcion}</p>
        ${!esFallida && tarea.sam_phrase ? `<p class="text-[12px] italic text-amber-300/80 mb-3">"${tarea.sam_phrase}"</p>` : ''}

        ${!esFallida && !ocultarBotones ? `
        <div class="grid grid-cols-2 gap-2 mt-1">
            <button onclick="juicioGandalf('${tarea.id}', 'exito')" class="h-11 bg-emerald-900/25 hover:bg-emerald-800/35 text-emerald-300 hover:text-emerald-200 text-sm font-bold rounded border border-emerald-900/60 transition-all flex items-center justify-center gap-2">
                <span>✅</span><span>CUMPLIDA</span>
            </button>
            <button onclick="juicioGandalf('${tarea.id}', 'fracaso')" class="h-11 bg-red-900/25 hover:bg-red-800/35 text-red-300 hover:text-red-200 text-sm font-bold rounded border border-red-900/60 transition-all flex items-center justify-center gap-2">
                <span>🔥</span><span>CAÍDA</span>
            </button>
        </div>
        ` : `
        <div class="text-xs font-bold ${esFallida ? 'text-red-400' : 'text-green-400'}">
            ${esFallida ? 'Misión fallida' : 'Misión resuelta'}
        </div>
        `}
    `;
    return card;
}

function mostrarRespuestaSam(mensajes, esSaludo = false) {
    // Si es un saludo, no limpiamos. Si es una respuesta, sí.
    if (!esSaludo) {
        samReplyContainer.innerHTML = '';
    }
    // Si el panel está vacío y es un saludo, lo mostramos.
    if (esSaludo && samReplyContainer.innerHTML !== '') return;

    mensajes.forEach(msg => {
        const p = document.createElement('p');
        p.className = "text-amber-200 text-sm italic text-center";
        p.innerHTML = `"${msg.reply}"`;
        samReplyContainer.appendChild(p);
    });
}

// --- LÓGICA DEL PALANTÍR ---
async function consultarPalantir() {
    const token = await obtenerToken();
    if (!token) return;

    const { data: { user } } = await samClient.auth.getUser();
    const userId = user?.id || 'anon';

    // 1. Chequeo de Caché (1 Hora)
    const cacheKey = `palantir_prediction_${userId}`;
    const cacheTimeKey = `palantir_timestamp_${userId}`;
    const cachedPrediction = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const ONE_HOUR = 60 * 60 * 1000;

    if (cachedPrediction && cachedTime) {
        const now = new Date().getTime();
        if (now - parseInt(cachedTime) < ONE_HOUR) {
            console.log("🔮 Palantír: Usando visión retenida (Caché).");
            actualizarPalantir(JSON.parse(cachedPrediction));
            return;
        }
    }

    // 2. Consulta a la API
    try {
        const res = await fetch(`${API_BASE}/api/palantir/predict`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.prediction) {
            // Guardamos en caché
            localStorage.setItem(cacheKey, JSON.stringify(data.prediction));
            localStorage.setItem(cacheTimeKey, new Date().getTime().toString());

            actualizarPalantir(data.prediction);
        }
    } catch (err) {
        console.error("El Palantír está nublado:", err);
    }
}

function actualizarPalantir(prediction) {
    const { probabilidad_fallo, alerta, sugerencia } = prediction;

    // Textos por defecto si la IA viene vacía
    const textoAlerta = alerta || "Sin presagios...";
    const textoSugerencia = sugerencia || "El futuro es incierto.";

    // MEJORA: Mejorar descripción del Palantír
    const riesgoTexto = probabilidad_fallo <= 30
        ? "BAJO RIESGO - Las probabilidades están a tu favor"
        : probabilidad_fallo <= 70
            ? "RIESGO MODERADO - Procede con cautela"
            : "ALTO RIESGO - Se aproxima la tormenta";

    // Actualizar textos
    palantirAlerta.textContent = riesgoTexto;
    palantirSugerencia.textContent = `"${textoSugerencia}"`;

    // NUEVO: Actualizar barra de riesgo en el Palantír del Mapa
    const riskFill = document.getElementById('palantirRiskFill');
    const riskPercent = document.getElementById('palantirRiskPercent');
    const radarTexto = document.getElementById('palantirRadarTexto');

    if (riskFill && riskPercent) {
        riskFill.style.width = `${Math.min(100, probabilidad_fallo)}%`;
        riskPercent.textContent = Math.round(probabilidad_fallo);
        radarTexto.textContent = riesgoTexto;
    }

    // Frase en el Mapa (Radar) con contexto mejorado
    const radarFrase = document.getElementById('palantirRadarFrase');
    if (radarFrase) {
        radarFrase.innerHTML = `
            <div style="padding: 8px;">
                <div style="font-weight: bold; color: #fbbf24; margin-bottom: 6px;">🔮 PREDICCIÓN PALANTÍR</div>
                <div style="margin-bottom: 8px;">
                    <div style="font-size: 0.85em; margin-bottom: 4px;">Probabilidad de Peligro:</div>
                    <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
                        <div style="height: 100%; width: ${Math.min(100, probabilidad_fallo)}%; background: linear-gradient(90deg, #3b82f6, #fbbf24, #ef4444); transition: width 0.5s ease; border-radius: 3px;"></div>
                    </div>
                    <div style="font-size: 0.75em; color: #94a3b8; margin-top: 2px;">${Math.round(probabilidad_fallo)}%</div>
                </div>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                <div style="font-style: italic; opacity: 0.9; font-size: 0.9em; margin-bottom: 4px;">Presagio:</div>
                <div style="font-size: 0.85em; color: #e2e8f0;">${riesgoTexto}</div>
            </div>
        `;
    }

    // Resetear clases
    palantirOrb.className = "w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center cursor-pointer palantir-orb transition-all duration-1000 text-xl";

    // Determinar nivel de peligro con mejor visual
    if (probabilidad_fallo <= 30) {
        palantirOrb.classList.add('bg-blue-500');
        palantirOrb.style.animationName = 'glow-blue';
        palantirOrb.innerHTML = '✅'; // Verde = seguro
    } else if (probabilidad_fallo <= 70) {
        palantirOrb.classList.add('bg-amber-500');
        palantirOrb.style.animationName = 'glow-amber';
        palantirOrb.innerHTML = '⚠️'; // Amarillo = cuidado
    } else {
        palantirOrb.classList.add('bg-red-600');
        palantirOrb.style.animationName = 'glow-red';
        palantirOrb.innerHTML = '🔥'; // Rojo = peligro
    }
}

// --- ENVIAR NUEVA MISIÓN ---
async function enviarChat() {
    const text = chatInput.value;
    if (!text.trim()) return;

    chatInput.value = '';
    autoResizeChatInput();
    const token = await obtenerToken();

    if (!token) {
        alert("⚠️ ¡Alto ahí! Identifícate primero.");
        return;
    }

    const tempMsg = document.createElement('div');
    tempMsg.className = "flex items-center justify-center gap-3 text-xs text-amber-500/50 italic p-2";
    tempMsg.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>${obtenerFraseSamAleatoria()}</span>
    `;
    taskContainer.prepend(tempMsg);

    try {
        const res = await fetch(`${API_BASE}/api/briefing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userInput: text })
        });

        const data = await res.json();
        tempMsg.remove(); // Quitamos el mensaje de "enviando..."

        if (data.success && data.mensajes) {
            showToast("¡Gesta Registrada!", "success");
            mostrarRespuestaSam(data.mensajes);
            // Esperamos un poco a que el usuario lea el mensaje antes de recargar
            setTimeout(() => {
                cargarMisiones();
            }, 2000); // 2 segundos de respiro
        } else {
            // Si falla, mostramos el error que pueda venir del backend
            const errorMsg = data.error || "La respuesta de Sam se perdió entre las sombras... pero los Hobbits no se rinden. ¡El Libro Rojo sigue en pie! Prueba de nuevo, ¡la gesta te espera!";
            mostrarRespuestaSam([{ reply: errorMsg }]);
        }
    } catch (err) {
        console.error(err);
        tempMsg.innerHTML = `
            <div class="text-center p-3">
                <p class="text-sm font-bold text-red-400 mb-1">⚔️ Sam no pudo conectar con el servidor</p>
                <p class="text-xs text-slate-400 leading-relaxed">El servidor puede estar despertando de su descanso. Los grandes héroes no se rinden ante el primer obstáculo: <span class="text-amber-400 font-bold">¡vuelve a intentarlo en unos segundos!</span></p>
            </div>
        `;
        tempMsg.className = "text-center";
    }
}

// --- LÓGICA DEL JUICIO DE GANDALF ---
let juiciosPendientes = {}; // { 'task-id': 'exito' | 'fracaso' }

function activarJuicioGandalf(tareas) {
    console.log("¡Gandalf interrumpe! Tareas pendientes de juicio:", tareas);
    chatInput.disabled = true;
    chatInput.placeholder = "Debes resolver los asuntos pendientes...";
    gandalfModal.classList.remove('hidden');
    gandalfTaskList.innerHTML = '';
    juiciosPendientes = {};

    tareas.forEach(tarea => {
        const div = document.createElement('div');
        div.className = "p-3 bg-amber-100/60 rounded-md";
        div.innerHTML = `
            <p class="font-bold text-amber-950 text-sm leading-snug mb-2">${tarea.titulo_epico}</p>
            <div class="flex gap-2" data-task-id="${tarea.id}">
                <button class="gandalf-choice-btn flex-1 bg-green-800 text-white px-3 py-2 rounded font-bold text-xs transition-all duration-200" data-verdict="exito">⚔️ Éxito</button>
                <button class="gandalf-choice-btn flex-1 bg-red-900 text-white px-3 py-2 rounded font-bold text-xs transition-all duration-200" data-verdict="fracaso">💀 Fracaso</button>
            </div>
        `;
        gandalfTaskList.appendChild(div);
    });
}

gandalfTaskList.addEventListener('click', (e) => {
    if (e.target.classList.contains('gandalf-choice-btn')) {
        const taskId = e.target.parentElement.dataset.taskId;
        const verdict = e.target.dataset.verdict;
        juiciosPendientes[taskId] = verdict;

        // Feedback visual: seleccionado brilla, el otro se atenúa
        e.target.parentElement.querySelectorAll('.gandalf-choice-btn').forEach(btn => {
            if (btn === e.target) {
                btn.classList.remove('opacity-30', 'scale-95');
                btn.classList.add('ring-2', 'ring-white', 'scale-105', 'shadow-lg', 'brightness-125');
            } else {
                btn.classList.remove('ring-2', 'ring-white', 'scale-105', 'shadow-lg', 'brightness-125');
                btn.classList.add('opacity-30', 'scale-95');
            }
        });
    }
});

sellarJuicioBtn.addEventListener('click', async () => {
    const successIds = Object.keys(juiciosPendientes).filter(id => juiciosPendientes[id] === 'exito');
    const failureIds = Object.keys(juiciosPendientes).filter(id => juiciosPendientes[id] === 'fracaso');

    if (successIds.length === 0 && failureIds.length === 0) {
        alert("Debes emitir un juicio para cada asunto pendiente.");
        return;
    }

    const token = await obtenerToken();
    if (!token) return;

    // Bloquear toda la UI del juicio mientras procesa
    sellarJuicioBtn.disabled = true;
    sellarJuicioBtn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sellando el Juicio...
        </span>`;
    document.querySelectorAll('.gandalf-choice-btn').forEach(b => b.disabled = true);
    if (cerrarJuicioBtn) cerrarJuicioBtn.disabled = true;

    try {
        await fetch(`${API_BASE}/api/gandalf/judge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ successIds, failureIds })
        });
        triggerJourneyRealtimeBurst();
        gandalfModal.classList.add('hidden');
        chatInput.disabled = false;
        chatInput.placeholder = "Escribe tu gesta aquí...";
        autoResizeChatInput();
        cargarMisiones();
    } catch (err) {
        console.error("Error al sellar el juicio:", err);
        // Restaurar botón si falla
        sellarJuicioBtn.disabled = false;
        sellarJuicioBtn.innerHTML = 'Sellar el Juicio';
        document.querySelectorAll('.gandalf-choice-btn').forEach(b => b.disabled = false);
        if (cerrarJuicioBtn) cerrarJuicioBtn.disabled = false;
    }
});


// Cerrar el recordatorio sin resolver (el usuario lo hará desde las tarjetas)
if (cerrarJuicioBtn) {
    cerrarJuicioBtn.addEventListener('click', () => {
        gandalfModal.classList.add('hidden');
        chatInput.disabled = false;
        chatInput.placeholder = "Escribe tu gesta aquí...";
        autoResizeChatInput();
    });
}

// --- JUICIO DE GANDALF (ACTUALIZADO) ---
window.juicioGandalf = async (id, veredicto) => {
    const token = await obtenerToken();
    if (!token) return;

    // FIX: Removed spaces in selector causing SyntaxError
    const cardElement = document.querySelector(`[data-task-id="${id}"]`);

    // 1. Feedback Visual Inmediato (Optimista)
    if (cardElement) {
        // Deshabilitar botones para evitar doble click
        const btns = cardElement.querySelectorAll('button');
        btns.forEach(b => b.disabled = true);

        // Crear mensaje inline en la tarjeta
        const inlineToast = document.createElement('div');
        inlineToast.className = veredicto === 'exito'
            ? 'absolute inset-0 bg-green-900/90 rounded-lg flex items-center justify-center text-green-200 font-bold text-lg z-10 animate-pulse'
            : 'absolute inset-0 bg-red-900/90 rounded-lg flex items-center justify-center text-red-200 font-bold text-lg z-10 animate-pulse';
        inlineToast.innerHTML = veredicto === 'exito' ? '✨ ¡Gesta Cumplida! ✨' : '💀 La Sombra avanza... 💀';

        cardElement.style.position = 'relative';
        cardElement.appendChild(inlineToast);

        // Mostrar mensaje inline por 500ms antes de fade out
        setTimeout(() => {
            cardElement.style.transition = 'all 0.5s';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.95)';

            // IMPORTANTE: Remover la tarjeta del DOM después del fade out
            setTimeout(() => {
                if (cardElement && cardElement.parentNode) {
                    const parentGroup = cardElement.parentNode;
                    cardElement.remove();

                    // Si el grupo se queda vacío, eliminarlo también
                    if (parentGroup.classList.contains('category-group') && parentGroup.querySelectorAll('.task-card').length === 0) {
                        parentGroup.remove();
                    }
                }
            }, 500); // Esperar a que termine la transición CSS
        }, 500);
    }

    const body = veredicto === 'exito' ? { successIds: [id] } : { failureIds: [id] };

    try {
        // 2. Llamada al Backend
        const res = await fetch(`${API_BASE}/api/gandalf/judge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const respuesta = await res.json();
            triggerJourneyRealtimeBurst();

            // 3. Si es éxito, mostrar recompensas y actualizar UI
            if (veredicto === 'exito') {
                if (respuesta.rewards && respuesta.rewards.length > 0) {
                    mostrarRecompensas(respuesta.rewards);
                }
                // Actualizar UI con el nuevo XP y nivel
                if (respuesta.updatedXP !== undefined && respuesta.updatedLevel !== undefined) {
                    actualizarUIConNuevosDatos(respuesta.updatedXP, respuesta.updatedLevel);
                }
            }

            // Recargar la lista y perfil después del fade out (1500ms total)
            setTimeout(async () => {
                await cargarMisiones();
                // Si el backend ya devolvió los achievements actualizados, usarlos directamente
                // para evitar race condition (el backend los calcula async)
                if (respuesta.newAchievements !== undefined && respuesta.newAchievements !== null) {
                    renderDedicatedAchievements(respuesta.newAchievements);
                } else {
                    renderDedicatedAchievements();
                }
            }, 1500);
        } else {
            console.error("Fallo del Juicio en el backend.");
            if (cardElement) {
                cardElement.style.opacity = '1';
                cardElement.style.transform = 'scale(1)';
            }
            showToast("Error al registrar el juicio.", "error");
        }
    } catch (err) {
        console.error("Error en el juicio:", err);
        if (cardElement) {
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'scale(1)';
        }
        showToast("Error de conexión.", "error");
    }
};

// --- PANEL DE DESARROLLADOR ---
const devPanel = document.getElementById('devPanel');
const daysOffsetInput = document.getElementById('daysOffset');
const timeTravelBtn = document.getElementById('timeTravelBtn');

// Activamos el panel si la URL contiene ?dev=true
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('dev') === 'true') {
    devPanel.classList.remove('hidden');
}

timeTravelBtn.addEventListener('click', () => {
    const offset = parseInt(daysOffsetInput.value, 10);
    const mockDate = new Date();
    mockDate.setDate(mockDate.getDate() + offset);

    console.log(`⏳ Viajando en el tiempo a: ${mockDate.toLocaleDateString()} `);
    cargarMisiones(mockDate);
});

// --- BLOQUE 0: LÓGICA DE RPG Y MUNDO ---

async function actualizarPerfilUsuario() {
    const token = await obtenerToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const p = data.profile;
            const guideKey = p.id ? `guide_seen_${p.id}` : null;
            const hasSeenGuide = guideKey ? localStorage.getItem(guideKey) === '1' : false;

            // Si no tiene raza: guía primero, luego selección de raza
            if (!p.race && raceSelectionModal) {
                if (!hasSeenGuide) {
                    pendingRaceModalAfterGuide = true;
                    pendingGuideStorageKey = guideKey;
                    raceSelectionModal.classList.add('hidden');
                    window.showGuide(true);
                } else if (!raceModalShownOnce) {
                    raceModalShownOnce = true;
                    openRaceSelectionModal('onboarding');
                }
            } else if (p.race && raceSelectionModal) {
                // Si ya tiene raza, asegurarse de que el modal esté oculto
                raceSelectionModal.classList.add('hidden');
                raceModalShownOnce = true;  // Marcar que ya no se debe mostrar
            }

            // Actualizar HUD
            const computedLevel = getLevelFromXP(p.experience);
            if (playerLevel) playerLevel.innerText = `NIVEL ${computedLevel}`;
            if (playerTitle) playerTitle.innerText = p.race_title || 'Aventurero/a';
            if (document.getElementById('playerRace')) document.getElementById('playerRace').innerText = displayRace(p.race) || 'Sin Raza';
            if (playerGold) playerGold.innerText = `💰 ${p.gold.toLocaleString()} Oro`;

            // Actualizar Barra de XP (curva progresiva)
            const playerXPBar = document.getElementById('playerXPBar');
            if (playerXPBar) {
                const xpCurrentLevel = getXPInCurrentLevel(p.experience, computedLevel);
                const xpNeeded = getXPThresholdForLevel(computedLevel);
                playerXPBar.style.width = `${Math.min(100, (xpCurrentLevel / xpNeeded) * 100)}%`;
            }

            // Icono de raza en perfil
            const profileRaceIcon = document.getElementById('profileRaceIcon');
            if (profileRaceIcon) profileRaceIcon.innerText = getRaceIcon(p.race);
            if (journeyRaceIcon) journeyRaceIcon.innerText = getRaceIcon(p.race);

            // Cargar logros desbloqueados (pasamos las llaves si es un objeto)
            const unlockedIds = Array.isArray(p.achievements) ? p.achievements : Object.keys(p.achievements || {});
            cargarLogrosUsuario(unlockedIds);

            // ⭐ TAMBIÉN actualizar el panel PERFIL si está visible
            const profileBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.dataset.target === 'profile');
            if (profileBtn && profileBtn.classList.contains('text-yellow-400')) {
                await loadProfile();  // Recargar datos del PERFIL
            }
        }
    } catch (e) {
        console.error("Error al cargar perfil RPG:", e);
    }
}

function cargarLogrosUsuario(unlockedIds) {
    const container = document.getElementById('profileAchievements');
    const countLabel = document.getElementById('achievementsCount');
    if (!container) return;

    // Expandimos el mock de logros para el perfil con info de obtención
    const mockLogros = [
        { id: 'tasks_1', name: 'Primer Paso', icon: '🦶', desc: 'Completa tu primera misión', target: 1, category: 'tasks' },
        { id: 'tasks_10', name: 'Aventurero/a Local', icon: '📜', desc: 'Completa 10 misiones', target: 10, category: 'tasks' },
        { id: 'tasks_25', name: 'Héroe/Heroína de la Comarca', icon: '🍺', desc: 'Completa 25 misiones', target: 25, category: 'tasks' },
        { id: 'salud_5', name: 'Vigía de la Salud', icon: '💚', desc: 'Completa 5 misiones de Salud', target: 5, category: 'salud' },
        { id: 'estudio_10', name: 'Escriba de Minas Tirith', icon: '📖', desc: 'Completa 10 misiones de Estudio', target: 10, category: 'estudio' },
        { id: 'damage_1k', name: 'Pequeña Espina', icon: '🗡️', desc: 'Inflige 1,000 de daño a Sauron', target: 1000, category: 'damage' },
        { id: 'gold_100', name: 'Bolsa de Monedas', icon: '💰', desc: 'Acumula 100 de oro', target: 100, category: 'gold' }
    ];

    // Cargar progreso real del servidor
    obtenerToken().then(token => {
        fetch(`${API_BASE}/api/achievements/progress`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const progress = data.achievements.progress || {};

                    container.innerHTML = mockLogros.map(l => {
                        const isUnlocked = unlockedIds.includes(l.id);
                        const tooltip = `${l.name}: ${l.desc}`;

                        // Obtener progreso real
                        const prog = progress[l.id] || { current: 0, target: l.target };
                        const progressText = isUnlocked ? '✓' : `${prog.current}/${prog.target}`;

                        return `
                        <div class="achievement-pill ${isUnlocked ? 'bg-amber-600 border-2 border-amber-400' : 'bg-slate-800 opacity-50'} flex flex-col items-center gap-1 cursor-help p-2 rounded" title="${tooltip}">
                            <span class="text-lg">${isUnlocked ? l.icon : '🔒'}</span>
                            <span class="text-[8px] font-bold text-black text-center leading-tight">${l.name}</span>
                            <span class="text-[7px] text-black font-semibold">${progressText}</span>
                        </div>
                    `;
                    }).join('');

                    if (countLabel) countLabel.innerText = `${unlockedIds.length}/${mockLogros.length}`;
                }
            })
            .catch(e => console.error("Error al cargar progreso de logros:", e));
    });
}

async function seleccionarRaza(raza) {
    const token = await obtenerToken();
    if (!token) return;

    try {
        const endpoint = raceSelectionMode === 'change'
            ? `${API_BASE}/api/profile/change-race`
            : `${API_BASE}/api/profile/select-race`;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ race: raza })
        });
        if (!res.ok) {
            throw new Error(`No se pudo guardar la raza (${res.status})`);
        }

        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            raceSelectionModal.classList.add('hidden');
            raceSelectionMode = 'onboarding';
            await actualizarPerfilUsuario();
            await loadProfile();
        } else {
            showToast(data.error || "No se pudo cambiar la raza.", "error");
        }
    } catch (e) {
        console.error("Error al seleccionar raza:", e);
        showToast("Error al elegir tu destino.", "error");
    }
}

function openRaceSelectionModal(mode = 'onboarding') {
    raceSelectionMode = mode;
    if (!raceSelectionModal) return;

    if (mode === 'change') {
        if (raceModalTitle) raceModalTitle.innerText = 'RITO DE TRANSFIGURACIÓN';
        if (raceModalSubtitle) raceModalSubtitle.innerText = `Cambiar de raza cuesta ${RACE_CHANGE_COST.toLocaleString()} de oro. Es una decisión casi irreversible.`;
    } else {
        if (raceModalTitle) raceModalTitle.innerText = '¡Vaya, una nueva cara por aquí! Mmh... ¡Bienvenido/a pues! Dime, que desde aquí no te veo muy bien... ¿De qué raza eres?';
        if (raceModalSubtitle) raceModalSubtitle.innerText = 'Selecciona tu Raza — con la que sientas más afinidad, que te represente... o que percibas que fuiste en una vida pasada.';
    }

    raceSelectionModal.classList.remove('hidden');
}

// Registrar selección de raza en los botones del modal
document.querySelectorAll('.race-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
        const raza = btn.dataset.race;
        if (raza) seleccionarRaza(raza);
    });
});

// --- REGISTRO DE EVENTOS (Prioridad Alta) ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        switchTab(target);
    });
});

if (chatInput) {
    chatInput.addEventListener('input', autoResizeChatInput);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarChat();
        }
    });
    autoResizeChatInput();
}

if (sendGestaBtn) {
    sendGestaBtn.addEventListener('click', enviarChat);
}

if (changeRaceBtn) {
    changeRaceBtn.addEventListener('click', async () => {
        const token = await obtenerToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/profile/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const profile = data?.profile;
            if (!profile?.race) {
                showToast('Debes elegir una raza inicial primero.', 'warning');
                return;
            }
            if ((profile.gold || 0) < RACE_CHANGE_COST) {
                showToast(`Necesitas ${RACE_CHANGE_COST.toLocaleString()} de oro para cambiar de raza.`, 'warning');
                return;
            }
            openRaceSelectionModal('change');
        } catch (e) {
            console.error("Error verificando perfil para cambio de raza:", e);
            showToast('No se pudo abrir el rito de cambio.', 'error');
        }
    });
}

// INICIO SEGURO
(async function init() {
    console.log("⚡ S.R.B. Inicializando...");
    try {
        await cargarMisiones();
        await updateSauronHP();
        await actualizarPerfilUsuario();
        await consultarPalantir();

        // Ocultar Splash Screen
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 700);
        }
    } catch (err) {
        console.error("Fallo crítico en inicialización:", err);
    }
})();

function switchTab(targetId) {
    // 1. Actualizar Botones
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.dataset.target === targetId) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    // 2. Mostrar/Ocultar Contenedores
    Object.keys(containers).forEach(key => {
        if (key === targetId) {
            containers[key].classList.remove('hidden');
        } else {
            containers[key].classList.add('hidden');
        }
    });

    // 3. Lógica Específica de cada Tab
    if (targetId === 'journal') {
        chatFooter.classList.remove('hidden');
    } else {
        chatFooter.classList.add('hidden');
    }

    if (targetId === 'warRoom') {
        initCharts(); // Siempre reiniciamos para ver cambios frescos
        chartsInitialized = true;
    }

    if (targetId === 'forge') {
        loadForge();
    }

    if (targetId === 'profile') {
        loadProfile();
    }

    if (targetId === 'backpack') {
        loadInventory();
    }

    if (targetId === 'forge') {
        loadForge();
    }

    if (targetId === 'achievementsTab') {
        renderDedicatedAchievements();
    }

    updateJourneyHUDVisibility();
}

// --- LÓGICA DE LA MOCHILA (INVENTARIO) ---
const descripcionesItems = {
    'Hierro': 'Metal básico pero resistente, fundamental para la forja de espadas y escudos de la infantería.',
    'Cuero': 'Piel curtida esencial para correajes, armaduras ligeras y empuñaduras de armas.',
    'Madera': 'Roble de los bosques cercanos, necesario para astiles de lanzas y refuerzos de escudos.',
    'Acero de Gondor': 'Aleación superior forjada con secretos de la Ciudad Blanca. Alta durabilidad y filo.',
    'Telas Élficas': 'Tejidos livianos y casi invisibles que ofrecen una resistencia mágica a la fatiga.',
    'Mithril': 'Plata auténtica de Moria. Ligero como una pluma, pero duro como las escamas de un dragón.',
    'Fragmento de Narsil': 'Un resto de la espada que cortó el Anillo. Emite un brillo pálido y antiguo.',
    'Pergamino': 'Papel de alta calidad para documentar gestas y planes estratégicos.',
    'Pluma': 'Herramienta de escritura fina extraída de aves de las Montañas Nubladas.',
    'Tinta de Isildur': 'Pigmento oscuro y eterno que nunca se desvanece con el paso de las eras.',
    'Libro Antiguo': 'Tomo que contiene conocimientos perdidos sobre la forja y la guerra.',
    'Hierbas': 'Mezcla de plantas comunes con propiedades medicinales básicas.',
    'Ungüento': 'Bálsamo rústico para aliviar las heridas superficiales del combate cotidiano.',
    'Athelas': 'Hojas de los Reyes. Su fragancia alivia el alma y sana las heridas más oscuras.',
    'Vial de Galadriel': 'Un cristal que contiene la luz de Eärendil. Útil contra la sombra absoluta.'
};

const iconosItems = {
    'Hierro': '⛏️', 'Cuero': '📜', 'Madera': '🪵',
    'Acero de Gondor': '⚔️', 'Telas Élficas': '🍃',
    'Mithril': '🛡️', 'Fragmento de Narsil': '✨',
    'Pergamino': '📜', 'Pluma': '🪶', 'Tinta de Isildur': '✒️', 'Libro Antiguo': '📖',
    'Hierbas': '🌿', 'Ungüento': '🧪', 'Athelas': '🌱', 'Vial de Galadriel': '🍶',
    'Dardo (Sting)': '🗡️', 'Glamdring': '⚔️', 'Orcrist': '⚔️', 'Andúril': '🗡️',
    'Yelmo de Hador': '🪖', 'Cota de Mithril': '👕', 'Anillo de Barahir': '💍',
    'Estrella de Elendil': '⭐', 'Cuerno de Gondor': '📯', 'Elessar': '💎',
    'Palantír de Orthanc': '🔮', 'Herugrim': '🗡️', 'Grond': '🔨', 'Aeglos': '🔱',
    'Anglachel': '⚔️', 'Anillo de Thrór': '💍', 'Llave de Erebor': '🔑',
    'Libro Rojo de la Frontera del Oeste': '📕', 'Piedra del Arca (Arkenstone)': '💎'
};

async function loadInventory() {
    const token = await obtenerToken();
    if (!token) return;

    inventoryGrid.innerHTML = '<div class="col-span-full text-center text-slate-500 animate-pulse">Abriendo la mochila...</div>';
    emptyInventory.classList.add('hidden');

    try {
        const { data: { user } } = await samClient.auth.getUser();
        const viewedItemsKey = `viewedItems_${user?.id || 'anon'}`;

        const res = await fetch(`${API_BASE}/api/inventory`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.inventory) {
            renderInventory(data.inventory, viewedItemsKey);
        }
    } catch (e) {
        console.error("Error al cargar inventario:", e);
    }
}

function renderInventory(items, viewedItemsKey = 'viewedItems_anon') {
    inventoryGrid.innerHTML = '';

    if (items.length === 0) {
        emptyInventory.classList.remove('hidden');
        return;
    }

    // Cargar items ya vistos desde localStorage
    const viewedItems = JSON.parse(localStorage.getItem(viewedItemsKey) || '[]');

    // IMPORTANTE: Deduplicar items por nombre (no pueden haber 2 iguales en "Bufos")
    const uniqueItems = [];
    const seenItems = new Set();

    items.forEach(item => {
        const itemName = item.name || "Objeto Desconocido";

        // Si este nombre ya existe, sumar la cantidad al existente
        const existingItem = uniqueItems.find(i => i.name === itemName);
        if (existingItem) {
            existingItem.total += item.total || 1;
        } else {
            uniqueItems.push({
                name: itemName,
                rarity: item.rarity || "Común",
                total: item.total || 1
            });
        }
    });

    uniqueItems.forEach(item => {
        const itemName = item.name;
        const itemRarity = item.rarity;
        const itemTotal = item.total;
        const isNew = !viewedItems.includes(itemName);

        const card = document.createElement('div');
        const colorRarity = itemRarity === 'Legendario' ? 'text-amber-400 border-amber-600' : (itemRarity === 'Raro' ? 'text-blue-400 border-blue-600' : 'text-slate-400 border-slate-700');
        const icon = iconosItems[itemName] || '📦';

        card.className = `glass-panel p-4 rounded-lg border flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform group relative`;
        card.innerHTML = `
            ${isNew ? '<div class="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">NEW</div>' : ''}
            <div class="text-3xl group-hover:animate-bounce">${icon}</div>
            <div class="text-center">
                <div class="font-bold text-sm ${colorRarity}">${itemName}</div>
                <div class="text-[10px] opacity-50 uppercase tracking-tighter">${itemRarity}</div>
            </div>
            <div class="bg-amber-900/40 px-2 py-0.5 rounded text-[10px] font-bold text-amber-200">x${itemTotal}</div>
        `;

        card.onclick = () => {
            // Marcar item como visto
            if (!viewedItems.includes(itemName)) {
                viewedItems.push(itemName);
                localStorage.setItem(viewedItemsKey, JSON.stringify(viewedItems));
            }
            showItemDetail({ ...item, name: itemName, rarity: itemRarity }, icon);
        };
        inventoryGrid.appendChild(card);
    });
}

function showItemDetail(item, icon) {
    document.getElementById('itemDetailIcon').innerText = icon;
    document.getElementById('itemDetailName').innerText = item.name;
    document.getElementById('itemDetailRarity').innerText = item.rarity;
    document.getElementById('itemDetailDescription').innerText = descripcionesItems[item.name] || 'Un objeto misterioso de la Tierra Media.';

    const rarityColors = {
        'Común': 'text-slate-700',
        'Raro': 'text-blue-800',
        'Legendario': 'text-amber-900'
    };
    document.getElementById('itemDetailRarity').className = `text-xs uppercase tracking-widest my-2 font-bold ${rarityColors[item.rarity] || 'text-amber-900'}`;

    itemDetailModal.classList.remove('hidden');
}

document.getElementById('closeItemDetail').onclick = () => {
    itemDetailModal.classList.add('hidden');
    // Recargar el inventario inmediatamente al cerrar para que desaparezca el badge NEW
    loadInventory();
};

// Cerrar modal al hacer clic fuera
itemDetailModal.onclick = (e) => {
    if (e.target === itemDetailModal) {
        itemDetailModal.classList.add('hidden');
        // Recargar el inventario inmediatamente al cerrar para que desaparezca el badge NEW
        loadInventory();
    }
};

// --- PERFIL & COMPARTIR ---
async function loadProfile() {
    const token = await obtenerToken();
    if (!token) {
        console.warn("No token disponible para loadProfile");
        return;
    }

    try {
        // Obtener perfil con stats
        const res = await fetch(`${API_BASE}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("Error fetching profile:", res.status);
            return;
        }

        const data = await res.json();

        if (data.success && data.profile) {
            const p = data.profile;

            // Cargar nickname si existe, si no mostrar apodo genérico (no el email)
            if (document.getElementById('profileEmail')) {
                document.getElementById('profileEmail').innerText = p.nickname || 'Portador/a sin nombre';
            }

            // Actualizar Nivel, ORO, Raza (con validación de elementos)
            const profileLevel = document.getElementById('profileLevel');
            if (profileLevel) profileLevel.innerText = getLevelFromXP(p.experience || 0);

            const profileGold = document.getElementById('profileGold');
            if (profileGold) profileGold.innerText = `${(p.gold || 0).toLocaleString()}`;

            if (changeRaceBtn) {
                const canChangeRace = Boolean(p.race) && (p.gold || 0) >= RACE_CHANGE_COST;
                changeRaceBtn.disabled = !canChangeRace;
                changeRaceBtn.classList.toggle('opacity-40', !canChangeRace);
                changeRaceBtn.title = canChangeRace
                    ? 'Abrir rito de cambio de raza'
                    : `Necesitas ${RACE_CHANGE_COST.toLocaleString()} de oro`;
            }

            const playerRace = document.getElementById('playerRace');
            if (playerRace) playerRace.innerText = displayRace(p.race) || 'Sin Raza';

            const profileRaceTitle = document.getElementById('profileRaceTitle');
            if (profileRaceTitle) profileRaceTitle.innerText = p.race_title || 'Aventurero/a';

            // Icono de raza
            const profileRaceIcon = document.getElementById('profileRaceIcon');
            if (profileRaceIcon) profileRaceIcon.innerText = getRaceIcon(p.race);
            if (journeyRaceIcon) journeyRaceIcon.innerText = getRaceIcon(p.race);

            // BARRA DE XP (curva progresiva)
            const lvl = getLevelFromXP(p.experience || 0);
            const xpCurrentLevel = getXPInCurrentLevel(p.experience || 0, lvl);
            const xpForNextLevel = getXPThresholdForLevel(lvl);
            const xpProgress = Math.min(100, (xpCurrentLevel / xpForNextLevel) * 100);

            const xpBar = document.getElementById('profileXPBarLarge');
            if (xpBar) {
                xpBar.style.width = `${xpProgress}%`;
            }

            const profileXPText = document.getElementById('profileXPText');
            if (profileXPText) profileXPText.innerText = `${xpCurrentLevel}/${xpForNextLevel} XP`;

            const profileXPPercent = document.getElementById('profileXPPercent');
            if (profileXPPercent) profileXPPercent.innerText = `${Math.floor(xpProgress)}%`;

            const profileNextLevel = document.getElementById('profileNextLevel');
            if (profileNextLevel) profileNextLevel.innerText = `Próximo nivel: ${xpForNextLevel - xpCurrentLevel} XP restantes`;

            // LOGROS
            const unlockedIds = Array.isArray(p.achievements) ? p.achievements : (typeof p.achievements === 'object' ? Object.keys(p.achievements || {}) : []);
            const profileAchievementsCount = document.getElementById('profileAchievementsCount');
            if (profileAchievementsCount) profileAchievementsCount.innerText = unlockedIds.length;

            console.log("✅ Perfil cargado exitosamente");

        } else {
            console.error("Respuesta de perfil no válida:", data);
        }
    } catch (e) {
        console.error("❌ Error al cargar perfil:", e);
    }
}

// VALIDACIÓN SEGURA: shareVictoryBtn podría no existir
const shareVictoryBtn = document.getElementById('shareVictoryBtn');
if (shareVictoryBtn) {
    shareVictoryBtn.addEventListener('click', async () => {
        const feedback = document.getElementById('shareFeedback');
        const token = await obtenerToken();

        try {
            // Fetch fresh stats for the report
            const res = await fetch(`${API_BASE}/api/stats/personal`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { stats } = await res.json();

            const total = stats.total_tasks || 0;
            const completed = stats.completed_tasks || 0;
            const effectiveness = stats.effectiveness || 0;
            const commanderName = profileEmail ? profileEmail.innerText : "Comandante";

            const textToCopy = `🛡️ *S.A.M. THE RED BOOK* 🛡️\n\n👤 Comandante: ${commanderName}\n⚔️ Gesta Semanal: ${completed}/${total} Misiones\n🔥 Efectividad: ${effectiveness}%\n\n"Paso a paso, el viaje continúa."`;

            await navigator.clipboard.writeText(textToCopy);
            feedback.innerText = "¡Copiado al portapapeles!";
            setTimeout(() => feedback.innerText = "", 3000);
        } catch (err) {
            console.error("Error al compartir:", err);
            feedback.innerText = "Error al copiar (HTTPS requerido).";
            feedback.classList.remove('text-green-400');
            feedback.classList.add('text-red-400');
        }
    });
}


async function initCharts() {
    console.log("🛠️ Invocando a los astros para las gráficas...");

    if (typeof Chart === 'undefined') {
        console.error("❌ Chart.js NO está cargado.");
        showToast("Error: Los pergaminos de gráficas no se cargaron.", "error");
        return;
    }

    const token = await obtenerToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/api/stats/races-weekly`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("❌ Error API Stats por raza:", res.status);
            showToast("No se pudieron cargar las gráficas por raza.", "error");
            return;
        }

        const data = await res.json();
        const stats = data.stats || {};
        const labels = stats.labels || ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        const races = stats.races || {};

        const raceConfigs = [
            { key: 'Humano', canvasId: 'raceChartHumano' },
            { key: 'Elfo', canvasId: 'raceChartElfo' },
            { key: 'Enano', canvasId: 'raceChartEnano' },
            { key: 'Hobbit', canvasId: 'raceChartHobbit' }
        ];

        if (!window.raceChartInstances) window.raceChartInstances = {};

        raceConfigs.forEach(({ key, canvasId }) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            if (window.raceChartInstances[canvasId]) {
                window.raceChartInstances[canvasId].destroy();
            }

            const ctx = canvas.getContext('2d');
            const raceData = races[key] || { completed: [0, 0, 0, 0, 0, 0, 0], failed: [0, 0, 0, 0, 0, 0, 0] };

            window.raceChartInstances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Cumplidas',
                            data: raceData.completed,
                            backgroundColor: 'rgba(16, 185, 129, 0.55)',
                            borderColor: '#10b981',
                            borderWidth: 1,
                            borderRadius: 4
                        },
                        {
                            label: 'Fallidas',
                            data: raceData.failed,
                            backgroundColor: 'rgba(239, 68, 68, 0.55)',
                            borderColor: '#ef4444',
                            borderWidth: 1,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: { color: '#cbd5e1', boxWidth: 12, boxHeight: 12, font: { size: 10 } }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: 5,
                            ticks: { stepSize: 1, precision: 0, color: '#94a3b8' },
                            grid: { color: 'rgba(148, 163, 184, 0.18)' }
                        },
                        x: {
                            ticks: { color: '#cbd5e1', font: { size: 10, weight: 'bold' } },
                            grid: { display: false }
                        }
                    }
                }
            });
        });
    } catch (e) {
        console.error("Error cargando gráficas por raza:", e);
    }
}

// --- RENDERIZAR BUFFS (HUD) ---
function renderActiveBuffs(buffs) {
    const hud = document.getElementById('activeBuffsHUD');
    if (!hud) return;

    hud.innerHTML = '';

    // Si viene del backend mejorado, usaremos 'sources'
    const sources = buffs.sources || [];

    if (sources.length === 0) {
        hud.innerHTML = '<span class="text-[9px] text-slate-600 italic">Sin modificadores activos</span>';
        return;
    }

    sources.forEach(s => {
        const span = document.createElement('span');
        const icon = s.buff_xp ? '✨' : '🛡️';
        const label = s.buff_xp ? `XP x${s.buff_xp.toFixed(1)}` : `Horda -${(s.reduccion_horda * 100).toFixed(0)}%`;
        const color = s.buff_xp ? 'text-amber-400 border-amber-900/50' : 'text-blue-400 border-blue-900/50';

        span.className = `flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full border text-[9px] font-bold ${color} animate-pulse cursor-help`;
        span.title = `Objeto: ${s.name}`;
        span.innerHTML = `<span>${icon}</span> <span>${s.name} (${label})</span>`;
        hud.appendChild(span);
    });
}

// --- PROTOCOLO DE INCURSIÓN: HUD DE GUERRA (REALTIME) ---

async function updateSauronHP() {
    const token = await obtenerToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/api/stats/global`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.world_status && data.world_status.active) {
            const status = data.world_status;
            journeyEventActive = true;

            actualizarVisualRaid(status);
            updateJourneyHUDVisibility();

            // Inicializar Realtime si no está activo
            if (!realtimeChannel) {
                inicializarRealtimeRaid(status.id);
            }
        } else {
            journeyEventActive = false;
            updateJourneyHUDVisibility();
        }
    } catch (e) {
        console.error("Error conectando con el Frente Global:", e);
        journeyEventActive = false;
        updateJourneyHUDVisibility();
    }
}

function actualizarVisualRaid(status) {
    const percent = status.progress_percentage || 100;
    const currentHP = BigInt(status.current_hp);
    const maxHP = BigInt(status.max_hp);

    const remainingPercent = Math.max(0, Math.min(100, Number(percent)));
    sauronHPBar.style.width = `${remainingPercent}%`;
    const pasos = Math.round(remainingPercent * 1000);
    sauronHPText.innerText = `${pasos.toLocaleString('es-ES')} pasos restantes`;
    if (bossName) bossName.innerText = 'Distancia hasta llegar al Monte del Destino';
    if (bossIcon) bossIcon.innerText = '🌋';
    if (journeyProgressMarker) journeyProgressMarker.style.left = `${remainingPercent}%`;

    // Efectos de daño
    if (previousSauronHP !== null && currentHP < previousSauronHP) {
        triggerDamageEffects();
    }
    previousSauronHP = currentHP;
}

function updateJourneyHUDVisibility() {
    if (!raidWidget) return;
    const isJournal = Boolean(document.querySelector('.nav-btn.active[data-target="journal"]'));
    if (journeyEventActive && isJournal) {
        raidWidget.classList.remove('hidden');
    } else {
        raidWidget.classList.add('hidden');
    }
}

function triggerJourneyRealtimeBurst() {
    updateSauronHP();
    setTimeout(() => updateSauronHP(), 350);
    setTimeout(() => updateSauronHP(), 900);
}

function triggerDamageEffects() {
    raidWidget.classList.add('hp-shake');
    emitirParticulasFuego();
    setTimeout(() => raidWidget.classList.remove('hp-shake'), 500);
}

function emitirParticulasFuego() {
    const fireContainer = document.getElementById('fireEvents');
    if (!fireContainer) return;
    for (let i = 0; i < 5; i++) {
        const p = document.createElement('div');
        p.className = 'fire-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.width = p.style.height = (Math.random() * 4 + 2) + 'px';
        fireContainer.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
}

function inicializarRealtimeRaid(eventId) {
    console.log("🔥 Sincronizando HUD con el Ojo de Sauron...");

    realtimeChannel = samClient
        .channel('raid-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'world_events' }, payload => {
            console.log("⚔️ Cambio detectado en World Events:", payload.new);
            actualizarVisualRaid(payload.new);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'raid_logs' }, payload => {
            console.log("📜 Nuevo log de batalla:", payload.new);
            agregarMensajeBatalla(payload.new);
        })
        .subscribe();
}

function agregarMensajeBatalla(log) {
    const msg = document.createElement('div');
    msg.className = 'feed-msg';
    const verb = log.type === 'sacrifice' ? 'ha sacrificado recursos y' : '';
    msg.innerHTML = `💍 <strong>${log.user_email || 'Un Portador'}</strong> ${verb} <span class="text-white">acerca la travesía en ${log.damage.toLocaleString()} puntos</span>`;

    battleFeed.prepend(msg);
    if (battleFeed.children.length > 3) battleFeed.lastElementChild.remove();
}

// --- GUÍA Y MEJORAS ---
window.showGuide = (mandatory = false) => {
    const modal = document.getElementById('guideModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.dataset.mandatory = mandatory ? '1' : '0';
};

function closeGuideModal() {
    const modal = document.getElementById('guideModal');
    if (!modal) return;
    modal.classList.add('hidden');

    if (pendingGuideStorageKey) {
        localStorage.setItem(pendingGuideStorageKey, '1');
        pendingGuideStorageKey = null;
    }

    if (pendingRaceModalAfterGuide && raceSelectionModal) {
        openRaceSelectionModal('onboarding');
        raceModalShownOnce = true;
        pendingRaceModalAfterGuide = false;
    }
}

const closeGuideBtn = document.getElementById('closeGuideBtn');
if (closeGuideBtn) {
    closeGuideBtn.addEventListener('click', closeGuideModal);
}

window.craftItem = async (recetaNombre) => {
    const token = await obtenerToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/api/forge/craft`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ recetaNombre })
        });

        const data = await res.json();

        if (data.success) {
            showToast(`¡Has forjado: ${recetaNombre}!`, 'success');
            // Recargar misiones para ver el nuevo buff inmediatamente
            cargarMisiones();
            // Recargar forja para actualizar materiales
            loadForge();
        } else {
            showToast(data.error || "Error en la forja.", 'error');
        }
    } catch (err) {
        console.error("Error al forjar:", err);
        showToast("Error de conexión con la fragua.", "error");
    }
};

// --- LÓGICA DINÁMICA DE LA FORJA (NUEVA) ---
async function loadForge() {
    const token = await obtenerToken();
    if (!token) return;

    const recipesGrid = document.getElementById('recipesGrid');
    if (!recipesGrid) return;

    recipesGrid.innerHTML = '<div class="col-span-full text-center text-slate-500 animate-pulse">Encendiendo los fuegos de la fragua...</div>';

    try {
        // 1. Obtener Recetas e Inventario en paralelo
        const [recipesRes, inventoryRes] = await Promise.all([
            fetch(`${API_BASE}/api/forge/recipes`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/inventory`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const recipesData = await recipesRes.json();
        const inventoryData = await inventoryRes.json();

        if (recipesData.success && inventoryData.success) {
            // Obtener el oro del jugador para inyectarlo en el mapa de materiales disponibles
            const { data: goldData } = await samClient.from('profiles').select('gold').single();
            const playerCurrentGold = goldData?.gold || 0;
            renderForge(recipesData.recipes, inventoryData.inventory, playerCurrentGold);
        }
    } catch (e) {
        console.error("Error al cargar la forja:", e);
        recipesGrid.innerHTML = '<div class="text-red-500 text-center text-xs">Error al conectar con Erebor.</div>';
    }
}

function renderForge(recipes, inventory, playerGold = 0) {
    const recipesGrid = document.getElementById('recipesGrid');
    if (recipesGrid) recipesGrid.innerHTML = '';

    // Convertir inventario a un mapa para búsqueda rápida
    const available = inventory.reduce((acc, item) => {
        const qty = item.total !== undefined ? item.total : (item.quantity || 1);
        acc[item.name || item.item_name] = (acc[item.name || item.item_name] || 0) + qty;
        return acc;
    }, {});
    // Inyectar el oro del jugador como material disponible
    available['Oro'] = playerGold;

    Object.entries(recipes).forEach(([name, receta]) => {
        const card = document.createElement('div');

        // Verificar si el usuario ya tiene este item FORJADO (único)
        // Los items forjados tienen un flag "soulbound" o "unique" en sus propiedades
        const alreadyOwns = inventory.some(i => {
            const itemName = i.item_name || i.name;
            // Item es considerado forjado si: 
            // 1) Tiene el mismo nombre de la receta 
            // 2) Y está marcado como soulbound (único/forjado)
            return itemName === name && (i.soulbound === true || i.is_unique === true);
        });

        const canCraft = Object.entries(receta.materiales).every(([mat, qty]) => (available[mat] || 0) >= qty);

        const rarityColors = {
            'Común': 'text-slate-400 border-slate-700 bg-slate-900/40',
            'Raro': 'text-blue-400 border-blue-900 bg-blue-900/10',
            'Legendario': 'text-amber-400 border-amber-600 bg-amber-900/10 font-bold'
        };
        const colorClass = rarityColors[receta.resultado.rarity] || rarityColors['Común'];

        card.className = `recipe-card p-4 rounded border transition-all ${alreadyOwns ? 'border-green-500/30 bg-green-900/5 opacity-70' : canCraft ? 'border-amber-500/50 bg-amber-900/5' : 'border-slate-800 bg-slate-900/60'}`;

        let materialsHTML = '';
        let effectsHTML = '';

        // FIX: Calcular siempre los efectos para poder mostrarlos
        if (receta.resultado.effects) {
            effectsHTML = '<div class="space-y-1 mb-3 p-2 bg-purple-900/20 rounded border border-purple-500/20">';
            effectsHTML += '<p class="text-[8px] text-purple-400 font-bold uppercase tracking-widest mb-1">⚡ EFECTOS ESPECIALES:</p>';
            Object.entries(receta.resultado.effects).forEach(([effect, value]) => {
                const effectName = effect.replace(/_/g, ' ').toUpperCase();
                const displayValue = typeof value === 'number' && value > 1 ? `+${Math.round((value - 1) * 100)}%` : value;
                effectsHTML += `<div class="text-[9px] text-purple-300">• ${effectName}: <span class="text-purple-400 font-bold">${displayValue}</span></div>`;
            });
            effectsHTML += '</div>';
        } else {
            effectsHTML = `<p class="text-[10px] text-slate-400 mb-3 italic">"${receta.resultado.description}"</p>`;
        }

        if (!alreadyOwns) {
            Object.entries(receta.materiales).forEach(([mat, qtyNeeded]) => {
                const has = available[mat] || 0;
                const isEnough = has >= qtyNeeded;
                const icon = iconosItems[mat] || '📦';

                materialsHTML += `
                    <div class="flex items-center justify-between text-[10px] mb-1 p-1 rounded ${isEnough ? 'bg-green-900/10 text-green-400' : 'bg-red-900/10 text-red-400'}">
                        <span class="flex items-center gap-1">${icon} ${mat}: ${qtyNeeded}</span>
                        <span class="font-bold">${isEnough ? '✓' : '❌'} (tienes ${has})</span>
                    </div>
                `;
            });
        }

        card.innerHTML = `
            <div class="flex flex-col items-center gap-2 mb-3 border-b border-amber-900/20 pb-3">
                <div class="text-3xl filter drop-shadow-[0_0_8px_rgba(251,191,36,0.2)] mb-1">${iconosItems[name] || '⚒️'}</div>
                <div class="flex justify-between items-center w-full">
                    <h3 class="font-bold uppercase text-[12px] tracking-widest ${alreadyOwns ? 'text-green-400' : canCraft ? 'text-amber-400' : 'text-slate-600'} font-mono">${name}</h3>
                    <span class="text-[8px] px-1.5 rounded border font-bold ${colorClass}">${receta.resultado.rarity}</span>
                </div>
            </div>
            
            ${!alreadyOwns ? `
            ${effectsHTML}
            <div class="space-y-1 mb-4">
                <p class="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-2">Recaudos de Forja:</p>
                ${materialsHTML}
            </div>
            ` : `
            <div class="h-20 flex flex-col items-center justify-center">
                ${effectsHTML}
            </div>
            `}

            <button onclick="${alreadyOwns ? '' : `craftItem('${name}')`}" 
                ${(!canCraft || alreadyOwns) ? 'disabled' : ''}
                class="w-full py-2 rounded text-xs font-bold transition-all
                ${alreadyOwns ? 'bg-green-900/20 text-green-500 border border-green-500/30 cursor-default' : canCraft ? 'bg-amber-600 hover:bg-amber-500 text-black shadow-lg shadow-amber-900/20 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}">
                ${alreadyOwns ? '✓ COMPRADO' : canCraft ? '⚒️ FORJAR ARTEFACTO' : 'FALTAN MATERIALES'}
            </button>
        `;
        recipesGrid.appendChild(card);
    });
}

// --- LOGROS DEDICADOS (GALERÍA EN CUADRÍCULA) ---
async function renderDedicatedAchievements(preloadedAchievements) {
    const grid = document.getElementById('achievementsGrid');
    const totalLabel = document.getElementById('achievementsTotal');
    if (!grid) return;

    const token = await obtenerToken();
    if (!token) return;

    try {
        let unlockedIds = [];

        // Si tenemos los achievements del backend en la respuesta, usarlos directamente
        if (preloadedAchievements !== undefined && preloadedAchievements !== null) {
            unlockedIds = Array.isArray(preloadedAchievements) ? preloadedAchievements : [];
            cachedAchievements = unlockedIds; // Actualizar cache
        } else if (cachedAchievements !== null) {
            // Usar cache local si lo tenemos (evita re-query con datos viejos al cambiar de tab)
            unlockedIds = cachedAchievements;
        } else {
            // Fallback: consultar Supabase solo si no hay cache
            await actualizarPerfilUsuario();
            const { data: profile } = await samClient.from('profiles').select('achievements').single();
            let unlockedRaw = profile?.achievements || {};

            // IMPORTANTE: Validar y limpiar achievements
            if (Array.isArray(unlockedRaw)) {
                unlockedIds = unlockedRaw;
            } else if (typeof unlockedRaw === 'object' && unlockedRaw !== null) {
                unlockedIds = Object.keys(unlockedRaw);
            } else if (typeof unlockedRaw === 'string') {
                try {
                    unlockedIds = JSON.parse(unlockedRaw);
                    if (!Array.isArray(unlockedIds)) unlockedIds = [];
                } catch {
                    unlockedIds = [];
                }
            }
            cachedAchievements = unlockedIds; // Actualizar cache con datos frescos de Supabase
        }

        const allLogros = [
            { id: 'tasks_1', name: 'INICIADO', icon: '🏆', how: 'Completa tu primera misión' },
            { id: 'tasks_10', name: 'AVENTURERO LOCAL', icon: '📜', how: 'Completa 10 misiones' },
            { id: 'tasks_25', name: 'HÉROE DE LA COMARCA', icon: '🍺', how: 'Completa 25 misiones' },
            { id: 'salud_5', name: 'VIGÍA DE LA SALUD', icon: '💚', how: 'Completa 5 misiones de Salud' },
            { id: 'estudio_10', name: 'ESCRIBA DE MINAS TIRITH', icon: '📖', how: 'Completa 10 misiones de Estudio' },
            { id: 'trabajo_5', name: 'MAESTRO LABORAL', icon: '🔨', how: 'Completa 5 misiones de Trabajo' },
            { id: 'hogar_5', name: 'GUARDIÁN DEL HOGAR', icon: '🏠', how: 'Completa 5 misiones de Hogar' },
            { id: 'ocio_5', name: 'BUSCADOR DE ALEGRÍA', icon: '🎭', how: 'Completa 5 misiones de Ocio' },
            { id: 'damage_1k', name: 'PEQUEÑA ESPINA', icon: '🗡️', how: 'Inflige 1,000 de daño a Sauron' },
            { id: 'damage_10k', name: 'MUERTE NEGRA', icon: '⚔️', how: 'Inflige 10,000 de daño a Sauron' },
            { id: 'gold_100', name: 'BOLSA DE MONEDAS', icon: '💰', how: 'Acumula 100 de oro' },
            { id: 'gold_500', name: 'TESORERO DE EREBOR', icon: '💎', how: 'Acumula 500 de oro' },
            { id: 'raid_victory', name: 'PORTADOR DEL ANILLO', icon: '💍', how: 'Derrota a Sauron en una Raid' },
            { id: 'forge_1', name: 'APRENDIZ DE HERRERO', icon: '⚒️', how: 'Forja tu primer objeto' },
            { id: 'forge_10', name: 'MAESTRO FORJADOR', icon: '🔥', how: 'Forja 10 objetos' },
            { id: 'legendary_1', name: 'CAZADOR DE LEYENDAS', icon: '⭐', how: 'Obtén tu primer objeto Legendario' },
            { id: 'level_10', name: 'VETERANO', icon: '📈', how: 'Alcanza el nivel 10' },
            { id: 'level_50', name: 'SAGRADO', icon: '👑', how: 'Alcanza el nivel 50' },
            { id: 'perfect_week', name: 'SEMANA PERFECTA', icon: '✨', how: 'Completa todas las misiones de una semana' },
            { id: 'legendary_5', name: 'LEYENDA VIVIENTE', icon: '🌟', how: 'Obtén 5 objetos Legendarios' }
        ];

        grid.innerHTML = allLogros.map(l => {
            const isUnlocked = unlockedIds.includes(l.id);
            return `
                <div class="achievement-tile cursor-pointer relative overflow-hidden rounded-lg border-2 transition-all duration-300 group ${isUnlocked ? 'border-amber-500 bg-gradient-to-br from-amber-900/20 to-amber-900/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]' : 'border-slate-700 bg-slate-900/40 opacity-50 hover:opacity-70'}" 
                     onclick="mostrarDetalleLogro('${l.id}', '${l.name}', '${l.icon}', '${l.how.replace(/'/g, "\\'")}', ${isUnlocked})">
                    <div class="p-4 flex flex-col items-center justify-center h-full text-center">
                        <div class="text-4xl mb-2 transition-transform group-hover:scale-110">
                            ${isUnlocked ? l.icon : '🔒'}
                        </div>
                        <p class="text-[10px] font-bold text-slate-300 line-clamp-2">${l.name}</p>
                        ${isUnlocked ? '<div class="absolute inset-0 bg-amber-400/5 animate-pulse"></div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        if (totalLabel) totalLabel.innerText = `${unlockedIds.length}/${allLogros.length}`;
    } catch (e) {
        console.error("Error al cargar logros:", e);
    }
}

// Función para mostrar detalles del logro
window.mostrarDetalleLogro = (id, name, icon, how, unlocked) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';

    // Estado inicial de "cargando"
    modal.innerHTML = `
        <div class="gandalf-scroll w-full max-w-sm rounded-lg border-2 border-amber-800 p-8 text-center">
            <div class="text-6xl mb-4 animate-pulse">⚙️</div>
            <h2 class="text-2xl font-bold text-amber-400 mb-3">${name}</h2>
            <p class="text-sm text-slate-400">Consultando los anales del destino...</p>
        </div>
    `;
    document.body.appendChild(modal);

    // Intentar obtener progreso real del endpoint
    obtenerToken().then(token => {
        fetch(`${API_BASE}/api/achievements/progress`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache' // Evitar respuestas en caché
            }
        })
            .then(res => res.json())
            .then(data => {
                const progress = data.achievements.progress[id] || { current: 0, target: 0 };
                const progressText = unlocked ? '✅' : `${progress.current}/${progress.target}`;

                modal.innerHTML = `
                <div class="gandalf-scroll w-full max-w-sm rounded-lg border-2 border-amber-800 p-8 text-center">
                    <div class="text-6xl mb-4">${unlocked ? icon : '🔒'}</div>
                    <h2 class="text-2xl font-bold text-amber-400 mb-3">${name}</h2>
                    <div class="border-t border-b border-amber-800 py-4 mb-4">
                        <p class="text-[11px] uppercase tracking-widest text-slate-400 mb-2">MÉTODO DE OBTENCIÓN</p>
                        <p class="text-sm text-slate-800 font-semibold">${how}</p>
                        <p class="text-xs text-slate-800 font-bold mt-3 bg-slate-200 rounded px-2 py-1">Progreso: ${progressText}</p>
                    </div>
                    <p class="text-xs text-slate-500 mb-4">${unlocked ? '✅ COMPLETADO' : '🔒 BLOQUEADO'}</p>
                    <button onclick="this.closest('.fixed').remove()" class="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all">
                        Cerrar
                    </button>
                </div>
            `;
            })
            .catch(e => {
                // Fallback si falla el fetch
                modal.innerHTML = `
                <div class="gandalf-scroll w-full max-w-sm rounded-lg border-2 border-amber-800 p-8 text-center">
                    <div class="text-6xl mb-4">${unlocked ? icon : '🔒'}</div>
                    <h2 class="text-2xl font-bold text-amber-400 mb-3">${name}</h2>
                    <div class="border-t border-b border-amber-800 py-4 mb-4">
                        <p class="text-[11px] uppercase tracking-widest text-slate-400 mb-2">MÉTODO DE OBTENCIÓN</p>
                        <p class="text-sm text-slate-200 font-semibold">${how}</p>
                    </div>
                    <p class="text-xs text-slate-500 mb-4">${unlocked ? '✅ COMPLETADO' : '🔒 BLOQUEADO'}</p>
                    <button onclick="this.closest('.fixed').remove()" class="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all">
                        Cerrar
                    </button>
                </div>
            `;
            });
    });

    document.body.appendChild(modal);
};

// Polling para Sauron y Salud Mundial
setInterval(updateSauronHP, 60000);
// updateWorldHealth eliminado

// --- PLAYER STATS (GOLD & XP) ---
async function refreshPlayerStats() {
    const token = await obtenerToken();
    if (!token) return;

    try {
        const { data, error } = await samClient
            .from('profiles')
            .select('gold, experience, level')
            .single();

        if (!error && data) {
            if (playerGold) playerGold.innerText = `💰 ${data.gold.toLocaleString()} Oro`;
            // Podríamos actualizar XP/Nivel aquí si hubiera elementos para ello
        }
    } catch (e) {
        console.error("Error al refrescar estadísticas del jugador:", e);
    }
}

// Llamada inicial mejorada
setTimeout(() => {
    updateSauronHP();
    refreshPlayerStats();
}, 2000);

// Refrescar cada vez que se cargan misiones (por si hubo recompensas)
const originalCargarMisiones = window.cargarMisiones;
window.cargarMisiones = async (...args) => {
    await originalCargarMisiones(...args);
    refreshPlayerStats();
};

// --- EDITAR NICKNAME ---
function mostrarEditarNickname() {
    const currentNickname = document.getElementById('profileEmail')?.innerText || '';

    // Crear modal para editar apodo
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg p-6 border-2 border-blue-400 max-w-sm">
            <h2 class="text-2xl font-bold text-blue-200 mb-4">📝 Editar Apodo</h2>
            
            <input 
                type="text" 
                id="nicknameInput" 
                value="${currentNickname}"
                placeholder="Ingresa tu apodo..."
                class="w-full px-3 py-2 bg-gray-800 text-white border border-blue-500 rounded mb-4 focus:outline-none focus:border-blue-300"
                maxlength="50"
            />
            
            <div class="flex gap-3">
                <button 
                    id="saveNicknameBtn" 
                    class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition"
                >
                    ✅ Guardar
                </button>
                <button 
                    id="cancelNicknameBtn" 
                    class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded transition"
                >
                    ❌ Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('nicknameInput');
    const saveBtn = document.getElementById('saveNicknameBtn');
    const cancelBtn = document.getElementById('cancelNicknameBtn');

    // Enfocar el input
    setTimeout(() => input.focus(), 0);

    // Guardar apodo
    const guardarApodo = async () => {
        const newNickname = input.value.trim();

        if (!newNickname) {
            showToast('❌ El apodo no puede estar vacío', 'error');
            return;
        }

        try {
            const token = await obtenerToken();
            const response = await fetch(`${API_BASE}/api/profile/nickname`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nickname: newNickname })
            });

            const data = await response.json();

            if (data.success) {
                // Actualizar UI
                document.getElementById('profileEmail').innerText = newNickname;
                showToast(`✅ Apodo actualizado a: ${newNickname}`, 'success');
                modal.remove();
            } else {
                showToast(`❌ Error: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al guardar apodo:', error);
            showToast('❌ Error al guardar el apodo', 'error');
        }
    };

    // Event listeners
    saveBtn.addEventListener('click', guardarApodo);
    cancelBtn.addEventListener('click', () => modal.remove());

    // Guardar con Enter
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') guardarApodo();
    });

    // Cerrar con Escape
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Nueva función para actualizar la UI con el nuevo XP y nivel
function actualizarUIConNuevosDatos(newExp, newLevel) {
    // Actualizar HUD
    const playerLevel = document.getElementById('playerLevel');
    if (playerLevel) playerLevel.innerText = `NIVEL ${newLevel}`;

    // Actualizar Barra de XP (curva por tramos)
    const playerXPBar = document.getElementById('playerXPBar');
    if (playerXPBar) {
        const xpCurrentLevel = getXPInCurrentLevel(newExp, newLevel);
        const xpForNextLevel = getXPThresholdForLevel(newLevel);
        const progress = (xpCurrentLevel / xpForNextLevel) * 100;
        playerXPBar.style.width = `${progress}%`;
    }

    // TAMBIÉN actualizar el panel PERFIL si está visible
    const profileBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.dataset.target === 'profile');
    if (profileBtn && profileBtn.classList.contains('text-yellow-400')) {
        const profileLevel = document.getElementById('profileLevel');
        if (profileLevel) profileLevel.innerText = newLevel;

        const xpCurrentLevel = getXPInCurrentLevel(newExp, newLevel);
        const xpForNextLevel = getXPThresholdForLevel(newLevel);
        const xpProgress = (xpCurrentLevel / xpForNextLevel) * 100;

        const xpBar = document.getElementById('profileXPBarLarge');
        if (xpBar) {
            xpBar.style.width = `${xpProgress}%`;
        }

        const profileXPText = document.getElementById('profileXPText');
        if (profileXPText) profileXPText.innerText = `${xpCurrentLevel}/${xpForNextLevel} XP`;

        const profileXPPercent = document.getElementById('profileXPPercent');
        if (profileXPPercent) profileXPPercent.innerText = `${Math.floor(xpProgress)}%`;

        const profileNextLevel = document.getElementById('profileNextLevel');
        if (profileNextLevel) profileNextLevel.innerText = `Próximo nivel: ${xpForNextLevel - xpCurrentLevel} XP restantes`;
    }
}

// =====================================================
// GESTIÓN DE AUTENTICACIÓN Y REDIRECCIÓN
// =====================================================
(async function setupAuth() {
    // Comprobar sesión al cargar
    try {
        const { data: { session } } = await samClient.auth.getSession();
        if (!session) {
            // Si no hay sesión, al portal de acceso (evitamos splash screen infinito)
            window.location.href = 'login.html';
            return;
        } else {
            // Si hay sesión, ocultar splash y cargar app
            const splash = document.getElementById('splashScreen');
            if (splash) {
                setTimeout(() => {
                    splash.style.opacity = '0';
                    setTimeout(() => splash.remove(), 700);
                }, 1000);
            }
            await reinicializarApp();
        }
    } catch (err) {
        console.error("Error al comprobar sesión:", err);
    }

    // Escuchar cambios de estado de autenticación
    samClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'login.html';
        }
    });

    // Función para reinicializar la app
    async function reinicializarApp() {
        try {
            await cargarMisiones();
            await updateSauronHP();
            await actualizarPerfilUsuario();
            await consultarPalantir();
        } catch (err) {
            console.error("Error al reinicializar app:", err);
        }
    }

})();
