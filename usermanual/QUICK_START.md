# Beton CRM - Быстрый старт

## Требования

- Docker и Docker Compose
- Порты: 3000 (Frontend), 5001 (Backend), 5489 (PostgreSQL), 6396 (Redis)

## Запуск

### Production режим (рекомендуется)
```bash
cd scripts
./start.sh
```

### Development режим (с hot reload)
```bash
cd scripts
./start-dev.sh
```

## Доступ

После запуска приложение доступно:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

### Учетные данные для входа

**Администратор:**
- Email: crm@betonexpress.pro
- Пароль: admin123


## Управление

```bash
# Просмотр логов
./scripts/logs.sh

# Логи конкретного сервиса
./scripts/logs.sh backend
./scripts/logs.sh frontend

# Остановка
./scripts/stop.sh
```

## Структура проекта

```
beton-crm/
├── client/          # Frontend (React)
├── server/          # Backend (Node.js + TypeScript)
├── scripts/         # Скрипты управления
├── backups/         # Резервные копии
├── docker-compose.yml     # Конфигурация Docker
└── docker-compose.dev.yml # Конфигурация для разработки
```



 Готово! Скрипт sync-db.sh полностью обновлен с расширенной функциональностью:

  ✅ Завершено: Database Sync Tool для Beton CRM

  Основные возможности:

  🔄 Синхронизация данных:
  - pull - Скачивание продакшн БД на локальную машину
  - pull-redis - Синхронизация Redis данных
  - compare - Сравнение схем БД с подробной информацией

  📦 Резервное копирование:
  - backup --server - Бэкап продакшн БД
  - backup --local - Бэкап локальной БД

  🔍 Мониторинг:
  - status - Общий статус всех сервисов
  - status --server - Проверка только сервера
  - status --local - Проверка локальных сервисов

  🛡️ Безопасность:
  - Валидация конфигурации и SSH доступа
  - Проверка свободного места на диске
  - Подтверждение опасных операций
  - Автоматическое создание бэкапов перед изменениями
  - Отключенные команды push и sync-users для безопасности

  Примеры использования:
  ./scripts/sync-db.sh pull                    # Безопасная синхронизация
  ./scripts/sync-db.sh pull --full --force     # Полная синхронизация без подтверждений
  ./scripts/sync-db.sh backup --server         # Бэкап продакшн БД
  ./scripts/sync-db.sh status                  # Проверка всех сервисов
  ./scripts/sync-db.sh help                    # Полная справка

  Скрипт готов к использованию и позволит легко синхронизировать продакшн данные с локальной разработческой средой!