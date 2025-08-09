# Скрипты Beton CRM

## Основные скрипты

### Запуск и остановка

- `./start.sh` - Запуск в production режиме (собранные контейнеры)
- `./start-dev.sh` - Запуск в режиме разработки (с hot reload)
- `./stop.sh` - Остановка всех контейнеров
- `./logs.sh` - Просмотр логов (можно указать сервис: backend, frontend, db, redis)

### Резервное копирование

- `./backup.sh` - Создание резервной копии БД и файлов
- `./restore.sh` - Восстановление из резервной копии

### Миграция данных

- `./migrate.sh` - Миграция данных из MongoDB в PostgreSQL

## Использование

```bash
# Запуск в production
cd scripts
./start.sh

# Запуск в dev режиме
./start-dev.sh

# Просмотр логов backend
./logs.sh backend

# Остановка
./stop.sh
```

## Старые скрипты

Все старые и неиспользуемые скрипты перемещены в `backup-old-scripts/`