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

# Проверка наличия Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен. Установите Docker для продолжения."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker не запущен. Запустите Docker Desktop."
        exit 1
    fi
    
    print_success "Docker найден и запущен"
}

# Проверка и запуск контейнеров БД
start_database_containers() {
    print_status "Проверка контейнеров базы данных..."
    
    # Проверка PostgreSQL
    if [ "$(docker ps -q -f name=beton_postgres)" ]; then
        print_success "PostgreSQL контейнер уже запущен"
    else
        print_status "Запуск PostgreSQL контейнера..."
        docker-compose up -d postgres
        sleep 5  # Ждем инициализации
    fi
    
    # Проверка Redis
    if [ "$(docker ps -q -f name=beton_redis)" ]; then
        print_success "Redis контейнер уже запущен"
    else
        print_status "Запуск Redis контейнера..."
        docker-compose up -d redis
        sleep 2
    fi
    
    # Проверка здоровья контейнеров
    print_status "Проверка состояния контейнеров..."
    
    # PostgreSQL health check
    if docker exec beton_postgres pg_isready -U beton_user -d beton_crm &> /dev/null; then
        print_success "PostgreSQL готов к работе"
    else
        print_error "PostgreSQL не готов. Проверьте логи: docker logs beton_postgres"
        exit 1
    fi
    
    # Redis health check
    if docker exec beton_redis redis-cli ping &> /dev/null; then
        print_success "Redis готов к работе"
    else
        print_warning "Redis не отвечает, но система может работать без кеша"
    fi
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

# Проверка Docker и запуск контейнеров БД
check_docker
start_database_containers

# Проверка .env файлов
print_status "Проверка конфигурации..."

if [ ! -f "server/.env" ]; then
    print_error "Не найден файл server/.env"
    print_warning "Создайте файл server/.env на основе server/.env.example"
    exit 1
fi

# Проверка правильности портов в .env
SERVER_DB_PORT=$(grep "DB_PORT" server/.env | cut -d'=' -f2 | tr -d ' ')
if [ "$SERVER_DB_PORT" != "5489" ]; then
    print_warning "В server/.env указан неправильный порт БД. Должен быть 5489"
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

# Компиляция сервера (пропускаем из-за ошибок TypeScript)
# print_status "Компиляция сервера..."
# npm run build
# if [ $? -ne 0 ]; then
#     print_warning "Есть ошибки компиляции TypeScript, но продолжаем..."
# fi

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
    
    # Опционально: остановка контейнеров БД
    # docker-compose stop postgres redis
    
    exit 0
}

# Обработка сигнала завершения
trap cleanup SIGINT SIGTERM

print_success "Система готова к запуску!"
print_status "=================================="
print_status "🗄️  PostgreSQL: localhost:5489"
print_status "🔴 Redis: localhost:6396"
print_status "🖥️  Сервер: http://localhost:5001"
print_status "🌐 Клиент: http://localhost:3000"
print_status "📋 Админка: http://localhost:3000/admin"
print_status "🔧 PgAdmin: http://localhost:5050"
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