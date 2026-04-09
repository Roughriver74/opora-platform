# West Visit - Документация по деплою

Руководство по настройке и деплою прогрессивного веб-приложения (PWA) West Visit на сервер.

## Описание проекта

West Visit - PWA для отслеживания и управления визитами медицинских представителей с интеграцией с Bitrix24.

### Технологический стек
- **Frontend**: React с TypeScript, Material-UI с темной темой
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (в отдельном контейнере)
- **Контейнеризация**: Docker и Docker Compose
- **Веб-сервер**: Nginx в качестве обратного прокси

### Ключевые особенности
- **PWA**: Поддержка оффлайн-режима и установки на устройства
- **Адаптивный дизайн**: Оптимизированный интерфейс для мобильных и десктопных устройств
- **Bitrix24 интеграция**: Двусторонняя синхронизация данных
- **Равномерные отступы**: Оптимизированная стилизация интерфейса

## Среды разработки

Система имеет два окружения:
- **Production**: `visit.west-it.ru` - основное рабочее окружение
- **Development**: `dev.visit.west-it.ru` - среда разработки и тестирования

## Настройка сервера

### Требования к серверу
- Ubuntu 20.04+ или другой современный Linux
- Docker и Docker Compose
- Nginx
- Certbot для SSL
- Git

### Первоначальная настройка сервера

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Docker и других необходимых пакетов
apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx git

# Включение Docker
systemctl enable docker
systemctl start docker

