const CACHE_NAME = 'opora-v1';
const STATIC_ASSETS = ['/', '/index.html'];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API calls: network-first with cache fallback
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                JSON.stringify({ error: 'Нет подключения к интернету' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              )
          )
        )
    );
    return;
  }

  // Static assets & app shell: cache-first with network fallback
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            // Only cache same-origin successful responses
            if (response.ok && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // For navigation requests, return cached index.html (SPA fallback)
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Нет подключения', { status: 503 });
          })
    )
  );
});
