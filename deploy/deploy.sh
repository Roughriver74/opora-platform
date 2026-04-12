#!/bin/bash
set -e

# ─── OPORA Platform Deploy ───────────────────────────────────────────────────
#
# Использование:
#   bash deploy/deploy.sh [prod|dev] [--blue-green] [--skip-build]
#
# Аргументы:
#   prod | dev     — целевое окружение (обязательный, если не задан DEPLOY_ENV)
#   --blue-green   — использовать blue-green deployment (zero-downtime)
#   --skip-build   — пропустить сборку Docker-образов (использовать кэш)
#
# Переменные окружения:
#   PROD_HOST      — IP/хост production сервера (по умолчанию 31.128.39.123)
#   PROD_USER      — SSH пользователь (по умолчанию root)
#   APP_DIR        — директория на сервере (по умолчанию /var/www/opora/<env>)
# ──────────────────────────────────────────────────────────────────────────────

PROD_HOST="${PROD_HOST:-31.128.39.123}"
PROD_USER="${PROD_USER:-root}"

BLUE_GREEN=false
SKIP_BUILD=false
ENV=""

# ─── Парсинг аргументов ────────────────────────────────────────────────────────
for arg in "$@"; do
    case $arg in
        prod|dev)    ENV="$arg" ;;
        --blue-green) BLUE_GREEN=true ;;
        --skip-build) SKIP_BUILD=true ;;
        --help|-h)
            echo "Использование: bash deploy/deploy.sh [prod|dev] [--blue-green] [--skip-build]"
            exit 0
            ;;
        *)
            echo "Неизвестный аргумент: $arg"
            echo "Использование: bash deploy/deploy.sh [prod|dev] [--blue-green] [--skip-build]"
            exit 1
            ;;
    esac
done

# ─── Валидация окружения ───────────────────────────────────────────────────────
if [ -z "$ENV" ]; then
    echo "Ошибка: не указано окружение."
    echo "Использование: bash deploy/deploy.sh [prod|dev] [--blue-green] [--skip-build]"
    exit 1
fi

SERVER="${PROD_USER}@${PROD_HOST}"
DEPLOY_PATH="${APP_DIR:-/var/www/opora/$ENV}"
DOCKER_COMPOSE_FILE="docker-compose.$ENV.yml"
NGINX_CONF="nginx-$ENV.conf"

# ─── Вспомогательные функции ──────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()     { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log_ok()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}$*${NC}"; }
log_warn(){ echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}WARNING: $*${NC}"; }

# ──────────────────────────────────────────────────────────────────────────────
log "=== Deploy OPORA Platform ==="
log "Окружение    : $ENV"
log "Сервер       : $SERVER"
log "Путь         : $DEPLOY_PATH"
log "Blue-Green   : $BLUE_GREEN"
log "Skip Build   : $SKIP_BUILD"
log "Compose file : $DOCKER_COMPOSE_FILE"

# ─── 1. Создание директорий на сервере ────────────────────────────────────────
log "Создание директорий на сервере..."
ssh "$SERVER" "mkdir -p $DEPLOY_PATH"

# ─── 2. Синхронизация кода ────────────────────────────────────────────────────
log "Синхронизация кода на сервер (rsync)..."
rsync -avz --delete \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='frontend/build/' \
    --exclude='frontend/node_modules/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='*.log' \
    . "${SERVER}:${DEPLOY_PATH}/"

# ─── 3. Копирование docker-compose файла ─────────────────────────────────────
log "Копирование docker-compose файла..."
scp "deploy/$DOCKER_COMPOSE_FILE" "${SERVER}:${DEPLOY_PATH}/docker-compose.yml"

# ─── 4. Nginx конфигурация ────────────────────────────────────────────────────
if [ "$ENV" = "prod" ]; then
    DOMAIN="opora.b-ci.ru"
else
    DOMAIN="dev.opora.b-ci.ru"
fi

if [ -f "deploy/$NGINX_CONF" ]; then
    log "Копирование nginx конфигурации ($DOMAIN)..."
    scp "deploy/$NGINX_CONF" "${SERVER}:/etc/nginx/sites-available/$DOMAIN"

    log "Активация nginx конфигурации..."
    ssh "$SERVER" "ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
else
    log_warn "Файл deploy/$NGINX_CONF не найден — пропускаем nginx конфигурацию"
fi

# ─── 5. SSL сертификаты (только если нет) ────────────────────────────────────
log "Проверка SSL сертификатов..."
ssh "$SERVER" "if [ ! -d /etc/letsencrypt/live/$DOMAIN ]; then
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@opora.b-ci.ru
fi"

# ─── 6. Деплой на сервере ─────────────────────────────────────────────────────
log "Запуск деплоя на сервере..."

ssh "$SERVER" bash << REMOTE_EOF
    set -e
    cd "${DEPLOY_PATH}"

    if [ "$BLUE_GREEN" = "true" ]; then
        # ── Blue-Green деплой (zero-downtime) ──────────────────────────────────
        echo "[remote] Запуск blue-green deployment..."
        COMPOSE_FILE="docker-compose.yml" \
        APP_DIR="${DEPLOY_PATH}" \
            bash deploy/blue-green-deploy.sh

    else
        # ── Стандартный деплой ─────────────────────────────────────────────────
        echo "[remote] Стандартный деплой..."

        if [ "$SKIP_BUILD" = "false" ]; then
            docker-compose -f docker-compose.yml build --no-cache
        fi

        docker-compose -f docker-compose.yml down --remove-orphans
        docker-compose -f docker-compose.yml up -d

        # Применение миграций
        echo "[remote] Применение миграций БД..."
        sleep 10
        docker-compose -f docker-compose.yml exec -T backend alembic upgrade head

        # Health check
        echo "[remote] Health check..."
        attempt=0
        until curl -sf http://localhost:8000/api/health > /dev/null 2>&1 || [ \$attempt -ge 12 ]; do
            attempt=\$((attempt + 1))
            echo "[remote]   Попытка \$attempt/12..."
            sleep 5
        done
        if ! curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
            echo "[remote] ERROR: Health check провалился"
            exit 1
        fi
        echo "[remote] Health check пройден"
    fi
REMOTE_EOF

# ─── 7. Финальное сообщение ───────────────────────────────────────────────────
log_ok "=== Деплой OPORA ($ENV) завершён успешно! ==="
log "URL: https://$DOMAIN"
