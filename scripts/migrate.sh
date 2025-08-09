#!/bin/bash

# Скрипт для выполнения миграций в Docker

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

# Проверка запущенности контейнера
check_container() {
    if ! docker ps | grep -q beton_backend; then
        print_error "Backend контейнер не запущен. Запустите приложение с помощью ./scripts/docker-dev.sh"
        exit 1
    fi
}

# Выполнение миграций
run_migrations() {
    print_status "Выполнение миграций базы данных..."
    
    # Генерация миграций если есть изменения
    print_status "Проверка изменений в схеме..."
    docker exec beton_backend npm run typeorm migration:generate -- -n AutoMigration || true
    
    # Выполнение миграций
    print_status "Применение миграций..."
    docker exec beton_backend npm run typeorm migration:run
    
    print_success "Миграции успешно применены!"
}

# Откат миграций
revert_migrations() {
    print_status "Откат последней миграции..."
    docker exec beton_backend npm run typeorm migration:revert
    print_success "Миграция откачена!"
}

# Импорт данных из бэкапа
import_backup() {
    print_status "Импорт данных из последнего бэкапа..."
    docker exec beton_backend npm run import:backup
    print_success "Данные успешно импортированы!"
}

# Показать статус миграций
show_status() {
    print_status "Статус миграций:"
    docker exec beton_backend npm run typeorm migration:show
}

# Помощь
show_help() {
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  run      - Выполнить все pending миграции"
    echo "  revert   - Откатить последнюю миграцию"
    echo "  status   - Показать статус миграций"
    echo "  import   - Импортировать данные из бэкапа"
    echo "  help     - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 run      # Выполнить миграции"
    echo "  $0 revert   # Откатить последнюю миграцию"
    echo "  $0 status   # Показать статус"
}

# Основная функция
main() {
    # Проверка аргументов
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    # Проверка контейнера
    check_container
    
    # Выполнение команды
    case "$1" in
        run)
            run_migrations
            ;;
        revert)
            revert_migrations
            ;;
        status)
            show_status
            ;;
        import)
            import_backup
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Неизвестная команда: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Запуск
main "$@"