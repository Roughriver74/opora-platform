# Swagger API Documentation

## Обзор

Интерактивная документация API для Beton CRM на базе OpenAPI 3.0 и Swagger UI. Позволяет просматривать все доступные эндпоинты, их параметры и тестировать запросы прямо из браузера.

## Доступ к документации

### Swagger UI

```
http://localhost:5001/api-docs
```

Интерактивный интерфейс с возможностью:
- Просмотра всех API эндпоинтов
- Тестирования запросов через "Try it out"
- Авторизации через JWT или API Key
- Просмотра схем данных

### Swagger JSON

```
http://localhost:5001/api-docs.json
```

OpenAPI спецификация в формате JSON для:
- Генерации клиентских SDK
- Импорта в Postman/Insomnia
- Автоматизированного тестирования

## Конфигурация

Файл конфигурации: `server/src/config/swagger.ts`

```typescript
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Beton CRM API',
      version: '1.0.0',
      description: 'API документация для Beton CRM...',
      contact: {
        name: 'API Support',
        email: 'crm@betonexpress.pro'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      }
    ],
    // Схемы аутентификации
    components: {
      securitySchemes: {
        bearerAuth: { ... },
        apiKeyAuth: { ... }
      }
    }
  },
  // Файлы для сканирования аннотаций
  apis: [
    './src/controllers/*.ts',
    './src/routes/*.ts'
  ]
}
```

## Схемы аутентификации

### 1. Bearer JWT (bearerAuth)

Используется для пользователей системы.

**Как получить:**
```bash
# Админ
POST /api/auth/admin-login
{
  "username": "admin",
  "password": "admin"
}

# Обычный пользователь
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

**Как использовать в Swagger UI:**
1. Нажать кнопку "Authorize" вверху страницы
2. Выбрать "bearerAuth"
3. Ввести токен: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Нажать "Authorize"

### 2. API Key (apiKeyAuth)

Используется для внешних интеграций.

**Как получить:**
```bash
POST /api/tokens/generate
Authorization: Bearer YOUR_JWT_TOKEN
{
  "purpose": "Интеграция с внешней системой",
  "expirationDays": 90
}
```

**Как использовать в Swagger UI:**
1. Нажать кнопку "Authorize"
2. Выбрать "apiKeyAuth"
3. Ввести токен: `pk_live_51NZxxx...`
4. Нажать "Authorize"

## Документированные эндпоинты

### Номенклатура (Nomenclature)

#### GET /api/nomenclature/search

Поиск номенклатуры для автокомплита в формах.

**Параметры:**
- `query` (string) - Поисковый запрос
- `limit` (integer) - Максимальное количество результатов (по умолчанию: 20)

**Аннотация в коде:**
```typescript
/**
 * @swagger
 * /api/nomenclature/search:
 *   get:
 *     summary: Поиск номенклатуры (для автокомплита)
 *     tags: [Nomenclature]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Поисковый запрос
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Результаты поиска
 *       401:
 *         description: Не авторизован
 */
export const search = async (req: Request, res: Response) => {
  // implementation
}
```

### Компании (Companies)

#### GET /api/companies/search

Поиск компаний для автокомплита.

**Параметры:**
- `q` (string) - Поисковый запрос
- `limit` (integer) - Максимальное количество результатов (по умолчанию: 20)

#### GET /api/companies/by-inn/:inn

Поиск компании по ИНН.

**Параметры:**
- `inn` (path, string, required) - ИНН компании

**Аннотация в коде:**
```typescript
/**
 * @swagger
 * /api/companies/by-inn/{inn}:
 *   get:
 *     summary: Найти компанию по ИНН
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inn
 *         required: true
 *         schema:
 *           type: string
 *         description: ИНН компании
 *     responses:
 *       200:
 *         description: Компания найдена
 *       404:
 *         description: Компания не найдена
 *       401:
 *         description: Не авторизован
 */
```

### API Токены (API Tokens)

#### POST /api/tokens/generate

Генерация нового API токена.

#### GET /api/tokens

Список всех активных токенов.

#### DELETE /api/tokens/:tokenId

Отзыв токена.

## Схемы данных (Schemas)

### Error

Стандартная схема ошибки:

```json
{
  "success": false,
  "message": "Описание ошибки",
  "error": "Детали ошибки"
}
```

### Company

Схема компании:

```json
{
  "id": "uuid",
  "name": "Название компании",
  "inn": "1234567890",
  "kpp": "123456789",
  "phone": "+7 (999) 123-45-67",
  "email": "company@example.com",
  "isActive": true
}
```

### Nomenclature

Схема номенклатуры:

```json
{
  "id": "uuid",
  "name": "Бетон M300",
  "sku": "BET-M300",
  "price": 5500.00,
  "currency": "RUB",
  "isActive": true
}
```

## Добавление документации к новым эндпоинтам

### Шаг 1: Добавить JSDoc комментарий

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Краткое описание
 *     description: Подробное описание (опционально)
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: param1
 *         schema:
 *           type: string
 *         required: false
 *         description: Описание параметра
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/YourSchema'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export const yourHandler = async (req: Request, res: Response) => {
  // implementation
}
```

### Шаг 2: Добавить схему (если нужно)

В `server/src/config/swagger.ts`:

```typescript
components: {
  schemas: {
    YourSchema: {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'Уникальный идентификатор'
        },
        name: {
          type: 'string',
          description: 'Название',
          example: 'Пример названия'
        },
        createdAt: {
          type: 'string',
          format: 'date-time'
        }
      }
    }
  }
}
```

