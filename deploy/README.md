# OPORA - Документация по деплою

Руководство по настройке и деплою платформы OPORA на сервер.

## Структура деплоя

```
deploy/
├── docker-compose.prod.yml    # Production Docker Compose
├── docker-compose.dev.yml     # Development Docker Compose
├── nginx-prod.conf            # Nginx для opora.b-ci.ru
├── nginx-dev.conf             # Nginx для dev.opora.b-ci.ru
├── nginx-dev-improved.conf    # Улучшенный dev nginx с CORS
├── deploy.sh                  # Скрипт деплоя
└── copy_db_dev_to_prod.sh     # Копирование БД из dev в prod
```

## Домены

- **Production**: `opora.b-ci.ru`
- **Development**: `dev.opora.b-ci.ru`

## Порты

| Сервис | Порт |
| --- | --- |
| Frontend (nginx) | 4200 |
| Backend (uvicorn) | 4201 |
| PostgreSQL | 4202 |

## Деплой

```bash
# Production
./deploy.sh prod

# Development
./deploy.sh dev
```

## SSL

Сертификаты генерируются через Let's Encrypt (certbot) автоматически при первом деплое.

## Docker Compose

```bash
# Production
docker-compose -f deploy/docker-compose.prod.yml up --build -d

# Логи
docker-compose -f deploy/docker-compose.prod.yml logs -f

# Остановка
docker-compose -f deploy/docker-compose.prod.yml down
```

## Мониторинг (Prometheus + Grafana)

### Запуск

```bash
# Запустить основные сервисы
docker-compose up -d

# Запустить мониторинг
docker-compose -f docker-compose.monitoring.yml up -d
```

### Доступ

- **Prometheus**: <http://localhost:9090>
- **Grafana**: <http://localhost:3000> (admin / opora-grafana-admin)

### Метрики

Backend автоматически экспортирует метрики на `/metrics`:

- `http_requests_total` — количество запросов по методу/эндпоинту/статусу
- `http_request_duration_seconds` — время ответа (histogram)
- `http_requests_in_progress` — текущие активные запросы
