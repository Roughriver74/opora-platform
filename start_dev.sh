#!/bin/bash

# Скрипт для запуска бэкенда и фронтенда в режиме разработки

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

if [ ! -d "app" ] || [ ! -d "frontend" ]; then
    error "Скрипт должен запускаться из корневой папки проекта (где есть папки app и frontend)"
    exit 1
fi

cleanup() {
    log "Остановка процессов..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        log "Бэкенд остановлен (PID: $BACKEND_PID)"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        log "Фронтенд остановлен (PID: $FRONTEND_PID)"
    fi
    rm -f frontend.log 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

log "Запуск системы разработки ОПОРА"
log "=========================================="

info "Проверка зависимостей бэкенда..."
if ! python -c "import aiofiles, aiologger, dadata, apscheduler" 2>/dev/null; then
    warning "Некоторые зависимости бэкенда отсутствуют. Устанавливаем..."
    pip install aiofiles aiologger dadata apscheduler
fi

info "Проверка зависимостей фронтенда..."
if [ ! -d "frontend/node_modules" ]; then
    warning "node_modules не найден. Устанавливаем зависимости..."
    cd frontend
    npm install
    cd ..
fi

info "Очистка кэша TypeScript и предыдущей сборки..."
rm -rf frontend/.tsbuildinfo 2>/dev/null || true
rm -rf frontend/build 2>/dev/null || true
rm -rf frontend/tsconfig.tsbuildinfo 2>/dev/null || true

# Переменные окружения для бэкенда (из .env или дефолтные)
export ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-60}
export ALGORITHM=${ALGORITHM:-HS256}
export BITRIX24_SMART_PROCESS_VISIT_ID=${BITRIX24_SMART_PROCESS_VISIT_ID:-1054}
export BITRIX24_WEBHOOK_URL="${BITRIX_API_ENDPOINT:-}"
export BITRIX_API_ENDPOINT="${BITRIX_API_ENDPOINT:-}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:4200,http://localhost:4201}"
export DATABASE_URL="${DATABASE_URL:-postgresql://opora_user:opora_dev_pass@localhost:4202/opora_dev}"
export POSTGRES_DB="${POSTGRES_DB:-opora_dev}"
export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-opora_dev_pass}"
export POSTGRES_PORT="${POSTGRES_PORT:-4202}"
export POSTGRES_USER="${POSTGRES_USER:-opora_user}"
export SECRET_KEY="${JWT_SECRET:-opora-dev-secret}"

# Запуск бэкенда
log "Запуск бэкенда на порту 4201..."
uvicorn app.main:app --host 0.0.0.0 --port 4201 --reload &
BACKEND_PID=$!

sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    error "Не удалось запустить бэкенд"
    exit 1
fi

log "Бэкенд запущен (PID: $BACKEND_PID) - http://localhost:4201"

# Запуск фронтенда
log "Запуск фронтенда на порту 4200..."
cd frontend

export PORT=${REACT_APP_PORT:-4200}
export REACT_APP_API_URL=http://localhost:4201/api

npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!

cd ..

sleep 8

if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    error "Не удалось запустить фронтенд"
    warning "Логи фронтенда:"
    cat frontend.log 2>/dev/null || echo "Логи недоступны"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

if ! lsof -ti:4200 >/dev/null 2>&1; then
    warning "Порт 4200 не занят, возможно фронтенд еще запускается..."
    sleep 5
    if ! lsof -ti:4200 >/dev/null 2>&1; then
        error "Фронтенд не смог занять порт 4200"
        warning "Логи фронтенда:"
        cat frontend.log 2>/dev/null || echo "Логи недоступны"
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
fi

log "Фронтенд запущен (PID: $FRONTEND_PID) - http://localhost:4200"

log "=========================================="
log "ОПОРА — система разработки запущена!"
log "=========================================="
log "Frontend:       http://localhost:4200"
log "Backend API:    http://localhost:4201"
log "API Docs:       http://localhost:4201/docs"
log "Health Check:   http://localhost:4201/api/health"
log "=========================================="
log "Для остановки нажмите Ctrl+C"
log "=========================================="

wait
