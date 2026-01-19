# Быстрый старт

Пошаговая инструкция для начала работы с новыми функциями Beton CRM v2.0.0.

## 🎯 Что нового в v2.0.0

1. **API Токены** - долгосрочные токены для внешних интеграций
2. **Swagger UI** - интерактивная документация API
3. **Улучшенная синхронизация** - PostgreSQL → Elasticsearch (в 30 раз быстрее)

---

## ⚡ 5-минутный старт

### Шаг 1: Откройте Swagger UI

Перейдите в браузере:
```
http://localhost:5001/api-docs
```

Вы увидите интерактивную документацию всех API эндпоинтов.

### Шаг 2: Авторизуйтесь

1. Нажмите кнопку **"Authorize"** вверху страницы
2. В поле **bearerAuth** введите JWT токен:

**Получить токен админа:**
```bash
curl -X POST http://localhost:5001/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'
```

Скопируйте значение `token` из ответа и вставьте в Swagger UI.

### Шаг 3: Создайте API токен

В Swagger UI:
1. Найдите раздел **API Tokens**
2. Разверните `POST /api/tokens/generate`
3. Нажмите **"Try it out"**
4. Введите:
   ```json
   {
     "purpose": "Моя первая интеграция",
     "expirationDays": 30
   }
   ```
5. Нажмите **"Execute"**

Сохраните токен из ответа - он больше не будет показан!

### Шаг 4: Используйте API токен

Теперь можете делать запросы с токеном:

```bash
curl -X GET "http://localhost:5001/api/companies/search?q=тест" \
  -H "X-API-Key: ВАШ_ТОКЕН_ЗДЕСЬ"
```

---

## 🔄 Синхронизация данных

### Импорт компаний из Bitrix24

```bash
curl -X POST http://localhost:5001/api/sync-manager/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН" \
  -d '{
    "providerId": "bitrix24",
    "entityType": "company",
    "direction": "import"
  }'
```

### Индексация в Elasticsearch

```bash
curl -X POST http://localhost:5001/api/sync/start \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН"
```

### Проверка результата

```bash
curl -X GET "http://localhost:5001/api/companies/search?q=ромашка&limit=5" \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН"
```

---

## 📚 Примеры использования

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_KEY = 'ваш-api-токен';
const BASE_URL = 'http://localhost:5001/api';

// Поиск компаний
async function searchCompanies(query) {
  const response = await axios.get(`${BASE_URL}/companies/search`, {
    params: { q: query, limit: 20 },
    headers: { 'X-API-Key': API_KEY }
  });
  return response.data;
}

// Использование
searchCompanies('ромашка').then(data => {
  console.log('Найдено компаний:', data.data.length);
  data.data.forEach(company => {
    console.log(`- ${company.label}`);
  });
});
```

### Python

```python
import requests

API_KEY = 'ваш-api-токен'
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

# Использование
result = search_companies('ромашка')
print(f"Найдено компаний: {len(result['data'])}")
for company in result['data']:
    print(f"- {company['label']}")
```

### cURL (для тестирования)

```bash
# Поиск номенклатуры
curl -X GET "http://localhost:5001/api/nomenclature/search?query=бетон&limit=10" \
  -H "X-API-Key: ваш-api-токен"

# Получить компанию по ИНН
curl -X GET "http://localhost:5001/api/companies/by-inn/7701234567" \
  -H "X-API-Key: ваш-api-токен"

# Создать новую компанию
curl -X POST http://localhost:5001/api/companies \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ваш-api-токен" \
  -d '{
    "name": "ООО Тестовая компания",
    "inn": "1234567890",
    "phone": "+7 (999) 123-45-67",
    "email": "test@example.com"
  }'
```

---

## 🎓 Обучающие задачи

### Задача 1: Создайте API токен и протестируйте поиск

1. Создайте API токен через Swagger UI
2. Сохраните токен в переменную окружения:
   ```bash
   export BETON_API_KEY="ваш-токен"
   ```
3. Протестируйте поиск:
   ```bash
   curl -X GET "http://localhost:5001/api/companies/search?q=тест" \
     -H "X-API-Key: $BETON_API_KEY"
   ```

### Задача 2: Напишите скрипт импорта компаний

Создайте файл `import_companies.py`:

```python
import requests
import csv

API_KEY = 'ваш-токен'
BASE_URL = 'http://localhost:5001/api'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Чтение из CSV
with open('companies.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        company_data = {
            'name': row['name'],
            'inn': row['inn'],
            'phone': row['phone'],
            'email': row['email']
        }

        response = requests.post(
            f'{BASE_URL}/companies',
            json=company_data,
            headers=headers
        )

        if response.status_code == 201:
            print(f"✅ Создана: {row['name']}")
        else:
            print(f"❌ Ошибка: {row['name']} - {response.text}")
```

### Задача 3: Настройте автоматическую синхронизацию

Создайте скрипт `sync_daily.sh`:

```bash
#!/bin/bash

API_KEY="ваш-токен"
BASE_URL="http://localhost:5001/api"

echo "$(date) - Запуск синхронизации..."

# 1. Импорт из Bitrix24
curl -X POST "${BASE_URL}/sync-manager/run" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "providerId": "bitrix24",
    "entityType": "company",
    "direction": "import"
  }'

echo "$(date) - Импорт завершён"

# 2. Индексация в Elasticsearch
curl -X POST "${BASE_URL}/sync/start" \
  -H "X-API-Key: ${API_KEY}"

