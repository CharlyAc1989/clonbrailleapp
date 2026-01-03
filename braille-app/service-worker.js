const CACHE_NAME = 'braille-quest-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/braille-data.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Estrategia: Network-First (Intenta red primero, si falla usa caché)
    // Esto es mejor para apps que se actualizan frecuentemente
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la red funciona, actualiza el caché opcionalmente o solo devuelve
                return response;
            })
            .catch(() => {
                // Si falla la red (offline), intenta buscar en el caché
                return caches.match(event.request);
            })
    );
});
