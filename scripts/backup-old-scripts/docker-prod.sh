#!/bin/bash

# Скрипт для запуска приложения в Docker (production)

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
        print_error "Docker не установлен."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker не запущен."
        exit 1
    fi
    
    print_success "Docker готов к работе"
}

# Проверка переменных окружения
check_env() {
    print_status "Проверка конфигурации..."
    
    # Проверка .env файла
    if [ ! -f .env ]; then
        print_error ".env файл не найден!"
        exit 1
    fi
    
    # Проверка обязательных переменных
    required_vars=(
        "DB_PASSWORD"
        "JWT_SECRET"
        "BITRIX24_WEBHOOK_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=\s*$" .env; then
            print_error "Переменная ${var} не установлена в .env файле!"
            exit 1
        fi
    done
    
    print_success "Конфигурация проверена"
}

# Проверка SSL сертификатов
check_ssl() {
    print_status "Проверка SSL сертификатов..."
    
    if [ ! -d "./ssl" ]; then
        print_warning "Директория SSL не найдена. Создаю самоподписанные сертификаты..."
        mkdir -p ./ssl
        
        # Генерация самоподписанного сертификата
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ./ssl/key.pem \
            -out ./ssl/cert.pem \
            -subj "/C=RU/ST=Moscow/L=Moscow/O=Beton CRM/CN=localhost"
        
        print_warning "Созданы самоподписанные сертификаты. Для production используйте настоящие сертификаты!"
    else
        if [ ! -f "./ssl/cert.pem" ] || [ ! -f "./ssl/key.pem" ]; then
            print_error "SSL сертификаты не найдены в директории ./ssl"
            exit 1
        fi
        print_success "SSL сертификаты найдены"
    fi
}

# Создание сети Docker
create_network() {
    if ! docker network ls | grep -q beton_network; then
        print_status "Создание Docker сети..."
        docker network create beton_network
        print_success "Docker сеть создана"
    else
        print_success "Docker сеть уже существует"
    fi
}

# Сборка образов
build_images() {
    print_status "Сборка Docker образов..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
    print_success "Образы собраны"
}

# Остановка старых контейнеров
stop_old_containers() {
    print_status "Остановка старых контейнеров..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down || true
    print_success "Старые контейнеры остановлены"
}

# Запуск приложения
start_application() {
    print_status "Запуск приложения в production режиме..."
    
    # Запуск инфраструктуры
    docker compose up -d
    
    # Ждем готовности БД
    print_status "Ожидание готовности PostgreSQL..."
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U beton_user -d beton_crm &> /dev/null; then
            print_success "PostgreSQL готов"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Запуск приложения
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    print_success "Приложение запущено!"
}

# Выполнение миграций
run_migrations() {
    print_status "Выполнение миграций базы данных..."
    docker exec beton_app node server/dist/migration.js || print_warning "Миграции уже применены или отсутствуют"
}

# Проверка здоровья приложения
health_check() {
    print_status "Проверка работоспособности приложения..."
    
    # Проверка backend
    for i in {1..30}; do
        if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
            print_success "Backend работает"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Проверка nginx
    for i in {1..30}; do
        if curl -s -k https://localhost > /dev/null 2>&1; then
            print_success "Nginx работает"
            break
        fi
        echo -n "."
        sleep 2
    done
}

# Основная функция
main() {
    print_status "Запуск Beton CRM в production режиме..."
    
    check_docker
    check_env
    check_ssl
    create_network
    
    # Опция для пересборки
    if [ "$1" == "--build" ]; then
        build_images
    fi
    
    stop_old_containers
    start_application
    run_migrations
    health_check
    
    print_success "Beton CRM успешно запущен в production режиме!"
    echo ""
    print_status "Доступные сервисы:"
    echo "  - Приложение: https://localhost (HTTPS)"
    echo "  - Приложение: http://localhost (будет перенаправлено на HTTPS)"
    echo ""
    print_status "Команды управления:"
    echo "  - Логи: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
    echo "  - Остановка: docker compose -f docker-compose.yml -f docker-compose.prod.yml down"
    echo "  - Перезапуск: docker compose -f docker-compose.yml -f docker-compose.prod.yml restart"
    echo ""
    print_warning "Не забудьте настроить реальные SSL сертификаты для production!"
}

# Запуск
main "$@"