echo "$(date) - Индексация завершена"
```

Добавьте в crontab:
```bash
0 2 * * * /path/to/sync_daily.sh >> /var/log/beton-sync.log 2>&1
```

---

## 🔍 Полезные команды

### Проверка статуса системы

```bash
# Здоровье API
curl http://localhost:5001/health

# Статус синхронизации
curl -X GET http://localhost:5001/api/sync/status \
  -H "X-API-Key: ваш-токен"

# Статистика индекса
curl -X GET http://localhost:5001/api/sync/stats \
  -H "X-API-Key: ваш-токен"
```

### Управление токенами

```bash
# Список всех токенов
curl -X GET http://localhost:5001/api/tokens \
  -H "Authorization: Bearer ваш-jwt-токен"

# Отозвать токен
curl -X DELETE http://localhost:5001/api/tokens/UUID-ТОКЕНА \
  -H "Authorization: Bearer ваш-jwt-токен"
```

### Поиск и фильтрация

```bash
# Поиск компаний
curl -X GET "http://localhost:5001/api/companies/search?q=строительство&limit=50" \
  -H "X-API-Key: ваш-токен"

# Поиск номенклатуры
curl -X GET "http://localhost:5001/api/nomenclature/search?query=бетон&limit=50" \
  -H "X-API-Key: ваш-токен"

# Получить список компаний с пагинацией
curl -X GET "http://localhost:5001/api/companies?page=1&limit=20&sortBy=name&sortOrder=ASC" \
  -H "X-API-Key: ваш-токен"
```

---

## 🐛 Решение проблем

### Проблема: "401 Unauthorized"

**Решение:**
```bash
# Проверьте формат заголовка (X-API-Key, не X-Api-Key)
curl -X GET http://localhost:5001/api/companies/search?q=test \
  -H "X-API-Key: ваш-токен" -v

# Проверьте статус токена
curl -X GET http://localhost:5001/api/tokens \
  -H "Authorization: Bearer jwt-токен"
```

### Проблема: Поиск ничего не находит

**Решение:**
```bash
# 1. Проверьте наличие данных в PostgreSQL
curl -X GET "http://localhost:5001/api/companies?limit=5" \
  -H "X-API-Key: ваш-токен"

# 2. Запустите синхронизацию
curl -X POST http://localhost:5001/api/sync/start \
  -H "X-API-Key: ваш-токен"

# 3. Попробуйте снова
curl -X GET "http://localhost:5001/api/companies/search?q=test" \
  -H "X-API-Key: ваш-токен"
```

### Проблема: Swagger UI не открывается

**Решение:**
```bash
# 1. Проверьте, что сервер запущен
curl http://localhost:5001/health

# 2. Очистите кеш браузера (Ctrl+Shift+Del)

# 3. Попробуйте другой браузер

# 4. Проверьте логи
cd scripts
./logs.sh backend
```

---

## 📖 Дополнительные ресурсы

### Документация

- [API Tokens - полное руководство](./API_TOKENS.md)
- [Swagger - документирование API](./SWAGGER.md)
- [Company Sync - синхронизация компаний](./COMPANY_SYNC.md)
- [Главная документация](./README.md)

### Swagger UI

```
http://localhost:5001/api-docs
```

Используйте Swagger UI для:
- Изучения всех доступных эндпоинтов
- Тестирования запросов
- Просмотра схем данных
- Авторизации и выполнения запросов

### Логи

```bash
# Просмотр логов backend
docker compose logs -f backend

# Поиск ошибок
docker compose logs -f backend | grep -i error

# Логи синхронизации
docker compose logs -f backend | grep -i sync
```

---

## 🚀 Следующие шаги

После освоения основ:

1. **Изучите расширенные возможности**
   - Фильтрация и сортировка результатов
   - Массовые операции через bulk API
   - Инкрементальная синхронизация

2. **Интегрируйте в свою систему**
   - Создайте клиентский SDK
   - Настройте автоматическую синхронизацию
   - Добавьте мониторинг и алерты

3. **Оптимизируйте производительность**
   - Используйте Redis кеширование
   - Настройте индексы PostgreSQL
   - Оптимизируйте Elasticsearch запросы

4. **Обеспечьте безопасность**
   - Регулярно ротируйте API токены
   - Настройте rate limiting
   - Мониторьте необычную активность

---

## 💡 Полезные советы

### Tip 1: Сохраняйте токены безопасно

```bash
# ❌ ПЛОХО - в коде
const API_KEY = 'pk_live_51NZ...'

# ✅ ХОРОШО - в переменных окружения
const API_KEY = process.env.BETON_API_KEY
```

### Tip 2: Используйте минимальные права

Создавайте отдельные токены для каждой интеграции с конкретным назначением:

```json
{
  "purpose": "1C:Бухгалтерия - экспорт заказов",
  "expirationDays": 90
}
```

### Tip 3: Мониторьте использование

Регулярно проверяйте `lastUsedAt` токенов и отзывайте неиспользуемые:

```bash
curl -X GET http://localhost:5001/api/tokens \
  -H "Authorization: Bearer jwt-токен" | jq '.data[] | select(.lastUsedAt < "2026-01-01")'
```

### Tip 4: Используйте Swagger для разработки

Swagger UI - отличный инструмент для:
- Изучения API без чтения кода
- Быстрого тестирования запросов
- Генерации примеров кода
- Проверки схем данных

---

## 🎉 Готово!

Вы готовы использовать Beton CRM API. Если возникнут вопросы, обратитесь к полной документации или свяжитесь с поддержкой.

**Email поддержки**: crm@betonexpress.pro

**Документация**: http://localhost:5001/api-docs
