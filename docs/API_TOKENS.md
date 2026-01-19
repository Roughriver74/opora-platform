# Система API токенов

## Обзор

Система генерации и управления API токенами для внешних интеграций с Beton CRM. Позволяет создавать долгосрочные токены доступа для внешних систем без необходимости использования JWT токенов пользователей.

## Архитектура

### Компоненты системы

1. **AdminToken Entity** - Сущность базы данных для хранения токенов
2. **apiTokenController.ts** - Контроллер управления токенами
3. **apiTokenRoutes.ts** - Маршруты API
4. **authMiddleware.ts** - Расширенный middleware с поддержкой X-API-Key

### Поток аутентификации

```
Запрос с X-API-Key заголовком
    ↓
authMiddleware проверяет X-API-Key
    ↓
Ищет AdminToken в БД
    ↓
Проверяет isValid() (срок действия, статус)
    ↓
Обновляет lastUsedAt, IP, User-Agent
    ↓
Устанавливает req.user и req.isAdmin
    ↓
Пропускает запрос дальше
```

## API Endpoints

### 1. Генерация токена

**POST** `/api/tokens/generate`

Создает новый API токен для внешней системы.

#### Требования
- Авторизация: JWT Bearer токен
- Права: Администратор

#### Request Body
```json
{
  "purpose": "Интеграция с системой складского учета",
  "expirationDays": 90
}
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| purpose | string | Да | Назначение токена (минимум 1 символ) |
| expirationDays | number | Нет | Срок действия в днях (1-365), по умолчанию 30 |

#### Response 201
```json
{
  "success": true,
  "message": "API токен успешно создан. Сохраните его - он больше не будет показан!",
  "data": {
    "token": "pk_live_51NZxxx...xxxxxxx",
    "tokenId": "uuid-здесь",
    "purpose": "Интеграция с системой складского учета",
    "expiresAt": "2026-04-18T10:30:00.000Z",
    "daysUntilExpiration": 90
  }
}
```

#### Ошибки
- **400** - Некорректные данные (пустой purpose или неверный expirationDays)
- **401** - Не авторизован или не удалось определить пользователя

#### Пример использования
```bash
curl -X POST http://localhost:5001/api/tokens/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "purpose": "Интеграция 1C с Beton CRM",
    "expirationDays": 180
  }'
```

---

### 2. Список токенов

**GET** `/api/tokens`

Получает список всех активных API токенов.

#### Требования
- Авторизация: JWT Bearer токен
- Права: Администратор (видит все токены), обычные пользователи видят только свои

#### Response 200
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "purpose": "Интеграция с 1C",
      "tokenPreview": "pk_live_51NZ...xxx",
      "userId": "uuid-user-1",
      "isActive": true,
      "createdAt": "2026-01-18T10:00:00.000Z",
      "expiresAt": "2026-07-18T10:00:00.000Z",
      "lastUsedAt": "2026-01-18T12:30:00.000Z",
      "daysUntilExpiration": 180,
      "ipAddress": "192.168.1.100",
      "userAgent": "1C/8.3"
    }
  ]
}
```

#### Пример использования
```bash
curl -X GET http://localhost:5001/api/tokens \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Отзыв токена

**DELETE** `/api/tokens/:tokenId`

Отзывает (деактивирует) API токен.

#### Требования
- Авторизация: JWT Bearer токен
- Права: Администратор (может отозвать любой токен), обычные пользователи только свои

#### Path Parameters
| Параметр | Тип | Описание |
|----------|-----|----------|
| tokenId | string (UUID) | ID токена для отзыва |

#### Response 200
```json
{
  "success": true,
  "message": "Токен успешно отозван"
}
```

#### Ошибки
- **404** - Токен не найден
- **403** - Нет прав для отзыва этого токена

#### Пример использования
```bash
curl -X DELETE http://localhost:5001/api/tokens/uuid-токена \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Использование API токенов

### Аутентификация через X-API-Key

После получения токена, используйте его в заголовке `X-API-Key` для аутентификации запросов.

```bash
curl -X GET "http://localhost:5001/api/nomenclature/search?query=бетон" \
  -H "X-API-Key: pk_live_51NZxxx...xxxxxxx"
```

### Приоритет аутентификации

authMiddleware проверяет методы аутентификации в следующем порядке:

1. **X-API-Key** (если присутствует)
2. **Authorization: Bearer JWT** (если X-API-Key отсутствует)
3. **Без аутентификации** (для публичных маршрутов)

### Безопасность

- Токены хранятся в БД в открытом виде (требуется защита на уровне БД)
- При каждом использовании обновляется `lastUsedAt`, `ipAddress`, `userAgent`
- Токены можно отозвать в любой момент
- Истекшие токены автоматически отклоняются
- Все запросы с API ключом получают права администратора

