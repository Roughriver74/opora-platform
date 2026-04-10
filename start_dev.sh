#!/bin/bash

# ОПОРА — Скрипт запуска в режиме разработки
# PostgreSQL запускается в Docker, backend и frontend — локально с hot-reload

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()     { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }

# Корневая директория проекта
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d "app" ] || [ ! -d "frontend" ]; then
    error "Скрипт должен запускаться из корневой папки проекта"
    exit 1
fi

# --- Порты ---
DB_PORT="${DB_PORT:-4202}"
BACKEND_PORT="${BACKEND_PORT:-4201}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"

# --- PID-ы для cleanup ---
BACKEND_PID=""
FRONTEND_PID=""
DB_CONTAINER="opora_dev_db"

cleanup() {
    echo ""
    log "Остановка сервисов..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null && log "Backend остановлен"
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null && log "Frontend остановлен"
    rm -f frontend.log 2>/dev/null
    # PostgreSQL контейнер оставляем работать (данные сохраняются)
    log "PostgreSQL контейнер ($DB_CONTAINER) продолжает работать. Для остановки: docker stop $DB_CONTAINER"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ============================================
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║        ОПОРА — Dev Mode           ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# 1. Проверка зависимостей системы
# ============================================
info "Проверка системных зависимостей..."

PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    error "Python не найден. Установите Python 3.11+"
    exit 1
fi

PIP_CMD=""
if command -v pip3 &>/dev/null; then
    PIP_CMD="pip3"
elif command -v pip &>/dev/null; then
    PIP_CMD="pip"
else
    error "pip не найден"
    exit 1
fi

if ! command -v node &>/dev/null; then
    error "Node.js не найден. Установите Node.js 18+"
    exit 1
fi

if ! command -v docker &>/dev/null; then
    error "Docker не найден. Установите Docker для запуска PostgreSQL"
    exit 1
fi

log "Python: $($PYTHON_CMD --version), Node: $(node --version), Docker: OK"

# ============================================
# 2. Создание .env если не существует
# ============================================
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        warning ".env файл не найден. Создаю из .env.example..."
        cp .env.example .env
        log ".env создан. Отредактируйте его при необходимости."
    else
        warning "Ни .env ни .env.example не найдены. Создаю .env с дефолтными значениями..."
        cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://opora_user:opora_dev_pass@localhost:4202/opora_dev
POSTGRES_HOST=localhost
POSTGRES_PORT=4202
POSTGRES_USER=opora_user
POSTGRES_PASSWORD=opora_dev_pass
POSTGRES_DB=opora_dev
JWT_SECRET=opora-dev-jwt-secret
BITRIX_API_ENDPOINT=
TOKEN_DADATA=
SECRET_DADATA=
CORS_ORIGINS=http://localhost:4200
ENVIRONMENT=development
DEV_MODE=True
ENVEOF
        log ".env создан с дефолтными значениями."
    fi
fi

# Загружаем .env
set -a
source .env 2>/dev/null || true
set +a

# Перезаписываем для локального режима (не Docker)
export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
export POSTGRES_PORT="${POSTGRES_PORT:-$DB_PORT}"
export DATABASE_URL="postgresql://${POSTGRES_USER:-opora_user}:${POSTGRES_PASSWORD:-opora_dev_pass}@localhost:${DB_PORT}/${POSTGRES_DB:-opora_dev}"
export CORS_ORIGINS="http://localhost:${FRONTEND_PORT},http://localhost:${BACKEND_PORT}"
export DEV_MODE="True"
export ENVIRONMENT="development"

# ============================================
# 3. PostgreSQL в Docker
# ============================================
info "Запуск PostgreSQL в Docker..."

if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log "PostgreSQL уже запущен ($DB_CONTAINER)"
else
    # Освобождаем порт, если занят другим Docker-контейнером
    if lsof -ti:"$DB_PORT" >/dev/null 2>&1; then
        BLOCKING=$(docker ps --format '{{.Names}}' --filter "publish=$DB_PORT" 2>/dev/null | head -1)
        if [ -n "$BLOCKING" ]; then
            warning "Порт $DB_PORT занят контейнером '$BLOCKING'. Останавливаю..."
            docker stop "$BLOCKING" >/dev/null 2>&1
            log "Контейнер '$BLOCKING' остановлен"
        else
            error "Порт $DB_PORT занят не-Docker процессом. Освободите порт или задайте другой: DB_PORT=XXXX ./start_dev.sh"
            exit 1
        fi
    fi

    # Проверяем, есть ли остановленный контейнер
    if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        if ! docker start "$DB_CONTAINER" 2>&1; then
            warning "Не удалось запустить контейнер. Пересоздаю..."
            docker rm -f "$DB_CONTAINER" >/dev/null 2>&1
            docker run -d \
                --name "$DB_CONTAINER" \
                -e POSTGRES_USER="${POSTGRES_USER:-opora_user}" \
                -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-opora_dev_pass}" \
                -e POSTGRES_DB="${POSTGRES_DB:-opora_dev}" \
                -p "${DB_PORT}:5432" \
                --restart unless-stopped \
                postgres:14 >/dev/null 2>&1
            log "PostgreSQL пересоздан и запущен (порт $DB_PORT)"
        else
            log "PostgreSQL перезапущен ($DB_CONTAINER)"
        fi
    else
        docker run -d \
            --name "$DB_CONTAINER" \
            -e POSTGRES_USER="${POSTGRES_USER:-opora_user}" \
            -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-opora_dev_pass}" \
            -e POSTGRES_DB="${POSTGRES_DB:-opora_dev}" \
            -p "${DB_PORT}:5432" \
            --restart unless-stopped \
            postgres:14 >/dev/null 2>&1
        log "PostgreSQL запущен в Docker (порт $DB_PORT)"
    fi

    # Ждём готовности PostgreSQL
    info "Ожидание готовности PostgreSQL..."
    for i in $(seq 1 30); do
        if docker exec "$DB_CONTAINER" pg_isready -U "${POSTGRES_USER:-opora_user}" >/dev/null 2>&1; then
            log "PostgreSQL готов"
            break
        fi
        if [ $i -eq 30 ]; then
            error "PostgreSQL не стартовал за 30 секунд"
            exit 1
        fi
        sleep 1
    done
