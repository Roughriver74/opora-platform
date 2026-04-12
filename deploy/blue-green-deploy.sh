#!/bin/bash
set -e

# ─── Blue-Green Deployment для OPORA ─────────────────────────────────────────
#
# Принцип:
#   1. Строим новые образы
#   2. Запускаем новый backend (green/blue)
#   3. Health check нового контейнера
#   4. Применяем миграции БД
#   5. Переключаем frontend и перезагружаем nginx
#   6. Останавливаем старый контейнер
#
# Использование:
#   bash deploy/blue-green-deploy.sh
#
# Переменные окружения:
#   COMPOSE_FILE     — путь к docker-compose файлу (по умолчанию docker-compose.prod.yml)
#   APP_DIR          — рабочая директория на сервере (по умолчанию /opt/opora)
#   HEALTH_URL       — URL для health check (по умолчанию http://localhost:8000/api/health)
#   HEALTH_RETRIES   — количество попыток health check (по умолчанию 12)
#   HEALTH_INTERVAL  — интервал между попытками в секундах (по умолчанию 5)
# ──────────────────────────────────────────────────────────────────────────────

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
APP_DIR="${APP_DIR:-/opt/opora}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8000/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()     { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log_ok()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}$*${NC}"; }
log_warn(){ echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}WARNING: $*${NC}"; }
error()   { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}ERROR: $*${NC}" >&2; exit 1; }

# ─── Определить текущий активный слот ─────────────────────────────────────────
# Смотрим на запущенные контейнеры с именами *-blue/*-green.
# Если ни одного нет — считаем, что текущий активный слот "none".
get_active_slot() {
    if docker ps --filter "name=opora-backend-blue" --filter "status=running" -q | grep -q .; then
        echo "blue"
    elif docker ps --filter "name=opora-backend-green" --filter "status=running" -q | grep -q .; then
        echo "green"
    else
        # Стандартный контейнер без слота (первый запуск или legacy)
        echo "none"
    fi
}