# Создание директорий для проекта
mkdir -p /var/www/west-visit/prod
mkdir -p /var/www/west-visit/dev
```

## Структура ветвления Git

Проект использует следующие ветки:

- **main**: Основная ветка для продакшен-кода
- **develop**: Ветка для текущей разработки
- **feature/<функция>**: Ветки для разработки новых функций
- **bugfix/<описание>**: Ветки для исправления ошибок
- **release/<версия>**: Ветки для подготовки релизов

### Процесс деплоя

1. Изменения разрабатываются в ветках `feature/*` или `bugfix/*`
2. После завершения работы создается Pull Request в `develop`
3. После тестирования в среде разработки создается ветка `release/*`
4. После финального тестирования `release/*` мержится в `main` и `develop`
- `main` - для Production окружения
- `dev` - для Development окружения

Автоматический деплой настроен через GitHub Actions:
- Push в ветку `main` -> деплой на Production
- Push в ветку `dev` -> деплой на Development

## Автоматический деплой

### Настройка GitHub Actions

1. В репозитории GitHub добавьте секрет `SSH_PRIVATE_KEY` с приватным SSH-ключом для подключения к серверу.
2. В проекте уже настроены файлы конфигурации в `.github/workflows/`:
   - `deploy-prod.yml` - для деплоя на Production
   - `deploy-dev.yml` - для деплоя на Development

### Создание SSH ключа (при необходимости)

```bash
# Создание ключа
ssh-keygen -t ed25519 -f ~/.ssh/west_visit_deploy -N "" -C "west_visit_deploy"

# Копирование публичного ключа на сервер
cat ~/.ssh/west_visit_deploy.pub | ssh root@31.128.37.26 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Добавление приватного ключа в GitHub Secrets
cat ~/.ssh/west_visit_deploy
```

## Ручной деплой

Для ручного деплоя используйте скрипт `deploy.sh`:

```bash
# Сделать скрипт исполняемым
chmod +x deploy/deploy.sh

# Деплой в Production
./deploy/deploy.sh prod

# Деплой в Development
./deploy/deploy.sh dev
```

## Структура проекта на сервере

```
/var/www/west-visit/
├── prod/                  # Production окружение
│   ├── app/               # Бэкенд (FastAPI)
│   ├── frontend/          # Фронтенд (React)
│   └── docker-compose.yml # Конфигурация контейнеров
│
└── dev/                   # Development окружение
    ├── app/               # Бэкенд (FastAPI)
    ├── frontend/          # Фронтенд (React)
    └── docker-compose.yml # Конфигурация контейнеров
```

## Конфигурация Nginx

- Production: `/etc/nginx/sites-available/visit.west-it.ru`
- Development: `/etc/nginx/sites-available/dev.visit.west-it.ru`

Nginx настроен как обратный прокси:
- Запросы к корневому пути (`/`) -> Frontend
- Запросы к `/api/*` -> Backend
- Специальная обработка для PWA-файлов (manifest.json, статические ресурсы)

## SSL сертификаты

Сертификаты Let's Encrypt настраиваются автоматически с помощью Certbot:

```bash
certbot --nginx -d visit.west-it.ru --non-interactive --agree-tos --email admin@west-it.ru
certbot --nginx -d dev.visit.west-it.ru --non-interactive --agree-tos --email admin@west-it.ru
```

## Особенности интеграции с Bitrix24

### Настройка синхронизации

1. В `.env` файле необходимо указать:
   ```
   BITRIX24_WEBHOOK_URL=https://crmwest.ru/rest/156/fnonb6nklg81kzy1/
   BITRIX24_ENTITY_TYPE_ID_VISIT=1054
   ```

2. Убедитесь, что в Битриксе созданы соответствующие типы сущностей и поля

3. При необходимости обновите маппинги полей в административном интерфейсе

### Обработка даты/времени

При работе с полями даты и времени в Bitrix24 необходимо учитывать:

- Корректное указание типа поля (`date`, `datetime`) в маппинге полей
- Использование формата ISO 8601 для передачи дат в API
- Особенности обработки часовых поясов

Приложение интегрируется с Bitrix24 через API:
- Endpoint API: https://crmwest.ru/rest/156/fnonb6nklg81kzy1/
- Важно правильно настроить маппинг полей между Bitrix24 и локальной базой данных:
  - Поля Bitrix24 имеют префикс `UF_CRM_` и верхний регистр
  - Локальная база хранит поля без префикса и в нижнем регистре
  - Особая обработка для ИНН (поле `UF_CRM_1741267701427` -> `inn`)

## Управление Docker контейнерами

### Запуск контейнеров

```bash
# Production
cd /var/www/west-visit/prod
docker-compose up -d

# Development
cd /var/www/west-visit/dev
docker-compose up -d
```

### Остановка контейнеров

```bash
# Production
cd /var/www/west-visit/prod
docker-compose down

# Development
cd /var/www/west-visit/dev
docker-compose down
```

### Просмотр логов

```bash
# Production
cd /var/www/west-visit/prod
docker-compose logs -f

# Development
cd /var/www/west-visit/dev
docker-compose logs -f
```

### Перезапуск отдельных сервисов

```bash
# Перезапуск только backend на Production
cd /var/www/west-visit/prod
docker-compose restart app

# Перезапуск только frontend на Development
cd /var/www/west-visit/dev
docker-compose restart frontend
```

## Резервное копирование базы данных

```bash
# Резервное копирование Production
docker exec -t west-visit_prod_db_1 pg_dump -U west_visit west_visit_prod > /var/backups/west_visit_prod_$(date +%Y-%m-%d).sql

# Резервное копирование Development
docker exec -t west-visit_dev_db_1 pg_dump -U west_visit west_visit_dev > /var/backups/west_visit_dev_$(date +%Y-%m-%d).sql
```

## Устранение неполадок

### Проблемы с подключением к базе данных
- Проверьте доступность контейнера PostgreSQL: `docker ps | grep postgres`
- Проверьте логи базы данных: `docker-compose logs db`
- Убедитесь, что переменные окружения правильно настроены в docker-compose.yml

### Проблемы с Nginx
- Проверьте статус Nginx: `systemctl status nginx`
- Проверьте конфигурацию: `nginx -t`
- Проверьте логи: `tail -f /var/log/nginx/error.log`

### Проблемы с SSL
- Обновите сертификаты: `certbot renew`
- Проверьте статус сертификатов: `certbot certificates`
