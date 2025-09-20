# Быстрый старт: Инкрементальная синхронизация

## Что изменилось

❌ **Старая система**: Полное удаление индекса → окно недоступности 2-3 минуты → риск потери данных

✅ **Новая система**: Создание временного индекса → атомарное переключение → без окна недоступности

## Быстрый запуск

### 1. Инициализация (один раз)

```bash
# Инициализация алиаса Elasticsearch
curl -X POST http://localhost:3000/api/incremental-sync/initialize-alias
```

### 2. Первая синхронизация

```bash
# Полная синхронизация всех данных
curl -X POST http://localhost:3000/api/incremental-sync/all \
  -H "Content-Type: application/json" \
  -d '{"forceFullSync": true}'
```

### 3. Проверка статуса

```bash
# Статус всех синхронизаций
curl -X GET http://localhost:3000/api/incremental-sync/status

# Статистика индекса
curl -X GET http://localhost:3000/api/incremental-sync/stats
```

## Ежедневное использование

### Автоматическая синхронизация

Система автоматически определяет нужна ли полная или инкрементальная синхронизация:

- **Полная**: если прошло больше 24 часов с последней полной синхронизации
- **Инкрементальная**: если прошло меньше 24 часов

### Ручная синхронизация

```bash
# Только продукты
curl -X POST http://localhost:3000/api/incremental-sync/products

# Только компании
curl -X POST http://localhost:3000/api/incremental-sync/companies

# Только заявки
curl -X POST http://localhost:3000/api/incremental-sync/submissions

# Все данные
curl -X POST http://localhost:3000/api/incremental-sync/all
```

## Настройка параметров

```bash
curl -X POST http://localhost:3000/api/incremental-sync/all \
  -H "Content-Type: application/json" \
  -d '{
    "forceFullSync": false,
    "batchSize": 200,
    "maxAgeHours": 12
  }'
```

**Параметры:**

- `forceFullSync`: `true` - принудительная полная синхронизация
- `batchSize`: размер пакета (по умолчанию 100)
- `maxAgeHours`: максимальный возраст для инкрементальной синхронизации (по умолчанию 24)

## Мониторинг

### Логи сервера

```bash
# Просмотр логов в реальном времени
docker compose logs -f server
```

### Статус синхронизации

```bash
curl -X GET http://localhost:3000/api/incremental-sync/status | jq
```

**Пример ответа:**

```json
{
	"success": true,
	"data": [
		{
			"entityType": "products",
			"lastSyncTime": "2024-01-15T10:30:00Z",
			"lastFullSyncTime": "2024-01-15T10:30:00Z",
			"totalRecords": 1250,
			"syncedRecords": 1250,
			"status": "completed"
		}
	]
}
```

## Устранение проблем

### Проблема: Алиас не инициализирован

```bash
curl -X POST http://localhost:3000/api/incremental-sync/initialize-alias
```

### Проблема: Индекс не обновляется

```bash
curl -X POST http://localhost:3000/api/incremental-sync/refresh-index
```

### Проблема: Ошибки синхронизации

```bash
# Очистка метаданных и повторная синхронизация
curl -X DELETE http://localhost:3000/api/incremental-sync/metadata/products
curl -X POST http://localhost:3000/api/incremental-sync/products \
  -H "Content-Type: application/json" \
  -d '{"forceFullSync": true}'
```

## Тестирование

### Запуск тестов

```bash
cd server
./src/scripts/runIncrementalSyncTest.sh
```

### Проверка поиска

```bash
# Тестовый поиск
curl -X GET "http://localhost:3000/api/search?query=бетон&type=product&limit=5"
```

## Преимущества

✅ **Безопасность**: Нет окна недоступности  
✅ **Скорость**: Инкрементальные обновления быстрее  
✅ **Надежность**: Атомарное переключение индексов  
✅ **Мониторинг**: Детальная статистика и логи

## Миграция со старой системы

1. **Остановите старую синхронизацию**
2. **Инициализируйте алиас**: `POST /api/incremental-sync/initialize-alias`
3. **Выполните первую полную синхронизацию**: `POST /api/incremental-sync/all`
4. **Проверьте работу**: `GET /api/incremental-sync/status`

Система готова к использованию! 🚀

