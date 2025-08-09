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
- Пароль: (уточните у администратора)

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