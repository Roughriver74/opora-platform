/* Service Worker для OPORA PWA */
const CACHE_NAME = 'opora-v1';
const STATIC_ASSETS = [
  '/',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
];

// Install: кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Игнорируем ошибки при первоначальном кэшировании (файлы могут не существовать)
      });
    })
  );
  self.skipWaiting();
});

// Activate: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: стратегия Network First для API, Cache First для статики
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API запросы — только сеть, без кэша
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Статические ресурсы — Cache First
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // Обновляем кэш в фоне
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response);
                });
              }
            })
            .catch(() => {});
          return cached;
        }

        // Нет в кэше — сеть
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && event.request.method === 'GET') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Оффлайн-фолбэк для navigation запросов
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
    );
  }
});
