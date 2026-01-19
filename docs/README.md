# Beton CRM - Документация

Полная документация системы управления заказами бетона с интеграцией Bitrix24.

## 📚 Содержание

### Новые функции (v2.0.0)

1. **[Система API токенов](./API_TOKENS.md)** 🔑
   - Генерация долгосрочных токенов для внешних интеграций
   - Управление токенами (создание, просмотр, отзыв)
   - Аутентификация через X-API-Key заголовок
   - Примеры интеграции (JavaScript, Python, 1C)

2. **[Swagger документация](./SWAGGER.md)** 📖
   - Интерактивная документация API (OpenAPI 3.0)
   - Тестирование эндпоинтов через браузер
   - Генерация клиентских SDK
   - Руководство по документированию новых API

3. **[Синхронизация компаний](./COMPANY_SYNC.md)** 🔄
   - Исправленная архитектура: PostgreSQL → Elasticsearch
   - Увеличение производительности в 30 раз
   - Полнотекстовый поиск по всем полям компании
   - Мониторинг и troubleshooting

## 🚀 Быстрый старт

### Swagger UI

Откройте интерактивную документацию API:

```
http://localhost:5001/api-docs
```

### Создание API токена

1. Авторизуйтесь как администратор:
```bash
curl -X POST http://localhost:5001/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

2. Создайте токен:
```bash
curl -X POST http://localhost:5001/api/tokens/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"purpose": "Тестовая интеграция", "expirationDays": 90}'
```

3. Используйте токен:
```bash
curl -X GET "http://localhost:5001/api/nomenclature/search?query=бетон" \
  -H "X-API-Key: YOUR_API_TOKEN"
```

### Синхронизация данных

1. Импорт из Bitrix24 в PostgreSQL:
```bash
curl -X POST http://localhost:5001/api/sync-manager/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "providerId": "bitrix24",
    "entityType": "company",
    "direction": "import"
  }'
```

2. Индексация в Elasticsearch:
```bash
curl -X POST http://localhost:5001/api/sync/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📋 Архитектура

### Поток данных

```
┌──────────┐
│ Bitrix24 │ Внешняя CRM система
└────┬─────┘
     │ 1. Импорт (sync-manager)
     ↓
┌──────────────┐
│ PostgreSQL   │ Единый источник истины (Source of Truth)
└──────┬───────┘
       │ 2. Индексация (searchSyncService)
       ↓
┌──────────────┐
│ Elastic      │ Поисковый индекс
│ search       │
└──────┬───────┘
       │ 3. Поиск
       ↓
┌──────────────┐
│ Frontend     │ React интерфейс
└──────────────┘
```

### Компоненты системы

#### Backend (Node.js + TypeScript)
- **Express** - REST API сервер
- **TypeORM** - ORM для работы с PostgreSQL
- **PostgreSQL** - Основная база данных
- **Elasticsearch** - Полнотекстовый поиск
- **Redis** - Кеширование API запросов

#### Frontend (React + TypeScript)
- **React Query** - Управление серверным состоянием
- **Axios** - HTTP клиент
- **React Router** - Навигация

#### Интеграции
- **Bitrix24 API** - Синхронизация сделок и контактов
- **JWT** - Аутентификация пользователей
- **API Tokens** - Аутентификация внешних систем

## 🔄 Bitrix24 Integration Modes

Система поддерживает два режима работы:

### 🔌 Local-Only Mode (по умолчанию)

```env
BITRIX24_ENABLED=false
```

- Все данные только в PostgreSQL
- Нет вызовов к Bitrix24 API
- Идеально для разработки

### 🔄 Bitrix24 Integration Mode

```env
BITRIX24_ENABLED=true
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/...
```

- DB-First архитектура
- Асинхронная синхронизация сделок
- Graceful degradation при ошибках

**Подробности:** [BITRIX24_INTEGRATION.md](./BITRIX24_INTEGRATION.md)

## 🔐 Аутентификация

Система поддерживает два метода аутентификации:

### 1. JWT Bearer Token (для пользователей)

```bash
# Получение токена
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Использование
GET /api/nomenclature
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. API Key (для внешних систем)

```bash
# Генерация токена (требуется admin)
POST /api/tokens/generate
Authorization: Bearer JWT_ADMIN_TOKEN
{
  "purpose": "Интеграция с 1C",
  "expirationDays": 180
}