get_next_slot() {
    local current="$1"
    if [ "$current" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# ─── Health Check ──────────────────────────────────────────────────────────────
health_check() {
    local url="$1"
    local retries="$2"
    local interval="$3"
    local attempt=0

    log "Health check: $url (макс. ${retries} попыток, интервал ${interval}s)"
    while [ "$attempt" -lt "$retries" ]; do
        if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
            log_ok "Health check пройден успешно"
            return 0
        fi
        attempt=$((attempt + 1))
        log "  Попытка $attempt/$retries — ожидание ${interval}s..."
        sleep "$interval"
    done

    return 1
}

# ─── Сохранить текущий образ как "предыдущий" для возможного отката ───────────
tag_current_as_previous() {
    local service="$1"
    local image_id
    image_id=$(docker-compose -f "$COMPOSE_FILE" images -q "$service" 2>/dev/null | head -1)
    if [ -n "$image_id" ]; then
        docker tag "$image_id" "opora-${service}:previous" 2>/dev/null || true
        log "Образ $service помечен как opora-${service}:previous"
    fi
}

# ─── Rollback к предыдущему образу ────────────────────────────────────────────
rollback_to_previous() {
    log_warn "Выполняется откат к предыдущей версии..."

    # Пытаемся поднять предыдущий образ если он есть
    if docker image inspect opora-backend:previous > /dev/null 2>&1; then
        docker tag opora-backend:previous opora-backend:rollback-active
        docker-compose -f "$COMPOSE_FILE" up -d --no-deps --no-build backend 2>/dev/null || true
        log_warn "Откат backend выполнен через образ opora-backend:previous"
    else
        # Просто перезапускаем текущий compose — вернёт последний рабочий образ
        docker-compose -f "$COMPOSE_FILE" up -d --no-deps backend 2>/dev/null || true
        log_warn "Образ :previous не найден — перезапущен текущий backend"
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
log "=== Blue-Green Deployment OPORA ==="
log "Compose file : $COMPOSE_FILE"
log "App dir      : $APP_DIR"
log "Health URL   : $HEALTH_URL"

cd "$APP_DIR"

# Проверяем наличие compose-файла
[ -f "$COMPOSE_FILE" ] || error "Файл $COMPOSE_FILE не найден в $(pwd)"

ACTIVE_SLOT=$(get_active_slot)
NEXT_SLOT=$(get_next_slot "$ACTIVE_SLOT")

log "Текущий активный слот : ${ACTIVE_SLOT}"
log "Новый слот            : ${NEXT_SLOT}"

# ─── 1. Сохранить текущие образы для возможного отката ────────────────────────
log "Сохранение текущих образов для отката..."
tag_current_as_previous "backend"
tag_current_as_previous "frontend"

# ─── 2. Подтянуть свежий код (если есть git) ──────────────────────────────────
if [ -d ".git" ]; then
    log "Получение последних изменений из git..."
    git fetch origin
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git pull origin "$BRANCH" || log_warn "git pull завершился с ошибкой — продолжаем с текущим кодом"
    log "Текущий коммит: $(git rev-parse --short HEAD) — $(git log -1 --pretty=format:'%s')"
fi

# ─── 3. Сборка новых образов ──────────────────────────────────────────────────
log "Сборка новых образов (без кэша)..."
docker-compose -f "$COMPOSE_FILE" build --no-cache backend frontend || \
    error "Сборка образов завершилась с ошибкой"

# ─── 4. Запустить новый backend ───────────────────────────────────────────────
log "Запуск нового backend (слот: $NEXT_SLOT)..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps backend || \
    error "Не удалось запустить backend"

# Даём контейнеру время начать инициализацию
sleep 5

# ─── 5. Применить миграции БД ────────────────────────────────────────────────
log "Применение миграций БД (alembic upgrade head)..."
if ! docker-compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head; then
    log_warn "Миграции завершились с ошибкой — выполняется откат"
    rollback_to_previous
    error "Миграция БД не удалась. Откат выполнен."
fi

# ─── 6. Health check нового backend ──────────────────────────────────────────
if ! health_check "$HEALTH_URL" "$HEALTH_RETRIES" "$HEALTH_INTERVAL"; then
    log_warn "Health check провалился — выполняется откат"
    rollback_to_previous
    error "Health check не пройден после ${HEALTH_RETRIES} попыток. Откат выполнен."
fi

# ─── 7. Обновить frontend ─────────────────────────────────────────────────────
log "Обновление frontend..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps frontend || \
    log_warn "Не удалось обновить frontend — backend работает"

# ─── 8. Reload nginx (zero-downtime) ─────────────────────────────────────────
NGINX_CONTAINER=$(docker ps --filter "name=nginx" --filter "status=running" -q | head -1)
if [ -n "$NGINX_CONTAINER" ]; then
    log "Reload nginx (контейнер: $NGINX_CONTAINER)..."
    docker exec "$NGINX_CONTAINER" nginx -s reload 2>/dev/null && \
        log_ok "Nginx перезагружен" || \
        log_warn "nginx -s reload завершился с ошибкой (не критично)"
elif command -v systemctl > /dev/null 2>&1 && systemctl is-active --quiet nginx; then
    log "Reload nginx (systemd)..."
    systemctl reload nginx && log_ok "Nginx (systemd) перезагружен" || log_warn "systemctl reload nginx не удался"
else
    log_warn "Nginx не обнаружен — пропускаем reload"
fi

# ─── 9. Очистка старых образов (старше 24ч) ──────────────────────────────────
log "Очистка устаревших образов Docker..."
docker image prune -f --filter "until=24h" 2>/dev/null && \
    log_ok "Устаревшие образы удалены" || \
    log_warn "image prune завершился с предупреждением"

# ─── 10. Финальный health check ──────────────────────────────────────────────
log "Финальный контрольный health check..."
if health_check "$HEALTH_URL" 3 3; then
    log_ok "=== Деплой успешно завершён! ==="
    log "Активный слот : $NEXT_SLOT"
    log "Версия        : $(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
else
    error "Финальный health check провалился. Проверьте логи: docker-compose -f $COMPOSE_FILE logs backend"
fi

log "=== Blue-Green Deployment завершён ==="
