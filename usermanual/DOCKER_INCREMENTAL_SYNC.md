# Инкрементальная синхронизация в Docker

## Обзор

Система инкрементальной синхронизации Elasticsearch теперь полностью интегрирована в Docker-окружение и автоматически запускается при старте приложения.

## Автоматический запуск

### При старте приложения

При запуске через `./scripts/start.sh` автоматически выполняется:

1. **Инициализация алиаса Elasticsearch** - создается алиас для безопасного переключения индексов
2. **Полная инкрементальная синхронизация** - загружаются все данные из Bitrix24 в Elasticsearch
3. **Настройка cron-задач** - автоматически настраиваются задачи для регулярной синхронизации

### Cron-задачи

В Docker контейнере автоматически настраиваются следующие cron-задачи:

- **Каждые 2 часа**: Инкрементальная синхронизация (только измененные данные)
- **Ежедневно в 2:00**: Полная синхронизация (все данные)

## Ручное управление

### Запуск инкрементальной синхронизации

```bash
# Обычная инкрементальная синхронизация
./scripts/run-incremental-sync.sh

# Принудительная полная синхронизация
./scripts/run-incremental-sync.sh true

# С настройкой размера пакета
./scripts/run-incremental-sync.sh false 500
```

### Проверка статуса

```bash
# Проверка статуса синхронизации
./scripts/check-sync-status.sh
```

### Просмотр логов

```bash
# Логи cron-синхронизации
docker compose exec backend tail -f logs/incremental-sync-cron.log

# Логи сервера
docker compose logs -f backend
```

## API Endpoints

Все API endpoints доступны внутри Docker контейнера:

### Статус синхронизации

```bash
docker compose exec backend curl http://localhost:3000/api/incremental-sync/status
```

### Синхронизация продуктов

```bash
docker compose exec backend curl -X POST http://localhost:3000/api/incremental-sync/products \
  -H "Content-Type: application/json" \
  -d '{"forceFullSync": false, "batchSize": 200}'
```

### Полная синхронизация

```bash
docker compose exec backend curl -X POST http://localhost:3000/api/incremental-sync/all \
  -H "Content-Type: application/json" \
  -d '{"forceFullSync": true, "batchSize": 200}'
```

### Статистика индекса

```bash
docker compose exec backend curl http://localhost:3000/api/incremental-sync/stats
```

## Мониторинг

### Проверка cron-задач

```bash
# Просмотр настроенных cron-задач
docker compose exec backend crontab -l

# Проверка статуса cron демона
docker compose exec backend ps aux | grep cron
```

### Проверка логов

```bash
# Логи инкрементальной синхронизации
docker compose exec backend tail -f logs/incremental-sync-cron.log

# Логи сервера
docker compose logs -f backend

# Логи Elasticsearch
docker compose logs -f elasticsearch
```

## Устранение проблем

### Проблема: Cron не работает

```bash
# Перезапуск cron демона
docker compose exec backend service cron restart

# Проверка статуса cron
docker compose exec backend ps aux | grep cron
```

### Проблема: Синхронизация не запускается

```bash
# Проверка доступности Elasticsearch
curl http://localhost:9200/_cluster/health

# Проверка доступности API
curl http://localhost:5001/health

# Ручной запуск синхронизации
./scripts/run-incremental-sync.sh true
```

### Проблема: Ошибки в логах

```bash
# Просмотр последних ошибок
docker compose exec backend tail -50 logs/incremental-sync-cron.log

# Очистка метаданных и повторная синхронизация
docker compose exec backend curl -X DELETE http://localhost:3000/api/incremental-sync/metadata
docker compose exec backend curl -X POST http://localhost:3000/api/incremental-sync/all \
  -H "Content-Type: application/json" \
  -d '{"forceFullSync": true}'
```

## Настройка расписания

Для изменения расписания cron-задач:

1. **Остановите контейнер**:

   ```bash
   docker compose down
   ```

2. **Отредактируйте файл** `server/src/scripts/setupCronInDocker.sh`

3. **Пересоберите и запустите**:
   ```bash
   ./scripts/start.sh
   ```

### Примеры расписания

```bash
# Каждые 30 минут
*/30 * * * * cd /app && node dist/scripts/incrementalSyncCron.js >> logs/incremental-sync-cron.log 2>&1

# Каждые 6 часов
0 */6 * * * cd /app && node dist/scripts/incrementalSyncCron.js >> logs/incremental-sync-cron.log 2>&1

# Только в рабочие дни в 9:00
0 9 * * 1-5 cd /app && node dist/scripts/incrementalSyncCron.js >> logs/incremental-sync-cron.log 2>&1
```

## Преимущества Docker-интеграции

### ✅ Автоматизация

- Автоматическая настройка при запуске
- Встроенные cron-задачи
- Автоматическое логирование

### ✅ Изоляция

- Все процессы изолированы в контейнере
- Не влияет на хост-систему
- Легко масштабируется

### ✅ Мониторинг

- Централизованные логи
- Простая диагностика
- Встроенные health checks

### ✅ Надежность

- Автоматический перезапуск при сбоях
- Graceful shutdown
- Отказоустойчивость

## Заключение

Инкрементальная синхронизация полностью интегрирована в Docker-окружение и работает автоматически. Система обеспечивает:

- **Безопасность**: Нет окна недоступности
- **Производительность**: Инкрементальные обновления
- **Надежность**: Автоматическое восстановление
- **Мониторинг**: Детальное логирование

Система готова к использованию в продакшене! 🚀