### Шаг 3: Перезапустить сервер

```bash
cd scripts
./stop.sh
./start.sh
```

Swagger автоматически подхватит новые аннотации.

## Использование в разработке

### Тестирование эндпоинтов

1. Откройте http://localhost:5001/api-docs
2. Найдите нужный эндпоинт
3. Нажмите "Try it out"
4. Заполните параметры
5. Нажмите "Execute"
6. Изучите ответ в разделе "Response"

### Генерация Postman коллекции

1. Скопируйте JSON спецификацию:
   ```bash
   curl http://localhost:5001/api-docs.json > beton-crm-api.json
   ```

2. В Postman:
   - File → Import
   - Выберите `beton-crm-api.json`
   - Все эндпоинты импортируются автоматически

### Генерация клиентского SDK

Используйте OpenAPI Generator:

```bash
# TypeScript/Axios
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:5001/api-docs.json \
  -g typescript-axios \
  -o ./generated-client

# Python
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:5001/api-docs.json \
  -g python \
  -o ./generated-client-python
```

## Best Practices

### 1. Группировка тегами

Используйте логические группы:

```typescript
/**
 * @swagger
 * tags:
 *   name: Companies
 *   description: Управление компаниями
 */
```

### 2. Описание параметров

Всегда добавляйте `description` и `example`:

```typescript
parameters:
  - in: query
    name: limit
    schema:
      type: integer
      default: 20
      minimum: 1
      maximum: 100
    description: Максимальное количество результатов
    example: 50
```

### 3. Примеры ответов

Добавляйте примеры для успешных и ошибочных ответов:

```typescript
responses:
  200:
    description: Успешный ответ
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Company'
        example:
          id: "123e4567-e89b-12d3-a456-426614174000"
          name: "ООО Ромашка"
          inn: "7701234567"
```

### 4. Переиспользование компонентов

Используйте `$ref` для общих схем:

```typescript
responses:
  401:
    $ref: '#/components/responses/Unauthorized'
  500:
    $ref: '#/components/responses/InternalError'
```

### 5. Версионирование API

Указывайте версию в info:

```typescript
info: {
  title: 'Beton CRM API',
  version: '2.0.0',
  description: 'Изменения: добавлена поддержка API токенов'
}
```

## Настройка внешнего вида

### Кастомизация UI

В `server/src/config/swagger.ts`:

```typescript
swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Beton CRM API Docs',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,  // Сохранять токены
    displayRequestDuration: true, // Показывать время запроса
    filter: true,                 // Поиск по эндпоинтам
    syntaxHighlight: {
      theme: 'monokai'            // Тема подсветки
    }
  }
})
```

### Добавление логотипа

```typescript
info: {
  title: 'Beton CRM API',
  version: '1.0.0',
  description: '...',
  'x-logo': {
    url: 'https://your-domain.com/logo.png',
    altText: 'Beton CRM Logo'
  }
}
```

## Troubleshooting

### Swagger UI не загружается

**Проверьте:**
1. Сервер запущен и доступен на порту 5001
2. `setupSwagger(app)` вызывается ДО `app.use(authMiddleware)`
3. Нет ошибок в консоли браузера (F12)

### Эндпоинт не отображается

**Причины:**
1. Нет JSDoc аннотации `@swagger`
2. Файл не включен в `apis` массив в swagger.ts
3. Синтаксическая ошибка в YAML аннотации

**Решение:**
- Проверьте путь файла в `apis: ['./src/controllers/*.ts']`
- Проверьте отступы в YAML (должны быть пробелы, не табы)

### Ошибка "401 Unauthorized" при тестировании

**Причины:**
1. Токен не указан в "Authorize"
2. Токен истёк
3. Неправильный формат токена

**Решение:**
- Нажмите "Authorize" и введите актуальный токен
- Для Bearer auth формат: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Для API Key формат: `pk_live_51NZxxx...`

### Схемы не отображаются

**Проверьте:**
```typescript
// В swagger.ts должно быть:
components: {
  schemas: {
    YourSchema: { ... }
  }
}

// В аннотации:
schema:
  $ref: '#/components/schemas/YourSchema'
```

## Производство (Production)

### Отключение Swagger в production

```typescript
// server/src/config/swagger.ts
export function setupSwagger(app: Express): void {
  if (process.env.NODE_ENV === 'production') {
    return // Не подключать Swagger в production
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}
```

### Защита паролем

```typescript
import basicAuth from 'express-basic-auth'

app.use('/api-docs', basicAuth({
  users: { 'admin': process.env.SWAGGER_PASSWORD || 'password' },
  challenge: true
}), swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

### Изменение URL

```typescript
// Вместо /api-docs использовать /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

## Ссылки

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI GitHub](https://github.com/swagger-api/swagger-ui)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
- [OpenAPI Generator](https://openapi-generator.tech/)

## История изменений

### v1.0.0 (2026-01-18)
- ✅ Настроена интеграция Swagger UI
- ✅ Добавлены схемы аутентификации (Bearer + API Key)
- ✅ Задокументированы эндпоинты Nomenclature
- ✅ Задокументированы эндпоинты Companies
- ✅ Задокументированы эндпоинты API Tokens
- ✅ Созданы базовые схемы данных (Error, Company, Nomenclature)