# Использование
GET /api/companies/search?q=test
X-API-Key: pk_live_51NZxxx...xxxxxxx
```

## 📊 API Endpoints

### Компании

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/companies` | Список компаний с фильтрацией |
| GET | `/api/companies/search` | Поиск компаний (автокомплит) |
| GET | `/api/companies/:id` | Получить компанию по ID |
| GET | `/api/companies/by-inn/:inn` | Найти компанию по ИНН |
| POST | `/api/companies` | Создать компанию |
| PUT | `/api/companies/:id` | Обновить компанию |
| DELETE | `/api/companies/:id` | Удалить компанию (soft delete) |

### Номенклатура

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/nomenclature` | Список номенклатуры с фильтрацией |
| GET | `/api/nomenclature/search` | Поиск номенклатуры (автокомплит) |
| GET | `/api/nomenclature/:id` | Получить номенклатуру по ID |
| POST | `/api/nomenclature` | Создать номенклатуру |
| PUT | `/api/nomenclature/:id` | Обновить номенклатуру |
| DELETE | `/api/nomenclature/:id` | Удалить номенклатуру |
| POST | `/api/nomenclature/sync-bitrix` | Синхронизация с Bitrix24 |

### API Токены

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/tokens/generate` | Создать новый API токен |
| GET | `/api/tokens` | Список всех токенов |
| DELETE | `/api/tokens/:tokenId` | Отозвать токен |

### Синхронизация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/sync/start` | Запустить индексацию в Elasticsearch |
| GET | `/api/sync/status` | Статус синхронизации |
| GET | `/api/sync/stats` | Статистика индекса |
| POST | `/api/sync-manager/run` | Импорт из Bitrix24 в PostgreSQL |
| POST | `/api/incremental-sync/:entity` | Инкрементальная синхронизация |

