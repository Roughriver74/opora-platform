#!/bin/bash

# Скрипт для создания бэкапов (локально и на продакшене)

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Конфигурация ---

# Локальная
LOCAL_DB_NAME="beton-crm" # Уточните, если имя другое
LOCAL_BACKUP_DIR="backups"

# Продакшн
PROD_SERVER_USER="root"
PROD_SERVER_IP="31.128.39.123"
PROD_APP_DIR="/var/www/beton-crm"
PROD_DB_NAME="beton-crm-production"
PROD_BACKUP_DIR="/var/www/beton-crm-backups"

# --- Функции ---

function create_local_backup() {
    echo -e "${BLUE}=== Создание локального бэкапа ===${NC}"
    
    mkdir -p "$LOCAL_BACKUP_DIR"
    
    BACKUP_TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
    CURRENT_BACKUP_PATH="$LOCAL_BACKUP_DIR/$BACKUP_TIMESTAMP"
    mkdir -p "$CURRENT_BACKUP_PATH"
    
    echo "1. Создание бэкапа базы данных '$LOCAL_DB_NAME'..."
    mongodump --db "$LOCAL_DB_NAME" --out="$CURRENT_BACKUP_PATH/db"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка при создании бэкапа базы данных!${NC}"
        rm -rf "$CURRENT_BACKUP_PATH"
        exit 1
    fi
    echo -e "${GREEN}✓ Бэкап базы данных успешно создан.${NC}"
    
    echo "2. Создание бэкапа файлов проекта..."
    tar -czf "$CURRENT_BACKUP_PATH/app.tar.gz" --exclude="./$LOCAL_BACKUP_DIR" --exclude="./node_modules" --exclude="./.git" .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка при архивации файлов проекта!${NC}"
        rm -rf "$CURRENT_BACKUP_PATH"
        exit 1
    fi
    echo -e "${GREEN}✓ Бэкап файлов проекта успешно создан.${NC}"
    
    echo -e "${GREEN}=== Локальный бэкап успешно создан в: $CURRENT_BACKUP_PATH ===${NC}"
}

function create_production_backup() {
    echo -e "${BLUE}=== Создание бэкапа на продакшн сервере ===${NC}"
    
    ssh $PROD_SERVER_USER@$PROD_SERVER_IP << ENDSSH
        echo "Запуск создания бэкапа на сервере..."
        
        mkdir -p "$PROD_BACKUP_DIR"
        
        BACKUP_TIMESTAMP=\$(date +'%Y-%m-%d_%H-%M-%S')
        CURRENT_BACKUP_PATH="\$PROD_BACKUP_DIR/\$BACKUP_TIMESTAMP"
        mkdir -p "\$CURRENT_BACKUP_PATH"
        
        echo "1. Создание бэкапа базы данных '$PROD_DB_NAME'..."
        mongodump --db "$PROD_DB_NAME" --out="\$CURRENT_BACKUP_PATH/db"
        if [ \$? -ne 0 ]; then
            echo -e "${RED}Ошибка при создании бэкапа базы данных на сервере!${NC}"
            rm -rf "\$CURRENT_BACKUP_PATH"
            exit 1
        fi
        echo -e "${GREEN}✓ Бэкап базы данных на сервере успешно создан.${NC}"

        echo "2. Создание бэкапа файлов приложения '$PROD_APP_DIR'..."
        tar -czf "\$CURRENT_BACKUP_PATH/app.tar.gz" -C "$PROD_APP_DIR" .
        if [ \$? -ne 0 ]; then
            echo -e "${RED}Ошибка при архивации файлов на сервере!${NC}"
            rm -rf "\$CURRENT_BACKUP_PATH"
            exit 1
        fi
        echo -e "${GREEN}✓ Бэкап файлов на сервере успешно создан.${NC}"

        echo -e "${GREEN}=== Бэкап на продакшене успешно создан в: \$CURRENT_BACKUP_PATH ===${NC}"
ENDSSH
}

# --- Основная логика ---

if [ "$1" == "local" ]; then
    create_local_backup
elif [ "$1" == "production" ]; then
    create_production_backup
else
    echo -e "${YELLOW}Использование: $0 [local|production]${NC}"
    exit 1
fi
