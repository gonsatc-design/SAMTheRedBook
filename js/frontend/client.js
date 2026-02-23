// --- CONFIGURACIÓN DE ACCESO ---
const SUPABASE_URL = 'https://alehttakkwirudssxaru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZWh0dGFra3dpcnVkc3N4YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTc1OTMsImV4cCI6MjA4NTY5MzU5M30.zLi9AqD1JkIGGLLUmb7bTg5a9ZAK2mFh3Mr_dslcDww';

// ===================================================================================
// CONFIGURACIÓN CENTRAL
// ===================================================================================
const API_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://tu-url-de-render-aqui'; // <-- ¡IMPORTANTE! Pega aquí tu URL de Render

let userToken = localStorage.getItem('userToken');

// --- CONFIGURACIÓN DE RED (AUTO-DETECT) ---
// Si estamos en archivo local (file://), apuntamos a localhost:3000
// Si estamos en servidor (http://), usamos ruta relativa
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

// Inicialización del Cliente
const { createClient } = window.supabase;
const samClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GUARDIÁN DE AUTENTICACIÓN ---
// Se ejecuta al cargar la página. Si no hay token, redirige al login.
(async () => {
    const { data: { session } } = await samClient.auth.getSession();
    if (!session && window.location.pathname.endsWith('index.html')) {
        console.log("🛡️ Guardián: No hay sesión. Redirigiendo al portal de acceso...");
        window.location.href = 'login.html';
    }
})();

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

// --- CONTROL GLOBAL ---
let raceModalShownOnce = false;  // Bandera para mostrar modal solo una vez

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
    "Has despejado el frente por ahora. Si aún te queda energía, escribe una gesta pequeña// --- CONFIGURACIÓN DE ACCESO ---
const SUPABASE_URL = 'https://alehttakkwirudssxaru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZWh0dGFra3dpcnVkc3N4YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTc1OTMsImV4cCI6MjA4NTY5MzU5M30.zLi9AqD1JkIGGLLUmb7bTg5a9ZAK2mFh3Mr_dslcDww';

// ===================================================================================
// CONFIGURACIÓN CENTRAL
// ===================================================================================
const API_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://tu-url-de-render-aqui'; // <-- ¡IMPORTANTE! Pega aquí tu URL de Render

let userToken = localStorage.getItem('userToken');

// --- CONFIGURACIÓN DE RED (AUTO-DETECT) ---
// Si estamos en archivo local (file://), apuntamos a localhost:3000
// Si estamos en servidor (http://), usamos ruta relativa
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

// Inicialización del Cliente
const { createClient } = window.supabase;
const samClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GUARDIÁN DE AUTENTICACIÓN ---
// Se ejecuta al cargar la página. Si no hay token, redirige al login.
(async () => {
    const { data: { session } } = await samClient.auth.getSession();
    if (!session && window.location.pathname.endsWith('index.html')) {
        console.log("🛡️ Guardián: No hay sesión. Redirigiendo al portal de acceso...");
        window.location.href = 'login.html';
    }
})();

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

