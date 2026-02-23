// --- CONFIGURACIÓN DE ACCESO ---
const SUPABASE_URL = 'https://alehttakkwirudssxaru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZWh0dGFra3dpcnVkc3N4YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTc1OTMsImV4cCI6MjA4NTY5MzU5M30.zLi9AqD1JkIGGLLUmb7bTg5a9ZAK2mFh3Mr_dslcDww';

// ===================================================================================
// CONFIGURACIÓN CENTRAL
// ===================================================================================
// Esta es la dirección de tu servidor. En local, es localhost. 
// En producción, DEBE ser la URL que te dio Render.
const API_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://samtheredbook.onrender.com'; // <-- URL de Render

let userToken = localStorage.getItem('userToken');

// ELIMINADO: API_BASE ya no es necesario, usamos API_URL para todo.

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

// ===================================================================================
// SECCIÓN 1: DEFINICIÓN DE FUNCIONES PRINCIPALES
// ===================================================================================

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

async function cargarMisiones(mockDate) {
    const token = await obtenerToken();
    if (!token) {
        // Si no hay token, mostramos un mensaje claro en lugar de un error
        if (taskContainer) {
            taskContainer.innerHTML = `
                <div class="text-center mt-20 opacity-50">
                    <p class="text-4xl mb-2">🛡️</p>
                    <p class="italic">"Acceso Denegado. Necesitas el Sello del Rey para leer el libro."</p>
                    <a href="login.html" class="mt-4 inline-block bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">Ir al Login</a>
                </div>`;
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const tareas = data.tasks;

            // Actualizar Sauron HP en tiempo real
            if (tareas.length > 0) {
                const sauronTask = tareas.find(t => t.titulo_epico === 'Sauron');
                if (sauronTask) {
                    updateSauronHP(sauronTask);
                }
            }

            // Actualizar nivel de sombra y renderizar tareas
            const nivelSombra = actualizarNivelSombra(tareas);
            renderizarTareas(tareas);

            // Mostrar saludo de Sam con información del mundo
            const primerSaludo = `
                <p>Bienvenido, Portador del Anillo.</p>
                <p>La Tierra Media está en peligro y solo tú puedes ayudar a restaurar la paz.</p>
                <p>Tu primera misión es explorar los alrededores y reunir información.</p>
            `;
            mostrarRespuestaSam([{ reply: primerSaludo }], true);

            // Si es un nuevo día (24 horas), mostrar mensaje especial
            const lastLogin = localStorage.getItem('lastLogin');
            const ahora = new Date();
            if (!lastLogin || new Date(lastLogin).getDate() !== ahora.getDate()) {
                localStorage.setItem('lastLogin', ahora);
                setTimeout(() => {
                    mostrarRespuestaSam([{ reply: "🌅 Un nuevo día comienza en la Tierra Media. Aprovecha cada momento." }]);
                }, 1000);
            }
        } else {
            console.error("Error al cargar misiones:", data.error);
        }
    } catch (err) {
        console.error("Error de red al cargar misiones:", err);
    }
}

async function enviarChat() {
    // ... (código de la función enviarChat)
}

async function actualizarPerfilUsuario() {
    // ... (código de la función actualizarPerfilUsuario)
}

async function consultarPalantir() {
    // ... (código de la función consultarPalantir)
}

// ===================================================================================
// SECCIÓN 2: INICIALIZACIÓN DE LA APLICACIÓN
// ===================================================================================

// --- BUCLE PRINCIPAL DE INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("⚡ S.R.B. Inicializando...");
    init(); // Llamamos a la función que arranca todo
});

async function init() {
    // El guardián de autenticación ya se habrá ejecutado aquí

    const token = await obtenerToken();
    if (token) {
        userToken = token;
        localStorage.setItem('userToken', token);

        // Cargar todo en paralelo para una experiencia más rápida
        await Promise.all([
            cargarMisiones(),
            actualizarPerfilUsuario(),
            updateSauronHP(),
            consultarPalantir(),
            renderDedicatedAchievements(),
            setupRealtime()
        ]);

        // La carga de inventario y recetas puede ser secundaria
        cargarInventario();
        cargarRecetas();
    }

    // --- REGISTRO DE EVENT LISTENERS ---
    // Solo registramos los listeners después de que todo está definido
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarChat();
            }
        });
        chatInput.addEventListener('input', autoResizeChatInput);
    }

    if (sendGestaBtn) {
        sendGestaBtn.addEventListener('click', enviarChat);
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab) {
                // Ocultar todos los contenedores
                Object.values(containers).forEach(c => c.classList.add('hidden'));
                // Mostrar el contenedor correcto
                if (containers[tab]) {
                    containers[tab].classList.remove('hidden');
                }
                // Ocultar o mostrar el footer del chat
                chatFooter.classList.toggle('hidden', tab !== 'journal');

                // Actualizar estado activo del botón
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // ... (registrar aquí el resto de listeners si los hubiera) ...
}