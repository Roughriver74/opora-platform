# Bitrix24 Интеграция

## Обзор

Beton CRM поддерживает два режима работы с Bitrix24:

1. **Только локально** - все данные хранятся только в PostgreSQL (без интеграции)
2. **С Bitrix24** - DB-First архитектура + асинхронная синхронизация сделок

## Режимы работы

### Режим 1: Только локально (Local-Only Mode)

**Когда использовать:**
- Локальная разработка без доступа к Bitrix24
- Тестирование функционала без внешних зависимостей
- Emergency fallback при проблемах с Bitrix24
- Изолированная среда (staging/development)

**Конфигурация:**
```env
BITRIX24_ENABLED=false
# BITRIX24_WEBHOOK_URL не требуется
```

**Поведение системы:**
- ✅ Все заявки сохраняются в PostgreSQL
- ✅ Поиск работает через PostgreSQL + Elasticsearch
- ✅ Компании и контакты локальные (не синхронизируются)
- ⏭️ Синхронизация с Bitrix24 полностью отключена
- ⏭️ Импорт данных из Bitrix24 недоступен

---

### Режим 2: С Bitrix24 (Bitrix24 Integration Mode)

**Когда использовать:**
- Production окружение
- Когда нужна синхронизация сделок с Bitrix24
- Когда требуется двусторонняя интеграция

**Конфигурация:**
```env
BITRIX24_ENABLED=true
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user_id/webhook_key/
```

**Поведение системы:**
- ✅ Заявки сохраняются СНАЧАЛА в PostgreSQL (DB-First)
- ✅ Асинхронная синхронизация сделок с Bitrix24
- ✅ Импорт компаний/контактов из Bitrix24 → PostgreSQL
- ✅ При недоступности Bitrix24 - система продолжает работать (статус = PENDING)
- 🔄 Возможность повторной синхронизации failed заявок

---

## Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|-----------|-------------|-------------|----------|
| `BITRIX24_ENABLED` | Нет | `false` | Включение/отключение интеграции |
| `BITRIX24_WEBHOOK_URL` | Да (если enabled=true) | - | Webhook URL для Bitrix24 REST API |

**Как получить BITRIX24_WEBHOOK_URL:**
1. Зайти в Bitrix24 → Настройки → Разработчикам
2. Входящие вебхуки → Создать новый
3. Выбрать права доступа: CRM (сделки, компании, контакты)
4. Скопировать URL вида: `https://domain.bitrix24.ru/rest/3/token/`

---

## Архитектура DB-First

```
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │ 1. Форма
       ↓
┌──────────────────────────────────────────────────┐
│            Backend (Express)                      │
│                                                   │
│  submitForm() → PostgreSQL (ГАРАНТИРОВАННО)      │
│                        ↓                          │
│                   Submission                      │
│                   сохранена ✅                    │
│                        │                          │
│            ┌───────────┴───────────┐             │
│            │                       │             │
│            ↓                       ↓             │
│     (async)                   (async)            │
│  Elasticsearch              Bitrix24             │
│  (индексация)            (createDeal)            │
│                                                   │
│  Если Bitrix24 падает:                           │
│  - Заявка В БД ✅                                │
│  - Статус: PENDING                               │
│  - Можно повторить позже                         │
└──────────────────────────────────────────────────┘
```

---

## Статусы синхронизации (bitrixSyncStatus)

| Статус | Описание | Действия |
|--------|----------|----------|
| `PENDING` | Ожидает синхронизации | Будет автоматически синхронизирована |
| `SYNCED` | Успешно синхронизирована | Есть `bitrixDealId` |
| `FAILED` | Ошибка при синхронизации | Можно повторить через API |

---

## API для управления синхронизацией

### Ручная синхронизация конкретной заявки

```bash
POST /api/submissions/:id/sync
Authorization: Bearer <token>
```

### Синхронизация всех pending заявок

```bash
POST /api/submissions/sync/pending
Authorization: Bearer <token>
```

### Повторная синхронизация failed заявок

```bash
POST /api/submissions/sync/retry
Authorization: Bearer <token>
```

### Статистика синхронизации

```bash
GET /api/submissions/sync/stats
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "total": 150,
  "synced": 145,
  "pending": 3,
  "failed": 2
}
```

---

## Troubleshooting

### Проблема: Заявки не синхронизируются с Bitrix24

**Симптомы:**
- Заявки создаются в PostgreSQL
- `bitrixSyncStatus` = PENDING или FAILED
- В логах ошибки подключения к Bitrix24

**Решение:**

1. **Проверить флаг интеграции:**
```bash
# В server/.env
BITRIX24_ENABLED=true  # Должно быть true
```

2. **Проверить webhook URL:**
```bash
# Тест доступности
curl -X POST "https://your-domain.bitrix24.ru/rest/user/token/crm.deal.fields"
```

3. **Проверить логи:**
```bash
docker compose logs -f backend | grep -i bitrix
```

4. **Повторить синхронизацию вручную:**
```bash
curl -X POST http://localhost:5001/api/submissions/sync/retry \
  -H "Authorization: Bearer <token>"
```

---

### Проблема: Ошибка "BITRIX24_WEBHOOK_URL не настроен"

**Причина:** `BITRIX24_ENABLED=true` но URL не указан