// --- CONTROL GLOBAL ---
let raceModalShownOnce = false;  // Bandera para mostrar modal solo una vez

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
    "Has despejado el frente por ahora. Si aún te queda energía, escribe una gesta pequeña
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
            const errorMsg = data.error || "La respuesta de Sam se perdió en el viento. Prueba otra vez";
            mostrarRespuestaSam([{ reply: errorMsg }]);
        }
    } catch (err) {
        console.error(err);
        tempMsg.innerText = "❌ Error al contactar con Sam.";
        tempMsg.className = "text-xs text-red-500 p-2";
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
        div.className = "p-3 bg-amber-100/50 rounded-md flex justify-between items-center";
        div.innerHTML = `
            <span class="font-bold">${tarea.titulo_epico}</span>
            <div class="flex gap-2" data-task-id="${tarea.id}">
                <button class="gandalf-choice-btn bg-green-800 text-white px-3 py-1 rounded" data-verdict="exito">Éxito</button>
                <button class="gandalf-choice-btn bg-red-800 text-white px-3 py-1 rounded" data-verdict="fracaso">Fracaso</button>
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

        // Feedback visual
        e.target.parentElement.querySelectorAll('.gandalf-choice-btn').forEach(btn => {
            btn.classList.remove('ring-4', 'ring-white');
        });
        e.target.classList.add('ring-4', 'ring-white');
    }
});

sellarJuicioBtn.addEventListener('click', async () => {
    const successIds = Object.keys(juiciosPendientes).filter(id => juiciosPendientes[id] === 'exito');
    const failureIds = Object.keys(juiciosPendientes).filter(id => juiciosPendientes[id] === 'fracaso');

    if (successIds.length === 0 && failureIds.length === 0) {
        alert("Debes emitir un juicio para cada asunto.");
        return;
    }

    const token = await obtenerToken();
    if (!token) return;

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
        cargarMisiones(); // Recargamos para ver el resultado
    } catch (err) {
        console.error("Error al sellar el juicio:", err);
    }
});


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
                // Ya no es necesario llamar a actualizarPerfilUsuario() para el XP
                renderDedicatedAchievements(); // Refrescar logros
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
            if (playerLevel) playerLevel.innerText = `NIVEL ${p.level}`;
            if (playerTitle) playerTitle.innerText = p.race_title || 'Aventurero';
            if (document.getElementById('playerRace')) document.getElementById('playerRace').innerText = normalizeRaceClient(p.race) || 'Sin Raza';
            if (playerGold) playerGold.innerText = `💰 ${p.gold.toLocaleString()} Oro`;

            // Actualizar Barra de XP (1000 XP por nivel)
            const playerXPBar = document.getElementById('playerXPBar');
            if (playerXPBar) {
                const xpCurrentLevel = p.experience % 1000;
                const progress = (xpCurrentLevel / 1000) * 100;
                playerXPBar.style.width = `${progress}%`;
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
        { id: 'tasks_10', name: 'Aventurero Local', icon: '📜', desc: 'Completa 10 misiones', target: 10, category: 'tasks' },
        { id: 'tasks_25', name: 'Héroe de la Comarca', icon: '🍺', desc: 'Completa 25 misiones', target: 25, category: 'tasks' },
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
        if (raceModalTitle) raceModalTitle.innerText = '¿ERES EL PORTADOR DEL ANILLO?';
        if (raceModalSubtitle) raceModalSubtitle.innerText = 'Solo Sam (S.A.M.) te acompaña y registrará tus gestas. En tus manos está el destino.';
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
                showToast('Debes elegir una raza inicial// --- CONFIGURACIÓN DE ACCESO ---
const SUPABASE_URL = 'https://alehttakkwirudssxaru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZWh0dGFra3dpcnVkc3N4YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTc1OTMsImV4cCI6MjA4NTY5MzU5M30.zLi9AqD1JkIGGLLUmb7bTg5a9ZAK2mFh3Mr_dslcDww';

// ===================================================================================
// CONFIGURACIÓN CENTRAL
// ===================================================================================
const API_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://tu-url-de-render-aqui'; // <-- ¡IMPORTANTE! Pega aquí tu URL de Render

let userToken = localStorage.getItem('userToken');

// --- CONFIGURACIÓN DE RED (AUTO-DETECT) ---
// Si estamos en archivo local (file://), apuntamos a localhost:3000
// Si estamos en servidor (http://), usamos ruta relativa
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

// Inicialización del Cliente
const { createClient } = window.supabase;
const samClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GUARDIÁN DE AUTENTICACIÓN ---
// Se ejecuta al cargar la página. Si no hay token, redirige al login.
(async () => {
    const { data: { session } } = await samClient.auth.getSession();
    if (!session && window.location.pathname.endsWith('index.html')) {
        console.log("🛡️ Guardián: No hay sesión. Redirigiendo al portal de acceso...");
        window.location.href = 'login.html';
    }
})();

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

// --- CONTROL GLOBAL ---
let raceModalShownOnce = false;  // Bandera para mostrar modal solo una vez

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
    "Has despejado el frente por ahora. Si aún te queda energía, escribe una gesta pequeña// --- CONFIGURACIÓN DE ACCESO ---
const SUPABASE_URL = 'https://alehttakkwirudssxaru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZWh0dGFra3dpcnVkc3N4YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTc1OTMsImV4cCI6MjA4NTY5MzU5M30.zLi9AqD1JkIGGLLUmb7bTg5a9ZAK2mFh3Mr_dslcDww';

// ===================================================================================
// CONFIGURACIÓN CENTRAL
// ===================================================================================
const API_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://tu-url-de-render-aqui'; // <-- ¡IMPORTANTE! Pega aquí tu URL de Render

let userToken = localStorage.getItem('userToken');

// --- CONFIGURACIÓN DE RED (AUTO-DETECT) ---
// Si estamos en archivo local (file://), apuntamos a localhost:3000
// Si estamos en servidor (http://), usamos ruta relativa
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

// Inicialización del Cliente
const { createClient } = window.supabase;
const samClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GUARDIÁN DE AUTENTICACIÓN ---
// Se ejecuta al cargar la página. Si no hay token, redirige al login.
(async () => {
    const { data: { session } } = await samClient.auth.getSession();
    if (!session && window.location.pathname.endsWith('index.html')) {
        console.log("🛡️ Guardián: No hay sesión. Redirigiendo al portal de acceso...");
        window.location.href = 'login.html';
    }
})();

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

// --- CONTROL GLOBAL ---
let raceModalShownOnce = false;  // Bandera para mostrar modal solo una vez

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
    "Has despejado el frente por ahora. Si aún te queda energía, escribe una gesta pequeña
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
            const errorMsg = data.error || "La respuesta de Sam se perdió en el viento. Prueba otra vez";
            mostrarRespuestaSam([{ reply: errorMsg }]);
        }
    } catch (err) {
        console.error(err);
        tempMsg.innerText = "❌ Error al contactar con Sam.";
        tempMsg.className = "text-xs text-red-500 p-2";
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
        div.className = "p-3 bg-amber-100/50 rounded-md flex justify-between items-center";
        div.innerHTML = `
            <span class="font-bold">${tarea.titulo_epico}</span>
            <div class="flex gap-2" data-task-id="${tarea.id}">
                <button class="gandalf-choice-btn bg-green-800 text-white px-3 py-1 rounded" data-verdict="exito">Éxito</button>
                <button class="gandalf-choice-btn bg-red-800 text-white px-3 py-1 rounded" data-verdict="fracaso">Fracaso</button>
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

        // Feedback visual
        e.target.parentElement.querySelectorAll('.gandalf-choice-btn').forEach(btn => {
            btn.classList.remove('ring-4', 'ring-white');
        });
        e.target.classList.add('ring-4', 'ring-white');
    }
});

