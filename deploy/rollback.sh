#!/bin/bash
set -e

# ─── Rollback скрипт для OPORA ───────────────────────────────────────────────
#
# Откатывает к предыдущей версии:
#   1. Через Docker-образ :previous (если blue-green-deploy.sh создал его)
#   2. Через git reset --hard на предыдущий коммит + пересборку
#
# Использование:
#   bash deploy/rollback.sh [--git-only] [--image-only]
#
# Флаги:
#   --git-only    — откатывать только git, образ :previous не использовать
#   --image-only  — использовать только образ :previous (без git reset)
#
# Переменные окружения:
#   COMPOSE_FILE  — путь к docker-compose файлу (по умолчанию docker-compose.prod.yml)
#   APP_DIR       — рабочая директория (по умолчанию /opt/opora)
#   HEALTH_URL    — URL для проверки работоспособности
# ──────────────────────────────────────────────────────────────────────────────

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
APP_DIR="${APP_DIR:-/opt/opora}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8000/api/health}"

GIT_ONLY=false
IMAGE_ONLY=false

# Парсинг аргументов
for arg in "$@"; do
    case $arg in
        --git-only)   GIT_ONLY=true ;;
        --image-only) IMAGE_ONLY=true ;;
    esac
done

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()     { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log_ok()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}$*${NC}"; }
log_warn(){ echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}WARNING: $*${NC}"; }
error()   { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}ERROR: $*${NC}" >&2; exit 1; }

health_check() {
    local url="$1"
    local retries="${2:-6}"
    local interval="${3:-5}"
    local attempt=0

    log "Health check: $url (макс. ${retries} попыток)"
    while [ "$attempt" -lt "$retries" ]; do
        if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
            log_ok "Health check пройден"
            return 0
        fi
        attempt=$((attempt + 1))
        log "  Попытка $attempt/$retries — ожидание ${interval}s..."
        sleep "$interval"
    done
    return 1
}

# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
log "=== ROLLBACK OPORA ==="
log "Compose file : $COMPOSE_FILE"
log "App dir      : $APP_DIR"

cd "$APP_DIR"

[ -f "$COMPOSE_FILE" ] || error "Файл $COMPOSE_FILE не найден в $(pwd)"

# ─── Стратегия 1: откат через образ :previous (быстрый, без git reset) ────────
if [ "$GIT_ONLY" = "false" ] && docker image inspect opora-backend:previous > /dev/null 2>&1; then
    log "Найден образ opora-backend:previous — выполняем быстрый откат..."

    # Помечаем :previous как используемый
    docker tag opora-backend:previous opora-backend:rollback-in-progress

    log "Перезапуск backend с образом :previous..."
    # Принудительно используем сохранённый образ
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --no-build backend 2>/dev/null || \
        docker-compose -f "$COMPOSE_FILE" up -d --no-deps backend

    sleep 8

    if health_check "$HEALTH_URL" 6 5; then
        log_ok "Быстрый откат через :previous успешен!"
        if [ "$IMAGE_ONLY" = "true" ]; then
            log "=== Rollback завершён (image-only режим) ==="
            exit 0
        fi
    else
        log_warn "Откат через :previous не дал рабочего сервиса — переходим к git-откату"
    fi
fi

# ─── Стратегия 2: откат через git + пересборка ────────────────────────────────
if [ "$IMAGE_ONLY" = "false" ] && [ -d ".git" ]; then
    log "Git откат..."

    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    PREV_COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')
    PREV_MSG=$(git log --oneline -2 | tail -1 | cut -d' ' -f2-)

    if [ -z "$PREV_COMMIT" ]; then
        error "Не удалось определить предыдущий коммит. История git слишком короткая?"
    fi

    log "Текущий коммит  : $CURRENT_COMMIT"
    log "Откатываемся к  : $PREV_COMMIT — $PREV_MSG"

    # Сохраняем текущее состояние на случай если передумаем
    git tag "rollback-from-${CURRENT_COMMIT}-$(date '+%Y%m%d%H%M%S')" HEAD 2>/dev/null || true

    git reset --hard "$PREV_COMMIT"
    log_ok "Git reset --hard к $PREV_COMMIT выполнен"

    log "Пересборка образов с предыдущей версией кода..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache backend frontend || \
        error "Пересборка образов завершилась с ошибкой"

    log "Перезапуск сервисов..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps backend frontend || \
        error "Не удалось запустить сервисы после отката"

    log "Ожидание инициализации (10s)..."
    sleep 10

    if health_check "$HEALTH_URL" 6 5; then
        log_ok "=== Git rollback успешен! ==="
        log "Активная версия: $PREV_COMMIT — $PREV_MSG"
    else
        error "Health check провалился после git rollback. Ручное вмешательство необходимо."
    fi
elif [ "$IMAGE_ONLY" = "false" ] && [ ! -d ".git" ]; then
    log_warn "Директория .git не найдена — git откат невозможен"
    error "Откат не удался: ни образ :previous не помог, ни git откат недоступен"
fi

log "=== Rollback завершён ==="
