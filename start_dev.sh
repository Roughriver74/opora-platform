#!/bin/bash

# Скрипт для запуска бэкенда и фронтенда в режиме разработки
# Автор: AI Assistant
# Дата: $(date)

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
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

# Проверка, что мы в правильной директории
if [ ! -d "app" ] || [ ! -d "frontend" ]; then
    error "Скрипт должен запускаться из корневой папки проекта (где есть папки app и frontend)"
    exit 1
fi

# Функция для остановки процессов при завершении скрипта
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
    # Очищаем логи
    rm -f frontend.log 2>/dev/null || true
    exit 0
}

# Установка обработчика сигналов
trap cleanup SIGINT SIGTERM

log "🚀 Запуск системы разработки West Visit"
log "=========================================="

# Проверка зависимостей бэкенда
info "Проверка зависимостей бэкенда..."
if ! python -c "import aiofiles, aiologger, dadata, apscheduler" 2>/dev/null; then
    warning "Некоторые зависимости бэкенда отсутствуют. Устанавливаем..."
    pip install aiofiles aiologger dadata apscheduler
fi

# Проверка зависимостей фронтенда
info "Проверка зависимостей фронтенда..."
if [ ! -d "frontend/node_modules" ]; then
    warning "node_modules не найден. Устанавливаем зависимости..."
    cd frontend
    npm install
    cd ..
fi

# Очистка кэша TypeScript и сборки
info "Очистка кэша TypeScript и предыдущей сборки..."
rm -rf frontend/.tsbuildinfo 2>/dev/null || true
rm -rf frontend/build 2>/dev/null || true
rm -rf frontend/tsconfig.tsbuildinfo 2>/dev/null || true

# Переменные окружения для бэкенда
export ACCESS_TOKEN_EXPIRE_MINUTES=60
export ALGORITHM=HS256
export BITRIX24_SMART_PROCESS_VISIT_ID=1054
export BITRIX24_WEBHOOK_URL="https://crmwest.ru/rest/156/fnonb6nklg81kzy1/"
export BITRIX_API_ENDPOINT="https://crmwest.ru/rest/156/fnonb6nklg81kzy1/"
export CORS_ORIGINS="http://localhost:3000,http://localhost:8000"
export DATABASE_URL="postgresql://west_visit:WestVisit_Dev_Pass_2025@31.128.37.26:5433/west_visit_dev"
export POSTGRES_DB=west_visit_dev
export POSTGRES_HOST=31.128.37.26
export POSTGRES_PASSWORD=WestVisit_Dev_Pass_2025
export POSTGRES_PORT=5433
export POSTGRES_USER=west_visit
export SECRET_KEY="your-secret-key-for-development"

# Запуск бэкенда
log "🔧 Запуск бэкенда на порту 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Ждем немного, чтобы бэкенд запустился
sleep 3

# Проверяем, что бэкенд запустился
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    error "Не удалось запустить бэкенд"
    exit 1
fi

log "✅ Бэкенд запущен (PID: $BACKEND_PID) - http://localhost:8000"

# Запуск фронтенда
log "🎨 Запуск фронтенда на порту 3000..."
cd frontend

# Проверяем, есть ли переменная окружения для порта
if [ -z "$REACT_APP_PORT" ]; then
    export PORT=3000
else
    export PORT=$REACT_APP_PORT
fi

# Запускаем фронтенд в фоновом режиме
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Возвращаемся в корневую папку
cd ..

# Ждем немного, чтобы фронтенд запустился
sleep 8

# Проверяем, что фронтенд запустился
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    error "Не удалось запустить фронтенд"
    warning "Логи фронтенда:"
    cat frontend.log 2>/dev/null || echo "Логи недоступны"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Проверяем, что порт 3000 занят
if ! lsof -ti:3000 >/dev/null 2>&1; then
    warning "Порт 3000 не занят, возможно фронтенд еще запускается..."
    sleep 5
    if ! lsof -ti:3000 >/dev/null 2>&1; then
        error "Фронтенд не смог занять порт 3000"
        warning "Логи фронтенда:"
        cat frontend.log 2>/dev/null || echo "Логи недоступны"
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
fi

log "✅ Фронтенд запущен (PID: $FRONTEND_PID) - http://localhost:3000"

# Выводим информацию о запущенных сервисах
log "=========================================="
log "🎉 Система разработки запущена!"
log "=========================================="
log "📱 Фронтенд: http://localhost:3000"
log "🔧 Бэкенд API: http://localhost:8000"
log "📚 API Документация: http://localhost:8000/docs"
log "🔍 Health Check: http://localhost:8000/api/health"
log "=========================================="
log "Для остановки нажмите Ctrl+C"
log "=========================================="

# Ждем завершения процессов
wait
