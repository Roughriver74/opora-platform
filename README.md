# ОПОРА — Платформа управления визитами и активностями

Прогрессивное веб-приложение (PWA) для управления визитами полевых команд, компаниями и контактами. Опциональная интеграция с Bitrix24 для двусторонней синхронизации данных.

## Ключевые возможности

- Управление визитами (создание, планирование, отслеживание статусов)
- Справочник компаний с адресами и геокодированием
- Управление контактами и ЛПР
- Календарь визитов
- Адаптивная тема (светлая/тёмная)
- Настраиваемая интеграция с Bitrix24
- Автозаполнение адресов через DaData
- Администрирование (маппинг полей, пользователи, настройки)
- Работает на мобильных устройствах (PWA)

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| Frontend | React 18 + TypeScript + MUI v5 |
| База данных | PostgreSQL 14 |
| Миграции | Alembic |
| Деплой | Docker Compose |
| Карты | OpenLayers |

## Быстрый старт

```bash
# Клонировать и запустить
git clone <repo-url>
cd opora-platform
docker-compose up --build

# Сервисы:
# Frontend: http://localhost:4200
# Backend:  http://localhost:4201
# API Docs: http://localhost:4201/docs
```

## Структура проекта

```
opora-platform/
├── app/                    # Python FastAPI backend
│   ├── main.py            # Точка входа
│   ├── config.py          # Настройки из env
│   ├── models.py          # SQLAlchemy модели
│   ├── routers/           # API endpoints
│   ├── services/          # Бизнес-логика
│   ├── schemas/           # Pydantic схемы
│   └── alembic/           # Миграции БД
├── frontend/              # React SPA
│   ├── src/
│   │   ├── pages/         # Страницы
│   │   ├── components/    # UI компоненты
│   │   ├── context/       # Auth + Theme контексты
│   │   ├── theme/         # Система тем (light/dark)
│   │   └── services/      # API клиенты
│   └── public/            # Статика, PWA manifest
├── deploy/                # Nginx конфиги, production compose
├── docker-compose.yml     # Docker orchestration
└── Dockerfile.backend     # Backend image
```

## Конфигурация

Скопируйте `.env.example` в `.env` и настройте переменные. Bitrix24 интеграция опциональна — приложение работает без неё.

## Продакшен

Деплой на `https://opora.b-ci.ru` через Docker Compose. См. `deploy/` для nginx конфигураций и CI/CD.
