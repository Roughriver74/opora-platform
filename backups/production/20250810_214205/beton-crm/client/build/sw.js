const CACHE_NAME = 'beton-crm-v1'
const MAX_CACHE_SIZE = 30 * 1024 * 1024 // 30MB для слабых устройств
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 часа

// Критически важные ресурсы для кэширования
const CRITICAL_RESOURCES = [
	'/',
	'/static/css/main.css',
	'/static/js/main.js',
	'/manifest.json',
	'/favicon.ico',
]

// API эндпоинты для кэширования
const CACHEABLE_APIS = ['/api/form-fields', '/api/forms', '/api/bitrix']

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(cache => {
			console.log('📦 Caching critical resources')
			return cache.addAll(CRITICAL_RESOURCES)
		})
	)
	self.skipWaiting()
})

self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(cacheName => {
					if (cacheName !== CACHE_NAME) {
						console.log('🗑️ Deleting old cache:', cacheName)
						return caches.delete(cacheName)
					}
				})
			)
		})
	)
	self.clients.claim()
})

self.addEventListener('fetch', event => {
	const request = event.request
	const url = new URL(request.url)

	// Игнорируем Chrome extension запросы
	if (url.protocol === 'chrome-extension:') {
		return
	}

	// Стратегия кэширования для статических ресурсов
	if (
		request.destination === 'script' ||
		request.destination === 'style' ||
		request.destination === 'image' ||
		request.destination === 'font'
	) {
		event.respondWith(cacheFirst(request))
		return
	}

	// Стратегия для API запросов
	if (CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
		event.respondWith(networkFirst(request))
		return
	}

	// Для HTML страниц - network first с fallback
	if (request.destination === 'document') {
		event.respondWith(networkFirstWithFallback(request))
		return
	}
})

// Cache First стратегия для статических ресурсов
async function cacheFirst(request) {
	try {
		const cachedResponse = await caches.match(request)
		if (cachedResponse) {
			return cachedResponse
		}

		const networkResponse = await fetch(request)

		if (networkResponse.ok) {
			const cache = await caches.open(CACHE_NAME)

			// Проверяем размер кэша перед добавлением
			await manageCacheSize(cache)
			cache.put(request, networkResponse.clone())
		}

		return networkResponse
	} catch (error) {
		console.error('Cache first failed:', error)
		throw error
	}
}

// Network First стратегия для API
async function networkFirst(request) {
	try {
		const networkResponse = await fetch(request)

		if (networkResponse.ok) {
			const cache = await caches.open(CACHE_NAME)

			// Кэшируем только GET запросы
			if (request.method === 'GET') {
				await manageCacheSize(cache)
				cache.put(request, networkResponse.clone())
			}
		}

		return networkResponse
	} catch (error) {
		// Fallback к кэшу если сеть недоступна
		const cachedResponse = await caches.match(request)
		if (cachedResponse) {
			console.log('📦 Serving from cache (offline):', request.url)
			return cachedResponse
		}

		throw error
	}
}

// Network First с fallback для HTML
async function networkFirstWithFallback(request) {
	try {
		return await fetch(request)
	} catch (error) {
		const cachedResponse = await caches.match('/')
		if (cachedResponse) {
			return cachedResponse
		}

		// Создаем простую offline страницу
		return new Response(
			`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Офлайн - Beton CRM</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: #f5f5f5;
            }
            .offline { 
              background: white; 
              padding: 30px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>📱 Нет соединения</h1>
            <p>Проверьте подключение к интернету и обновите страницу</p>
            <button onclick="window.location.reload()">🔄 Обновить</button>
          </div>
        </body>
      </html>
    `,
			{
				headers: { 'Content-Type': 'text/html' },
			}
		)
	}
}

// Управление размером кэша
async function manageCacheSize(cache) {
	const requests = await cache.keys()
	let totalSize = 0

	// Примерная оценка размера
	for (const request of requests) {
		const response = await cache.match(request)
		if (response) {
			const blob = await response.blob()
			totalSize += blob.size
		}

		// Если превышен лимит, удаляем старые записи
		if (totalSize > MAX_CACHE_SIZE) {
			console.log('🗑️ Cache size exceeded, cleaning up')

			// Удаляем первые 25% записей (самые старые)
			const toDelete = requests.slice(0, Math.floor(requests.length * 0.25))
			await Promise.all(toDelete.map(req => cache.delete(req)))
			break
		}
	}
}

// Периодическая очистка устаревших данных
setInterval(() => {
	caches.open(CACHE_NAME).then(cache => {
		cache.keys().then(requests => {
			requests.forEach(request => {
				cache.match(request).then(response => {
					if (response) {
						const cacheDate = response.headers.get('date')
						if (cacheDate) {
							const age = Date.now() - new Date(cacheDate).getTime()
							if (age > CACHE_DURATION) {
								cache.delete(request)
							}
						}
					}
				})
			})
		})
	})
}, 60 * 60 * 1000) // Каждый час
