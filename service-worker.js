/**
 * Service Worker para S.A.M. - El Libro Rojo
 * 
 * Propósito:
 * - Cachear archivos estáticos para acceso offline
 * - Permitir instalación como PWA
 * - Acelerar carga subsequent
 */

const CACHE_NAME = 'sam-v1';
const URLS_TO_CACHE = [
    './',
    './index.html',
    './login.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. INSTALAR: Cachear archivos críticos
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker instalándose...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Cacheando archivos críticos...');
            return cache.addAll(URLS_TO_CACHE).catch((err) => {
                console.warn('⚠️ Error al cachear algunos archivos:', err);
                // No fallar completamente si algún URL falla
            });
        })
    );
    self.skipWaiting();
});

// 2. ACTIVAR: Limpiar cachés viejos
self.addEventListener('activate', (event) => {
    console.log('✨ Service Worker activándose...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ Borrando caché antiguo: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. FETCH: Estrategia "Cache First, Network Fallback"
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // No cachear requests POST o de APIs dinámicas
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request).then((response) => {
            // Si está en caché, devolverlo
            if (response) {
                console.log(`✅ Sirviendo desde caché: ${request.url}`);
                return response;
            }

            // Si no, intentar desde la red
            return fetch(request)
                .then((networkResponse) => {
                    // Cachear respuestas exitosas (solo esquemas http/https)
                    if (networkResponse && networkResponse.status === 200) {
                        const url = new URL(request.url);
                        if (url.protocol === 'http:' || url.protocol === 'https:') {
                            const clonedResponse = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, clonedResponse);
                            });
                        }
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Si la red falla y no está en caché, offline
                    console.warn(`📴 Offline - no hay caché para: ${request.url}`);
                    // Podrías devolver una página offline aquí si quisieras
                    return new Response('Modo offline - sin conexión', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain' })
                    });
                });
        })
    );
});

console.log('🔮 Service Worker cargado y listo para el combate');
