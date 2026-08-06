const CACHE_NAME = 'shalom-tabernacle-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install - cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('Cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch:
// - HTML pages (index.html / navigation) -> NETWORK-FIRST, so new deploys show immediately
// - Everything else (images, manifest, etc.) -> CACHE-FIRST, for speed + offline support
self.addEventListener('fetch', e => {
  const isPage = e.request.mode === 'navigate' || e.request.destination === 'document';

  if (isPage) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, responseClone);
        });
        return response;
      }).catch(() => {});
    })
  );
});
