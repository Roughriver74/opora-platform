#!/bin/bash

# Скрипт для восстановления из бэкапов (локально и на продакшене)

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Конфигурация ---

# Локальная
LOCAL_DB_NAME="beton-crm"
LOCAL_BACKUP_DIR="backups"
LOCAL_APP_DIR=$(pwd)

# Продакшн
PROD_SERVER_USER="root"
PROD_SERVER_IP="31.128.39.123"
PROD_APP_DIR="/var/www/beton-crm"
PROD_DB_NAME="beton-crm-production"
PROD_BACKUP_DIR="/var/www/beton-crm-backups"

# --- Функции ---

function restore_local_backup() {
    echo -e "${BLUE}=== Восстановление из локального бэкапа ===${NC}"
    
    if [ ! -d "$LOCAL_BACKUP_DIR" ] || [ -z "$(ls -A $LOCAL_BACKUP_DIR)" ]; then
        echo -e "${RED}Папка с локальными бэкапами '$LOCAL_BACKUP_DIR' пуста или не существует.${NC}"
        exit 1
    fi

    echo "Доступные локальные бэкапы:"
    select backup in $(ls -r $LOCAL_BACKUP_DIR); do
        if [ -n "$backup" ]; then
            BACKUP_PATH="$LOCAL_BACKUP_DIR/$backup"
            break
        else
            echo "Неверный выбор."
        fi
    done

    read -p "Вы уверены, что хотите восстановить бэкап '$backup'? Это перезапишет текущие данные! (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Отмена."
        exit 0
    fi

    echo "1. Восстановление базы данных '$LOCAL_DB_NAME'..."
    mongorestore --drop --db "$LOCAL_DB_NAME" "$BACKUP_PATH/db/$LOCAL_DB_NAME"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка восстановления базы данных!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ База данных восстановлена.${NC}"

    echo "2. Восстановление файлов проекта..."
    # Создаем временную папку, чтобы не удалить сам бэкап
    TMP_RESTORE_DIR=$(mktemp -d)
    tar -xzf "$BACKUP_PATH/app.tar.gz" -C "$TMP_RESTORE_DIR"
    # Синхронизируем, исключая папку с бэкапами и git
    rsync -a --delete --exclude="/$LOCAL_BACKUP_DIR/" --exclude="/.git/" "$TMP_RESTORE_DIR/" "$LOCAL_APP_DIR/"
    rm -rf "$TMP_RESTORE_DIR"
    
    echo -e "${GREEN}✓ Файлы проекта восстановлены.${NC}"
    
    echo -e "${YELLOW}Не забудьте установить зависимости (npm install) и перезапустить приложение!${NC}"
    echo -e "${GREEN}=== Локальное восстановление завершено. ===${NC}"
}

function restore_production_backup() {
    echo -e "${BLUE}=== Восстановление из бэкапа на продакшн сервере ===${NC}"

    ssh $PROD_SERVER_USER@$PROD_SERVER_IP <<ENDSSH
        echo -e "${YELLOW}Получение списка доступных бэкапов...${NC}"

        if [ ! -d "$PROD_BACKUP_DIR" ] || [ -z "\$(ls -A $PROD_BACKUP_DIR)" ]; then
            echo -e "${RED}Папка с бэкапами '$PROD_BACKUP_DIR' на сервере пуста или не существует.${NC}"
            exit 1
        fi

        echo "Доступные бэкапы на сервере:"
        
        # Используем readarray для безопасной работы с выводом ls
        readarray -t backups < <(ls -r $PROD_BACKUP_DIR)

        select backup in "\${backups[@]}"; do
            if [ -n "\$backup" ]; then
                BACKUP_PATH="$PROD_BACKUP_DIR/\$backup"
                break
            else
                echo "Неверный выбор."
            fi
        done

        read -p "Вы уверены, что хотите восстановить бэкап '\$backup' на продакшене? (y/n): " confirm
        if [ "\$confirm" != "y" ]; then
            echo "Отмена."
            exit 0
        fi

        echo "Остановка приложения..."
        pm2 stop beton-crm || echo "Приложение уже было остановлено."
        
        echo "1. Восстановление базы данных '$PROD_DB_NAME'..."
        mongorestore --drop --db "$PROD_DB_NAME" "\$BACKUP_PATH/db/$PROD_DB_NAME"
        if [ \$? -ne 0 ]; then
            echo -e "${RED}Ошибка восстановления базы данных на сервере!${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ База данных на сервере восстановлена.${NC}"

        echo "2. Восстановление файлов приложения..."
        # Очищаем директорию перед восстановлением
        rm -rf $PROD_APP_DIR/*
        tar -xzf "\$BACKUP_PATH/app.tar.gz" -C "$PROD_APP_DIR"
        echo -e "${GREEN}✓ Файлы приложения на сервере восстановлены.${NC}"

        echo "Установка зависимостей и запуск приложения..."
        cd $PROD_APP_DIR/server
        npm ci --production
        cd ..
        pm2 restart beton-crm --env production

        echo -e "${GREEN}=== Восстановление на продакшене завершено. ===${NC}"
ENDSSH
}

# --- Основная логика ---

if [ "$1" == "local" ]; then
    restore_local_backup
elif [ "$1" == "production" ]; then
    restore_production_backup
else
    echo -e "${YELLOW}Использование: $0 [local|production]${NC}"
    exit 1
fi
