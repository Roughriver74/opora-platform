# OPORA — Руководство по деплою

## Обзор скриптов

| Скрипт | Назначение |
|--------|-----------|
| `deploy.sh` | Основной скрипт деплоя (prod/dev, поддерживает --blue-green) |
| `blue-green-deploy.sh` | Zero-downtime деплой через смену активного слота |
| `rollback.sh` | Быстрый откат к предыдущей версии |

---

## Стандартный деплой

```bash
# Деплой в prod
bash deploy/deploy.sh prod

# Деплой в dev
bash deploy/deploy.sh dev

# Деплой без пересборки образов (быстрее)
bash deploy/deploy.sh prod --skip-build
```

---

## Blue-Green деплой (zero-downtime)

Zero-downtime деплой: новый контейнер поднимается рядом со старым,
проходит health check, затем трафик переключается.

```bash
# Через основной скрипт
bash deploy/deploy.sh prod --blue-green

# Напрямую на сервере
COMPOSE_FILE=docker-compose.prod.yml \
APP_DIR=/opt/opora \
bash deploy/blue-green-deploy.sh
```

### Как работает

```
[build new image]
      |
[start new backend container]
      |
[alembic upgrade head]  <── откат если упало
      |
[health check new backend]  <── откат если не прошёл
      |
[update frontend]
      |
[nginx -s reload]  (без разрыва соединений)
      |
[image prune]
      |
[final health check]
```

### Переменные окружения

| Переменная | По умолчанию | Описание |
|-----------|-------------|---------|
| `COMPOSE_FILE` | `docker-compose.prod.yml` | Путь к compose-файлу |
| `APP_DIR` | `/opt/opora` | Рабочая директория на сервере |
| `HEALTH_URL` | `http://localhost:8000/api/health` | URL для health check |
| `HEALTH_RETRIES` | `12` | Количество попыток health check |
| `HEALTH_INTERVAL` | `5` | Интервал между попытками (сек) |

---

## Откат (Rollback)

### Быстрый откат через Docker-образ (рекомендуется)

Если blue-green-deploy.sh запускался, он автоматически сохраняет
предыдущий образ как `opora-backend:previous`. Откат занимает ~15 секунд.

```bash
bash deploy/rollback.sh --image-only
```

### Откат через git

Откатывает git на предыдущий коммит и пересобирает образы.

```bash
bash deploy/rollback.sh --git-only
```

### Автоматический откат (по умолчанию)

Сначала пробует откат через образ `:previous`, если не помогает — через git.

```bash
bash deploy/rollback.sh
```

### Переменные окружения для rollback

```bash
COMPOSE_FILE=docker-compose.prod.yml \
APP_DIR=/opt/opora \
bash deploy/rollback.sh
```

---

## Первоначальная настройка сервера

```bash
# Создать директорию
mkdir -p /opt/opora

# Скопировать .env файл
scp .env root@31.128.39.123:/opt/opora/.env

# Первый запуск (обычный деплой, не blue-green)
bash deploy/deploy.sh prod

# Последующие обновления (zero-downtime)
bash deploy/deploy.sh prod --blue-green
```

---

## Мониторинг

```bash
# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Логи backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Health check вручную
curl http://localhost:8000/api/health

# Образы (включая :previous для отката)
docker images | grep opora
```

---

## Частые проблемы

### Health check не проходит

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs --tail=50 backend

# Проверить статус БД
docker-compose -f docker-compose.prod.yml exec db pg_isready
```

### Миграции упали

```bash
# Выполнить вручную
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Откатить последнюю миграцию
docker-compose -f docker-compose.prod.yml exec backend alembic downgrade -1

# Посмотреть историю миграций
docker-compose -f docker-compose.prod.yml exec backend alembic history
```

### Nginx не перезагружается

```bash
# Проверить конфигурацию
nginx -t

# Перезагрузить вручную
systemctl reload nginx
# или в Docker
docker exec $(docker ps -qf name=nginx) nginx -s reload
```