## Swagger документация

Все эндпоинты документированы в Swagger UI:

```
http://localhost:5001/api-docs
```

Раздел: **API Tokens**

## Примеры интеграции

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_KEY = 'pk_live_51NZxxx...xxxxxxx';
const BASE_URL = 'http://localhost:5001/api';

// Поиск номенклатуры
async function searchNomenclature(query) {
  const response = await axios.get(`${BASE_URL}/nomenclature/search`, {
    params: { query, limit: 20 },
    headers: { 'X-API-Key': API_KEY }
  });
  return response.data;
}

// Создание компании
async function createCompany(companyData) {
  const response = await axios.post(`${BASE_URL}/companies`, companyData, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}
```

### Python

```python
import requests

API_KEY = 'pk_live_51NZxxx...xxxxxxx'
BASE_URL = 'http://localhost:5001/api'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Поиск компаний
def search_companies(query):
    response = requests.get(
        f'{BASE_URL}/companies/search',
        params={'q': query, 'limit': 20},
        headers=headers
    )
    return response.json()

# Получить компанию по ИНН
def get_company_by_inn(inn):
    response = requests.get(
        f'{BASE_URL}/companies/by-inn/{inn}',
        headers=headers
    )
    return response.json()
```

### 1C:Enterprise

```bsl
Функция ПоискНоменклатуры(Запрос)

    АдресСервиса = "http://localhost:5001/api/nomenclature/search";
    АдресСПараметрами = АдресСервиса + "?query=" + Запрос + "&limit=20";

    HTTPЗапрос = Новый HTTPЗапрос(АдресСПараметрами);
    HTTPЗапрос.Заголовки.Вставить("X-API-Key", "pk_live_51NZxxx...xxxxxxx");

    Соединение = Новый HTTPСоединение("localhost", 5001);
    HTTPОтвет = Соединение.Получить(HTTPЗапрос);

    Если HTTPОтвет.КодСостояния = 200 Тогда
        Результат = ПрочитатьJSONВЗначение(HTTPОтвет.ПолучитьТелоКакСтроку());
        Возврат Результат;
    Иначе
        ВызватьИсключение "Ошибка поиска: " + HTTPОтвет.КодСостояния;
    КонецЕсли;

КонецФункции
```

## Мониторинг и отладка

### Логи

Система логирует следующие события:

```typescript
// При создании токена
logger.info(`✅ API токен создан: ${adminToken.id} для пользователя ${userId}`)

// При использовании токена
// Обновление в БД происходит автоматически через markAsUsed()

// При отзыве токена
logger.info(`✅ API токен отозван: ${tokenId}`)
```

### Проверка токена

Используйте эндпоинт `/api/tokens` для проверки статуса всех токенов:

```bash
curl -X GET http://localhost:5001/api/tokens \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

Ответ покажет:
- Когда токен был создан
- Когда последний раз использовался
- Сколько дней до истечения
- IP и User-Agent последнего использования

## Безопасность и best practices

### Рекомендации

1. **Храните токены безопасно** - не коммитьте в git, используйте переменные окружения
2. **Используйте минимальный срок действия** - для тестирования 7-30 дней, для production 90-180 дней
3. **Указывайте конкретное назначение** - это поможет при аудите
4. **Регулярно ротируйте токены** - создавайте новый, удаляйте старый
5. **Отзывайте неиспользуемые токены** - проверяйте `lastUsedAt`
6. **Мониторьте использование** - проверяйте необычные IP или User-Agent

### Ограничения

- Токены имеют права администратора
- Нет возможности ограничить токен конкретными эндпоинтами
- Нет rate limiting (планируется в будущем)

## Troubleshooting

### Ошибка: "Недействительный или истекший API ключ"

**Причины:**
1. Токен истёк (expiresAt < now)
2. Токен отозван (isActive = false)
3. Неправильный формат токена

**Решение:**
- Проверьте срок действия через `/api/tokens`
- Создайте новый токен если необходимо

### Ошибка: "Требуются права администратора"

**Причина:** Маршрут требует admin прав, но токен не найден или недействителен

**Решение:**
- Убедитесь, что заголовок `X-API-Key` присутствует
- Проверьте валидность токена

### Токен не работает после создания

**Возможные причины:**
1. Неправильный заголовок (должен быть `X-API-Key`, не `X-Api-Key`)
2. Пробелы или переносы строк в токене
3. Сервер не перезапущен после изменения authMiddleware

## История изменений

### v1.0.0 (2026-01-18)
- ✅ Реализована генерация API токенов
- ✅ Добавлена поддержка X-API-Key в authMiddleware
- ✅ Создан контроллер управления токенами
- ✅ Добавлена Swagger документация
- ✅ Реализовано отслеживание использования (IP, User-Agent, lastUsedAt)