Полный список API эндпоинтов доступен в [Swagger UI](http://localhost:5001/api-docs).

## 🧪 Тестирование

### Unit тесты

```bash
npm test
```

### E2E тесты (Playwright)

```bash
npm run test:e2e
npm run test:headed    # С браузером
npm run test:ui        # Интерактивный режим
```

### API тесты (через Swagger)

1. Откройте http://localhost:5001/api-docs
2. Авторизуйтесь через кнопку "Authorize"
3. Выберите эндпоинт
4. Нажмите "Try it out"
5. Заполните параметры
6. Нажмите "Execute"

## 🛠️ Разработка

### Структура проекта

```
beton-crm/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── pages/         # Страницы
│   │   ├── services/      # API сервисы
│   │   └── utils/         # Утилиты
│   └── package.json
│
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/   # API контроллеры
│   │   ├── services/      # Бизнес-логика
│   │   ├── entities/      # TypeORM сущности
│   │   ├── routes/        # Express маршруты
│   │   ├── middleware/    # Middleware
│   │   └── config/        # Конфигурация
│   └── package.json
│
├── docs/                   # Документация
│   ├── API_TOKENS.md      # Документация API токенов
│   ├── SWAGGER.md         # Документация Swagger
│   ├── COMPANY_SYNC.md    # Документация синхронизации
│   └── README.md          # Этот файл
│
└── scripts/                # Скрипты запуска
    ├── start.sh           # Запуск в production режиме
    ├── start-dev.sh       # Запуск в dev режиме
    └── stop.sh            # Остановка сервисов
```

### Добавление нового API эндпоинта

1. **Создайте контроллер** (`server/src/controllers/yourController.ts`):

```typescript
import { Request, Response } from 'express'

/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Описание эндпоинта
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 */
export const yourHandler = async (req: Request, res: Response) => {
  // Логика
  res.json({ success: true, data: [] })
}
```

2. **Создайте маршрут** (`server/src/routes/yourRoutes.ts`):

```typescript
import { Router } from 'express'
import * as controller from '../controllers/yourController'

const router = Router()
router.get('/', controller.yourHandler)

export default router
```

3. **Зарегистрируйте в app.ts**:

```typescript
import yourRoutes from './routes/yourRoutes'

app.use('/api/your-endpoint', yourRoutes)
```

4. **Проверьте в Swagger UI**: http://localhost:5001/api-docs

### Добавление динамического импорта для сущностей

При работе с TypeORM сущностями используйте динамические импорты, чтобы избежать циклических зависимостей:

```typescript
// ❌ НЕПРАВИЛЬНО - прямой импорт
import { Company } from '../database/entities/Company.entity'

// ✅ ПРАВИЛЬНО - динамический импорт
const { AppDataSource } = await import('../database/config/database.config')
const { Company } = await import('../database/entities/Company.entity')

const companyRepository = AppDataSource.getRepository(Company)
```

## 📈 Производительность

### Оптимизации в v2.0.0

| Операция | v1.0.0 | v2.0.0 | Улучшение |
|----------|--------|--------|-----------|
| Синхронизация 1000 компаний | ~75 сек | ~2.5 сек | **30x быстрее** |
| Поиск компании | ~500 мс | ~50 мс | **10x быстрее** |
| Поиск номенклатуры | ~300 мс | ~30 мс | **10x быстрее** |

### Redis кеширование

Bitrix24 API запросы кешируются в Redis:

- **Срок жизни**: 1 час
- **Стратегия**: Cache-aside
- **Инвалидация**: По TTL или ручная

## 🔧 Конфигурация

### Environment переменные

**Server** (`.env`):
```env
PORT=5001
DB_HOST=localhost
DB_PORT=5489
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=beton_crm
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/...
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://localhost:6396
ELASTICSEARCH_NODE=http://localhost:9200
```

**Client** (`.env`):
```env
REACT_APP_API_URL=http://localhost:5001/api
```

## 🐛 Troubleshooting

### Проблема: Swagger UI не загружается

**Решение:**
1. Проверьте, что сервер запущен: `curl http://localhost:5001/health`
2. Убедитесь, что `setupSwagger(app)` вызывается ДО `authMiddleware`
3. Очистите кеш браузера (Ctrl+Shift+Del)

### Проблема: API токен не работает

**Решение:**
1. Проверьте формат заголовка: `X-API-Key` (регистрозависимый)
2. Убедитесь, что токен не истёк: `GET /api/tokens`
3. Проверьте логи: `docker compose logs -f backend`

### Проблема: Поиск не находит компании

**Решение:**
1. Проверьте Elasticsearch: `curl http://localhost:9200/_cluster/health`
2. Запустите синхронизацию: `POST /api/sync/start`
3. Используйте прямой поиск в PostgreSQL: `GET /api/companies/search`

## 📝 Логирование

Логи можно просматривать через Docker:

```bash
# Все логи
docker compose logs -f

# Только backend
docker compose logs -f backend

# Только frontend
docker compose logs -f frontend

# Поиск по ключевому слову
docker compose logs -f backend | grep -i "error"
docker compose logs -f backend | grep -i "sync"
```

## 🔗 Полезные ссылки

### Документация

- [API Tokens](./API_TOKENS.md) - Управление API токенами
- [Swagger](./SWAGGER.md) - Документирование API
- [Company Sync](./COMPANY_SYNC.md) - Синхронизация компаний
- [Swagger UI](http://localhost:5001/api-docs) - Интерактивная документация

### Внешние ресурсы

- [TypeORM](https://typeorm.io/) - ORM для TypeScript
- [OpenAPI 3.0](https://swagger.io/specification/) - Спецификация API
- [Bitrix24 REST API](https://dev.1c-bitrix.ru/rest_help/) - Документация Bitrix24
- [Elasticsearch](https://www.elastic.co/guide/) - Поисковый движок

## 📞 Поддержка

- **Email**: crm@betonexpress.pro
- **GitHub Issues**: [Создать issue](https://github.com/your-org/beton-crm/issues)

## 📄 Лицензия

Проприетарное ПО. Все права защищены.

---

## История изменений

### v2.0.0 (2026-01-18)

**Новые функции:**
- ✅ Система генерации API токенов для внешних интеграций
- ✅ Swagger документация (OpenAPI 3.0) с интерактивным UI
- ✅ Исправлена синхронизация компаний (PostgreSQL → Elasticsearch)

**Улучшения:**
- ⚡ Производительность синхронизации увеличена в 30 раз
- 🔒 Два метода аутентификации: JWT + API Key
- 📖 Полная документация всех API эндпоинтов
- 🔍 Улучшенный полнотекстовый поиск компаний

**Исправления:**
- 🐛 Исправлена архитектура синхронизации компаний
- 🐛 Устранены циклические зависимости при импорте сущностей
- 🐛 Исправлено построение searchableText для компаний

### v1.0.0 (2025-12-01)

- Первый релиз Beton CRM
- Базовая функциональность CRUD для компаний и номенклатуры
- Интеграция с Bitrix24
- Полнотекстовый поиск через Elasticsearch
