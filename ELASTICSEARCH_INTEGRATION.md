# Интеграция Elasticsearch в Beton CRM

## 🎯 Обзор

Интеграция Elasticsearch значительно улучшает возможности поиска в системе, предоставляя:

- **Полнотекстовый поиск** с морфологией русского языка
- **Автодополнение** и предложения
- **Нечеткий поиск** (fuzzy search)
- **Ранжирование результатов** по релевантности
- **Быстрая работа** - поиск в локальном индексе
- **Масштабируемость** - легко добавлять новые поля

## 🏗️ Архитектура

### Компоненты системы

1. **Elasticsearch Service** (`elasticsearchService.ts`)

   - Основной сервис для работы с Elasticsearch
   - Управление индексами и маппингом полей
   - Поиск, автодополнение, агрегации

2. **Search Sync Service** (`searchSyncService.ts`)

   - Синхронизация данных из Bitrix24 в Elasticsearch
   - Массовая индексация документов
   - Управление жизненным циклом данных

3. **Search Controller** (`searchController.ts`)
   - REST API для поиска
   - Совместимость с существующими эндпоинтами
   - Новые возможности поиска

### Индексы Elasticsearch

**Индекс:** `beton_crm_search`

**Типы документов:**

- `product` - товары из каталога
- `company` - компании
- `contact` - контакты

## 🚀 Установка и запуск

### 1. Добавление в Docker Compose

Elasticsearch уже добавлен в `docker-compose.yml`:

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  container_name: beton_elasticsearch
  restart: unless-stopped
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - 'ES_JAVA_OPTS=-Xms512m -Xmx512m'
  ports:
    - '9200:9200'
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data
```

### 2. Переменные окружения

Добавлены переменные для backend:

- `ELASTICSEARCH_HOST=elasticsearch`
- `ELASTICSEARCH_PORT=9200`

### 3. Зависимости

Добавлена зависимость в `package.json`:

```json
"@elastic/elasticsearch": "^8.11.0"
```

## 📡 API Endpoints

### Новые эндпоинты поиска

#### 1. Универсальный поиск

```http
POST /api/search/search
Content-Type: application/json

{
  "query": "бетон",
  "type": "product", // опционально: product, company, contact
  "limit": 20,
  "offset": 0,
  "includeHighlights": true,
  "fuzzy": true
}
```

#### 2. Автодополнение

```http
POST /api/search/suggest
Content-Type: application/json

{
  "query": "бет",
  "type": "product" // опционально
}
```

#### 3. Поиск продуктов

```http
POST /api/search/products
Content-Type: application/json

{
  "query": "бетон М300",
  "limit": 20,
  "offset": 0
}
```

#### 4. Поиск компаний

```http
POST /api/search/companies
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "строительная",
  "limit": 20,
  "offset": 0
}
```

#### 5. Поиск контактов

```http
POST /api/search/contacts
Content-Type: application/json

{
  "query": "Иван",
  "limit": 20,
  "offset": 0
}
```

### Административные эндпоинты

#### 6. Синхронизация данных

```http
POST /api/search/sync
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "type": "products" // опционально: products, companies, contacts, или все
}
```

#### 7. Проверка здоровья

```http
GET /api/search/health
```

#### 8. Статистика индекса

```http
GET /api/search/aggregations
```

## 🔄 Синхронизация данных

### Автоматическая синхронизация

При запуске сервера:

1. Инициализируется индекс Elasticsearch
2. Проверяется здоровье системы
3. Если индекс пустой, предлагается синхронизация

### Ручная синхронизация

```bash
# Синхронизация всех данных
curl -X POST http://localhost:5001/api/search/sync \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"