fi

# ============================================
# 4. Backend зависимости
# ============================================
info "Проверка зависимостей backend..."

# Проверяем ключевые пакеты
if ! $PYTHON_CMD -c "import fastapi, sqlalchemy, uvicorn, alembic" 2>/dev/null; then
    warning "Устанавливаю зависимости backend..."
    $PIP_CMD install -r app/requirements.txt -q
    log "Зависимости backend установлены"
else
    log "Зависимости backend OK"
fi

# ============================================
# 5. Alembic миграции
# ============================================
info "Запуск миграций БД..."
cd "$PROJECT_DIR/app"
if command -v alembic &>/dev/null; then
    alembic upgrade head 2>&1 | tail -3
    log "Миграции применены"
else
    warning "Alembic не найден в PATH, пропускаю миграции"
fi
cd "$PROJECT_DIR"

# ============================================
# 6. Frontend зависимости
# ============================================
info "Проверка зависимостей frontend..."
if [ ! -d "frontend/node_modules" ]; then
    warning "Устанавливаю зависимости frontend..."
    cd frontend && npm install --silent && cd "$PROJECT_DIR"
    log "Зависимости frontend установлены"
else
    log "Зависимости frontend OK (node_modules существует)"
fi

# Очистка кэша TypeScript
rm -rf frontend/.tsbuildinfo frontend/tsconfig.tsbuildinfo 2>/dev/null

# ============================================
# 7. Освобождение портов (убиваем старые процессы)
# ============================================
for CHECK_PORT in "$BACKEND_PORT" "$FRONTEND_PORT"; do
    PIDS=$(lsof -ti:"$CHECK_PORT" 2>/dev/null)
    if [ -n "$PIDS" ]; then
        warning "Порт $CHECK_PORT занят. Останавливаю старые процессы..."
        echo "$PIDS" | xargs kill -9 2>/dev/null
        sleep 1
        log "Порт $CHECK_PORT освобождён"
    fi
done

# ============================================
# 8. Запуск Backend
# ============================================
log "Запуск Backend на порту $BACKEND_PORT..."
$PYTHON_CMD -m uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    error "Backend не удалось запустить. Проверьте логи выше."
    exit 1
fi
log "Backend запущен (PID: $BACKEND_PID)"

# ============================================
# 8. Запуск Frontend
# ============================================
log "Запуск Frontend на порту $FRONTEND_PORT..."
cd frontend
PORT=$FRONTEND_PORT REACT_APP_API_URL="http://localhost:${BACKEND_PORT}/api" npm start > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

# Ждём запуска frontend
info "Ожидание запуска frontend..."
for i in $(seq 1 30); do
    if lsof -ti:"$FRONTEND_PORT" >/dev/null 2>&1; then
        log "Frontend запущен (PID: $FRONTEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        warning "Frontend долго стартует. Проверьте frontend.log"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        error "Frontend упал при запуске. Логи:"
        tail -20 "$PROJECT_DIR/frontend.log" 2>/dev/null
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# ============================================
# Готово!
# ============================================
echo ""
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ОПОРА — Dev Mode запущен!${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "  Frontend:    ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  Backend API: ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "  Swagger:     ${GREEN}http://localhost:${BACKEND_PORT}/docs${NC}"
echo -e "  PostgreSQL:  ${GREEN}localhost:${DB_PORT}${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "  Ctrl+C для остановки"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo ""

# Ждём завершения процессов
wait