**Решение:**
```env
# Вариант 1: Отключить интеграцию
BITRIX24_ENABLED=false

# Вариант 2: Добавить webhook URL
BITRIX24_ENABLED=true
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user/token/
```

---

### Проблема: Rate limit ошибка от Bitrix24

**Симптомы:**
- HTTP 429 Too Many Requests
- `bitrixSyncStatus` = FAILED

**Решение:**
- ⏰ Подождать 1 минуту
- 🔄 Система автоматически повторит запрос с exponential backoff
- 📊 Bitrix24 лимит: ~2 запроса в секунду

---

## Best Practices

### 1. Локальная разработка

```env
# .env.local
BITRIX24_ENABLED=false
```

Позволяет работать без зависимости от внешнего сервиса.

---

### 2. Staging окружение

```env
# .env.staging
BITRIX24_ENABLED=true
BITRIX24_WEBHOOK_URL=https://test-domain.bitrix24.ru/rest/...  # Тестовый Bitrix24
```

Используйте отдельный тестовый Bitrix24 портал.

---

### 3. Production окружение

```env
# .env.production
BITRIX24_ENABLED=true
BITRIX24_WEBHOOK_URL=https://domain.bitrix24.ru/rest/...  # Production Bitrix24
```

Настройте мониторинг синхронизации:
```bash
# Проверка статистики раз в час
*/60 * * * * curl http://localhost:5001/api/submissions/sync/stats
```

---

### 4. Emergency Fallback

Если Bitrix24 недоступен более 24 часов:

```bash
# 1. Временно отключить интеграцию
echo "BITRIX24_ENABLED=false" >> .env
docker compose restart backend

# 2. После восстановления Bitrix24
echo "BITRIX24_ENABLED=true" >> .env
docker compose restart backend

# 3. Синхронизировать все pending заявки
curl -X POST http://localhost:5001/api/submissions/sync/pending \
  -H "Authorization: Bearer <token>"
```

---

## Миграция между режимами

### Включение Bitrix24 на существующей системе

1. **Добавить конфигурацию:**
```env
BITRIX24_ENABLED=true
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user/token/
```

2. **Перезапустить backend:**
```bash
docker compose restart backend
```

3. **Синхронизировать существующие заявки:**
```bash
curl -X POST http://localhost:5001/api/submissions/sync/all \
  -H "Authorization: Bearer <token>"
```

---

### Отключение Bitrix24

1. **Изменить конфигурацию:**
```env
BITRIX24_ENABLED=false
```

2. **Перезапустить backend:**
```bash
docker compose restart backend
```

3. **Заявки остаются в PostgreSQL** со статусом PENDING/FAILED

---

## Мониторинг

### Логи

```bash
# Все логи Bitrix24
docker compose logs -f backend | grep -i bitrix

# Только ошибки
docker compose logs -f backend | grep -i "bitrix.*error"

# Статистика синхронизации
docker compose logs -f backend | grep -i "sync.*completed"
```

### Метрики

**Ключевые метрики:**
- Процент успешных синхронизаций (SYNCED / total)
- Средняя задержка синхронизации
- Количество FAILED заявок

**Мониторинг через API:**
```bash
curl -X GET http://localhost:5001/api/submissions/sync/stats \
  -H "Authorization: Bearer <token>"
```

---

## Классификация ошибок

Система автоматически классифицирует ошибки Bitrix24 для оптимальной обработки:

### Сетевые ошибки (Network)
- **Коды:** ECONNABORTED, ENOTFOUND, ETIMEDOUT, ECONNRESET
- **Серьезность:** Низкая
- **Повтор:** Да
- **Сообщение:** "Bitrix24 временно недоступен"

### Клиентские ошибки (4xx)
- **Коды:** 400-499
- **Серьезность:** Высокая (кроме 429 - средняя)
- **Повтор:** Только для 429 (rate limit)
- **Сообщение:** "Ошибка запроса к Bitrix24" или "Превышен лимит запросов"

### Серверные ошибки (5xx)
- **Коды:** 500-599
- **Серьезность:** Средняя
- **Повтор:** Да
- **Сообщение:** "Bitrix24 временно недоступен"

### Неизвестные ошибки
- **Серьезность:** Средняя
- **Повтор:** Да
- **Сообщение:** "Ошибка синхронизации с Bitrix24"

---

## Технические детали

### Проверки интеграции в коде

Система выполняет проверку `bitrix24Service.isEnabled()` в следующих точках:

1. **submitForm()** - перед асинхронной синхронизацией новой заявки
2. **updateSubmission()** - перед обновлением сделки в Bitrix24
3. **updateSubmissionStatus()** - перед изменением статуса сделки
4. **cancelSubmission()** - перед отменой сделки
5. **getSubmissionById()** - перед обогащением данных из каталога

### Поведение при отключенной интеграции

- Все методы `bitrix24Service` возвращают `null` или пустые массивы
- Заявки создаются и обновляются в PostgreSQL без ошибок
- Логи содержат информационные сообщения о пропуске синхронизации
- Система полностью функциональна в режиме "только локально"

---

## История изменений

### v2.1.0 (2026-01-19)
- ✅ Добавлен флаг `BITRIX24_ENABLED`
- ✅ Graceful degradation при отключенной интеграции
- ✅ Улучшена обработка ошибок с классификацией
- ✅ Создана полная документация
- ✅ Добавлены 5 проверок в submissionController
- ✅ Условная инициализация sync системы
