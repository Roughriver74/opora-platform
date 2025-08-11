#!/bin/bash

# Database sync script for Beton CRM
# Синхронизация базы данных между локальной разработкой и сервером

set -e

SERVER_HOST="31.128.39.123"
SERVER_USER="root"
SERVER_PATH="/var/www/beton-crm"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_help() {
    echo -e "${GREEN}Database Sync Tool для Beton CRM${NC}"
    echo ""
    echo "Использование:"
    echo "  ./sync-db.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Команды:"
    echo "  pull          Скачать базу данных с сервера в локальную среду"
    echo "  push          Загрузить локальную базу данных на сервер"
    echo "  backup        Создать резервную копию базы данных на сервере"
    echo "  sync-users    Синхронизировать пользователей с Bitrix24"
    echo ""
    echo "Опции:"
    echo "  --force       Принудительное выполнение без подтверждения"
    echo "  --help        Показать эту справку"
    echo ""
}

backup_server_db() {
    echo -e "${YELLOW}📦 Создаем резервную копию БД на сервере...${NC}"
    ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker-compose exec -T backend npm run migrate:export"
    echo -e "${GREEN}✅ Резервная копия создана${NC}"
}

pull_database() {
    echo -e "${YELLOW}⬇️ Скачиваем базу данных с сервера...${NC}"
    
    if [ "$1" != "--force" ]; then
        echo -e "${RED}⚠️ ВНИМАНИЕ: Это заменит вашу локальную базу данных!${NC}"
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Отменено"
            exit 1
        fi
    fi

    # Создаем резервную копию на сервере
    backup_server_db
    
    # Скачиваем дамп
    echo -e "${YELLOW}📥 Скачиваем файлы базы данных...${NC}"
    scp -r $SERVER_USER@$SERVER_HOST:$SERVER_PATH/server/src/database/migrations/data/ ./server/src/database/migrations/
    
    # Импортируем в локальную БД
    echo -e "${YELLOW}📂 Импортируем в локальную базу данных...${NC}"
    npm run docker:dev
    sleep 5
    docker-compose exec backend npm run migrate:import
    
    echo -e "${GREEN}✅ База данных успешно синхронизирована с сервером${NC}"
}

push_database() {
    echo -e "${YELLOW}⬆️ Загружаем локальную базу данных на сервер...${NC}"
    
    if [ "$1" != "--force" ]; then
        echo -e "${RED}⚠️ ВНИМАНИЕ: Это заменит базу данных на сервере!${NC}"
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Отменено"
            exit 1
        fi
    fi

    # Создаем резервную копию на сервере
    backup_server_db
    
    # Экспортируем локальную БД
    echo -e "${YELLOW}📦 Экспортируем локальную базу данных...${NC}"
    docker-compose exec backend npm run migrate:export
    
    # Загружаем на сервер
    echo -e "${YELLOW}📤 Загружаем файлы на сервер...${NC}"
    scp -r ./server/src/database/migrations/data/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/server/src/database/migrations/
    
    # Импортируем на сервере
    echo -e "${YELLOW}📂 Импортируем на сервере...${NC}"
    ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker-compose exec -T backend npm run migrate:import"
    
    echo -e "${GREEN}✅ База данных успешно загружена на сервер${NC}"
}

sync_users() {
    echo -e "${YELLOW}👥 Синхронизируем пользователей с Bitrix24...${NC}"
    
    if [ "$1" = "local" ]; then
        echo -e "${YELLOW}Локальная синхронизация...${NC}"
        curl -X POST http://localhost:5001/api/sync/users \
             -H "Content-Type: application/json" \
             -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
    else
        echo -e "${YELLOW}Синхронизация на сервере...${NC}"
        ssh $SERVER_USER@$SERVER_HOST "curl -X POST http://localhost:5001/api/sync/users -H 'Content-Type: application/json' -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'"
    fi
    
    echo -e "${GREEN}✅ Синхронизация пользователей завершена${NC}"
}

# Обработка аргументов
case "$1" in
    "pull")
        pull_database $2
        ;;
    "push")
        push_database $2
        ;;
    "backup")
        backup_server_db
        ;;
    "sync-users")
        sync_users $2
        ;;
    "--help"|"help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Неизвестная команда: $1${NC}"
        show_help
        exit 1
        ;;
esac