sellarJuicioBtn.addEventListener('click', async () => {
    const successIds = Object.keys(juiciosPendientes).filter(id => juiciosPendientes[id] === 'exito');
    const failureIds = Object.keys(juiciosPendientes).filter(id => juiciosPendientes[id] === 'fracaso');

    if (successIds.length === 0 && failureIds.length === 0) {
        alert("Debes emitir un juicio para cada asunto.");
        return;
    }

    const token = await obtenerToken();
    if (!token) return;

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
        cargarMisiones(); // Recargamos para ver el resultado
    } catch (err) {
        console.error("Error al sellar el juicio:", err);
    }
});


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
                // Ya no es necesario llamar a actualizarPerfilUsuario() para el XP
                renderDedicatedAchievements(); // Refrescar logros
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
            if (playerLevel) playerLevel.innerText = `NIVEL ${p.level}`;
            if (playerTitle) playerTitle.innerText = p.race_title || 'Aventurero';
            if (document.getElementById('playerRace')) document.getElementById('playerRace').innerText = normalizeRaceClient(p.race) || 'Sin Raza';
            if (playerGold) playerGold.innerText = `💰 ${p.gold.toLocaleString()} Oro`;

            // Actualizar Barra de XP (1000 XP por nivel)
            const playerXPBar = document.getElementById('playerXPBar');
            if (playerXPBar) {
                const xpCurrentLevel = p.experience % 1000;
                const progress = (xpCurrentLevel / 1000) * 100;
                playerXPBar.style.width = `${progress}%`;
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
        { id: 'tasks_10', name: 'Aventurero Local', icon: '📜', desc: 'Completa 10 misiones', target: 10, category: 'tasks' },
        { id: 'tasks_25', name: 'Héroe de la Comarca', icon: '🍺', desc: 'Completa 25 misiones', target: 25, category: 'tasks' },
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
        if (raceModalTitle) raceModalTitle.innerText = '¿ERES EL PORTADOR DEL ANILLO?';
        if (raceModalSubtitle) raceModalSubtitle.innerText = 'Solo Sam (S.A.M.) te acompaña y registrará tus gestas. En tus manos está el destino.';
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
                showToast('Debes elegir una raza inicial