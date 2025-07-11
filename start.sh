#!/bin/bash

echo "🚀 Запуск Beton CRM системы..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_status() {
    echo -e "${BLUE}[СИСТЕМА]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[УСПЕХ]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ПРЕДУПРЕЖДЕНИЕ]${NC} $1"
}

print_error() {
    echo -e "${RED}[ОШИБКА]${NC} $1"
}

# Проверка и остановка уже запущенных серверов
print_status "Проверка запущенных серверов на портах 5001 (сервер) и 3000 (клиент)..."

# Функция для завершения процесса по PID
kill_process() {
    local PID=$1
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            print_success "Процесс с PID $PID успешно остановлен."
        else
            print_warning "Не удалось остановить процесс с PID $PID. Возможно, он уже завершён."
        fi
    fi
}

# Проверка и остановка процесса на порту 5001 (сервер)
SERVER_PORT=5001
SERVER_PID=$(lsof -ti tcp:$SERVER_PORT)
if [ -n "$SERVER_PID" ]; then
    print_warning "Обнаружен запущенный сервер на порту $SERVER_PORT (PID: $SERVER_PID). Останавливаю..."
    kill_process $SERVER_PID
    sleep 1
else
    print_success "Порт $SERVER_PORT свободен."
fi

# Проверка и остановка процесса на порту 3000 (клиент)
CLIENT_PORT=3000
CLIENT_PID=$(lsof -ti tcp:$CLIENT_PORT)
if [ -n "$CLIENT_PID" ]; then
    print_warning "Обнаружен запущенный клиент на порту $CLIENT_PORT (PID: $CLIENT_PID). Останавливаю..."
    kill_process $CLIENT_PID
    sleep 1
else
    print_success "Порт $CLIENT_PORT свободен."
fi

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен. Установите Node.js версии 16 или выше."
    exit 1
fi

# Проверка версии Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Требуется Node.js версии 16 или выше. Текущая версия: $(node -v)"
    exit 1
fi

print_success "Node.js версии $(node -v) найден"

# Проверка наличия npm
if ! command -v npm &> /dev/null; then
    print_error "npm не установлен"
    exit 1
fi

print_success "npm версии $(npm -v) найден"

# Проверка .env файлов
print_status "Проверка конфигурации..."

if [ ! -f "server/.env" ]; then
    print_error "Не найден файл server/.env"
    print_warning "Создайте файл server/.env на основе server/.env.example"
    exit 1
fi

if [ ! -f "client/.env" ]; then
    print_warning "Не найден файл client/.env. Используются настройки по умолчанию."
fi

print_success "Конфигурация проверена"

# Установка зависимостей сервера
print_status "Проверка зависимостей сервера..."
cd server
if [ ! -d "node_modules" ]; then
    print_status "Установка зависимостей сервера..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Ошибка установки зависимостей сервера"
        exit 1
    fi
    print_success "Зависимости сервера установлены"
else
    print_success "Зависимости сервера уже установлены"
fi

# Компиляция сервера
print_status "Компиляция сервера..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Ошибка компиляции сервера"
    exit 1
fi
print_success "Сервер скомпилирован"

cd ..

# Установка зависимостей клиента
print_status "Проверка зависимостей клиента..."
cd client
if [ ! -d "node_modules" ]; then
    print_status "Установка зависимостей клиента..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Ошибка установки зависимостей клиента"
        exit 1
    fi
    print_success "Зависимости клиента установлены"
else
    print_success "Зависимости клиента уже установлены"
fi

cd ..

# Функция для завершения процессов
cleanup() {
    print_status "Завершение процессов..."
    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    exit 0
}

# Обработка сигнала завершения
trap cleanup SIGINT SIGTERM

print_success "Система готова к запуску!"
print_status "=================================="
print_status "🖥️  Сервер: http://localhost:5001"
print_status "🌐 Клиент: http://localhost:3000"
print_status "📋 Админка: http://localhost:3000/admin"
print_status "=================================="
print_warning "Для остановки нажмите Ctrl+C"
print_status ""

# Запуск сервера в фоне
print_status "Запуск сервера..."
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Ждем 3 секунды для запуска сервера
sleep 3

# Запуск клиента в фоне
print_status "Запуск клиента..."
cd client
npm start &
CLIENT_PID=$!
cd ..

print_success "Система запущена!"
print_status "Логи процессов:"

# Ожидание завершения процессов
wait 