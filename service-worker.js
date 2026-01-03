const CACHE_NAME = 'braille-quest-v2';
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/braille-data.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/mascot.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => (
            Promise.all(CORE_ASSETS.map((asset) => cache.add(asset).catch(() => undefined)))
        ))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            const oldCaches = keys.filter((key) => key !== CACHE_NAME);
            return Promise.all(oldCaches.map((key) => caches.delete(key)));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    const acceptsHtml = (event.request.headers.get('accept') || '').includes('text/html');

    if (event.request.mode === 'navigate' || acceptsHtml) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => (
                    caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
                ))
        );
        return;
    }

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => cached);
        })
    );
});
