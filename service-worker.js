/**
 * Service Worker para S.A.M. - El Libro Rojo
 */

const CACHE_NAME = 'sam-v5';

// 1. INSTALAR: nada que pre-cachear
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 2. ACTIVAR: Limpiar TODOS los cachés anteriores
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(cacheNames.map((name) => caches.delete(name)));
        })
    );
    self.clients.claim();
});

// 3. FETCH: Network-first para HTML y API; cache-first solo para assets estáticos (css/js/img)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // HTML y API siempre desde red (nunca cachear)
    if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // Assets estáticos: cache-first
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});
