#!/bin/bash

# Скрипт для запуска приложения в Docker (development)

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка наличия Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен. Пожалуйста, установите Docker Desktop."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker не запущен. Пожалуйста, запустите Docker Desktop."
        exit 1
    fi
    
    print_success "Docker запущен и готов к работе"
}

# Проверка наличия docker compose
check_docker_compose() {
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null 2>&1; then
        print_error "Docker Compose не установлен."
        exit 1
    fi
    
    print_success "Docker Compose доступен"
}

# Создание сети Docker если не существует
create_network() {
    if ! docker network ls | grep -q beton_network; then
        print_status "Создание Docker сети..."
        docker network create beton_network
        print_success "Docker сеть создана"
    else
        print_success "Docker сеть уже существует"
    fi
}

# Остановка запущенных контейнеров
stop_containers() {
    print_status "Остановка существующих контейнеров..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml down || true
    print_success "Контейнеры остановлены"
}

# Запуск базовой инфраструктуры
start_infrastructure() {
    print_status "Запуск базовой инфраструктуры (PostgreSQL, Redis, PgAdmin)..."
    docker compose up -d
    
    # Ждем готовности PostgreSQL
    print_status "Ожидание готовности PostgreSQL..."
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U beton_user -d beton_crm &> /dev/null; then
            print_success "PostgreSQL готов к работе"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Ждем готовности Redis
    print_status "Ожидание готовности Redis..."
    for i in {1..30}; do
        if docker compose exec -T redis redis-cli ping &> /dev/null; then
            print_success "Redis готов к работе"
            break
        fi
        echo -n "."
        sleep 1
    done
}

# Запуск приложения в development режиме
start_application() {
    print_status "Запуск приложения в development режиме..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    print_success "Приложение запущено"
}

# Показать логи
show_logs() {
    print_status "Показать логи? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
    fi
}

# Основная функция
main() {
    print_status "Запуск Beton CRM в Docker..."
    
    check_docker
    check_docker_compose
    create_network
    
    # Проверка наличия .env файла
    if [ ! -f .env ]; then
        print_warning ".env файл не найден. Копирую из .env.example..."
        cp .env.example .env
        print_warning "Пожалуйста, отредактируйте .env файл и запустите скрипт снова."
        exit 1
    fi
    
    stop_containers
    start_infrastructure
    start_application
    
    print_success "Beton CRM успешно запущен!"
    echo ""
    print_status "Доступные сервисы:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:5001"
    echo "  - PgAdmin: http://localhost:5050"
    echo ""
    print_status "Полезные команды:"
    echo "  - Логи: docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
    echo "  - Остановка: docker compose -f docker-compose.yml -f docker-compose.dev.yml down"
    echo "  - Перезапуск: docker compose -f docker-compose.yml -f docker-compose.dev.yml restart"
    echo ""
    
    show_logs
}

# Запуск
main