# Синхронизация только продуктов
curl -X POST http://localhost:5001/api/search/sync \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"type": "products"}'
```

## 🔍 Возможности поиска

### 1. Полнотекстовый поиск

- **Морфология русского языка** - поиск по словоформам
- **Стоп-слова** - исключение служебных слов
- **Стемминг** - приведение к корневой форме

### 2. Нечеткий поиск (Fuzzy Search)

- Автоматическое исправление опечаток
- Поиск по схожим словам
- Настраиваемая чувствительность

### 3. Ранжирование результатов

**Веса полей:**

- `name` - 3x (название)
- `description` - 2x (описание)
- `industry` - 1.5x (отрасль)
- `searchableText` - 1x (общий текст)
- `address` - 1x (адрес)

### 4. Подсветка результатов

```json
{
	"id": "product_123",
	"name": "Бетон М300",
	"highlight": {
		"name": ["<mark>Бетон</mark> М300"],
		"description": ["<mark>Бетон</mark> марки М300 для фундамента"]
	}
}
```

### 5. Автодополнение

- Быстрые предложения при вводе
- Контекстный поиск по типам
- Кэширование популярных запросов

## 📊 Мониторинг и диагностика

### Проверка здоровья

```bash
curl http://localhost:5001/api/search/health
```

Ответ:

```json
{
	"success": true,
	"healthy": true,
	"stats": {
		"documents": 1250,
		"size": "2.5MB",
		"indexName": "beton_crm_search"
	}
}
```

### Статистика по типам

```bash
curl http://localhost:5001/api/search/aggregations
```

Ответ:

```json
{
	"success": true,
	"data": {
		"product": 850,
		"company": 300,
		"contact": 100
	}
}
```

## 🔧 Конфигурация

### Настройки индекса

**Анализатор русского языка:**

- Токенизатор: `standard`
- Фильтры: `lowercase`, `russian_stop`, `russian_stemmer`

**Маппинг полей:**

- `name` - текст с автодополнением
- `description` - текст с морфологией
- `type` - ключевое поле
- `price` - числовое поле
- `createdAt/updatedAt` - даты

### Производительность

**Рекомендуемые настройки:**

- Память: 512MB (минимум)
- Количество шардов: 1 (для single-node)
- Реплики: 0 (для разработки)

## 🚨 Устранение неполадок

### Elasticsearch не запускается

1. Проверьте доступность памяти (минимум 512MB)
2. Убедитесь, что порт 9200 свободен
3. Проверьте логи: `docker logs beton_elasticsearch`

### Поиск не работает

1. Проверьте здоровье: `GET /api/search/health`
2. Убедитесь, что данные синхронизированы
3. Проверьте логи сервера

### Медленный поиск

1. Увеличьте память для Elasticsearch
2. Оптимизируйте запросы (уменьшите `limit`)
3. Проверьте размер индекса

## 🔄 Миграция с текущего поиска

### Поэтапное внедрение

1. **Этап 1:** Elasticsearch работает параллельно с текущим поиском
2. **Этап 2:** Новые эндпоинты используют Elasticsearch
3. **Этап 3:** Постепенная замена старых эндпоинтов
4. **Этап 4:** Полный переход на Elasticsearch

### Совместимость API

Новые эндпоинты возвращают данные в том же формате, что и текущие:

- `/api/search/products` → совместим с `/api/form-fields/bitrix/search/products`
- `/api/search/companies` → совместим с `/api/form-fields/bitrix/search/companies`
- `/api/search/contacts` → совместим с `/api/form-fields/bitrix/search/contacts`

## 📈 Преимущества

### Производительность

- **10-100x быстрее** поиск по сравнению с REST API Bitrix24
- **Локальный индекс** - нет сетевых задержек
- **Кэширование** результатов поиска

### Функциональность

- **Полнотекстовый поиск** с морфологией
- **Автодополнение** в реальном времени
- **Нечеткий поиск** для исправления опечаток
- **Ранжирование** по релевантности

### Масштабируемость

- **Горизонтальное масштабирование** Elasticsearch
- **Легкое добавление** новых полей и типов
- **Агрегации** для аналитики

## 🎯 Следующие шаги

1. **Тестирование** - протестировать все эндпоинты
2. **Оптимизация** - настроить производительность
3. **Мониторинг** - добавить метрики и алерты
4. **Расширение** - добавить поиск по заявкам и формам
5. **Аналитика** - использовать агрегации для отчетов
